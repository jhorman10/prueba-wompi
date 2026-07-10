import { Inject } from '@nestjs/common';
import { IPaymentGateway, PAYMENT_GATEWAY, CardDetails, TokenResponse } from '../domain/payment-gateway.interface';

export class TokenizeCardUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(details: CardDetails): Promise<TokenResponse> {
    const lastFour = details.number.slice(-4);

    const tokenResponse = await this.paymentGateway.tokenize(details);

    return {
      token: tokenResponse.token,
      cardLastFour: lastFour,
    };
  }
}
