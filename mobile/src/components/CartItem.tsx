import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
        <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  quantity: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  removeButton: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeText: {
    fontSize: 13,
    color: '#e53935',
    fontWeight: '500',
  },
});
