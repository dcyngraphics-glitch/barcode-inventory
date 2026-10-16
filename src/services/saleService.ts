import type { Batch, Sale, SaleDeduction, SaleLine } from '@/types';
import { sortBatchesByFIFO } from './inventoryService';
import { db } from '@/db/database';
import { generateId } from '@/utils/helpers';
import { toDayKey } from '@/utils/dayKey';

export interface DeductResult {
  deductions: SaleDeduction[];
  shortfall: number;
}

/** The minimum a sale line needs. Kept separate from ScanCartItem so this service
 *  does not depend on a React context. */
export interface SaleLineInput {
  barcode: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
}

/** The writes a deduction needs, expressed as data — so the decision itself is
 *  pure and testable, separate from the I/O that applies it. */
export interface DeductPlan extends DeductResult {
  /** `newQuantity: null` means the batch is emptied and must be deleted. */
  changes: { batch: Batch; newQuantity: number | null }[];
}

/**
 * Decide what to take from which batches, earliest expiry first. Pure — no I/O.
 *
 * Never throws for insufficient stock: it reports a shortfall instead, because a
 * paying customer is never refused over a wrong stock count.
 */
export function planDeduction(batches: Batch[], quantity: number): DeductPlan {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return {
      deductions: [],
      shortfall: Number.isFinite(quantity) ? Math.max(0, quantity) : 0,
      changes: [],
    };
  }

  const deductions: SaleDeduction[] = [];
  const changes: DeductPlan['changes'] = [];
  let remaining = quantity;

  for (const batch of sortBatchesByFIFO(batches)) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    if (take <= 0) continue;

    deductions.push({
      batchId: batch.batchId,
      quantity: take,
      expiryDate: batch.expiryDate,
      scannedAt: batch.scannedAt,
    });

    const left = batch.quantity - take;
    changes.push({ batch, newQuantity: left === 0 ? null : left });
    remaining -= take;
  }

  return { deductions, shortfall: Math.max(0, remaining), changes };
}

/**
 * Take `quantity` of `barcode` from stock, earliest expiry first.
 *
 * All reads and writes happen inside a single IndexedDB readwrite transaction, so
 * a mid-loop failure (quota error, tab close, exception) leaves stock untouched
 * rather than partially deducted.
 */
export async function deductStockFIFO(barcode: string, quantity: number): Promise<DeductResult> {
  return await db.transaction('rw', db.inventory, async () => {
    // Get batches by barcode using the index
    const batches = await db.inventory.where('by-barcode').equals(barcode).toArray();
    const plan = planDeduction(batches, quantity);
    
    // Apply the plan
    for (const { batch, newQuantity } of plan.changes) {
      if (newQuantity === null) {
        await db.inventory.delete(batch.batchId);
      } else {
        await db.inventory.put({ ...batch, quantity: newQuantity });
      }
    }
    
    return { deductions: plan.deductions, shortfall: plan.shortfall };
  });
}

/**
 * Record a completed sale and deduct its stock in ONE transaction spanning both
 * stores — so a sale either fully happens (written, stock deducted) or not at all.
 *
 * Without that, a failure between the two would leave stock short with no sale on
 * record: money and stock disagreeing, with nothing to explain the gap.
 */
export async function recordSale(items: SaleLineInput[], now: Date = new Date()): Promise<Sale> {
  return await db.transaction('rw', db.sales, db.inventory, async () => {
    const lines: SaleLine[] = [];

    for (const item of items) {
      const batches = await db.inventory.where('by-barcode').equals(item.barcode).toArray();
      const plan = planDeduction(batches, item.quantity);
      
      // Apply inventory changes
      for (const { batch, newQuantity } of plan.changes) {
        if (newQuantity === null) {
          await db.inventory.delete(batch.batchId);
        } else {
          await db.inventory.put({ ...batch, quantity: newQuantity });
        }
      }

      lines.push({
        barcode: item.barcode,
        name: item.name,
        brand: item.brand,
        unitPrice: item.price, // snapshot — a later price edit must not rewrite history
        quantity: item.quantity,
        lineTotal: item.price * item.quantity,
        deductions: plan.deductions,
        shortfall: plan.shortfall,
      });
    }

    const sale: Sale = {
      saleId: generateId(),
      soldAt: now.toISOString(),
      dayKey: toDayKey(now),
      lines,
      total: lines.reduce((sum, l) => sum + l.lineTotal, 0),
      itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    };

    await db.sales.put(sale);
    return sale;
  });
}

export async function getSale(saleId: string): Promise<Sale | undefined> {
  return db.sales.get(saleId);
}

/**
 * Reverse a sale exactly: put every deducted unit back where it came from,
 * recreating any batch that had been deleted at zero (from the stored snapshot),
 * then remove the sale. Atomic across both stores.
 */
export async function undoLastSale(saleId: string): Promise<void> {
  await db.transaction('rw', db.sales, db.inventory, async () => {
    const sale = await db.sales.get(saleId);
    if (!sale) {
      return;
    }

    for (const line of sale.lines) {
      for (const d of line.deductions) {
        const existing = await db.inventory.get(d.batchId);
        if (existing) {
          await db.inventory.put({ ...existing, quantity: existing.quantity + d.quantity });
        } else {
          await db.inventory.put({
            batchId: d.batchId,
            barcode: line.barcode,
            quantity: d.quantity,
            expiryDate: d.expiryDate,
            scannedAt: d.scannedAt,
          });
        }
      }
    }

    await db.sales.delete(saleId);
  });
}

export async function getSalesForDay(dayKey: string): Promise<Sale[]> {
  return await db.sales.where('by-day').equals(dayKey).toArray();
}

/** Distinct day keys that have sales, newest first.
 *  We load all sales and extract distinct dayKeys. This is inefficient for large datasets
 *  but acceptable for the current scale. TODO: Optimize with a proper distinct index query.
 */
export async function getDayKeys(): Promise<string[]> {
  const sales = await db.sales.toArray();
  const dayKeysSet = new Set<string>();
  for (const sale of sales) {
    dayKeysSet.add(sale.dayKey);
  }
  const dayKeys = Array.from(dayKeysSet);
  return dayKeys.sort((a, b) => b.localeCompare(a));
}

export interface DaySummary {
  total: number;
  saleCount: number;
  itemCount: number;
  topSellers: { name: string; quantity: number }[];
  shortfalls: { name: string; quantity: number }[];
}

/**
 * Summarize sales for a given day.
 */
export function summarizeDay(sales: Sale[]): DaySummary {
  const byName = new Map<string, number>();
  const shortfalls: { name: string; quantity: number }[] = [];

  for (const sale of sales) {
    for (const line of sale.lines) {
      const label = line.name || line.barcode;
      byName.set(label, (byName.get(label) ?? 0) + line.quantity);
      if (line.shortfall > 0) {
        shortfalls.push({ name: label, quantity: line.shortfall });
      }
    }
  }

  return {
    total: sales.reduce((sum, s) => sum + s.total, 0),
    saleCount: sales.length,
    itemCount: sales.reduce((sum, s) => sum + s.itemCount, 0),
    topSellers: [...byName.entries()]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity),
    shortfalls,
  };
}
