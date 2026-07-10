export interface CardDetails {
  number: string;
  expiry: string;
  cvc: string;
  cardholderName: string;
}

export interface TokenResponse {
  token: string;
  cardLastFour: string;
}

export interface ChargeResponse {
  success: boolean;
  gatewayReference: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface IPaymentGateway {
  tokenize(details: CardDetails): Promise<TokenResponse>;
  charge(token: string, amount: number, idempotencyKey: string): Promise<ChargeResponse>;
  getStatus(gatewayRef: string): Promise<string>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
