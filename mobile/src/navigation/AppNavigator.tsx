import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from '../screens/SplashScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SelectProductScreen } from '../screens/SelectProductScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { CardInfoScreen } from '../screens/CardInfoScreen';
import { PaymentSummaryScreen } from '../screens/PaymentSummaryScreen';
import { TransactionStatusScreen } from '../screens/TransactionStatusScreen';

export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  SelectProduct: { product: import('../store/slices/productsSlice').Product };
  Checkout: undefined;
  CardInfo: undefined;
  PaymentSummary: {
    cardNumber: string;
    cardExpiry: string;
    cardCvc: string;
  } | undefined;
  TransactionStatus: { transaction: { id: string; status: string; amount: number } };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root stack navigator — 7 screens:
 * Splash → Home → SelectProduct → Checkout → CardInfo → PaymentSummary → TransactionStatus
 */
export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#1a1a1a',
          headerTitleStyle: { fontWeight: '600' },
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Products' }}
        />
        <Stack.Screen
          name="SelectProduct"
          component={SelectProductScreen}
          options={{ title: 'Select Product' }}
        />
        <Stack.Screen
          name="Checkout"
          component={CheckoutScreen}
          options={{ title: 'Checkout' }}
        />
        <Stack.Screen
          name="CardInfo"
          component={CardInfoScreen}
          options={{ title: 'Card Info' }}
        />
        <Stack.Screen
          name="PaymentSummary"
          component={PaymentSummaryScreen}
          options={{ title: 'Payment Summary' }}
        />
        <Stack.Screen
          name="TransactionStatus"
          component={TransactionStatusScreen}
          options={{ title: 'Status', headerBackVisible: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
