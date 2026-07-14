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
import { useTheme } from '../theme/ThemeContext';

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
 * Inner navigator content — runs inside ThemeProvider context so useTheme() works.
 */
function AppNavigatorContent() {
  const theme = useTheme();
  const { colors } = theme;

  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: colors.tint,
        headerTitleStyle: { fontWeight: '600' },
        headerBackTitleVisible: false,
        contentStyle: { backgroundColor: colors.background },
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
  );
}

/**
 * Root stack navigator — wrapped in NavigationContainer.
 * Themed content lives in AppNavigatorContent so useTheme() has access to ThemeProvider.
 */
export function AppNavigator() {
  return (
    <NavigationContainer>
      <AppNavigatorContent />
    </NavigationContainer>
  );
}
