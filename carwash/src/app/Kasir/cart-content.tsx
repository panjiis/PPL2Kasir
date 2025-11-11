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
  fetchEmployees,
} from '../lib/utils/pos-api';
import type { ApiSyncedCartItem, Employee } from '../lib/types/pos';
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
  apiLineItemId?: string; // ID unik dari baris item API (cth: "157")
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

type CartContextValue = {
  items: CartItem[];
  selectedItemId: string | null;
  adjustMode: boolean;
  cartId: string | null;
  addItem: (p: CartItem) => Promise<void>;
  selectItem: (id: string | null) => void;
  toggleAdjust: () => void;
  adjustQuantity: (id: string, delta: number) => Promise<void>;
  deleteSelected: () => Promise<void>;
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
  employees: Employee[];
  loadingEmployees: boolean;
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

  // === STATE FINANSIAL (frontend memo + server sync) ===
  // apiDiscount adalah nilai diskon yang diambil dari server (jika tersedia)
  const [apiDiscount, setApiDiscount] = useState<number | null>(null);
  // server-provided subtotal, tax, total (dipakai jika server mengembalikan data lengkap)
  const [apiSubtotal, setApiSubtotal] = useState<number | null>(null);
  const [apiTax, setApiTax] = useState<number | null>(null);
  const [apiTotal, setApiTotal] = useState<number | null>(null);

  const [cartId, setCartId] = useState<string | null>(null);
  const { session } = useSession();
  const { showNotif } = useNotification();
  const [addingItemId, setAddingItemId] = useState<string | null>(null);

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

  // Fungsi ini HANYA mereset memo diskon / finansial lokal (frontend)
  const resetApiFinancials = useCallback(() => {
    setApiDiscount(null);
    setAppliedCoupon(null);
    setApiSubtotal(null);
    setApiTax(null);
    setApiTotal(null);
  }, []);

  const clearCartState = useCallback(
    (options: { deleteBackendCart?: boolean } = {}) => {
      const { deleteBackendCart = true } = options;
      const token = session?.token;
      const currentCartId = cartId;

      // Reset memo diskon setiap kali cart dihapus
      console.log(
        '%c(clearCartState) Reset memo discount karena cart dihapus',
        'color: orange;'
      );
      resetApiFinancials();

      setItems([]);
      setSelectedItemId(null);
      setAdjustMode(false);
      setPaymentSheetOpen(false);
      setLocked(false);
      setCartId(null);

      if (deleteBackendCart && currentCartId && token) {
        console.log(
          `(clearCartState) Menghapus cartId: ${currentCartId} dari backend...`
        );
        deleteCart(currentCartId, token)
          .then(() =>
            console.log(
              `(clearCartState) Cart ${currentCartId} berhasil dihapus.`
            )
          )
          .catch((err) =>
            console.error(
              `(clearCartState) Gagal hapus cart ${currentCartId}:`,
              err
            )
          );
      } else {
        console.log(`(clearCartState) Melakukan clear UI tanpa hapus backend.`);
      }
    },
    [cartId, session?.token, resetApiFinancials] // ✅ tambahkan dependensi dengan benar
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
        // Reset memo discount sebelum mengubah cart (frontend)
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
          serving_employee_id: employeeId,
        };

        try {
          // --- 2. PERBAIKAN: Tangkap respons API dan sinkronisasi finansial ---
          const response = await addItemToCart(payload, token); // API update/upsert
          const returnedCart = response?.data ?? {};

          // Parse server financials jika ada
          const serverSubtotal = returnedCart?.subtotal
            ? parseFloat(String(returnedCart.subtotal))
            : null;
          const serverTax = returnedCart?.tax_amount
            ? parseFloat(String(returnedCart.tax_amount))
            : null;
          const serverDiscount = returnedCart?.discount_amount
            ? parseFloat(String(returnedCart.discount_amount))
            : null;
          const serverTotal = returnedCart?.total_amount
            ? parseFloat(String(returnedCart.total_amount))
            : null;

          if (serverDiscount !== null && !Number.isNaN(serverDiscount)) {
            setApiDiscount(serverDiscount);
          } else {
            setApiDiscount(null);
          }

          // set server provided subtotal/tax/total jika tersedia
          setApiSubtotal(
            serverSubtotal !== null && !Number.isNaN(serverSubtotal)
              ? serverSubtotal
              : null
          );
          setApiTax(
            serverTax !== null && !Number.isNaN(serverTax) ? serverTax : null
          );
          setApiTotal(
            serverTotal !== null && !Number.isNaN(serverTotal)
              ? serverTotal
              : null
          );

          const returnedItem = returnedCart.items?.find(
            (item: ApiSyncedCartItem) =>
              item.product?.product_code === payload.product_code
          );

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
            return [
              ...prev,
              { ...p, qty: 1, isApiSynced: true, apiLineItemId: apiLineItemId },
            ];
          });
        } catch (e) {
          console.error(e);
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
  // Kasir/cart-content.tsx

  // --- FUNGSI 'adjustQuantity' (DIPERBAIKI) ---
  const adjustQuantity = useCallback(
    async (id: string, newAbsoluteQty: number) => {
      // <-- 1. Ganti nama parameter 'delta' menjadi 'newAbsoluteQty'
      // 1. Cek Guard Clause
      if (locked || !adjustMode || selectedItemId !== id) {
        console.warn('(adjustQuantity) Guard clause triggered. Aborting.');
        return;
      }

      console.log(
        `%c(adjustQuantity) Mulai: Qty SET ke ${newAbsoluteQty} untuk item ${id}`, // <-- Ubah log
        'color: blue'
      );

      const token = session?.token;
      const currentCartId = cartIdRef.current;
      const item = items.find((it) => it.id === id);

      if (!token || !currentCartId || !item) {
        showNotif({
          type: 'error',
          message: 'Keranjang atau item tidak ditemukan.',
        });
        console.error('(adjustQuantity) Cart/Token/Item not found.');
        return;
      }

      // 2. KUNCI UTAMA: RESET DISKON
      console.log(
        '%c(adjustQuantity) RESETTING API FINANCIALS...',
        'color: red; font-weight: bold;'
      );
      resetApiFinancials();

      // --- 3. INI PERBAIKAN UTAMANYA ---
      // Hapus: const newQty = Math.max(0, item.qty + delta);
      // Ganti dengan:
      const newQty = Math.max(0, newAbsoluteQty); // Gunakan kuantitas absolut, pastikan tidak negatif
      // --- AKHIR PERBAIKAN UTAMA ---

      const productCode = item.itemId ?? item.id;

      const payload: AddItemPayload = {
        cart_id: currentCartId,
        product_code: productCode,
        quantity: newQty, // <-- newQty sekarang adalah nilai absolut (misal: 2)
        ...(item.type === 'service' &&
          item.employeeId && { serving_employee_id: item.employeeId }),
      };

      try {
        setAddingItemId(id); // Tampilkan loading
        console.log(
          '(adjustQuantity) Memanggil API addItemToCart dengan Qty:',
          newQty
        );

        // (Sisa fungsi tidak berubah)
        const response = await addItemToCart(payload, token);
        const returnedCart = response?.data ?? {};

        const serverSubtotal = returnedCart?.subtotal
          ? parseFloat(String(returnedCart.subtotal))
          : null;
        const serverTax = returnedCart?.tax_amount
          ? parseFloat(String(returnedCart.tax_amount))
          : null;
        const serverDiscount = returnedCart?.discount_amount
          ? parseFloat(String(returnedCart.discount_amount))
          : null;
        const serverTotal = returnedCart?.total_amount
          ? parseFloat(String(returnedCart.total_amount))
          : null;

        if (serverDiscount !== null && !Number.isNaN(serverDiscount)) {
          setApiDiscount(serverDiscount);
        } else {
          setApiDiscount(null);
        }
        setApiSubtotal(
          serverSubtotal !== null && !Number.isNaN(serverSubtotal)
            ? serverSubtotal
            : null
        );
        setApiTax(
          serverTax !== null && !Number.isNaN(serverTax) ? serverTax : null
        );
        setApiTotal(
          serverTotal !== null && !Number.isNaN(serverTotal)
            ? serverTotal
            : null
        );

        console.log('(adjustQuantity) Panggilan API Sukses.');

        // 4. Update state HANYA setelah API sukses
        setItems((prev) => {
          const updated = prev
            .map(
              (it) =>
                it.id === id ? { ...it, qty: newQty, isApiSynced: true } : it // <-- Gunakan newQty absolut
            )
            .filter((it) => it.qty > 0);

          const stillThere = updated.find((it) => it.id === id);
          if (!stillThere) {
            setSelectedItemId(null);
            setAdjustMode(false);
          }
          return updated;
        });
        console.log(
          '%c(adjustQuantity) Selesai: State items di-update.',
          'color: blue; font-weight: bold;'
        );
      } catch (e) {
        console.error('Gagal update kuantitas:', e);
        showNotif({
          type: 'error',
          message: 'Gagal update kuantitas ke server.',
        });
        resetApiFinancials();
      } finally {
        setAddingItemId(null); // Hentikan loading
      }
    },
    [
      locked,
      adjustMode,
      selectedItemId,
      resetApiFinancials,
      session?.token,
      items,
      showNotif,
    ]
  );

  // CartContext.tsx

  const deleteSelected = useCallback(async () => {
    // <--- 1. TAMBAHKAN 'async' DI SINI!
    if (locked || !selectedItemId) {
      console.warn('(deleteSelected) Guard clause triggered. Aborting.');
      return;
    }

    console.log(
      `%c(deleteSelected) Mulai: Hapus item ${selectedItemId}`,
      'color: magenta'
    );

    const id = selectedItemId; // Simpan ID
    const item = items.find((it) => it.id === id);

    if (!item) {
      setSelectedItemId(null);
      setAdjustMode(false);
      return;
    }

    if (addingItemIdRef.current === id) {
      showNotif({ type: 'info', message: t('Cart.processing') });
      return;
    }

    // 2. KUNCI UTAMA: RESET DISKON SEKARANG JUGA!
    console.log(
      '%c(deleteSelected) RESETTING API FINANCIALS...',
      'color: red; font-weight: bold;'
    );
    resetApiFinancials();

    addingItemIdRef.current = id;
    setAddingItemId(id); // Tampilkan spinner

    try {
      const token = session?.token;
      const currentCartId = cartIdRef.current;

      if (item.isApiSynced && token && currentCartId) {
        const idToDelete = item.apiLineItemId ?? item.itemId;

        if (!idToDelete) {
          throw new Error(
            t('Cart.removeItemFailed', { name: item.name }) +
              ' (Missing Backend ID)'
          );
        }

        console.log(`(deleteSelected) Memanggil API removeItemFromCart...`);
        // 3. 'await' sekarang VALID karena fungsi ini async
        await removeItemFromCart(currentCartId, idToDelete, token);
        console.log('(deleteSelected) Panggilan API Sukses.');
      }

      // 4. Update state HANYA setelah API sukses
      setItems((prev) => prev.filter((it) => it.id !== id));
      setSelectedItemId(null);
      setAdjustMode(false);
      console.log(
        '%c(deleteSelected) Selesai: State items di-update.',
        'color: magenta; font-weight: bold;'
      );
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

      // Reset diskon jika employee diubah (mungkin mempengaruhi diskon)
      resetApiFinancials();

      const payload: AddItemPayload = {
        cart_id: currentCartId,
        product_code: item.itemId,
        quantity: item.qty,
        serving_employee_id: employeeId,
      };

      try {
        const response = await addItemToCart(payload, token);
        // sinkronisasi finansial jika server kembalikan
        const returnedCart = response?.data ?? {};
        const serverDiscount = returnedCart?.discount_amount
          ? parseFloat(String(returnedCart.discount_amount))
          : null;
        const serverSubtotal = returnedCart?.subtotal
          ? parseFloat(String(returnedCart.subtotal))
          : null;
        const serverTax = returnedCart?.tax_amount
          ? parseFloat(String(returnedCart.tax_amount))
          : null;
        const serverTotal = returnedCart?.total_amount
          ? parseFloat(String(returnedCart.total_amount))
          : null;

        if (serverDiscount !== null && !Number.isNaN(serverDiscount)) {
          setApiDiscount(serverDiscount);
        } else {
          setApiDiscount(null);
        }
        setApiSubtotal(
          serverSubtotal !== null && !Number.isNaN(serverSubtotal)
            ? serverSubtotal
            : null
        );
        setApiTax(
          serverTax !== null && !Number.isNaN(serverTax) ? serverTax : null
        );
        setApiTotal(
          serverTotal !== null && !Number.isNaN(serverTotal)
            ? serverTotal
            : null
        );

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
    [items, locked, session?.token, showNotif, t, resetApiFinancials] // <--- Hapus 'cartId' dari dependencies
  );

  // --- FUNGSI 'applyCoupon' (DIPERBAIKI) ---
  const applyCoupon = (c: Coupon, financials: ApiCartSyncData) => {
    setAppliedCoupon(c);
    // Simpan HANYA diskon dari payload
    setApiDiscount(financials.discount);
    // sinkronkan server-side totals jika disediakan
    setApiSubtotal(financials.subtotal ?? null);
    setApiTax(financials.tax ?? null);
    setApiTotal(financials.total ?? null);

    if (financials.items) {
      setItems((prevItems) => {
        const apiItemMap = new Map<string, ApiSyncedCartItem>();
        financials.items.forEach((apiItem) => {
          apiItemMap.set(apiItem.product.product_code, apiItem); // Gunakan product_code dari objek nested 'product'
        });

        return prevItems.map((localItem) => {
          const apiItem = apiItemMap.get(localItem.itemId);
          if (apiItem) {
            return {
              ...localItem,
              apiLineItemId: apiItem.item_id, // <-- Sinkronkan ID unik!
              isApiSynced: true,
            };
          }
          return localItem;
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

  // --- KALKULASI TOTAL (Sesuai logika user, tapi sinkron jika server beri angka) ---
  const localSubtotal = useMemo(
    () => items.reduce((acc, it) => acc + it.price * it.qty, 0),
    [items]
  );
  const taxRate = 0.1; // 10%
  const localTax = useMemo(() => {
    const base = localSubtotal - (apiDiscount ?? 0);
    return Math.round(base * taxRate);
  }, [localSubtotal, apiDiscount]);

  // Gunakan nilai server jika tersedia, fallback ke perhitungan lokal
  const subtotal = apiSubtotal ?? localSubtotal;
  const tax = apiTax ?? localTax;
  const discount = apiDiscount ?? 0;
  const total = apiTotal ?? Math.round(subtotal - discount + tax);

  // --- AKHIR KALKULASI ---

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
      employees,
      loadingEmployees,
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
      employees,
      loadingEmployees,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
