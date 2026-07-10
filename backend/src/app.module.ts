import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ProductsModule } from './modules/products/products.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductEntity } from './modules/products/domain/product.entity';
import { TransactionEntity } from './modules/payments/domain/transaction.entity';
import { PRODUCT_REPOSITORY, IProductRepository } from './modules/products/domain/product.repository';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      entities: [ProductEntity, TransactionEntity],
      synchronize: true,
    }),
    ProductsModule,
    PaymentsModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async onModuleInit() {
    await this.seedProducts();
  }

  private async seedProducts() {
    const existing = await this.productRepository.findAll();
    if (existing.length > 0) return;

    const products = [
      {
        name: 'Laptop',
        description: 'High-performance laptop with 16GB RAM and 512GB SSD',
        price: 99999,
        imageUrl: '/images/laptop.jpg',
        stock: 10,
      },
      {
        name: 'Phone',
        description: 'Latest smartphone with 128GB storage and 5G',
        price: 49999,
        imageUrl: '/images/phone.jpg',
        stock: 15,
      },
      {
        name: 'Headphones',
        description: 'Wireless noise-canceling headphones',
        price: 7999,
        imageUrl: '/images/headphones.jpg',
        stock: 25,
      },
    ];

    for (const product of products) {
      const entity = new ProductEntity();
      Object.assign(entity, product);
      await this.productRepository.save(entity);
    }
  }
}
