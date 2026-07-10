import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity } from '../domain/transaction.entity';
import { ITransactionRepository } from '../domain/transaction.repository';

@Injectable()
export class TransactionTypeOrmRepository implements ITransactionRepository {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly ormRepo: Repository<TransactionEntity>,
  ) {}

  async create(transaction: Partial<TransactionEntity>): Promise<TransactionEntity> {
    const entity = this.ormRepo.create(transaction);
    return this.ormRepo.save(entity);
  }

  async findById(id: string): Promise<TransactionEntity | null> {
    return this.ormRepo.findOne({ where: { id } });
  }

  async findByIdempotencyKey(key: string): Promise<TransactionEntity | null> {
    return this.ormRepo.findOne({ where: { idempotencyKey: key } });
  }

  async update(id: string, data: Partial<TransactionEntity>): Promise<TransactionEntity> {
    await this.ormRepo.update(id, data);
    return this.ormRepo.findOneOrFail({ where: { id } });
  }
}
