import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { addItem } from '../store/slices/cartSlice';
import { Product } from '../store/slices/productsSlice';
import { PriceTag } from '../components/PriceTag';

interface SelectProductScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
  };
  route?: {
    params: {
      product: Product;
    };
  };
}

/**
 * Select product screen — choose quantity and add to cart.
 */
export function SelectProductScreen({
  navigation,
  route,
}: SelectProductScreenProps) {
  const dispatch = useDispatch<AppDispatch>();
  const product = route?.params?.product;

  const [quantity, setQuantity] = useState(1);

  if (!product) {
    return (
      <View style={styles.center}>
        <Text>Product not found</Text>
      </View>
    );
  }

  const handleAddToCart = () => {
    dispatch(addItem({ productId: product.id, quantity }));
    navigation?.navigate('Home');
  };

  return (
    <View style={styles.container}>
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

      <Text style={styles.name}>{product.name}</Text>
      {product.description ? (
        <Text style={styles.description}>{product.description}</Text>
      ) : null}
      <PriceTag cents={product.price} style={styles.price} />

      <View style={styles.quantityRow}>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => setQuantity(Math.max(1, quantity - 1))}
        >
          <Text style={styles.qtyButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.quantity}>{quantity}</Text>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
        >
          <Text style={styles.qtyButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.total}>
        Total: ${((product.price * quantity) / 100).toFixed(2)}
      </Text>

      <TouchableOpacity
        style={[
          styles.addButton,
          quantity > product.stock && styles.disabledButton,
        ]}
        onPress={handleAddToCart}
        disabled={quantity > product.stock}
      >
        <Text style={styles.addButtonText}>Add to Cart</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  price: {
    fontSize: 20,
    marginTop: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  qtyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  quantity: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 24,
    minWidth: 30,
    textAlign: 'center',
  },
  total: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    color: '#1a1a1a',
  },
  addButton: {
    marginTop: 24,
    backgroundColor: '#6200ee',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
