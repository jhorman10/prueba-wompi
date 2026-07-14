export type CardBrand =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'diners'
  | 'discover'
  | 'elo'
  | 'hipercard'
  | 'unknown';

/**
 * Detect card brand based on IIN (first digits).
 * Supports major brands: Visa, MasterCard, Amex, Diners, Discover, Elo, Hipercard.
 */
export function detectBrand(cardNumber: string): CardBrand {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (!cleaned) return 'unknown';

  // Elo: 636368, 438935, 504175, 451416, 636297, 5067, 4576, 4011
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(cleaned))
    return 'elo';
  // Hipercard: 606282
  if (/^606282/.test(cleaned)) return 'hipercard';
  // Diners: 300-305, 36, 38
  if (/^3(?:0[0-5]|[68])/.test(cleaned)) return 'diners';
  // Discover: 6011, 65, 644-649, 622126-622925
  if (
    /^(6011|65|64[4-9]|622(?:1[2-9]|[2-8]\d|9[0-2]\d?))/.test(cleaned)
  )
    return 'discover';
  // Amex: 34, 37
  if (/^3[47]/.test(cleaned)) return 'amex';
  // MasterCard: 51-55
  if (/^5[1-5]/.test(cleaned)) return 'mastercard';
  // Visa: 4
  if (cleaned.startsWith('4')) return 'visa';
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

const BRAND_DISPLAY_NAMES: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  diners: 'Diners',
  discover: 'Discover',
  elo: 'Elo',
  hipercard: 'Hipercard',
  unknown: '',
};

/**
 * Get the human-readable display name for a detected card brand.
 * 'unknown' resolves to an empty string so callers can conditionally render.
 */
export function getBrandName(brand: CardBrand): string {
  return BRAND_DISPLAY_NAMES[brand];
}
