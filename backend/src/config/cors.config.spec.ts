import { Module, Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { buildCorsOptions } from './cors.config';

describe('buildCorsOptions (A4)', () => {
  const original = process.env.CORS_ORIGINS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.CORS_ORIGINS;
    } else {
      process.env.CORS_ORIGINS = original;
    }
  });

  it('defaults to wildcard origin when CORS_ORIGINS is unset', () => {
    delete process.env.CORS_ORIGINS;

    const options = buildCorsOptions();

    expect(options.origin).toBe('*');
    expect(options.methods).toBe('GET,HEAD,PUT,PATCH,POST,DELETE');
    expect(options.allowedHeaders).toBe('Content-Type,Authorization');
    expect(options.credentials).toBe(true);
  });

  it('uses a single whitelisted origin when CORS_ORIGINS is a single value', () => {
    process.env.CORS_ORIGINS = 'http://localhost:8081';

    const options = buildCorsOptions();

    expect(options.origin).toEqual(['http://localhost:8081']);
  });

  it('splits a comma-separated CORS_ORIGINS list into a whitelist', () => {
    process.env.CORS_ORIGINS = 'http://localhost:8081, https://app.example.com';

    const options = buildCorsOptions();

    expect(options.origin).toEqual([
      'http://localhost:8081',
      'https://app.example.com',
    ]);
  });
});

// Minimal controller/app used only to verify the CORS headers at the HTTP layer.
@Controller('cors-health')
class DummyController {
  @Get()
  ok() {
    return 'ok';
  }
}

@Module({ controllers: [DummyController] })
class DummyModule {}

describe('CORS headers (integration)', () => {
  let app: INestApplication | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    delete process.env.CORS_ORIGINS;
  });

  async function boot(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
      imports: [DummyModule],
    }).compile();
    const nestApp = moduleRef.createNestApplication();
    nestApp.enableCors(buildCorsOptions());
    await nestApp.init();
    return nestApp;
  }

  it('reflects wildcard when CORS_ORIGINS is unset', async () => {
    app = await boot();

    const res = await request(app.getHttpServer())
      .get('/cors-health')
      .set('Origin', 'http://evil.example.com');

    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('reflects the origin when it is whitelisted', async () => {
    process.env.CORS_ORIGINS = 'http://localhost:8081';
    app = await boot();

    const res = await request(app.getHttpServer())
      .get('/cors-health')
      .set('Origin', 'http://localhost:8081');

    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:8081',
    );
  });

  it('omits Access-Control-Allow-Origin for non-whitelisted origins', async () => {
    process.env.CORS_ORIGINS = 'http://localhost:8081';
    app = await boot();

    const res = await request(app.getHttpServer())
      .get('/cors-health')
      .set('Origin', 'http://evil.example.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
