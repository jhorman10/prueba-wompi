import {
  selectCartCount,
  selectTotalCents,
  selectGetProduct,
} from '../src/store/selectors';
import { RootState } from '../src/store/store';
import { CartState } from '../src/store/slices/cartSlice';
import { ProductsState } from '../src/store/slices/productsSlice';

const makeState = (
  cart: Partial<CartState> = {},
  products: Partial<ProductsState> = {},
): RootState =>
  ({
    products: { items: [], loading: false, error: null, ...products },
    cart: { items: [], ...cart },
    checkout: {
      step: 0,
      cardInfo: undefined,
      token: undefined,
      transactionId: undefined,
    },
    transactions: { history: [], lastTransaction: null },
  } as unknown as RootState);

const prod1 = {
  id: 'p1',
  name: 'Widget',
  description: '',
  price: 1999,
  imageUrl: '',
  stock: 5,
};
const prod2 = {
  id: 'p2',
  name: 'Gadget',
  description: '',
  price: 500,
  imageUrl: '',
  stock: 5,
};

describe('selectCartCount', () => {
  it('returns 0 for an empty cart', () => {
    expect(selectCartCount(makeState())).toBe(0);
  });

  it('returns 0 when the cart slice is absent', () => {
    const state = { ...makeState(), cart: undefined } as unknown as RootState;
    expect(selectCartCount(state)).toBe(0);
  });

  it('sums quantities across cart lines', () => {
    const state = makeState({
      items: [
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 3 },
      ],
    });
    expect(selectCartCount(state)).toBe(5);
  });
});

describe('selectTotalCents', () => {
  it('computes total from cart × product prices', () => {
    const state = makeState(
      { items: [{ productId: 'p1', quantity: 2 }] },
      { items: [prod1, prod2] },
    );
    expect(selectTotalCents(state)).toBe(3998);
  });

  it('ignores products that are missing from the catalog', () => {
    const state = makeState(
      { items: [{ productId: 'missing', quantity: 4 }] },
      { items: [prod1] },
    );
    expect(selectTotalCents(state)).toBe(0);
  });
});

describe('selectGetProduct', () => {
  it('returns a finder that locates products by id', () => {
    const state = makeState({}, { items: [prod1, prod2] });
    const find = selectGetProduct(state);
    expect(find('p1')).toBe(prod1);
    expect(find('p2')).toBe(prod2);
    expect(find('nope')).toBeUndefined();
  });

  it('memoizes the finder so it is stable for the same products', () => {
    const state = makeState({}, { items: [prod1] });
    const a = selectGetProduct(state);
    const b = selectGetProduct(state);
    expect(a).toBe(b);
  });

  it('produces a new finder when the catalog changes', () => {
    const a = selectGetProduct(makeState({}, { items: [prod1] }));
    const b = selectGetProduct(makeState({}, { items: [prod2] }));
    expect(a).not.toBe(b);
  });
});
