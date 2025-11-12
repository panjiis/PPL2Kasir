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

  // === STATE FINANSIAL (frontend memo + server sync) ===
  const [apiDiscount, setApiDiscount] = useState<number | null>(null);
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

      resetApiFinancials();

      setItems([]);
      setSelectedItemId(null);
      setAdjustMode(false);
      setPaymentSheetOpen(false);
      setLocked(false);
      setCartId(null);

      if (deleteBackendCart && currentCartId && token) {
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
      }
    },
    [cartId, session?.token, resetApiFinancials]
  );

  const prevCartIdRef = useRef<string | null>(cartId);
  useEffect(() => {
    if (items.length === 0 && cartId) {
      const wasJustCreated = prevCartIdRef.current === null && cartId !== null;

      if (wasJustCreated) {
        console.log(`(useEffect) Cart ${cartId} baru dibuat, skip hapus.`);
      } else {
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

  // ==========================
  // === CORE FUNCTIONS ======
  // ==========================

  // === FIXED addItem (pakai delta, bukan absolut) ===
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

        // ensure cart exists
        let currentCartId = cartIdRef.current;
        if (!currentCartId) {
          try {
            const { data } = await createCart({ cashier_id: 1 }, token);
            currentCartId = String(data.cart_id);
            localStorage.setItem('last_cart_id', currentCartId);
            cartIdRef.current = currentCartId;
            setCartId(currentCartId);
          } catch (e) {
            console.error(e);
            showNotif({ type: 'error', message: t('Cart.createCartFailed') });
            return;
          }
        }

        const currentItems = itemsRef.current;
        const found = currentItems.find((it) => it.id === p.id);
        const prevQty = found?.qty ?? 0;
        const deltaQty = 1; // selalu add +1
        const productCode = p.itemId ?? p.id;

        // if service, ensure employee
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

        // call API
        const response = await addItemToCart(payload, token);
        const returnedCart = response?.data ?? {};

        // update financials from server if present
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

        setApiSubtotal(
          serverSubtotal !== null && !Number.isNaN(serverSubtotal)
            ? serverSubtotal
            : null
        );
        setApiTax(serverTax !== null && !Number.isNaN(serverTax) ? serverTax : null);
        setApiDiscount(
          serverDiscount !== null && !Number.isNaN(serverDiscount)
            ? serverDiscount
            : null
        );
        setApiTotal(serverTotal !== null && !Number.isNaN(serverTotal) ? serverTotal : null);

        const returnedItem = returnedCart.items?.find(
          (item: ApiSyncedCartItem) =>
            item.product?.product_code === payload.product_code
        );

        const apiLineItemId = returnedItem?.item_id;

        // update local state based on server response (prefer server values)
        setItems((prev) => {
          const foundInSetter = prev.find((it) => it.id === p.id);
          if (foundInSetter) {
            if (returnedItem) {
              return prev.map((it) =>
                it.id === p.id
                  ? {
                      ...it,
                      qty: returnedItem.quantity,
                      price: parseFloat(returnedItem.unit_price),
                      isApiSynced: true,
                      apiLineItemId: returnedItem.item_id,
                      employeeId: returnedItem ? (employeeId ?? it.employeeId) : it.employeeId,
                    }
                  : it
              );
            }
            // fallback
            return prev.map((it) =>
              it.id === p.id
                ? {
                    ...it,
                    qty: prevQty + deltaQty,
                    isApiSynced: true,
                    apiLineItemId: apiLineItemId ?? foundInSetter.apiLineItemId,
                    employeeId: foundInSetter.employeeId ?? employeeId,
                  }
                : it
            );
          }
          // new item
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
        console.error('Error in addItem:', e);
        const errMsg =
          e instanceof Error ? e.message : t('Cart.addItemFailed', { name: p.name });
        showNotif({ type: 'error', message: errMsg });
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
      resetApiFinancials,
    ]
  );

  // selectItem & toggleAdjust
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

  // --- PERBAIKAN UTAMA: adjustQuantity ---
  const adjustQuantity = useCallback(
    async (id: string, newQty: number) => {
      if (locked || !adjustMode) {
        console.warn('(adjustQuantity) Guard clause triggered. Aborting.');
        return;
      }

      const currentItems = itemsRef.current;
      const item = currentItems.find((it) => it.id === id);
      if (!item) {
        showNotif({ type: 'error', message: 'Item tidak ditemukan.' });
        return;
      }

      const oldQty = item.qty;
      const absoluteQty = Math.max(1, Math.floor(newQty));
      const deltaQty = absoluteQty - oldQty;
      if (deltaQty === 0) return;

      const token = session?.token;
      const currentCartId = cartIdRef.current;
      if (!token || !currentCartId) {
        showNotif({ type: 'error', message: 'Keranjang atau token tidak ditemukan.' });
        return;
      }

      resetApiFinancials();

      // === NAIK KUANTITAS ===
      if (deltaQty > 0) {
        const payload: AddItemPayload = {
          cart_id: currentCartId,
          product_code: item.itemId ?? item.id,
          quantity: deltaQty,
          ...(item.type === 'service' && item.employeeId
            ? { serving_employee_id: item.employeeId }
            : {}),
        };

        try {
          const response = await addItemToCart(payload, token);
          const returnedCart = response?.data ?? {};

          // update financials from server
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

          setApiSubtotal(
            serverSubtotal !== null && !Number.isNaN(serverSubtotal)
              ? serverSubtotal
              : null
          );
          setApiTax(serverTax !== null && !Number.isNaN(serverTax) ? serverTax : null);
          setApiDiscount(
            serverDiscount !== null && !Number.isNaN(serverDiscount)
              ? serverDiscount
              : null
          );
          setApiTotal(serverTotal !== null && !Number.isNaN(serverTotal) ? serverTotal : null);

          const updatedItem = returnedCart.items?.find(
            (i: ApiSyncedCartItem) =>
              i.product?.product_code === (item.itemId ?? item.id)
          );

          setItems((prev) =>
            prev.map((it) =>
              it.id === id
                ? {
                    ...it,
                    qty: updatedItem?.quantity ?? absoluteQty,
                    price: parseFloat(updatedItem?.unit_price ?? String(it.price)),
                    isApiSynced: true,
                    apiLineItemId: updatedItem?.item_id ?? it.apiLineItemId,
                  }
                : it
            )
          );
        } catch (err) {
          console.error('Gagal tambah qty:', err);
          showNotif({ type: 'error', message: 'Gagal menambah kuantitas.' });
        }
      }

      // === TURUN KUANTITAS ===
      else if (deltaQty < 0) {
        // for reducing, API expects delete calls per line item (as library shows).
        // If server supports absolute set, you could call it instead — here we keep remove loop.
        const removeCount = Math.abs(deltaQty);

        for (let i = 0; i < removeCount; i++) {
          try {
            await removeItemFromCart(
              currentCartId,
              item.apiLineItemId ?? item.itemId,
              token
            );
          } catch (err) {
            console.error('Gagal mengurangi qty:', err);
            showNotif({
              type: 'error',
              message: 'Gagal mengurangi kuantitas.',
            });
            break;
          }
        }

        // update local state
        setItems((prev) =>
          prev
            .map((it) =>
              it.id === id ? { ...it, qty: Math.max(1, absoluteQty), isApiSynced: true } : it
            )
            .filter((it) => it.qty > 0)
        );
      }
    },
    [locked, adjustMode, resetApiFinancials, session?.token, showNotif]
  );
  // --- AKHIR PERBAIKAN ---

  const deleteSelected = useCallback(async () => {
    if (locked || !selectedItemId) {
      console.warn('(deleteSelected) Guard clause triggered. Aborting.');
      return;
    }

    const id = selectedItemId;
    const item = itemsRef.current.find((it) => it.id === id);

    if (!item) {
      setSelectedItemId(null);
      setAdjustMode(false);
      return;
    }

    if (addingItemIdRef.current === id) {
      showNotif({ type: 'info', message: t('Cart.processing') });
      return;
    }

    resetApiFinancials();

    addingItemIdRef.current = id;
    setAddingItemId(id);

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

        await removeItemFromCart(currentCartId, idToDelete, token);
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
    session?.token,
    showNotif,
    t,
  ]);

  const setEmployee = useCallback(
    async (itemId: string, employeeId: number) => {
      if (locked) return;

      const token = session?.token;
      const currentCartId = cartIdRef.current;
      const item = itemsRef.current.find((it) => it.id === itemId);

      if (!token || !currentCartId || !item) {
        showNotif({ type: 'error', message: t('Cart.itemNotFound') });
        return;
      }

      // kalau employee-nya sama, tidak perlu apa-apa
      if (item.employeeId === employeeId) return;

      resetApiFinancials();

      try {
        // 1) Hapus baris item di backend (jika ada)
        if (item.apiLineItemId) {
          try {
            await removeItemFromCart(currentCartId, item.apiLineItemId, token);
          } catch (err) {
            // jika gagal hapus, jangan crash — lanjut cobalah re-add
            console.warn('Gagal remove existing line before re-adding:', err);
          }
        }

        // 2) Re-add item with same qty but new employee
        const payload: AddItemPayload = {
          cart_id: currentCartId,
          product_code: item.itemId ?? item.id,
          quantity: item.qty,
          serving_employee_id: employeeId,
        };

        const response = await addItemToCart(payload, token);
        const returnedCart = response?.data ?? {};

        // update financials from server
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

        setApiSubtotal(
          serverSubtotal !== null && !Number.isNaN(serverSubtotal)
            ? serverSubtotal
            : null
        );
        setApiTax(serverTax !== null && !Number.isNaN(serverTax) ? serverTax : null);
        setApiDiscount(
          serverDiscount !== null && !Number.isNaN(serverDiscount)
            ? serverDiscount
            : null
        );
        setApiTotal(serverTotal !== null && !Number.isNaN(serverTotal) ? serverTotal : null);

        const updatedItem = returnedCart.items?.find(
          (apiItem: ApiSyncedCartItem) =>
            apiItem.product?.product_code === item.itemId
        );

        // update local state
        setItems((prev) =>
          prev.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  employeeId,
                  qty: updatedItem?.quantity ?? it.qty,
                  price: parseFloat(updatedItem?.unit_price ?? String(it.price)),
                  isApiSynced: true,
                  apiLineItemId: updatedItem?.item_id ?? it.apiLineItemId,
                }
              : it
          )
        );

        showNotif({ type: 'success', message: t('Cart.employeeAssigned') });
      } catch (e) {
        console.error('Gagal update pegawai:', e);
        showNotif({
          type: 'error',
          message: e instanceof Error ? e.message : t('Cart.assignEmployeeFailed'),
        });
      }
    },
    [locked, session?.token, showNotif, t, resetApiFinancials]
  );

  const applyCoupon = (c: Coupon, financials: ApiCartSyncData) => {
    setAppliedCoupon(c);
    setApiDiscount(financials.discount);
    setApiSubtotal(financials.subtotal ?? null);
    setApiTax(financials.tax ?? null);
    setApiTotal(financials.total ?? null);

    if (financials.items) {
      setItems((prevItems) => {
        const apiItemMap = new Map<string, ApiSyncedCartItem>();
        financials.items.forEach((apiItem) => {
          apiItemMap.set(apiItem.product.product_code, apiItem);
        });

        return prevItems.map((localItem) => {
          const apiItem = apiItemMap.get(localItem.itemId);
          if (apiItem) {
            return {
              ...localItem,
              qty: apiItem.quantity,
              price: parseFloat(apiItem.unit_price),
              isApiSynced: true,
              apiLineItemId: apiItem.item_id,
            };
          }
          return localItem;
        });
      });
    }
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

  const localTax = useMemo(() => {
    return Math.round(localSubtotal * taxRate);
  }, [localSubtotal]);

  const subtotal = apiSubtotal ?? localSubtotal;
  const tax = apiTax ?? localTax;
  const discount = apiDiscount ?? 0;
  const total = apiTotal ?? Math.round(subtotal - discount + tax);

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
      adjustQuantity, // Sudah diperbaiki
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
