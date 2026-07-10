import { ProductsController } from './products.controller';
import { GetProductsUseCase } from '../application/get-products.usecase';
import { ProductEntity } from '../domain/product.entity';

describe('ProductsController', () => {
  let controller: ProductsController;
  let mockUseCase: jest.Mocked<GetProductsUseCase>;

  beforeEach(() => {
    mockUseCase = {
      execute: jest.fn(),
    } as any;
    controller = new ProductsController(mockUseCase);
  });

  it('should return products from use case on GET /api/products', async () => {
    const mockProducts = [
      Object.assign(new ProductEntity(), {
        id: '1', name: 'Laptop', description: 'A laptop', price: 99999, imageUrl: '/laptop.jpg', stock: 10,
      }),
    ];
    mockUseCase.execute.mockResolvedValue(mockProducts);

    const result = await controller.findAll();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Laptop');
    expect(mockUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when no products', async () => {
    mockUseCase.execute.mockResolvedValue([]);

    const result = await controller.findAll();

    expect(result).toEqual([]);
  });
});
