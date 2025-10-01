export type ProductType = "product" | "service"
export type ProductCategory = "Food" | "Drinks" | "Car Care" | "Cleaning" | "Accessories"

export type ProductItem = {
  id: string // id unik
  itemId: string // item id yang ditampilkan/diinput user
  barcode: string // nomor barcode (string numerik)
  name: string
  image: string
  price: number
  type: ProductType
  category: ProductCategory // kategori untuk tile
  description?: string
}

export const productData: ProductItem[] = [
  {
    id: "1",
    itemId: "ITM-0001",
    barcode: "899001000001",
    name: "Burger Classic",
    image: "/placeholder.svg?height=140&width=240",
    price: 35000,
    type: "product",
    category: "Food",
    description: "Burger dengan daging sapi pilihan dan saus spesial.",
  },
  {
    id: "2",
    itemId: "ITM-0002",
    barcode: "899001000002",
    name: "Iced Tea",
    image: "/placeholder.svg?height=140&width=240",
    price: 12000,
    type: "product",
    category: "Drinks",
    description: "Teh dingin segar dengan sedikit lemon.",
  },
  {
    id: "3",
    itemId: "ITM-1001",
    barcode: "899009991001",
    name: "Exterior Car Wash",
    image: "/placeholder.svg?height=140&width=240",
    price: 45000,
    type: "service",
    category: "Cleaning",
    description: "Cuci eksterior mobil bersih menyeluruh.",
  },
  {
    id: "4",
    itemId: "ITM-1002",
    barcode: "899009991002",
    name: "Interior Vacuum",
    image: "/placeholder.svg?height=140&width=240",
    price: 30000,
    type: "service",
    category: "Cleaning",
    description: "Vakum interior untuk kabin mobil.",
  },
  {
    id: "5",
    itemId: "ITM-2001",
    barcode: "899003332001",
    name: "Engine Degreaser",
    image: "/placeholder.svg?height=140&width=240",
    price: 65000,
    type: "product",
    category: "Car Care",
    description: "Pembersih mesin untuk minyak dan kotoran.",
  },
  {
    id: "6",
    itemId: "ITM-2002",
    barcode: "899003332002",
    name: "Tire Shine",
    image: "/placeholder.svg?height=140&width=240",
    price: 40000,
    type: "product",
    category: "Car Care",
    description: "Produk untuk membuat ban tampak mengkilap.",
  },
  {
    id: "7",
    itemId: "ITM-3001",
    barcode: "899005552001",
    name: "Keychain Leather",
    image: "/placeholder.svg?height=140&width=240",
    price: 25000,
    type: "product",
    category: "Accessories",
    description: "Gantungan kunci kulit elegan.",
  },
  {
    id: "8",
    itemId: "ITM-3002",
    barcode: "899005552002",
    name: "Phone Holder",
    image: "/placeholder.svg?height=140&width=240",
    price: 55000,
    type: "product",
    category: "Accessories",
    description: "Holder HP universal untuk mobil.",
  },
]

export type OrderStatus = "In Queue" | "In Process" | "Waiting Payment"

export type OrderItem = {
  productName: string
  qty: number
  price: number
}

export type Order = {
  id: string
  orderNo: string
  status: OrderStatus
  customer?: string
  items: OrderItem[]
  createdAt: string
}

export const ordersData: Order[] = [
  {
    id: "o-1001",
    orderNo: "Q-1001",
    status: "In Queue",
    customer: "Budi",
    createdAt: "2025-09-28 10:05",
    items: [
      { productName: "Burger Classic", qty: 1, price: 35000 },
      { productName: "Iced Tea", qty: 2, price: 12000 },
    ],
  },
  {
    id: "o-1002",
    orderNo: "Q-1002",
    status: "In Queue",
    customer: "Sari",
    createdAt: "2025-09-28 10:12",
    items: [{ productName: "Exterior Car Wash", qty: 1, price: 45000 }],
  },
  {
    id: "o-2001",
    orderNo: "P-2001",
    status: "In Process",
    customer: "Andi",
    createdAt: "2025-09-28 10:25",
    items: [
      { productName: "Engine Degreaser", qty: 1, price: 65000 },
      { productName: "Tire Shine", qty: 1, price: 40000 },
    ],
  },
  {
    id: "o-3001",
    orderNo: "W-3001",
    status: "Waiting Payment",
    customer: "Rina",
    createdAt: "2025-09-28 10:40",
    items: [{ productName: "Phone Holder", qty: 1, price: 55000 }],
  },
]

export const employees: string[] = ["Andi", "Budi", "Sari", "Rina", "Dewi", "Joko"]

export type CouponScope = "all" | "product" | "service"
export type CouponDiscountType = "percent" | "amount"

export type Coupon = {
  id: string
  code: string
  label: string
  scope: CouponScope // cakupan diskon
  discountType: CouponDiscountType // persen atau nominal
  value: number // jika percent: 0-100, jika amount: nominal rupiah
  maxDiscount?: number // opsional: batas maksimum potongan
  // bisa dikembangkan: productIds, categories, minimalBelanja, dsb.
}

export const couponsData: Coupon[] = [
  {
    id: "c-all-10",
    code: "ALL10",
    label: "Diskon 10% Semua Item",
    scope: "all",
    discountType: "percent",
    value: 10,
    maxDiscount: 50000,
  },
  {
    id: "c-prod-20k",
    code: "PROD20K",
    label: "Potongan Rp20.000 untuk Produk",
    scope: "product",
    discountType: "amount",
    value: 20000,
  },
  {
    id: "c-serv-15",
    code: "SERV15",
    label: "Diskon 15% untuk Service",
    scope: "service",
    discountType: "percent",
    value: 15,
    maxDiscount: 40000,
  },
  {
    id: "c-all-30k",
    code: "ALL30K",
    label: "Potongan Rp30.000 Semua Item",
    scope: "all",
    discountType: "amount",
    value: 30000,
  },
]
