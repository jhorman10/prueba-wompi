import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CardBrand } from '../../services/cardDetection';

export interface CardInfo {
  number: string;
  expiry: string;
  cvc: string;
  cardholderName: string;
  brand: CardBrand;
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
