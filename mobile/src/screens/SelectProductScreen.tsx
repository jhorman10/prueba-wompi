import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { addItem } from '../store/slices/cartSlice';
import { Product } from '../store/slices/productsSlice';
import { PriceTag } from '../components/PriceTag';
import { useTheme, Theme } from '../theme/ThemeContext';
import { API_BASE_URL } from '../config/api';
import { RootStackParamList } from '../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type SelectProductScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SelectProduct'>;

interface SelectProductScreenProps {
  navigation: SelectProductScreenNavigationProp;
  route: {
    params: {
      product: Product;
    };
  };
}

/**
 * Resolve a relative product image URL to an absolute URL.
 */
function resolveImageUrl(imageUrl: string): string {
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
}

/**
 * Select product screen — choose quantity and add to cart.
 */
export function SelectProductScreen({
  navigation,
  route,
}: SelectProductScreenProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { colors, spacing, radius } = theme;
  const dispatch = useDispatch<AppDispatch>();
  const product = route?.params?.product;

  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textSecondary }}>Product not found</Text>
      </View>
    );
  }

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      dispatch(addItem({ productId: product.id, quantity }));
      navigation.navigate('Checkout');
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.container}>
      {product.imageUrl ? (
        <Image
          source={{ uri: resolveImageUrl(product.imageUrl) }}
          style={styles.image}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}

      <Text style={styles.name}>{product.name}</Text>
      {product.description ? (
        <Text style={styles.description}>{product.description}</Text>
      ) : null}
      <PriceTag cents={product.price} style={styles.price} />

      <View style={styles.quantityRow}>
        <Pressable
          style={({ pressed }) => [styles.qtyButton, pressed && { opacity: 0.7 }]}
          onPress={() => setQuantity(Math.max(1, quantity - 1))}
        >
          <Text style={styles.qtyButtonText}>-</Text>
        </Pressable>
        <Text style={styles.quantity}>{quantity}</Text>
        <Pressable
          style={({ pressed }) => [styles.qtyButton, pressed && { opacity: 0.7 }]}
          onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
        >
          <Text style={styles.qtyButtonText}>+</Text>
        </Pressable>
      </View>

      <Text style={styles.total}>
        Total: ${((product.price * quantity) / 100).toFixed(2)}
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.addButton,
          quantity > product.stock && styles.disabledButton,
          pressed && { opacity: 0.7 },
        ]}
        onPress={handleAddToCart}
        disabled={quantity > product.stock || adding}
      >
        {adding ? (
          <ActivityIndicator color={colors.textOnPrimary} testID="add-to-cart-spinner" />
        ) : (
          <Text style={styles.addButtonText}>Add to Cart</Text>
        )}
      </Pressable>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.base,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    image: {
      width: '100%',
      height: 200,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
    },
    placeholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      color: theme.colors.textPlaceholder,
      fontSize: theme.typography.body.fontSize,
    },
    name: {
      fontSize: theme.typography.h2.fontSize,
      fontWeight: theme.typography.h2.fontWeight,
      color: theme.colors.text,
      marginTop: theme.spacing.base,
    },
    description: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
      lineHeight: theme.typography.body.lineHeight,
    },
    price: {
      fontSize: theme.typography.h3.fontSize,
      marginTop: theme.spacing.md,
    },
    quantityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.xl,
    },
    qtyButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    qtyButtonText: {
      fontSize: 22,
      fontWeight: '600',
      color: theme.colors.text,
    },
    quantity: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: '600',
      marginHorizontal: theme.spacing.xl,
      minWidth: 30,
      textAlign: 'center',
    },
    total: {
      fontSize: theme.typography.bodyBold.fontSize,
      fontWeight: theme.typography.bodyBold.fontWeight,
      textAlign: 'center',
      marginTop: theme.spacing.base,
      color: theme.colors.text,
    },
    addButton: {
      marginTop: theme.spacing.xl,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      padding: theme.spacing.base,
      alignItems: 'center',
    },
    disabledButton: {
      backgroundColor: theme.colors.border,
    },
    addButtonText: {
      color: theme.colors.textOnPrimary,
      fontSize: theme.typography.bodyBold.fontSize,
      fontWeight: theme.typography.bodyBold.fontWeight,
    },
  });
