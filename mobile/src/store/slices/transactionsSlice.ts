import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TransactionItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  productName: string;
}

export interface TransactionRecord {
  id: string;
  status: string;
  amount: number;
  items: TransactionItem[];
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
