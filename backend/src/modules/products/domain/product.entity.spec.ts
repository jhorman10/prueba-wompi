import { ProductEntity } from './product.entity';

describe('ProductEntity', () => {
  it('should create a product with all required fields', () => {
    const product = new ProductEntity();
    product.id = '1';
    product.name = 'Laptop';
    product.description = 'High performance laptop';
    product.price = 99999;
    product.imageUrl = '/images/laptop.jpg';
    product.stock = 10;

    expect(product.id).toBe('1');
    expect(product.name).toBe('Laptop');
    expect(product.description).toBe('High performance laptop');
    expect(product.price).toBe(99999);
    expect(product.imageUrl).toBe('/images/laptop.jpg');
    expect(product.stock).toBe(10);
  });

  it('should default stock to 0 when not set', () => {
    const product = new ProductEntity();
    expect(product.stock).toBeUndefined();
  });

  it('should allow stock decrement', () => {
    const product = new ProductEntity();
    product.id = '1';
    product.stock = 10;

    product.stock -= 3;
    expect(product.stock).toBe(7);
  });

  it('should handle zero stock edge case', () => {
    const product = new ProductEntity();
    product.id = '1';
    product.stock = 0;

    expect(product.stock).toBe(0);
  });
});
