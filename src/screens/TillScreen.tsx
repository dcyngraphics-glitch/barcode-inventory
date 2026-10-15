import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { CameraViewfinder, type CameraViewfinderHandle } from '@/components/CameraViewfinder';
import { ModeSegmentedControl } from '@/components/ModeSegmentedControl';
import { QuickEntryModal } from '@/components/QuickEntryModal';
import { Toast, useToast } from '@/components/Toast';
import { useScanCart, type ScanCartItem } from '@/context/ScanCartContext';
import { lookupProduct } from '@/services/productLookupService';
import { recordSale, undoLastSale, type SaleLineInput } from '@/services/saleService';

/** How long the Undo stays available after a sale is recorded. */
export const UNDO_WINDOW_MS = 6000;

interface RecordedSale {
  saleId: string;
  total: number;
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

  const [scanMode, setScanMode] = useState<'auto' | 'manual'>('auto');
  const [cameraActive, setCameraActive] = useState(false);
  const [quickEntryBarcode, setQuickEntryBarcode] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const viewfinderRef = useRef<CameraViewfinderHandle>(null);
  const scanningRef = useRef(false);

  useEffect(() => {
    setCameraActive(true);
  }, []);

  const handleBarcode = useCallback(
    async (barcode: string) => {
      if (scanningRef.current) return;
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
    (price: number, expiryDate: string) => {
      if (!quickEntryBarcode) return;
      addItem({
        barcode: quickEntryBarcode,
        product: null,
        name: '',
        brand: '',
        price,
        expiryDate,
        quantity: 1,
        needsInfo: true,
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
      const recordedSale: RecordedSale = {
        saleId: sale.saleId,
        total: sale.total,
        items: snapshot,
      };

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

  return (
    <div className="till-screen">
      <header className="till-header">
        <h1 className="till-title">Till</h1>
        <div className="till-header-right">
          <span className="till-mode-label">Mode</span>
          <ModeSegmentedControl mode={scanMode} onChange={setScanMode} />
        </div>
      </header>

      <main className="till-main">
        <CameraViewfinder
          ref={viewfinderRef}
          onScan={handleBarcode}
          cameraActive={cameraActive}
        />

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
