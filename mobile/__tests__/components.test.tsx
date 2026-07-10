import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CartItem } from '../src/components/CartItem';

describe('CartItem', () => {
  const defaultProps = {
    productName: 'Test Widget',
    quantity: 2,
    unitPrice: 1999,
    onRemove: jest.fn(),
  };

  it('renders product name and quantity', () => {
    const { getByText } = render(<CartItem {...defaultProps} />);
    expect(getByText('Test Widget')).toBeTruthy();
    expect(getByText('Qty: 2')).toBeTruthy();
  });

  it('renders total price from unit price times quantity', () => {
    const { getByText } = render(<CartItem {...defaultProps} />);
    // 1999 * 2 = 3998 cents = $39.98
    expect(getByText('$39.98')).toBeTruthy();
  });

  it('renders remove button and calls onRemove when pressed', () => {
    const onRemove = jest.fn();
    const { getByText } = render(
      <CartItem {...defaultProps} onRemove={onRemove} />,
    );
    const removeButton = getByText('Remove');
    expect(removeButton).toBeTruthy();
    fireEvent.press(removeButton);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders with single quantity', () => {
    const { getByText } = render(
      <CartItem {...defaultProps} quantity={1} unitPrice={500} />,
    );
    expect(getByText('Qty: 1')).toBeTruthy();
    expect(getByText('$5.00')).toBeTruthy();
  });

  it('renders with zero unit price', () => {
    const { getByText } = render(
      <CartItem {...defaultProps} quantity={3} unitPrice={0} />,
    );
    expect(getByText('$0.00')).toBeTruthy();
  });

  it('renders with long product name',
    () => {
    const { getByText } = render(
      <CartItem
        {...defaultProps}
        productName="A very long product name that should be truncated"
      />,
    );
    expect(
      getByText('A very long product name that should be truncated'),
    ).toBeTruthy();
  });

  it('renders remove button consistently across renders', () => {
    const { getByText, rerender } = render(
      <CartItem {...defaultProps} productName="Item A" />,
    );
    expect(getByText('Item A')).toBeTruthy();
    expect(getByText('Remove')).toBeTruthy();

    rerender(<CartItem {...defaultProps} productName="Item B" />);
    expect(getByText('Item B')).toBeTruthy();
    expect(getByText('Remove')).toBeTruthy();
  });
});
