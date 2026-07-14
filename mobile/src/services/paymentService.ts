import { ApiClient } from './api';
import type { TransactionRecord } from '../store/slices/transactionsSlice';

export interface PaymentCardInfo {
  number: string;
  expiry: string;
  cvc: string;
  cardholderName: string;
}

export interface PaymentItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  productName?: string;
}

export interface PaymentInput {
  items: PaymentItem[];
  cardInfo: PaymentCardInfo;
  totalCents: number;
}

export interface PaymentResult {
  transaction: TransactionRecord;
  token: string;
  items: PaymentItem[];
}

/**
 * Encapsulates the payment flow (tokenize -> charge) so the UI stays thin (SRP).
 *
 * The idempotency key returned by the tokenize endpoint is reused for the charge
 * call (A5) instead of being generated client-side, preventing duplicate charges.
 */
export async function processPayment(
  input: PaymentInput,
  api: ApiClient,
): Promise<PaymentResult> {
  const { items, cardInfo, totalCents } = input;

  const tokenResult = await api.tokenizeCard({
    number: cardInfo.number,
    expiry: cardInfo.expiry,
    cvc: cardInfo.cvc,
    name: cardInfo.cardholderName,
  });

  const token = tokenResult.token;
  // Server-generated idempotency key (A5) — never reuse a client-generated one.
  const idempotencyKey = tokenResult.idempotencyKey;

  const chargeItems = items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    productName: item.productName,
  }));

  const chargeResponse = (await api.chargePayment({
    token,
    items: chargeItems,
    idempotencyKey,
    cardLastFour: cardInfo.number.slice(-4),
    cardholderName: cardInfo.cardholderName,
  })) as { transaction: TransactionRecord & { totalAmount?: number } };

  const rawTransaction = chargeResponse.transaction;

  const transaction: TransactionRecord = {
    id: rawTransaction.id,
    status: rawTransaction.status,
    amount: rawTransaction.totalAmount ?? totalCents,
    productId: items[0]!.productId,
    quantity: items[0]!.quantity,
    createdAt: new Date().toISOString(),
  };

  return { transaction, token, items };
}
