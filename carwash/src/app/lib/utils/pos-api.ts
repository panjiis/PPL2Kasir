// lib/utils/pos-api.ts
import type {
  PosProduct,
  ProductGroup,
  ProductType,
  Cart,
  Discount,
  PosOrder,
  PaymentType,
  Payment,
  ValidateDiscountPayload,
  DetailedPosOrder,
  DiscountPayload,
  ApiSyncedCartItem,
  ApiCartResponse,
  Employee,
  StockItem,
} from '../types/pos';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://api-syntra.interphaselabs.com/api/v1';

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

// +++ PAYLOAD TYPE BARU (dipindah dari aside-mock) +++
export interface AddItemPayload {
  cart_id: string;
  product_code: string;
  quantity: number;
  serving_employee_id?: number;
}

// ==================== PRODUCTS ====================

export async function fetchProducts(
  token?: string
): Promise<{ data: PosProduct[] }> {
  const url = `${BASE_URL}/pos/products`;
  const res = await fetch(url, {
    headers: defaultHeaders(token),
  });

  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(
      `Failed to fetch products from ${url}. Status ${res.status}. Body: ${text}`
    );
  }

  const body: unknown = await res.json().catch(() => null);

  if (!body) return { data: [] };

  // common shapes (support array langsung, atau di dalam properti 'data')

  let data: PosProduct[] = [];

  // common shapes (support array langsung, atau di dalam properti 'data')
  if (Array.isArray(body)) {
    data = body as PosProduct[];
  } else if (
    typeof body === 'object' &&
    body !== null &&
    'data' in body &&
    Array.isArray(body.data)
  ) {
    data = body.data as PosProduct[];
  } else {
    // fallback: if wrapper contains data-like property
    for (const key of ['result', 'items', 'rows']) {
      if (
        typeof body === 'object' &&
        body !== null &&
        key in body &&
        Array.isArray((body as Record<string, unknown>)[key])
      ) {
        data = (body as Record<string, unknown>)[key] as PosProduct[];
        break;
      }
    }
  }

  const activeProducts = data.filter((p) => p.is_active === true);

  return { data: activeProducts };
}

export async function fetchProductByCode(
  code: string,
  token?: string
): Promise<{ data: PosProduct }> {
  const res = await fetch(`${BASE_URL}/pos/products/${code}`, {
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

export async function updateProduct(
  code: string,
  body: Partial<PosProduct>,
  token?: string
): Promise<{ data: PosProduct }> {
  const res = await fetch(`${BASE_URL}/pos/products/${code}`, {
    method: 'PUT',
    headers: defaultHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}

// ==================== STOCKS ====================

export async function fetchStocks(
  token?: string
): Promise<{ data: StockItem[] }> {
  const url = `${BASE_URL}/inventory/stocks`;
  const res = await fetch(url, {
    headers: defaultHeaders(token),
  });

  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(
      `Failed to fetch stocks from ${url}. Status ${res.status}. Body: ${text}`
    );
  }

  const body: unknown = await res.json().catch(() => null);

  if (!body) return { data: [] };

  let data: StockItem[] = [];

  // Support { data: [...] }
  if (
    typeof body === 'object' &&
    body !== null &&
    'data' in body &&
    Array.isArray(body.data)
  ) {
    data = body.data as StockItem[];
  }
  // Support [...]
  else if (Array.isArray(body)) {
    data = body as StockItem[];
  }
  // Fallback untuk wrapper umum lainnya
  else {
    for (const key of ['result', 'items', 'rows']) {
      if (
        typeof body === 'object' &&
        body !== null &&
        key in body &&
        Array.isArray((body as Record<string, unknown>)[key])
      ) {
        data = (body as Record<string, unknown>)[key] as StockItem[];
        break;
      }
    }
  }

  return { data: data }; // <-- PERBAIKAN: Menambahkan return statement
}



// ==================== PRODUCT GROUPS & TYPES ====================

export async function fetchProductGroups(
  token?: string
): Promise<{ data: ProductGroup[] }> {
  const res = await fetch(`${BASE_URL}/pos/product-groups`, {
    headers: defaultHeaders(token),
  });
  if (!res.ok) throw new Error(await safeReadText(res));

  // --- PERBAIKAN DIMULAI (Meniru logika fetchProducts) ---
  const body: unknown = await res.json().catch(() => null);

  if (!body) return { data: [] };

  let data: ProductGroup[] = [];

  // Mendukung respons berbentuk array langsung: [...]
  if (Array.isArray(body)) {
    data = body as ProductGroup[];
  }
  // Mendukung respons terbungkus: { data: [...] }
  else if (
    typeof body === 'object' &&
    body !== null &&
    'data' in body &&
    Array.isArray(body.data)
  ) {
    data = body.data as ProductGroup[];
  }
  // Fallback untuk wrapper umum lainnya
  else {
    for (const key of ['result', 'items', 'rows']) {
      if (
        typeof body === 'object' &&
        body !== null &&
        key in body &&
        Array.isArray((body as Record<string, unknown>)[key])
      ) {
        data = (body as Record<string, unknown>)[key] as ProductGroup[];
        break;
      }
    }
    const activeGroups = data.filter((g) => g.is_active === true);

    return { data: activeGroups };
  }

  return { data: data }; // Kembalikan semua grup yang sudah diparsing
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
  body: AddItemPayload, // <-- Tipe payload yang benar
  token?: string
): Promise<{ data: ApiCartResponse }> {
  console.log('Adding item to cart with body:', body);
  const res = await fetch(`${BASE_URL}/pos/carts/items`, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await safeReadText(res));
  return res.json();
}
// --- AKHIR PERBAIKAN ---

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

// +++ PERBAIKAN: GANTI FUNGSI 'applyDiscount' SECARA KESELURUHAN +++
export async function applyDiscount(
  payload: DiscountPayload,
  token: string
): Promise<{
  success: boolean;
  subtotal?: string;
  tax_amount?: string;
  discount_amount?: string;
  total_amount?: string;
  message?: string;
  items?: ApiSyncedCartItem[]; // <-- Tipe yang benar (bukan 'any[]')
}> {
  const res = await fetch(`${BASE_URL}/pos/carts/discounts`, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify(payload),
  });

  // Beri tipe pada data respons untuk menghindari 'any'
  const data: {
    success: boolean;
    message?: string;
    data?: {
      subtotal?: string | number;
      tax_amount?: string | number;
      discount_amount?: string | number;
      total_amount?: string | number;
      items?: ApiSyncedCartItem[]; // <-- Tipe yang benar
    };
  } = await res.json().catch(() => ({ success: false }));

  const d = data?.data ?? {}; // ambil isi dalam "data"

  return {
    success: data.success ?? true,
    subtotal: String(d.subtotal ?? 0),
    tax_amount: String(d.tax_amount ?? 0),
    discount_amount: String(d.discount_amount ?? 0),
    total_amount: String(d.total_amount ?? 0),
    items: d.items, // <-- Kembalikan 'items' yang sudah type-safe
    message: data.message,
  };
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
    throw new Error(
      `Failed to delete cart ${cart_id}. Status ${res.status}. Body: ${text}`
    );
  }
  // Handle case where API might return an empty body on successful delete
  return res
    .json()
    .catch(() => ({ success: true, message: `Cart ${cart_id} deleted` }));
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
  // --- PERBAIKAN TIPE DI BAWAH INI ---
  body: {
    cart_id: string;
    document_number: string;
    additional_info?: string;
    notes?: string;
    subtotal?: number;
    total_amount?: number;
    tax_amount?: number; // <-- TAMBAHKAN INI
    discount_amount?: number; // <-- TAMBAHKAN INI
  },
  // --- AKHIR PERBAIKAN TIPE ---
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
  const url = `${BASE_URL}/pos/orders`;
  console.log('>>> Fetching orders from', url, 'with token', token);
  const res = await fetch(url, {
    headers: defaultHeaders(token),
  });

  const text = await res.text();
  console.log('>>> fetchOrders raw response:', text);

  if (!res.ok)
    throw new Error(
      `Failed to list orders. Status: ${res.status}. Body: ${text}`
    );
  return JSON.parse(text);
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

  // PERBAIKAN: Parsing body dan filtering
  const body: unknown = await res.json().catch(() => null);

  if (!body) return { data: [] };

  let allDiscounts: Discount[] = [];

  // Logic parsing body (mirip fetchProducts)
  if (Array.isArray(body)) {
    allDiscounts = body as Discount[];
  } else if (
    typeof body === 'object' &&
    body !== null &&
    'data' in body &&
    Array.isArray(body.data)
  ) {
    allDiscounts = body.data as Discount[];
  }

  const activeDiscounts = allDiscounts.filter(
    (d) => (d as Discount & { is_active?: boolean }).is_active === true
  );

  return { data: activeDiscounts };
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

// ==================== EMPLOYEES ====================

export async function fetchEmployees(
  token?: string
): Promise<{ data: Employee[] }> {
  const res = await fetch(`${BASE_URL}/employees`, {
    headers: defaultHeaders(token),
  });
  if (!res.ok) throw new Error(await safeReadText(res));

  // Meniru logika fetchProducts untuk parsing body
  const body: unknown = await res.json().catch(() => null);

  if (!body) return { data: [] };

  let data: Employee[] = [];

  if (Array.isArray(body)) {
    data = body as Employee[];
  } else if (
    typeof body === 'object' &&
    body !== null &&
    'data' in body &&
    Array.isArray(body.data)
  ) {
    data = body.data as Employee[];
  } else {
    for (const key of ['result', 'items', 'rows']) {
      if (
        typeof body === 'object' &&
        body !== null &&
        key in body &&
        Array.isArray((body as Record<string, unknown>)[key])
      ) {
        data = (body as Record<string, unknown>)[key] as Employee[];
        break;
      }
    }
  }

  return { data: data };
}