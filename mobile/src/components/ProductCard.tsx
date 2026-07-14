import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Theme } from '../theme/ThemeContext';
import { Product } from '../store/slices/productsSlice';
import { PriceTag } from './PriceTag';
import { API_BASE_URL } from '../config/api';

/**
 * Resolve a relative product image URL to an absolute URL using the API origin.
 * Backend serves images from the same host at /images/<name>.png
 */
function resolveImageUrl(imageUrl: string): string {
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  // Strip /api from the base URL to get the origin
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
}

// cache: 'force-cache' (iOS) keeps the product image cached after first load.
// On Android the prop is a harmless no-op; no external dependency required.

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

/**
 * Card displaying product image, name, description, and price.
 * Tapping triggers onSelect.
 */
export function ProductCard({ product, onSelect }: ProductCardProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      onPress={() => onSelect(product)}
    >
      {product.imageUrl ? (
        <Image
          source={{ uri: resolveImageUrl(product.imageUrl), cache: 'force-cache' }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{product.name}</Text>
        {product.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        ) : null}
        <PriceTag cents={product.price} />
        {product.stock <= 0 && (
          <Text style={styles.outOfStock}>Out of stock</Text>
        )}
      </View>
    </Pressable>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      marginVertical: theme.spacing.sm,
      marginHorizontal: theme.spacing.base,
      ...theme.shadows.sm,
    },
    image: {
      width: 80,
      height: 80,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.skeleton,
    },
    placeholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      fontSize: 12,
      color: theme.colors.textPlaceholder,
    },
    info: {
      flex: 1,
      marginLeft: theme.spacing.md,
      justifyContent: 'center',
    },
    name: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    description: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    outOfStock: {
      fontSize: 12,
      color: theme.colors.error,
      fontWeight: '600',
      marginTop: theme.spacing.xs,
    },
  });
