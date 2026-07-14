import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Theme } from '../theme/ThemeContext';

export interface ToastProps {
  /** Message to display. When `null` the toast renders nothing. */
  message: string | null;
  /** Called automatically after `duration` ms, or when dismissed. */
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. Defaults to 3000. */
  duration?: number;
}

/**
 * Minimal cross-platform toast.
 *
 * Renders nothing while `message` is null. When a message is set it slides up
 * from the bottom and auto-dismisses after `duration` ms. Used for the unhappy
 * payment path instead of a blocking `Alert.alert`.
 */
export function Toast({ message, onDismiss, duration = 3000 }: ToastProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!message) {
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, opacity, translateY, duration, onDismiss]);

  if (!message) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[styles.toast, { opacity, transform: [{ translateY }] }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
      >
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      padding: theme.spacing.base,
      zIndex: 1000,
    },
    toast: {
      backgroundColor: theme.isDark ? '#2d2d2d' : '#323232',
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      maxWidth: '90%',
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
    },
    text: {
      color: theme.colors.textOnPrimary,
      fontSize: 14,
      fontWeight: '500',
    },
  });
