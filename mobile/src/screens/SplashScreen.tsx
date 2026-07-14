import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Theme } from '../theme/ThemeContext';

/**
 * Splash screen — shown for 2 seconds then auto-navigates to Home.
 */
export function SplashScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Checkout</Text>
      <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: theme.spacing.xl,
    },
    spinner: {
      marginTop: theme.spacing.base,
    },
  });
