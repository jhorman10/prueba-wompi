import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CardBrand } from '../../services/cardDetection';

/** Card info stored in Redux — NEVER store full PAN or CVV here (PCI DSS). */
export interface CardInfo {
  lastFour: string;
  brand: CardBrand;
  cardholderName: string;
  expiry: string; // only stored temporarily for re-display, cleared after tokenization
}

export interface CheckoutState {
  step: number;
  cardInfo?: CardInfo;
  token?: string;
  transactionId?: string;
}

const initialState: CheckoutState = {
  step: 0,
  cardInfo: undefined,
  token: undefined,
  transactionId: undefined,
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    setStep(state, action: PayloadAction<number>) {
      state.step = action.payload;
    },
    advanceStep(state) {
      state.step += 1;
    },
    setCardInfo(state, action: PayloadAction<CardInfo>) {
      state.cardInfo = action.payload;
    },
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
    },
    setTransactionId(state, action: PayloadAction<string>) {
      state.transactionId = action.payload;
    },
    clearCardInfo(state) {
      state.cardInfo = undefined;
    },
  },
});

export const {
  setStep,
  advanceStep,
  setCardInfo,
  setToken,
  setTransactionId,
  clearCardInfo,
} = checkoutSlice.actions;
export default checkoutSlice.reducer;
