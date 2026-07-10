import { Injectable } from '@nestjs/common';
import { IPaymentGateway, CardDetails, TokenResponse, ChargeResponse } from '../domain/payment-gateway.interface';
import { ConfigService } from '@nestjs/config';

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = { maxRetries: 3, baseDelayMs: 1000 };

@Injectable()
export class SandboxPaymentGateway implements IPaymentGateway {
  private readonly gatewayUrl: string;
  private readonly retryConfig: RetryConfig;
  private readonly httpFetch: (url: string, options?: any) => Promise<any>;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.gatewayUrl =
      this.configService.get<string>('GATEWAY_URL') || 'https://sandbox-gateway.example.com';
    this.retryConfig = {
      maxRetries: this.configService.get<number>('GATEWAY_MAX_RETRIES') || DEFAULT_RETRY_CONFIG.maxRetries,
      baseDelayMs: this.configService.get<number>('GATEWAY_BASE_DELAY_MS') || DEFAULT_RETRY_CONFIG.baseDelayMs,
    };

    // Use global fetch if available (Node 18+), otherwise throw
    if (typeof globalThis.fetch === 'function') {
      this.httpFetch = globalThis.fetch.bind(globalThis);
    } else {
      // Fallback that will trigger retry with a clear error
      this.httpFetch = () => Promise.reject(new Error('HTTP fetch not available in this environment'));
    }
  }

  // Static factory for tests with custom fetch and retry config
  static createWithMock(
    configService: ConfigService,
    mockFetch: (url: string, options?: any) => Promise<any>,
    retryConfig?: RetryConfig,
  ): SandboxPaymentGateway {
    const instance = new SandboxPaymentGateway(configService);
    (instance as any).httpFetch = mockFetch;
    if (retryConfig) {
      (instance as any).retryConfig = retryConfig;
    }
    return instance;
  }

  async tokenize(details: CardDetails): Promise<TokenResponse> {
    const lastFour = details.number.slice(-4);

    if (this.gatewayUrl.includes('sandbox')) {
      return {
        token: `tok_sandbox_${Date.now()}`,
        cardLastFour: lastFour,
      };
    }

    return this.executeWithRetry(async () => {
      const response = await this.httpFetch(`${this.gatewayUrl}/v1/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: details.number,
          expiry: details.expiry,
          cvc: details.cvc,
          cardholderName: details.cardholderName,
        }),
      });

      if (!response.ok) throw new Error(`Gateway tokenize failed: ${response.status}`);
      const data = await response.json();
      return { token: data.token, cardLastFour: lastFour };
    });
  }

  async charge(token: string, amount: number, idempotencyKey: string): Promise<ChargeResponse> {
    if (this.gatewayUrl.includes('sandbox')) {
      const isSuccess = token !== 'tok_fail';
      return {
        success: isSuccess,
        gatewayReference: `ref_${Date.now()}`,
        status: isSuccess ? 'APPROVED' : 'DECLINED',
        errorCode: isSuccess ? undefined : 'card_declined',
        errorMessage: isSuccess ? undefined : 'Card was declined',
      };
    }

    return this.executeWithRetry(async () => {
      const response = await this.httpFetch(`${this.gatewayUrl}/v1/charges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, amount, idempotencyKey }),
      });

      if (!response.ok) {
        if (response.status === 503) throw new Error('Service unavailable');
        const data = await response.json();
        return {
          success: false,
          gatewayReference: '',
          status: 'DECLINED',
          errorCode: data.error_code,
          errorMessage: data.message,
        };
      }
      const data = await response.json();
      return { success: true, gatewayReference: data.reference, status: 'APPROVED' };
    });
  }

  async getStatus(gatewayRef: string): Promise<string> {
    if (this.gatewayUrl.includes('sandbox')) {
      return 'APPROVED';
    }

    return this.executeWithRetry(async () => {
      const response = await this.httpFetch(`${this.gatewayUrl}/v1/charges/${gatewayRef}`);
      if (!response.ok) throw new Error(`Gateway status check failed: ${response.status}`);
      const data = await response.json();
      return data.status;
    });
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.retryConfig.maxRetries - 1) {
          const delay = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Retry failed');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
