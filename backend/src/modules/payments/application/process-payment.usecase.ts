import { Inject, Injectable } from '@nestjs/common';
import { IPaymentGateway, PAYMENT_GATEWAY } from '../domain/payment-gateway.interface';
import { ITransactionRepository, TRANSACTION_REPOSITORY } from '../domain/transaction.repository';
import { IProductRepository, PRODUCT_REPOSITORY } from '../../products/domain/product.repository';
import { TransactionEntity } from '../domain/transaction.entity';
import { TransactionStatus } from '../domain/transaction-status.enum';

export interface PaymentItemInput {
  productId: string;
  quantity: number;
}

export interface ProcessPaymentInput {
  token: string;
  items: PaymentItemInput[];
  idempotencyKey: string;
  cardLastFour: string;
  cardholderName: string;
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

    if (!input.items || input.items.length === 0) {
      throw new Error('At least one item is required');
    }

    // Validate stock and resolve products for ALL items before creating transaction
    const resolvedItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      productName: string;
    }> = [];

    for (const item of input.items) {
      const product = await this.productRepository.findById(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      if (product.stock < item.quantity) {
        throw new InsufficientStockError(product.id, product.stock, item.quantity);
      }
      resolvedItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
        productName: product.name,
      });
    }

    // Calculate total server-side (reject client-provided amounts)
    const totalAmount = resolvedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    const firstProductId = resolvedItems[0].productId;
    const firstQuantity = resolvedItems[0].quantity;

    // Create PENDING transaction
    const transaction = await this.transactionRepository.create({
      status: TransactionStatus.PENDING,
      gatewayToken: input.token,
      idempotencyKey: input.idempotencyKey,
      productId: firstProductId,
      quantity: firstQuantity,
      items: JSON.stringify(resolvedItems),
      totalAmount,
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
        totalAmount,
        input.idempotencyKey,
      );

      if (chargeResponse.success) {
        // Success: decrement stock atomically for EACH product
        for (const item of resolvedItems) {
          const stockOk = await this.productRepository.atomicDecrementStock(
            item.productId,
            item.quantity,
          );
          if (!stockOk) {
            // Rollback already-decremented products is complex;
            // mark transaction as FAILED and throw
            await this.transactionRepository.update(transaction.id, {
              status: TransactionStatus.FAILED,
              gatewayErrorCode: 'stock_conflict',
            });
            transaction.status = TransactionStatus.FAILED;
            transaction.gatewayErrorCode = 'stock_conflict';
            throw new InsufficientStockError(item.productId, 0, item.quantity);
          }
        }

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
      // A stock conflict is a domain error the caller must surface (e.g. 409).
      if (error instanceof InsufficientStockError) {
        throw error;
      }
      // Network error (or stock conflict) → mark as RETRIES_EXHAUSTED
      if (transaction.status !== TransactionStatus.FAILED) {
        await this.transactionRepository.update(transaction.id, {
          status: TransactionStatus.RETRIES_EXHAUSTED,
          gatewayErrorCode: 'network_error',
        });
        transaction.status = TransactionStatus.RETRIES_EXHAUSTED;
        transaction.gatewayErrorCode = 'network_error';
      }
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
