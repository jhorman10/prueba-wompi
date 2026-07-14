import { createSelector } from '@reduxjs/toolkit';
import { RootState } from './store';
import { Product } from './slices/productsSlice';
import { CartItem } from './slices/cartSlice';

const selectCartItems = (state: RootState): CartItem[] => state.cart?.items ?? [];

const selectProducts = (state: RootState): Product[] => state.products.items;

export const selectProductById = createSelector(
  [selectProducts, (_: RootState, productId: string) => productId],
  (products: Product[], productId: string): Product | undefined =>
    products.find((p) => p.id === productId),
);

export const selectCartCount = createSelector(
  [selectCartItems],
  (items: CartItem[]) =>
    items.reduce((sum, item) => sum + item.quantity, 0),
);

export const selectTotalCents = createSelector(
  [selectCartItems, selectProducts],
  (items: CartItem[], products: Product[]) =>
    items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      return sum + (product?.price ?? 0) * item.quantity;
    }, 0),
);

export const selectCartItemsWithProducts = createSelector(
  [selectCartItems, selectProducts],
  (items: CartItem[], products: Product[]) =>
    items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        ...item,
        productName: product?.name ?? 'Unknown',
        unitPrice: product?.price ?? 0,
        imageUrl: product?.imageUrl ?? '',
        stock: product?.stock ?? 0,
      };
    },
),
  );

export const selectIsCartEmpty = createSelector(
  [selectCartItems],
  (items: CartItem[]) => items.length === 0,
);

export const selectHasOutOfStockItems = createSelector(
  [selectCartItemsWithProducts],
  (items) =>
    items.some((item) => item.stock === 0 || item.quantity > item.stock),
);
