import { Product } from '../store/slices/productsSlice';

export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  SelectProduct: { product: Product };
  Checkout: undefined;
  CardInfo: undefined;
  PaymentSummary: {
    cardNumber: string;
    cardExpiry: string;
    cardCvc: string;
  } | undefined;
  TransactionStatus: { transaction: { id: string; status: string; amount: number } };
};

export type ScreenNavigationProp = {
  navigate: (name: keyof RootStackParamList, params?: RootStackParamList[keyof RootStackParamList]) => void;
  goBack: () => void;
  reset: (state: { index: number; routes: Array<{ name: string; params?: any }> }) => void;
  setOptions: (options: any) => void;
};

export type ScreenRouteProp<T extends keyof RootStackParamList> = {
  params: RootStackParamList[T];
};