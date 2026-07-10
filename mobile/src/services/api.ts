import axios, { AxiosInstance } from 'axios';

export interface CardTokenizeRequest {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
}

export interface ChargeRequest {
  token: string;
  productId: string;
  quantity: number;
  idempotencyKey: string;
  cardLastFour: string;
  cardholderName: string;
  totalAmount: number;
}

export interface ApiClient {
  getProducts: () => Promise<unknown>;
  tokenizeCard: (details: CardTokenizeRequest) => Promise<{ token: string }>;
  chargePayment: (data: ChargeRequest) => Promise<unknown>;
  getTransactionStatus: (id: string) => Promise<unknown>;
}

/**
 * Create an Axios-based API client pointing to the given base URL.
 */
export function createApiClient(baseURL: string): ApiClient {
  const client: AxiosInstance = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return {
    getProducts: async () => {
      const { data } = await client.get('/products');
      return data;
    },

    tokenizeCard: async (
      details: CardTokenizeRequest,
    ): Promise<{ token: string }> => {
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
