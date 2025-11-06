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

  employeeId?: number; // <-- GANTI DENGAN INI
  isApiSynced?: boolean; // <-- TAMBAH
};

export type OrderItem = {
  id: string;
  orderNo: string;
  createdAt: string;
  customer?: string;
  items: CartItem[];
  status: 'In Queue' | 'In Process' | 'Waiting Payment' | 'Done';
  paymentType: string;
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
  setEmployee: (itemId: string, employeeId: number) => Promise<void>;
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
  addingItemId: string | null; // <-- TAMBAHKAN INI
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
  
  // --- STATE BARU UNTUK MENCEGAH KLIK GANDA ---
  const [addingItemId, setAddingItemId] = useState<string | null>(null);

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

  // --- FUNGSI 'addItem' DIPERBARUI ---
  const addItem = useCallback(
    async (p: CartItem) => {
      // 1. Cek apakah item ini sedang ditambahkan
      if (addingItemId === p.id) {
        showNotif({ type: 'info', message: 'Sedang diproses...' });
        return; 
      }
      if (locked) return;
      
      // 2. Set item ini sebagai 'adding'
      setAddingItemId(p.id);

      try {
        resetApiFinancials();
        const token = session?.token;
        if (!token) {
          showNotif({ type: 'error', message: 'Anda harus login' });
          return;
        }

        // 1. Pastikan Cart ID ada
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

        // 2. Cek item sudah ada di state lokal
        const found = items.find((it) => it.id === p.id);

        // 3. Logika Percabangan (Service vs Product)
        if (p.type === 'service') {
          // --- JIKA SERVICE ---
          setItems((prev) => {
            // Cek lagi 'found' di dalam setter untuk data paling baru
            const foundInSetter = prev.find((it) => it.id === p.id);
            if (foundInSetter) {
              showNotif({
                type: 'info',
                message: 'Layanan sudah ada. Pilih/ganti employee.',
              });
              return prev; // Jangan ubah state jika sudah ada
            }
            showNotif({
              type: 'info',
              message: `${p.name} ditambah. Silakan pilih employee.`,
            });
            return [
              ...prev,
              { ...p, qty: 1, isApiSynced: false }, // Tambah dengan qty 1 dan tandai belum sinkron
            ];
          });
        } else {
          // --- JIKA PRODUCT ---
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
            return; // Penting: jangan update state jika API gagal
          }

          // Update state lokal
          setItems((prev) => {
            const foundInSetter = prev.find((it) => it.id === p.id);
            if (foundInSetter) {
              return prev.map((it) =>
                it.id === p.id
                  ? { ...it, qty: it.qty + 1, isApiSynced: true }
                  : it
              );
            }
            return [...prev, { ...p, qty: 1, isApiSynced: true }];
          });
        }
      } catch (err) {
        console.error("Error in addItem:", err);
        // Tangani error lain jika perlu
      } finally {
        // 3. Selalu unset 'adding' di finally
        setAddingItemId(null);
      }
    },
    [cartId, items, locked, session?.token, showNotif, addingItemId] // <-- Tambahkan dependency
  );
  // --- AKHIR PERUBAHAN 'addItem' ---


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

    resetApiFinancials();

    setItems((prev) => prev.filter((it) => it.id !== selectedItemId));
    setSelectedItemId(null);
    setAdjustMode(false);
  };

  const setEmployee = useCallback(
    async (itemId: string, employeeId: number) => {
      if (locked) return;

      const token = session?.token;
      const currentCartId = cartId;
      const item = items.find((it) => it.id === itemId);

      if (!token || !currentCartId || !item) {
        showNotif({
          type: 'error',
          message: 'Cart atau item tidak ditemukan.',
        });
        return;
      }

      if (item.employeeId === employeeId && item.isApiSynced) {
        return;
      }

      const payload: AddItemPayload = {
        cart_id: currentCartId,
        product_code: item.itemId, // Gunakan itemId (product_code)
        quantity: item.qty, // Kirim kuantitas saat ini
        serving_employee_id: employeeId, // <-- Kuncinya di sini
      };

      try {
        await addItemToCart(payload, token);

        setItems((prev) =>
          prev.map((it) =>
            it.id === itemId
              ? { ...it, employeeId: employeeId, isApiSynced: true }
              : it
          )
        );
        showNotif({ type: 'success', message: 'Employee di-assign.' });
      } catch (e) {
        console.error(e);
        const errMsg =
          e instanceof Error ? e.message : 'Gagal assign employee.';
        showNotif({ type: 'error', message: errMsg });
      }
    },
    [cartId, items, locked, session?.token, showNotif]
  );
  const applyCoupon = (c: Coupon, financials: ApiFinancials) => {
    setAppliedCoupon(c);
    setApiSubtotal(financials.subtotal);
    setApiTax(financials.tax);
    setApiDiscount(financials.discount);
    setApiTotal(financials.total);
  };

  const clearCoupon = () => {
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

  const localSubtotal = useMemo(
    () => items.reduce((acc, it) => acc + it.price * it.qty, 0),
    [items]
  );
  const taxRate = 0.1;
  const localTax = useMemo(
    () => Math.round(localSubtotal * taxRate),
    [localSubtotal]
  );

  const subtotal = apiSubtotal !== null ? apiSubtotal : localSubtotal;
  const tax = apiTax !== null ? apiTax : localTax;
  const discount = apiDiscount !== null ? apiDiscount : 0;
  const total = apiTotal !== null ? apiTotal : subtotal + tax - discount;

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
    addingItemId, // <-- TAMBAHKAN INI
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}