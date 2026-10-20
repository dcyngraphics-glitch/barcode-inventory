import { type FC } from 'react';

interface ScreenSkeletonProps {
  /** Card-shaped placeholder rows. */
  rows?: number;
  /** Accessible label for the busy region. */
  label?: string;
}

/**
 * Full-screen loading placeholder built on the shared `.skeleton` class
 * (index.css:792) and its `skeleton-pulse` keyframes.
 *
 * Used wherever a screen would otherwise render nothing while its data resolves.
 * A blank frame reads as a broken app: on /sales the screen returned `null` until
 * settings arrived, so a reload painted an empty page with no sign of activity.
 */
export const ScreenSkeleton: FC<ScreenSkeletonProps> = ({ rows = 3, label = 'Loading' }) => (
  <div
    className="screen-skeleton"
    data-testid="loading-skeleton"
    role="status"
    aria-busy="true"
    aria-label={label}
  >
    <div className="skeleton screen-skeleton-bar" />
    <div className="screen-skeleton-chips">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="skeleton screen-skeleton-chip" />
      ))}
    </div>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="skeleton screen-skeleton-card" />
    ))}
  </div>
);
