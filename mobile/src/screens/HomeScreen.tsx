import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { Product, setProducts, setLoading, setError } from '../store/slices/productsSlice';
import { ProductCard } from '../components/ProductCard';
import { createApiClient } from '../services/api';

const API_URL = 'http://localhost:3000/api';

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
  const cartItems = useSelector((state: RootState) => state.cart.items);

  useEffect(() => {
    fetchProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProducts = async () => {
    dispatch(setLoading(true));
    try {
      const api = createApiClient(API_URL);
      const data = await api.getProducts();
      dispatch(setProducts(data as Product[]));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load products';
      dispatch(setError(message));
    }
  };

  const handleSelectProduct = (product: Product) => {
    navigation?.navigate('SelectProduct', { product });
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Products</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity onPress={fetchProducts} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard product={item} onSelect={handleSelectProduct} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No products available</Text>
          }
        />
      )}

      {cartCount > 0 && (
        <TouchableOpacity
          style={styles.cartBar}
          onPress={() => navigation?.navigate('Checkout')}
        >
          <Text style={styles.cartBarText}>
            View Cart ({cartCount} item{cartCount !== 1 ? 's' : ''})
          </Text>
        </TouchableOpacity>
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
  cartBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#6200ee',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cartBarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
