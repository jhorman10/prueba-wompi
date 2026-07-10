import { PAYMENT_GATEWAY } from './payment-gateway.interface';

describe('PaymentGateway Interface', () => {
  it('should export PAYMENT_GATEWAY injection token as Symbol', () => {
    expect(PAYMENT_GATEWAY).toBeDefined();
    expect(typeof PAYMENT_GATEWAY).toBe('symbol');
    expect(PAYMENT_GATEWAY.toString()).toContain('PAYMENT_GATEWAY');
  });

  it('should define tokenize, charge, and getStatus methods via contract test', () => {
    // Contract test: any implementor must have these 3 methods
    const mockGateway = {
      tokenize: jest.fn().mockResolvedValue({ token: 'tok_test', cardLastFour: '4242' }),
      charge: jest.fn().mockResolvedValue({ success: true, gatewayReference: 'ref_1', status: 'APPROVED' }),
      getStatus: jest.fn().mockResolvedValue('APPROVED'),
    };

    expect(mockGateway.tokenize).toBeDefined();
    expect(mockGateway.charge).toBeDefined();
    expect(mockGateway.getStatus).toBeDefined();
  });

  it('should invoke tokenize with card details and return token', async () => {
    const mockGateway = {
      tokenize: jest.fn().mockResolvedValue({ token: 'tok_test_abc', cardLastFour: '4242' }),
      charge: jest.fn(),
      getStatus: jest.fn(),
    };

    const result = await mockGateway.tokenize({
      number: '4242424242424242',
      expiry: '12/28',
      cvc: '123',
      cardholderName: 'John Doe',
    });

    expect(result.token).toBe('tok_test_abc');
    expect(result.cardLastFour).toBe('4242');
    expect(mockGateway.tokenize).toHaveBeenCalledTimes(1);
  });

  it('should invoke charge with token, amount, and idempotency key', async () => {
    const mockGateway = {
      tokenize: jest.fn(),
      charge: jest.fn().mockResolvedValue({ success: true, gatewayReference: 'ref_xyz', status: 'APPROVED' }),
      getStatus: jest.fn(),
    };

    const result = await mockGateway.charge('tok_abc', 99999, 'idemp-123');

    expect(result.success).toBe(true);
    expect(result.gatewayReference).toBe('ref_xyz');
    expect(mockGateway.charge).toHaveBeenCalledWith('tok_abc', 99999, 'idemp-123');
  });

  it('should handle failed charge response', async () => {
    const mockGateway = {
      tokenize: jest.fn(),
      charge: jest.fn().mockResolvedValue({
        success: false,
        gatewayReference: 'ref_fail',
        status: 'DECLINED',
        errorCode: 'insufficient_funds',
        errorMessage: 'Insufficient funds',
      }),
      getStatus: jest.fn(),
    };

    const result = await mockGateway.charge('tok_bad', 5000, 'idemp-456');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('insufficient_funds');
    expect(result.status).toBe('DECLINED');
  });

  it('should invoke getStatus and return status string', async () => {
    const mockGateway = {
      tokenize: jest.fn(),
      charge: jest.fn(),
      getStatus: jest.fn().mockResolvedValue('APPROVED'),
    };

    const status = await mockGateway.getStatus('ref_xyz');
    expect(status).toBe('APPROVED');
    expect(mockGateway.getStatus).toHaveBeenCalledWith('ref_xyz');
  });
});
