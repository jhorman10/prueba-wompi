import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mocks for native modules
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock the API module so screens using API don't make real HTTP calls
jest.mock('../src/services/api', () => ({
  createApiClient: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({ params: {} }),
}));

// Mock redux-persist
jest.mock('redux-persist', () => {
  const actual = jest.requireActual('redux-persist');
  return {
    ...actual,
    persistReducer: jest.fn((_config: unknown, reducers: unknown) => reducers),
    persistStore: jest.fn(() => ({
      purge: jest.fn(),
      flush: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
    })),
    FLUSH: 'FLUSH',
    REHYDRATE: 'REHYDRATE',
    PAUSE: 'PAUSE',
    PERSIST: 'PERSIST',
    PURGE: 'PURGE',
    REGISTER: 'REGISTER',
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SafeAreaView: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  Screen: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ScreenStack: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// After all jest.mock calls, import the API mock and real reducers
import { createApiClient } from '../src/services/api';
import productsReducer from '../src/store/slices/productsSlice';
import cartReducer from '../src/store/slices/cartSlice';
import checkoutReducer from '../src/store/slices/checkoutSlice';
import transactionsReducer from '../src/store/slices/transactionsSlice';

// Mock products data
const mockProduct1 = {
  id: 'p1',
  name: 'Test Widget',
  description: 'A high-quality widget',
  price: 1999,
  imageUrl: 'https://example.com/widget.png',
  stock: 10,
};

const mockProduct2 = {
  id: 'p2',
  name: 'Test Gadget',
  description: 'A shiny gadget',
  price: 4999,
  imageUrl: '',
  stock: 5,
};

// Create mock store with REAL reducers so async dispatches actually update state
const createMockStore = (overrides?: Record<string, unknown>) =>
  configureStore({
    reducer: {
      products: productsReducer,
      cart: cartReducer,
      checkout: checkoutReducer,
      transactions: transactionsReducer,
    },
    preloadedState: overrides as any,
  });

describe('Screen rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default API mock — returns empty products by default
    (createApiClient as jest.Mock).mockReturnValue({
      getProducts: jest.fn().mockResolvedValue([]),
      tokenizeCard: jest.fn().mockResolvedValue({ token: 'tok_test_123' }),
      chargePayment: jest.fn().mockResolvedValue({
        transaction: { id: 'txn_1', status: 'COMPLETED' },
      }),
      getTransactionStatus: jest.fn(),
    });
  });

  // ===================== SplashScreen =====================
  it('SplashScreen renders and navigates to Home after 2s', async () => {
    jest.useFakeTimers();
    const { SplashScreen } = require('../src/screens/SplashScreen');
    const { getByText } = render(
      <Provider store={createMockStore()}>
        <SplashScreen />
      </Provider>,
    );
    expect(getByText('Payment Checkout')).toBeTruthy();

    jest.advanceTimersByTime(2000);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Home');
    });
    jest.useRealTimers();
  });

  // ===================== HomeScreen =====================
  it('HomeScreen renders loading state', () => {
    const store = createMockStore({
      products: { items: [], loading: true, error: null },
    });
    const { HomeScreen } = require('../src/screens/HomeScreen');
    const { getByText } = render(
      <Provider store={store}>
        <HomeScreen />
      </Provider>,
    );
    expect(getByText('Loading products...')).toBeTruthy();
  });

  it('HomeScreen renders error state from API failure', async () => {
    // With real reducers, the useEffect fires fetchProducts which overwrites
    // preloaded state. So we test via API failure instead.
    const mockApiClient = {
      getProducts: jest.fn().mockRejectedValue(new Error('API Error')),
      tokenizeCard: jest.fn(),
      chargePayment: jest.fn(),
      getTransactionStatus: jest.fn(),
    };
    (createApiClient as jest.Mock).mockReturnValue(mockApiClient);

    const store = createMockStore({
      products: { items: [], loading: false, error: null },
    });
    const { HomeScreen } = require('../src/screens/HomeScreen');
    const { findByText } = render(
      <Provider store={store}>
        <HomeScreen />
      </Provider>,
    );
    expect(await findByText('Error: API Error')).toBeTruthy();
    expect(await findByText('Retry')).toBeTruthy();
  });

  it('HomeScreen renders products list via API', async () => {
    const mockApiClient = {
      getProducts: jest.fn().mockResolvedValue([mockProduct1, mockProduct2]),
      tokenizeCard: jest.fn(),
      chargePayment: jest.fn(),
      getTransactionStatus: jest.fn(),
    };
    (createApiClient as jest.Mock).mockReturnValue(mockApiClient);

    const store = createMockStore({
      products: { items: [], loading: false, error: null },
    });
    const { HomeScreen } = require('../src/screens/HomeScreen');
    const { findByText } = render(
      <Provider store={store}>
        <HomeScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    // Wait for products to load via API
    expect(await findByText('Test Widget')).toBeTruthy();
    expect(await findByText('Test Gadget')).toBeTruthy();
  });

  it('HomeScreen renders empty list when no products from API', async () => {
    const mockApiClient = {
      getProducts: jest.fn().mockResolvedValue([]),
      tokenizeCard: jest.fn(),
      chargePayment: jest.fn(),
      getTransactionStatus: jest.fn(),
    };
    (createApiClient as jest.Mock).mockReturnValue(mockApiClient);

    const store = createMockStore({
      products: { items: [], loading: false, error: null },
    });
    const { HomeScreen } = require('../src/screens/HomeScreen');
    const { findByText } = render(
      <Provider store={store}>
        <HomeScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    expect(await findByText('No products available')).toBeTruthy();
  });

  it('HomeScreen shows cart bar when cart has items', () => {
    const store = createMockStore({
      products: { items: [mockProduct1], loading: false, error: null },
      cart: { items: [{ productId: 'p1', quantity: 2 }] },
    });
    const { HomeScreen } = require('../src/screens/HomeScreen');
    const { getByText } = render(
      <Provider store={store}>
        <HomeScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    expect(getByText('View Cart (2 items)')).toBeTruthy();
  });

  it('HomeScreen shows cart bar with singular item', () => {
    const store = createMockStore({
      products: { items: [mockProduct1], loading: false, error: null },
      cart: { items: [{ productId: 'p1', quantity: 1 }] },
    });
    const { HomeScreen } = require('../src/screens/HomeScreen');
    const { getByText } = render(
      <Provider store={store}>
        <HomeScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    expect(getByText('View Cart (1 item)')).toBeTruthy();
  });

  it('HomeScreen navigates to cart when pressing cart bar', () => {
    const store = createMockStore({
      products: { items: [mockProduct1], loading: false, error: null },
      cart: { items: [{ productId: 'p1', quantity: 1 }] },
    });
    const { HomeScreen } = require('../src/screens/HomeScreen');
    const { getByText } = render(
      <Provider store={store}>
        <HomeScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    fireEvent.press(getByText('View Cart (1 item)'));
    expect(mockNavigate).toHaveBeenCalledWith('Checkout');
  });

  it('HomeScreen handles fetch error and shows retry', async () => {
    const mockApiClient = {
      getProducts: jest.fn().mockRejectedValue(new Error('Network error')),
      tokenizeCard: jest.fn(),
      chargePayment: jest.fn(),
      getTransactionStatus: jest.fn(),
    };
    (createApiClient as jest.Mock).mockReturnValue(mockApiClient);

    const store = createMockStore({
      products: { items: [], loading: false, error: null },
    });
    const { HomeScreen } = require('../src/screens/HomeScreen');
    const { findByText } = render(
      <Provider store={store}>
        <HomeScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    expect(await findByText('Error: Network error')).toBeTruthy();
    expect(await findByText('Retry')).toBeTruthy();
  });

  // ===================== CheckoutScreen =====================
  it('CheckoutScreen renders empty cart state', () => {
    const store = createMockStore({
      cart: { items: [] },
      products: { items: [mockProduct1], loading: false, error: null },
    });
    const { CheckoutScreen } = require('../src/screens/CheckoutScreen');
    const { getByText } = render(
      <Provider store={store}>
        <CheckoutScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    expect(getByText('Your cart is empty')).toBeTruthy();
    expect(getByText('Continue Shopping')).toBeTruthy();
  });

  it('CheckoutScreen navigates to Home from empty cart', () => {
    const store = createMockStore({
      cart: { items: [] },
      products: { items: [mockProduct1], loading: false, error: null },
    });
    const { CheckoutScreen } = require('../src/screens/CheckoutScreen');
    const { getByText } = render(
      <Provider store={store}>
        <CheckoutScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    fireEvent.press(getByText('Continue Shopping'));
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  it('CheckoutScreen renders cart items with total', () => {
    const store = createMockStore({
      cart: { items: [{ productId: 'p1', quantity: 2 }] },
      products: { items: [mockProduct1], loading: false, error: null },
    });
    const { CheckoutScreen } = require('../src/screens/CheckoutScreen');
    const { getByText, getAllByText } = render(
      <Provider store={store}>
        <CheckoutScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    expect(getByText('Your Cart')).toBeTruthy();
    expect(getByText('Test Widget')).toBeTruthy();
    expect(getByText('Qty: 2')).toBeTruthy();
    // 1999 * 2 = 3998 cents = $39.98 — appears in CartItem AND total row
    const priceElements = getAllByText('$39.98');
    expect(priceElements.length).toBeGreaterThanOrEqual(1);
    expect(getByText('Pay with credit card')).toBeTruthy();
  });

  it('CheckoutScreen navigates to CardInfo on pay', () => {
    const store = createMockStore({
      cart: { items: [{ productId: 'p1', quantity: 1 }] },
      products: { items: [mockProduct1], loading: false, error: null },
    });
    const { CheckoutScreen } = require('../src/screens/CheckoutScreen');
    const { getByText } = render(
      <Provider store={store}>
        <CheckoutScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    fireEvent.press(getByText('Pay with credit card'));
    expect(mockNavigate).toHaveBeenCalledWith('CardInfo');
  });

  it('CheckoutScreen renders multiple cart items', () => {
    const store = createMockStore({
      cart: {
        items: [
          { productId: 'p1', quantity: 1 },
          { productId: 'p2', quantity: 3 },
        ],
      },
      products: {
        items: [mockProduct1, mockProduct2],
        loading: false,
        error: null,
      },
    });
    const { CheckoutScreen } = require('../src/screens/CheckoutScreen');
    const { getByText, queryByText } = render(
      <Provider store={store}>
        <CheckoutScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    expect(getByText('Test Widget')).toBeTruthy();
    expect(getByText('Test Gadget')).toBeTruthy();
    expect(queryByText('Your cart is empty')).toBeNull();
  });

  // ===================== CardInfoScreen =====================
  it('CardInfoScreen renders all input fields', () => {
    const store = createMockStore({
      checkout: { step: 0, cardInfo: undefined },
    });
    const { CardInfoScreen } = require('../src/screens/CardInfoScreen');
    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <CardInfoScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    expect(getByText('Credit Card Info')).toBeTruthy();
    expect(getByText('Card Number')).toBeTruthy();
    expect(getByPlaceholderText('0000 0000 0000 0000')).toBeTruthy();
    expect(getByText('Expiry')).toBeTruthy();
    expect(getByPlaceholderText('MM/YY')).toBeTruthy();
    expect(getByText('CVC')).toBeTruthy();
    expect(getByPlaceholderText('123')).toBeTruthy();
    expect(getByText('Cardholder Name')).toBeTruthy();
    expect(getByPlaceholderText('John Doe')).toBeTruthy();
    expect(getByText('Continue')).toBeTruthy();
  });

  it('CardInfoScreen shows validation errors on empty submit', () => {
    const store = createMockStore({
      checkout: { step: 0, cardInfo: undefined },
    });
    const { CardInfoScreen } = require('../src/screens/CardInfoScreen');
    const { getByText } = render(
      <Provider store={store}>
        <CardInfoScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    fireEvent.press(getByText('Continue'));
    expect(getByText('Cardholder name is required')).toBeTruthy();
    expect(getByText('Card number too short')).toBeTruthy();
    expect(getByText('Enter valid expiry')).toBeTruthy();
    expect(getByText('Invalid CVC')).toBeTruthy();
  });

  it('CardInfoScreen shows brand logo for Visa', () => {
    const store = createMockStore({
      checkout: { step: 0, cardInfo: undefined },
    });
    const { CardInfoScreen } = require('../src/screens/CardInfoScreen');
    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <CardInfoScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    const input = getByPlaceholderText('0000 0000 0000 0000');
    fireEvent.changeText(input, '4111111111111111');
    expect(getByText('VISA')).toBeTruthy();
  });

  it('CardInfoScreen shows brand logo for MasterCard', () => {
    const store = createMockStore({
      checkout: { step: 0, cardInfo: undefined },
    });
    const { CardInfoScreen } = require('../src/screens/CardInfoScreen');
    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <CardInfoScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    const input = getByPlaceholderText('0000 0000 0000 0000');
    fireEvent.changeText(input, '5511111111111111');
    expect(getByText('MC')).toBeTruthy();
  });

  it('CardInfoScreen shows invalid card error for non-Luhn number', () => {
    const store = createMockStore({
      checkout: { step: 0, cardInfo: undefined },
    });
    const { CardInfoScreen } = require('../src/screens/CardInfoScreen');
    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <CardInfoScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    const cardInput = getByPlaceholderText('0000 0000 0000 0000');
    fireEvent.changeText(cardInput, '1234567890123456');

    const expiryInput = getByPlaceholderText('MM/YY');
    fireEvent.changeText(expiryInput, '1228');
    const cvcInput = getByPlaceholderText('123');
    fireEvent.changeText(cvcInput, '123');
    const nameInput = getByPlaceholderText('John Doe');
    fireEvent.changeText(nameInput, 'John Doe');

    fireEvent.press(getByText('Continue'));
    expect(getByText('Invalid card number')).toBeTruthy();
  });

  it('CardInfoScreen validates expiry field', () => {
    const store = createMockStore({
      checkout: { step: 0, cardInfo: undefined },
    });
    const { CardInfoScreen } = require('../src/screens/CardInfoScreen');
    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <CardInfoScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    const expiryInput = getByPlaceholderText('MM/YY');
    fireEvent.changeText(expiryInput, '12');

    const cardInput = getByPlaceholderText('0000 0000 0000 0000');
    fireEvent.changeText(cardInput, '4111111111111111');
    const cvcInput = getByPlaceholderText('123');
    fireEvent.changeText(cvcInput, '123');
    const nameInput = getByPlaceholderText('John Doe');
    fireEvent.changeText(nameInput, 'John Doe');

    fireEvent.press(getByText('Continue'));
    expect(getByText('Enter valid expiry')).toBeTruthy();
  });

  it('CardInfoScreen allows valid card to proceed', () => {
    const store = createMockStore({
      checkout: { step: 0, cardInfo: undefined },
    });
    const { CardInfoScreen } = require('../src/screens/CardInfoScreen');
    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <CardInfoScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );

    const cardInput = getByPlaceholderText('0000 0000 0000 0000');
    fireEvent.changeText(cardInput, '4111111111111111');
    const expiryInput = getByPlaceholderText('MM/YY');
    fireEvent.changeText(expiryInput, '1230');
    const cvcInput = getByPlaceholderText('123');
    fireEvent.changeText(cvcInput, '123');
    const nameInput = getByPlaceholderText('John Doe');
    fireEvent.changeText(nameInput, 'John Doe');

    fireEvent.press(getByText('Continue'));
    expect(mockNavigate).toHaveBeenCalledWith('PaymentSummary');
  });

  it('CardInfoScreen formats card number as user types', () => {
    const store = createMockStore({
      checkout: { step: 0, cardInfo: undefined },
    });
    const { CardInfoScreen } = require('../src/screens/CardInfoScreen');
    const { getByPlaceholderText, getByDisplayValue } = render(
      <Provider store={store}>
        <CardInfoScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    const cardInput = getByPlaceholderText('0000 0000 0000 0000');
    fireEvent.changeText(cardInput, '4111111111111111');
    expect(getByDisplayValue('4111 1111 1111 1111')).toBeTruthy();
  });

  it('CardInfoScreen shows expired card error for past dates', () => {
    const store = createMockStore({
      checkout: { step: 0, cardInfo: undefined },
    });
    const { CardInfoScreen } = require('../src/screens/CardInfoScreen');
    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <CardInfoScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    const expiryInput = getByPlaceholderText('MM/YY');
    fireEvent.changeText(expiryInput, '0120');
    const cardInput = getByPlaceholderText('0000 0000 0000 0000');
    fireEvent.changeText(cardInput, '4111111111111111');
    const cvcInput = getByPlaceholderText('123');
    fireEvent.changeText(cvcInput, '123');
    const nameInput = getByPlaceholderText('John Doe');
    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.press(getByText('Continue'));
    expect(getByText('Card expired')).toBeTruthy();
  });

  // ===================== SelectProductScreen =====================
  it('SelectProductScreen shows product not found when no route params', () => {
    const store = createMockStore();
    const { SelectProductScreen } = require('../src/screens/SelectProductScreen');
    const { getByText } = render(
      <Provider store={store}>
        <SelectProductScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    expect(getByText('Product not found')).toBeTruthy();
  });

  it('SelectProductScreen renders product details with image', () => {
    const store = createMockStore();
    const { SelectProductScreen } = require('../src/screens/SelectProductScreen');
    const product = { ...mockProduct1, description: 'A great widget for testing' };
    const { getByText } = render(
      <Provider store={store}>
        <SelectProductScreen
          navigation={{ navigate: mockNavigate }}
          route={{ params: { product } }}
        />
      </Provider>,
    );
    expect(getByText('Test Widget')).toBeTruthy();
    expect(getByText('A great widget for testing')).toBeTruthy();
    expect(getByText('$19.99')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
    expect(getByText('Add to Cart')).toBeTruthy();
  });

  it('SelectProductScreen renders product without image as placeholder', () => {
    const store = createMockStore();
    const { SelectProductScreen } = require('../src/screens/SelectProductScreen');
    const product = { ...mockProduct2, imageUrl: '', description: '' };
    const { getByText } = render(
      <Provider store={store}>
        <SelectProductScreen
          navigation={{ navigate: mockNavigate }}
          route={{ params: { product } }}
        />
      </Provider>,
    );
    expect(getByText('Test Gadget')).toBeTruthy();
    expect(getByText('No Image')).toBeTruthy();
  });

  it('SelectProductScreen increments quantity with + button', () => {
    const store = createMockStore();
    const { SelectProductScreen } = require('../src/screens/SelectProductScreen');
    const { getByText } = render(
      <Provider store={store}>
        <SelectProductScreen
          navigation={{ navigate: mockNavigate }}
          route={{ params: { product: mockProduct1 } }}
        />
      </Provider>,
    );
    expect(getByText('1')).toBeTruthy();
    fireEvent.press(getByText('+'));
    expect(getByText('2')).toBeTruthy();
  });

  it('SelectProductScreen decrements quantity with - button', () => {
    const store = createMockStore();
    const { SelectProductScreen } = require('../src/screens/SelectProductScreen');
    const { getByText } = render(
      <Provider store={store}>
        <SelectProductScreen
          navigation={{ navigate: mockNavigate }}
          route={{ params: { product: mockProduct1 } }}
        />
      </Provider>,
    );
    fireEvent.press(getByText('+'));
    expect(getByText('2')).toBeTruthy();
    fireEvent.press(getByText('-'));
    expect(getByText('1')).toBeTruthy();
  });

  it('SelectProductScreen quantity does not go below 1', () => {
    const store = createMockStore();
    const { SelectProductScreen } = require('../src/screens/SelectProductScreen');
    const { getByText } = render(
      <Provider store={store}>
        <SelectProductScreen
          navigation={{ navigate: mockNavigate }}
          route={{ params: { product: mockProduct1 } }}
        />
      </Provider>,
    );
    fireEvent.press(getByText('-'));
    expect(getByText('1')).toBeTruthy();
  });

  it('SelectProductScreen quantity does not exceed stock', () => {
    const store = createMockStore();
    const { SelectProductScreen } = require('../src/screens/SelectProductScreen');
    const limitedProduct = { ...mockProduct1, stock: 2 };
    const { getByText } = render(
      <Provider store={store}>
        <SelectProductScreen
          navigation={{ navigate: mockNavigate }}
          route={{ params: { product: limitedProduct } }}
        />
      </Provider>,
    );
    fireEvent.press(getByText('+'));
    expect(getByText('2')).toBeTruthy();
    fireEvent.press(getByText('+'));
    expect(getByText('2')).toBeTruthy();
  });

  it('SelectProductScreen add to cart dispatches and navigates home', () => {
    const store = createMockStore({
      cart: { items: [] },
      products: { items: [mockProduct1], loading: false, error: null },
    });
    const { SelectProductScreen } = require('../src/screens/SelectProductScreen');
    const { getByText } = render(
      <Provider store={store}>
        <SelectProductScreen
          navigation={{ navigate: mockNavigate }}
          route={{ params: { product: mockProduct1 } }}
        />
      </Provider>,
    );
    fireEvent.press(getByText('Add to Cart'));
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  it('SelectProductScreen shows total price reflecting quantity', () => {
    const store = createMockStore();
    const { SelectProductScreen } = require('../src/screens/SelectProductScreen');
    const { getByText } = render(
      <Provider store={store}>
        <SelectProductScreen
          navigation={{ navigate: mockNavigate }}
          route={{ params: { product: mockProduct1 } }}
        />
      </Provider>,
    );
    expect(getByText('Total: $19.99')).toBeTruthy();
    fireEvent.press(getByText('+'));
    expect(getByText('Total: $39.98')).toBeTruthy();
  });

  // ===================== PaymentSummaryScreen =====================
  it('PaymentSummaryScreen renders payment summary with items', () => {
    const store = createMockStore({
      cart: { items: [{ productId: 'p1', quantity: 2 }] },
      products: { items: [mockProduct1], loading: false, error: null },
      checkout: {
        step: 2,
        cardInfo: {
          number: '4111111111111111',
          expiry: '12/28',
          cvc: '123',
          cardholderName: 'John Doe',
          brand: 'visa' as const,
        },
        token: undefined,
        transactionId: undefined,
      },
    });
    const { PaymentSummaryScreen } = require('../src/screens/PaymentSummaryScreen');
    const { getByText, getAllByText } = render(
      <Provider store={store}>
        <PaymentSummaryScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    expect(getByText('Payment Summary')).toBeTruthy();
    expect(getByText('Items')).toBeTruthy();
    expect(getByText('Test Widget x2')).toBeTruthy();
    // $39.98 appears both in the item row and the total row
    const priceTags = getAllByText('$39.98');
    expect(priceTags.length).toBeGreaterThanOrEqual(1);
    expect(getByText('Payment Method')).toBeTruthy();
    expect(getByText(/Visa/)).toBeTruthy();
    expect(getByText('John Doe')).toBeTruthy();
  });

  it('PaymentSummaryScreen renders card info for MasterCard', () => {
    const store = createMockStore({
      cart: { items: [{ productId: 'p1', quantity: 1 }] },
      products: { items: [mockProduct1], loading: false, error: null },
      checkout: {
        step: 2,
        cardInfo: {
          number: '5500000000000004',
          expiry: '12/28',
          cvc: '123',
          cardholderName: 'Jane Doe',
          brand: 'mastercard' as const,
        },
        token: undefined,
        transactionId: undefined,
      },
    });
    const { PaymentSummaryScreen } = require('../src/screens/PaymentSummaryScreen');
    const { getByText } = render(
      <Provider store={store}>
        <PaymentSummaryScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    expect(getByText(/MasterCard/)).toBeTruthy();
    expect(getByText('Jane Doe')).toBeTruthy();
  });

  it('PaymentSummaryScreen renders unknown card brand gracefully', () => {
    const store = createMockStore({
      cart: { items: [{ productId: 'p1', quantity: 1 }] },
      products: { items: [mockProduct1], loading: false, error: null },
      checkout: {
        step: 2,
        cardInfo: {
          number: '6011111111111117',
          expiry: '12/28',
          cvc: '123',
          cardholderName: 'Test User',
          brand: 'unknown' as const,
        },
        token: undefined,
        transactionId: undefined,
      },
    });
    const { PaymentSummaryScreen } = require('../src/screens/PaymentSummaryScreen');
    const { getByText } = render(
      <Provider store={store}>
        <PaymentSummaryScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    expect(getByText(/Card/)).toBeTruthy();
    expect(getByText('Test User')).toBeTruthy();
  });

  it('PaymentSummaryScreen processes payment on pay button press', async () => {
    const mockApiClient = {
      getProducts: jest.fn(),
      tokenizeCard: jest.fn().mockResolvedValue({ token: 'tok_test_123' }),
      chargePayment: jest.fn().mockResolvedValue({
        transaction: { id: 'txn_1', status: 'COMPLETED' },
      }),
      getTransactionStatus: jest.fn(),
    };
    (createApiClient as jest.Mock).mockReturnValue(mockApiClient);

    const store = createMockStore({
      cart: { items: [{ productId: 'p1', quantity: 1 }] },
      products: { items: [mockProduct1], loading: false, error: null },
      checkout: {
        step: 2,
        cardInfo: {
          number: '4111111111111111',
          expiry: '12/28',
          cvc: '123',
          cardholderName: 'John Doe',
          brand: 'visa' as const,
        },
        token: undefined,
        transactionId: undefined,
      },
    });
    const { PaymentSummaryScreen } = require('../src/screens/PaymentSummaryScreen');
    const { getByText } = render(
      <Provider store={store}>
        <PaymentSummaryScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );

    // Find the Pay button by its text content
    const payButton = getByText('Pay $19.99');
    fireEvent.press(payButton);

    // Should show processing state
    expect(getByText('Processing...')).toBeTruthy();

    // Wait for navigation to TransactionStatus
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        'TransactionStatus',
        expect.objectContaining({
          transaction: expect.objectContaining({
            id: 'txn_1',
            status: 'COMPLETED',
          }),
        }),
      );
    });
  });

  it('PaymentSummaryScreen shows error when cart is empty', async () => {
    const store = createMockStore({
      cart: { items: [] },
      products: { items: [], loading: false, error: null },
      checkout: {
        step: 2,
        cardInfo: {
          number: '4111111111111111',
          expiry: '12/28',
          cvc: '123',
          cardholderName: 'John Doe',
          brand: 'visa' as const,
        },
        token: undefined,
        transactionId: undefined,
      },
    });
    const { PaymentSummaryScreen } = require('../src/screens/PaymentSummaryScreen');
    const { getByText, findByText } = render(
      <Provider store={store}>
        <PaymentSummaryScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );

    // With empty cart, totalCents = 0, button shows "Pay " (with trailing space)
    const payButton = getByText('Pay ');
    fireEvent.press(payButton);
    expect(await findByText('Cart is empty')).toBeTruthy();
  });

  it('PaymentSummaryScreen shows error when product not found', async () => {
    const store = createMockStore({
      cart: { items: [{ productId: 'unknown_product', quantity: 1 }] },
      products: { items: [], loading: false, error: null },
      checkout: {
        step: 2,
        cardInfo: {
          number: '4111111111111111',
          expiry: '12/28',
          cvc: '123',
          cardholderName: 'John Doe',
          brand: 'visa' as const,
        },
        token: undefined,
        transactionId: undefined,
      },
    });
    const { PaymentSummaryScreen } = require('../src/screens/PaymentSummaryScreen');
    const { getByText, findByText } = render(
      <Provider store={store}>
        <PaymentSummaryScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );

    // With unknown product, totalCents = 0, button shows "Pay " (with trailing space)
    const payButton = getByText('Pay ');
    fireEvent.press(payButton);
    expect(await findByText('Product not found')).toBeTruthy();
  });

  it('PaymentSummaryScreen shows error when API call fails', async () => {
    const mockApiClient = {
      getProducts: jest.fn(),
      tokenizeCard: jest
        .fn()
        .mockRejectedValue(new Error('Tokenization failed')),
      chargePayment: jest.fn(),
      getTransactionStatus: jest.fn(),
    };
    (createApiClient as jest.Mock).mockReturnValue(mockApiClient);

    const store = createMockStore({
      cart: { items: [{ productId: 'p1', quantity: 1 }] },
      products: { items: [mockProduct1], loading: false, error: null },
      checkout: {
        step: 2,
        cardInfo: {
          number: '4111111111111111',
          expiry: '12/28',
          cvc: '123',
          cardholderName: 'John Doe',
          brand: 'visa' as const,
        },
        token: undefined,
        transactionId: undefined,
      },
    });
    const { PaymentSummaryScreen } = require('../src/screens/PaymentSummaryScreen');
    const { getByText, findByText } = render(
      <Provider store={store}>
        <PaymentSummaryScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );

    const payButton = getByText('Pay $19.99');
    fireEvent.press(payButton);
    expect(await findByText('Tokenization failed')).toBeTruthy();
  });

  // ===================== TransactionStatusScreen =====================
  it('TransactionStatusScreen shows no transaction data when missing', () => {
    const store = createMockStore({
      transactions: { history: [], lastTransaction: null },
    });
    const { TransactionStatusScreen } = require(
      '../src/screens/TransactionStatusScreen',
    );
    const { getByText } = render(
      <Provider store={store}>
        <TransactionStatusScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    expect(getByText('No transaction data')).toBeTruthy();
    expect(getByText('Back to Home')).toBeTruthy();
  });

  it('TransactionStatusScreen shows success state', () => {
    const store = createMockStore({
      transactions: {
        history: [],
        lastTransaction: {
          id: 'txn_1',
          status: 'COMPLETED',
          amount: 1999,
          productId: 'p1',
          quantity: 1,
          createdAt: '2025-01-01T00:00:00Z',
        },
      },
    });
    const { TransactionStatusScreen } = require(
      '../src/screens/TransactionStatusScreen',
    );
    const { getByText } = render(
      <Provider store={store}>
        <TransactionStatusScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    expect(getByText('Payment Successful')).toBeTruthy();
    expect(getByText('txn_1')).toBeTruthy();
    expect(getByText('$19.99')).toBeTruthy();
    expect(getByText('COMPLETED')).toBeTruthy();
  });

  it('TransactionStatusScreen shows failure state', () => {
    const store = createMockStore({
      transactions: {
        history: [],
        lastTransaction: {
          id: 'txn_2',
          status: 'FAILED',
          amount: 4999,
          productId: 'p2',
          quantity: 1,
          createdAt: '2025-01-01T00:00:00Z',
        },
      },
    });
    const { TransactionStatusScreen } = require(
      '../src/screens/TransactionStatusScreen',
    );
    const { getByText } = render(
      <Provider store={store}>
        <TransactionStatusScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    expect(getByText('Payment Failed')).toBeTruthy();
    expect(getByText('FAILED')).toBeTruthy();
  });

  it('TransactionStatusScreen uses route params over store', () => {
    const store = createMockStore({
      transactions: { history: [], lastTransaction: null },
    });
    const { TransactionStatusScreen } = require(
      '../src/screens/TransactionStatusScreen',
    );
    const transaction = { id: 'txn_route', status: 'COMPLETED', amount: 999 };
    const { getByText } = render(
      <Provider store={store}>
        <TransactionStatusScreen
          navigation={{ navigate: mockNavigate }}
          route={{ params: { transaction } }}
        />
      </Provider>,
    );
    expect(getByText('txn_route')).toBeTruthy();
    expect(getByText('$9.99')).toBeTruthy();
  });

  it('TransactionStatusScreen navigates back to Home', () => {
    const store = createMockStore({
      transactions: {
        history: [],
        lastTransaction: {
          id: 'txn_1',
          status: 'COMPLETED',
          amount: 1999,
          productId: 'p1',
          quantity: 1,
          createdAt: '2025-01-01T00:00:00Z',
        },
      },
    });
    const { TransactionStatusScreen } = require(
      '../src/screens/TransactionStatusScreen',
    );
    const { getByText } = render(
      <Provider store={store}>
        <TransactionStatusScreen navigation={{ navigate: mockNavigate }} />
      </Provider>,
    );
    fireEvent.press(getByText('Back to Home'));
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });
});
