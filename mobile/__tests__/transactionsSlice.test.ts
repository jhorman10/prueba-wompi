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

  it('returns initial state', () => {
    const state = transactionsReducer(undefined, { type: 'unknown' });
    expect(state).toEqual(initialState);
  });

  it('adds a transaction to history and sets as last', () => {
    const txn: TransactionRecord = {
      id: 'txn_1',
      status: 'COMPLETED',
      amount: 2999,
      productId: 'p1',
      quantity: 1,
      createdAt: '2024-01-15T10:00:00Z',
    };
    const state = transactionsReducer(initialState, addTransaction(txn));
    expect(state.history).toHaveLength(1);
    expect(state.history[0]).toEqual(txn);
    expect(state.lastTransaction).toEqual(txn);
  });

  it('appends to existing history', () => {
    const existing: TransactionRecord = {
      id: 'txn_1',
      status: 'COMPLETED',
      amount: 1000,
      productId: 'p1',
      quantity: 1,
      createdAt: '2024-01-15T10:00:00Z',
    };
    const newTxn: TransactionRecord = {
      id: 'txn_2',
      status: 'FAILED',
      amount: 5000,
      productId: 'p2',
      quantity: 2,
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
    const txn: TransactionRecord = {
      id: 'txn_1',
      status: 'COMPLETED',
      amount: 2999,
      productId: 'p1',
      quantity: 1,
      createdAt: '2024-01-15T10:00:00Z',
    };
    const stateWithTxn: TransactionsState = {
      history: [txn],
      lastTransaction: txn,
    };
    const state = transactionsReducer(stateWithTxn, clearLastTransaction());
    expect(state.lastTransaction).toBeNull();
    expect(state.history).toHaveLength(1);
  });
});
