import EncryptedStorage from 'react-native-encrypted-storage';

interface TransformState {
  [key: string]: unknown;
}

interface TransformParams {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface Transform {
  in: (
    state: TransformState,
    key: string,
    params: TransformParams,
  ) => Promise<TransformState>;
  out: (
    state: TransformState,
    key: string,
    params: TransformParams,
  ) => Promise<TransformState>;
}

const ENCRYPTED_KEYS = ['cart', 'checkout', 'transactions'];

/**
 * Creates a redux-persist transformer that encrypts
 * sensitive slices (cart, checkout, transactions) using
 * react-native-encrypted-storage.
 * Non-sensitive slices pass through unmodified.
 */
export function createEncryptor(): Transform {
  return {
    in: async (state: TransformState, key: string): Promise<TransformState> => {
      if (ENCRYPTED_KEYS.includes(key)) {
        const encoded = JSON.stringify(state);
        try {
          await EncryptedStorage.setItem(
            `persist:${key}`,
            btoa(encoded),
          );
          return state;
        } catch {
          return state;
        }
      }
      return state;
    },

    out: async (
      state: TransformState,
      key: string,
    ): Promise<TransformState> => {
      if (ENCRYPTED_KEYS.includes(key)) {
        try {
          const stored = await EncryptedStorage.getItem(`persist:${key}`);
          if (stored) {
            const decoded = JSON.parse(atob(stored));
            return decoded;
          }
          return state;
        } catch {
          return state;
        }
      }
      return state;
    },
  };
}
