import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
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
    <TouchableOpacity
      style={styles.card}
      onPress={() => onSelect(product)}
      activeOpacity={0.7}
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
    </TouchableOpacity>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
