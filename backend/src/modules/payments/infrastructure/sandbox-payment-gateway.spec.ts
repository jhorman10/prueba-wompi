import { SandboxPaymentGateway } from './sandbox-payment-gateway';
import { ConfigService } from '@nestjs/config';

describe('SandboxPaymentGateway', () => {
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('https://sandbox-gateway.example.com'),
    } as any;
  });

  describe('simulate mode (default)', () => {
    it('should return a token with last four digits in simulate mode', async () => {
      const gateway = new SandboxPaymentGateway(mockConfigService);
      const result = await gateway.tokenize({
        number: '4242424242424242',
        expiry: '12/28',
        cvc: '123',
        cardholderName: 'John Doe',
      });

      expect(result.token).toMatch(/^tok_sandbox_/);
      expect(result.cardLastFour).toBe('4242');
    });

    it('should extract correct lastFour from different card numbers', async () => {
      const gateway = new SandboxPaymentGateway(mockConfigService);
      const result = await gateway.tokenize({
        number: '4000056655665556',
        expiry: '06/26',
        cvc: '321',
        cardholderName: 'Jane Smith',
      });

      expect(result.cardLastFour).toBe('5556');
    });

    it('should return success for normal token in simulate mode', async () => {
      const gateway = new SandboxPaymentGateway(mockConfigService);
      const result = await gateway.charge('tok_normal', 99999, 'idemp-1');

      expect(result.success).toBe(true);
      expect(result.gatewayReference).toMatch(/^ref_/);
      expect(result.status).toBe('APPROVED');
    });

    it('should decline when token is tok_fail in simulate mode', async () => {
      const gateway = new SandboxPaymentGateway(mockConfigService);
      const result = await gateway.charge('tok_fail', 5000, 'idemp-2');

      expect(result.success).toBe(false);
      expect(result.status).toBe('DECLINED');
      expect(result.errorCode).toBe('card_declined');
    });

    it('should return APPROVED status in simulate mode', async () => {
      const gateway = new SandboxPaymentGateway(mockConfigService);
      const status = await gateway.getStatus('ref_123');

      expect(status).toBe('APPROVED');
    });
  });

  describe('config-driven values', () => {
    it('should read gateway URL from config service', () => {
      mockConfigService.get.mockReturnValue('https://sandbox-gateway.example.com');
      const _gateway = new SandboxPaymentGateway(mockConfigService);
      expect(mockConfigService.get).toHaveBeenCalledWith('GATEWAY_URL');
    });

    it('should default to simulate mode when GATEWAY_MODE is unset', () => {
      mockConfigService.get.mockReturnValue(undefined);
      const gateway = new SandboxPaymentGateway(mockConfigService);
      return expect(gateway.charge('tok_x', 1, 'k')).resolves.toMatchObject({
        success: true,
      });
    });

    it('should read retry config from config service', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'GATEWAY_MAX_RETRIES') return 5;
        if (key === 'GATEWAY_BASE_DELAY_MS') return 2000;
        return 'https://sandbox-gateway.example.com';
      });

      const _gateway = new SandboxPaymentGateway(mockConfigService);
      expect(mockConfigService.get).toHaveBeenCalledWith('GATEWAY_MAX_RETRIES');
      expect(mockConfigService.get).toHaveBeenCalledWith('GATEWAY_BASE_DELAY_MS');
    });
  });

  describe('live mode with mock fetch', () => {
    function createLiveGateway(
      mockFetch: (url: string, options?: any) => Promise<any>,
      retryConfig?: { maxRetries: number; baseDelayMs: number },
    ): SandboxPaymentGateway {
      const configService = {
        get: jest.fn((key: string) => {
          if (key === 'GATEWAY_MODE') return 'live';
          if (key === 'GATEWAY_URL') return 'https://real-gateway.com/api';
          if (key === 'GATEWAY_API_KEY') return 'secret-key';
          if (key === 'GATEWAY_MAX_RETRIES') return retryConfig?.maxRetries ?? 3;
          if (key === 'GATEWAY_BASE_DELAY_MS') return retryConfig?.baseDelayMs ?? 1000;
          return undefined;
        }),
      } as any;
      return SandboxPaymentGateway.createWithMock(configService, mockFetch, retryConfig, 'live');
    }

    it('should hit /tokenize with Authorization header and return token', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: 'tok_live' }),
      });

      const gateway = createLiveGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.tokenize({
        number: '4242424242424242',
        expiry: '12/28',
        cvc: '123',
        cardholderName: 'Live User',
      });

      expect(result.token).toBe('tok_live');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://real-gateway.com/api/tokenize');
      expect(options.method).toBe('POST');
      expect(options.headers.Authorization).toBe('Bearer secret-key');
    });

    it('should hit /transactions with Authorization header and map response', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'APPROVED', reference: 'ref-live' }),
      });

      const gateway = createLiveGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.charge('tok_live', 5000, 'idemp-1');

      expect(result.success).toBe(true);
      expect(result.gatewayReference).toBe('ref-live');
      expect(result.status).toBe('APPROVED');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://real-gateway.com/api/transactions');
      expect(options.headers.Authorization).toBe('Bearer secret-key');
      expect(JSON.parse(options.body)).toMatchObject({
        token: 'tok_live',
        amount: 5000,
        idempotencyKey: 'idemp-1',
      });
    });

    it('should treat a DECLINED live status as unsuccessful', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'DECLINED', reference: 'ref-dec' }),
      });

      const gateway = createLiveGateway(mockFetch);
      const result = await gateway.charge('tok_live', 5000, 'idemp-2');

      expect(result.success).toBe(false);
      expect(result.status).toBe('DECLINED');
      expect(result.gatewayReference).toBe('ref-dec');
    });

    it('should hit /transactions/:id on getStatus and return status', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'APPROVED' }),
      });

      const gateway = createLiveGateway(mockFetch);
      const status = await gateway.getStatus('ref-live');

      expect(status).toBe('APPROVED');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://real-gateway.com/api/transactions/ref-live');
      expect(options.method).toBe('GET');
      expect(options.headers.Authorization).toBe('Bearer secret-key');
    });

    it('should succeed on first attempt', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'APPROVED', reference: 'ref-123' }),
      });

      const gateway = createLiveGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.charge('tok_real', 5000, 'idemp-1');

      expect(result.success).toBe(true);
      expect(result.gatewayReference).toBe('ref-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const mockFetch = jest.fn()
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'APPROVED', reference: 'ref-retry' }),
        });

      const gateway = createLiveGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.charge('tok_retry', 5000, 'idemp-3');

      expect(result.success).toBe(true);
      expect(result.gatewayReference).toBe('ref-retry');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should exhaust retries and throw after all failures', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      const gateway = createLiveGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });

      await expect(gateway.charge('tok_fail', 5000, 'idemp-4')).rejects.toThrow('Service unavailable');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should retry tokenize with mock fetch', async () => {
      const mockFetch = jest.fn()
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: 'tok_retry' }),
        });

      const gateway = createLiveGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.tokenize({
        number: '4242424242424242',
        expiry: '12/28',
        cvc: '123',
        cardholderName: 'Retry User',
      });

      expect(result.token).toBe('tok_retry');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff delays', async () => {
      const timings: number[] = [];
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = ((fn: (...args: any[]) => void, ms: number) => {
        timings.push(ms);
        return originalSetTimeout(fn as any, 0);
      }) as any;

      const mockFetch = jest.fn().mockRejectedValue(new Error('Fail'));
      const gateway = createLiveGateway(mockFetch, { maxRetries: 3, baseDelayMs: 100 });

      await expect(gateway.charge('tok_timing', 100, 'idemp-5')).rejects.toThrow('Fail');

      expect(timings.length).toBeGreaterThanOrEqual(2);
      expect(timings[0]).toBe(100);
      expect(timings[1]).toBe(200);

      global.setTimeout = originalSetTimeout;
    });

    it('should handle tokenize with fetch error', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const gateway = createLiveGateway(mockFetch, { maxRetries: 2, baseDelayMs: 10 });

      await expect(
        gateway.tokenize({
          number: '4242424242424242',
          expiry: '12/28',
          cvc: '123',
          cardholderName: 'Fail User',
        }),
      ).rejects.toThrow('Network error');
    });

    it('should handle getStatus with fetch error', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Gateway down'));

      const gateway = createLiveGateway(mockFetch, { maxRetries: 2, baseDelayMs: 10 });

      await expect(gateway.getStatus('ref-fail')).rejects.toThrow('Gateway down');
    });

    it('should handle declined charge response from gateway', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 402,
        json: () => Promise.resolve({ error_code: 'insufficient_funds', message: 'Insufficient funds' }),
      });

      const gateway = createLiveGateway(mockFetch);
      const result = await gateway.charge('tok_decline', 5000, 'idemp-2');

      expect(result.success).toBe(false);
      expect(result.status).toBe('DECLINED');
      expect(result.errorCode).toBe('insufficient_funds');
    });

    it('should reject getStatus when response is not ok', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

      const gateway = createLiveGateway(mockFetch);

      await expect(gateway.getStatus('ref-404')).rejects.toThrow('Gateway status check failed: 404');
    });

    it('should reject tokenize when response is not ok', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

      const gateway = createLiveGateway(mockFetch);

      await expect(
        gateway.tokenize({
          number: '4242424242424242',
          expiry: '12/28',
          cvc: '123',
          cardholderName: 'Err User',
        }),
      ).rejects.toThrow('Gateway tokenize failed: 500');
    });

    it('should handle 503 with retry', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

      const gateway = createLiveGateway(mockFetch, { maxRetries: 2, baseDelayMs: 10 });

      await expect(gateway.charge('tok_503', 100, 'idemp')).rejects.toThrow('Service unavailable');
    });

    it('should reject when fetch is unavailable in live mode', async () => {
      const originalFetch = (globalThis as any).fetch;
      (globalThis as any).fetch = undefined;

      const configService = {
        get: jest.fn((key: string) => (key === 'GATEWAY_MODE' ? 'live' : undefined)),
      } as any;
      const gateway = new SandboxPaymentGateway(configService);

      await expect(gateway.getStatus('ref-x')).rejects.toThrow('HTTP fetch not available');

      (globalThis as any).fetch = originalFetch;
    });
  });
});
