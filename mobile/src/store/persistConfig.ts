import EncryptedStorage from 'react-native-encrypted-storage';
import { createEncryptor } from '../services/encryption';

// Immer-internals cleanup only. Encryption-at-rest is provided by the
// EncryptedStorage engine below, so this transform performs no storage writes.
const encryptor = createEncryptor();

export const persistConfig = {
  key: 'root',
  version: 3,
  storage: EncryptedStorage,
  whitelist: ['cart', 'checkout', 'transactions'],
  transforms: [encryptor],
};
