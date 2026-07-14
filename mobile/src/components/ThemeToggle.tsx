import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/**
 * Displays the current system theme mode (dark/light).
 * Read-only indicator — theme follows the device setting.
 */
export function ThemeToggle() {
  const theme = useTheme();
  const { colors, radius, isDark } = theme;

  return (
    <View
      style={[
        styles.toggle,
        {
          backgroundColor: isDark ? colors.surfaceElevated : colors.primaryLight,
          borderRadius: radius.full,
          borderColor: colors.borderSubtle,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={isDark ? 'Dark mode active' : 'Light mode active'}
    >
      <Text style={[styles.icon, { color: isDark ? '#fbbf24' : '#7c3aed' }]}>
        {isDark ? '🌙' : '☀️'}
      </Text>
    </View>
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
