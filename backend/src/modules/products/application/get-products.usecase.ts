import { IProductRepository, PRODUCT_REPOSITORY } from '../domain/product.repository';
import { ProductEntity } from '../domain/product.entity';
import { Inject } from '@nestjs/common';

export class GetProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(): Promise<ProductEntity[]> {
    return this.productRepository.findAll();
  }
}
