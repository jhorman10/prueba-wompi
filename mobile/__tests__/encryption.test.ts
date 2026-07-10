import { createEncryptor } from '../src/services/encryption';
import EncryptedStorage from 'react-native-encrypted-storage';

// Mock react-native-encrypted-storage
jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

describe('encryption transformer', () => {
  const encryptor = createEncryptor();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a transformer with in/out functions', () => {
    expect(encryptor).toHaveProperty('in');
    expect(encryptor).toHaveProperty('out');
    expect(typeof encryptor.in).toBe('function');
    expect(typeof encryptor.out).toBe('function');
  });

  describe('in function', () => {
    it('encrypts and stores state when key is cart', async () => {
      const state = { cart: { items: [{ productId: '1', quantity: 2 }] } };
      const result = await encryptor.in(state, 'cart', {});
      expect(EncryptedStorage.setItem).toHaveBeenCalledWith(
        'persist:cart',
        expect.any(String),
      );
      expect(result).toEqual(state);
    });

    it('encrypts and stores state when key is checkout', async () => {
      const state = { checkout: { step: 1, cardInfo: undefined } };
      const result = await encryptor.in(state, 'checkout', {});
      expect(EncryptedStorage.setItem).toHaveBeenCalledWith(
        'persist:checkout',
        expect.any(String),
      );
      expect(result).toEqual(state);
    });

    it('encrypts and stores state when key is transactions', async () => {
      const state = { transactions: { history: [], lastTransaction: null } };
      const result = await encryptor.in(state, 'transactions', {});
      expect(EncryptedStorage.setItem).toHaveBeenCalledWith(
        'persist:transactions',
        expect.any(String),
      );
      expect(result).toEqual(state);
    });

    it('passes through when key is NOT in ENCRYPTED_KEYS', async () => {
      const state = { products: { items: [] } };
      const result = await encryptor.in(state, 'products', {});
      expect(EncryptedStorage.setItem).not.toHaveBeenCalled();
      expect(result).toEqual(state);
    });

    it('handles error during setItem gracefully and returns state', async () => {
      (EncryptedStorage.setItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage full'),
      );
      const state = { cart: { items: [] } };
      const result = await encryptor.in(state, 'cart', {});
      // Should return state even if storage fails
      expect(result).toEqual(state);
    });

    it('passes through for unknown key like "products"', async () => {
      const state = { products: { items: [{ id: '1', name: 'Test' }] } };
      const result = await encryptor.in(state, 'some-other-key', {});
      expect(EncryptedStorage.setItem).not.toHaveBeenCalled();
      expect(result).toEqual(state);
    });
  });

  describe('out function', () => {
    it('returns stored decoded data when data exists for encrypted key', async () => {
      const storedData = { cart: { items: [{ productId: '1', quantity: 1 }] } };
      const encoded = btoa(JSON.stringify(storedData));
      (EncryptedStorage.getItem as jest.Mock).mockResolvedValueOnce(encoded);

      const result = await encryptor.out({}, 'cart', {});
      expect(EncryptedStorage.getItem).toHaveBeenCalledWith('persist:cart');
      expect(result).toEqual(storedData);
    });

    it('returns original state when no stored data exists for encrypted key', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      const state = { cart: { items: [] } };
      const result = await encryptor.out(state, 'cart', {});
      expect(result).toEqual(state);
    });

    it('passes through when key is NOT in ENCRYPTED_KEYS', async () => {
      const state = { products: { items: [] } };
      const result = await encryptor.out(state, 'products', {});
      expect(EncryptedStorage.getItem).not.toHaveBeenCalled();
      expect(result).toEqual(state);
    });

    it('handles error during getItem gracefully and returns state', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockRejectedValueOnce(
        new Error('Read error'),
      );
      const state = { cart: { items: [] } };
      const result = await encryptor.out(state, 'cart', {});
      expect(result).toEqual(state);
    });

    it('handles corrupted stored data gracefully and returns state', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockResolvedValueOnce(
        'not-valid-base64!!!',
      );
      const state = { cart: { items: [] } };
      const result = await encryptor.out(state, 'cart', {});
      // atob('not-valid-base64!!!') might work in some environments,
      // but JSON.parse will likely throw. Either way we get state back.
      expect(result).toEqual(state);
    });

    it('passes through for non-encrypted key in out direction', async () => {
      const state = { ui: { theme: 'dark' } };
      const result = await encryptor.out(state, 'ui', {});
      expect(EncryptedStorage.getItem).not.toHaveBeenCalled();
      expect(result).toEqual(state);
    });
  });
});
