"use client"

import type React from "react"
import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import type { ProductType } from "./dummy"
import type { Coupon } from "./dummy"

export type CartItem = {
  id: string
  itemId: string
  name: string
  image: string
  price: number
  barcode?: string
  type: ProductType
  category: string
  description?: string
  qty: number
  employee?: string
}

export type OrderItem = {
  id: string
  orderNo: string
  createdAt: string
  customer?: string
  items: CartItem[]
  status: "In Queue" | "In Process" | "Waiting Payment" | "Done"
  paymentType: "cash" | "credit" | "qris"
  paymentBank?: string
  total: number
}

type CartContextValue = {
  items: CartItem[]
  selectedItemId: string | null
  adjustMode: boolean
  addItem: (p: CartItem) => void // ✅ FIXED HERE
  selectItem: (id: string | null) => void
  toggleAdjust: () => void
  adjustQuantity: (id: string, delta: number) => void
  deleteSelected: () => void
  setEmployee: (id: string, name: string) => void
  products: CartItem[]
  services: CartItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  formatIDR: (v: number) => string
  paymentSheetOpen: boolean
  setPaymentSheetOpen: (open: boolean) => void
  billOption: string | null
  setBillOption: (opt: string | null) => void
  locked: boolean
  setLocked: (v: boolean) => void
  repeatRound: () => void
  voidOrder: () => void
  appliedCoupon: Coupon | null
  applyCoupon: (c: Coupon) => void
  clearCoupon: () => void
  setItems: React.Dispatch<React.SetStateAction<CartItem[]>>
  setSelectedItemId: React.Dispatch<React.SetStateAction<string | null>>
  setAdjustMode: React.Dispatch<React.SetStateAction<boolean>>
  // Tambahan order logic
  orders: OrderItem[]
  addOrder: (order: OrderItem) => void
  updateOrderStatus: (id: string, status: OrderItem["status"]) => void
}

const CartContext = createContext<CartContextValue | null>(null)

// function safeAddItem(locked: boolean, fn: (p: ProductItem) => void) {
//   return (p: ProductItem) => {
//     fn(p);
//   };
// }

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [adjustMode, setAdjustMode] = useState(false)
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false)
  const [billOption, setBillOption] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  // Tambahan state orders
  const [orders, setOrders] = useState<OrderItem[]>([])

  const addItem = (p: CartItem) => {
    setItems((prev) => {
      const found = prev.find((it) => it.id === p.id)
      if (found) {
        return prev.map((it) => (it.id === p.id ? { ...it, qty: it.qty + 1 } : it))
      }
      return [
        ...prev,
        {
          id: p.id,
          itemId: p.itemId,
          name: p.name,
          image: p.image,
          price: p.price,
          type: p.type,
          category: p.category,
          description: p.description,
          barcode: p.barcode, // ⬅️ tambahkan ini juga
          qty: 1,
        },
      ]
    })
  }

  const selectItem = (id: string | null) => {
    if (locked) return
    setSelectedItemId(id)
    if (!id) setAdjustMode(false)
  }

  const toggleAdjust = () => {
    if (locked || !selectedItemId) return
    setAdjustMode((s) => !s)
  }

  const adjustQuantity = (id: string, delta: number) => {
    if (locked || !adjustMode || selectedItemId !== id) return
    setItems((prev) => {
      const updated = prev.map((it) => (it.id === id ? { ...it, qty: it.qty + delta } : it)).filter((it) => it.qty > 0)
      const stillThere = updated.find((it) => it.id === id)
      if (!stillThere) {
        setSelectedItemId(null)
        setAdjustMode(false)
      }
      return updated
    })
  }

  const deleteSelected = () => {
    if (locked || !selectedItemId) return
    setItems((prev) => prev.filter((it) => it.id !== selectedItemId))
    setSelectedItemId(null)
    setAdjustMode(false)
  }

  const setEmployee = (id: string, name: string) => {
    if (locked) return
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, employee: name } : it)))
  }

  const applyCoupon = (c: Coupon) => setAppliedCoupon(c)
  const clearCoupon = () => setAppliedCoupon(null)

  const products = useMemo(() => items.filter((it) => it.type === "product"), [items])
  const services = useMemo(() => items.filter((it) => it.type === "service"), [items])
  const subtotal = useMemo(() => items.reduce((acc, it) => acc + it.price * it.qty, 0), [items])
  const taxRate = 0.1
  const tax = useMemo(() => Math.round(subtotal * taxRate), [subtotal])

  const eligibleSubtotal = useMemo(() => {
    if (!appliedCoupon) return 0
    const filterType = appliedCoupon.scope === "all" ? null : (appliedCoupon.scope as "product" | "service")
    const baseItems = filterType ? items.filter((it) => it.type === filterType) : items
    return baseItems.reduce((acc, it) => acc + it.price * it.qty, 0)
  }, [items, appliedCoupon])

  const discount = useMemo(() => {
    if (!appliedCoupon) return 0
    let d = 0
    if (appliedCoupon.discountType === "percent") {
      d = Math.round((eligibleSubtotal * appliedCoupon.value) / 100)
    } else {
      d = Math.min(appliedCoupon.value, eligibleSubtotal)
    }
    if (appliedCoupon.maxDiscount) d = Math.min(d, appliedCoupon.maxDiscount)
    return d
  }, [appliedCoupon, eligibleSubtotal])

  const total = Math.max(0, subtotal + tax - discount)

  const repeatRound = () => {
    if (locked) return
    setItems((prev) => prev.map((it) => ({ ...it, qty: it.qty + 1 })))
  }

  const voidOrder = () => {
    setItems([])
    setSelectedItemId(null)
    setAdjustMode(false)
    setAppliedCoupon(null)
  }

  const formatIDR = (v: number) => `Rp${v.toLocaleString("id-ID")}`

  // ORDER LOGIC
  const addOrder = (order: OrderItem) => setOrders((prev) => [...prev, order])
  const updateOrderStatus = (id: string, status: OrderItem["status"]) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))

  const value: CartContextValue = {
    items,
    selectedItemId,
    adjustMode,
    addItem,
    selectItem,
    toggleAdjust,
    adjustQuantity,
    deleteSelected,
    setEmployee,
    products,
    services,
    subtotal,
    tax,
    discount,
    total,
    formatIDR,
    paymentSheetOpen,
    setPaymentSheetOpen,
    billOption,
    setBillOption,
    locked,
    setLocked,
    repeatRound,
    voidOrder,
    appliedCoupon,
    applyCoupon,
    clearCoupon,
    setItems,
    setSelectedItemId,
    setAdjustMode,
    // Tambahan order logic
    orders,
    addOrder,
    updateOrderStatus,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
