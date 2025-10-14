'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import {
  Trash,
  Columns3,
  Lock,
  RefreshCcw,
  CircleSlash,
  Tags,
  Box,
  Wrench,
  CreditCard,
  QrCode,
  Banknote,
} from 'lucide-react';
import { useCart } from './cart-content';
import { employees, type Coupon } from './dummy';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNotification } from './notification-context';
import { usePreferences } from '../providers/preferences-context';
import { useSession } from '../lib/context/session';
import {
  createCart,
  addItemToCart,
  createOrderFromCart,
  processPayment as processPaymentApi,
  applyDiscount as applyDiscountApi,
  validateDiscount as validateDiscountApi,
  voidOrder as voidOrderApi,
  
  createPaymentType as createPaymentTypeApi,
} from '../lib/utils/pos-api';

interface AddItemPayload {
  cart_id: string;
  product_id: number;
  quantity: number;
  serving_employee_id?: number;
}

export interface DiscountPayload {
  cart_id: string;
  discount_id: number;
  item_ids: string[]; // ✅ sesuai API kamu — harus string[]
}
/* ======================================================== */
/* UI subcomponents (kept same layout & behavior) */
/* - SmallPill, LineItem, ProductSection, ServicesSection, */
/* CouponPanel, BillOptionSection */
/* ======================================================== */

function SmallPill({
  prefKey,
  defaultLabel,
  icon,
  onClick,
  forceColorFrom,
}: {
  prefKey: string;
  defaultLabel: string;
  icon: React.ReactNode;
  onClick?: (() => void) | undefined;
  forceColorFrom?: string | undefined;
}) {
  const { isCustomize, getButtonLabel, setButtonPref, getButtonColorClasses } =
    usePreferences();
  const label = getButtonLabel(prefKey, defaultLabel);
  const color = getButtonColorClasses(forceColorFrom ?? prefKey);

  return (
    <div className='flex flex-col items-start gap-1'>
      <button
        type='button'
        onClick={onClick}
        className={[
          'inline-flex items-center h-6 px-2 rounded-md justify-center font-rubik  tracking-wide text-sm',
          color.bg,
          color.text,
        ].join(' ')}
      >
        <div className='grid h-6 w-6 place-items-center text-[10px] leading-none'>
          {icon}
        </div>
        {label}
      </button>
      {isCustomize && (
        <div className='flex items-center gap-2 bg-muted px-2 py-1 rounded-md '>
          <input
            className='w-24 rounded border border-border bg-card text-xs px-2 py-0.5'
            defaultValue={label}
            onBlur={(e) =>
              setButtonPref(prefKey, { label: e.currentTarget.value })
            }
          />
        </div>
      )}
    </div>
  );
}

function LineItem({
  name,
  price,
  qty,
  selected,
  onSelect,
  allowAdjust,
  extraRight,
  onSetQty,
}: {
  name: string;
  price: number;
  qty: number;
  selected: boolean;
  onSelect: () => void;
  allowAdjust: boolean;
  extraRight?: React.ReactNode;
  onSetQty?: (newQty: number) => void;
}) {
  const [inputQty, setInputQty] = useState<string>(qty.toString());

  useEffect(() => {
    setInputQty(qty.toString());
  }, [qty, selected, allowAdjust]);

  useEffect(() => {
    if (allowAdjust && selected) {
      setInputQty('');
    } else {
      setInputQty(qty.toString());
    }
  }, [allowAdjust, selected, qty]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setInputQty(val);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSetQty && allowAdjust && selected) {
      const newQty = Math.max(1, Number(inputQty) || qty);
      if (newQty !== qty) onSetQty(newQty);
    }
  };

  const handleBlur = () => {
    setInputQty(qty.toString());
  };

  return (
    <div
      className={`flex items-start gap-3  ${
        selected ? 'ring-2' : ''
      } border-border bg-card p-2`}
    >
      <button
        type='button'
        onClick={onSelect}
        className='mt-0.5 grid h-6 w-6 place-items-center  text-foreground'
        aria-pressed={selected}
        aria-label={selected ? 'Deselect item' : 'Select item'}
      >
        {selected ? '✓' : '□'}
      </button>
      <div className='flex-1'>
        <div className='text-xs text-foreground font-medium font-rubik line-clamp-1'>
          {name}
        </div>
        <div className='mt-1 text-[11px] text-muted-foreground'>
          Rp{price.toLocaleString('id-ID')} × {qty} ={' '}
          <span className='font-rubik font-semibold'>
            Rp{(price * qty).toLocaleString('id-ID')}
          </span>
        </div>
      </div>
      <div className='ml-auto flex items-center gap-2'>
        <input
          type='number'
          min={1}
          className='w-14 h-6 rounded-md border border-border px-1 text-center text-xs outline-none disabled:bg-muted disabled:opacity-60'
          value={inputQty}
          disabled={!allowAdjust || !selected}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleBlur}
        />
        {extraRight}
      </div>
    </div>
  );
}

function ProductSection() {
  const {
    products,
    selectedItemId,
    selectItem,
    adjustMode,
    adjustQuantity,
    locked,
  } = useCart();
  return (
    <fieldset className='rounded-lg border border-border bg-secondary p-3'>
      <legend className='px-2 text-sm text-muted-foreground'>
        Section label product
      </legend>
      <div className='space-y-3 max-h-[120px] overflow-y-auto'>
        {products.length === 0 ? (
          <div className='text-xs text-muted-foreground'>
            Belum ada product.
          </div>
        ) : (
          products.map((it) => (
            <LineItem
              key={it.id}
              name={it.name}
              price={it.price}
              qty={it.qty}
              selected={selectedItemId === it.id}
              onSelect={() =>
                !locked && selectItem(selectedItemId === it.id ? null : it.id)
              }
              allowAdjust={adjustMode && !locked}
              onSetQty={(newQty) =>
                adjustMode &&
                !locked &&
                selectedItemId === it.id &&
                newQty > 0 &&
                adjustQuantity(it.id, newQty - it.qty)
              }
            />
          ))
        )}
      </div>
    </fieldset>
  );
}

function ServicesSection() {
  const {
    services,
    selectedItemId,
    selectItem,
    adjustMode,
    adjustQuantity,
    setEmployee,
    locked,
  } = useCart();
  return (
    <fieldset className='rounded-lg border border-border bg-secondary p-1'>
      <legend className='px-2 text-sm text-muted-foreground'>
        Section label services
      </legend>
      <div className='space-y-3 max-h-[120px] overflow-y-auto'>
        {services.length === 0 ? (
          <div className='text-xs text-muted-foreground'>
            Belum ada service.
          </div>
        ) : (
          services.map((it) => (
            <LineItem
              key={it.id}
              name={it.name}
              price={it.price}
              qty={it.qty}
              selected={selectedItemId === it.id}
              onSelect={() =>
                !locked && selectItem(selectedItemId === it.id ? null : it.id)
              }
              allowAdjust={adjustMode && selectedItemId === it.id && !locked}
              onSetQty={(newQty) =>
                adjustMode &&
                !locked &&
                selectedItemId === it.id &&
                newQty > 0 &&
                adjustQuantity(it.id, newQty - it.qty)
              }
              extraRight={
                <div className='inline-flex items-center gap-2'>
                  <Select
                    value={it.employee || ''}
                    onValueChange={(val) => setEmployee(it.id, val)}
                    disabled={locked}
                  >
                    <SelectTrigger className='h-7 px-2 py-1 text-xs border border-border bg-card text-foreground'>
                      <SelectValue placeholder='Employee' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {employees.map((e) => (
                          <SelectItem key={e} value={e} className='text-xs'>
                            {e}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              }
            />
          ))
        )}
      </div>
    </fieldset>
  );
}

function CouponPanel({ onSelect }: { onSelect: (c: Coupon) => void }) {
  const { appliedCoupon, clearCoupon } = useCart();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'product' | 'service'>('all');
  const [codeInput, setCodeInput] = useState('');

  const coupons: Coupon[] = [
    {
      id: 'c-all-10',
      code: 'ALL10',
      label: 'Diskon 10% Semua Item',
      scope: 'all',
      discountType: 'percent',
      value: 10,
      maxDiscount: 50000,
    },
    {
      id: 'c-prod-20k',
      code: 'PROD20K',
      label: 'Potongan Rp20.000 untuk Produk',
      scope: 'product',
      discountType: 'amount',
      value: 20000,
    },
    {
      id: 'c-serv-15',
      code: 'SERV15',
      label: 'Diskon 15% untuk Service',
      scope: 'service',
      discountType: 'percent',
      value: 15,
      maxDiscount: 40000,
    },
    {
      id: 'c-all-30k',
      code: 'ALL30K',
      label: 'Potongan Rp30.000 Semua Item',
      scope: 'all',
      discountType: 'amount',
      value: 30000,
    },
  ];

  const filtered = coupons.filter((c) => {
    const okType = filter === 'all' ? true : c.scope === filter;
    const q = codeInput.trim().toLowerCase();
    const hay = `${c.code} ${c.label}`.toLowerCase();
    const okSearch = q ? hay.includes(q) : true;
    return okType && okSearch;
  });

  const filterOptions = [
    {
      key: 'all',
      label: 'Semua',
      icon: <Tags className='w-4 h-4 mr-2 inline' />,
    },
    {
      key: 'product',
      label: 'Produk',
      icon: <Box className='w-4 h-4 mr-2 inline' />,
    },
    {
      key: 'service',
      label: 'Service',
      icon: <Wrench className='w-4 h-4 mr-2 inline' />,
    },
  ];

  return (
    <div className='rounded-lg border border-border bg-card p-3 space-y-3 relative'>
      <div className='flex gap-2'>
        <div className='relative min-w-[20px]'>
          <button
            type='button'
            onClick={() => setOpen((s) => !s)}
            className='w-fit inline-flex items-center justify-between rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground'
          >
            <>{filterOptions.find((f) => f.key === filter)?.icon}</>
            <span className='ml-2 text-xs'>▾</span>
          </button>
          {open && (
            <div className='absolute left-0 mt-2 w-44 rounded-md border border-border bg-card shadow z-20'>
              {filterOptions.map((t) => (
                <button
                  key={t.key}
                  type='button'
                  onClick={() => {
                    setFilter(t.key as typeof filter);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary ${
                    filter === t.key ? 'bg-muted font-semibold font-rubik' : ''
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className='flex-1 flex rounded-md border border-border bg-secondary overflow-hidden min-w-[140px]'>
          <input
            type='text'
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder='Masukkan kode'
            className='flex-1 bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground min-w-[420px]'
            style={{ minWidth: '100px', fontSize: '1rem' }}
          />
        </div>
      </div>

      <div className='max-h-40 overflow-auto rounded-md border border-border/30 p-2 space-y-2 bg-secondary'>
        {filtered.length === 0 ? (
          <div className='text-xs text-muted-foreground'>Tidak ada kupon.</div>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              type='button'
              onClick={() => onSelect(c)}
              className='w-full rounded border border-border/40 bg-card px-2 py-2 text-left hover:bg-secondary transition'
            >
              <div className='text-xs font-rubik font-semibold text-foreground'>
                {c.code}
              </div>
              <div className='text-[11px] text-muted-foreground'>
                {c.label} •{' '}
                {c.scope === 'all'
                  ? 'Semua'
                  : c.scope === 'product'
                  ? 'Produk'
                  : 'Service'}
              </div>
            </button>
          ))
        )}
      </div>

      {appliedCoupon ? (
        <div className='flex items-center justify-between rounded-md border border-border bg-secondary px-3 py-2 text-sm'>
          <div>
            <div className='font-semibold font-rubik  text-foreground'>
              {appliedCoupon.code}
            </div>
            <div className='text-[11px] text-muted-foreground'>
              {appliedCoupon.label}
            </div>
          </div>
          <button
            type='button'
            onClick={clearCoupon}
            className='ml-2 rounded border border-border px-2 py-1 text-[11px] text-foreground hover:bg-muted'
          >
            Remove
          </button>
        </div>
      ) : (
        <div className='text-[11px] text-muted-foreground'>
          Belum ada kupon diterapkan.
        </div>
      )}
    </div>
  );
}

function BillOptionSection({ onVoid }: { onVoid: () => void }) {
  const { billOption, setBillOption, locked, setLocked, repeatRound } =
    useCart();
  const { isCustomize, getButtonLabel, getButtonColorClasses, setButtonPref } =
    usePreferences();
  const options = [
    { key: 'lock', label: 'Lock', value: 'Lock' },
    { key: 'repeat', label: 'Repeat', value: 'repeat' },
    { key: 'void', label: 'Void', value: 'void' },
  ];
  const getIcon = (key: string) => {
    switch (key) {
      case 'lock':
        return <Lock className='h-6 w-6' />;
      case 'repeat':
        return <RefreshCcw className='h-6 w-6' />;
      case 'void':
        return <CircleSlash className='h-6 w-6' />;
      default:
        return null;
    }
  };
  return (
    <div className='grid grid-cols-3 gap-3 bg-secondary p-3 rounded-lg'>
      {options.map((opt) => {
        const active =
          (opt.value === 'Lock' && locked) ||
          (billOption === opt.value && opt.value !== 'Lock');

        const prefKey = `aside:bill:${opt.key}`;
        const shown = getButtonLabel(prefKey, opt.label);
        const color = getButtonColorClasses(prefKey);

        return (
          <div key={opt.value} className='rounded-lg  p-2'>
            <button
              type='button'
              className={[
                'rounded-lg p-3 text-center transition w-full',
                color.bg,
                color.text,
                active ? 'ring-2' : '',
              ].join(' ')}
              onClick={() => {
                setBillOption(opt.value as 'Dine In' | 'Take Away' | null);
                if (opt.value === 'Lock') setLocked(!locked);
                else if (opt.value === 'repeat') repeatRound();
                else if (opt.value === 'void') {
                  if (window.confirm('Yakin void order ini?')) onVoid();
                }
              }}
            >
              <div className='mx-auto mb-2 grid h-10 w-10 place-items-center rounded-md text-current'>
                {getIcon(opt.key)}
              </div>
              <div className='text-xs'>{shown}</div>
            </button>

            {isCustomize && (
              <div className='mt-2 space-y-2'>
                <input
                  className='w-full rounded-md border border-border bg-card text-foreground text-xs px-2 py-1'
                  defaultValue={shown}
                  onBlur={(e) =>
                    setButtonPref(prefKey, { label: e.currentTarget.value })
                  }
                />
                <div className='flex flex-wrap gap-1'></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* =========================== */
/* Main AsideMock component (full) */
/* =========================== */

export default function AsideMock(): React.ReactElement {
  const {
    deleteSelected,
    toggleAdjust,
    adjustMode,
    subtotal,
    tax,
    discount,
    total,
    formatIDR,
    paymentSheetOpen,
    setPaymentSheetOpen,
    setAdjustMode,
    setSelectedItemId,
    setItems,
    locked,
    orders,
    setLocked,
    addOrder,
    items,
    appliedCoupon,
    applyCoupon,
    clearCoupon,
    // clearCart,
  } = useCart();

  const { showNotif } = useNotification();
  const { session } = useSession();
  const token = session?.token ?? '';

  // State tambahan payment & status sheet
  const [paymentType, setPaymentType] = useState<'cash' | 'credit' | 'qris'>(
    'cash'
  );
  const [paymentBank, setPaymentBank] = useState('');
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const statuses = ['In Queue', 'In Process', 'Waiting Payment'] as const;

  function clearAll() {
    setItems([]);
    setSelectedItemId(null);
    setAdjustMode(false);
    setPaymentSheetOpen(false);
    setPaymentType('cash');
    setPaymentBank('');
    setLocked(false); // ✅ tambahkan ini
  }

  const [time, setTime] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // ----------------------- */
  // Process payment flow */
  // ----------------------- */
  async function handleProcessPayment(): Promise<void> {
    if (items.length === 0) {
      showNotif({
        type: 'error',
        message: 'Cart kosong, tidak ada yang diproses.',
      });
      return;
    }

    // ---- VALIDATION LOGIC START ----
    if (appliedCoupon) {
      setBusy(true);
      showNotif({ type: 'info', message: 'Validating discount...' });

      try {
        const discountId = 1; // Placeholder for discount ID from coupon object
        const firstItem = items[0];

        if (!firstItem) {
          throw new Error('Cannot validate discount on an empty cart.');
        }

        const productId = Number(firstItem.itemId ?? firstItem.id) || 0;
        const res = await validateDiscountApi(
          {
            discount_id: discountId,
            product_id: productId,
            quantity: firstItem.qty,
          },
          token
        );

        if (!res.success) {
          showNotif({
            type: 'error',
            message:
              'Discount is not valid. Please select another one and try again.',
          });
          setBusy(false);
          setPaymentSheetOpen(false); // Close payment sheet
          return; // Stop the process
        }
        showNotif({ type: 'success', message: 'Discount validated.' });
      } catch (err) {
        console.error(err);
        showNotif({
          type: 'error',
          message: 'Error validating discount. Please try again.',
        });
        setBusy(false);
        return; // Stop on error
      }
    }
    // ---- VALIDATION LOGIC END ----

    setBusy(true);
    setLocked(true); // 🔒 kunci sementara agar tidak dobel klik

    try {
      setPaymentSheetOpen(false);

      const { data: cart } = await createCart({ cashier_id: 1 }, token);
      const cartId = String(cart.id);

      for (const it of items) {
        const productId = Number(it.itemId ?? it.id) || Number(it.id) || 0;
        const payload: AddItemPayload = {
          cart_id: cartId,
          product_id: productId,
          quantity: it.qty,
          serving_employee_id: undefined,
        };
        await addItemToCart(
          { id: `${cartId}-${productId}-${Date.now()}`, ...payload },
          token
        );
      }

      const { data: order } = await createOrderFromCart(
        {
          cart_id: cartId,
          document_number: `INV-${Date.now()}`,
          additional_info: 'Generated by POS aside',
          notes: `Payment type: ${paymentType}`,
        },
        token
      );

      const createdOrderId = order.id;
      const paymentTypeId =
        paymentType === 'cash' ? 1 : paymentType === 'credit' ? 2 : 3;

      await processPaymentApi(
        {
          order_id: createdOrderId,
          paid_amount: String(total),
          payment_type_id: paymentTypeId,
          reference_number: `TRX-${Date.now()}`,
        },
        token
      );

      addOrder({
        id: String(createdOrderId),
        orderNo: order.document_number ?? `INV-${createdOrderId}`,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        items: [...items],
        status: paymentType === 'cash' ? 'Done' : 'Waiting Payment',
        paymentType,
        paymentBank: paymentType === 'credit' ? paymentBank : undefined,
        total,
      });

      showNotif({
        type: 'success',
        message: `Order ${createdOrderId} processed. Payment OK`,
        amount: total,
        method: paymentType,
      });

      // ✅ sukses -> reset & unlock
      clearAll();
    } catch (err) {
      console.error(err);

      // ⚠️ gagal -> jangan di-lock
      setLocked(false);

      showNotif({
        type: 'error',
        message:
          'Gagal memproses pembayaran. Kamu bisa ubah pesanan dan coba lagi.',
      });
    } finally {
      setBusy(false);
    }
  }

  // ----------------------- */
  // Void & Return & Discount handlers */
  // ----------------------- */
  async function handleVoidOrder(): Promise<void> {
    const confirmVoid = window.confirm('Yakin void order ini?');
    if (!confirmVoid) return;
    setBusy(true);
    try {
      const lastOrderId =
        orders.length > 0 ? Number(orders[orders.length - 1].id) || 0 : 0;
      await voidOrderApi(
        { id: lastOrderId, voided_by: 1, reason: 'Customer canceled' },
        token
      );
      showNotif({ type: 'success', message: `Order ${lastOrderId} voided` });
      clearAll();
    } catch (err) {
      console.error(err);
      showNotif({ type: 'error', message: 'Gagal void order' });
    } finally {
      setBusy(false);
    }
  }

  async function handleSelectAndApplyDiscount(coupon: Coupon): Promise<void> {
    if (items.length === 0) {
      showNotif({
        type: 'error',
        message: 'Cart kosong, tidak bisa apply diskon',
      });
      return;
    }

    setBusy(true);
    try {
      const { data: cart } = await createCart({ cashier_id: 1 }, token);
      const cartId = String(cart.id);

      // NOTE: Using a placeholder '1' for discount_id as in the original code.
      // This should be replaced with a real ID from the `coupon` object if available.
      const discountIdToApply = 1;

      const discountPayload: DiscountPayload = {
        cart_id: cartId,
        discount_id: discountIdToApply,
        item_ids: items.map((it) =>
          typeof it.id === 'string' || typeof it.id === 'number'
            ? it.id
            : String(it.id)
        ),
      };

      await applyDiscountApi(discountPayload, token);

      // On successful API call, update UI state
      applyCoupon(coupon);
      showNotif({ type: 'success', message: 'Diskon diterapkan.' });
    } catch (err) {
      console.error(err);
      // If API fails, clear any coupon from UI and show error
      clearCoupon();
      showNotif({ type: 'error', message: 'Gagal apply diskon.' });
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePaymentType(paymentName: string): Promise<void> {
    setBusy(true);
    try {
      await createPaymentTypeApi(
        {
          payment_name: paymentName,
          processing_fee_rate: '0.7%',
          is_active: true,
        },
        token
      );
      showNotif({ type: 'success', message: 'Payment type created' });
    } catch (err) {
      console.error(err);
      showNotif({ type: 'error', message: 'Gagal membuat payment type' });
    } finally {
      setBusy(false);
    }
  }


  const asideBlur =
    paymentSheetOpen || statusSheetOpen
      ? 'filter blur-md pointer-events-none'
      : '';

  const handleChooseStatus = (status: string) => {
    // Implement status change logic here
    console.log(`Status changed to: ${status}`);
  };

  return (
    <div className='flex flex-col gap-4 h-full max-h-[calc(150vh-0rem)] overflow-hidden relative'>
      <div className={asideBlur}></div>

      <div className='flex items-center gap-3 h-6 flex-shrink-0'>
        <SmallPill
          prefKey='aside:pill:delete'
          defaultLabel='Delete'
          icon={<Trash className='h-3 w-3 ' />}
          onClick={!locked ? deleteSelected : undefined}
        />
        <SmallPill
          prefKey='aside:pill:quantity'
          defaultLabel='Quantity'
          icon={<Columns3 className='h-3 w-3' />}
          onClick={!locked ? toggleAdjust : undefined}
          forceColorFrom='aside:pill:delete'
        />
        <div className='h-6 flex-1 rounded-md bg-primary flex items-center text-primary-foreground justify-center font-rubik font-bold tracking-wide text-base'>
          {time || '--:--:--'}
        </div>
      </div>

      <div className='flex-1 flex flex-col gap-3 overflow-y-auto pr-1'>
        <ProductSection />
        <ServicesSection />
        <CouponPanel onSelect={handleSelectAndApplyDiscount} />
      </div>

      <div className='flex-shrink-0 space-y-4'>
        <hr className='border-t-4 border-border ' />
        <div className='space-y-2 text-sm'>
          <div className='flex justify-between'>
            <div className='text-muted-foreground'>Subtotal</div>
            <div className='font-medium font-rubik text-foreground'>
              {formatIDR(subtotal)}
            </div>
          </div>
          <div className='flex justify-between'>
            <div className='text-muted-foreground'>Tax (10%)</div>
            <div className='font-medium font-rubik text-foreground'>
              {formatIDR(tax)}
            </div>
          </div>
          <div className='flex justify-between'>
            <div className='text-muted-foreground'>Discount</div>
            <div className='font-medium font-rubik text-foreground'>
              -{formatIDR(discount)}
            </div>
          </div>
          <div className='flex justify-between border-t border-border/30 pt-2 font-rubik font-semibold'>
            <div className='text-foreground'>Total</div>
            <div className='text-foreground'>{formatIDR(total)}</div>
          </div>
          <div className='text-[11px] text-muted-foreground'>
            Mode Adjust:{' '}
            <span className='font-medium font-rubik'>
              {adjustMode ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
        <BillOptionSection onVoid={handleVoidOrder} />
        <div className='flex justify-end'>
         
        </div>
      </div>

      {/* Payment sheet */}
      {/* Payment sheet */}
      {paymentSheetOpen && (
        <div className='absolute inset-0 z-50 flex items-end justify-center'>
          <div
            className='absolute inset-0 bg-black/30 backdrop-blur-sm z-0'
            onClick={() => setPaymentSheetOpen(false)}
          />
          <div className='relative w-full max-w-md h-auto bg-secondary rounded-t-2xl shadow-lg p-6 flex flex-col gap-6 min-h-[480px] z-10'>
            <div className='mx-auto mb-2 h-1 w-12 rounded-full bg-muted-foreground/40' />
            <div className='text-center font-bold font-rubik text-foreground text-lg mb-2'>
              Calculation
            </div>
            <div className='rounded-lg border border-border bg-primary p-3 text-primary-foreground text-center font-rubik font-semibold mb-2'>
              Total: {formatIDR(total)}
            </div>

            {/* --- Payment Type Selection --- */}
            <div>
              <div className='font-medium mb-1'>Tipe Pembayaran:</div>
              <div className='flex flex-wrap gap-2 mb-3'>
                {/* Cash */}
                <button
                  type='button'
                  className={`flex items-center gap-1 px-3 py-2 rounded-md border ${
                    paymentType === 'cash'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                  onClick={() => setPaymentType('cash')}
                >
                  <Banknote className='w-4 h-4' /> Cash
                </button>

                {/* Credit / Card */}
                <button
                  type='button'
                  className={`flex items-center gap-1 px-3 py-2 rounded-md border ${
                    paymentType === 'credit'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                  onClick={() => setPaymentType('credit')}
                >
                  <CreditCard className='w-4 h-4' /> Card
                </button>

                {/* QRIS */}
                <button
                  type='button'
                  className={`flex items-center gap-1 px-3 py-2 rounded-md border ${
                    paymentType === 'qris'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                  onClick={() => setPaymentType('qris')}
                >
                  <QrCode className='w-4 h-4' /> QRIS
                </button>

                {/* Add New Payment Type */}
                <button
                  type='button'
                  className='flex items-center gap-1 px-3 py-2 rounded-md border border-dashed hover:bg-secondary transition'
                  onClick={async () => {
                    const name = window.prompt(
                      'Masukkan nama Payment Type baru:'
                    );
                    if (name) await handleCreatePaymentType(name);
                  }}
                >
                  + Add
                </button>
              </div>

              {/* --- Card / Credit extra field --- */}
              {paymentType === 'credit' && (
                <div className='mb-2'>
                  <div className='text-xs mb-1'>Pilih Bank:</div>
                  <select
                    value={paymentBank}
                    onChange={(e) => setPaymentBank(e.target.value)}
                    className='px-2 py-1 rounded border bg-card text-xs w-full'
                  >
                    <option value=''>- Pilih Bank -</option>
                    <option value='BCA'>BCA</option>
                    <option value='BRI'>BRI</option>
                    <option value='Mandiri'>Mandiri</option>
                    <option value='BNI'>BNI</option>
                    <option value='CIMB'>CIMB</option>
                    <option value='Danamon'>Danamon</option>
                    <option value='Permata'>Permata</option>
                  </select>
                </div>
              )}
            </div>

            {/* --- Payment Buttons --- */}
            <div className='mt-auto flex gap-3'>
              <button
                className='flex-1 px-6 py-2 bg-muted text-foreground rounded-lg font-rubik font-semibold'
                onClick={() => setPaymentSheetOpen(false)}
              >
                Back
              </button>
              <button
                className='flex-1 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-rubik font-semibold'
                onClick={handleProcessPayment}
                disabled={busy || (paymentType === 'credit' && !paymentBank)}
              >
                {busy ? 'Processing...' : 'Process'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status sheet */}
      {statusSheetOpen && (
        <div className='absolute inset-0 z-50 flex items-end justify-center'>
          <div
            className='absolute inset-0 bg-black/30 backdrop-blur-sm z-0'
            onClick={() => setStatusSheetOpen(false)}
          />
          <div className='relative w-full max-w-md h-auto bg-secondary rounded-t-2xl shadow-lg p-6 flex flex-col gap-6 min-h-[300px] z-10'>
            <div className='mx-auto mb-2 h-1 w-12 rounded-full bg-muted-foreground/40' />
            <div className='text-center font-bold font-rubik text-foreground text-lg mb-2'>
              Pilih Status Order
            </div>

            <div className='grid grid-cols-1 gap-3 mt-2'>
              {statuses.map((st) => (
                <button
                  key={st}
                  className='w-full px-6 py-3 rounded-lg border bg-card text-foreground font-semibold text-lg hover:bg-secondary transition'
                  onClick={() => handleChooseStatus(st)}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              className='mt-5 flex-1 px-6 py-2 bg-muted text-foreground rounded-lg font-rubik font-semibold'
              onClick={() => setStatusSheetOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}