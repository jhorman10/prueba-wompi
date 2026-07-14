import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Theme } from '../theme/ThemeContext';

const LOGO = require('../assets/images/logo.png');

/**
 * Splash screen — brand landing with logo, shown for 2 seconds
 * then auto-navigates to Home.
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
      <View style={styles.logoContainer}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </View>
      <Text style={styles.title}>Payment Checkout</Text>
      <Text style={styles.tagline}>Secure. Fast. Reliable.</Text>
      <ActivityIndicator
        size="large"
        color={theme.colors.primary}
        style={styles.spinner}
      />
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
    logoContainer: {
      width: 120,
      height: 120,
      borderRadius: 30,
      backgroundColor: theme.colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
      ...theme.shadows.md,
    },
    logo: {
      width: 100,
      height: 100,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    tagline: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textSecondary,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom: theme.spacing.xxl,
    },
    spinner: {
      marginTop: theme.spacing.base,
    },
  });
