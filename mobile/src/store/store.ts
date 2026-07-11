import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  createTransform,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createEncryptor } from '../services/encryption';
import productsReducer from './slices/productsSlice';
import cartReducer from './slices/cartSlice';
import checkoutReducer from './slices/checkoutSlice';
import transactionsReducer from './slices/transactionsSlice';

const encryptor = createEncryptor();

/** Strips Immer internals (_y, _z, _A) from persisted slices */
function stripImmer(state: Record<string, unknown>) {
  if (!state || typeof state !== 'object') return state;
  const r: Record<string, unknown> = {};
  for (const key of Object.keys(state)) {
    if (!key.startsWith('_')) {
      r[key] = (state as any)[key];
    }
  }
  return r;
}

const immerFix = createTransform(
  (inboundState: any) => inboundState,
  (outboundState: any, key: string | number) => {
    if (!outboundState || typeof outboundState !== 'object') return outboundState;
    const cleaned = stripImmer(outboundState);
    // Ensure expected arrays exist
    if (!Array.isArray(cleaned.items)) cleaned.items = [];
    if (key === 'transactions' && !Array.isArray(cleaned.history)) cleaned.history = [];
    return cleaned;
  },
  { whitelist: ['cart', 'checkout', 'transactions'] },
);

const persistConfig = {
  key: 'root',
  version: 3,
  storage: AsyncStorage,
  whitelist: ['cart', 'checkout', 'transactions'],
  transforms: [encryptor as any, immerFix],
};

const rootReducer = combineReducers({
  products: productsReducer,
  cart: cartReducer,
  checkout: checkoutReducer,
  transactions: transactionsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
      immutableCheck: {
        ignoredPaths: ['cart', 'checkout', 'transactions'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
