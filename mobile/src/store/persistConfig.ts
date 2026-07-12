import EncryptedStorage from 'react-native-encrypted-storage';
import { createEncryptor } from '../services/encryption';

// Immer-internals cleanup only. Encryption-at-rest is provided by the
// EncryptedStorage engine below, so this transform performs no storage writes.
const encryptor = createEncryptor();

/**
 * Defensive storage adapter.
 *
 * `react-native-encrypted-storage` is a boot-critical native dependency:
 * redux-persist rehydrates from it on the very first JS tick. It is a legacy
 * (pre-New-Architecture) module that depends on an alpha `security-crypto`
 * build, so on some devices/Android versions the native call can throw. An
 * unguarded error here would white-screen the app at launch.
 *
 * We wrap the three redux-persist storage methods so any failure degrades
 * gracefully (the app boots with empty persisted state) instead of crashing.
 * The encrypted engine is still used whenever it is available — this is a
 * resilience guard, not a plaintext fallback.
 */
const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem(key);
    } catch (err) {
      if (__DEV__) {
        console.warn(
          '[persist] EncryptedStorage.getItem failed; booting without persisted state:',
          err,
        );
      }
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await EncryptedStorage.setItem(key, value);
    } catch (err) {
      if (__DEV__) {
        console.warn('[persist] EncryptedStorage.setItem failed:', err);
      }
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await EncryptedStorage.removeItem(key);
    } catch (err) {
      if (__DEV__) {
        console.warn('[persist] EncryptedStorage.removeItem failed:', err);
      }
    }
  },
};

export const persistConfig = {
  key: 'root',
  version: 3,
  storage: safeStorage,
  whitelist: ['cart', 'checkout', 'transactions'],
  transforms: [encryptor],
};
