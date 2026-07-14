import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Theme } from '../theme/ThemeContext';

interface CardInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  label: string;
  error?: string;
  keyboardType?: 'default' | 'number-pad' | 'numeric';
  maxLength?: number;
  secureTextEntry?: boolean;
}

/**
 * Controlled text input for credit card fields
 * with label, error display, and keyboard configuration.
 */
export function CardInput({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  keyboardType = 'default',
  maxLength,
  secureTextEntry = false,
}: CardInputProps) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textPlaceholder}
        keyboardType={keyboardType}
        maxLength={maxLength}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.base,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    error: {
      fontSize: 12,
      color: theme.colors.error,
      marginTop: theme.spacing.xs,
    },
  });
