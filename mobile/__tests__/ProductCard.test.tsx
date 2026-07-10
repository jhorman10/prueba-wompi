import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductCard } from '../src/components/ProductCard';
import { Product } from '../src/store/slices/productsSlice';

const mockProduct: Product = {
  id: 'p1',
  name: 'Test Widget',
  description: 'A high-quality test widget',
  price: 1999,
  imageUrl: 'https://example.com/widget.png',
  stock: 10,
};

describe('ProductCard', () => {
  it('renders product name and formatted price', () => {
    const { getByText } = render(
      <ProductCard product={mockProduct} onSelect={jest.fn()} />,
    );
    expect(getByText('Test Widget')).toBeTruthy();
    expect(getByText('$19.99')).toBeTruthy();
  });

  it('renders product description when provided', () => {
    const { getByText } = render(
      <ProductCard product={mockProduct} onSelect={jest.fn()} />,
    );
    expect(getByText('A high-quality test widget')).toBeTruthy();
  });

  it('fires onSelect when tapped', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <ProductCard product={mockProduct} onSelect={onSelect} />,
    );
    fireEvent.press(getByText('Test Widget'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows out of stock indicator when stock is 0', () => {
    const outOfStock = { ...mockProduct, stock: 0, name: 'Empty Stock' };
    const { getByText } = render(
      <ProductCard product={outOfStock} onSelect={jest.fn()} />,
    );
    expect(getByText('Empty Stock')).toBeTruthy();
  });
});
