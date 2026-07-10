import checkoutReducer, {
  CheckoutState,
  setStep,
  setCardInfo,
  setToken,
  setTransactionId,
  clearCardInfo,
  advanceStep,
} from '../src/store/slices/checkoutSlice';

describe('checkoutSlice', () => {
  const initialState: CheckoutState = {
    step: 0,
    cardInfo: undefined,
    token: undefined,
    transactionId: undefined,
  };

  it('returns initial state', () => {
    const state = checkoutReducer(undefined, { type: 'unknown' });
    expect(state).toEqual(initialState);
  });

  it('sets step number', () => {
    const state = checkoutReducer(initialState, setStep(3));
    expect(state.step).toBe(3);
  });

  it('advances step by 1', () => {
    const state = checkoutReducer(
      { ...initialState, step: 2 },
      advanceStep(),
    );
    expect(state.step).toBe(3);
  });

  it('sets card info', () => {
    const cardInfo = {
      number: '4111111111111111',
      expiry: '12/25',
      cvc: '123',
      cardholderName: 'John Doe',
      brand: 'visa' as const,
    };
    const state = checkoutReducer(initialState, setCardInfo(cardInfo));
    expect(state.cardInfo).toEqual(cardInfo);
  });

  it('sets gateway token', () => {
    const state = checkoutReducer(initialState, setToken('tok_test_123'));
    expect(state.token).toBe('tok_test_123');
  });

  it('sets transaction id', () => {
    const state = checkoutReducer(initialState, setTransactionId('txn_abc_123'));
    expect(state.transactionId).toBe('txn_abc_123');
  });

  it('clears card info after tokenization', () => {
    const stateWithCard: CheckoutState = {
      ...initialState,
      cardInfo: {
        number: '4111111111111111',
        expiry: '12/25',
        cvc: '123',
        cardholderName: 'John Doe',
        brand: 'visa',
      },
    };
    const state = checkoutReducer(stateWithCard, clearCardInfo());
    expect(state.cardInfo).toBeUndefined();
    expect(state.step).toBe(initialState.step);
    expect(state.token).toBe(initialState.token);
  });
});
