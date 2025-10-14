'use client';

import { useState, useEffect } from 'react';
import { useSession } from '../lib/context/session';

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

interface APIProduct {
  id?: string;
  product_code?: string;
  item_id?: string;
  code?: string;
  name?: string;
  product_name?: string;
  description?: string;
  price?: number;
  image?: string;
  image_url?: string;
  category?: string;
  product_type?: string;
  barcode?: string;
  type?: string;
  stock?: number;
  quantity?: number;
}

interface ProductsResponse {
  success: boolean;
  data: APIProduct[];
  message?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://api.interphaselabs.com/api/v1';

export function useProducts() {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = useSession();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Update endpoint ke POS Service
        const response = await fetch(`${API_BASE_URL}/pos/products`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const result: ProductsResponse = await response.json();

        const products: Product[] = result.data.map(
          (item: APIProduct): Product => ({
            id: item.id || item.product_code || '',
            itemId: item.item_id || item.code || item.product_code,
            name: item.name || item.product_name || 'Unnamed Product',
            description: item.description,
            price: item.price ?? 0,
            image: item.image || item.image_url,
            category: item.category || item.product_type,
            barcode: item.barcode,
            type: item.type === 'service' ? 'service' : 'product',
            stock: item.stock ?? item.quantity ?? 0,
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