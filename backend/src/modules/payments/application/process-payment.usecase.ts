import { Inject, Injectable } from '@nestjs/common';
import { IPaymentGateway, PAYMENT_GATEWAY } from '../domain/payment-gateway.interface';
import { ITransactionRepository, TRANSACTION_REPOSITORY } from '../domain/transaction.repository';
import { IProductRepository, PRODUCT_REPOSITORY } from '../../products/domain/product.repository';
import { TransactionEntity } from '../domain/transaction.entity';
import { TransactionStatus } from '../domain/transaction-status.enum';

export interface ProcessPaymentInput {
  token: string;
  productId: string;
  quantity: number;
  idempotencyKey: string;
  cardLastFour: string;
  cardholderName: string;
  totalAmount: number;
}

export interface ProcessPaymentResult {
  transaction: TransactionEntity;
  isDuplicate: boolean;
}

@Injectable()
export class ProcessPaymentUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(input: ProcessPaymentInput): Promise<ProcessPaymentResult> {
    // Idempotency check
    const existing = await this.transactionRepository.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return { transaction: existing, isDuplicate: true };
    }

    // Check stock
    const product = await this.productRepository.findById(input.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.stock < input.quantity) {
      throw new InsufficientStockError(product.id, product.stock, input.quantity);
    }

    // Create PENDING transaction
    const transaction = await this.transactionRepository.create({
      status: TransactionStatus.PENDING,
      gatewayToken: input.token,
      idempotencyKey: input.idempotencyKey,
      productId: input.productId,
      quantity: input.quantity,
      totalAmount: input.totalAmount,
      cardholderName: input.cardholderName,
      cardLastFour: input.cardLastFour,
    });

    // Transition to PROCESSING
    transaction.status = TransactionStatus.PROCESSING;
    await this.transactionRepository.update(transaction.id, { status: TransactionStatus.PROCESSING });

    try {
      // Charge via gateway
      const chargeResponse = await this.paymentGateway.charge(
        input.token,
        input.totalAmount,
        input.idempotencyKey,
      );

      if (chargeResponse.success) {
        // Success: update stock and transaction
        await this.productRepository.updateStock(input.productId, product.stock - input.quantity);
        await this.transactionRepository.update(transaction.id, {
          status: TransactionStatus.COMPLETED,
          gatewayReference: chargeResponse.gatewayReference,
        });
        transaction.status = TransactionStatus.COMPLETED;
        transaction.gatewayReference = chargeResponse.gatewayReference;
      } else {
        // Gateway declined
        await this.transactionRepository.update(transaction.id, {
          status: TransactionStatus.FAILED,
          gatewayErrorCode: chargeResponse.errorCode || null,
        });
        transaction.status = TransactionStatus.FAILED;
        transaction.gatewayErrorCode = chargeResponse.errorCode || null;
      }
    } catch (error) {
      // Network error → mark as RETRIES_EXHAUSTED (retry handled by gateway impl)
      await this.transactionRepository.update(transaction.id, {
        status: TransactionStatus.RETRIES_EXHAUSTED,
        gatewayErrorCode: 'network_error',
      });
      transaction.status = TransactionStatus.RETRIES_EXHAUSTED;
      transaction.gatewayErrorCode = 'network_error';
    }

    return { transaction, isDuplicate: false };
  }
}

export class InsufficientStockError extends Error {
  constructor(
    public readonly productId: string,
    public readonly available: number,
    public readonly requested: number,
  ) {
    super(`Insufficient stock for product ${productId}: requested ${requested}, available ${available}`);
    this.name = 'InsufficientStockError';
  }
}
