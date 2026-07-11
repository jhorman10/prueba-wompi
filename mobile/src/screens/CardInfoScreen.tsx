import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { setCardInfo, advanceStep } from '../store/slices/checkoutSlice';
import { CardInput } from '../components/CardInput';
import { Backdrop } from '../components/Backdrop';
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

  const handleClose = useCallback(() => {
    if (navigation?.goBack) navigation.goBack();
    else navigation?.navigate('Checkout');
  }, [navigation]);

  const brand: CardBrand = number ? detectBrand(number) : 'unknown';
  const brandName = getBrandName(brand);

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
      // Yield so the loading state is reflected in the UI while we process.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      // Only store safe card info in Redux (no PAN, no CVV — PCI DSS)
      dispatch(
        setCardInfo({
          lastFour: number.slice(-4),
          brand,
          cardholderName,
          expiry,
        }),
      );
      dispatch(advanceStep());
      // Pass sensitive data (PAN, CVV) via route params — never via Redux
      navigation?.navigate('PaymentSummary', {
        cardNumber: number,
        cardExpiry: expiry,
        cardCvc: cvc,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const displayNumber = formatCardNumber(number);

  return (
    <Backdrop visible title="Credit Card Info" onClose={handleClose}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Card number with brand logo */}
      <View style={styles.cardNumberRow}>
        <View style={styles.cardNumberInput}>
          <CardInput
            value={displayNumber}
            onChangeText={handleNumberChange}
            placeholder="0000 0000 0000 0000"
            label="Card Number"
            error={errors.number}
            keyboardType="number-pad"
          />
        </View>
        {brandName ? (
          <View style={styles.brandLogo}>
            <Text style={styles.brandLogoText}>{brandName}</Text>
          </View>
        ) : null}
      </View>

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

      <Pressable
        style={({ pressed }) => [styles.continueButton, pressed && { opacity: 0.8 }]}
        onPress={handleContinue}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" testID="continue-spinner" />
        ) : (
          <Text style={styles.continueButtonText}>Continue</Text>
        )}
      </Pressable>
      </ScrollView>
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
  cardNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardNumberInput: {
    flex: 1,
  },
  brandLogo: {
    marginLeft: 8,
    marginTop: 28,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  brandLogoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
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
  continueButton: {
    marginTop: 24,
    backgroundColor: '#6200ee',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
