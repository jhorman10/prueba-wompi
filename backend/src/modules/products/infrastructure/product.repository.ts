import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../domain/product.entity';
import { IProductRepository } from '../domain/product.repository';

@Injectable()
export class ProductTypeOrmRepository implements IProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly ormRepo: Repository<ProductEntity>,
  ) {}

  async findAll(): Promise<ProductEntity[]> {
    return this.ormRepo.find();
  }

  async findById(id: string): Promise<ProductEntity | null> {
    return this.ormRepo.findOne({ where: { id } });
  }

  async updateStock(id: string, newStock: number): Promise<void> {
    await this.ormRepo.update(id, { stock: newStock });
  }

  async atomicDecrementStock(id: string, quantity: number): Promise<boolean> {
    const result = await this.ormRepo
      .createQueryBuilder()
      .update(ProductEntity)
      .set({ stock: () => `stock - :quantity` })
      .where('id = :id AND stock >= :quantity', { id, quantity })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async save(product: ProductEntity): Promise<ProductEntity> {
    return this.ormRepo.save(product);
  }
}
