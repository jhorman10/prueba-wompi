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
import { setCardInfo, advanceStep } from '../store/slices/checkoutSlice';
import { CardInput } from '../components/CardInput';
import {
  detectBrand,
  isValidLuhn,
  formatCardNumber,
  getBrandName,
  CardBrand,
} from '../services/cardDetection';

interface CardInfoScreenProps {
  navigation?: {
    navigate: (screen: string, params?: object) => void;
    goBack?: () => void;
  };
}

interface CardFormErrors {
  number?: string;
  expiry?: string;
  cvc?: string;
  name?: string;
}

function validateExpiry(value: string): string | undefined {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length < 4) return 'Enter valid expiry';
  const month = parseInt(cleaned.slice(0, 2), 10);
  const year = parseInt(cleaned.slice(2), 10) + 2000;
  if (month < 1 || month > 12) return 'Invalid month';
  const now = new Date();
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
    return 'Card expired';
  }
  return undefined;
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
 * Card info screen — collects credit card details with brand detection and validation.
 */
export function CardInfoScreen({ navigation }: CardInfoScreenProps) {
  const dispatch = useDispatch<AppDispatch>();
  const checkout = useSelector((state: RootState) => state.checkout);

  // PAN and CVV stay in local state ONLY — never persisted to Redux (PCI DSS)
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState(checkout.cardInfo?.expiry ?? '');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState(
    checkout.cardInfo?.cardholderName ?? '',
  );
  const [errors, setErrors] = useState<CardFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const brand: CardBrand = number ? detectBrand(number) : 'unknown';
  const brandName = getBrandName(brand);
  const brandColor = getBrandColor(brand);
  const displayNumber = formatCardNumber(number);

  const maskedNumber = number
    ? `•••• •••• •••• ${number.slice(-4)}`
    : '•••• •••• •••• ••••';

  const handleNumberChange = useCallback((text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    setNumber(cleaned);
    setErrors((prev) => ({ ...prev, number: undefined }));
  }, []);

  const handleExpiryChange = useCallback((text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length > 2) {
      setExpiry(cleaned.slice(0, 2) + '/' + cleaned.slice(2));
    } else {
      setExpiry(cleaned);
    }
    setErrors((prev) => ({ ...prev, expiry: undefined }));
  }, []);

  const handleCvcChange = useCallback((text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    setCvc(cleaned);
    setErrors((prev) => ({ ...prev, cvc: undefined }));
  }, []);

  const handleNameChange = useCallback((text: string) => {
    setCardholderName(text);
    setErrors((prev) => ({ ...prev, name: undefined }));
  }, []);

  const validate = (): boolean => {
    const newErrors: CardFormErrors = {};

    if (!cardholderName.trim()) {
      newErrors.name = 'Cardholder name is required';
    }

    if (number.length < 13) {
      newErrors.number = 'Card number too short';
    } else if (!isValidLuhn(number)) {
      newErrors.number = 'Invalid card number';
    }

    const expiryError = validateExpiry(expiry);
    if (expiryError) newErrors.expiry = expiryError;

    if (cvc.length < 3) {
      newErrors.cvc = 'Invalid CVC';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      dispatch(
        setCardInfo({
          lastFour: number.slice(-4),
          brand,
          cardholderName,
          expiry,
        }),
      );
      dispatch(advanceStep());
      navigation?.navigate('PaymentSummary', {
        cardNumber: number,
        cardExpiry: expiry,
        cardCvc: cvc,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Credit card preview */}
      <View style={[styles.cardPreview, { backgroundColor: brandColor }]}>
        <View style={styles.cardChip} />
        <Text style={styles.cardNumberText}>
          {displayNumber || maskedNumber}
        </Text>
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.cardLabel}>CARD HOLDER</Text>
            <Text style={styles.cardValue}>
              {cardholderName || 'YOUR NAME'}
            </Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>EXPIRES</Text>
            <Text style={styles.cardValue}>{expiry || 'MM/YY'}</Text>
          </View>
        </View>
        {brandName && (
          <View style={styles.cardBrandBadge}>
            <Text style={styles.cardBrandText}>{brandName}</Text>
          </View>
        )}
      </View>

      {/* Form fields */}
      <CardInput
        value={displayNumber}
        onChangeText={handleNumberChange}
        placeholder="0000 0000 0000 0000"
        label="Card Number"
        error={errors.number}
        keyboardType="number-pad"
      />

      <View style={styles.row}>
        <View style={[styles.halfField, styles.halfFieldFirst]}>
          <CardInput
            value={expiry}
            onChangeText={handleExpiryChange}
            placeholder="MM/YY"
            label="Expiry"
            error={errors.expiry}
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
        <View style={[styles.halfField, styles.halfFieldSecond]}>
          <CardInput
            value={cvc}
            onChangeText={handleCvcChange}
            placeholder="123"
            label="CVC"
            error={errors.cvc}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
          />
        </View>
      </View>

      <CardInput
        value={cardholderName}
        onChangeText={handleNameChange}
        placeholder="John Doe"
        label="Cardholder Name"
        error={errors.name}
      />

      {/* Security note */}
      <View style={styles.securityRow}>
        <Text style={styles.securityIcon}>✓</Text>
        <Text style={styles.securityText}>
          Your card details are encrypted and never stored on our servers
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.continueButton, pressed && { opacity: 0.8 }]}
        onPress={handleContinue}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" testID="continue-spinner" />
        ) : (
          <Text style={styles.continueButtonText}>Pay Now</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Card preview */
  cardPreview: {
    borderRadius: 16,
    padding: 24,
    paddingTop: 28,
    marginBottom: 28,
    minHeight: 190,
    position: 'relative',
    overflow: 'hidden',
  },
  cardChip: {
    width: 40,
    height: 30,
    borderRadius: 4,
    backgroundColor: '#FFD700',
    marginBottom: 24,
  },
  cardNumberText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 24,
    fontVariant: ['tabular-nums'],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cardBrandBadge: {
    position: 'absolute',
    top: 16,
    right: 20,
  },
  cardBrandText: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
  },

  /* Form */
  row: {
    flexDirection: 'row',
  },
  halfField: {
    flex: 1,
  },
  halfFieldFirst: {
    marginRight: 6,
  },
  halfFieldSecond: {
    marginLeft: 6,
  },

  /* Security */
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
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

  /* Button */
  continueButton: {
    marginTop: 16,
    backgroundColor: '#6200ee',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
