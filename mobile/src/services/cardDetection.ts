export type CardBrand = 'visa' | 'mastercard' | 'unknown';

/**
 * Detect card brand based on IIN (first digits).
 * Visa: starts with 4
 * MasterCard: starts with 51-55
 */
export function detectBrand(cardNumber: string): CardBrand {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (!cleaned) return 'unknown';

  if (cleaned.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(cleaned)) return 'mastercard';
  return 'unknown';
}

/**
 * Validate card number using Luhn algorithm.
 */
export function isValidLuhn(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s/g, '');
  if (!cleaned || !/^\d+$/.test(cleaned)) return false;

  let sum = 0;
  let double = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
}

/**
 * Format card number into 4-4-4-4 groups.
 */
export function formatCardNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  const groups: string[] = [];

  for (let i = 0; i < cleaned.length; i += 4) {
    groups.push(cleaned.slice(i, i + 4));
  }

  return groups.join(' ');
}

const KNOWN_BRANDS: Record<CardBrand, string | null> = {
  visa: 'visa-logo',
  mastercard: 'mastercard-logo',
  unknown: null,
};

/**
 * Get brand logo identifier for known brands.
 */
export function getBrandLogo(brand: CardBrand): string | null {
  return KNOWN_BRANDS[brand] ?? null;
}
