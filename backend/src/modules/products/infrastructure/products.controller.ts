import { Controller, Get } from '@nestjs/common';
import { GetProductsUseCase } from '../application/get-products.usecase';

@Controller('products')
export class ProductsController {
  constructor(private readonly getProductsUseCase: GetProductsUseCase) {}

  @Get()
  async findAll() {
    return this.getProductsUseCase.execute();
  }
}
