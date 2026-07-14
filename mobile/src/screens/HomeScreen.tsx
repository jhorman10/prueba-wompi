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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { Product, setProducts, setLoading, setError } from '../store/slices/productsSlice';
import { ProductCard } from '../components/ProductCard';
import { getApiClientInstance } from '../services/api';
import { selectCartCount } from '../store/selectors';
import { useTheme, Theme } from '../theme/ThemeContext';
import { RootStackParamList } from '../navigation/types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

/**
 * Home screen — fetches and displays product list from backend.
 */
export function HomeScreen({ navigation }: HomeScreenProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { colors, spacing } = theme;
  const dispatch = useDispatch<AppDispatch>();
  const { items: products, loading, error } = useSelector(
    (state: RootState) => state.products,
  );
  const cartCount = useSelector(selectCartCount);
  const [refreshing, setRefreshing] = useState(false);

  // M2: fetchProducts defined before useEffect
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
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={16}
        >
          <Text style={[styles.headerExitText, { color: colors.tint }]}>‹</Text>
        </Pressable>
      ),
    });
  }, [stackNavigation, colors.tint]);

  const handleSelectProduct = useCallback((product: Product) => {
    navigation.navigate('SelectProduct', { product });
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : error && products.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Pressable
            onPress={fetchProducts}
            style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}
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
          style={({ pressed }) => [styles.cartBar, pressed && { opacity: 0.7 }]}
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

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    heading: {
      fontSize: theme.typography.h2.fontSize,
      fontWeight: theme.typography.h2.fontWeight,
      color: theme.colors.text,
      paddingHorizontal: theme.spacing.base,
      paddingTop: theme.spacing.base,
      paddingBottom: theme.spacing.sm,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: theme.spacing.md,
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textSecondary,
    },
    errorText: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.error,
      marginBottom: theme.spacing.md,
    },
    retryButton: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.sm,
    },
    retryText: {
      color: theme.colors.textOnPrimary,
      fontWeight: '600',
      fontSize: theme.typography.body.fontSize,
    },
    list: {
      paddingBottom: 80,
    },
    emptyText: {
      textAlign: 'center',
      marginTop: theme.spacing.xl,
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textPlaceholder,
    },
    headerExitButton: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      marginLeft: Platform.OS === 'android' ? -4 : -8,
    },
    headerExitText: {
      fontSize: 28,
      lineHeight: 32,
      fontWeight: '300',
    },
    cartBar: {
      position: 'absolute',
      bottom: theme.spacing.base,
      left: theme.spacing.base,
      right: theme.spacing.base,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      padding: theme.spacing.base,
      alignItems: 'center',
      ...theme.shadows.md,
    },
    cartBarText: {
      color: theme.colors.textOnPrimary,
      fontSize: theme.typography.bodyBold.fontSize,
      fontWeight: theme.typography.bodyBold.fontWeight,
    },
  });
