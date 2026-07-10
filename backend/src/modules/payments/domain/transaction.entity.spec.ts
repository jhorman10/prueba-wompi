import { TransactionEntity } from './transaction.entity';
import { TransactionStatus } from './transaction-status.enum';

describe('TransactionEntity', () => {
  it('should create a transaction with default PENDING status', () => {
    const tx = new TransactionEntity();
    expect(tx.status).toBe(TransactionStatus.PENDING);
  });

  it('should store all payment fields', () => {
    const tx = new TransactionEntity();
    tx.id = 'tx-1';
    tx.status = TransactionStatus.COMPLETED;
    tx.gatewayToken = 'tok_abc123';
    tx.gatewayReference = 'ref_xyz789';
    tx.productId = 'prod-1';
    tx.quantity = 2;
    tx.totalAmount = 199998;
    tx.cardholderName = 'John Doe';
    tx.cardLastFour = '4242';

    expect(tx.id).toBe('tx-1');
    expect(tx.status).toBe(TransactionStatus.COMPLETED);
    expect(tx.gatewayToken).toBe('tok_abc123');
    expect(tx.gatewayReference).toBe('ref_xyz789');
    expect(tx.productId).toBe('prod-1');
    expect(tx.quantity).toBe(2);
    expect(tx.totalAmount).toBe(199998);
    expect(tx.cardholderName).toBe('John Doe');
    expect(tx.cardLastFour).toBe('4242');
  });

  it('should transition from PENDING to PROCESSING to COMPLETED', () => {
    const tx = new TransactionEntity();
    tx.status = TransactionStatus.PENDING;

    tx.status = TransactionStatus.PROCESSING;
    expect(tx.status).toBe(TransactionStatus.PROCESSING);

    tx.status = TransactionStatus.COMPLETED;
    expect(tx.status).toBe(TransactionStatus.COMPLETED);
  });

  it('should handle FAILED transition from PROCESSING', () => {
    const tx = new TransactionEntity();
    tx.status = TransactionStatus.PROCESSING;
    tx.gatewayErrorCode = 'insufficient_funds';

    tx.status = TransactionStatus.FAILED;

    expect(tx.status).toBe(TransactionStatus.FAILED);
    expect(tx.gatewayErrorCode).toBe('insufficient_funds');
  });

  it('should handle RETRIES_EXHAUSTED status', () => {
    const tx = new TransactionEntity();
    tx.id = 'tx-retry';
    tx.status = TransactionStatus.RETRIES_EXHAUSTED;

    expect(tx.status).toBe(TransactionStatus.RETRIES_EXHAUSTED);
  });

  it('should store idempotency key', () => {
    const tx = new TransactionEntity();
    tx.idempotencyKey = 'idemp-abc-123';
    expect(tx.idempotencyKey).toBe('idemp-abc-123');
  });
});
