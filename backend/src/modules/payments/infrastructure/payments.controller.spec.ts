import { PaymentsController } from './payments.controller';
import { TokenizeCardUseCase } from '../application/tokenize-card.usecase';
import { ProcessPaymentUseCase, InsufficientStockError } from '../application/process-payment.usecase';
import { ITransactionRepository } from '../domain/transaction.repository';
import { TransactionEntity } from '../domain/transaction.entity';
import { TransactionStatus } from '../domain/transaction-status.enum';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let mockTokenizeUseCase: jest.Mocked<TokenizeCardUseCase>;
  let mockProcessPaymentUseCase: jest.Mocked<ProcessPaymentUseCase>;
  let mockTxRepo: jest.Mocked<ITransactionRepository>;

  beforeEach(() => {
    mockTokenizeUseCase = {
      execute: jest.fn(),
    } as any;

    mockProcessPaymentUseCase = {
      execute: jest.fn(),
    } as any;

    mockTxRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdempotencyKey: jest.fn(),
      update: jest.fn(),
    };

    controller = new PaymentsController(
      mockTokenizeUseCase,
      mockProcessPaymentUseCase,
      mockTxRepo,
    );
  });

  describe('POST /api/payments/tokenize', () => {
    it('should tokenize card and return token', async () => {
      mockTokenizeUseCase.execute.mockResolvedValue({
        token: 'tok_abc123',
        cardLastFour: '4242',
      });

      const result = await controller.tokenize({
        number: '4242424242424242',
        expiry: '12/28',
        cvc: '123',
        name: 'John Doe',
      });

      expect(result.token).toBe('tok_abc123');
      expect(mockTokenizeUseCase.execute).toHaveBeenCalledWith({
        number: '4242424242424242',
        expiry: '12/28',
        cvc: '123',
        cardholderName: 'John Doe',
      });
    });

    it('should throw 400 when missing required fields', async () => {
      await expect(
        controller.tokenize({ number: '', expiry: '12/28', cvc: '123', name: 'John' }),
      ).rejects.toThrow(HttpException);

      await expect(
        controller.tokenize({ number: '4242', expiry: '', cvc: '', name: '' }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('POST /api/payments/charge', () => {
    it('should process charge and return transaction', async () => {
      const tx = Object.assign(new TransactionEntity(), {
        id: 'tx-1',
        status: TransactionStatus.COMPLETED,
        productId: 'prod-1',
        quantity: 2,
        totalAmount: 199998,
      });

      mockProcessPaymentUseCase.execute.mockResolvedValue({
        transaction: tx,
        isDuplicate: false,
      });

      const result = await controller.charge({
        token: 'tok_abc',
        items: [{ productId: 'prod-1', quantity: 2 }],
        idempotencyKey: 'idemp-123',
        cardLastFour: '4242',
        cardholderName: 'John Doe',
      });

      expect(result.transaction.status).toBe(TransactionStatus.COMPLETED);
      expect(result.isDuplicate).toBe(false);
    });

    it('should return 409 when stock is insufficient', async () => {
      mockProcessPaymentUseCase.execute.mockRejectedValue(
        new InsufficientStockError('prod-1', 1, 3),
      );

      await expect(
        controller.charge({
          token: 'tok_abc',
          items: [{ productId: 'prod-1', quantity: 3 }],
          idempotencyKey: 'idemp-456',
          cardLastFour: '4242',
          cardholderName: 'John Doe',
        }),
      ).rejects.toThrow(
        new HttpException(
          { statusCode: HttpStatus.CONFLICT, message: 'Insufficient stock', error: 'Conflict' },
          HttpStatus.CONFLICT,
        ),
      );
    });

    it('should throw 400 when missing required charge fields', async () => {
      await expect(
        controller.charge({
          token: '',
          items: [{ productId: '', quantity: 0 }],
          idempotencyKey: '',
          cardLastFour: '',
          cardholderName: '',
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should return isDuplicate true for duplicate submission', async () => {
      const existingTx = Object.assign(new TransactionEntity(), {
        id: 'tx-duplicate',
        status: TransactionStatus.COMPLETED,
        idempotencyKey: 'dup-key',
      });

      mockProcessPaymentUseCase.execute.mockResolvedValue({
        transaction: existingTx,
        isDuplicate: true,
      });

      const result = await controller.charge({
        token: 'tok_dup',
        items: [{ productId: 'prod-1', quantity: 1 }],
        idempotencyKey: 'dup-key',
        cardLastFour: '4242',
        cardholderName: 'John',
      });

      expect(result.isDuplicate).toBe(true);
    });
  });

  describe('GET /api/payments/:id', () => {
    it('should return transaction by id', async () => {
      const tx = Object.assign(new TransactionEntity(), {
        id: 'tx-1',
        status: TransactionStatus.COMPLETED,
      });

      mockTxRepo.findById.mockResolvedValue(tx);

      const result = await controller.getStatus('tx-1');

      expect(result.transaction.id).toBe('tx-1');
      expect(result.transaction.status).toBe(TransactionStatus.COMPLETED);
    });

    it('should throw 404 when transaction not found', async () => {
      mockTxRepo.findById.mockResolvedValue(null);

      await expect(controller.getStatus('nonexistent')).rejects.toThrow(
        new HttpException('Transaction not found', HttpStatus.NOT_FOUND),
      );
    });
  });
});
