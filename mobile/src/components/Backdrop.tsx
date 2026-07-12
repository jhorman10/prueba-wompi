import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';

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
          {title ? (
            <Text style={styles.title}>{title}</Text>
          ) : (
            <View style={styles.titleSpacer} />
          )}
          <Pressable
            testID="backdrop-close"
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 0,
  },
  panel: {
    width: '100%',
    maxHeight: '90%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    zIndex: 1,
    elevation: Platform.OS === 'android' ? 10 : undefined,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  titleSpacer: {
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginLeft: 8,
  },
  closeText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
});
