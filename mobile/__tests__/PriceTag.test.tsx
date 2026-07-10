import React from 'react';
import { render } from '@testing-library/react-native';
import { PriceTag } from '../src/components/PriceTag';

describe('PriceTag', () => {
  it('renders price in dollars from cents', () => {
    const { getByText } = render(<PriceTag cents={2999} />);
    expect(getByText('$29.99')).toBeTruthy();
  });

  it('renders zero price correctly', () => {
    const { getByText } = render(<PriceTag cents={0} />);
    expect(getByText('$0.00')).toBeTruthy();
  });

  it('renders large price with commas', () => {
    const { getByText } = render(<PriceTag cents={149900} />);
    expect(getByText('$1,499.00')).toBeTruthy();
  });

  it('renders small cent amounts', () => {
    const { getByText } = render(<PriceTag cents={50} />);
    expect(getByText('$0.50')).toBeTruthy();
  });
});
