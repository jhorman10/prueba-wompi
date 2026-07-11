import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
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

// Single combined transform: encryption + Immer cleanup happen together so the
// async encryptor and the (formerly separate) sync Immer fix cannot race.
const encryptor = createEncryptor();

const persistConfig = {
  key: 'root',
  version: 3,
  storage: AsyncStorage,
  whitelist: ['cart', 'checkout', 'transactions'],
  transforms: [encryptor as any],
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
