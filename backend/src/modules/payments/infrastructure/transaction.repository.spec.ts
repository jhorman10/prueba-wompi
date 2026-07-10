import { TransactionTypeOrmRepository } from './transaction.repository';
import { TransactionEntity } from '../domain/transaction.entity';
import { TransactionStatus } from '../domain/transaction-status.enum';

describe('TransactionTypeOrmRepository', () => {
  let repo: TransactionTypeOrmRepository;
  let mockOrmRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    findOneOrFail: jest.Mock;
  };

  beforeEach(() => {
    mockOrmRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      findOneOrFail: jest.fn(),
    };
    repo = new TransactionTypeOrmRepository(mockOrmRepo as any);
  });

  it('should create a transaction via ormRepo', async () => {
    const partial = {
      productId: 'prod-1',
      quantity: 2,
      totalAmount: 199998,
      status: TransactionStatus.PENDING,
    };
    const createdEntity = Object.assign(new TransactionEntity(), { id: 'tx-1', ...partial });

    mockOrmRepo.create.mockReturnValue(createdEntity);
    mockOrmRepo.save.mockResolvedValue(createdEntity);

    const result = await repo.create(partial);

    expect(result.id).toBe('tx-1');
    expect(result.status).toBe(TransactionStatus.PENDING);
    expect(mockOrmRepo.create).toHaveBeenCalledWith(partial);
    expect(mockOrmRepo.save).toHaveBeenCalledWith(createdEntity);
  });

  it('should find transaction by id', async () => {
    const tx = Object.assign(new TransactionEntity(), { id: 'tx-1', status: TransactionStatus.COMPLETED });
    mockOrmRepo.findOne.mockResolvedValue(tx);

    const result = await repo.findById('tx-1');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('tx-1');
    expect(mockOrmRepo.findOne).toHaveBeenCalledWith({ where: { id: 'tx-1' } });
  });

  it('should return null when findById finds nothing', async () => {
    mockOrmRepo.findOne.mockResolvedValue(null);

    const result = await repo.findById('nonexistent');

    expect(result).toBeNull();
  });

  it('should find transaction by idempotency key', async () => {
    const tx = Object.assign(new TransactionEntity(), { id: 'tx-1', idempotencyKey: 'key-123' });
    mockOrmRepo.findOne.mockResolvedValue(tx);

    const result = await repo.findByIdempotencyKey('key-123');

    expect(result).not.toBeNull();
    expect(result!.idempotencyKey).toBe('key-123');
    expect(mockOrmRepo.findOne).toHaveBeenCalledWith({ where: { idempotencyKey: 'key-123' } });
  });

  it('should return null when idempotency key not found', async () => {
    mockOrmRepo.findOne.mockResolvedValue(null);

    const result = await repo.findByIdempotencyKey('unknown-key');

    expect(result).toBeNull();
  });

  it('should update transaction and return updated entity', async () => {
    const updatedTx = Object.assign(new TransactionEntity(), {
      id: 'tx-1',
      status: TransactionStatus.COMPLETED,
      gatewayReference: 'ref-123',
    });

    mockOrmRepo.update.mockResolvedValue({ affected: 1 } as any);
    mockOrmRepo.findOneOrFail.mockResolvedValue(updatedTx);

    const result = await repo.update('tx-1', { status: TransactionStatus.COMPLETED, gatewayReference: 'ref-123' });

    expect(result.status).toBe(TransactionStatus.COMPLETED);
    expect(result.gatewayReference).toBe('ref-123');
    expect(mockOrmRepo.update).toHaveBeenCalledWith('tx-1', {
      status: TransactionStatus.COMPLETED,
      gatewayReference: 'ref-123',
    });
  });
});
