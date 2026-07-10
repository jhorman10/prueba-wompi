import {
  detectBrand,
  isValidLuhn,
  formatCardNumber,
  getBrandLogo,
} from '../src/services/cardDetection';

describe('detectBrand', () => {
  it('detects Visa for numbers starting with 4', () => {
    expect(detectBrand('4111111111111111')).toBe('visa');
    expect(detectBrand('4000000000000000')).toBe('visa');
    expect(detectBrand('4')).toBe('visa');
  });

  it('detects MasterCard for numbers starting with 51-55', () => {
    expect(detectBrand('5111111111111111')).toBe('mastercard');
    expect(detectBrand('5211111111111111')).toBe('mastercard');
    expect(detectBrand('5511111111111111')).toBe('mastercard');
    expect(detectBrand('54')).toBe('mastercard');
  });

  it('returns unknown for numbers not matching known brands', () => {
    expect(detectBrand('3111111111111111')).toBe('unknown');
    expect(detectBrand('6011111111111111')).toBe('unknown');
    expect(detectBrand('')).toBe('unknown');
  });
});

describe('isValidLuhn', () => {
  it('returns true for valid Luhn numbers', () => {
    // Standard test numbers
    expect(isValidLuhn('4111111111111111')).toBe(true);
    expect(isValidLuhn('5500000000000004')).toBe(true);
    expect(isValidLuhn('4532015112830366')).toBe(true);
  });

  it('returns false for invalid Luhn numbers', () => {
    expect(isValidLuhn('1234567890123456')).toBe(false);
    expect(isValidLuhn('1111111111111111')).toBe(false);
    expect(isValidLuhn('1234567890123457')).toBe(false);
  });

  it('handles numbers with spaces by stripping them', () => {
    expect(isValidLuhn('4111 1111 1111 1111')).toBe(true);
    expect(isValidLuhn('1234 5678 9012 3456')).toBe(false);
  });

  it('returns false for empty or non-numeric strings', () => {
    expect(isValidLuhn('')).toBe(false);
    expect(isValidLuhn('abcd')).toBe(false);
  });
});

describe('formatCardNumber', () => {
  it('formats 16-digit numbers in 4-4-4-4 groups', () => {
    expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111');
    expect(formatCardNumber('5500000000000004')).toBe('5500 0000 0000 0004');
  });

  it('handles partial input without extra spaces', () => {
    expect(formatCardNumber('4111')).toBe('4111');
    expect(formatCardNumber('41111')).toBe('4111 1');
    expect(formatCardNumber('41111111')).toBe('4111 1111');
  });

  it('strips non-digit characters from input', () => {
    expect(formatCardNumber('4111-1111-1111-1111')).toBe('4111 1111 1111 1111');
    expect(formatCardNumber('4111 1111 1111 1111')).toBe('4111 1111 1111 1111');
  });

  it('returns empty string for empty input', () => {
    expect(formatCardNumber('')).toBe('');
  });
});

describe('getBrandLogo', () => {
  it('returns the correct logo identifier for visa', () => {
    expect(getBrandLogo('visa')).toBe('visa-logo');
  });

  it('returns the correct logo identifier for mastercard', () => {
    expect(getBrandLogo('mastercard')).toBe('mastercard-logo');
  });

  it('returns null for unknown brand', () => {
    expect(getBrandLogo('unknown')).toBeNull();
    expect(getBrandLogo('amex')).toBeNull();
  });
});
