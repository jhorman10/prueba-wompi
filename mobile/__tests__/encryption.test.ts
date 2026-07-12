import { createEncryptor } from '../src/services/encryption';
import EncryptedStorage from 'react-native-encrypted-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistConfig } from '../src/store/persistConfig';

// Mock the native stores so we can observe which backend receives data.
jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

describe('persistence encryption', () => {
  const encryptor = createEncryptor();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses EncryptedStorage (not AsyncStorage) as the redux-persist storage engine', () => {
    expect(persistConfig.storage).toBe(EncryptedStorage);
    expect(persistConfig.storage).not.toBe(AsyncStorage);
  });

  it('only persists the encrypted slices (cart, checkout, transactions)', () => {
    expect(persistConfig.whitelist).toEqual([
      'cart',
      'checkout',
      'transactions',
    ]);
  });

  describe('transform is a safe pass-through (no plaintext leak)', () => {
    it('exposes in/out functions', () => {
      expect(typeof encryptor.in).toBe('function');
      expect(typeof encryptor.out).toBe('function');
    });

    it('returns state unchanged for cart (no-op in)', async () => {
      const state = { cart: { items: [{ productId: '1', quantity: 2 }] } };
      expect(await encryptor.in(state, 'cart', {})).toEqual(state);
    });

    it('returns state unchanged for checkout (no-op in)', async () => {
      const state = { checkout: { step: 1, cardInfo: undefined } };
      expect(await encryptor.in(state, 'checkout', {})).toEqual(state);
    });

    it('returns state unchanged for transactions (no-op in)', async () => {
      const state = { transactions: { history: [], lastTransaction: null } };
      expect(await encryptor.in(state, 'transactions', {})).toEqual(state);
    });

    it('returns state unchanged for non-persisted keys (products)', async () => {
      const state = { products: { items: [{ id: '1', name: 'Test' }] } };
      expect(await encryptor.in(state, 'products', {})).toEqual(state);
    });

    it('does NOT write to EncryptedStorage (the storage engine encrypts at rest)', async () => {
      await encryptor.in({ cart: { items: [] } }, 'cart', {});
      expect(EncryptedStorage.setItem).not.toHaveBeenCalled();
    });

    it('does NOT write plaintext to AsyncStorage', async () => {
      await encryptor.in(
        { cart: { items: [{ productId: 'secret' }] } },
        'cart',
        {},
      );
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('transform cleans rehydrated state', () => {
    it('strips Immer internals (_-prefixed keys) from out state', async () => {
      const dirty = {
        cart: { _y: 1, _z: 2, items: [{ productId: 'p1', quantity: 1 }] },
      };
      const result = await encryptor.out(dirty, 'cart', {});
      expect(result).toEqual({
        cart: { items: [{ productId: 'p1', quantity: 1 }] },
      });
    });

    it('strips Immer internals at nested and array levels', async () => {
      const dirty = {
        checkout: {
          step: 1,
          _z: 'draft',
          card: { _y: 1, last4: '1234' },
          items: [{ _a: 1, id: 'x' }],
        },
      };
      const result = await encryptor.out(dirty, 'checkout', {});
      expect(result).toEqual({
        checkout: {
          step: 1,
          card: { last4: '1234' },
          items: [{ id: 'x' }],
        },
      });
    });

    it('passes through state for non-persisted keys', async () => {
      const state = { products: { items: [] } };
      expect(await encryptor.out(state, 'products', {})).toEqual(state);
    });

    it('returns state unchanged when no Immer markers are present', async () => {
      const state = {
        transactions: { history: [{ id: 't1' }], lastTransaction: null },
      };
      expect(await encryptor.out(state, 'transactions', {})).toEqual(state);
    });

    it('writes nothing to either store during out', async () => {
      await encryptor.out({ cart: { items: [] } }, 'cart', {});
      expect(EncryptedStorage.setItem).not.toHaveBeenCalled();
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('data at rest', () => {
    it('relies on the EncryptedStorage backend so persisted data is never plaintext AsyncStorage', () => {
      // The transform performs no storage writes, and the persist engine is
      // EncryptedStorage — therefore redux-persist writes the encrypted blob
      // to the OS-backed secure store, never to AsyncStorage in plaintext.
      expect(persistConfig.storage).toBe(EncryptedStorage);
      expect(persistConfig.transforms).toHaveLength(1);
    });
  });
});
