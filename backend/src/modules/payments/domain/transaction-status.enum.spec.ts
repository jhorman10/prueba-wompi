import { TransactionStatus } from './transaction-status.enum';

describe('TransactionStatus', () => {
  it('should have PENDING status', () => {
    expect(TransactionStatus.PENDING).toBe('PENDING');
  });

  it('should have PROCESSING status', () => {
    expect(TransactionStatus.PROCESSING).toBe('PROCESSING');
  });

  it('should have COMPLETED status', () => {
    expect(TransactionStatus.COMPLETED).toBe('COMPLETED');
  });

  it('should have FAILED status', () => {
    expect(TransactionStatus.FAILED).toBe('FAILED');
  });

  it('should have RETRIES_EXHAUSTED status', () => {
    expect(TransactionStatus.RETRIES_EXHAUSTED).toBe('RETRIES_EXHAUSTED');
  });

  it('should have exactly 5 status values', () => {
    const keys = Object.keys(TransactionStatus);
    expect(keys.length).toBe(5);
  });

  it('should follow correct lifecycle order when transitioning', () => {
    // Valid transitions: PENDING → PROCESSING → COMPLETED | FAILED
    const validTransitions: Record<string, string[]> = {
      [TransactionStatus.PENDING]: [TransactionStatus.PROCESSING, TransactionStatus.FAILED],
      [TransactionStatus.PROCESSING]: [TransactionStatus.COMPLETED, TransactionStatus.FAILED, TransactionStatus.RETRIES_EXHAUSTED],
      [TransactionStatus.COMPLETED]: [],
      [TransactionStatus.FAILED]: [],
      [TransactionStatus.RETRIES_EXHAUSTED]: [],
    };

    // Verify the enum covers all expected states
    expect(validTransitions).toHaveProperty(TransactionStatus.PENDING);
    expect(validTransitions).toHaveProperty(TransactionStatus.PROCESSING);
    expect(validTransitions).toHaveProperty(TransactionStatus.COMPLETED);
    expect(validTransitions).toHaveProperty(TransactionStatus.FAILED);
    expect(validTransitions).toHaveProperty(TransactionStatus.RETRIES_EXHAUSTED);
  });
});
