import { GetProductsUseCase } from './get-products.usecase';
import { ProductEntity } from '../domain/product.entity';

describe('GetProductsUseCase', () => {
  it('should return all products from repository', async () => {
    const mockProducts = [
      Object.assign(new ProductEntity(), {
        id: '1', name: 'Laptop', description: 'A laptop', price: 99999, imageUrl: '/laptop.jpg', stock: 10,
      }),
      Object.assign(new ProductEntity(), {
        id: '2', name: 'Phone', description: 'A phone', price: 49999, imageUrl: '/phone.jpg', stock: 5,
      }),
    ];

    const mockRepo = {
      findAll: jest.fn().mockResolvedValue(mockProducts),
      findById: jest.fn(),
      updateStock: jest.fn(),
      atomicDecrementStock: jest.fn(),
      save: jest.fn(),
    };

    const useCase = new GetProductsUseCase(mockRepo);
    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Laptop');
    expect(result[1].name).toBe('Phone');
    expect(mockRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when no products exist', async () => {
    const mockRepo = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      updateStock: jest.fn(),
      atomicDecrementStock: jest.fn(),
      save: jest.fn(),
    };

    const useCase = new GetProductsUseCase(mockRepo);
    const result = await useCase.execute();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should propagate repository errors', async () => {
    const mockRepo = {
      findAll: jest.fn().mockRejectedValue(new Error('DB connection failed')),
      findById: jest.fn(),
      updateStock: jest.fn(),
      atomicDecrementStock: jest.fn(),
      save: jest.fn(),
    };

    const useCase = new GetProductsUseCase(mockRepo);

    await expect(useCase.execute()).rejects.toThrow('DB connection failed');
  });
});
