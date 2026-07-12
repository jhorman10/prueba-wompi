import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  IPaymentGateway,
  CardDetails,
  TokenResponse,
  ChargeResponse,
} from '../domain/payment-gateway.interface';

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
}

class WompiHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'WompiHttpError';
  }
}

const DEFAULT_RETRY_CONFIG: RetryConfig = { maxRetries: 3, baseDelayMs: 1000 };

@Injectable()
export class WompiPaymentGateway implements IPaymentGateway {
  private readonly baseUrl: string;
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly integrityKey: string;
  private readonly retryConfig: RetryConfig;
  private readonly httpFetch: (url: string, options?: any) => Promise<any>;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('WOMPI_BASE_URL') ||
      'https://api-sandbox.co.uat.wompi.dev/v1';
    this.publicKey =
      this.configService.get<string>('WOMPI_PUBLIC_KEY') ||
      'pub_stagtest_g2u0HQd3ZMh05hsSgTS2lUV8t3s4mOt7';
    this.privateKey =
      this.configService.get<string>('WOMPI_PRIVATE_KEY') ||
      'prv_stagtest_5i0ZGIGiFcDQifYsXxvsny7Y37tKqFWg';
    this.integrityKey =
      this.configService.get<string>('WOMPI_INTEGRITY_KEY') ||
      'stagtest_integrity_nAIBuqayW70XpUqJS4qf4STYiISd89Fp';
    this.retryConfig = {
      maxRetries:
        this.configService.get<number>('WOMPI_MAX_RETRIES') ||
        DEFAULT_RETRY_CONFIG.maxRetries,
      baseDelayMs:
        this.configService.get<number>('WOMPI_BASE_DELAY_MS') ||
        DEFAULT_RETRY_CONFIG.baseDelayMs,
    };

    if (typeof globalThis.fetch === 'function') {
      this.httpFetch = globalThis.fetch.bind(globalThis);
    } else {
      this.httpFetch = () =>
        Promise.reject(new Error('HTTP fetch not available in this environment'));
    }
  }

  static createWithMock(
    configService: ConfigService,
    mockFetch: (url: string, options?: any) => Promise<any>,
    retryConfig?: RetryConfig,
  ): WompiPaymentGateway {
    const instance = new WompiPaymentGateway(configService);
    (instance as any).httpFetch = mockFetch;
    if (retryConfig) {
      (instance as any).retryConfig = retryConfig;
    }
    return instance;
  }

  async tokenize(details: CardDetails): Promise<TokenResponse> {
    const { exp_month, exp_year } = this.parseExpiry(details.expiry);
    const lastFour = details.number.slice(-4);

    return this.executeWithRetry(async () => {
      const response = await this.httpFetch(`${this.baseUrl}/tokens/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.publicKey}`,
        },
        body: JSON.stringify({
          number: details.number,
          cvc: details.cvc,
          exp_month,
          exp_year,
          card_holder: {
            name: details.cardholderName,
          },
        }),
      });

      if (response.status !== 201) {
        const errorBody = await response.json().catch(() => ({}));
        throw new WompiHttpError(
          errorBody?.error?.message ||
            errorBody?.message ||
            `Wompi tokenize failed: ${response.status}`,
          response.status,
        );
      }

      const body = await response.json();
      return {
        token: body.data.id,
        cardLastFour: lastFour,
      };
    });
  }

  async charge(
    token: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<ChargeResponse> {
    return this.executeWithRetry(async () => {
      // Step 1: Get acceptance token from merchant
      const merchantResponse = await this.httpFetch(
        `${this.baseUrl}/merchants/${this.publicKey}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.publicKey}`,
          },
        },
      );

      if (!merchantResponse.ok) {
        const errorBody = await merchantResponse.json().catch(() => ({}));
        return {
          success: false,
          gatewayReference: '',
          status: 'DECLINED',
          errorCode: errorBody?.error?.type || 'merchant_fetch_failed',
          errorMessage:
            errorBody?.error?.message || 'Failed to fetch merchant info',
        };
      }

      const merchantData = await merchantResponse.json();
      const acceptanceToken =
        merchantData.data?.presigned_acceptance?.acceptance_token;

      if (!acceptanceToken) {
        return {
          success: false,
          gatewayReference: '',
          status: 'DECLINED',
          errorCode: 'missing_acceptance_token',
          errorMessage: 'No acceptance token found in merchant response',
        };
      }

      // Step 2: Generate signature
      const signature = this.generateSignature(
        idempotencyKey,
        amount,
        'COP',
      );

      // Step 3: Create transaction
      const transactionResponse = await this.httpFetch(
        `${this.baseUrl}/transactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.privateKey}`,
          },
          body: JSON.stringify({
            amount_in_cents: amount,
            currency: 'COP',
            customer_email: this.configService.get<string>(
              'WOMPI_CUSTOMER_EMAIL',
              'customer@checkout.app',
            ),
            payment_method: {
              type: 'CARD',
              token,
              installments: 1,
            },
            reference: idempotencyKey,
            acceptance_token: acceptanceToken,
            signature,
          }),
        },
      );

      if (transactionResponse.status !== 201) {
        const errorBody = await transactionResponse.json().catch(() => ({}));
        return {
          success: false,
          gatewayReference: '',
          status: 'DECLINED',
          errorCode:
            errorBody?.error?.type || `status_${transactionResponse.status}`,
          errorMessage:
            errorBody?.error?.message ||
            errorBody?.message ||
            'Transaction creation failed',
        };
      }

      const transactionData = await transactionResponse.json();
      const transactionId = transactionData.data.id;

      // Step 4: Poll for final status
      return this.pollTransactionStatus(transactionId);
    });
  }

  async getStatus(gatewayRef: string): Promise<string> {
    return this.executeWithRetry(async () => {
      const response = await this.httpFetch(
        `${this.baseUrl}/transactions/${gatewayRef}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.publicKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new WompiHttpError(
          `Wompi status check failed: ${response.status}`,
          response.status,
        );
      }

      const body = await response.json();
      return body.data.status as string;
    });
  }

  private async pollTransactionStatus(
    transactionId: string,
  ): Promise<ChargeResponse> {
    const maxAttempts = 15;
    const intervalMs = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await this.httpFetch(
        `${this.baseUrl}/transactions/${transactionId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.publicKey}`,
          },
        },
      );

      if (response.ok) {
        const body = await response.json();
        const status = body.data.status as string;

        if (status === 'APPROVED') {
          return {
            success: true,
            gatewayReference: transactionId,
            status: 'APPROVED',
          };
        }

        if (['DECLINED', 'VOIDED', 'ERROR'].includes(status)) {
          return {
            success: false,
            gatewayReference: transactionId,
            status,
            errorCode: status.toLowerCase(),
            errorMessage: `Transaction ${status.toLowerCase()}`,
          };
        }
      }

      if (attempt < maxAttempts - 1) {
        await this.sleep(intervalMs);
      }
    }

    return {
      success: false,
      gatewayReference: transactionId,
      status: 'PENDING',
      errorCode: 'poll_timeout',
      errorMessage: 'Transaction did not reach final status',
    };
  }

  private parseExpiry(expiry: string): {
    exp_month: number;
    exp_year: number;
  } {
    const [month, year] = expiry.split('/');
    const exp_month = parseInt(month, 10);
    const shortYear = parseInt(year, 10);
    const exp_year = shortYear < 100 ? 2000 + shortYear : shortYear;
    return { exp_month, exp_year };
  }

  private generateSignature(
    reference: string,
    amount: number,
    currency: string,
  ): string {
    const raw = `${this.integrityKey}${reference}${amount}${currency}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Do not retry on 4xx HTTP errors — these are client errors
        if (
          error instanceof WompiHttpError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          throw error;
        }

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
