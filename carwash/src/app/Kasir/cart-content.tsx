// Kasir/cart-content.tsx
'use client';

import type React from 'react';
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import type { ProductType } from './dummy';
import type { Coupon } from './dummy';
import { useSession } from '../lib/context/session';
import { useNotification } from './notification-context';
import {
  createCart,
  addItemToCart,
  type AddItemPayload,
  deleteCart,
  removeItemFromCart,
  fetchEmployees, // <--- +++ IMPOR BARU +++
} from '../lib/utils/pos-api';
import type { ApiSyncedCartItem, Employee } from '../lib/types/pos'; // <--- +++ IMPOR Employee +++
import { useTranslation } from 'react-i18next';

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
  apiLineItemId?: string; // <--- (Ini dari perbaikan delete, biarkan saja)
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

// --- PERBAIKAN: Hapus tipe 'ApiFinancials' yang tidak terpakai ---
/*
type ApiFinancials = {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
};
*/
// --- AKHIR PERBAIKAN ---

type CartContextValue = {
  items: CartItem[];
  selectedItemId: string | null;
  adjustMode: boolean;
  cartId: string | null;
  addItem: (p: CartItem) => Promise<void>;
  selectItem: (id: string | null) => void;
  toggleAdjust: () => void;
  adjustQuantity: (id: string, delta: number) => Promise<void>; // <-- PERBAIKAN: Dibuat async
  deleteSelected: () => Promise<void>; // <-- PERBAIKAN: Dibuat async
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
  employees: Employee[]; // <--- +++ STATE BARU +++
  loadingEmployees: boolean; // <--- +++ STATE BARU +++
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [adjustMode, setAdjustMode] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [billOption, setBillOption] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);

  // --- (State apiSubtotal, apiTax, etc. tidak berubah) ---
  // --- PERBAIKAN: Komentari state yang tidak terpakai ---
  // const [apiSubtotal, setApiSubtotal] = useState<number | null>(null);
  // const [apiTax, setApiTax] = useState<number | null>(null);
  const [apiDiscount, setApiDiscount] = useState<number | null>(null);
  // const [apiTotal, setApiTotal] = useState<number | null>(null);
  // --- AKHIR PERBAIKAN ---

  const [cartId, setCartId] = useState<string | null>(null);
  const { session } = useSession();
  const { showNotif } = useNotification();
  const [addingItemId, setAddingItemId] = useState<string | null>(null);

  // --- +++ AWAL: STATE & FETCH KARYAWAN (Dipindah ke sini) +++ ---
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  useEffect(() => {
    if (!session?.token) {
      setLoadingEmployees(false);
      return;
    }
    setLoadingEmployees(true);
    fetchEmployees(session.token)
      .then((res) => setEmployees(res.data || []))
      .catch((err) =>
        console.error('Gagal fetch employees in CartProvider:', err)
      )
      .finally(() => setLoadingEmployees(false));
  }, [session?.token]);
  // --- +++ AKHIR: STATE & FETCH KARYAWAN +++ ---

  // --- (Fungsi resetApiFinancials, clearCartState, useEffects... tidak berubah) ---
  const resetApiFinancials = useCallback(() => {
    // --- PERBAIKAN: Komentari setter yang tidak terpakai ---
    // setApiSubtotal(null);
    // setApiTax(null);
    setApiDiscount(null);
    // setApiTotal(null);
    // --- AKHIR PERBAIKAN ---
    setAppliedCoupon(null);
  }, []);

  const clearCartState = useCallback(
    (options: { deleteBackendCart?: boolean } = {}) => {
      const { deleteBackendCart = true } = options;
      const token = session?.token;
      const currentCartId = cartId; // Salin cartId sebelum di-reset

      setItems([]);
      setSelectedItemId(null);
      setAdjustMode(false);
      setPaymentSheetOpen(false);
      setLocked(false);
      // --- PERBAIKAN: Komentari setter yang tidak terpakai ---
      // setApiSubtotal(null);
      // setApiTax(null);
      setApiDiscount(null);
      // setApiTotal(null);
      // --- AKHIR PERBAIKAN ---
      setAppliedCoupon(null);
      setCartId(null); // <-- KUNCI UTAMA: Reset cartId

      if (deleteBackendCart && currentCartId && token) {
        console.log(
          `(clearCartState) Menghapus cartId: ${currentCartId} dari backend...`
        );
        deleteCart(currentCartId, token)
          .then(() => {
            console.log(
              `(clearCartState) Cart ${currentCartId} berhasil dihapus.`
            );
          })
          .catch((err) => {
            console.error(
              `(clearCartState) Gagal hapus cart ${currentCartId}:`,
              err
            );
          });
      } else {
        console.log(`(clearCartState) Melakukan clear UI tanpa hapus backend.`);
      }
    },
    [cartId, session?.token]
  );

  const prevCartIdRef = useRef<string | null>(cartId);
  useEffect(() => {
    if (items.length === 0 && cartId) {
      const wasJustCreated = prevCartIdRef.current === null && cartId !== null;

      if (wasJustCreated) {
        console.log(`(useEffect) Cart ${cartId} baru dibuat, skip hapus.`);
      } else {
        console.log(
          `(useEffect) Keranjang kosong, cartId ${cartId} akan dihapus.`
        );
        clearCartState({ deleteBackendCart: false });
      }
    }
    prevCartIdRef.current = cartId;
  }, [items, cartId, clearCartState]);

  const addingItemIdRef = useRef<string | null>(null);
  const cartIdRef = useRef<string | null>(cartId);
  useEffect(() => {
    cartIdRef.current = cartId;
  }, [cartId]);

  // --- FUNGSI 'addItem' (DIPERBAIKI) ---
  const addItem = useCallback(
    async (p: CartItem) => {
      if (addingItemIdRef.current === p.id) {
        showNotif({ type: 'info', message: t('Cart.processing') });
        return;
      }
      if (locked) return;

      addingItemIdRef.current = p.id;
      setAddingItemId(p.id);

      try {
        resetApiFinancials();
        const token = session?.token;
        if (!token) {
          showNotif({ type: 'error', message: t('Cart.loginRequired') });
          return;
        }

        let currentCartId = cartIdRef.current;
        if (!currentCartId) {
          console.log('(addItem) Membuat cart baru...');
          try {
            const { data } = await createCart({ cashier_id: 1 }, token);
            currentCartId = String(data.cart_id);
            localStorage.setItem('last_cart_id', currentCartId);
            cartIdRef.current = currentCartId;
            setCartId(currentCartId);
            console.log(`(addItem) Cart baru dibuat: ${currentCartId}`);
          } catch (e) {
            console.error(e);
            showNotif({ type: 'error', message: t('Cart.createCartFailed') });
            return;
          }
        }

        // --- AWAL PERBAIKAN: Logika Terpadu untuk Produk & Service ---
        const found = items.find((it) => it.id === p.id);
        const newQty = found ? found.qty + 1 : 1;
        const productCode = p.itemId ?? p.id;

        // Jika item sudah ada, pertahankan employeeId-nya
        let employeeId = found?.employeeId;

        // +++ PERBAIKAN BARU: Tetapkan Karyawan Default untuk Service +++
        if (p.type === 'service' && !employeeId) {
          if (loadingEmployees) {
            showNotif({
              type: 'error',
              message: t('Cart.loadingEmployees'), // (Tambahkan string ini di i18n)
            });
            return; // Hentikan jika karyawan belum dimuat
          }
          if (employees.length === 0) {
            showNotif({
              type: 'error',
              message: t('Cart.noEmployees'), // (Tambahkan string ini di i18n)
            });
            return; // Hentikan jika tidak ada karyawan
          }
          // Tetapkan karyawan pertama sebagai default
          employeeId = employees[0].id;
          p.employeeId = employeeId; // <-- Penting: update obyek 'p'
        }
        // +++ AKHIR PERBAIKAN BARU +++

        const payload: AddItemPayload = {
          cart_id: currentCartId,
          product_code: productCode,
          quantity: newQty,
          // Ini sekarang akan memiliki ID karyawan default untuk service baru,
          // ID karyawan yang ada untuk service lama, atau undefined untuk produk.
          serving_employee_id: employeeId,
        };

        try {
          // --- 2. PERBAIKAN: Tangkap respons API ---
          // Selalu panggil API untuk produk DAN service
          const response = await addItemToCart(payload, token); // API update/upsert

          // 'response.data' adalah seluruh keranjang: { items: [...] }
          const returnedCart = response.data;

          // Cari item yang baru saja kita perbarui di dalam array 'items'
          const returnedItem = returnedCart.items?.find(
            (item) => item.product.product_code === payload.product_code
          );

          // Sekarang kita bisa dapatkan item_id ("81") yang benar!
          const apiLineItemId = returnedItem?.item_id;
          // --- AKHIR PERBAIKAN ---

          // Jika API berhasil, update state lokal
          setItems((prev) => {
            const foundInSetter = prev.find((it) => it.id === p.id);
            if (foundInSetter) {
              return prev.map((it) =>
                it.id === p.id
                  ? {
                      ...it,
                      qty: it.qty + 1,
                      isApiSynced: true,
                      // --- 2. PERBAIKAN: Simpan/update ID unik ---
                      apiLineItemId:
                        apiLineItemId ?? foundInSetter.apiLineItemId,
                    }
                  : it
              );
            }
            // --- 2. PERBAIKAN: Simpan ID unik untuk item baru ---
            // Item baru, selalu set isApiSynced ke true
            // 'p' sudah memiliki employeeId default jika itu adalah service
            return [
              ...prev,
              { ...p, qty: 1, isApiSynced: true, apiLineItemId: apiLineItemId },
            ];
          });
        } catch (e) {
          console.error(e);
          // Tangani pesan error spesifik dari server
          const errMsg =
            e instanceof Error
              ? e.message
              : t('Cart.addItemFailed', { name: p.name });
          showNotif({
            type: 'error',
            message: errMsg,
          });
          return; // Hentikan jika API gagal
        }
        // --- AKHIR PERBAIKAN ---
      } catch (err) {
        console.error('Error in addItem:', err);
      } finally {
        addingItemIdRef.current = null;
        setAddingItemId(null);
      }
    },
    [
      items,
      locked,
      session?.token,
      showNotif,
      resetApiFinancials,
      t,
      employees, // <--- +++ DEPENDENCY BARU +++
      loadingEmployees, // <--- +++ DEPENDENCY BARU +++
    ]
  );

  // --- (Fungsi selectItem, toggleAdjust... tidak berubah) ---
  const selectItem = useCallback(
    (id: string | null) => {
      if (locked) return;
      setSelectedItemId(id);
      if (!id) setAdjustMode(false);
    },
    [locked]
  );

  const toggleAdjust = useCallback(() => {
    if (locked || !selectedItemId) return;
    setAdjustMode((s) => !s);
  }, [locked, selectedItemId]);

  // --- FUNGSI 'adjustQuantity' (DIPERBAIKI) ---
  const adjustQuantity = useCallback(
    async (id: string, delta: number) => {
      if (locked || !adjustMode || selectedItemId !== id) return;
      if (addingItemIdRef.current === id) {
        showNotif({ type: 'info', message: t('Cart.processing') });
        return;
      }

      const item = items.find((it) => it.id === id);
      if (!item) return;

      const newQty = Math.max(0, item.qty + delta);

      addingItemIdRef.current = id;
      setAddingItemId(id);
      try {
        resetApiFinancials();
        const token = session?.token;
        const currentCartId = cartIdRef.current;
        if (!token || !currentCartId) {
          showNotif({ type: 'error', message: t('Cart.loginRequired') });
          return;
        }

        if (newQty === 0) {
          // --- 5. PERBAIKAN: Gunakan ID unik untuk menghapus ---
          // Prioritaskan ID baris item dari API, fallback ke ID produk jika tidak ada
          const idToDelete = item.apiLineItemId ?? item.itemId;
          if (!idToDelete) {
            // Ini seharusnya tidak terjadi, tapi sebagai pengaman
            throw new Error('Item cannot be deleted, missing ID.');
          }
          await removeItemFromCart(currentCartId, idToDelete, token); // <-- Gunakan idToDelete
          // --- AKHIR PERBAIKAN ---

          setItems((prev) => prev.filter((it) => it.id !== id));
          setSelectedItemId(null);
          setAdjustMode(false);
        } else {
          // Selalu panggil API untuk update
          const payload: AddItemPayload = {
            cart_id: currentCartId,
            product_code: item.itemId,
            quantity: newQty,
            serving_employee_id: item.employeeId, // Pertahankan employee
          };

          const response = await addItemToCart(payload, token);

          const returnedCart = response.data;

          // Cari item yang baru saja kita tambahkan di dalam array 'items'
          const returnedItem = returnedCart.items?.find(
            (item) => item.product.product_code === payload.product_code
          );

          // Sekarang kita bisa dapatkan item_id ("81") yang benar!
          const apiLineItemId = returnedItem?.item_id;
          // --- AKHIR PERBAIKAN ---

          setItems((prev) =>
            prev.map((it) =>
              it.id === id
                ? {
                    ...it,
                    qty: newQty,
                    isApiSynced: true,
                    // --- 3. PERBAIKAN: Simpan/update ID unik ---
                    apiLineItemId: apiLineItemId ?? it.apiLineItemId,
                  }
                : it
            )
          );
        }
      } catch (err) {
        console.error('Error adjusting quantity:', err);
        const errorKey =
          newQty === 0 ? 'Cart.removeItemFailed' : 'Cart.adjustItemFailed';
        showNotif({
          type: 'error',
          message: t(errorKey, { name: item.name }),
        });
      } finally {
        addingItemIdRef.current = null;
        setAddingItemId(null);
      }
    },
    [
      locked,
      adjustMode,
      selectedItemId,
      resetApiFinancials,
      items,
      session?.token,
      showNotif,
      t,
    ]
  );

  // --- FUNGSI 'deleteSelected' (DIPERBAIKI) ---
  const deleteSelected = useCallback(async () => {
    if (locked || !selectedItemId) return;
    if (addingItemIdRef.current === selectedItemId) {
      showNotif({ type: 'info', message: t('Cart.processing') });
      return;
    }

    const item = items.find((it) => it.id === selectedItemId);
    if (!item) return;

    const id = selectedItemId; // Salin ID sebelum di-reset

    addingItemIdRef.current = id;
    setAddingItemId(id); // Tampilkan spinner
    try {
      resetApiFinancials();
      const token = session?.token;
      const currentCartId = cartIdRef.current;

      // Hapus dari API jika itemnya disinkronkan (sekarang harusnya semua)
      if (item.isApiSynced && token && currentCartId) {
        // --- 5. PERBAIKAN: Ini adalah inti perbaikannya ---
        // Prioritaskan ID baris item dari API ('157'),
        // fallback ke ID produk ('ITM-0001') jika tidak (seharusnya tidak terjadi).
        const idToDelete = item.apiLineItemId ?? item.itemId;
        if (!idToDelete) {
          // Ini seharusnya tidak terjadi, tapi sebagai pengaman
          throw new Error('Item cannot be deleted, missing ID.');
        }

        // Panggil API dengan ID yang benar (idToDelete)
        await removeItemFromCart(currentCartId, idToDelete, token);
        // --- AKHIR PERBAIKAN ---
      }

      setItems((prev) => prev.filter((it) => it.id !== id));
      setSelectedItemId(null);
      setAdjustMode(false);
    } catch (err) {
      console.error('Error removing item:', err);
      showNotif({
        type: 'error',
        message: t('Cart.removeItemFailed', { name: item.name }),
      });
    } finally {
      addingItemIdRef.current = null;
      setAddingItemId(null);
    }
  }, [
    locked,
    selectedItemId,
    resetApiFinancials,
    items,
    session?.token,
    showNotif,
    t,
  ]);

  // --- (Fungsi setEmployee... tidak berubah) ---
  const setEmployee = useCallback(
    async (itemId: string, employeeId: number) => {
      if (locked) return;
      // --- +++ GUNAKAN cartIdRef.current +++ ---
      const token = session?.token;
      const currentCartId = cartIdRef.current; // <--- PERBAIKAN
      const item = items.find((it) => it.id === itemId);

      if (!token || !currentCartId || !item) {
        showNotif({
          type: 'error',
          message: t('Cart.itemNotFound'),
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
        showNotif({ type: 'success', message: t('Cart.employeeAssigned') });
      } catch (e) {
        console.error(e);
        const errMsg =
          e instanceof Error ? e.message : t('Cart.assignEmployeeFailed');
        showNotif({ type: 'error', message: errMsg });
      }
    },
    [items, locked, session?.token, showNotif, t] // <--- Hapus 'cartId' dari dependencies
  );

  // --- FUNGSI 'applyCoupon' (DIPERBAIKI) ---
  const applyCoupon = (c: Coupon, financials: ApiCartSyncData) => {
    setAppliedCoupon(c);
    setApiDiscount(financials.discount);
    // --- PERBAIKAN: Komentari setter yang tidak terpakai ---
    // setApiSubtotal(financials.subtotal);
    // setApiTax(financials.tax);
    // setApiTotal(financials.total);
    // --- AKHIR PERBAIKAN ---

    // --- 4. PERBAIKAN: Tambahkan blok ini untuk sinkronisasi ID ---
    if (financials.items) {
      setItems((prevItems) => {
        // Buat Peta (Map) dari product_code -> apiItem
        const apiItemMap = new Map<string, ApiSyncedCartItem>();
        financials.items.forEach((apiItem) => {
          apiItemMap.set(apiItem.product.product_code, apiItem); // Gunakan product_code dari objek nested 'product'
        });

        // Perbarui state lokal 'items'
        return prevItems.map((localItem) => {
          // Cari item API berdasarkan product_code (yang disimpan di localItem.itemId)
          const apiItem = apiItemMap.get(localItem.itemId);
          if (apiItem) {
            return {
              ...localItem,
              apiLineItemId: apiItem.item_id, // <-- Sinkronkan ID unik!
              isApiSynced: true,
            };
          }
          return localItem; // Kembalikan item lokal jika tidak ditemukan (seharusnya tidak terjadi)
        });
      });
    }
    // --- AKHIR PERBAIKAN ---
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
  const taxRate = 0.1; // 10%
  const localTax = useMemo(
    () => Math.round(localSubtotal * taxRate),
    [localSubtotal]
  );

  const subtotal = localSubtotal;
  const tax = localTax;
  const discount = apiDiscount !== null ? apiDiscount : 0;
  const total = subtotal + tax - discount;

  // --- (Fungsi repeatRound, voidOrder, formatIDR, addOrder, updateOrderStatus... tidak berubah) ---
  const repeatRound = useCallback(() => {
    if (locked) return;
    setItems((prev) => prev.map((it) => ({ ...it, qty: it.qty + 1 })));
  }, [locked]);

  const voidOrder = useCallback(() => {
    clearCartState({ deleteBackendCart: false });
  }, [clearCartState]);

  const formatIDR = (v: number) => `Rp${v.toLocaleString('id-ID')}`;

  const addOrder = useCallback(
    (order: OrderItem) => setOrders((prev) => [...prev, order]),
    []
  );

  const updateOrderStatus = useCallback(
    (id: string, status: OrderItem['status']) =>
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status } : o))
      ),
    []
  );

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
      employees, // <--- +++ MASUKKAN KE CONTEXT +++
      loadingEmployees, // <--- +++ MASUKKAN KE CONTEXT +++
    }),
    [
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
      employees, // <--- +++ DEPENDENCY BARU +++
      loadingEmployees, // <--- +++ DEPENDENCY BARU +++
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
