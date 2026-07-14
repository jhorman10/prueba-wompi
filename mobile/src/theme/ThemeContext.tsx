import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ThemeColors } from './colors';
import { spacing } from './spacing';

export interface Theme {
  colors: ThemeColors;
  isDark: boolean;
  spacing: typeof spacing;
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  typography: {
    h1: { fontSize: number; fontWeight: '700'; lineHeight: number };
    h2: { fontSize: number; fontWeight: '700'; lineHeight: number };
    h3: { fontSize: number; fontWeight: '600'; lineHeight: number };
    body: { fontSize: number; fontWeight: '400'; lineHeight: number };
    bodyBold: { fontSize: number; fontWeight: '600'; lineHeight: number };
    caption: { fontSize: number; fontWeight: '400'; lineHeight: number };
    small: { fontSize: number; fontWeight: '400'; lineHeight: number };
    label: { fontSize: number; fontWeight: '600'; lineHeight: number; letterSpacing: number };
  };
  shadows: {
    sm: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    md: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    lg: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}

function buildTheme(colors: ThemeColors, isDark: boolean): Theme {
  return {
    colors,
    isDark,
    spacing,
    radius: {
      sm: 6,
      md: 10,
      lg: 14,
      xl: 20,
      full: 999,
    },
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
      sm: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 3,
        elevation: 2,
      },
      md: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 4,
      },
      lg: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 16,
        elevation: 8,
      },
    },
  };
}

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');

  useEffect(() => {
    // Sync with system when no manual override is stored
    setIsDark(systemScheme === 'dark');
  }, [systemScheme]);

  const toggleDarkMode = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  const colors = isDark ? darkColors : lightColors;
  const theme = useMemo(() => buildTheme(colors, isDark), [colors, isDark]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx.theme;
}

export function useDarkMode(): { isDark: boolean; toggleDarkMode: () => void } {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useDarkMode must be used within a ThemeProvider');
  }
  return { isDark: ctx.isDark, toggleDarkMode: ctx.toggleDarkMode };
}

export { lightColors, darkColors };
