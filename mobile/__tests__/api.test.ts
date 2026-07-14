import { createApiClient, ApiClient } from '../src/services/api';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('api client', () => {
  let api: ApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
      },
      defaults: {
        baseURL: '',
        headers: { common: {} },
      },
    } as any);
    api = createApiClient('http://localhost:3000/api');
  });

  it('creates axios instance with correct base URL', () => {
    expect(mockedAxios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://localhost:3000/api',
      }),
    );
  });

  it('exposes getProducts function', async () => {
    const mockProducts = [{ id: '1', name: 'Test', price: 1000, description: 'desc', imageUrl: 'url', stock: 5 }];
    const axiosInstance = mockedAxios.create();
    (axiosInstance.get as jest.Mock).mockResolvedValue({ data: mockProducts });

    const result = await api.getProducts();
    expect(axiosInstance.get).toHaveBeenCalledWith('/products');
    expect(result).toEqual(mockProducts);
  });

  it('exposes tokenizeCard function', async () => {
    const mockToken = { token: 'tok_test_123' };
    const axiosInstance = mockedAxios.create();
    (axiosInstance.post as jest.Mock).mockResolvedValue({ data: mockToken });

    const cardDetails = { number: '4111111111111111', expiry: '12/25', cvc: '123', name: 'John Doe' };
    const result = await api.tokenizeCard(cardDetails);
    expect(axiosInstance.post).toHaveBeenCalledWith('/payments/tokenize', cardDetails);
    expect(result).toEqual(mockToken);
  });

  it('exposes chargePayment function', async () => {
    const mockCharge = { transaction: { id: 'txn_1', status: 'COMPLETED' }, isDuplicate: false };
    const axiosInstance = mockedAxios.create();
    (axiosInstance.post as jest.Mock).mockResolvedValue({ data: mockCharge });

    const chargeData = { 
      token: 'tok_test_123', 
      items: [{ productId: 'p1', quantity: 2, unitPrice: 10000, productName: 'Product 1' }], 
      idempotencyKey: 'key_123', 
      cardLastFour: '1111', 
      cardholderName: 'John Doe' 
    };
    const result = await api.chargePayment(chargeData);
    expect(axiosInstance.post).toHaveBeenCalledWith('/payments/charge', chargeData);
    expect(result).toEqual(mockCharge);
  });

  it('exposes getTransactionStatus function', async () => {
    const mockTransaction = { transaction: { id: 'txn_1', status: 'COMPLETED' } };
    const axiosInstance = mockedAxios.create();
    (axiosInstance.get as jest.Mock).mockResolvedValue({ data: mockTransaction });

    const result = await api.getTransactionStatus('txn_1');
    expect(axiosInstance.get).toHaveBeenCalledWith('/payments/txn_1');
    expect(result).toEqual(mockTransaction);
  });

  it('handles API errors gracefully', async () => {
    const axiosInstance = mockedAxios.create();
    (axiosInstance.get as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(api.getProducts()).rejects.toThrow('Network error');
  });
});
