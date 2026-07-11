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
 * Recursively strips Immer internals (string keys starting with `_`, e.g.
 * `_y`, `_z`, `_A`) from persisted/rehydrated state. Works at every nesting
 * level so rehydrated slices never carry draft markers. Real app state has no
 * `_`-prefixed field names, so only Immer noise is removed.
 */
function stripImmer(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => stripImmer(v));
  }
  if (value && typeof value === 'object') {
    const r: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (!key.startsWith('_')) {
        r[key] = stripImmer((value as Record<string, unknown>)[key]);
      }
    }
    return r;
  }
  return value;
}

/**
 * Creates a single redux-persist transformer that handles BOTH encryption and
 * Immer cleanup in one place. Previously the async `encryptor` and a separate
 * sync `immerFix` ran as two transforms, which could race. Combining them into
 * a single transform removes that ordering ambiguity:
 *   - `in`: encrypt the slice into EncryptedStorage, pass state through.
 *   - `out`: decrypt from EncryptedStorage, then strip Immer internals.
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
            return stripImmer(decoded) as TransformState;
          }
        } catch {
          // fall through to cleaning the inbound state
        }
        return stripImmer(state) as TransformState;
      }
      return state;
    },
  };
}
