// lib/utils/pos-api.ts
import type {
  PosProduct,
  ProductGroup,
  ProductType,
  Cart,
  CartItem,
  Discount,
  PosOrder,
  PaymentType,
  Payment,
  ValidateDiscountPayload,
  DetailedPosOrder,
  DiscountPayload,
} from '../types/pos';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://api.interphaselabs.com/api/v1';

// only include Authorization header when token is truthy
const defaultHeaders = (token?: string) => {
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) base.Authorization = `Bearer ${token}`;
  return base;
};

async function safeReadText(res: Response) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

// ==================== PRODUCTS ====================

export async function fetchProducts(
  token?: string
): Promise<{ data: PosProduct[] }> {
  // Mencoba endpoint list yang umum terlebih dahulu, lalu fallback ke endpoint code
  const endpoints = ['/pos/products', '/pos/products/code'];

  for (const path of endpoints) {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      headers: defaultHeaders(token),
    });

    // try next endpoint if not found
    if (res.status === 404) continue;

    // if bad request or other client/server error, read body for message and throw
    if (!res.ok) {
      const text = await safeReadText(res);
      throw new Error(
        `Failed to fetch products from ${url}. Status ${res.status}. Body: ${text}`
      );
    }

    const body = await res.json().catch(() => null);

    if (!body) return { data: [] };

    // common shapes (support array langsung, atau di dalam properti 'data')
    if (Array.isArray(body)) return { data: body as PosProduct[] };
    if (Array.isArray(body.data)) return { data: body.data as PosProduct[] };
    // fallback: if wrapper contains data-like property
    for (const key of ['result', 'items', 'rows']) {
      if (Array.isArray(body[key])) return { data: body[key] as PosProduct[] };
    }

    // unknown but successful: return empty array instead of throwing
    return { data: [] };
  }

  throw new Error(
    'Failed to fetch products from API (tried /pos/products/code and /pos/products).'
  );
}

export async function fetchProductById(
  id: number,
  token?: string
): Promise<{ data: PosProduct }> {
  const res = await fetch(`${BASE_URL}/pos/products/${id}`, {
    headers: defaultHeaders(token),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function fetchProductByCode(
  code: string,
  token?: string
): Promise<{ data: PosProduct }> {
  const res = await fetch(`${BASE_URL}/pos/products/code/${code}`, {
    headers: defaultHeaders(token),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function createProduct(
  body: PosProduct,
  token?: string
): Promise<{ data: PosProduct }> {
  const res = await fetch(`${BASE_URL}/pos/products`, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function fetchProductGroups(
  token?: string
): Promise<{ data: ProductGroup[] }> {
  const res = await fetch(`${BASE_URL}/pos/product-groups`, {
    headers: defaultHeaders(token),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function fetchProductTypes(
  token?: string
): Promise<{ data: ProductType[] }> {
  const res = await fetch(`${BASE_URL}/pos/product-types`, {
    headers: defaultHeaders(token),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

// ==================== CARTS ====================
export async function createCart(
  body: { cashier_id: number },
  token?: string
): Promise<{ data: Cart }> {
  const res = await fetch(`${BASE_URL}/pos/carts`, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function fetchCartById(
  id: string,
  token?: string
): Promise<{ data: Cart }> {
  const res = await fetch(`${BASE_URL}/pos/carts/${id}`, {
    headers: defaultHeaders(token),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function addItemToCart(
  body: CartItem,
  token?: string
): Promise<{ data: CartItem }> {
  const res = await fetch(`${BASE_URL}/pos/carts/items`, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function removeItemFromCart(
  cart_id: string,
  item_id: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/pos/carts/${cart_id}/items/${item_id}`, {
    method: 'DELETE',
    headers: defaultHeaders(token),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function applyDiscount(
  body: DiscountPayload,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/pos/carts/discounts`, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

// ** BARU: DELETE CART **
export async function deleteCart(
  cart_id: string,
  token?: string
): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${BASE_URL}/pos/carts/${cart_id}`, {
    method: 'DELETE',
    headers: defaultHeaders(token),
  });
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(`Failed to delete cart ${cart_id}. Status ${res.status}. Body: ${text}`);
  }
  // Handle case where API might return an empty body on successful delete
  return res.json().catch(() => ({ success: true, message: `Cart ${cart_id} deleted` }));
}

// ==================== ORDERS ====================
export async function createOrder(
  body: PosOrder,
  token?: string
): Promise<{ data: PosOrder }> {
  const res = await fetch(`${BASE_URL}/pos/orders`, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function createOrderFromCart(
  body: {
    cart_id: string;
    document_number: string;
    additional_info?: string;
    notes?: string;
  },
  token?: string
): Promise<{ data: PosOrder }> {
  const res = await fetch(`${BASE_URL}/pos/orders/from-cart`, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function fetchOrders(
  token?: string
): Promise<{ data: DetailedPosOrder[] }> {
  const res = await fetch(`${BASE_URL}/pos/orders`, {
    headers: defaultHeaders(token),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function fetchOrderById(
  id: string,
  token?: string
): Promise<{ data: PosOrder }> {
  const res = await fetch(`${BASE_URL}/pos/orders/${id}`, {
    headers: defaultHeaders(token),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function voidOrder(
  body: { id: number; voided_by: number; reason: string },
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/pos/orders/void`, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function returnOrder(
  body: {
    original_order_id: number;
    item_ids: number[];
    processed_by: number;
    reason: string;
  },
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/pos/orders/return`, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

// ==================== PAYMENTS ====================
export async function createPaymentType(
  body: PaymentType,
  token?: string
): Promise<{ data: PaymentType }> {
  const res = await fetch(`${BASE_URL}/pos/payment-types`, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function fetchPaymentTypes(
  token?: string
): Promise<{ data: PaymentType[] }> {
  const res = await fetch(`${BASE_URL}/pos/payment-types`, {
    headers: defaultHeaders(token),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function updatePaymentType(
  id: string,
  body: PaymentType,
  token?: string
): Promise<{ data: PaymentType }> {
  const res = await fetch(`${BASE_URL}/pos/payment-types/${id}`, {
    method: 'PUT',
    headers: defaultHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function processPayment(
  body: Payment,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/pos/payments/process`, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

// ==================== DISCOUNTS ====================
export async function fetchDiscounts(
  token?: string
): Promise<{ data: Discount[] }> {
  const res = await fetch(`${BASE_URL}/pos/discounts`, {
    headers: defaultHeaders(token),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

export async function validateDiscount(
  body: ValidateDiscountPayload,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/pos/discounts/validate`, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}