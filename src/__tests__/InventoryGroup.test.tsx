import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InventoryGroup } from '../components/InventoryGroup';
import type { InventoryGroup as InventoryGroupType, Batch, Product } from '../types';

const mockProduct: Product = {
  barcode: '1234567890123',
  name: 'Test Product',
  brand: 'Test Brand',
  category: 'Test Category',
  storePrice: 100,
  defaultExpiry: '2026-12-31',
  source: 'local',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockBatches: Batch[] = [
  {
    batchId: 'batch-1',
    barcode: '1234567890123',
    quantity: 5,
    expiryDate: '2026-12-31',
    scannedAt: '2026-01-01T10:00:00.000Z',
  },
  {
    batchId: 'batch-2',
    barcode: '1234567890123',
    quantity: 3,
    expiryDate: '2026-12-25',
    scannedAt: '2026-01-02T10:00:00.000Z',
  },
];

const mockGroup: InventoryGroupType = {
  product: mockProduct,
  batches: mockBatches,
  totalQuantity: 8,
  earliestExpiry: '2026-12-25',
};

describe('InventoryGroup', () => {

  it('should render product name and quantity', () => {
    render(
      <MemoryRouter>
        <InventoryGroup
          group={mockGroup}
          alertWindowDays={3}
          onDeleteBatch={vi.fn()}
          onEditBatch={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    // Quantity display is split across text nodes, use regex
    expect(screen.getByText(/8/)).toBeInTheDocument();
    // Check for earliest expiry in the subheader line
    expect(screen.getByText(/Earliest Exp/)).toBeInTheDocument();
  });

  it('should display status badges based on batch expiry', () => {
    render(
      <MemoryRouter>
        <InventoryGroup
          group={mockGroup}
          alertWindowDays={3}
          onDeleteBatch={vi.fn()}
          onEditBatch={vi.fn()}
        />
      </MemoryRouter>
    );

    // Should show status badges
    const badges = screen.getAllByRole('status');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('should show ChevronRight arrow indicator', () => {
    render(
      <MemoryRouter>
        <InventoryGroup
          group={mockGroup}
          alertWindowDays={3}
          onDeleteBatch={vi.fn()}
          onEditBatch={vi.fn()}
        />
      </MemoryRouter>
    );

    // Should have a ChevronRight icon (not expand/collapse arrows)
    expect(screen.getByLabelText(/View details/i)).toBeInTheDocument();
  });
});
