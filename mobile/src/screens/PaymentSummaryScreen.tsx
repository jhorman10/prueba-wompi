import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
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

interface PaymentSummaryScreenProps {
  navigation?: {
    navigate: (screen: string, params?: object) => void;
  };
  route?: {
    params: {
      cardNumber: string;
      cardExpiry: string;
      cardCvc: string;
    };
  };
}

/**
 * Payment summary screen — shows order summary and processes payment.
 * Card number and CVC arrive via route params (not Redux) for PCI DSS compliance.
 */
export function PaymentSummaryScreen({
  navigation,
  route,
}: PaymentSummaryScreenProps) {
  const dispatch = useDispatch<AppDispatch>();
  const checkout = useSelector((state: RootState) => state.checkout);
  const cartItems = useSelector((state: RootState) => state.cart?.items ?? []);
  const products = useSelector((state: RootState) => state.products.items);

  // Sensitive card data comes via route params, NOT from Redux (PCI DSS)
  const routeCardNumber = route?.params?.cardNumber ?? '';
  const routeCardExpiry = route?.params?.cardExpiry ?? '';
  const routeCardCvc = route?.params?.cardCvc ?? '';

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProduct = useCallback(
    (productId: string) => products.find((p) => p.id === productId),
    [products],
  );

  const totalCents = cartItems.reduce((sum, item) => {
    const product = getProduct(item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);

  const handlePay = useCallback(async () => {
    setProcessing(true);
    setError(null);

    try {
      const api = getApiClientInstance();

      if (cartItems.length === 0) {
        setError('Cart is empty');
        setProcessing(false);
        return;
      }

      // Card data from route params (Redux only has safe truncated data — PCI DSS)
      const cardNumber = routeCardNumber;
      const cardExpiry = routeCardExpiry;
      const cardCvc = routeCardCvc;
      const cardholderName = checkout.cardInfo?.cardholderName ?? '';
      const cardLastFour = cardNumber.slice(-4);

      // Tokenize card
      const tokenResult = await api.tokenizeCard({
        number: cardNumber,
        expiry: cardExpiry,
        cvc: cardCvc,
        name: cardholderName,
      });

      const token = tokenResult.token;
      dispatch(setToken(token));

      // Clear raw card info after tokenization — safe because we already captured values
      dispatch(clearCardInfo());

      // Charge payment — send ALL cart items
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const chargeItems = cartItems.map((ci) => ({
        productId: ci.productId,
        quantity: ci.quantity,
      }));
      const chargeResult = await api.chargePayment({
        token,
        items: chargeItems,
        idempotencyKey,
        cardLastFour,
        cardholderName,
      });

      const rawTransaction = (chargeResult as { transaction: TransactionRecord }).transaction;
      const transaction: TransactionRecord = {
        id: rawTransaction.id,
        status: rawTransaction.status,
        amount: (chargeResult as { transaction: { totalAmount: number } }).transaction.totalAmount ?? totalCents,
        productId: cartItems[0]!.productId,
        quantity: cartItems[0]!.quantity,
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
    totalCents,
    dispatch,
    navigation,
    getProduct,
  ]);

  const cardLastFour = routeCardNumber.slice(-4) ?? checkout.cardInfo?.lastFour ?? '';
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
      <Pressable
        style={({ pressed }) => [
          styles.payButton,
          processing && styles.disabledButton,
          pressed && { opacity: 0.8 },
        ]}
        onPress={handlePay}
        disabled={processing}
      >
        <Text style={styles.payButtonText}>
          {processing ? 'Processing...' : `Pay ${totalCents > 0 ? '$' + (totalCents / 100).toFixed(2) : ''}`}
        </Text>
      </Pressable>
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
