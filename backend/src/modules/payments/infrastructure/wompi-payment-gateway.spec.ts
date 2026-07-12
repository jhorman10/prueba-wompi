import { WompiPaymentGateway } from './wompi-payment-gateway';
import { ConfigService } from '@nestjs/config';

describe('WompiPaymentGateway', () => {
  let mockConfigService: jest.Mocked<ConfigService>;

  const DEFAULT_CONFIG = {
    WOMPI_BASE_URL: 'https://api-sandbox.co.uat.wompi.dev/v1',
    WOMPI_PUBLIC_KEY: 'pub_stagtest_g2u0HQd3ZMh05hsSgTS2lUV8t3s4mOt7',
    WOMPI_PRIVATE_KEY: 'prv_stagtest_5i0ZGIGiFcDQifYsXxvsny7Y37tKqFWg',
    WOMPI_INTEGRITY_KEY: 'stagtest_integrity_nAIBuqayW70XpUqJS4qf4STYiISd89Fp',
  };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, string> = DEFAULT_CONFIG;
        return config[key] ?? defaultValue;
      }),
    } as any;
  });

  function createGateway(
    mockFetch: (url: string, options?: any) => Promise<any>,
    retryConfig?: { maxRetries: number; baseDelayMs: number },
  ): WompiPaymentGateway {
    const configService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = { ...DEFAULT_CONFIG };
        if (retryConfig) {
          config.WOMPI_MAX_RETRIES = retryConfig.maxRetries;
          config.WOMPI_BASE_DELAY_MS = retryConfig.baseDelayMs;
        }
        return config[key] ?? defaultValue;
      }),
    } as any;
    return WompiPaymentGateway.createWithMock(configService, mockFetch, retryConfig);
  }

  function okResponse(body: any) {
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    };
  }

  function createdResponse(body: any) {
    return {
      ok: true,
      status: 201,
      json: () => Promise.resolve(body),
    };
  }

  function errorResponse(status: number, body: any) {
    return {
      ok: false,
      status,
      json: () => Promise.resolve(body),
    };
  }

  describe('tokenize', () => {
    it('should send card details to Wompi and return token with last four digits', async () => {
      const mockFetch = jest.fn().mockResolvedValue(
        createdResponse({
          status: 'CREATED',
          data: { id: 'tok_test_123456' },
        }),
      );

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.tokenize({
        number: '4242424242424242',
        expiry: '12/28',
        cvc: '123',
        cardholderName: 'John Doe',
      });

      expect(result.token).toBe('tok_test_123456');
      expect(result.cardLastFour).toBe('4242');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api-sandbox.co.uat.wompi.dev/v1/tokens/cards');
      expect(options.method).toBe('POST');
      expect(options.headers.Authorization).toBe(
        'Bearer pub_stagtest_g2u0HQd3ZMh05hsSgTS2lUV8t3s4mOt7',
      );
      expect(JSON.parse(options.body)).toMatchObject({
        number: '4242424242424242',
        cvc: '123',
        exp_month: 12,
        exp_year: 2028,
        card_holder: { name: 'John Doe' },
      });
    });

    it('should parse MM/YY expiry into correct exp_month and exp_year', async () => {
      const mockFetch = jest.fn().mockResolvedValue(
        createdResponse({
          status: 'CREATED',
          data: { id: 'tok_yy' },
        }),
      );

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });

      await gateway.tokenize({
        number: '4111111111111111',
        expiry: '06/26',
        cvc: '123',
        cardholderName: 'Test User',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.exp_month).toBe(6);
      expect(body.exp_year).toBe(2026);
    });

    it('should parse single-digit month in expiry', async () => {
      const mockFetch = jest.fn().mockResolvedValue(
        createdResponse({
          status: 'CREATED',
          data: { id: 'tok_single' },
        }),
      );

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });

      await gateway.tokenize({
        number: '4111111111111111',
        expiry: '3/30',
        cvc: '123',
        cardholderName: 'Test User',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.exp_month).toBe(3);
      expect(body.exp_year).toBe(2030);
    });

    it('should throw error when Wompi returns non-201 status (no retry on 4xx)', async () => {
      const mockFetch = jest.fn().mockResolvedValue(
        errorResponse(400, {
          error: { message: 'Invalid card number' },
        }),
      );

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });

      await expect(
        gateway.tokenize({
          number: '1234',
          expiry: '12/28',
          cvc: '123',
          cardholderName: 'John Doe',
        }),
      ).rejects.toThrow('Invalid card number');
      // Should NOT retry on 4xx errors
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should use default error message when error body has no message', async () => {
      const mockFetch = jest.fn().mockResolvedValue(
        errorResponse(422, { error: { type: 'validation_error' } }),
      );

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });

      await expect(
        gateway.tokenize({
          number: '4111111111111111',
          expiry: '12/28',
          cvc: '123',
          cardholderName: 'John Doe',
        }),
      ).rejects.toThrow('Wompi tokenize failed: 422');
    });

    it('should use fallback message when json parse fails on error', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });

      await expect(
        gateway.tokenize({
          number: '4111111111111111',
          expiry: '12/28',
          cvc: '123',
          cardholderName: 'John Doe',
        }),
      ).rejects.toThrow('Wompi tokenize failed: 500');
    });

    it('should succeed on first attempt', async () => {
      const mockFetch = jest.fn().mockResolvedValue(
        createdResponse({
          status: 'CREATED',
          data: { id: 'tok_first' },
        }),
      );

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.tokenize({
        number: '4242424242424242',
        expiry: '12/28',
        cvc: '123',
        cardholderName: 'John Doe',
      });

      expect(result.token).toBe('tok_first');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on network error and succeed on second attempt', async () => {
      const mockFetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(
          createdResponse({
            status: 'CREATED',
            data: { id: 'tok_retry' },
          }),
        );

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.tokenize({
        number: '4242424242424242',
        expiry: '12/28',
        cvc: '123',
        cardholderName: 'Retry User',
      });

      expect(result.token).toBe('tok_retry');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should exhaust retries and throw after all failures', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });

      await expect(
        gateway.tokenize({
          number: '4242424242424242',
          expiry: '12/28',
          cvc: '123',
          cardholderName: 'Fail User',
        }),
      ).rejects.toThrow('Service unavailable');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff delays', async () => {
      const timings: number[] = [];
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = ((fn: (...args: any[]) => void, ms: number) => {
        timings.push(ms);
        return originalSetTimeout(fn as any, 0);
      }) as any;

      const mockFetch = jest.fn().mockRejectedValue(new Error('Fail'));
      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 100 });

      await expect(
        gateway.tokenize({
          number: '4242424242424242',
          expiry: '12/28',
          cvc: '123',
          cardholderName: 'Timing User',
        }),
      ).rejects.toThrow('Fail');

      expect(timings.length).toBeGreaterThanOrEqual(2);
      expect(timings[0]).toBe(100);
      expect(timings[1]).toBe(200);

      global.setTimeout = originalSetTimeout;
    });

    it('should handle first attempt network error', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const gateway = createGateway(mockFetch, { maxRetries: 2, baseDelayMs: 10 });

      await expect(
        gateway.tokenize({
          number: '4242424242424242',
          expiry: '12/28',
          cvc: '123',
          cardholderName: 'Fail User',
        }),
      ).rejects.toThrow('Network error');
    });

    it('should retry on 5xx error during tokenize', async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(errorResponse(500, { error: { message: 'Server error' } }))
        .mockResolvedValueOnce(
          createdResponse({
            status: 'CREATED',
            data: { id: 'tok_retry_5xx' },
          }),
        );

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.tokenize({
        number: '4242424242424242',
        expiry: '12/28',
        cvc: '123',
        cardholderName: 'Retry 5xx',
      });

      expect(result.token).toBe('tok_retry_5xx');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('charge', () => {
    it('should complete full flow: merchant → create → poll → APPROVED', async () => {
      const merchantResponse = okResponse({
        data: {
          presigned_acceptance: {
            acceptance_token: 'accept_token_abc123',
          },
        },
      });

      const createResponse = createdResponse({
        data: {
          id: 'txn_001',
          status: 'PENDING',
        },
      });

      const pollApproved = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { status: 'APPROVED' } }),
      };

      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(merchantResponse)
        .mockResolvedValueOnce(createResponse)
        .mockResolvedValueOnce(pollApproved);

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.charge('tok_test', 50000, 'ORDER-001');

      expect(result.success).toBe(true);
      expect(result.gatewayReference).toBe('txn_001');
      expect(result.status).toBe('APPROVED');
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verify merchant fetch
      const merchantUrl = mockFetch.mock.calls[0][0];
      expect(merchantUrl).toContain('/merchants/pub_stagtest');

      // Verify create transaction
      const [createUrl, createOpts] = mockFetch.mock.calls[1];
      expect(createUrl).toContain('/transactions');
      expect(createOpts.method).toBe('POST');
      expect(createOpts.headers.Authorization).toBe(
        'Bearer prv_stagtest_5i0ZGIGiFcDQifYsXxvsny7Y37tKqFWg',
      );
      const createBody = JSON.parse(createOpts.body);
      expect(createBody.amount_in_cents).toBe(50000);
      expect(createBody.currency).toBe('COP');
      expect(createBody.reference).toBe('ORDER-001');
      expect(createBody.acceptance_token).toBe('accept_token_abc123');
      expect(createBody.payment_method.token).toBe('tok_test');
      expect(createBody.signature).toBeDefined();

      // Verify poll
      const pollUrl = mockFetch.mock.calls[2][0];
      expect(pollUrl).toContain('/transactions/txn_001');
    });

    it('should generate correct SHA-256 signature', async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          okResponse({
            data: {
              presigned_acceptance: { acceptance_token: 'accept_xyz' },
            },
          }),
        )
        .mockResolvedValueOnce(
          createdResponse({
            data: { id: 'txn_sig', status: 'PENDING' },
          }),
        )
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { status: 'APPROVED' } }),
        });

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      await gateway.charge('tok_test', 99999, 'ORDER-123');

      const createBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      // SHA256 of "stagtest_integrity_nAIBuqayW70XpUqJS4qf4STYiISd89FpORDER-12399999COP"
      const expectedSignature =
        'c25564615cd1ebbb4f8436f5553a78adab5bf3ee9abb53723602019e481b3c5e';
      expect(createBody.signature).toBe(expectedSignature);
    });

    it('should return declined when transaction creation fails with non-201', async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          okResponse({
            data: {
              presigned_acceptance: { acceptance_token: 'accept_xyz' },
            },
          }),
        )
        .mockResolvedValueOnce(
          errorResponse(422, {
            error: {
              type: 'parameter_validation_error',
              message: 'The card was declined',
            },
          }),
        );

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.charge('tok_decline', 5000, 'ORDER-002');

      expect(result.success).toBe(false);
      expect(result.gatewayReference).toBe('');
      expect(result.status).toBe('DECLINED');
      expect(result.errorCode).toBe('parameter_validation_error');
      expect(result.errorMessage).toBe('The card was declined');
    });

    it('should return declined when merchant fetch fails', async () => {
      const mockFetch = jest.fn().mockResolvedValue(
        errorResponse(401, {
          error: { type: 'auth_error', message: 'Invalid public key' },
        }),
      );

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.charge('tok_test', 5000, 'ORDER-003');

      expect(result.success).toBe(false);
      expect(result.gatewayReference).toBe('');
      expect(result.status).toBe('DECLINED');
      expect(result.errorCode).toBe('auth_error');
    });

    it('should return declined when acceptance token is missing', async () => {
      const mockFetch = jest.fn().mockResolvedValue(
        okResponse({
          data: { presigned_acceptance: {} },
        }),
      );

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.charge('tok_test', 5000, 'ORDER-004');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('missing_acceptance_token');
    });

    it('should poll and return APPROVED status', async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          okResponse({
            data: {
              presigned_acceptance: { acceptance_token: 'accept_xyz' },
            },
          }),
        )
        .mockResolvedValueOnce(
          createdResponse({
            data: { id: 'txn_poll', status: 'PENDING' },
          }),
        )
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { status: 'APPROVED' } }),
        });

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.charge('tok_test', 5000, 'ORDER-005');

      expect(result.success).toBe(true);
      expect(result.gatewayReference).toBe('txn_poll');
      expect(result.status).toBe('APPROVED');
    });

    it('should poll and return DECLINED when transaction is declined', async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          okResponse({
            data: {
              presigned_acceptance: { acceptance_token: 'accept_xyz' },
            },
          }),
        )
        .mockResolvedValueOnce(
          createdResponse({
            data: { id: 'txn_decl', status: 'PENDING' },
          }),
        )
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { status: 'DECLINED' } }),
        });

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.charge('tok_decline', 5000, 'ORDER-006');

      expect(result.success).toBe(false);
      expect(result.gatewayReference).toBe('txn_decl');
      expect(result.status).toBe('DECLINED');
      expect(result.errorCode).toBe('declined');
    });

    it('should poll and return VOIDED when transaction is voided', async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          okResponse({
            data: {
              presigned_acceptance: { acceptance_token: 'accept_xyz' },
            },
          }),
        )
        .mockResolvedValueOnce(
          createdResponse({
            data: { id: 'txn_void', status: 'PENDING' },
          }),
        )
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { status: 'VOIDED' } }),
        });

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.charge('tok_void', 5000, 'ORDER-007');

      expect(result.success).toBe(false);
      expect(result.gatewayReference).toBe('txn_void');
      expect(result.status).toBe('VOIDED');
    });

    it('should poll and return ERROR status', async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          okResponse({
            data: {
              presigned_acceptance: { acceptance_token: 'accept_xyz' },
            },
          }),
        )
        .mockResolvedValueOnce(
          createdResponse({
            data: { id: 'txn_err', status: 'PENDING' },
          }),
        )
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { status: 'ERROR' } }),
        });

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.charge('tok_err', 5000, 'ORDER-008');

      expect(result.success).toBe(false);
      expect(result.gatewayReference).toBe('txn_err');
      expect(result.status).toBe('ERROR');
    });

    it('should return poll_timeout when transaction never reaches final status', async () => {
      jest.useFakeTimers();

      const pendingResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { status: 'PENDING' } }),
      };

      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          okResponse({
            data: {
              presigned_acceptance: { acceptance_token: 'accept_xyz' },
            },
          }),
        )
        .mockResolvedValueOnce(
          createdResponse({
            data: { id: 'txn_timeout', status: 'PENDING' },
          }),
        );

      // 15 poll responses all returning PENDING
      for (let i = 0; i < 15; i++) {
        mockFetch.mockResolvedValueOnce(pendingResponse);
      }

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });

      const chargePromise = gateway.charge('tok_timeout', 5000, 'ORDER-009');

      // Advance timers for each poll interval
      for (let i = 0; i < 14; i++) {
        await jest.advanceTimersByTimeAsync(1000);
      }

      const result = await chargePromise;

      expect(result.success).toBe(false);
      expect(result.gatewayReference).toBe('txn_timeout');
      expect(result.status).toBe('PENDING');
      expect(result.errorCode).toBe('poll_timeout');
      expect(result.errorMessage).toBe(
        'Transaction did not reach final status',
      );

      jest.useRealTimers();
    });

    it('should succeed on first attempt for full charge flow', async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          okResponse({
            data: {
              presigned_acceptance: { acceptance_token: 'accept_ok' },
            },
          }),
        )
        .mockResolvedValueOnce(
          createdResponse({
            data: { id: 'txn_ok', status: 'PENDING' },
          }),
        )
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { status: 'APPROVED' } }),
        });

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.charge('tok_good', 10000, 'ORDER-010');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should retry on network error during charge and succeed', async () => {
      // Attempt 1: merchant fetch (call 1) → create transaction throws (call 2)
      // Attempt 2: merchant fetch (call 3) → create transaction (call 4) → poll (call 5)
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          okResponse({
            data: {
              presigned_acceptance: { acceptance_token: 'accept_ok' },
            },
          }),
        )
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(
          okResponse({
            data: {
              presigned_acceptance: { acceptance_token: 'accept_ok' },
            },
          }),
        )
        .mockResolvedValueOnce(
          createdResponse({
            data: { id: 'txn_retry', status: 'PENDING' },
          }),
        )
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { status: 'APPROVED' } }),
        });

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const result = await gateway.charge('tok_retry', 5000, 'ORDER-011');

      expect(result.success).toBe(true);
      expect(result.gatewayReference).toBe('txn_retry');
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });
  });

  describe('getStatus', () => {
    it('should return status from Wompi', async () => {
      const mockFetch = jest.fn().mockResolvedValue(
        okResponse({
          data: { status: 'APPROVED' },
        }),
      );

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const status = await gateway.getStatus('txn_001');

      expect(status).toBe('APPROVED');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        'https://api-sandbox.co.uat.wompi.dev/v1/transactions/txn_001',
      );
      expect(options.method).toBe('GET');
      expect(options.headers.Authorization).toBe(
        'Bearer pub_stagtest_g2u0HQd3ZMh05hsSgTS2lUV8t3s4mOt7',
      );
    });

    it('should throw error when transaction is not found (no retry on 4xx)', async () => {
      const mockFetch = jest.fn().mockResolvedValue(
        errorResponse(404, {
          error: { message: 'Transaction not found' },
        }),
      );

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });

      await expect(gateway.getStatus('nonexistent')).rejects.toThrow(
        'Wompi status check failed: 404',
      );
      // Should NOT retry on 4xx
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on network error and succeed', async () => {
      const mockFetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(
          okResponse({ data: { status: 'APPROVED' } }),
        );

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const status = await gateway.getStatus('txn_retry');

      expect(status).toBe('APPROVED');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should exhaust retries and throw', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Gateway down'));

      const gateway = createGateway(mockFetch, { maxRetries: 2, baseDelayMs: 10 });

      await expect(gateway.getStatus('txn_fail')).rejects.toThrow(
        'Gateway down',
      );
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx status error', async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(errorResponse(503, {}))
        .mockResolvedValueOnce(
          okResponse({ data: { status: 'APPROVED' } }),
        );

      const gateway = createGateway(mockFetch, { maxRetries: 3, baseDelayMs: 10 });
      const status = await gateway.getStatus('txn_503');

      expect(status).toBe('APPROVED');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('config-driven values', () => {
    it('should use default Wompi config values when env vars are not set', () => {
      const emptyConfig = { get: jest.fn().mockReturnValue(undefined) } as any;
      const gateway = new WompiPaymentGateway(emptyConfig);

      expect((gateway as any).baseUrl).toBe(
        'https://api-sandbox.co.uat.wompi.dev/v1',
      );
      expect((gateway as any).publicKey).toBe(
        'pub_stagtest_g2u0HQd3ZMh05hsSgTS2lUV8t3s4mOt7',
      );
      expect((gateway as any).privateKey).toBe(
        'prv_stagtest_5i0ZGIGiFcDQifYsXxvsny7Y37tKqFWg',
      );
      expect((gateway as any).integrityKey).toBe(
        'stagtest_integrity_nAIBuqayW70XpUqJS4qf4STYiISd89Fp',
      );
    });

    it('should read retry config from config service', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'WOMPI_MAX_RETRIES') return 5;
        if (key === 'WOMPI_BASE_DELAY_MS') return 2000;
        return DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG];
      });

      const gateway = new WompiPaymentGateway(mockConfigService);
      expect((gateway as any).retryConfig.maxRetries).toBe(5);
      expect((gateway as any).retryConfig.baseDelayMs).toBe(2000);
    });

    it('should read config values from config service', () => {
      const configValues: Record<string, string> = {
        WOMPI_BASE_URL: 'https://custom.wompi.url/v1',
        WOMPI_PUBLIC_KEY: 'pub_custom',
        WOMPI_PRIVATE_KEY: 'prv_custom',
        WOMPI_INTEGRITY_KEY: 'custom_integrity',
      };
      mockConfigService.get.mockImplementation(
        (key: string) => configValues[key],
      );

      const gateway = new WompiPaymentGateway(mockConfigService);
      expect((gateway as any).baseUrl).toBe('https://custom.wompi.url/v1');
      expect((gateway as any).publicKey).toBe('pub_custom');
      expect((gateway as any).privateKey).toBe('prv_custom');
      expect((gateway as any).integrityKey).toBe('custom_integrity');
    });
  });

  describe('signature generation', () => {
    it('should generate correct SHA-256 signature with integrity key + reference + amount + currency', () => {
      const gateway = createGateway(jest.fn(), {
        maxRetries: 3,
        baseDelayMs: 10,
      });

      const signature = (gateway as any).generateSignature(
        'ORDER-123',
        99999,
        'COP',
      );

      const expected =
        'c25564615cd1ebbb4f8436f5553a78adab5bf3ee9abb53723602019e481b3c5e';
      expect(signature).toBe(expected);
    });

    it('should generate different signatures for different amounts', () => {
      const gateway = createGateway(jest.fn(), {
        maxRetries: 3,
        baseDelayMs: 10,
      });

      const sig1 = (gateway as any).generateSignature('ORDER-1', 100, 'COP');
      const sig2 = (gateway as any).generateSignature('ORDER-1', 200, 'COP');

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different references', () => {
      const gateway = createGateway(jest.fn(), {
        maxRetries: 3,
        baseDelayMs: 10,
      });

      const sig1 = (gateway as any).generateSignature('ORDER-A', 100, 'COP');
      const sig2 = (gateway as any).generateSignature('ORDER-B', 100, 'COP');

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('expiry parsing', () => {
    it('should parse MM/YY format', () => {
      const gateway = createGateway(jest.fn(), {
        maxRetries: 3,
        baseDelayMs: 10,
      });
      const result = (gateway as any).parseExpiry('12/28');
      expect(result.exp_month).toBe(12);
      expect(result.exp_year).toBe(2028);
    });

    it('should parse M/YY single digit month', () => {
      const gateway = createGateway(jest.fn(), {
        maxRetries: 3,
        baseDelayMs: 10,
      });
      const result = (gateway as any).parseExpiry('3/30');
      expect(result.exp_month).toBe(3);
      expect(result.exp_year).toBe(2030);
    });

    it('should parse MM/YYYY full year format', () => {
      const gateway = createGateway(jest.fn(), {
        maxRetries: 3,
        baseDelayMs: 10,
      });
      const result = (gateway as any).parseExpiry('06/2026');
      expect(result.exp_month).toBe(6);
      expect(result.exp_year).toBe(2026);
    });
  });

  describe('fetch unavailable', () => {
    it('should reject when fetch is not available', async () => {
      const originalFetch = (globalThis as any).fetch;
      (globalThis as any).fetch = undefined;

      const configService = {
        get: jest.fn().mockReturnValue(undefined),
      } as any;
      const gateway = new WompiPaymentGateway(configService);

      await expect(gateway.getStatus('ref-x')).rejects.toThrow(
        'HTTP fetch not available',
      );

      (globalThis as any).fetch = originalFetch;
    });
  });
});
