import type {
  PosProduct,
  ProductGroup,
  Cart,
  CartItem,
  Discount,
  PosOrder,
  PaymentType,
  Payment,
  ValidateDiscountPayload,
  DetailedPosOrder,
  DetailedCartItem,
} from '../types/pos';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://api.interphaselabs.com/api/v1';

// Products
export async function fetchProducts(
  token: string
): Promise<{ data: PosProduct[] }> {
  const res = await fetch(`${BASE_URL}/pos/products`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // if (!res.ok) {
  //   throw new Error(`Failed to fetch products: ${res.statusText}`);
  // }

  const json = await res.json();

  if (!Array.isArray(json.data)) {
    return { data: [] };
  }

  const normalizedData: PosProduct[] = json.data.map((p: unknown): PosProduct => {
    if (isValidProduct(p)) {
      const price =
        typeof p.price === 'number'
          ? p.price
          : Number(
              typeof p.product_price === 'string' || typeof p.product_price === 'number'
                ? p.product_price
                : 0
            );

      return {
        id: p.id,
        product_code: p.product_code,
        product_name: p.product_name,
        price,
        cost_price: p.cost_price,
        is_active: p.is_active,
      };
    }

    // fallback aman
    return {
      product_code: 'UNKNOWN',
      product_name: 'Unknown Product',
      price: 0,
      cost_price: '0',
      is_active: false,
    };
  });

  return { data: normalizedData };
}

function isValidProduct(p: unknown): p is {
  id?: number;
  product_code: string;
  product_name: string;
  product_price?: string | number;
  price?: number;
  cost_price?: string | number;
  is_active?: boolean;
} {
  return (
    typeof p === 'object' &&
    p !== null &&
    'product_code' in p &&
    'product_name' in p
  );
}

export async function fetchProductByCode(
  code: string,
  token: string
): Promise<{ data: PosProduct }> {
  const res = await fetch(`${BASE_URL}/pos/products/code/${code}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
export async function fetchProductGroups(
  token: string
): Promise<{ data: ProductGroup[] }> {
  const res = await fetch(`${BASE_URL}/pos/product-groups`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
export async function createProduct(
  body: PosProduct,
  token: string
): Promise<{ data: PosProduct }> {
  const res = await fetch(`${BASE_URL}/pos/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Carts
export async function createCart(
  body: { cashier_id: number },
  token: string
): Promise<{ data: Cart }> {
  const res = await fetch(`${BASE_URL}/pos/carts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
export async function fetchCartById(
  id: string,
  token: string
): Promise<{ data: Cart }> {
  const res = await fetch(`${BASE_URL}/pos/carts/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
export async function addItemToCart(
  body: CartItem,
  token: string
): Promise<{ data: CartItem }> {
  const res = await fetch(`${BASE_URL}/pos/carts/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
export async function removeItemFromCart(
  cart_id: string,
  item_id: string,
  token: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/pos/carts/${cart_id}/items/${item_id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
export async function applyDiscount(
  body: Discount,
  token: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/pos/carts/discounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Orders
export async function createOrder(
  body: PosOrder,
  token: string
): Promise<{ data: PosOrder }> {
  const res = await fetch(`${BASE_URL}/pos/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function fetchOrders(
  token: string
): Promise<{ data: DetailedPosOrder[] }> {
  const res = await fetch(`${BASE_URL}/pos/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch orders: ${res.statusText}`);
  }

  const json = await res.json();

  // pastikan data array
  const orders = Array.isArray(json.data) ? (json.data as PosOrder[]) : [];

  const mappedData: DetailedPosOrder[] = orders.map((order) => {
    // mapping item dengan tipe aman
    const items: DetailedCartItem[] = (order.order_items ?? []).map(
      (item: CartItem): DetailedCartItem => {
        const qty = Number(item.quantity ?? 0);
        const price = Number(item.price ?? 0);
        const total = qty * price;

        return {
          id: item.product_id,
          quantity: qty,
          line_total: total.toFixed(0),
          product: { product_name: item.name ?? 'Unknown' },
          product_id: item.product_id,
          product_name: item.name ?? 'Unknown',
          qty,
          price,
          total_price: total,
        };
      }
    );

    // ambil langsung dari API (bukan hitung manual)
    const subtotal = Number(
      (order as unknown as { subtotal?: number }).subtotal ?? 0
    );
    const total_amount = Number(
      (order as unknown as { total_amount?: number }).total_amount ?? subtotal
    );

    // payment type dari API (bisa id -> name)
    const paymentTypeId = (order as unknown as { payment_type_id?: number })
      .payment_type_id;
    const paymentTypeName =
      typeof paymentTypeId === 'number'
        ? getPaymentTypeName(paymentTypeId)
        : 'Cash';

    return {
      id: order.id,
      document_number: order.document_number,
      orders_date: (order as unknown as { orders_date?: { seconds: number } })
        .orders_date ?? { seconds: Date.now() / 1000 },
      subtotal,
      total_amount,
      payment_type: { id: paymentTypeId, payment_name: paymentTypeName },
      order_items: items,
      notes: order.notes,
      additional_info: order.additional_info,
    };
  });

  return { data: mappedData };
}

function getPaymentTypeName(id?: number): string {
  const paymentTypes: Record<number, string> = {
    1: 'Cash',
    2: 'QRIS',
    3: 'Credit Card',
    4: 'Transfer Bank',
  };
  return paymentTypes[id ?? 0] ?? 'N/A';
}

export async function createOrderFromCart(
  body: {
    cart_id: string;
    document_number: string;
    additional_info?: string;
    notes?: string;
  },
  token: string
): Promise<{ data: PosOrder }> {
  const res = await fetch(`${BASE_URL}/pos/orders/from-cart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function fetchOrderById(
  id: string,
  token: string
): Promise<{ data: PosOrder }> {
  const res = await fetch(`${BASE_URL}/pos/orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
export async function voidOrder(
  body: { id: number; voided_by: number; reason: string },
  token: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/pos/orders/void`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
export async function returnOrder(
  body: {
    original_order_id: number;
    item_ids: number[];
    processed_by: number;
    reason: string;
  },
  token: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/pos/orders/return`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Payments
export async function createPaymentType(
  body: PaymentType,
  token: string
): Promise<{ data: PaymentType }> {
  const res = await fetch(`${BASE_URL}/pos/payment-types`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
export async function fetchPaymentTypes(
  token: string
): Promise<{ data: PaymentType[] }> {
  const res = await fetch(`${BASE_URL}/pos/payment-types`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
export async function editPaymentType(
  id: string,
  body: PaymentType,
  token: string
): Promise<{ data: PaymentType }> {
  const res = await fetch(`${BASE_URL}/pos/payment-types/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
export async function processPayment(
  body: Payment,
  token: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/pos/payments/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
export async function fetchDiscounts(
  token: string
): Promise<{ data: Discount[] }> {
  const res = await fetch(`${BASE_URL}/pos/discounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
export async function validateDiscount(
  body: ValidateDiscountPayload,
  token: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/pos/discounts/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
