import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { CartItem } from '../components/CartItem';
import { PriceTag } from '../components/PriceTag';
import { removeItem, clearCart, updateQuantity } from '../store/slices/cartSlice';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store/store';

interface CheckoutScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
  };
}

/**
 * Checkout screen — shows cart summary and "Pay with credit card" button.
 */
export function CheckoutScreen({ navigation }: CheckoutScreenProps) {
  const dispatch = useDispatch<AppDispatch>();
  const cartItems = useSelector((state: RootState) => state.cart?.items ?? []);
  const products = useSelector((state: RootState) => state.products.items);

  const getProduct = useCallback(
    (productId: string) => products.find((p) => p.id === productId),
    [products],
  );

  const totalCents = cartItems.reduce((sum, item) => {
    const product = getProduct(item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);

  const handleProceedToPayment = useCallback(() => {
    navigation?.navigate('CardInfo');
  }, [navigation]);

  const renderCartItem = useCallback(
    ({ item }: { item: (typeof cartItems)[number] }) => {
      const product = getProduct(item.productId);
      return (
        <CartItem
          productName={product?.name ?? 'Unknown Product'}
          quantity={item.quantity}
          unitPrice={product?.price ?? 0}
          onRemove={() => dispatch(removeItem(item.productId))}
        />
      );
    },
    [getProduct, dispatch],
  );

  if (cartItems.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <Pressable
          style={({ pressed }) => [styles.shopButton, pressed && { opacity: 0.8 }]}
          onPress={() => navigation?.navigate('Home')}
        >
          <Text style={styles.shopButtonText}>Continue Shopping</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Your Cart</Text>

      <FlatList
        data={cartItems}
        keyExtractor={(item) => item.productId}
        renderItem={renderCartItem}
        contentContainerStyle={styles.list}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <PriceTag cents={totalCents} style={styles.totalAmount} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.payButton, pressed && { opacity: 0.8 }]}
          onPress={handleProceedToPayment}
        >
          <Text style={styles.payButtonText}>Pay with credit card</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  shopButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#6200ee',
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    padding: 16,
  },
  list: {
    paddingBottom: 8,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalAmount: {
    fontSize: 22,
  },
  payButton: {
    backgroundColor: '#6200ee',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
