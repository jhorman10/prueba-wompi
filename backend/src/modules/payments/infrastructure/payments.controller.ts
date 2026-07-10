import { Controller, Post, Get, Param, Body, HttpCode, HttpException, HttpStatus } from '@nestjs/common';
import { TokenizeCardUseCase } from '../application/tokenize-card.usecase';
import { ProcessPaymentUseCase, InsufficientStockError } from '../application/process-payment.usecase';
import { ITransactionRepository, TRANSACTION_REPOSITORY } from '../domain/transaction.repository';
import { Inject } from '@nestjs/common';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly tokenizeCardUseCase: TokenizeCardUseCase,
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
  ) {}

  @Post('tokenize')
  @HttpCode(200)
  async tokenize(@Body() body: { number: string; expiry: string; cvc: string; name: string }) {
    if (!body.number || !body.expiry || !body.cvc || !body.name) {
      throw new HttpException('Missing required card fields', HttpStatus.BAD_REQUEST);
    }

    const result = await this.tokenizeCardUseCase.execute({
      number: body.number,
      expiry: body.expiry,
      cvc: body.cvc,
      cardholderName: body.name,
    });

    return { token: result.token };
  }

  @Post('charge')
  @HttpCode(200)
  async charge(
    @Body()
    body: {
      token: string;
      productId: string;
      quantity: number;
      idempotencyKey: string;
      cardLastFour: string;
      cardholderName: string;
      totalAmount: number;
    },
  ) {
    if (!body.token || !body.productId || !body.quantity || !body.idempotencyKey) {
      throw new HttpException('Missing required charge fields', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.processPaymentUseCase.execute({
        token: body.token,
        productId: body.productId,
        quantity: body.quantity,
        idempotencyKey: body.idempotencyKey,
        cardLastFour: body.cardLastFour || '',
        cardholderName: body.cardholderName || '',
        totalAmount: body.totalAmount,
      });

      return { transaction: result.transaction, isDuplicate: result.isDuplicate };
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            message: 'Insufficient stock',
            error: 'Conflict',
          },
          HttpStatus.CONFLICT,
        );
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Payment processing failed', error: 'Internal Server Error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getStatus(@Param('id') id: string) {
    const transaction = await this.transactionRepository.findById(id);

    if (!transaction) {
      throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    }

    return { transaction };
  }
}
