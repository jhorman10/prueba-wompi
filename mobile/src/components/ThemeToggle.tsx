import React from 'react';
import { Pressable, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme, useDarkMode } from '../theme/ThemeContext';

/**
 * Animated dark/light mode toggle.
 * Renders a compact pill with a sun/moon indicator.
 */
export function ThemeToggle() {
  const theme = useTheme();
  const { isDark, toggleDarkMode } = useDarkMode();
  const { colors, radius } = theme;

  return (
    <Pressable
      onPress={toggleDarkMode}
      style={({ pressed }) => [
        styles.toggle,
        {
          backgroundColor: isDark ? colors.surfaceElevated : colors.primaryLight,
          borderRadius: radius.full,
          borderColor: colors.borderSubtle,
        },
        pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      hitSlop={8}
    >
      <Text style={[styles.icon, { color: isDark ? '#fbbf24' : '#7c3aed' }]}>
        {isDark ? '🌙' : '☀️'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  icon: {
    fontSize: 16,
  },
});
