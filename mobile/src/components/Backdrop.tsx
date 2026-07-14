import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Theme } from '../theme/ThemeContext';

export interface BackdropProps {
  /** Controls whether the scrim + panel are shown. When false, nothing is rendered. */
  visible: boolean;
  /** Called when the user dismisses the backdrop (scrim tap or close button). */
  onClose: () => void;
  /** Presentational content rendered inside the sliding panel. */
  children: React.ReactNode;
  /** Optional title shown in the panel header. */
  title?: string;
}

/**
 * Pure presentational bottom-sheet overlay.
 *
 * Renders a dimmed scrim plus a panel that slides up from the bottom. It owns
 * no business logic — visibility and dismissal are driven entirely by the
 * `visible` and `onClose` props. Not rendered at all when `visible` is false.
 */
export function Backdrop({ visible, onClose, children, title }: BackdropProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const slideRef = useRef<Animated.Value | null>(null);
  if (slideRef.current === null) {
    slideRef.current = new Animated.Value(0);
  }
  const slide = slideRef.current;

  useEffect(() => {
    if (!visible) return;
    Animated.timing(slide, {
      toValue: 1,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [visible, slide]);

  if (!visible) {
    return null;
  }

  const panelTranslate = slide.interpolate({
    inputRange: [0, 1],
    outputRange: ['100%', '0%'],
  });

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <Pressable
        testID="backdrop-scrim"
        style={styles.scrim}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <Animated.View
        style={[styles.panel, { transform: [{ translateY: panelTranslate }] }]}
      >
        <View style={styles.header}>
          <Pressable
            testID="backdrop-close"
            style={({ pressed }) => [
              styles.closeButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={16}
          >
            <Text style={styles.closeText}>‹</Text>
          </Pressable>
          {title ? (
            <Text style={styles.title}>{title}</Text>
          ) : (
            <View style={styles.titleSpacer} />
          )}
          <View style={styles.titleSpacer} />
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
    },
    scrim: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.scrim,
      zIndex: 0,
    },
    panel: {
      width: '100%',
      maxHeight: '90%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.colors.surfaceElevated,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      paddingBottom: theme.spacing.xl,
      zIndex: 1,
      elevation: Platform.OS === 'android' ? 10 : undefined,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSubtle,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    titleSpacer: {
      flex: 1,
    },
    closeButton: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      marginLeft: Platform.OS === 'android' ? -4 : -8,
    },
    closeText: {
      fontSize: 28,
      lineHeight: 32,
      color: theme.colors.text,
      fontWeight: '300',
    },
  });