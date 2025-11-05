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
  applyCoupon: (c: Coupon) => void;
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

  const [cartId, setCartId] = useState<string | null>(null);
  const { session } = useSession();
  const { showNotif } = useNotification();

  const clearCartState = useCallback(() => {
    setItems([]);
    setSelectedItemId(null);
    setAdjustMode(false);
    setPaymentSheetOpen(false);
    setLocked(false);
    setAppliedCoupon(null);
    setCartId(null);
  }, []);

  const addItem = useCallback(
    async (p: CartItem) => {
      if (locked) return;
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

  const applyCoupon = (c: Coupon) => setAppliedCoupon(c);
  const clearCoupon = () => setAppliedCoupon(null);

  const products = useMemo(
    () => items.filter((it) => it.type === 'product'),
    [items]
  );
  const services = useMemo(
    () => items.filter((it) => it.type === 'service'),
    [items]
  );
  const subtotal = useMemo(
    () => items.reduce((acc, it) => acc + it.price * it.qty, 0),
    [items]
  );
  const taxRate = 0.1;
  const tax = useMemo(() => Math.round(subtotal * taxRate), [subtotal]);

  const eligibleSubtotal = useMemo(() => {
    if (!appliedCoupon) return 0;
    const filterType =
      appliedCoupon.scope === 'all'
        ? null
        : (appliedCoupon.scope as 'product' | 'service');
    const baseItems = filterType
      ? items.filter((it) => it.type === filterType)
      : items;
    return baseItems.reduce((acc, it) => acc + it.price * it.qty, 0);
  }, [items, appliedCoupon]);

  const discount = useMemo(() => {
    if (!appliedCoupon) return 0;
    let d = 0;
    if (appliedCoupon.discountType === 'percent') {
      d = Math.round((eligibleSubtotal * appliedCoupon.value) / 100);
    } else {
      d = Math.min(appliedCoupon.value, eligibleSubtotal);
    }
    if (appliedCoupon.maxDiscount) d = Math.min(d, appliedCoupon.maxDiscount);
    return d;
  }, [appliedCoupon, eligibleSubtotal]);

  const total = Math.max(0, subtotal + tax - discount);

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
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
