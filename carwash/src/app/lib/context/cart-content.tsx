'use client';

import * as React from 'react';

export interface CartItem {
  id: string;
  itemId: string;
  name: string;
  price: number;
  qty: number;
  type: 'product' | 'service';
  image?: string;
  employee?: string;
  barcode: string; // pastikan wajib string
}

interface CartContextType {
  items: CartItem[];
  products: CartItem[];
  services: CartItem[];
  selectedItemId: string | null;
  adjustMode: boolean;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  billOption: 'Dine In' | 'Take Away' | null;
  locked: boolean;
  paymentSheetOpen: boolean;
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  selectItem: (id: string) => void;
  toggleAdjust: () => void;
  adjustQuantity: (id: string, delta: number) => void;
  deleteSelected: () => void;
  setEmployee: (id: string, name: string) => void;
  formatIDR: (amount: number) => string;
  setBillOption: (option: 'Dine In' | 'Take Away') => void;
  setPaymentSheetOpen: (open: boolean) => void;
  clearCart: () => void;
}

const CartContext = React.createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(
    null
  );
  const [adjustMode, setAdjustMode] = React.useState(false);
  const [billOption, setBillOption] = React.useState<
    'Dine In' | 'Take Away' | null
  >(null);
  const [locked, setLocked] = React.useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = React.useState(false);

  const products = React.useMemo(
    () => items.filter((i) => i.type === 'product'),
    [items]
  );
  const services = React.useMemo(
    () => items.filter((i) => i.type === 'service'),
    [items]
  );

  const subtotal = React.useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
    [items]
  );
  const tax = React.useMemo(() => subtotal * 0.1, [subtotal]);
  const discount = 0;
  const total = React.useMemo(
    () => subtotal + tax - discount,
    [subtotal, tax, discount]
  );

  const addItem = React.useCallback((item: Omit<CartItem, 'qty'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const selectItem = React.useCallback((id: string) => {
    setSelectedItemId((prev) => (prev === id ? null : id));
    setAdjustMode(false);
  }, []);

  const toggleAdjust = React.useCallback(() => {
    setAdjustMode((prev) => !prev);
  }, []);

  const adjustQuantity = React.useCallback((id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i
        )
        .filter((i) => i.qty > 0)
    );
  }, []);

  const deleteSelected = React.useCallback(() => {
    if (selectedItemId) {
      setItems((prev) => prev.filter((i) => i.id !== selectedItemId));
      setSelectedItemId(null);
      setAdjustMode(false);
    }
  }, [selectedItemId]);

  const setEmployee = React.useCallback((id: string, name: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, employee: name } : i))
    );
  }, []);

  const formatIDR = React.useCallback((amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }, []);

  const clearCart = React.useCallback(() => {
    setItems([]);
    setSelectedItemId(null);
    setAdjustMode(false);
    setBillOption(null);
    setLocked(false);
  }, []);

  const value = React.useMemo(
    () => ({
      items,
      products,
      services,
      selectedItemId,
      adjustMode,
      subtotal,
      tax,
      discount,
      total,
      billOption,
      locked,
      paymentSheetOpen,
      addItem,
      selectItem,
      toggleAdjust,
      adjustQuantity,
      deleteSelected,
      setEmployee,
      formatIDR,
      setBillOption,
      setPaymentSheetOpen,
      clearCart,
    }),
    [
      items,
      products,
      services,
      selectedItemId,
      adjustMode,
      subtotal,
      tax,
      discount,
      total,
      billOption,
      locked,
      paymentSheetOpen,
      addItem,
      selectItem,
      toggleAdjust,
      adjustQuantity,
      deleteSelected,
      setEmployee,
      formatIDR,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = React.useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
