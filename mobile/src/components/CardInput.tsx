import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

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
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        keyboardType={keyboardType}
        maxLength={maxLength}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#e53935',
  },
  error: {
    fontSize: 12,
    color: '#e53935',
    marginTop: 4,
  },
});
