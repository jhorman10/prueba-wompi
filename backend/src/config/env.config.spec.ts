import { loadEnvConfig } from './env.config';

describe('EnvConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return default values when env vars are not set', () => {
    delete process.env.PORT;
    delete process.env.GATEWAY_URL;
    delete process.env.GATEWAY_API_KEY;
    delete process.env.NODE_ENV;

    const config = loadEnvConfig();

    expect(config.port).toBe(3000);
    expect(config.gatewayUrl).toBe('https://sandbox-gateway.example.com');
    expect(config.gatewayApiKey).toBe('sandbox-key');
    expect(config.nodeEnv).toBe('development');
  });

  it('should read PORT from environment', () => {
    process.env.PORT = '4000';

    const config = loadEnvConfig();

    expect(config.port).toBe(4000);
  });

  it('should read GATEWAY_URL from environment', () => {
    process.env.GATEWAY_URL = 'https://api.custom-gateway.com';
    process.env.GATEWAY_API_KEY = 'live-key-123';

    const config = loadEnvConfig();

    expect(config.gatewayUrl).toBe('https://api.custom-gateway.com');
    expect(config.gatewayApiKey).toBe('live-key-123');
  });

  it('should read NODE_ENV from environment', () => {
    process.env.NODE_ENV = 'production';

    const config = loadEnvConfig();

    expect(config.nodeEnv).toBe('production');
  });

  it('should parse PORT string to integer', () => {
    process.env.PORT = '8080';

    const config = loadEnvConfig();

    expect(config.port).toBe(8080);
    expect(typeof config.port).toBe('number');
  });
});
