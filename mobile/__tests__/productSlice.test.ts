import productsReducer, {
  ProductsState,
  setProducts,
  setLoading,
  setError,
} from '../src/store/slices/productsSlice';

describe('productsSlice', () => {
  const initialState: ProductsState = {
    items: [],
    loading: false,
    error: null,
  };

  it('returns initial state', () => {
    const state = productsReducer(undefined, { type: 'unknown' });
    expect(state).toEqual(initialState);
  });

  it('sets loading state', () => {
    const state = productsReducer(initialState, setLoading(true));
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('sets products and clears loading', () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Test Product',
        description: 'A test product',
        price: 2999,
        imageUrl: 'https://example.com/img.png',
        stock: 10,
      },
    ];
    const state = productsReducer(
      { ...initialState, loading: true },
      setProducts(mockProducts),
    );
    expect(state.items).toEqual(mockProducts);
    expect(state.items).toHaveLength(1);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('sets error and clears loading', () => {
    const state = productsReducer(
      { ...initialState, loading: true },
      setError('Failed to fetch'),
    );
    expect(state.error).toBe('Failed to fetch');
    expect(state.loading).toBe(false);
    expect(state.items).toEqual([]);
  });

  it('clears error when setting products after an error', () => {
    const errorState: ProductsState = {
      items: [],
      loading: false,
      error: 'Previous error',
    };
    const mockProduct = {
      id: '2',
      name: 'Another Product',
      description: 'Description',
      price: 1500,
      imageUrl: 'https://example.com/img2.png',
      stock: 5,
    };
    const state = productsReducer(errorState, setProducts([mockProduct]));
    expect(state.error).toBeNull();
    expect(state.items).toHaveLength(1);
  });
});
