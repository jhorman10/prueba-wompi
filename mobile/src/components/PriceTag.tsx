import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Theme } from '../theme/ThemeContext';

interface PriceTagProps extends TextProps {
  cents: number;
}

/**
 * Renders a price value in dollars from a cents input.
 * Example: 2999 → "$29.99"
 */
export function PriceTag({ cents, style, ...props }: PriceTagProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

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

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    price: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primary,
    },
  });
