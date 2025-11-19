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
  originalPrice?: number;
  barcode?: string;
  type: ProductType;
  category: string;
  description?: string;
  qty: number;
  employeeId?: number;
  product_group_id?: number;
  isApiSynced?: boolean;
  apiLineItemId?: string; // ID unik dari baris item API
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
  adjustQuantity: (id: string, newQty: number) => Promise<void>;
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
  clearCoupon: () => Promise<string | null>;
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
  const itemsRef = useRef<CartItem[]>(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [adjustMode, setAdjustMode] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [billOption, setBillOption] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);

  // === STATE FINANSIAL ===
  const [apiDiscount, setApiDiscount] = useState<number | null>(null);
  const [apiSubtotal, setApiSubtotal] = useState<number | null>(null);
  // Fix ESLint: Gunakan koma kosong [, setter] untuk mengabaikan nilai state yang tidak dibaca
  const [, setApiTax] = useState<number | null>(null);
  const [, setApiTotal] = useState<number | null>(null);

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
      .catch((err) => console.error('Gagal fetch employees:', err))
      .finally(() => setLoadingEmployees(false));
  }, [session?.token]);

  /**
   * Reset lokal: Menghapus data finansial diskon dari tampilan (frontend only).
   */
  const resetApiFinancials = useCallback(() => {
    setApiDiscount(null);
    setApiSubtotal(null);
    setApiTax(null);
    setApiTotal(null);
    setAppliedCoupon(null);
  }, []);

  /**
   * clearCoupon (Strategi Migrasi Cart)
   */
  const clearCoupon = useCallback(async (): Promise<string | null> => {
    const token = session?.token;
    const currentItems = itemsRef.current;

    // 1. Reset tampilan Finansial Frontend dulu (Optimistic UI)
    resetApiFinancials();

    // Jika tidak ada token atau item, cukup reset visual saja
    if (!token || currentItems.length === 0) {
      setItems((prev) =>
        prev.map((it) => ({
          ...it,
          price: it.originalPrice ?? it.price, // Kembalikan harga normal
          originalPrice: undefined,
        }))
      );
      return null;
    }

    try {
      setLocked(true);

      // 2. Buat Cart BARU
      const { data: newCartData } = await createCart({ cashier_id: 1 }, token);
      const newCartId = String(newCartData.cart_id);
      console.log(
        `[ClearCoupon] Cart lama ditinggalkan. Cart baru dibuat: ${newCartId}`
      );

      // 3. Pindahkan item ke Cart Baru (Re-Sync loop)
      const newItemsState: CartItem[] = [];

      for (const item of currentItems) {
        const payload: AddItemPayload = {
          cart_id: newCartId,
          product_code: item.itemId ?? item.id,
          quantity: item.qty,
          ...(item.employeeId ? { serving_employee_id: item.employeeId } : {}),
        };

        // Add item ke cart baru
        const res = await addItemToCart(payload, token);

        // Ambil ID item baru dari response backend
        const addedItemData = res.data.items?.find(
          (i) => i.product?.product_code === (item.itemId ?? item.id)
        );

        newItemsState.push({
          ...item,
          price: item.originalPrice ?? item.price, // Harga kembali ke asal
          originalPrice: undefined,
          isApiSynced: true,
          apiLineItemId: addedItemData?.item_id, // Update ID baris baru
        });
      }

      // 4. Update State Aplikasi dengan Cart ID & Item baru
      setCartId(newCartId);
      localStorage.setItem('last_cart_id', newCartId);
      setItems(newItemsState);

      return newCartId;
    } catch (err) {
      console.error('Gagal reset cart diskon:', err);
      showNotif({
        type: 'error',
        message: 'Gagal sinkronisasi penghapusan diskon.',
      });
      // Jika gagal fatal, kosongkan cart lokal untuk keamanan data
      setItems([]);
      setCartId(null);
      return null;
    } finally {
      setLocked(false);
    }
  }, [session?.token, resetApiFinancials, showNotif]);

  const clearCartState = useCallback(
    (options: { deleteBackendCart?: boolean } = {}) => {
      const { deleteBackendCart = true } = options;
      const token = session?.token;
      const currentCartId = cartId;

      resetApiFinancials();

      setItems([]);
      setSelectedItemId(null);
      setAdjustMode(false);
      setPaymentSheetOpen(false);
      setLocked(false);
      setCartId(null);

      if (deleteBackendCart && currentCartId && token) {
        deleteCart(currentCartId, token).catch((err) =>
          console.error('Error deleting cart:', err)
        );
      }
    },
    [cartId, session?.token, resetApiFinancials]
  );

  const prevCartIdRef = useRef<string | null>(cartId);
  useEffect(() => {
    if (items.length === 0 && cartId) {
      const wasJustCreated = prevCartIdRef.current === null && cartId !== null;
      if (!wasJustCreated) {
        clearCartState({ deleteBackendCart: false });
      }
    }
    prevCartIdRef.current = cartId;
  }, [items, cartId, clearCartState]);

  const cartIdRef = useRef<string | null>(cartId);
  useEffect(() => {
    cartIdRef.current = cartId;
  }, [cartId]);

  const addingItemIdRef = useRef<string | null>(null);

  // ==========================
  // === CORE FUNCTIONS ======
  // ==========================

  const addItem = useCallback(
    async (p: CartItem) => {
      if (locked) return;
      if (addingItemIdRef.current === p.id) return;
      addingItemIdRef.current = p.id;
      setAddingItemId(p.id);

      try {
        const token = session?.token;
        if (!token) {
          showNotif({ type: 'error', message: t('Cart.loginRequired') });
          return;
        }

        let currentCartId = cartIdRef.current;

        // --- AUTO RESET COUPON ---
        if (appliedCoupon) {
          const newId = await clearCoupon();
          if (newId) {
            currentCartId = newId;
          }
        }

        if (!currentCartId) {
          try {
            const { data } = await createCart({ cashier_id: 1 }, token);
            currentCartId = String(data.cart_id);
            localStorage.setItem('last_cart_id', currentCartId);
            cartIdRef.current = currentCartId;
            setCartId(currentCartId);
          } catch (e) {
            console.error('Failed to create cart:', e);
            showNotif({ type: 'error', message: t('Cart.createCartFailed') });
            return;
          }
        }

        const currentItems = itemsRef.current;
        const found = currentItems.find((it) => it.id === p.id);
        const prevQty = found?.qty ?? 0;
        const deltaQty = 1;
        const productCode = p.itemId ?? p.id;

        let employeeId = found?.employeeId;
        if (p.type === 'service') {
          if (loadingEmployees) {
            showNotif({ type: 'error', message: t('Cart.loadingEmployees') });
            return;
          }
          if (!employeeId) {
            if (employees.length === 0) {
              showNotif({ type: 'error', message: t('Cart.noEmployees') });
              return;
            }
            employeeId = employees[0].id;
          }
        }

        const payload: AddItemPayload = {
          cart_id: currentCartId,
          product_code: productCode,
          quantity: deltaQty,
          ...(p.type === 'service' && employeeId
            ? { serving_employee_id: employeeId }
            : {}),
        };

        const response = await addItemToCart(payload, token);
        const returnedCart = response?.data ?? {};
        const returnedItem = returnedCart.items?.find(
          (item: ApiSyncedCartItem) =>
            item.product?.product_code === payload.product_code
        );

        const apiLineItemId = returnedItem?.item_id;

        setItems((prev) => {
          const foundInSetter = prev.find((it) => it.id === p.id);
          if (foundInSetter) {
            return prev.map((it) =>
              it.id === p.id
                ? {
                    ...it,
                    qty: returnedItem
                      ? returnedItem.quantity
                      : prevQty + deltaQty,
                    isApiSynced: true,
                    apiLineItemId:
                      returnedItem?.item_id ?? foundInSetter.apiLineItemId,
                    employeeId: foundInSetter.employeeId ?? employeeId,
                    // Pastikan harga menggunakan harga normal lokal jika baru di-reset
                    price: it.originalPrice ?? it.price,
                  }
                : it
            );
          }
          return [
            ...prev,
            {
              ...p,
              qty: returnedItem?.quantity ?? prevQty + deltaQty,
              isApiSynced: true,
              apiLineItemId: returnedItem?.item_id ?? apiLineItemId,
              employeeId,
            },
          ];
        });
      } catch (e) {
        console.error(e);
        showNotif({
          type: 'error',
          message: t('Cart.addItemFailed', { name: p.name }),
        });
      } finally {
        addingItemIdRef.current = null;
        setAddingItemId(null);
      }
    },
    [
      locked,
      employees,
      loadingEmployees,
      session?.token,
      showNotif,
      t,
      clearCoupon,
      appliedCoupon,
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

  const adjustQuantity = useCallback(
    async (id: string, newQty: number) => {
      if (locked || !adjustMode) return;

      let currentCartId = cartIdRef.current;

      // --- AUTO RESET COUPON ---
      if (appliedCoupon) {
        const newId = await clearCoupon();
        if (newId) currentCartId = newId;
      }

      const currentItems = itemsRef.current;
      const item = currentItems.find((it) => it.id === id);
      if (!item) return;

      const oldQty = item.qty;
      const absoluteQty = Math.max(1, Math.floor(newQty));
      const deltaQty = absoluteQty - oldQty;
      if (deltaQty === 0) return;

      const token = session?.token;
      if (!token || !currentCartId) return;

      if (deltaQty > 0) {
        // Add logic
        const payload = {
          cart_id: currentCartId,
          product_code: item.itemId ?? item.id,
          quantity: deltaQty,
          serving_employee_id: item.employeeId,
        };
        try {
          const res = await addItemToCart(payload, token);
          const updatedItem = res.data?.items?.find(
            (i: ApiSyncedCartItem) =>
              i.product.product_code === (item.itemId ?? item.id)
          );
          setItems((prev) =>
            prev.map((it) =>
              it.id === id
                ? {
                    ...it,
                    qty: updatedItem?.quantity ?? absoluteQty,
                    apiLineItemId: updatedItem?.item_id ?? it.apiLineItemId,
                  }
                : it
            )
          );
        } catch (e) {
          console.error('Adjust Quantity Add Error:', e);
          showNotif({ type: 'error', message: 'Gagal update kuantitas' });
        }
      } else {
        // Remove logic
        const removeCount = Math.abs(deltaQty);
        for (let i = 0; i < removeCount; i++) {
          try {
            await removeItemFromCart(
              currentCartId,
              item.apiLineItemId ?? item.itemId,
              token
            );
          } catch (e) {
            // Fix ESLint: gunakan variabel 'e' dengan mencetaknya
            console.warn('Remove item failed in loop:', e);
            break;
          }
        }
        setItems((prev) =>
          prev
            .map((it) =>
              it.id === id
                ? { ...it, qty: Math.max(1, absoluteQty) }
                : it
            )
            .filter((it) => it.qty > 0)
        );
      }
    },
    [
      locked,
      adjustMode,
      clearCoupon,
      session?.token,
      showNotif,
      appliedCoupon,
    ]
  );

  const deleteSelected = useCallback(async () => {
    if (locked || !selectedItemId) return;

    let currentCartId = cartIdRef.current;

    // --- AUTO RESET COUPON ---
    if (appliedCoupon) {
      const newId = await clearCoupon();
      if (newId) currentCartId = newId;
    }

    const id = selectedItemId;
    const item = itemsRef.current.find((it) => it.id === id);
    if (!item) return;

    if (addingItemIdRef.current === id) return;
    addingItemIdRef.current = id;
    setAddingItemId(id);

    try {
      const token = session?.token;
      // Gunakan ID baru jika ada reset, atau ID lama
      const activeCartId = currentCartId || cartIdRef.current;

      if (item.isApiSynced && token && activeCartId) {
        const idToDelete = item.apiLineItemId ?? item.itemId;
        await removeItemFromCart(activeCartId, idToDelete, token);
      }
      setItems((prev) => prev.filter((it) => it.id !== id));
      setSelectedItemId(null);
      setAdjustMode(false);
    } catch (err) {
      console.error('Delete selected error:', err);
      showNotif({ type: 'error', message: 'Gagal hapus item' });
    } finally {
      addingItemIdRef.current = null;
      setAddingItemId(null);
    }
  }, [
    locked,
    selectedItemId,
    clearCoupon,
    session?.token,
    showNotif,
    appliedCoupon,
  ]);

  const setEmployee = useCallback(
    async (itemId: string, employeeId: number) => {
      if (locked) return;
      const item = itemsRef.current.find((it) => it.id === itemId);
      if (!item || item.employeeId === employeeId) return;

      const token = session?.token;
      if (!token) return;

      let currentCartId = cartIdRef.current;

      // --- AUTO RESET COUPON ---
      if (appliedCoupon) {
        const newId = await clearCoupon();
        if (newId) currentCartId = newId;
      }

      // Jika cart belum ada, buat baru (edge case)
      if (!currentCartId) {
        try {
          const { data } = await createCart({ cashier_id: 1 }, token);
          currentCartId = String(data.cart_id);
          setCartId(currentCartId);
        } catch (e) {
          console.error('Failed to create cart in setEmployee:', e);
          return;
        }
      }

      try {
        // Remove old line item
        if (item.apiLineItemId) {
          try {
            await removeItemFromCart(currentCartId, item.apiLineItemId, token);
          } catch (err) {
            console.warn('Gagal remove existing line before re-adding:', err);
          }
        }
        // Add new with employee
        const payload = {
          cart_id: currentCartId,
          product_code: item.itemId ?? item.id,
          quantity: item.qty,
          serving_employee_id: employeeId,
        };
        const res = await addItemToCart(payload, token);
        const updatedItem = res.data?.items?.find(
          (i: ApiSyncedCartItem) =>
            i.product.product_code === item.itemId &&
            i.serving_employee_id === employeeId
        );

        setItems((prev) =>
          prev.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  employeeId,
                  isApiSynced: true,
                  apiLineItemId: updatedItem?.item_id,
                }
              : it
          )
        );
        showNotif({ type: 'success', message: t('Cart.employeeAssigned') });
      } catch (e) {
        console.error('Set employee error:', e);
        showNotif({
          type: 'error',
          message: t('Cart.assignEmployeeFailed'),
        });
      }
    },
    [locked, session?.token, showNotif, t, clearCoupon, appliedCoupon]
  );

  // applyCoupon Logic (Normal)
  const applyCoupon = useCallback(
    (c: Coupon, financials: ApiCartSyncData) => {
      const uniqueDiscountIds = new Set(
        financials.items
          .filter((i) => i.discount)
          .map((i) => i.discount)
      );
      // Jika backend mendeteksi >1 diskon (stacking tidak sengaja), reset cart
      if (uniqueDiscountIds.size > 1) {
        showNotif({
          type: 'error',
          message:
            'Terdeteksi diskon ganda. Mereset keranjang untuk konsistensi...',
        });
        clearCoupon();
        return;
      }
      setAppliedCoupon(c);
      setApiDiscount(financials.discount);
      setApiSubtotal(financials.subtotal);
      setApiTax(financials.tax);
      setApiTotal(financials.total);

      if (financials.items) {
        setItems((prev) => {
          const map = new Map();
          financials.items.forEach((i) => map.set(i.product.product_code, i));
          return prev.map((loc) => {
            const api = map.get(loc.itemId);
            if (api) {
              return {
                ...loc,
                originalPrice:
                  typeof loc.originalPrice === 'number'
                    ? loc.originalPrice
                    : loc.price,
                price: parseFloat(api.unit_price), // Harga setelah diskon
                isApiSynced: true,
                apiLineItemId: api.item_id,
                qty: api.quantity,
              };
            }
            return loc;
          });
        });
      }
    },
    [clearCoupon, showNotif]
  );

  // ... sisa kalkulasi total & value provider ...
  const products = useMemo(
    () => items.filter((it) => it.type === 'product'),
    [items]
  );
  const services = useMemo(
    () => items.filter((it) => it.type === 'service'),
    [items]
  );

  // === KALKULASI TOTAL (MANUAL & SESUAI REQUEST) ===
  const localSubtotal = useMemo(() => {
    return items.reduce(
      (acc, it) => acc + (it.originalPrice ?? it.price) * it.qty,
      0
    );
  }, [items]);

  const taxRate = 0.1; // 10%

  // 1. Subtotal Murni (Harga Barang Asli)
  const subtotal = apiSubtotal ?? localSubtotal;

  // 2. Pajak (10% dari Subtotal Murni)
  // Kita hanya perlu setApiTax agar state tersimpan, tapi untuk kalkulasi UI
  // kita hitung manual agar konsisten dengan aturan Total = Barang + Pajak - Diskon.
  // Variabel apiTax diabaikan dalam dependency karena kita ingin memaksakan logika ini.
  const tax = useMemo(() => {
    return Math.round(subtotal * taxRate);
  }, [subtotal]);

  // 3. Diskon (Nominal)
  const discount = apiDiscount ?? 0;

  // 4. Total Akhir = (Subtotal + Pajak) - Diskon
  const total = useMemo(() => {
    const grossTotal = subtotal + tax;
    const netTotal = grossTotal - discount;
    return Math.max(0, netTotal); // Mencegah minus
  }, [subtotal, tax, discount]);
  // --- AKHIR KALKULASI TOTAL ---

  const repeatRound = useCallback(() => {
    if (!locked)
      setItems((p) => p.map((i) => ({ ...i, qty: i.qty + 1 })));
  }, [locked]);

  const voidOrder = useCallback(
    () => clearCartState({ deleteBackendCart: false }),
    [clearCartState]
  );

  const formatIDR = (v: number) => `Rp${v.toLocaleString('id-ID')}`;

  const addOrder = useCallback(
    (order: OrderItem) => setOrders((p) => [...p, order]),
    []
  );

  const updateOrderStatus = useCallback(
    (id: string, st: OrderItem['status']) =>
      setOrders((p) =>
        p.map((o) => (o.id === id ? { ...o, status: st } : o))
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
      applyCoupon,
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