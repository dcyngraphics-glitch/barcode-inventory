import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductForm } from '../components/ProductForm';
import type { ProductFormData } from '../components/ProductForm';

describe('ProductForm', () => {
  const defaultProps = {
    initialData: {
      name: '',
      brand: '',
      price: '',
      expiryDate: '',
      quantity: 1,
    } as ProductFormData,
    onSubmit: vi.fn(),
    loading: false,
    error: null,
    isNewProduct: true,
    sellerMode: false,
  };

  it('should NOT render a category field', () => {
    render(
      <MemoryRouter>
        <ProductForm {...defaultProps} />
      </MemoryRouter>
    );

    expect(screen.queryByLabelText('Category')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter category')).not.toBeInTheDocument();
  });

  it('should render name, brand, price, expiry, and quantity fields', () => {
    render(
      <MemoryRouter>
        <ProductForm {...defaultProps} />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Product Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Brand')).toBeInTheDocument();
    expect(screen.getByLabelText('Price (₱)')).toBeInTheDocument();
    expect(screen.getByLabelText('Expiry Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
  });

  it('should auto-fill from lookup data when provided', () => {
    const initialData = {
      name: 'Test Product',
      brand: 'Test Brand',
      price: '100',
      expiryDate: '2026-12-31',
      quantity: 1,
    } as ProductFormData;

    render(
      <MemoryRouter>
        <ProductForm {...defaultProps} initialData={initialData} />
      </MemoryRouter>
    );

    expect(screen.getByDisplayValue('Test Product')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Brand')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-12-31')).toBeInTheDocument();
  });

  it('should validate required fields', () => {
    const onSubmit = vi.fn();
    render(
      <MemoryRouter>
        <ProductForm {...defaultProps} onSubmit={onSubmit} />
      </MemoryRouter>
    );

    const submitButton = screen.getByRole('button', { name: 'Add to Inventory' });
    fireEvent.click(submitButton);

    expect(screen.getByText('Product name is required')).toBeInTheDocument();
    expect(screen.getByText('Price must be greater than 0')).toBeInTheDocument();
    expect(screen.getByText('Expiry date is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

// Need to import fireEvent
import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
