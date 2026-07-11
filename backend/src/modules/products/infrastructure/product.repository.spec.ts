import { ProductTypeOrmRepository } from './product.repository';
import { ProductEntity } from '../domain/product.entity';

describe('ProductTypeOrmRepository', () => {
  let repo: ProductTypeOrmRepository;
  let mockOrmRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockQueryBuilder: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    execute: jest.Mock;
  };

  beforeEach(() => {
    mockQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockOrmRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };
    repo = new ProductTypeOrmRepository(mockOrmRepo as any);
  });

  it('should call ormRepo.find() on findAll', async () => {
    const mockProducts = [
      Object.assign(new ProductEntity(), { id: '1', name: 'Laptop', price: 99999, stock: 10 }),
    ];
    mockOrmRepo.find.mockResolvedValue(mockProducts);

    const result = await repo.findAll();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Laptop');
    expect(mockOrmRepo.find).toHaveBeenCalledTimes(1);
  });

  it('should return empty array from findAll when no products', async () => {
    mockOrmRepo.find.mockResolvedValue([]);

    const result = await repo.findAll();

    expect(result).toEqual([]);
  });

  it('should call ormRepo.findOne() on findById', async () => {
    const mockProduct = Object.assign(new ProductEntity(), { id: '1', name: 'Phone', price: 49999, stock: 5 });
    mockOrmRepo.findOne.mockResolvedValue(mockProduct);

    const result = await repo.findById('1');

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Phone');
    expect(mockOrmRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  it('should return null when findById finds nothing', async () => {
    mockOrmRepo.findOne.mockResolvedValue(null);

    const result = await repo.findById('nonexistent');

    expect(result).toBeNull();
  });

  it('should call ormRepo.update() on updateStock', async () => {
    mockOrmRepo.update.mockResolvedValue({ affected: 1 } as any);

    await repo.updateStock('1', 5);

    expect(mockOrmRepo.update).toHaveBeenCalledWith('1', { stock: 5 });
  });

  it('should call ormRepo.save() on save', async () => {
    const product = Object.assign(new ProductEntity(), { name: 'New Product', price: 1000, stock: 1 });
    mockOrmRepo.save.mockResolvedValue(product);

    const result = await repo.save(product);

    expect(result.name).toBe('New Product');
    expect(mockOrmRepo.save).toHaveBeenCalledWith(product);
  });

  describe('atomicDecrementStock', () => {
    it('should build a conditional update and return true on success', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });

      const result = await repo.atomicDecrementStock('prod-1', 2);

      expect(result).toBe(true);
      expect(mockOrmRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(ProductEntity);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ stock: expect.any(Function) });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'id = :id AND stock >= :quantity',
        { id: 'prod-1', quantity: 2 },
      );
      expect(mockQueryBuilder.execute).toHaveBeenCalledTimes(1);
    });

    it('should return false when no rows were affected (insufficient stock)', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });

      const result = await repo.atomicDecrementStock('prod-1', 5);

      expect(result).toBe(false);
    });

    it('should treat a missing affected count as false', async () => {
      mockQueryBuilder.execute.mockResolvedValue({});

      const result = await repo.atomicDecrementStock('prod-1', 1);

      expect(result).toBe(false);
    });
  });
});
