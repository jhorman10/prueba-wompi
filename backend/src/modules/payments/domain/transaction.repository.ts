import { TransactionEntity } from './transaction.entity';

export interface ITransactionRepository {
  create(transaction: Partial<TransactionEntity>): Promise<TransactionEntity>;
  findById(id: string): Promise<TransactionEntity | null>;
  findByIdempotencyKey(key: string): Promise<TransactionEntity | null>;
  update(id: string, data: Partial<TransactionEntity>): Promise<TransactionEntity>;
}

export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY');
