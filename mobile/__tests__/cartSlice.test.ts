import cartReducer, {
  CartState,
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
} from '../src/store/slices/cartSlice';

describe('cartSlice', () => {
  const initialState: CartState = {
    items: [],
  };

  it('returns initial state', () => {
    const state = cartReducer(undefined, { type: 'unknown' });
    expect(state).toEqual(initialState);
  });

  it('adds a new item to empty cart', () => {
    const state = cartReducer(initialState, addItem({ productId: 'p1', quantity: 2 }));
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual({ productId: 'p1', quantity: 2 });
  });

  it('increments quantity when adding existing item', () => {
    const stateWithItem: CartState = {
      items: [{ productId: 'p1', quantity: 2 }],
    };
    const state = cartReducer(stateWithItem, addItem({ productId: 'p1', quantity: 3 }));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(5);
  });

  it('removes an item by productId', () => {
    const stateWithItems: CartState = {
      items: [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 3 },
      ],
    };
    const state = cartReducer(stateWithItems, removeItem('p1'));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].productId).toBe('p2');
  });

  it('removes item when quantity set to 0', () => {
    const stateWithItem: CartState = {
      items: [{ productId: 'p1', quantity: 2 }],
    };
    const state = cartReducer(stateWithItem, updateQuantity({ productId: 'p1', quantity: 0 }));
    expect(state.items).toHaveLength(0);
  });

  it('updates quantity for existing item', () => {
    const stateWithItem: CartState = {
      items: [{ productId: 'p1', quantity: 2 }],
    };
    const state = cartReducer(stateWithItem, updateQuantity({ productId: 'p1', quantity: 5 }));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(5);
  });

  it('does nothing when updating quantity for non-existent item', () => {
    const stateWithItem: CartState = {
      items: [{ productId: 'p1', quantity: 2 }],
    };
    const state = cartReducer(stateWithItem, updateQuantity({ productId: 'p2', quantity: 3 }));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
  });

  it('clears all items from cart', () => {
    const stateWithItems: CartState = {
      items: [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 3 },
      ],
    };
    const state = cartReducer(stateWithItems, clearCart());
    expect(state.items).toEqual([]);
  });
});
