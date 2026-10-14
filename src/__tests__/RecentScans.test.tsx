import { render, screen, act } from '@testing-library/react';
import { RecentScans } from '@/components/RecentScans';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock the modules before importing
vi.mock('@/services/inventoryService');
vi.mock('@/services/catalogService');

// Now import the mocked functions
import { getAllBatches } from '@/services/inventoryService';
import { getProduct } from '@/services/catalogService';;

describe('RecentScans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders EmptyState when there are no scans', async () => {
    // Mock getAllBatches to return an empty array
    (getAllBatches as vi.Mock).mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <RecentScans />
      </MemoryRouter>
    );

    // Wait for the component to finish loading
    await act(async () => {
      await Promise.resolve();
    });

    // Expect to see the EmptyState title and subtitle
    expect(await screen.findByText('No scans yet')).toBeInTheDocument();
    expect(await screen.findByText('Scan a product to see your recent scans here.')).toBeInTheDocument();
  });

  it('renders list of scans when there are scans', async () => {
    // Mock getAllBatches to return one batch
    const mockBatch = {
      batchId: 'batch1',
      barcode: '1234567890',
      scannedAt: new Date().toISOString(),
      quantity: 1
    };
    (getAllBatches as vi.Mock).mockResolvedValueOnce([mockBatch]);

    // Mock getProduct to return a product
    const mockProduct = {
      barcode: '1234567890',
      name: 'Test Product',
      brand: 'Test Brand',
      storePrice: 10.0,
      defaultExpiry: '2025-12-31',
      imageUrl: 'http://example.com/image.jpg'
    };
    (getProduct as vi.Mock).mockResolvedValueOnce(mockProduct);

    render(
      <MemoryRouter>
        <RecentScans />
      </MemoryRouter>
    );

    // Wait for the component to finish loading
    await act(async () => {
      await Promise.resolve();
    });

    // Expect to see the product name
    expect(await screen.findByText('Test Product')).toBeInTheDocument();
    // Expect to see the time ago text (should be something like "just now" or "Xs ago")
    expect(await screen.findByText('just now')).toBeInTheDocument();
  });
});