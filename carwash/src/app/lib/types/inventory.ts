export type ProductType = "product" | "service"

export type Product = {
  id: string
  itemId: string
  name: string
  image?: string
  price: number
  type: ProductType
  description?: string
  category?: string
  barcode?: string
  stock?: number
  createdAt?: string
  updatedAt?: string
}

export type StockCheck = {
  productId: string
  warehouseId: string
  quantity: number
  available: boolean
}

export type StockMovement = {
  id: string
  productId: string
  warehouseId: string
  type: "in" | "out" | "transfer"
  quantity: number
  reference?: string
  createdAt: string
}

export type Warehouse = {
  id: string
  code: string
  name: string
  address?: string
  isActive: boolean
  createdAt?: string
}

export type Supplier = {
  id: string
  name: string
  contact?: string
  email?: string
  address?: string
  isActive: boolean
  createdAt?: string
}

export type ProductTypeItem = {
  id: string
  name: string
  description?: string
  createdAt?: string
}

export type Stock = {
  id: string
  productId: string
  warehouseId: string
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  updatedAt: string
}
