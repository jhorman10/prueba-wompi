import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import {
  setToken,
  setTransactionId,
  clearCardInfo,
  advanceStep,
} from '../store/slices/checkoutSlice';
import { addTransaction } from '../store/slices/transactionsSlice';
import { clearCart } from '../store/slices/cartSlice';
import { PriceTag } from '../components/PriceTag';
import { Backdrop } from '../components/Backdrop';
import { Toast } from '../components/Toast';
import { createApiClient } from '../services/api';
import { API_BASE_URL } from '../config/api';
import { processPayment } from '../services/paymentService';
import { selectTotalCents, selectGetProduct } from '../store/selectors';

interface PaymentSummaryScreenProps {
  navigation?: {
    navigate: (screen: string, params?: object) => void;
    goBack?: () => void;
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

  // Sensitive card data comes via route params, NOT from Redux (PCI DSS)
  const routeCardNumber = route?.params?.cardNumber ?? '';
  const routeCardExpiry = route?.params?.cardExpiry ?? '';
  const routeCardCvc = route?.params?.cardCvc ?? '';

  const [processing, setProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (navigation?.goBack) navigation.goBack();
    else navigation?.navigate('CardInfo');
  }, [navigation]);

  const dismissToast = useCallback(() => setToastMessage(null), []);

  const totalCents = useSelector(selectTotalCents);
  const getProduct = useSelector(selectGetProduct);

  const handlePay = useCallback(async () => {
    setProcessing(true);
    setToastMessage(null);

    // Allow "Processing..." state to render in tests
    if (__DEV__) {
      await new Promise(r => setTimeout(r, 50));
    }

    try {
      if (cartItems.length === 0) {
        setToastMessage('Cart is empty');
        setProcessing(false);
        return;
      }

      const api = createApiClient(API_BASE_URL);
      // Card data comes from route params (Redux only holds safe truncated data — PCI DSS)
      const cardInfo = {
        number: routeCardNumber,
        expiry: routeCardExpiry,
        cvc: routeCardCvc,
        cardholderName: checkout.cardInfo?.cardholderName ?? '',
      };
      const items = cartItems.map((ci) => ({
        productId: ci.productId,
        quantity: ci.quantity,
      }));

      const { transaction, token } = await processPayment(
        { items, cardInfo, totalCents },
        api,
      );

      dispatch(setToken(token));
      // Clear sensitive card info only after the payment flow completes (PCI DSS)
      dispatch(clearCardInfo());
      dispatch(setTransactionId(transaction.id));
      dispatch(addTransaction(transaction));
      dispatch(advanceStep());
      dispatch(clearCart());

      navigation?.navigate('TransactionStatus', { transaction });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setToastMessage(message);
    } finally {
      setProcessing(false);
    }
  }, [
    checkout,
    cartItems,
    totalCents,
    getProduct,
    dispatch,
    navigation,
    routeCardNumber,
    routeCardExpiry,
    routeCardCvc,
  ]);

  const cardLastFour = routeCardNumber.slice(-4) ?? checkout.cardInfo?.lastFour ?? '';
  const cardBrand = checkout.cardInfo?.brand ?? 'unknown';

  return (
    <Backdrop visible title="Payment Summary" onClose={handleClose}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
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
      <Toast message={toastMessage} onDismiss={dismissToast} />
    </Backdrop>
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
