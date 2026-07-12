import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

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

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    padding: 16,
    zIndex: 1000,
  },
  toast: {
    backgroundColor: '#323232',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: '90%',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
