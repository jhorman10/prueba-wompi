import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { PriceTag } from '../components/PriceTag';

interface TransactionStatusScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
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

  if (!transaction) {
    return (
      <View style={styles.center}>
        <Text style={styles.noDataText}>No transaction data</Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation?.navigate('Home')}
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSuccess = transaction.status === 'COMPLETED';

  return (
    <View style={styles.container}>
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

      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => navigation?.navigate('Home')}
      >
        <Text style={styles.homeButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
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
