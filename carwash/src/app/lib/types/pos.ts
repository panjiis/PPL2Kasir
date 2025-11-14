export interface PosProduct {
  product_code: string;
  product_name: string;
  product_type?: string;
  product_type_id?: number;
  product_group_id?: number; // <--- TAMBAHKAN BARIS INI
  supplier_id?: number;
  unit_of_measure?: string;
  reorder_level?: number;
  max_stock_level?: number;
  cost_price?: string | number | undefined;
  is_active?: boolean;
  created_at?: string;
  image_url?: string;
  color?: string;
  price?: number;
  product_price?: number | string;
  updated_at?: string;
  commision_eligible?: boolean;
  requires_service_employee?: boolean;
  product_group_code?: string;
  product_group_name?: string;
  available_quantity?: number;
}

export interface ProductGroup {
  id?: number;
  product_group_code?: string;
  product_group_name?: string;
  product_group_id?: number;
  desc?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductType {
  id?: number;
  product_type_code?: string;
  product_type_name?: string;
  desc?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Cart {
  cart_id: string;
  cashier_id: number;
  items: CartItem[];
  discounts?: Discount[];
}

export interface CartItem {
  cart_id: string;
  product_code: string;
  quantity: number;
  serving_employee_id?: number;
  name?: string;
  price?: number;
  total_price?: number;
}

export interface Discount {
  discount_id: number;
  item_ids: string[];
  name?: string;
  percentage?: number;
  amount?: number;
}

export interface DiscountPayload {
  cart_id: string;
  discount_id: number;
  item_ids: string[];
}

export interface PosOrder {
  id: number;
  document_number: string;
  cashier_id: number;
  document_type: number;
  order_items: CartItem[];
  subtotal?: number;
  total_amount?: number;
  payment_type_id?: number;
  additional_info?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DetailedPosOrder {
  id: number;
  document_number: string | number;
  orders_date?: { seconds: number };
  subtotal: number;
  total_amount: number;
  payment_type?: {
    id?: number;
    payment_name: string;
  };
  order_items: DetailedCartItem[];
  notes?: string;
  additional_info?: string;
  // --- PERBAIKAN: Tambahkan field ini dari API ---
  tax_amount?: string | number;
  discount_amount?: string | number;
  // --- AKHIR PERBAIKAN ---
}

export interface DetailedCartItem {
  id: number;
  quantity: number;
  line_total: string;
  product?: { product_name: string };
  product_code?: string;
  product_name: string;
  qty: number;
  price: number;
  total_price: number;
}

export interface PaymentType {
  id?: number;
  payment_name: string;
  processing_fee_rate: string;
  is_active: boolean;
}

export interface Payment {
  order_id: number;
  paid_amount: string;
  payment_type_id: number;
  reference_number: string;
}

export interface ValidateDiscountPayload {
  discount_id: number;
  product_code: string;
  quantity: number;
}

// +++ PERBAIKAN: TAMBAHKAN TIPE BARU DI BAWAH INI +++

/**
 * Mewakili objek 'product' yang ada di dalam ApiSyncedCartItem.
 * Berdasarkan log JSON respons API.
 */
export interface ApiSyncedCartProduct {
  product_code: string;
  product_name: string;
  product_price: string; // API mengirim harga sebagai string
  cost_price?: string;
  is_active?: boolean;
  // created_at dan updated_at bisa ditambahkan jika perlu
}

/**
 * Mewakili satu item di dalam array 'items' yang dikembalikan oleh
 * endpoint API /pos/carts/discounts. Berdasarkan log JSON.
 */
export interface ApiSyncedCartItem {
  item_id: string; // ID unik untuk baris item di keranjang (cth: "157")
  product_code: string; // Kode produk (cth: "DRINK-0003")
  quantity: number;
  unit_price: string; // Harga per unit (cth: "10000")
  discount_amount: string; // Jumlah diskon (cth: "0.00")
  line_total: string; // Total baris (cth: "10000.00")
  product: ApiSyncedCartProduct; // Objek produk yang di-nest
  discount?: unknown; // Objek diskon opsional, 'unknown' lebih aman dari 'any'
  serving_employee_id?: number; // <--- TAMBAHKAN BARIS INI
}

export interface Employee {
  id: number;
  employee_name: string;
  base_salary?: string;
  commission_rate?: string;
  commission_type?: number;
}

export interface ApiCartResponse {
  cart_id: string;
  cashier_id: number;
  items: ApiSyncedCartItem[]; // <-- Kuncinya di sini
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  created_at?: unknown;
  updated_at?: unknown;
}


export interface StockItem {
  product_code: string;
  warehouse_id: number;
  available_quantity: number;
  reserved_quantity?: number;
  unit_cost?: string;
  product?: {
    product_code: string;
    product_name: string;
  };
  warehouse?: {
    id: number;
    warehouse_name: string;
  };
}