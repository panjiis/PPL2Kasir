export interface PosProduct {
  product_code: string
  product_name: string
  product_type?: string
  product_type_id?: number
  supplier_id?: number
  unit_of_measure?: string
  reorder_level?: number
  max_stock_level?: number
  cost_price?: string | number | undefined
  is_active?: boolean
  created_at?: string
  price?: number
  product_price?: number | string
  updated_at?: string
}

export interface ProductGroup {
  id?: number
  product_group_code?: string
  product_group_name?: string
  desc?: string
  created_at?: string
  updated_at?: string
}

export interface ProductType {
  id?: number
  product_type_code?: string
  product_type_name?: string
  desc?: string
  created_at?: string
  updated_at?: string
}

export interface Cart {
  id: string
  cashier_id: number
  items: CartItem[]
  discounts?: Discount[]
}

export interface CartItem {
  id: string
  cart_id: string
  product_code: string
  quantity: number
  serving_employee_id?: number
  name?: string
  price?: number
  total_price?: number
}

export interface Discount {
  discount_id: number
  item_ids: string[]
  name?: string
  percentage?: number
  amount?: number
}

export interface DiscountPayload {
  cart_id: string
  discount_id: number
  item_ids: string[]
}

export interface PosOrder {
  id: number
  document_number: string
  cashier_id: number
  document_type: number
  order_items: CartItem[]
  subtotal?: number
  total_amount?: number
  payment_type_id?: number
  additional_info?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface DetailedPosOrder {
  id: number
  document_number: string | number
  orders_date?: { seconds: number }
  subtotal: number
  total_amount: number
  payment_type?: {
    id?: number
    payment_name: string
  }
  order_items: DetailedCartItem[]
  notes?: string
  additional_info?: string
}

export interface DetailedCartItem {
  id: number
  quantity: number
  line_total: string
  product?: { product_name: string }
  product_code?: string
  product_name: string
  qty: number
  price: number
  total_price: number
}

export interface PaymentType {
  id?: number
  payment_name: string
  processing_fee_rate: string
  is_active: boolean
}

export interface Payment {
  order_id: number
  paid_amount: string
  payment_type_id: number
  reference_number: string
}

export interface ValidateDiscountPayload {
  discount_id: number
  product_code: string
  quantity: number
}