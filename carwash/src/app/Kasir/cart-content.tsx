'use client';

import type React from 'react';
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  useCallback,
} from 'react';
import type { ProductType } from './dummy';
import type { Coupon } from './dummy';
import { useSession } from '../lib/context/session';
import { useNotification } from './notification-context';
import {
  createCart,
  addItemToCart,
  type AddItemPayload,
} from '../lib/utils/pos-api';
import type { ApiSyncedCartItem } from '../lib/types/pos';

export type ApiCartSyncData = {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  items: ApiSyncedCartItem[]; // <-- GUNAKAN TIPE DARI LANGKAH 1
};

export type CartItem = {
  id: string;
  itemId: string;
  name: string;
  image: string;
  price: number;
  barcode?: string;
  type: ProductType;
  category: string;
  description?: string;
  qty: number;
  employee?: string;
};

export type OrderItem = {
  id: string;
  orderNo: string;
  createdAt: string;
  customer?: string;
  items: CartItem[];
  status: 'In Queue' | 'In Process' | 'Waiting Payment' | 'Done';
  paymentType: 'cash' | 'credit' | 'qris';
  paymentBank?: string;
  total: number;
};

// Tipe baru untuk data finansial dari API
type ApiFinancials = {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
};

type CartContextValue = {
  items: CartItem[];
  selectedItemId: string | null;
  adjustMode: boolean;
  cartId: string | null;
  addItem: (p: CartItem) => Promise<void>;
  selectItem: (id: string | null) => void;
  toggleAdjust: () => void;
  adjustQuantity: (id: string, delta: number) => void;
  deleteSelected: () => void;
  setEmployee: (id: string, name: string) => void;
  products: CartItem[];
  services: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  formatIDR: (v: number) => string;
  paymentSheetOpen: boolean;
  setPaymentSheetOpen: (open: boolean) => void;
  billOption: string | null;
  setBillOption: (opt: string | null) => void;
  locked: boolean;
  setLocked: (v: boolean) => void;
  repeatRound: () => void;
  voidOrder: () => void;
  clearCartState: () => void;
  appliedCoupon: Coupon | null;
  applyCoupon: (c: Coupon, syncData: ApiCartSyncData) => void;
  clearCoupon: () => void;
  setItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setSelectedItemId: React.Dispatch<React.SetStateAction<string | null>>;
  setAdjustMode: React.Dispatch<React.SetStateAction<boolean>>;
  orders: OrderItem[];
  addOrder: (order: OrderItem) => void;
  updateOrderStatus: (id: string, status: OrderItem['status']) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [adjustMode, setAdjustMode] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [billOption, setBillOption] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);

  // State untuk menyimpan SEMUA nilai dari API
  const [apiSubtotal, setApiSubtotal] = useState<number | null>(null);
  const [apiTax, setApiTax] = useState<number | null>(null);
  const [apiDiscount, setApiDiscount] = useState<number | null>(null);
  const [apiTotal, setApiTotal] = useState<number | null>(null);

  const [cartId, setCartId] = useState<string | null>(null);
  const { session } = useSession();
  const { showNotif } = useNotification();

  // clearCartState me-reset semua state API
  const clearCartState = useCallback(() => {
    setItems([]);
    setSelectedItemId(null);
    setAdjustMode(false);
    setPaymentSheetOpen(false);
    setLocked(false);
    setAppliedCoupon(null);
    // Reset semua nilai API
    setApiSubtotal(null);
    setApiTax(null);
    setApiDiscount(null);
    setApiTotal(null);
    setCartId(null);
  }, []);

  const resetApiFinancials = () => {
    setApiSubtotal(null);
    setApiTax(null);
    setApiDiscount(null);
    setApiTotal(null);
    setAppliedCoupon(null);
  };

  const addItem = useCallback(
    async (p: CartItem) => {
      if (locked) return;

      // Saat item ditambah/diubah, perhitungan API lama tidak valid lagi
      resetApiFinancials();

      const token = session?.token;
      if (!token) {
        showNotif({ type: 'error', message: 'Anda harus login' });
        return;
      }

      let currentCartId = cartId;

      if (!currentCartId) {
        try {
          const { data } = await createCart({ cashier_id: 1 }, token);
          currentCartId = String(data.cart_id);
          setCartId(currentCartId);
          localStorage.setItem('last_cart_id', currentCartId);
        } catch (e) {
          console.error(e);
          showNotif({ type: 'error', message: 'Gagal membuat keranjang' });
          return;
        }
      }

      const found = items.find((it) => it.id === p.id);
      const newQty = found ? found.qty + 1 : 1;
      const productCode = p.itemId ?? p.id;

      const payload: AddItemPayload = {
        cart_id: currentCartId,
        product_code: productCode,
        quantity: newQty,
      };

      try {
        await addItemToCart(payload, token);
      } catch (e) {
        console.error(e);
        showNotif({
          type: 'error',
          message: `Gagal menambah ${p.name} ke keranjang`,
        });
        return;
      }

      setItems((prev) => {
        if (found) {
          return prev.map((it) =>
            it.id === p.id ? { ...it, qty: it.qty + 1 } : it
          );
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
            barcode: p.barcode,
            qty: 1,
          },
        ];
      });
    },
    [cartId, items, locked, session?.token, showNotif]
  );

  const selectItem = (id: string | null) => {
    if (locked) return;
    setSelectedItemId(id);
    if (!id) setAdjustMode(false);
  };

  const toggleAdjust = () => {
    if (locked || !selectedItemId) return;
    setAdjustMode((s) => !s);
  };

  const adjustQuantity = (id: string, delta: number) => {
    if (locked || !adjustMode || selectedItemId !== id) return;

    // Saat kuantitas diubah, perhitungan API lama tidak valid
    resetApiFinancials();

    setItems((prev) => {
      const updated = prev
        .map((it) => (it.id === id ? { ...it, qty: it.qty + delta } : it))
        .filter((it) => it.qty > 0);
      const stillThere = updated.find((it) => it.id === id);
      if (!stillThere) {
        setSelectedItemId(null);
        setAdjustMode(false);
      }
      return updated;
    });
  };

  const deleteSelected = () => {
    if (locked || !selectedItemId) return;

    // Saat item dihapus, perhitungan API lama tidak valid
    resetApiFinancials();

    setItems((prev) => prev.filter((it) => it.id !== selectedItemId));
    setSelectedItemId(null);
    setAdjustMode(false);
  };

  const setEmployee = (id: string, name: string) => {
    if (locked) return;
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, employee: name } : it))
    );
  };

  const applyCoupon = (c: Coupon, financials: ApiFinancials) => {
    setAppliedCoupon(c);
    // Simpan semua nilai pasti dari API
    setApiSubtotal(financials.subtotal);
    setApiTax(financials.tax);
    setApiDiscount(financials.discount);
    setApiTotal(financials.total);
  };

  const clearCoupon = () => {
    // Reset semua nilai API
    resetApiFinancials();
  };

  const products = useMemo(
    () => items.filter((it) => it.type === 'product'),
    [items]
  );
  const services = useMemo(
    () => items.filter((it) => it.type === 'service'),
    [items]
  );

  // --- Logika Kalkulasi ---

  // 1. Hitung subtotal lokal (selalu dihitung)
  const localSubtotal = useMemo(
    () => items.reduce((acc, it) => acc + it.price * it.qty, 0),
    [items]
  );
  // 2. Hitung pajak lokal (selalu dihitung)
  const taxRate = 0.1;
  const localTax = useMemo(
    () => Math.round(localSubtotal * taxRate),
    [localSubtotal]
  );

  // 3. Tentukan nilai yang akan ditampilkan
  // Jika apiSubtotal ada (setelah panggil API), gunakan itu. Jika tidak (masih null), gunakan perhitungan lokal.
  const subtotal = apiSubtotal !== null ? apiSubtotal : localSubtotal;
  const tax = apiTax !== null ? apiTax : localTax;
  // Jika tidak ada diskon API, diskon adalah 0
  const discount = apiDiscount !== null ? apiDiscount : 0;

  // +++ PERBAIKAN LOGIKA TOTAL +++
  // Jika apiTotal ada (dari API diskon), gunakan itu.
  // Jika tidak, hitung total secara lokal: (subtotal + tax - discount)
  // Perhatikan: subtotal, tax, dan discount di sini adalah nilai yang sudah "diputuskan" (bisa lokal atau API)
  const total = apiTotal !== null ? apiTotal : subtotal + tax - discount;
  // --- AKHIR PERBAIKAN ---

  const repeatRound = () => {
    if (locked) return;
    setItems((prev) => prev.map((it) => ({ ...it, qty: it.qty + 1 })));
  };

  const voidOrder = () => {
    clearCartState();
  };

  const formatIDR = (v: number) => `Rp${v.toLocaleString('id-ID')}`;

  const addOrder = (order: OrderItem) => setOrders((prev) => [...prev, order]);
  const updateOrderStatus = (id: string, status: OrderItem['status']) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

  const value: CartContextValue = {
    items,
    selectedItemId,
    adjustMode,
    cartId,
    addItem,
    selectItem,
    toggleAdjust,
    adjustQuantity,
    deleteSelected,
    setEmployee,
    products,
    services,
    subtotal, // <-- Ini sekarang dinamis
    tax, // <-- Ini sekarang dinamis
    discount, // <-- Ini sekarang dinamis
    total, // <-- Ini sekarang dinamis
    formatIDR,
    paymentSheetOpen,
    setPaymentSheetOpen,
    billOption,
    setBillOption,
    locked,
    setLocked,
    repeatRound,
    voidOrder,
    clearCartState,
    appliedCoupon,
    applyCoupon,
    clearCoupon,
    setItems,
    setSelectedItemId,
    setAdjustMode,
    orders,
    addOrder,
    updateOrderStatus,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
