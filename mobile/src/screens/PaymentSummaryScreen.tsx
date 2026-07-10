import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import {
  setToken,
  setTransactionId,
  clearCardInfo,
  advanceStep,
} from '../store/slices/checkoutSlice';
import { addTransaction, TransactionRecord } from '../store/slices/transactionsSlice';
import { clearCart } from '../store/slices/cartSlice';
import { PriceTag } from '../components/PriceTag';
import { createApiClient } from '../services/api';

const API_URL = 'http://localhost:3000/api';

interface PaymentSummaryScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
  };
}

/**
 * Payment summary screen — shows order summary and processes payment.
 */
export function PaymentSummaryScreen({
  navigation,
}: PaymentSummaryScreenProps) {
  const dispatch = useDispatch<AppDispatch>();
  const checkout = useSelector((state: RootState) => state.checkout);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const products = useSelector((state: RootState) => state.products.items);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProduct = (productId: string) =>
    products.find((p) => p.id === productId);

  const totalCents = cartItems.reduce((sum, item) => {
    const product = getProduct(item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);

  const handlePay = useCallback(async () => {
    setProcessing(true);
    setError(null);

    try {
      const api = createApiClient(API_URL);
      const firstItem = cartItems[0];

      if (!firstItem) {
        setError('Cart is empty');
        setProcessing(false);
        return;
      }

      const product = getProduct(firstItem.productId);
      if (!product) {
        setError('Product not found');
        setProcessing(false);
        return;
      }

      // Tokenize card
      const tokenResult = await api.tokenizeCard({
        number: checkout.cardInfo?.number ?? '',
        expiry: checkout.cardInfo?.expiry ?? '',
        cvc: checkout.cardInfo?.cvc ?? '',
        name: checkout.cardInfo?.cardholderName ?? '',
      });

      const token = tokenResult.token;
      dispatch(setToken(token));

      // Clear raw card info after tokenization
      dispatch(clearCardInfo());

      // Charge payment
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const cardLastFour = (checkout.cardInfo?.number ?? '').slice(-4);
      const chargeResult = await api.chargePayment({
        token,
        productId: firstItem.productId,
        quantity: firstItem.quantity,
        idempotencyKey,
        cardLastFour,
        cardholderName: checkout.cardInfo?.cardholderName ?? '',
        totalAmount: totalCents,
      });

      const transaction: TransactionRecord = {
        id: (chargeResult as { transaction: { id: string } }).transaction.id,
        status: (chargeResult as { transaction: { status: string } }).transaction.status,
        amount: totalCents,
        productId: firstItem.productId,
        quantity: firstItem.quantity,
        createdAt: new Date().toISOString(),
      };

      dispatch(setTransactionId(transaction.id));
      dispatch(addTransaction(transaction));
      dispatch(advanceStep());
      dispatch(clearCart());

      navigation?.navigate('TransactionStatus', { transaction });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setError(message);
      Alert.alert('Payment Error', message);
    } finally {
      setProcessing(false);
    }
  }, [
    checkout,
    cartItems,
    products,
    totalCents,
    dispatch,
    navigation,
    getProduct,
  ]);

  const cardLastFour = (checkout.cardInfo?.number ?? '').slice(-4);
  const cardBrand = checkout.cardInfo?.brand ?? 'unknown';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>Payment Summary</Text>

      {/* Order items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {cartItems.map((item) => {
          const product = getProduct(item.productId);
          return (
            <View key={item.productId} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {product?.name ?? 'Unknown'} x{item.quantity}
              </Text>
              <PriceTag
                cents={(product?.price ?? 0) * item.quantity}
                style={styles.itemPrice}
              />
            </View>
          );
        })}
      </View>

      {/* Card info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <Text style={styles.cardInfo}>
          {cardBrand === 'visa'
            ? 'Visa'
            : cardBrand === 'mastercard'
            ? 'MasterCard'
            : 'Card'}{' '}
          **** {cardLastFour}
        </Text>
        <Text style={styles.cardInfo}>
          {checkout.cardInfo?.cardholderName}
        </Text>
      </View>

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <PriceTag cents={totalCents} style={styles.totalAmount} />
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Pay button */}
      <TouchableOpacity
        style={[styles.payButton, processing && styles.disabledButton]}
        onPress={handlePay}
        disabled={processing}
      >
        <Text style={styles.payButtonText}>
          {processing ? 'Processing...' : `Pay ${totalCents > 0 ? '$' + (totalCents / 100).toFixed(2) : ''}`}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 14,
  },
  cardInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  totalAmount: {
    fontSize: 22,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#e53935',
  },
  payButton: {
    backgroundColor: '#6200ee',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#b39ddb',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
