import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from './domain/product.entity';
import { PRODUCT_REPOSITORY } from './domain/product.repository';
import { ProductTypeOrmRepository } from './infrastructure/product.repository';
import { GetProductsUseCase } from './application/get-products.usecase';
import { ProductsController } from './infrastructure/products.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity])],
  controllers: [ProductsController],
  providers: [
    GetProductsUseCase,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: ProductTypeOrmRepository,
    },
  ],
  exports: [PRODUCT_REPOSITORY, GetProductsUseCase],
})
export class ProductsModule {}
