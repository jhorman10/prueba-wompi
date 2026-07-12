import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from './domain/transaction.entity';
import { TRANSACTION_REPOSITORY } from './domain/transaction.repository';
import { PAYMENT_GATEWAY } from './domain/payment-gateway.interface';
import { TransactionTypeOrmRepository } from './infrastructure/transaction.repository';
import { SandboxPaymentGateway } from './infrastructure/sandbox-payment-gateway';
import { WompiPaymentGateway } from './infrastructure/wompi-payment-gateway';
import { PaymentsController } from './infrastructure/payments.controller';
import { TokenizeCardUseCase } from './application/tokenize-card.usecase';
import { ProcessPaymentUseCase } from './application/process-payment.usecase';
import { ProductsModule } from '../products/products.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity]),
    ProductsModule,
    ConfigModule,
  ],
  controllers: [PaymentsController],
  providers: [
    TokenizeCardUseCase,
    ProcessPaymentUseCase,
    {
      provide: TRANSACTION_REPOSITORY,
      useClass: TransactionTypeOrmRepository,
    },
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (configService: ConfigService) => {
        const mode = configService.get<string>('GATEWAY_MODE');
        if (mode === 'live') {
          return new WompiPaymentGateway(configService);
        }
        return new SandboxPaymentGateway(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [TRANSACTION_REPOSITORY, PAYMENT_GATEWAY],
})
export class PaymentsModule {}
