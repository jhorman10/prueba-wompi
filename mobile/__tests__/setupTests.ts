import React, { ReactNode } from 'react';

// Mock ThemeContext globally for all component tests
jest.mock('../src/theme/ThemeContext', () => {
  const mockTheme = {
    colors: {
      background: '#fff',
      surface: '#fff',
      surfaceElevated: '#fff',
      primary: '#6200ee',
      primaryPressed: '#3700b3',
      primaryLight: '#f5f0ff',
      text: '#1a1a1a',
      textSecondary: '#666',
      textPlaceholder: '#999',
      textOnPrimary: '#fff',
      border: '#eee',
      borderSubtle: '#f0f0f0',
      tint: '#1a1a1a',
      headerBackground: '#fff',
      statusBarStyle: 'dark-content',
      scrim: 'rgba(0,0,0,0.5)',
      success: '#059669',
      error: '#dc2626',
      warning: '#d97706',
      skeleton: '#eee',
      shadow: 'rgba(0,0,0,0.08)',
    },
    isDark: false,
    spacing: { xxs: 2, xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40, huge: 48 },
    radius: { sm: 6, md: 10, lg: 14, xl: 20, full: 999 },
    typography: {
      h1: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
      h2: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
      h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
      body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
      bodyBold: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
      caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
      small: { fontSize: 11, fontWeight: '400', lineHeight: 16 },
      label: { fontSize: 11, fontWeight: '600', lineHeight: 16, letterSpacing: 0.8 },
    },
    shadows: {
      sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
      md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
      lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8 },
    },
  };

  return {
    ThemeProvider: ({ children }: { children: ReactNode }) => children,
    useTheme: () => mockTheme,
    useDarkMode: () => ({ isDark: false, toggleDarkMode: jest.fn() }),
  };
});

// Mock react-native-encrypted-storage
jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock react-native-screens
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  Screen: ({ children }: { children: ReactNode }) => children,
  ScreenStack: ({ children }: { children: ReactNode }) => children,
}));

// Silence console.warn in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('EncryptedStorage')) return;
  originalWarn.apply(console, args);
};