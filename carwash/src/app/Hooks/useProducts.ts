'use client';

import { useState, useEffect } from 'react';
import { useToken } from '../lib/context/session';

export interface Product {
  id: string;
  itemId?: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  category?: string;
  barcode?: string;
  type: 'product' | 'service';
  stock?: number;
}

interface ProductsResponse {
  success: boolean;
  data: Product[];
  message?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://api.interphaselabs.com/api/v1';

export function useProducts() {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = useToken();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/inventory/products`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const result: ProductsResponse = await response.json();

        // Transform API data to match our Product interface
        const products: Product[] = result.data.map(
          (item: any): Product => ({
            id: item.id || item.product_id,
            itemId: item.item_id || item.code,
            name: item.name || item.product_name,
            description: item.description,
            price: item.price || 0,
            image: item.image || item.image_url,
            category: item.category || item.product_type,
            barcode: item.barcode,
            type:
              item.type === 'service'
                ? ('service' as const)
                : ('product' as const),
            stock: item.stock || item.quantity,
          })
        );

        setData(products);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [token]);

  return { data, loading, error };
}
