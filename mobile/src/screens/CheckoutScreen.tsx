import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { CartItem } from '../components/CartItem';
import { PriceTag } from '../components/PriceTag';
import { removeItem } from '../store/slices/cartSlice';
import { selectTotalCents, selectGetProduct } from '../store/selectors';
import { useTheme, Theme } from '../theme/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type CheckoutScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Checkout'>;

interface CheckoutScreenProps {
  navigation: CheckoutScreenNavigationProp;
}

/**
 * Checkout screen — shows cart summary and "Pay with credit card" button.
 */
export function CheckoutScreen({ navigation }: CheckoutScreenProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { colors } = theme;
  const dispatch = useDispatch<AppDispatch>();
  const cartItems = useSelector((state: RootState) => state.cart?.items ?? []);
  const getProduct = useSelector(selectGetProduct);
  const totalCents = useSelector(selectTotalCents);

  const handleProceedToPayment = useCallback(() => {
    navigation.navigate('CardInfo');
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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <Pressable
          style={({ pressed }) => [styles.shopButton, pressed && { opacity: 0.7 }]}
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
          style={({ pressed }) => [styles.payButton, pressed && { opacity: 0.7 }]}
          onPress={handleProceedToPayment}
        >
          <Text style={styles.payButtonText}>Pay with credit card</Text>
        </Pressable>
      </View>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.base,
    },
    emptyText: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.base,
    },
    shopButton: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.sm,
    },
    shopButtonText: {
      color: theme.colors.textOnPrimary,
      fontWeight: '600',
    },
    heading: {
      fontSize: theme.typography.h2.fontSize,
      fontWeight: theme.typography.h2.fontWeight,
      color: theme.colors.text,
      padding: theme.spacing.base,
    },
    list: {
      paddingBottom: theme.spacing.sm,
    },
    footer: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.base,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.base,
    },
    totalLabel: {
      fontSize: theme.typography.bodyBold.fontSize,
      fontWeight: theme.typography.bodyBold.fontWeight,
      color: theme.colors.text,
    },
    totalAmount: {
      fontSize: 22,
    },
    payButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      padding: theme.spacing.base,
      alignItems: 'center',
    },
    payButtonText: {
      color: theme.colors.textOnPrimary,
      fontSize: theme.typography.bodyBold.fontSize,
      fontWeight: theme.typography.bodyBold.fontWeight,
    },
  });
