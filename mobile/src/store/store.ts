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
import { persistConfig } from './persistConfig';
import productsReducer from './slices/productsSlice';
import cartReducer from './slices/cartSlice';
import checkoutReducer from './slices/checkoutSlice';
import transactionsReducer from './slices/transactionsSlice';

const rootReducer = combineReducers({
  products: productsReducer,
  cart: cartReducer,
  checkout: checkoutReducer,
  transactions: transactionsReducer,
});

// redux-persist types mismatch (pre-existing issue, doesn't affect runtime)
const persistedReducer = persistReducer(persistConfig, rootReducer as any);

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
