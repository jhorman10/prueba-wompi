import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Product } from '../store/slices/productsSlice';
import { PriceTag } from './PriceTag';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

/**
 * Card displaying product image, name, description, and price.
 * Tapping triggers onSelect.
 */
export function ProductCard({ product, onSelect }: ProductCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
      onPress={() => onSelect(product)}
    >
      {product.imageUrl ? (
        <Image
          source={{ uri: product.imageUrl }}
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

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#999',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  outOfStock: {
    fontSize: 12,
    color: '#e53935',
    fontWeight: '600',
    marginTop: 4,
  },
});
