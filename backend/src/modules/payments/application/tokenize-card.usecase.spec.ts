import { TokenizeCardUseCase } from './tokenize-card.usecase';
import { IPaymentGateway } from '../domain/payment-gateway.interface';

describe('TokenizeCardUseCase', () => {
  let useCase: TokenizeCardUseCase;
  let mockGateway: jest.Mocked<IPaymentGateway>;

  beforeEach(() => {
    mockGateway = {
      tokenize: jest.fn(),
      charge: jest.fn(),
      getStatus: jest.fn(),
    };
    useCase = new TokenizeCardUseCase(mockGateway);
  });

  it('should tokenize card and return token with last four digits', async () => {
    mockGateway.tokenize.mockResolvedValue({
      token: 'tok_test_abc123',
      cardLastFour: '4242',
    });

    const result = await useCase.execute({
      number: '4242424242424242',
      expiry: '12/28',
      cvc: '123',
      cardholderName: 'John Doe',
    });

    expect(result.token).toBe('tok_test_abc123');
    expect(result.cardLastFour).toBe('4242');
    expect(mockGateway.tokenize).toHaveBeenCalledWith({
      number: '4242424242424242',
      expiry: '12/28',
      cvc: '123',
      cardholderName: 'John Doe',
    });
  });

  it('should extract cardLastFour from the card number, not the response', async () => {
    mockGateway.tokenize.mockResolvedValue({
      token: 'tok_xyz',
      cardLastFour: '0000', // Gateway might return different format
    });

    const result = await useCase.execute({
      number: '4000056655665556',
      expiry: '06/26',
      cvc: '321',
      cardholderName: 'Jane Smith',
    });

    // We extract last four from the input number, not the gateway response
    expect(result.cardLastFour).toBe('5556');
  });

  it('should propagate gateway errors', async () => {
    mockGateway.tokenize.mockRejectedValue(new Error('Gateway timeout'));

    await expect(
      useCase.execute({
        number: '4242424242424242',
        expiry: '12/28',
        cvc: '123',
        cardholderName: 'John Doe',
      }),
    ).rejects.toThrow('Gateway timeout');
  });

  it('should handle different card lengths correctly', async () => {
    mockGateway.tokenize.mockResolvedValue({
      token: 'tok_15_card',
      cardLastFour: '0004',
    });

    const result = await useCase.execute({
      number: '378282246310004',
      expiry: '12/26',
      cvc: '1234',
      cardholderName: 'Amex User',
    });

    expect(result.cardLastFour).toBe('0004');
  });
});
