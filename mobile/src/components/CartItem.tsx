import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Theme } from '../theme/ThemeContext';
import { PriceTag } from './PriceTag';

interface CartItemProps {
  productName: string;
  quantity: number;
  unitPrice: number;
  onRemove: () => void;
}

/**
 * Displays a cart item row with name, quantity, price, and remove action.
 */
export function CartItem({
  productName,
  quantity,
  unitPrice,
  onRemove,
}: CartItemProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {productName}
        </Text>
        <Text style={styles.quantity}>Qty: {quantity}</Text>
      </View>
      <View style={styles.right}>
        <PriceTag cents={unitPrice * quantity} />
        <Pressable
          onPress={onRemove}
          style={({ pressed }) => [
            styles.removeButton,
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={8}
        >
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSubtle,
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
    },
    quantity: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xxs,
    },
    right: {
      alignItems: 'flex-end',
    },
    removeButton: {
      marginTop: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    removeText: {
      fontSize: 13,
      color: theme.colors.error,
      fontWeight: '500',
    },
  });
