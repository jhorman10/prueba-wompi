import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

interface PriceTagProps extends TextProps {
  cents: number;
}

/**
 * Renders a price value in dollars from a cents input.
 * Example: 2999 → "$29.99"
 */
export function PriceTag({ cents, style, ...props }: PriceTagProps) {
  const dollars = (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Text style={[styles.price, style]} {...props}>
      {dollars}
    </Text>
  );
}

const styles = StyleSheet.create({
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});
