import transactionsReducer, {
  TransactionsState,
  addTransaction,
  clearLastTransaction,
  TransactionRecord,
} from '../src/store/slices/transactionsSlice';

describe('transactionsSlice', () => {
  const initialState: TransactionsState = {
    history: [],
    lastTransaction: null,
  };

  const sampleTxn: TransactionRecord = {
    id: 'txn_1',
    status: 'COMPLETED',
    amount: 2999,
    items: [
      { productId: 'p1', quantity: 1, unitPrice: 2999, productName: 'Product 1' },
    ],
    createdAt: '2024-01-15T10:00:00Z',
  };

  it('returns initial state', () => {
    const state = transactionsReducer(undefined, { type: 'unknown' });
    expect(state).toEqual(initialState);
  });

  it('adds a transaction to history and sets as last', () => {
    const state = transactionsReducer(initialState, addTransaction(sampleTxn));
    expect(state.history).toHaveLength(1);
    expect(state.history[0]).toEqual(sampleTxn);
    expect(state.lastTransaction).toEqual(sampleTxn);
  });

  it('appends to existing history', () => {
    const existing: TransactionRecord = {
      id: 'txn_1',
      status: 'COMPLETED',
      amount: 1000,
      items: [{ productId: 'p1', quantity: 1, unitPrice: 1000, productName: 'Product 1' }],
      createdAt: '2024-01-15T10:00:00Z',
    };
    const newTxn: TransactionRecord = {
      id: 'txn_2',
      status: 'FAILED',
      amount: 5000,
      items: [{ productId: 'p2', quantity: 2, unitPrice: 2500, productName: 'Product 2' }],
      createdAt: '2024-01-16T10:00:00Z',
    };
    const stateWithHistory: TransactionsState = {
      history: [existing],
      lastTransaction: existing,
    };
    const state = transactionsReducer(stateWithHistory, addTransaction(newTxn));
    expect(state.history).toHaveLength(2);
    expect(state.history[0]).toEqual(existing);
    expect(state.history[1]).toEqual(newTxn);
    expect(state.lastTransaction).toEqual(newTxn);
  });

  it('clears last transaction', () => {
    const stateWithTxn: TransactionsState = {
      history: [sampleTxn],
      lastTransaction: sampleTxn,
    };
    const state = transactionsReducer(stateWithTxn, clearLastTransaction());
    expect(state.lastTransaction).toBeNull();
    expect(state.history).toHaveLength(1);
  });
});