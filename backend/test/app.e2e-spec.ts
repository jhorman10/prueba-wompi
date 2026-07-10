import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../src/modules/products/products.module';
import { PaymentsModule } from '../src/modules/payments/payments.module';
import { ProductEntity } from '../src/modules/products/domain/product.entity';
import { TransactionEntity } from '../src/modules/payments/domain/transaction.entity';
import { PRODUCT_REPOSITORY, IProductRepository } from '../src/modules/products/domain/product.repository';

describe('App E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
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
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableCors();
    await app.init();

    // Seed test data
    const productRepo = moduleFixture.get<IProductRepository>(PRODUCT_REPOSITORY);
    const product = new ProductEntity();
    Object.assign(product, {
      name: 'Test Laptop',
      description: 'A test laptop',
      price: 99999,
      imageUrl: '/test-laptop.jpg',
      stock: 10,
    });
    await productRepo.save(product);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/products', () => {
    it('should return products array', async () => {
      const response = await request(app.getHttpServer()).get('/api/products');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('price');
      expect(response.body[0]).toHaveProperty('stock');
    });
  });

  describe('POST /api/payments/tokenize', () => {
    it('should tokenize card and return token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/tokenize')
        .send({
          number: '4242424242424242',
          expiry: '12/28',
          cvc: '123',
          name: 'John Doe',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toMatch(/^tok_sandbox_/);
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/tokenize')
        .send({ number: '', expiry: '', cvc: '', name: '' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/payments/charge', () => {
    it('should process a charge successfully', async () => {
      const tokenResponse = await request(app.getHttpServer())
        .post('/api/payments/tokenize')
        .send({
          number: '4242424242424242',
          expiry: '12/28',
          cvc: '123',
          name: 'John Doe',
        });

      const token = tokenResponse.body.token;
      const productsResponse = await request(app.getHttpServer()).get('/api/products');
      const product = productsResponse.body[0];

      const chargeResponse = await request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          token,
          productId: product.id,
          quantity: 1,
          idempotencyKey: `e2e-test-${Date.now()}`,
          cardLastFour: '4242',
          cardholderName: 'John Doe',
          totalAmount: product.price,
        });

      expect(chargeResponse.status).toBe(200);
      expect(chargeResponse.body.transaction).toBeDefined();
      expect(chargeResponse.body.transaction.status).toBe('COMPLETED');
    });

    it('should return 409 for insufficient stock', async () => {
      const productsResponse = await request(app.getHttpServer()).get('/api/products');
      const product = productsResponse.body[0];

      const chargeResponse = await request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          token: 'tok_test',
          productId: product.id,
          quantity: 999,
          idempotencyKey: `e2e-insufficient-${Date.now()}`,
          cardLastFour: '4242',
          cardholderName: 'John Doe',
          totalAmount: 99999999,
        });

      expect(chargeResponse.status).toBe(409);
      expect(chargeResponse.body.message).toBe('Insufficient stock');
    });

    it('should return existing transaction for duplicate idempotency key', async () => {
      const idempotencyKey = `e2e-dup-${Date.now()}`;
      const productsResponse = await request(app.getHttpServer()).get('/api/products');
      const product = productsResponse.body[0];

      const firstResponse = await request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          token: 'tok_test',
          productId: product.id,
          quantity: 1,
          idempotencyKey,
          cardLastFour: '4242',
          cardholderName: 'John Doe',
          totalAmount: product.price,
        });

      const secondResponse = await request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          token: 'tok_test',
          productId: product.id,
          quantity: 1,
          idempotencyKey,
          cardLastFour: '4242',
          cardholderName: 'John Doe',
          totalAmount: product.price,
        });

      expect(secondResponse.body.isDuplicate).toBe(true);
      expect(secondResponse.body.transaction.id).toBe(firstResponse.body.transaction.id);
    });
  });

  describe('GET /api/payments/:id', () => {
    it('should return transaction by id', async () => {
      const tokenResponse = await request(app.getHttpServer())
        .post('/api/payments/tokenize')
        .send({
          number: '4242424242424242',
          expiry: '12/28',
          cvc: '123',
          name: 'John Doe',
        });

      const productsResponse = await request(app.getHttpServer()).get('/api/products');
      const product = productsResponse.body[0];

      const chargeResponse = await request(app.getHttpServer())
        .post('/api/payments/charge')
        .send({
          token: tokenResponse.body.token,
          productId: product.id,
          quantity: 1,
          idempotencyKey: `e2e-get-${Date.now()}`,
          cardLastFour: '4242',
          cardholderName: 'John Doe',
          totalAmount: product.price,
        });

      const transactionId = chargeResponse.body.transaction.id;

      const getResponse = await request(app.getHttpServer())
        .get(`/api/payments/${transactionId}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.transaction.id).toBe(transactionId);
    });

    it('should return 404 for nonexistent transaction', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/nonexistent-id');

      expect(response.status).toBe(404);
    });
  });
});
