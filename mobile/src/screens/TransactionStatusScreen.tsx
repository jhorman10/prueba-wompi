import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { PriceTag } from '../components/PriceTag';
import { useTheme, Theme } from '../theme/ThemeContext';

interface TransactionStatusScreenProps {
  navigation?: {
    navigate: (screen: string, params?: object) => void;
  };
  route?: {
    params: {
      transaction: {
        id: string;
        status: string;
        amount: number;
      };
    };
  };
}

/**
 * Transaction status screen — shows payment result (success/failure).
 */
export function TransactionStatusScreen({
  navigation,
  route,
}: TransactionStatusScreenProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { colors, spacing, radius } = theme;
  const lastTransaction = useSelector(
    (state: RootState) => state.transactions.lastTransaction,
  );

  const transaction = route?.params?.transaction ?? lastTransaction;
  const stackNavigation = useNavigation<any>();

  useLayoutEffect(() => {
    stackNavigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => {
            if (Platform.OS === 'android') {
              BackHandler.exitApp();
            }
          }}
          style={({ pressed }) => [
            styles.headerExitButton,
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={16}
        >
          <Text style={[styles.headerExitText, { color: colors.tint }]}>‹</Text>
        </Pressable>
      ),
    });
  }, [stackNavigation, colors.tint]);

  const goHome = () => {
    stackNavigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  if (!transaction) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={styles.noDataText}>No transaction data</Text>
        <Pressable
          style={({ pressed }) => [styles.homeButton, pressed && { opacity: 0.7 }]}
          onPress={goHome}
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  const isSuccess = transaction.status === 'COMPLETED';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Transaction Status</Text>

      <View style={[styles.statusBadge, isSuccess ? styles.successBadge : styles.failureBadge]}>
        <Text style={[styles.statusText, isSuccess ? styles.successText : styles.failureText]}>
          {isSuccess ? 'Payment Successful' : 'Payment Failed'}
        </Text>
      </View>

      <View style={styles.details}>
        {transaction.id && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction ID</Text>
            <Text style={styles.detailValue}>{transaction.id}</Text>
          </View>
        )}
        {transaction.amount != null && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <PriceTag cents={transaction.amount} style={styles.detailValue} />
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text
            style={[
              styles.detailValue,
              isSuccess ? styles.successValue : styles.failureValue,
            ]}
          >
            {transaction.status}
          </Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.homeButton, pressed && { opacity: 0.7 }]}
        onPress={goHome}
      >
        <Text style={styles.homeButtonText}>Back to Home</Text>
      </Pressable>
    </ScrollView>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.base,
    },
    content: {
      paddingBottom: 32,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.base,
    },
    noDataText: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.base,
    },
    heading: {
      fontSize: theme.typography.h2.fontSize,
      fontWeight: theme.typography.h2.fontWeight,
      color: theme.colors.text,
      marginBottom: theme.spacing.xl,
      textAlign: 'center',
    },
    statusBadge: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.radius.md,
      alignSelf: 'center',
      marginBottom: 32,
    },
    successBadge: {
      backgroundColor: theme.colors.success + '1A',
    },
    failureBadge: {
      backgroundColor: theme.colors.error + '1A',
    },
    statusText: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: '700',
    },
    successText: {
      color: theme.colors.success,
    },
    failureText: {
      color: theme.colors.error,
    },
    details: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: theme.spacing.base,
      marginBottom: 32,
      ...theme.shadows.sm,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSubtle,
    },
    detailLabel: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textSecondary,
    },
    detailValue: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: '600',
      color: theme.colors.text,
    },
    successValue: {
      color: theme.colors.success,
    },
    failureValue: {
      color: theme.colors.error,
    },
    headerExitButton: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      marginLeft: Platform.OS === 'android' ? -4 : -8,
    },
    headerExitText: {
      fontSize: 28,
      lineHeight: 32,
      fontWeight: '300',
    },
    homeButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      padding: theme.spacing.base,
      alignItems: 'center',
    },
    homeButtonText: {
      color: theme.colors.textOnPrimary,
      fontSize: theme.typography.bodyBold.fontSize,
      fontWeight: theme.typography.bodyBold.fontWeight,
    },
  });
