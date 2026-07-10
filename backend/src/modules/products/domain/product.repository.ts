import { ProductEntity } from './product.entity';

export interface IProductRepository {
  findAll(): Promise<ProductEntity[]>;
  findById(id: string): Promise<ProductEntity | null>;
  updateStock(id: string, quantity: number): Promise<void>;
  save(product: ProductEntity): Promise<ProductEntity>;
}

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
