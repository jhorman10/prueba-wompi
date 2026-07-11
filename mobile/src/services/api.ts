import axios from 'axios';
import { getApiClient } from './apiClient';

export interface CardTokenizeRequest {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
}

export interface ChargeItem {
  productId: string;
  quantity: number;
}

export interface ChargeRequest {
  token: string;
  items: ChargeItem[];
  idempotencyKey: string;
  cardLastFour: string;
  cardholderName: string;
}

export interface ApiClient {
  getProducts: () => Promise<unknown>;
  tokenizeCard: (details: CardTokenizeRequest) => Promise<{ token: string; idempotencyKey: string }>;
  chargePayment: (data: ChargeRequest) => Promise<unknown>;
  getTransactionStatus: (id: string) => Promise<unknown>;
}

/**
 * Get the singleton API client.
 * Uses the shared Axios instance from apiClient.ts.
 */
export function getApiClientInstance(): ApiClient {
  const client = getApiClient();

  return {
    getProducts: async () => {
      const { data } = await client.get('/products');
      return data;
    },

    tokenizeCard: async (
      details: CardTokenizeRequest,
    ): Promise<{ token: string; idempotencyKey: string }> => {
      const { data } = await client.post('/payments/tokenize', details);
      return data;
    },

    chargePayment: async (chargeData: ChargeRequest): Promise<unknown> => {
      const { data } = await client.post('/payments/charge', chargeData);
      return data;
    },

    getTransactionStatus: async (id: string): Promise<unknown> => {
      const { data } = await client.get(`/payments/${id}`);
      return data;
    },
  };
}

/**
 * @deprecated Use getApiClientInstance() instead.
 * Kept for backward compatibility — creates a NEW client (not recommended).
 */
export function createApiClient(baseURL: string): ApiClient {
  // PCI DSS: warn if sending card data over HTTP to non-localhost
  if (__DEV__ && baseURL.startsWith('http://')) {
    const isLocalhost =
      baseURL.includes('localhost') ||
      baseURL.includes('127.0.0.1') ||
      baseURL.includes('192.168.') ||
      baseURL.includes('10.') ||
      baseURL.includes('172.16.');
    if (!isLocalhost) {
      console.warn(
        '[PCI WARNING] API client configured with HTTP for non-localhost host! ' +
          'Use HTTPS in production to protect card data.',
      );
    }
  }

  // Use the singleton but with overridden baseURL (creates new instance if needed)
  // Note: This bypasses the singleton pattern. Prefer getApiClientInstance().
  const client = axios.create({
    baseURL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  });

  return {
    getProducts: async () => {
      const { data } = await client.get('/products');
      return data;
    },
    tokenizeCard: async (details: CardTokenizeRequest): Promise<{ token: string; idempotencyKey: string }> => {
      const { data } = await client.post('/payments/tokenize', details);
      return data;
    },
    chargePayment: async (chargeData: ChargeRequest): Promise<unknown> => {
      const { data } = await client.post('/payments/charge', chargeData);
      return data;
    },
    getTransactionStatus: async (id: string): Promise<unknown> => {
      const { data } = await client.get(`/payments/${id}`);
      return data;
    },
  };
}