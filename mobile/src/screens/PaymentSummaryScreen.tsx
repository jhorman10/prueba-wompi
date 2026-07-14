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
import { getApiClientInstance } from '../services/api';
import { processPayment, type PaymentItem } from '../services/paymentService';
import { selectTotalCents, selectGetProduct } from '../store/selectors';
import { getBrandName, CardBrand } from '../services/cardDetection';
import { useTheme, Theme } from '../theme/ThemeContext';

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
  const theme = useTheme();
  const styles = getStyles(theme);
  const { colors, spacing, radius } = theme;
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
    console.log('[Pay] clicked, cartItems:', cartItems.length, 'totalCents:', totalCents, 'routeCardNumber:', routeCardNumber ? routeCardNumber.slice(-4) : 'empty');
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

      // B2: Capture sensitive data BEFORE clearCardInfo()
      const capturedCardLastFour = routeCardNumber.slice(-4) ?? checkout.cardInfo?.lastFour ?? '';
      const capturedCardholderName = checkout.cardInfo?.cardholderName ?? '';

      const api = getApiClientInstance();
      const cardInfo = {
        number: routeCardNumber,
        expiry: routeCardExpiry,
        cvc: routeCardCvc,
        cardholderName: capturedCardholderName,
      };
      const items: PaymentItem[] = cartItems.map((ci) => {
        const product = getProduct(ci.productId);
        return {
          productId: ci.productId,
          quantity: ci.quantity,
          unitPrice: product?.price ?? 0,
          productName: product?.name ?? 'Unknown',
        };
      });

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
      console.error('[Pay] error:', err);
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
            pressed && !processing && { opacity: 0.7 },
          ]}
          onPress={handlePay}
          disabled={processing}
        >
          {processing ? (
            <View style={styles.processingRow}>
              <ActivityIndicator color={colors.textOnPrimary} size="small" />
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

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.base,
      paddingBottom: 100,
    },

    /* Section */
    section: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      ...theme.shadows.sm,
    },
    sectionTitle: {
      fontSize: theme.typography.label.fontSize,
      fontWeight: theme.typography.label.fontWeight,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: theme.typography.label.letterSpacing,
      marginBottom: theme.spacing.md,
    },

    /* Items */
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSubtle,
    },
    itemInfo: {
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    itemName: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xxs,
    },
    itemQty: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textPlaceholder,
    },
    itemPrice: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: '600',
    },

    /* Mini card preview */
    miniCard: {
      borderRadius: theme.radius.md,
      padding: theme.spacing.base,
      paddingTop: theme.spacing.lg,
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
      fontSize: theme.typography.body.fontSize,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.9)',
      letterSpacing: 1,
    },
    miniCardNumber: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: '600',
      color: '#fff',
      letterSpacing: 1.5,
      marginVertical: theme.spacing.sm,
      fontVariant: ['tabular-nums'],
    },
    miniCardName: {
      fontSize: theme.typography.caption.fontSize,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.85)',
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    miniCardExpiry: {
      fontSize: theme.typography.caption.fontSize,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.85)',
    },

    /* Total */
    totalSection: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      ...theme.shadows.sm,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    totalLabel: {
      fontSize: theme.typography.bodyBold.fontSize,
      fontWeight: theme.typography.bodyBold.fontWeight,
      color: theme.colors.text,
    },
    totalAmount: {
      fontSize: 22,
      fontWeight: '700',
    },

    /* Security */
    securityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xs,
    },
    securityIcon: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: '700',
      color: theme.colors.success,
      marginRight: theme.spacing.sm,
    },
    securityText: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
      flex: 1,
      lineHeight: theme.typography.caption.lineHeight,
    },

    /* Bottom bar */
    bottomBar: {
      padding: theme.spacing.base,
      paddingBottom: 32,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    payButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    disabledButton: {
      backgroundColor: theme.colors.primaryLight,
    },
    payButtonText: {
      color: theme.colors.textOnPrimary,
      fontSize: 17,
      fontWeight: '700',
    },
    processingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
