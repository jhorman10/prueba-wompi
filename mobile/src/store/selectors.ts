import { createSelector } from '@reduxjs/toolkit';
import { RootState } from './store';
import { Product } from './slices/productsSlice';
import { CartItem } from './slices/cartSlice';

const selectCartItems = (state: RootState): CartItem[] =>
  state.cart?.items ?? [];

const selectProducts = (state: RootState): Product[] => state.products.items;

/** Total number of units across all cart lines (memoized). */
export const selectCartCount = createSelector(
  [selectCartItems],
  (items: CartItem[]) =>
    items.reduce((sum, item) => sum + item.quantity, 0),
);

/** Total order value in cents, derived from cart × product prices (memoized). */
export const selectTotalCents = createSelector(
  [selectCartItems, selectProducts],
  (items: CartItem[], products: Product[]) =>
    items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      return sum + (product?.price ?? 0) * item.quantity;
    }, 0),
);

/** Factory selector returning a memoized product lookup by id. */
export const selectGetProduct = createSelector(
  [selectProducts],
  (products: Product[]) => (productId: string): Product | undefined =>
    products.find((p) => p.id === productId),
);
