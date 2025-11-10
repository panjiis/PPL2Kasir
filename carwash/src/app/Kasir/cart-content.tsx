'use client';

import type React from 'react';
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  useRef, // PERBAIKAN: Impor useRef
  useCallback,
  useEffect, // <-- Dibutuhkan
} from 'react';
import type { ProductType } from './dummy';
import type { Coupon } from './dummy';
import { useSession } from '../lib/context/session';
import { useNotification } from './notification-context';
import {
  createCart,
  addItemToCart,
  type AddItemPayload,
  deleteCart, // <-- Impor fungsi deleteCart
} from '../lib/utils/pos-api';
import type { ApiSyncedCartItem } from '../lib/types/pos';

export type ApiCartSyncData = {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  items: ApiSyncedCartItem[];
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
  employeeId?: number;
  product_group_id?: number;
  isApiSynced?: boolean;
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
  // PERBAIKAN 1: Perbarui Tipe clearCartState
  clearCartState: (options?: { deleteBackendCart?: boolean }) => void;
  appliedCoupon: Coupon | null;
  applyCoupon: (c: Coupon, syncData: ApiCartSyncData) => void;
  clearCoupon: () => void;
  setItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setSelectedItemId: React.Dispatch<React.SetStateAction<string | null>>;
  setAdjustMode: React.Dispatch<React.SetStateAction<boolean>>;
  orders: OrderItem[];
  addOrder: (order: OrderItem) => void;
  updateOrderStatus: (id: string, status: OrderItem['status']) => void;
  addingItemId: string | null;
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
  const [addingItemId, setAddingItemId] = useState<string | null>(null);

  // Buat resetApiFinancials stabil
  const resetApiFinancials = useCallback(() => {
    setApiSubtotal(null);
    setApiTax(null);
    setApiDiscount(null);
    setApiTotal(null);
    setAppliedCoupon(null);
  }, []);

  // Gabungkan SEMUA logika "clear" ke satu fungsi
  const clearCartState = useCallback(
    (options: { deleteBackendCart?: boolean } = {}) => {
      const { deleteBackendCart = true } = options;
      const token = session?.token;
      const currentCartId = cartId; // Salin cartId sebelum di-reset

      // 1. Reset state UI (Selalu lakukan ini)
      setItems([]);
      setSelectedItemId(null);
      setAdjustMode(false);
      setPaymentSheetOpen(false);
      setLocked(false);
      setApiSubtotal(null);
      setApiTax(null);
      setApiDiscount(null);
      setApiTotal(null);
      setAppliedCoupon(null);
      setCartId(null); // <-- KUNCI UTAMA: Reset cartId

      // 2. Hapus cart di backend (Opsional)
      if (deleteBackendCart && currentCartId && token) {
        console.log(`(clearCartState) Menghapus cartId: ${currentCartId} dari backend...`);
        deleteCart(currentCartId, token)
          .then(() => {
            console.log(`(clearCartState) Cart ${currentCartId} berhasil dihapus.`);
          })
          .catch((err) => {
            console.error(`(clearCartState) Gagal hapus cart ${currentCartId}:`, err);
          });
      } else {
        console.log(`(clearCartState) Melakukan clear UI tanpa hapus backend.`);
      }
    },
    [cartId, session?.token] // <-- Ambil cartId dan token terbaru
  );

  // PERBAIKAN: Lacak cartId sebelumnya untuk mencegah 'useEffect'
  // berjalan saat cart baru dibuat.
  const prevCartIdRef = useRef<string | null>(cartId);

  // useEffect untuk 'delete-to-empty'
  // Ini akan menangani bug 'delete' dan 'adjustQuantity'
  useEffect(() => {
    // Jika items menjadi kosong TAPI cartId masih ada
    if (items.length === 0 && cartId) {
      // PERBAIKAN: Cek apakah cartId ini BARU SAJA dibuat.
      // Jika cartId sebelumnya null DAN cartId sekarang ada,
      // artinya kita sedang dalam proses 'addItem'. JANGAN HAPUS.
      const wasJustCreated = prevCartIdRef.current === null && cartId !== null;

      if (wasJustCreated) {
        console.log(`(useEffect) Cart ${cartId} baru dibuat, skip hapus.`);
      } else {
        // Ini adalah kasus yang sah: pengguna menghapus item terakhir.
        console.log(
          `(useEffect) Keranjang kosong, cartId ${cartId} akan dihapus.`,
        );
        // Panggil clearCartState, yang akan menghapus cartId di UI dan backend
        clearCartState({ deleteBackendCart: false });
      }
    }

    // PERBAIKAN: Selalu update ref di *akhir* effect
    // agar nilainya benar untuk render berikutnya.
    prevCartIdRef.current = cartId;
  }, [items, cartId, clearCartState]); // Monitor perubahan di 'items'

  // --- PERBAIKAN: Gunakan useRef untuk menghindari race condition ---
  // Ref untuk lock item yang sedang ditambah
  const addingItemIdRef = useRef<string | null>(null);
  // Ref untuk menyimpan cartId terbaru secara sinkron
  const cartIdRef = useRef<string | null>(cartId);
  useEffect(() => {
    cartIdRef.current = cartId;
  }, [cartId]);

  // --- FUNGSI 'addItem' ---
  const addItem = useCallback(
    async (p: CartItem) => {
      // PERBAIKAN: Cek menggunakan Ref (sinkron)
      if (addingItemIdRef.current === p.id) {
        showNotif({ type: 'info', message: 'Sedang diproses...' });
        return;
      }
      if (locked) return;

      addingItemIdRef.current = p.id; // PERBAIKAN: Set Ref (sinkron)
      setAddingItemId(p.id); // Set State (untuk UI)

      try {
        resetApiFinancials();
        const token = session?.token;
        if (!token) {
          showNotif({ type: 'error', message: 'Anda harus login' });
          return;
        }

        // PERBAIKAN: Baca cartId dari Ref (sinkron)
        let currentCartId = cartIdRef.current;
        if (!currentCartId) {
          console.log("(addItem) Membuat cart baru...");
          try {
            const { data } = await createCart({ cashier_id: 1 }, token);
            currentCartId = String(data.cart_id);
            localStorage.setItem('last_cart_id', currentCartId);
            cartIdRef.current = currentCartId; // PERBAIKAN: Set Ref (sinkron)
            setCartId(currentCartId); // Set State (untuk UI)
            console.log(`(addItem) Cart baru dibuat: ${currentCartId}`);
          } catch (e) {
            console.error(e);
            showNotif({ type: 'error', message: 'Gagal membuat keranjang' });
            return;
          }
        }

        const found = items.find((it) => it.id === p.id);

        if (p.type === 'service') {
          setItems((prev) => {
            const foundInSetter = prev.find((it) => it.id === p.id);
            if (foundInSetter) {
              showNotif({
                type: 'info',
                message: 'Layanan sudah ada. Pilih/ganti employee.',
              });
              return prev;
            }
            showNotif({
              type: 'info',
              message: `${p.name} ditambah. Silakan pilih employee.`,
            });
            return [
              ...prev,
              { ...p, qty: 1, isApiSynced: false },
            ];
          });
        } else {
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
        console.error('Error in addItem:', err);
      } finally {
        addingItemIdRef.current = null; // PERBAIKAN: Lepas lock di Ref
        setAddingItemId(null);
      }
    },
    [ // PERBAIKAN: Hapus cartId dan addingItemId dari dependencies
      items,
      locked,
      session?.token,
      showNotif,
      resetApiFinancials,
    ]
  );
  // --- AKHIR PERUBAHAN 'addItem' ---

  // PERBAIKAN 2: Bungkus selectItem dengan useCallback
  const selectItem = useCallback((id: string | null) => {
    if (locked) return;
    setSelectedItemId(id);
    if (!id) setAdjustMode(false);
  }, [locked]);

  // PERBAIKAN 3: Bungkus toggleAdjust dengan useCallback
  const toggleAdjust = useCallback(() => {
    if (locked || !selectedItemId) return;
    setAdjustMode((s) => !s);
  }, [locked, selectedItemId]);

  // Bungkus adjustQuantity dengan useCallback
  const adjustQuantity = useCallback(
    (id: string, delta: number) => {
      if (locked || !adjustMode || selectedItemId !== id) return;

      resetApiFinancials(); 

      setItems((prev) => {
        const updated = prev
          .map((it) =>
            it.id === id ? { ...it, qty: Math.max(0, it.qty + delta) } : it,
          )
          .filter((it) => it.qty > 0); 
        const stillThere = updated.find((it) => it.id === id);
        if (!stillThere) {
          setSelectedItemId(null);
          setAdjustMode(false);
        }
        
        return updated;
      });
    },
    [locked, adjustMode, selectedItemId, resetApiFinancials],
  );

  // Bungkus deleteSelected dengan useCallback
  const deleteSelected = useCallback(() => {
    if (locked || !selectedItemId) return;

    resetApiFinancials(); 

    setItems((prev) => {
      const updated = prev.filter((it) => it.id !== selectedItemId);
      return updated;
    });
    setSelectedItemId(null);
    setAdjustMode(false);
  }, [locked, selectedItemId, resetApiFinancials]);

  // ... (fungsi setEmployee tetap sama)
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
        product_code: item.itemId, 
        quantity: item.qty, 
        serving_employee_id: employeeId, 
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

  const clearCoupon = useCallback(() => {
    resetApiFinancials();
  }, [resetApiFinancials]);

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

  const repeatRound = useCallback(() => {
    if (locked) return;
    setItems((prev) => prev.map((it) => ({ ...it, qty: it.qty + 1 })));
  }, [locked]);

  // voidOrder sekarang memanggil clearCartState
  const voidOrder = useCallback(() => {
    clearCartState({ deleteBackendCart: false });
  }, [clearCartState]);

  const formatIDR = (v: number) => `Rp${v.toLocaleString('id-ID')}`;

  const addOrder = useCallback((order: OrderItem) => setOrders((prev) => [...prev, order]), []);
  
  const updateOrderStatus = useCallback((id: string, status: OrderItem['status']) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o))), []);

  // Pastikan clearCartState ada di 'value'
  const value: CartContextValue = useMemo(
    () => ({
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
      addingItemId,
    }),
    [ // PERBAIKAN 4: Tambahkan `selectItem` dll ke dependency array
      items,
      selectedItemId,
      adjustMode,
      cartId,
      addItem,
      selectItem, // <-- Ditambahkan
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
      paymentSheetOpen,
      billOption,
      locked,
      repeatRound,
      voidOrder,
      clearCartState,
      appliedCoupon,
      clearCoupon,
      orders,
      addOrder,
      updateOrderStatus,
      addingItemId,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}