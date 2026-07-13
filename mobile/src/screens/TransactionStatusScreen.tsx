import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { PriceTag } from '../components/PriceTag';

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
            pressed && { opacity: 0.6 },
          ]}
          hitSlop={8}
        >
          <Text style={styles.headerExitText}>←</Text>
        </Pressable>
      ),
    });
  }, [stackNavigation]);

  const goHome = () => {
    stackNavigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  if (!transaction) {
    return (
      <View style={styles.center}>
        <Text style={styles.noDataText}>No transaction data</Text>
        <Pressable
          style={({ pressed }) => [styles.homeButton, pressed && { opacity: 0.8 }]}
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
        style={({ pressed }) => [styles.homeButton, pressed && { opacity: 0.8 }]}
        onPress={goHome}
      >
        <Text style={styles.homeButtonText}>Back to Home</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  content: {
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
  },
  statusBadge: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 32,
  },
  successBadge: {
    backgroundColor: '#e8f5e9',
  },
  failureBadge: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
  },
  successText: {
    color: '#2e7d32',
  },
  failureText: {
    color: '#e53935',
  },
  details: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  successValue: {
    color: '#2e7d32',
  },
  failureValue: {
    color: '#e53935',
  },
  headerExitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Platform.OS === 'android' ? 0 : -4,
  },
  headerExitText: {
    fontSize: 22,
    lineHeight: 24,
    color: '#666',
    fontWeight: '500',
  },
  homeButton: {
    backgroundColor: '#6200ee',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
