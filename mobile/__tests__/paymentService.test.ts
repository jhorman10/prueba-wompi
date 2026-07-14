import { processPayment, PaymentItem } from '../src/services/paymentService';
import { ApiClient } from '../src/services/api';
import type { TransactionRecord } from '../src/store/slices/transactionsSlice';

function makeMockApi(
  overrides: Partial<jest.Mocked<ApiClient>> = {},
): jest.Mocked<ApiClient> {
  return {
    getProducts: jest.fn(),
    tokenizeCard: jest.fn(),
    chargePayment: jest.fn(),
    getTransactionStatus: jest.fn(),
    ...overrides,
  };
}

const cardInfo = {
  number: '4242424242424242',
  expiry: '12/28',
  cvc: '123',
  cardholderName: 'John Doe',
};

const items: PaymentItem[] = [
  { productId: 'prod-1', quantity: 2, unitPrice: 10000, productName: 'Product 1' },
  { productId: 'prod-2', quantity: 1, unitPrice: 5000, productName: 'Product 2' },
];

describe('processPayment (A2)', () => {
  it('tokenizes then charges and returns the transaction and token', async () => {
    const api = makeMockApi({
      tokenizeCard: jest.fn().mockResolvedValue({
        token: 'tok_123',
        idempotencyKey: 'idem_456',
      }),
      chargePayment: jest.fn().mockResolvedValue({
        transaction: {
          id: 'tx-1',
          status: 'COMPLETED',
          totalAmount: 199998,
        } as TransactionRecord & { totalAmount?: number },
      }),
    });

    const result = await processPayment({ items, cardInfo, totalCents: 9999 }, api);

    expect(api.tokenizeCard).toHaveBeenCalledWith({
      number: cardInfo.number,
      expiry: cardInfo.expiry,
      cvc: cardInfo.cvc,
      name: cardInfo.cardholderName,
    });
    expect(api.chargePayment).toHaveBeenCalledWith({
      token: 'tok_123',
      items,
      idempotencyKey: 'idem_456',
      cardLastFour: '4242',
      cardholderName: 'John Doe',
    });
    expect(result.token).toBe('tok_123');
    expect(result.transaction.id).toBe('tx-1');
    expect(result.transaction.amount).toBe(199998);
  });

  it('falls back to totalCents when the charge omits totalAmount', async () => {
    const api = makeMockApi({
      tokenizeCard: jest.fn().mockResolvedValue({
        token: 'tok_x',
        idempotencyKey: 'idem_x',
      }),
      chargePayment: jest.fn().mockResolvedValue({
        transaction: {
          id: 'tx-2',
          status: 'PENDING',
        } as TransactionRecord,
      }),
    });

    const result = await processPayment({ items, cardInfo, totalCents: 5000 }, api);

    expect(result.transaction.amount).toBe(5000);
    expect(result.transaction.productId).toBe('prod-1');
    expect(result.transaction.quantity).toBe(2);
  });

  it('propagates tokenize errors without charging', async () => {
    const api = makeMockApi({
      tokenizeCard: jest
        .fn()
        .mockRejectedValue(new Error('Gateway timeout')),
    });

    await expect(
      processPayment({ items, cardInfo, totalCents: 0 }, api),
    ).rejects.toThrow('Gateway timeout');
    expect(api.chargePayment).not.toHaveBeenCalled();
  });

  it('propagates charge errors', async () => {
    const api = makeMockApi({
      tokenizeCard: jest.fn().mockResolvedValue({
        token: 'tok_y',
        idempotencyKey: 'idem_y',
      }),
      chargePayment: jest
        .fn()
        .mockRejectedValue(new Error('Charge declined')),
    });

    await expect(
      processPayment({ items, cardInfo, totalCents: 0 }, api),
    ).rejects.toThrow('Charge declined');
  });
});
