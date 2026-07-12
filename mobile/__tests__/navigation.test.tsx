import React from 'react';
import { render } from '@testing-library/react-native';
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
}));

// Create a mock store factory for tests
const createMockStore = () =>
  configureStore({
    reducer: {
      products: (state = { items: [], loading: false, error: null }) => state,
      cart: (state = { items: [] }) => state,
      checkout: (state = { step: 0 }) => state,
      transactions: (state = { history: [], lastTransaction: null }) => state,
    },
  });

const mockNavigate = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    reset: mockReset,
  }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => {
    const Navigator = ({ children }: { children: React.ReactNode }) => <>{children}</>;
    const Screen = ({ component: Component }: { component?: React.ComponentType<unknown> }) =>
      Component ? <Component /> : null;
    return { Navigator, Screen };
  },
}));

// Mock redux-persist
jest.mock('redux-persist', () => ({
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
}));

jest.useFakeTimers();

describe('App and Navigation', () => {
  it('AppNavigator renders SplashScreen as initial screen', () => {
    // Wrap in Provider since other screens in the nav may use Redux
    const MockNavigator = () => {
      const { AppNavigator: Nav } = require('../src/navigation/AppNavigator');
      return <Nav />;
    };
    const { getByText } = render(
      <Provider store={createMockStore()}>
        <MockNavigator />
      </Provider>,
    );
    // The SplashScreen renders the app title
    expect(getByText('Payment Checkout')).toBeTruthy();
    // After 2s, resets to Home (so back closes the app)
    jest.advanceTimersByTime(2000);
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  });
});
