import React, { useEffect, useCallback, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  BackHandler,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { Product, setProducts, setLoading, setError } from '../store/slices/productsSlice';
import { ProductCard } from '../components/ProductCard';
import { getApiClientInstance } from '../services/api';
import { selectCartCount } from '../store/selectors';

interface HomeScreenProps {
  navigation?: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

/**
 * Home screen — fetches and displays product list from backend.
 */
export function HomeScreen({ navigation }: HomeScreenProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { items: products, loading, error } = useSelector(
    (state: RootState) => state.products,
  );
  const cartCount = useSelector(selectCartCount);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const api = getApiClientInstance();
      const data = await api.getProducts();
      dispatch(setProducts(data as Product[]));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load products';
      dispatch(setError(message));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }, [fetchProducts]);

  const stackNavigation = useNavigation<any>();

  useLayoutEffect(() => {
    stackNavigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => {
            if (Platform.OS === 'android') {
              BackHandler.exitApp();
            }
          }}
          style={({ pressed }) => [
            styles.headerExitButton,
            pressed && { opacity: 0.6 },
          ]}
          hitSlop={8}
        >
          <Text style={styles.headerExitText}>×</Text>
        </Pressable>
      ),
    });
  }, [stackNavigation]);

  const handleSelectProduct = useCallback((product: Product) => {
    navigation?.navigate('SelectProduct', { product });
  }, [navigation]);

  const renderProductItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard product={item} onSelect={handleSelectProduct} />
    ),
    [handleSelectProduct],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Products</Text>

      {loading && products.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : error && products.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Pressable
            onPress={fetchProducts}
            style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          testID="product-list"
          ListEmptyComponent={
            <Text style={styles.emptyText}>No products available</Text>
          }
        />
      )}

      {cartCount > 0 && (
        <Pressable
          style={({ pressed }) => [styles.cartBar, pressed && { opacity: 0.8 }]}
          onPress={() => navigation?.navigate('Checkout')}
        >
          <Text style={styles.cartBarText}>
            View Cart ({cartCount} item{cartCount !== 1 ? 's' : ''})
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: '#e53935',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6200ee',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    paddingBottom: 80,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
    color: '#999',
  },
  headerExitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Platform.OS === 'android' ? 0 : -4,
  },
  headerExitText: {
    fontSize: 22,
    lineHeight: 24,
    color: '#666',
    fontWeight: '500',
  },
  cartBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#6200ee',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    boxShadow: '0 4px 8px rgba(98,0,238,0.3)',
  },
  cartBarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
