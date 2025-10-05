"use client";

import { useState, useEffect } from "react";
import { useSession } from "../lib/context/session";

export interface Order {
  id: string;
  orderNo: string;
  customer?: string;
  status: string;
  createdAt: string;
  items: {
    productId: string;
    productName: string;
    qty: number;
    price: number;
  }[];
  total: number;
}

interface OrdersResponseItem {
  id?: string;
  order_id?: string;
  order_no?: string;
  order_number?: string;
  customer_name?: string;
  customer?: string;
  status: string;
  created_at?: string;
  items?: {
    productId: string;
    productName: string;
    qty: number;
    price: number;
  }[];
  total?: number;
}

interface OrdersResponse {
  success: boolean;
  data: OrdersResponseItem[];
  message?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://api.interphaselabs.com/api/v1";

export function useOrders() {
  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = useSession();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }

        const result: OrdersResponse = await response.json();

        const orders: Order[] = result.data.map((item) => ({
          id: item.id || item.order_id || "",
          orderNo:
            item.order_no ||
            item.order_number ||
            (item.id ? `ORD-${item.id}` : "ORD-UNKNOWN"),
          customer: item.customer_name || item.customer || "Unknown",
          status: item.status || "Unknown",
          createdAt: item.created_at || new Date().toISOString(),
          items: item.items || [],
          total: item.total ?? 0,
        }));

        setData(orders);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token]);

  return { data, loading, error };
}
