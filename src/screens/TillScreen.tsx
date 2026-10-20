import { useCallback, useRef, useState } from 'react';
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { CameraViewfinder } from '@/components/CameraViewfinder';
import { QuickEntryModal, type QuickEntryData } from '@/components/QuickEntryModal';
import { Toast, useToast } from '@/components/Toast';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { useScanCart, type ScanCartItem } from '@/context/ScanCartContext';
import { lookupProduct } from '@/services/productLookupService';
import { recordSale, undoLastSale, type SaleLineInput } from '@/services/saleService';

/** How long the Undo stays available after a sale is recorded. */
export const UNDO_WINDOW_MS = 6000;

/**
 * How long a barcode must be ABSENT from the frame before the same code counts
 * as a new scan.
 *
 * Presence, not a countdown: the viewfinder re-reads a code that is still in
 * frame every ~2s, and that gap varies with how long detection takes, so any
 * fixed "ignore repeats for N ms" window eventually lets the same item through
 * twice and overcharges the customer. The Till instead counts a code again only
 * after the viewfinder reports an empty frame (see onNoDetection).
 *
 * Comfortably above the viewfinder's 500ms attempt interval, so a single dropped
 * frame doesn't re-arm it.
 */
export const ABSENCE_MS = 700;

interface RecordedSale {
  saleId: string;
  /** The original cart lines, kept so Undo can put the basket back exactly. */
  items: ScanCartItem[];
}

function toSaleLine(item: ScanCartItem): SaleLineInput {
  return {
    barcode: item.barcode,
    name: item.name || item.barcode,
    brand: item.brand,
    price: item.price,
    quantity: item.quantity,
  };
}

/**
 * The till: scan a customer's items, take payment, record the sale.
 *
 * Deliberately separate from ScannerScreen (the receiving flow) — that screen is
 * long and stateful, and a till has a different job and a different exit: a sale
 * subtracts stock, where receiving adds it.
 */
export function TillScreen() {
  const { items, addItem, removeItem, updateItem, clearCart, totalPrice, totalItems } = useScanCart();
  const { toasts, showToast, dismissToast } = useToast();

  const [quickEntryBarcode, setQuickEntryBarcode] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const scanningRef = useRef(false);
  // The code currently in frame. `absentSince` is when the frame last came up
  // empty; null means the code has been in frame continuously.
  const lastReadRef = useRef<{ barcode: string; absentSince: number | null } | null>(null);

  /** The frame came up empty — whatever code was in it has now left. */
  const handleNoDetection = useCallback(() => {
    const last = lastReadRef.current;
    if (last && last.absentSince === null) {
      lastReadRef.current = { barcode: last.barcode, absentSince: Date.now() };
    }
  }, []);

  const handleBarcode = useCallback(
    async (barcode: string) => {
      // A lookup is already in flight. Leave presence tracking alone so this read
      // isn't swallowed — the next attempt picks it up.
      if (scanningRef.current) return;

      const now = Date.now();
      const last = lastReadRef.current;

      // The same code only counts again if it actually left the frame. A brief
      // absence is a dropped detection, not a newly presented item.
      const stillInFrame =
        !!last &&
        last.barcode === barcode &&
        (last.absentSince === null || now - last.absentSince < ABSENCE_MS);

      // Either way the code is in frame now, so clear the absence marker.
      lastReadRef.current = { barcode, absentSince: null };

      if (stillInFrame) return;

      scanningRef.current = true;
      try {
        if (navigator.vibrate) navigator.vibrate(50);

        const result = await lookupProduct(barcode);
        if (result.source === 'manual') {
          // Unknown to both the local catalog and Open Food Facts — ask for a price.
          setQuickEntryBarcode(barcode);
          return;
        }

        const product = result.product;
        addItem({
          barcode,
          product,
          name: product.name,
          brand: product.brand,
          price: product.storePrice,
          expiryDate: product.defaultExpiry,
          quantity: 1,
          needsInfo: false,
          imageUrl: product.imageUrl,
          source: result.source,
        });
        showToast('success', product.name || barcode);
      } catch {
        setQuickEntryBarcode(barcode);
      } finally {
        scanningRef.current = false;
      }
    },
    [addItem, showToast],
  );

  const handleQuickEntrySave = useCallback(
    (data: QuickEntryData) => {
      if (!quickEntryBarcode) return;
      addItem({
        barcode: quickEntryBarcode,
        product: null,
        name: data.name,
        brand: data.brand,
        price: data.price,
        expiryDate: data.expiryDate,
        quantity: 1,
        needsInfo: false,
        source: 'manual',
      });
      setQuickEntryBarcode(null);
    },
    [addItem, quickEntryBarcode],
  );

  const handleQuantity = useCallback(
    (item: ScanCartItem, delta: number) => {
      const next = item.quantity + delta;
      if (next < 1) removeItem(item.id);
      else updateItem(item.id, { quantity: next });
    },
    [removeItem, updateItem],
  );

  // Takes the sale as an ARGUMENT rather than reading `recorded` from state. The
  // toast's action is built inside handlePaid, where setRecorded has not been
  // applied yet — a closure reading `recorded` there would capture null and the
  // Undo would silently do nothing.
  const undoRecordedSale = useCallback(
    async (target: RecordedSale) => {
      try {
        await undoLastSale(target.saleId);
        // APPEND the lines back — never replace the basket. A new customer may have
        // already scanned something during the undo window.
        for (const item of target.items) {
          addItem({
            barcode: item.barcode,
            product: item.product,
            name: item.name,
            brand: item.brand,
            price: item.price,
            expiryDate: item.expiryDate,
            quantity: item.quantity,
            needsInfo: item.needsInfo,
            imageUrl: item.imageUrl,
            source: item.source,
          });
        }
        showToast('info', 'Sale undone — items are back in the basket');
      } catch {
        showToast('error', 'Could not undo the sale');
      }
    },
    [addItem, showToast],
  );

  const handlePaid = useCallback(async () => {
    if (items.length === 0 || recording) return;
    setRecording(true);
    try {
      const snapshot = items.map((i) => ({ ...i }));
      const sale = await recordSale(snapshot.map(toSaleLine));
      const recordedSale: RecordedSale = { saleId: sale.saleId, items: snapshot };

      clearCart();

      // The Undo lives in the toast, which self-dismisses after the same window,
      // so no separate timer or state is needed to bound it.
      showToast('success', `Sale recorded ₱${sale.total.toFixed(2)}`, {
        action: { label: 'Undo', onClick: () => { void undoRecordedSale(recordedSale); } },
        durationMs: UNDO_WINDOW_MS,
      });
    } catch (err) {
      // Keep the basket: the cashier must be able to retry. Never lose a sale.
      showToast('error', err instanceof Error ? err.message : 'Could not record the sale');
    } finally {
      setRecording(false);
    }
  }, [clearCart, items, recording, showToast, undoRecordedSale]);

  const isEmpty = items.length === 0;

  // Show skeleton while sale is being recorded
  if (recording) {
    return <ScreenSkeleton rows={2} label="Recording sale" />;
  }

  return (
    <div className="till-screen">
      <header className="till-header">
        <h1 className="till-title">Till</h1>
      </header>

      <main className="till-main">
        <CameraViewfinder onScan={handleBarcode} onNoDetection={handleNoDetection} cameraActive />

        <section className="till-basket" aria-label="Customer basket">
          {isEmpty ? (
            <div className="till-empty">
              <ShoppingBag size={40} aria-hidden="true" />
              <p className="till-empty-title">No items yet</p>
              <p className="till-empty-sub">Scan a product to start the sale.</p>
            </div>
          ) : (
            <ul className="till-lines">
              {items.map((item) => (
                <li key={item.id} className="till-line">
                  <div className="till-line-info">
                    <span className="till-line-name">{item.name || `Unknown (${item.barcode})`}</span>
                    <span className="till-line-price">
                      {item.quantity} × ₱{item.price.toFixed(2)}
                    </span>
                  </div>

                  <div className="till-line-qty">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${item.name || item.barcode}`}
                      onClick={() => handleQuantity(item, -1)}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="till-line-count">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${item.name || item.barcode}`}
                      onClick={() => handleQuantity(item, 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <span className="till-line-total">₱{(item.price * item.quantity).toFixed(2)}</span>

                  <button
                    type="button"
                    className="till-line-remove"
                    aria-label={`Remove ${item.name || item.barcode}`}
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="till-footer">
        <div className="till-total">
          <span className="till-total-label">
            {totalItems} item{totalItems === 1 ? '' : 's'}
          </span>
          <span className="till-total-value">₱{totalPrice.toFixed(2)}</span>
        </div>
        <button
          type="button"
          className="till-paid"
          onClick={handlePaid}
          disabled={isEmpty || recording}
        >
          {recording ? 'Recording…' : 'Paid'}
        </button>
      </footer>

      {quickEntryBarcode && (
        <QuickEntryModal
          barcode={quickEntryBarcode}
          onSave={handleQuickEntrySave}
          onCancel={() => setQuickEntryBarcode(null)}
        />
      )}

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
