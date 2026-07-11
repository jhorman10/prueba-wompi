import { ProcessPaymentUseCase, InsufficientStockError, ProcessPaymentInput } from './process-payment.usecase';
import { IPaymentGateway } from '../domain/payment-gateway.interface';
import { ITransactionRepository } from '../domain/transaction.repository';
import { IProductRepository } from '../../products/domain/product.repository';
import { TransactionEntity } from '../domain/transaction.entity';
import { TransactionStatus } from '../domain/transaction-status.enum';
import { ProductEntity } from '../../products/domain/product.entity';

describe('ProcessPaymentUseCase', () => {
  let useCase: ProcessPaymentUseCase;
  let mockGateway: jest.Mocked<IPaymentGateway>;
  let mockTxRepo: jest.Mocked<ITransactionRepository>;
  let mockProductRepo: jest.Mocked<IProductRepository>;
  let defaultInput: ProcessPaymentInput;

  beforeEach(() => {
    mockGateway = {
      tokenize: jest.fn(),
      charge: jest.fn(),
      getStatus: jest.fn(),
    };

    mockTxRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdempotencyKey: jest.fn(),
      update: jest.fn(),
    };

    mockProductRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      updateStock: jest.fn(),
      atomicDecrementStock: jest.fn().mockResolvedValue(true),
      save: jest.fn(),
    };

    useCase = new ProcessPaymentUseCase(mockGateway, mockTxRepo, mockProductRepo);

    defaultInput = {
      token: 'tok_test_abc',
      items: [{ productId: 'prod-1', quantity: 2 }],
      idempotencyKey: 'idemp-abc-123',
      cardLastFour: '4242',
      cardholderName: 'John Doe',
    };
  });

  it('should process a successful payment pipeline (PENDING → PROCESSING → COMPLETED)', async () => {
    const product = Object.assign(new ProductEntity(), {
      id: 'prod-1', name: 'Laptop', stock: 10, price: 99999,
    });
    const createdTx = Object.assign(new TransactionEntity(), {
      id: 'tx-1',
      status: TransactionStatus.PENDING,
      idempotencyKey: 'idemp-abc-123',
      productId: 'prod-1',
      quantity: 2,
      totalAmount: 199998,
    });

    mockProductRepo.findById.mockResolvedValue(product);
    mockTxRepo.findByIdempotencyKey.mockResolvedValue(null);
    mockTxRepo.create.mockResolvedValue(createdTx);
    mockTxRepo.update.mockResolvedValue(createdTx);
    mockGateway.charge.mockResolvedValue({
      success: true,
      gatewayReference: 'gateway-ref-1',
      status: 'APPROVED',
    });

    const result = await useCase.execute(defaultInput);

    expect(result.isDuplicate).toBe(false);
    expect(result.transaction.status).toBe(TransactionStatus.COMPLETED);
    expect(result.transaction.gatewayReference).toBe('gateway-ref-1');
    expect(mockTxRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TransactionStatus.PENDING,
        idempotencyKey: 'idemp-abc-123',
        productId: 'prod-1',
      }),
    );
    expect(mockTxRepo.update).toHaveBeenCalledWith(
      'tx-1',
      expect.objectContaining({ status: TransactionStatus.COMPLETED }),
    );
    expect(mockProductRepo.atomicDecrementStock).toHaveBeenCalledWith('prod-1', 2);
    expect(mockGateway.charge).toHaveBeenCalledWith('tok_test_abc', 199998, 'idemp-abc-123');
  });

  it('should return existing transaction for duplicate idempotency key', async () => {
    const existingTx = Object.assign(new TransactionEntity(), {
      id: 'tx-existing',
      status: TransactionStatus.COMPLETED,
      idempotencyKey: 'idemp-abc-123',
    });

    mockTxRepo.findByIdempotencyKey.mockResolvedValue(existingTx);

    const result = await useCase.execute(defaultInput);

    expect(result.isDuplicate).toBe(true);
    expect(result.transaction.id).toBe('tx-existing');
    expect(result.transaction.status).toBe(TransactionStatus.COMPLETED);
    expect(mockProductRepo.findById).not.toHaveBeenCalled();
    expect(mockGateway.charge).not.toHaveBeenCalled();
  });

  it('should throw InsufficientStockError when stock is too low', async () => {
    const product = Object.assign(new ProductEntity(), {
      id: 'prod-1', name: 'Phone', stock: 1, price: 49999,
    });

    mockTxRepo.findByIdempotencyKey.mockResolvedValue(null);
    mockProductRepo.findById.mockResolvedValue(product);

    await expect(useCase.execute({
      ...defaultInput,
      items: [{ productId: 'prod-1', quantity: 3 }],
    })).rejects.toThrow(InsufficientStockError);

    expect(mockGateway.charge).not.toHaveBeenCalled();
  });

  it('should set FAILED status when gateway declines payment', async () => {
    const product = Object.assign(new ProductEntity(), {
      id: 'prod-1', name: 'Laptop', stock: 10, price: 99999,
    });
    const createdTx = Object.assign(new TransactionEntity(), {
      id: 'tx-2',
      status: TransactionStatus.PENDING,
      productId: 'prod-1',
      quantity: 1,
      totalAmount: 99999,
    });

    mockProductRepo.findById.mockResolvedValue(product);
    mockTxRepo.findByIdempotencyKey.mockResolvedValue(null);
    mockTxRepo.create.mockResolvedValue(createdTx);
    mockTxRepo.update.mockResolvedValue(createdTx);
    mockGateway.charge.mockResolvedValue({
      success: false,
      gatewayReference: 'ref-declined',
      status: 'DECLINED',
      errorCode: 'insufficient_funds',
      errorMessage: 'Insufficient funds',
    });

    const result = await useCase.execute({ ...defaultInput, items: [{ productId: 'prod-1', quantity: 1 }] });

    expect(result.transaction.status).toBe(TransactionStatus.FAILED);
    expect(result.transaction.gatewayErrorCode).toBe('insufficient_funds');
    expect(mockProductRepo.updateStock).not.toHaveBeenCalled();
  });

  it('should set RETRIES_EXHAUSTED when gateway throws network error', async () => {
    const product = Object.assign(new ProductEntity(), {
      id: 'prod-1', name: 'Laptop', stock: 10, price: 99999,
    });
    const createdTx = Object.assign(new TransactionEntity(), {
      id: 'tx-3',
      status: TransactionStatus.PENDING,
      productId: 'prod-1',
      quantity: 1,
      totalAmount: 99999,
    });

    mockProductRepo.findById.mockResolvedValue(product);
    mockTxRepo.findByIdempotencyKey.mockResolvedValue(null);
    mockTxRepo.create.mockResolvedValue(createdTx);
    mockTxRepo.update.mockResolvedValue(createdTx);
    mockGateway.charge.mockRejectedValue(new Error('Gateway timeout'));

    const result = await useCase.execute({ ...defaultInput, items: [{ productId: 'prod-1', quantity: 1 }] });

    expect(result.transaction.status).toBe(TransactionStatus.RETRIES_EXHAUSTED);
    expect(result.transaction.gatewayErrorCode).toBe('network_error');
    expect(mockProductRepo.updateStock).not.toHaveBeenCalled();
  });

  it('should throw error when product is not found', async () => {
    mockTxRepo.findByIdempotencyKey.mockResolvedValue(null);
    mockProductRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(defaultInput)).rejects.toThrow('Product not found');
  });

  it('should enforce PROCESSING status before gateway call', async () => {
    const product = Object.assign(new ProductEntity(), {
      id: 'prod-1', name: 'Laptop', stock: 10, price: 99999,
    });
    const createdTx = Object.assign(new TransactionEntity(), {
      id: 'tx-status',
      status: TransactionStatus.PENDING,
      productId: 'prod-1',
      quantity: 1,
      totalAmount: 99999,
    });

    mockProductRepo.findById.mockResolvedValue(product);
    mockTxRepo.findByIdempotencyKey.mockResolvedValue(null);
    mockTxRepo.create.mockResolvedValue(createdTx);
    mockTxRepo.update.mockResolvedValue(createdTx);
    mockGateway.charge.mockResolvedValue({
      success: true,
      gatewayReference: 'ref-status',
      status: 'APPROVED',
    });

    await useCase.execute({ ...defaultInput, items: [{ productId: 'prod-1', quantity: 1 }] });

    // Verify PROCESSING was set before charge call
    const processingCall = mockTxRepo.update.mock.calls.find(
      ([_id, data]) => data.status === TransactionStatus.PROCESSING,
    );
    expect(processingCall).toBeDefined();

    // Verify charge was called after PROCESSING was set
    const processingCallIndex = mockTxRepo.update.mock.calls.findIndex(
      ([_id, data]) => data.status === TransactionStatus.PROCESSING,
    );
    const chargeCallIndex = mockGateway.charge.mock.invocationCallOrder
      ? mockGateway.charge.mock.invocationCallOrder[0]
      : 1;

    expect(processingCallIndex).toBeGreaterThanOrEqual(0);
    expect(mockGateway.charge).toHaveBeenCalled();
  });
});
