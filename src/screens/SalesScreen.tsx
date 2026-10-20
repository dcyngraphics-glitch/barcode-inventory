import { useCallback, useEffect, useMemo, useState } from 'react';
import { Receipt, AlertTriangle } from 'lucide-react';
import { useMode } from '@/context/ModeContext';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { getSalesForDay, getDayKeys, summarizeDay } from '@/services/saleService';
import { toDayKey } from '@/utils/dayKey';
import type { Sale } from '@/types';

function formatDay(key: string): string {
  const today = toDayKey(new Date());
  if (key === today) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === toDayKey(yesterday)) return 'Yesterday';

  return new Date(`${key}T00:00:00`).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

function peso(value: number): string {
  return `₱${value.toFixed(2)}`;
}

/**
 * The day's takings: what sold and how much it made.
 *
 * Scoped to a day by the stored `dayKey` (local date), so a new day starts a fresh
 * report automatically while past days stay available as history.
 */
export function SalesScreen() {
  const { isSell, hasLoaded, setMode } = useMode();

  const [dayKeys, setDayKeys] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>(() => toDayKey(new Date()));
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the days that have sales, and default to the newest one.
  useEffect(() => {
    let cancelled = false;
    getDayKeys()
      .then((keys) => {
        if (cancelled) return;
        setDayKeys(keys);
        setSelectedDay((current) => (keys.includes(current) ? current : (keys[0] ?? current)));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load sales days:', err);
        setError('Could not load sales history');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSalesForDay(selectedDay)
      .then((rows) => {
        if (cancelled) return;
        setSales(rows);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load sales for day:', err);
        setError('Could not load sales for that day');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDay]);

  const summary = useMemo(() => summarizeDay(sales), [sales]);

  const selectDay = useCallback((key: string) => setSelectedDay(key), []);

  // Wait for the stored settings before deciding anything. Acting on the defaults
  // bounces a cashier-mode user off /sales on every reload, because cashierMode
  // starts as false and the stored value only arrives a tick later.
  //
  // Renders a skeleton rather than null: returning null painted an empty frame on
  // every reload of /sales, which reads as a broken app rather than a loading one.
  if (!hasLoaded) {
    return <ScreenSkeleton rows={3} label="Loading sales" />;
  }

  // Sell owns this screen; in Shop there is no till, so there is no report to show.
  // Offers the switch rather than redirecting: a silent bounce gives the user no idea
  // why they were moved, and the always-visible switcher makes this a one-tap fix.
  if (!isSell) {
    return (
      <EmptyState
        title="Sales lives in Sell"
        subtitle="Ring up sales at the till and the day's takings show up here."
        ctaLabel="Switch to Sell"
        onCta={() => setMode('sell')}
      />
    );
  }

  return (
    <div className="sales-screen">
      <header className="sales-header">
        <h1 className="sales-title">Sales</h1>
      </header>

      <main className="sales-main">
        {error && (
          <div role="alert" className="sales-error">
            <AlertTriangle size={16} aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Day picker */}
        <div className="sales-days" role="tablist" aria-label="Sales history">
          <button
            type="button"
            role="tab"
            aria-selected={selectedDay === toDayKey(new Date())}
            className={`sales-day${selectedDay === toDayKey(new Date()) ? ' sales-day--active' : ''}`}
            onClick={() => selectDay(toDayKey(new Date()))}
          >
            Today
          </button>
          {dayKeys
            .filter((key) => key !== toDayKey(new Date()))
            .map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={selectedDay === key}
                className={`sales-day${selectedDay === key ? ' sales-day--active' : ''}`}
                onClick={() => selectDay(key)}
              >
                {formatDay(key)}
              </button>
            ))}
        </div>

        {/* Totals */}
        <section className="sales-summary" aria-label={`Sales summary for ${formatDay(selectedDay)}`}>
          <span className="sales-summary-label">{formatDay(selectedDay)}</span>
          <span className="sales-summary-total">{peso(summary.total)}</span>
          <span className="sales-summary-meta">
            {summary.saleCount} sale{summary.saleCount === 1 ? '' : 's'} · {summary.itemCount} item
            {summary.itemCount === 1 ? '' : 's'}
          </span>
        </section>

        {/* Sold without stock — the count is wrong somewhere; surface it */}
        {summary.shortfalls.length > 0 && (
          <section className="sales-flag" aria-label="Sold without stock">
            <h2 className="sales-section-title">
              <AlertTriangle size={14} aria-hidden="true" />
              Sold without stock
            </h2>
            <ul className="sales-list">
              {summary.shortfalls.map((s) => (
                <li key={s.name} className="sales-row">
                  <span className="sales-row-name">{s.name}</span>
                  <span className="sales-row-value">{s.quantity}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Top sellers */}
        {summary.topSellers.length > 0 && (
          <section aria-label="Top sellers">
            <h2 className="sales-section-title">Top sellers</h2>
            <ul className="sales-list">
              {summary.topSellers.map((s) => (
                <li key={s.name} className="sales-row">
                  <span className="sales-row-name">{s.name}</span>
                  <span className="sales-row-value">{s.quantity}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Individual sales */}
        <section aria-label="Sales for the day">
          <h2 className="sales-section-title">Sales</h2>
          {loading ? (
            <p className="sales-empty">Loading…</p>
          ) : sales.length === 0 ? (
            <div className="sales-empty-block">
              <Receipt size={36} aria-hidden="true" />
              <p className="sales-empty">No sales recorded for {formatDay(selectedDay).toLowerCase()}.</p>
            </div>
          ) : (
            <ul className="sales-list">
              {sales.map((sale) => (
                <li key={sale.saleId} className="sales-sale">
                  <div className="sales-sale-head">
                    <span className="sales-sale-time">{formatTime(sale.soldAt)}</span>
                    <span className="sales-sale-total">{peso(sale.total)}</span>
                  </div>
                  <ul className="sales-sale-lines">
                    {sale.lines.map((line) => (
                      <li key={line.barcode} className="sales-sale-line">
                        <span>
                          {line.quantity} × {line.name}
                        </span>
                        <span>{peso(line.lineTotal)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
