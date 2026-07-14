import { createTransform } from 'redux-persist';
import EncryptedStorage from 'react-native-encrypted-storage';
import { createEncryptor } from '../services/encryption';

// Immer-internals cleanup only. Encryption-at-rest is provided by the
// EncryptedStorage engine below, so this transform performs no storage writes.
const encryptor = createEncryptor();

/**
 * Transform that strips PCI-sensitive fields from the checkout slice before
 * persisting to storage.
 *
 * PCI DSS Requirement 3.2: "Do not store sensitive authentication data after
 * authorization (even if encrypted)." The `expiry` field in `CardInfo` is
 * marked as "only stored temporarily for re-display, cleared after
 * tokenization" — but it persists unless we strip it at persistence time.
 *
 * We keep `cardInfo` in Redux for UX during the checkout flow (re-display
 * last four digits, brand, cardholder name), but we strip `expiry` before
 * it ever hits encrypted storage.
 */
const stripSensitiveCheckoutData = createTransform(
  // transform inbound state before persisting to storage
  (inboundState: any, key: string | number) => {
    if (key !== 'checkout') {
      return inboundState;
    }
    const { cardInfo, ...rest } = inboundState;
    if (!cardInfo) {
      return inboundState;
    }
    // Strip expiry (PCI-sensitive); keep lastFour, brand, cardholderName for UX
    const { expiry, ...safeCardInfo } = cardInfo;
    return {
      ...rest,
      cardInfo: safeCardInfo,
    };
  },
  // transform outbound state after rehydrating from storage
  (outboundState: any, key: string | number) => {
    // No transformation needed on rehydrate — we want the stored safe state
    return outboundState;
  },
  { whitelist: ['checkout'] },
);

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
  transforms: [stripSensitiveCheckoutData, encryptor],
};
