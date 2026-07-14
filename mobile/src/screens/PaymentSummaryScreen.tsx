import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
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
import { Toast } from '../components/Toast';
import { createApiClient } from '../services/api';
import { API_BASE_URL } from '../config/api';
import { processPayment } from '../services/paymentService';
import { selectTotalCents, selectGetProduct } from '../store/selectors';
import { getBrandName, CardBrand } from '../services/cardDetection';

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

function getBrandColor(brand: CardBrand): string {
  switch (brand) {
    case 'visa': return '#1A1F71';
    case 'mastercard': return '#EB001B';
    case 'amex': return '#2E77BC';
    case 'diners': return '#0079BE';
    case 'discover': return '#FF6000';
    case 'elo': return '#000000';
    case 'hipercard': return '#B3131B';
    default: return '#5E5E5E';
  }
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

  const dismissToast = useCallback(() => setToastMessage(null), []);

  const totalCents = useSelector(selectTotalCents);
  const getProduct = useSelector(selectGetProduct);

  const cardLastFour = routeCardNumber.slice(-4) ?? checkout.cardInfo?.lastFour ?? '';
  const cardBrandName = checkout.cardInfo?.brand ?? 'unknown';
  const cardBrand = cardBrandName as CardBrand;
  const brandColor = getBrandColor(cardBrand);
  const brandDisplay = getBrandName(cardBrand);
  const cardholderName = checkout.cardInfo?.cardholderName ?? '';

  const handlePay = useCallback(async () => {
    setProcessing(true);
    setToastMessage(null);

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
      const cardInfo = {
        number: routeCardNumber,
        expiry: routeCardExpiry,
        cvc: routeCardCvc,
        cardholderName,
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
    cardholderName,
  ]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Order items section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {cartItems.map((item) => {
            const product = getProduct(item.productId);
            return (
              <View key={item.productId} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {product?.name ?? 'Unknown'}
                  </Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                </View>
                <PriceTag
                  cents={(product?.price ?? 0) * item.quantity}
                  style={styles.itemPrice}
                />
              </View>
            );
          })}
        </View>

        {/* Payment method section with compact card preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={[styles.miniCard, { backgroundColor: brandColor }]}>
            <View style={styles.miniCardRow}>
              <View style={styles.miniChip} />
              {brandDisplay && (
                <Text style={styles.miniBrand}>{brandDisplay}</Text>
              )}
            </View>
            <Text style={styles.miniCardNumber}>
              •••• •••• •••• {cardLastFour}
            </Text>
            <View style={styles.miniCardRow}>
              <Text style={styles.miniCardName} numberOfLines={1}>
                {cardholderName || 'Cardholder'}
              </Text>
              <Text style={styles.miniCardExpiry}>
                {routeCardExpiry || 'MM/YY'}
              </Text>
            </View>
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <PriceTag cents={totalCents} style={styles.totalAmount} />
          </View>
        </View>

        {/* Security note */}
        <View style={styles.securityRow}>
          <Text style={styles.securityIcon}>✓</Text>
          <Text style={styles.securityText}>
            Your payment is processed securely. Card details are encrypted.
          </Text>
        </View>
      </ScrollView>

      {/* Fixed bottom pay button */}
      <View style={styles.bottomBar}>
        <Pressable
          style={({ pressed }) => [
            styles.payButton,
            processing && styles.disabledButton,
            pressed && !processing && { opacity: 0.85 },
          ]}
          onPress={handlePay}
          disabled={processing}
        >
          {processing ? (
            <View style={styles.processingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.payButtonText}>  Processing...</Text>
            </View>
          ) : (
            <Text style={styles.payButtonText}>
              Pay ${(totalCents / 100).toFixed(2)}
            </Text>
          )}
        </Pressable>
      </View>

      <Toast message={toastMessage} onDismiss={dismissToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },

  /* Section */
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  /* Items */
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  itemQty: {
    fontSize: 12,
    color: '#999',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
  },

  /* Mini card preview */
  miniCard: {
    borderRadius: 12,
    padding: 16,
    paddingTop: 18,
  },
  miniCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniChip: {
    width: 28,
    height: 20,
    borderRadius: 3,
    backgroundColor: '#FFD700',
  },
  miniBrand: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
  },
  miniCardNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 1.5,
    marginVertical: 14,
    fontVariant: ['tabular-nums'],
  },
  miniCardName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
    marginRight: 8,
  },
  miniCardExpiry: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },

  /* Total */
  totalSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '700',
  },

  /* Security */
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  securityIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4caf50',
    marginRight: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#888',
    flex: 1,
    lineHeight: 16,
  },

  /* Bottom bar */
  bottomBar: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  payButton: {
    backgroundColor: '#6200ee',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#b39ddb',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
