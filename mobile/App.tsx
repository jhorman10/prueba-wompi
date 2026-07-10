import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

/**
 * Root application component.
 * Wraps the app in Redux Provider, PersistGate for rehydration,
 * SafeAreaProvider for safe area insets, and the stack navigator.
 */
export default function App() {
  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#6200ee" />
          </View>
        }
        persistor={persistor}
      >
        <SafeAreaProvider>
          <AppNavigator />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
