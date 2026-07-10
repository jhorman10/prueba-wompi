import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TransactionRecord {
  id: string;
  status: string;
  amount: number;
  productId: string;
  quantity: number;
  createdAt: string;
}

export interface TransactionsState {
  history: TransactionRecord[];
  lastTransaction: TransactionRecord | null;
}

const initialState: TransactionsState = {
  history: [],
  lastTransaction: null,
};

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    addTransaction(state, action: PayloadAction<TransactionRecord>) {
      state.history.push(action.payload);
      state.lastTransaction = action.payload;
    },
    clearLastTransaction(state) {
      state.lastTransaction = null;
    },
  },
});

export const { addTransaction, clearLastTransaction } =
  transactionsSlice.actions;
export default transactionsSlice.reducer;
