// Kasir/aside-mock.tsx
'use client';
import type React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Trash,
  Columns3,
  Plus,
  CircleSlash,
  Tags,
  Box,
  Wrench,
  CreditCard,
  QrCode,
  Banknote,
  Loader2,
} from 'lucide-react';
import { useCart, type ApiCartSyncData } from './cart-content';
import type { Coupon } from './dummy';
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
  createOrderFromCart,
  processPayment as processPaymentApi,
  voidOrder as voidOrderApi,
  fetchDiscounts,
  applyDiscount as applyDiscountApi,
  fetchEmployees,
  fetchPaymentTypes,
} from '../lib/utils/pos-api';
import type { Employee, PaymentType, DetailedPosOrder, PosProduct } from '../lib/types/pos';
import { useTranslation } from 'react-i18next';
import { PrintableReceipt } from './orders-view';

type ApiDiscount = {
  id?: number | string;
  discount_id?: number | string;
  discount_code?: string;
  discount_name?: string;
  description?: string;
  discount_type?: 'amount' | 'percent' | string;
  percentage?: number;
  value?: number;
  max_amount?: number;
  max_discount?: number;
};

export interface DiscountPayload {
  cart_id: string;
  discount_id: number;
  item_ids: string[];
}

function calculateProcessingFee(rate: string, baseTotal: number): number {
  if (!rate) return 0;
  const rateStr = String(rate).trim().replace('%', '');
  const percentage = parseFloat(rateStr);
  if (isNaN(percentage)) return 0;
  return (percentage / 100) * baseTotal;
}

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
  const { isCustomize, getButtonLabel, setButtonPref, getButtonClasses } =
    usePreferences();
  const labelKey = forceColorFrom || prefKey;
  const label = getButtonLabel(labelKey, defaultLabel);
  const color = getButtonClasses();
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
  const { t } = useTranslation();
  const [inputQty, setInputQty] = useState<string>(qty.toString());
  const enterPressed = useRef(false);
  const lastAppliedQty = useRef(qty);

  useEffect(() => {
    if (!allowAdjust || !selected) {
      setInputQty(qty.toString());
      lastAppliedQty.current = qty;
      enterPressed.current = false;
    } else if (allowAdjust && selected) {
      if (
        inputQty === '' ||
        parseInt(inputQty, 10) === lastAppliedQty.current
      ) {
        setInputQty(qty.toString());
      }
      enterPressed.current = false;
    }
  }, [qty, selected, allowAdjust, inputQty]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setInputQty(val);
  };
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSetQty && allowAdjust && selected) {
      enterPressed.current = true;
      const parsed = parseInt(inputQty, 10);
      const newQty =
        Number.isFinite(parsed) && parsed > 0 ? parsed : lastAppliedQty.current;
      if (newQty !== lastAppliedQty.current) {
        onSetQty(newQty);
        lastAppliedQty.current = newQty;
      }
      setInputQty(newQty.toString());
      e.currentTarget.blur();
    }
  };
  const handleBlur = () => {
    if (enterPressed.current) {
      enterPressed.current = false;
      return;
    }
    setInputQty(lastAppliedQty.current.toString());
  };
  const handleFocus = () => {
    enterPressed.current = false;
  };
  return (
    <div
      className={`flex items-start gap-3 ${
        selected ? 'ring-2 ring-primary' : ''
      } border border-border bg-card p-2 rounded-md`}
    >
      <button
        type='button'
        onClick={onSelect}
        className='grid h-8 w-8 place-items-center text-foreground text-xl'
        aria-pressed={selected}
        aria-label={
          selected ? t('Aside.lineItem.deselect') : t('Aside.lineItem.select')
        }
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
      <div className='ml-auto flex items-start gap-2'>
        <input
          type='number'
          min={1}
          className='w-14 h-6 mt-1 rounded-md border border-border px-1 text-center text-xs outline-none disabled:bg-muted disabled:opacity-60'
          value={inputQty}
          disabled={!allowAdjust || !selected}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
        />
        {extraRight}
      </div>
    </div>
  );
}

function ProductSection() {
  const { t } = useTranslation();
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
        {t('Aside.products.title')}
      </legend>
      <div className='space-y-3 max-h-[160px] overflow-y-auto'>
        {products.length === 0 ? (
          <div className='text-xs text-muted-foreground'>
            {t('Aside.products.empty')}
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
                adjustQuantity(it.id, newQty)
              }
            />
          ))
        )}
      </div>
    </fieldset>
  );
}

function ServicesSection() {
  const { t } = useTranslation();
  const {
    services,
    selectedItemId,
    selectItem,
    adjustMode,
    adjustQuantity,
    setEmployee,
    locked,
  } = useCart();
  const { session } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  useEffect(() => {
    if (!session?.token) {
      setLoadingEmployees(false);
      return;
    }
    fetchEmployees(session.token)
      .then((res) => setEmployees(res.data || []))
      .catch((err) => console.error('Gagal fetch employees:', err))
      .finally(() => setLoadingEmployees(false));
  }, [session?.token]);

  return (
    <fieldset className='rounded-lg border border-border bg-secondary p-3'>
      <legend className='px-2 text-sm text-muted-foreground'>
        {t('Aside.services.title')}
      </legend>
      <div className='space-y-3 max-h-[160px] overflow-y-auto'>
        {services.length === 0 ? (
          <div className='text-xs text-muted-foreground'>
            {t('Aside.services.empty')}
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
                adjustQuantity(it.id, newQty)
              }
              extraRight={
                <div className='flex items-start gap-2 w-full'>
                  <Select
                    value={it.employeeId ? String(it.employeeId) : ''}
                    onValueChange={(val) => setEmployee(it.id, Number(val))}
                    disabled={locked || loadingEmployees}
                  >
                    <SelectTrigger
                      className='
                        min-w-0
                        max-w-[180px]
                        w-full
                        !h-auto min-h-[35px] 
                        py-2 px-2
                        text-[10px]
                        border border-border bg-card text-foreground
                        flex items-start gap-1
                      '
                    >
                      <div className='flex-1 min-w-0 text-left'>
                        <span className='block w-full whitespace-normal break-words leading-tight'>
                          <SelectValue
                            placeholder={
                              loadingEmployees
                                ? '...'
                                : t('Aside.services.selectEmployee')
                            }
                          />
                        </span>
                      </div>
                    </SelectTrigger>

                    <SelectContent align='end' className='w-[220px]'>
                      <SelectGroup>
                        {employees.map((e) => (
                          <SelectItem
                            key={e.id}
                            value={String(e.id)}
                            className='text-xs h-auto py-2 whitespace-normal break-words text-left items-start'
                          >
                            <span className='leading-snug block w-full'>
                              {e.employee_name}
                            </span>
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
  const { t } = useTranslation();
  const { appliedCoupon, clearCoupon } = useCart();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'product' | 'service'>('all');
  const [codeInput, setCodeInput] = useState('');
  const [apiDiscounts, setApiDiscounts] = useState<ApiDiscount[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(true);

  useEffect(() => {
    if (!session?.token) {
      setLoadingDiscounts(false);
      return;
    }
    const loadDiscounts = async () => {
      try {
        setLoadingDiscounts(true);
        const res = await fetchDiscounts(session.token);
        setApiDiscounts((res.data as ApiDiscount[]) || []);
      } catch (e) {
        console.error('Failed to fetch discounts:', e);
        setApiDiscounts([]);
      } finally {
        setLoadingDiscounts(false);
      }
    };
    loadDiscounts();
  }, [session?.token]);

  const coupons: Coupon[] = apiDiscounts.map((d) => {
    const scope = 'all' as const;
    const discountType: 'amount' | 'percent' =
      d.discount_type === 'amount' ? 'amount' : 'percent';
    return {
      id: String(d.id ?? d.discount_id ?? ''),
      code:
        d.discount_code ??
        d.discount_name ??
        String(d.id ?? d.discount_id ?? ''),
      label: d.discount_name ?? d.description ?? 'Unknown Discount',
      scope,
      discountType,
      value: Number(d.percentage ?? d.value ?? 0),
      maxDiscount: Number(d.max_amount ?? d.max_discount ?? 0) || undefined,
    };
  });

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
      label: t('Aside.coupons.filterAll'),
      icon: <Tags className='w-4 h-4 mr-2 inline' />,
    },
    {
      key: 'product',
      label: t('Aside.coupons.filterProduct'),
      icon: <Box className='w-4 h-4 mr-2 inline' />,
    },
    {
      key: 'service',
      label: t('Aside.coupons.filterService'),
      icon: <Wrench className='w-4 h-4 mr-2 inline' />,
    },
  ];

  return (
    <div className='rounded-lg border border-border bg-card p-3 space-y-3 relative'>
      <div className='flex gap-2'>
        <div className='relative'>
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
        <div className='flex-1 flex rounded-md border border-border bg-secondary overflow-hidden'>
          <input
            type='text'
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder={t('Aside.coupons.placeholder')}
            className='flex-1 bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground'
          />
        </div>
      </div>
      <div className='max-h-40 overflow-auto rounded-md border border-border/30 p-2 space-y-2 bg-secondary'>
        {loadingDiscounts ? (
          <div className='text-xs text-muted-foreground flex items-center justify-center py-2'>
            <Loader2 className='h-4 w-4 animate-spin mr-2' />{' '}
            {t('Aside.coupons.loading')}
          </div>
        ) : filtered.length === 0 ? (
          <div className='text-xs text-muted-foreground'>
            {t('Aside.coupons.empty')}
          </div>
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
            onClick={async () => await clearCoupon()}
            className='ml-2 rounded border border-border px-2 py-1 text-[11px] text-foreground hover:bg-muted'
          >
            {t('Aside.coupons.remove')}
          </button>
        </div>
      ) : (
        <div className='text-[11px] text-muted-foreground'>
          {t('Aside.coupons.noCoupon')}
        </div>
      )}
    </div>
  );
}

function BillOptionSection({
  onVoid,
  onCreateOrder,
}: {
  onVoid: () => void;
  onCreateOrder: () => void;
}) {
  const { t } = useTranslation();
  const { isCustomize, getButtonLabel, getButtonClasses, setButtonPref } =
    usePreferences();
  const options = [
    {
      key: 'create',
      label: t('Aside.billOptions.order'),
      value: 'create',
    },
    {
      key: 'void',
      label: t('Aside.billOptions.void'),
      value: 'void',
    },
  ];

  const getIcon = (key: string) => {
    switch (key) {
      case 'create':
        return <Plus className='h-6 w-6' />;
      case 'void':
        return <CircleSlash className='h-6 w-6' />;
      default:
        return null;
    }
  };

  return (
    <div className='grid grid-cols-2 gap-3 bg-secondary p-3 rounded-lg'>
      {options.map((opt) => {
        const active = false;
        const prefKey = `aside:bill:${opt.key}`;
        const shown = getButtonLabel(prefKey, opt.label);
        const color = getButtonClasses();
        const isVoid = opt.key === 'void';
        const buttonClasses = [
          'rounded-lg p-3 text-center transition w-full',
          active ? 'ring-2' : '',
          isVoid
            ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 active:ring-destructive'
            : `${color.bg} ${color.text}`,
        ];
        return (
          <div key={opt.value} className='rounded-lg'>
            <button
              type='button'
              className={buttonClasses.join(' ')}
              onClick={() => {
                if (opt.value === 'create') {
                  onCreateOrder();
                } else if (opt.value === 'void') {
                  if (window.confirm(t('Aside.billOptions.voidConfirm')))
                    onVoid();
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

export default function AsideMock(): React.ReactElement {
 
  const { t } = useTranslation();
  const {
    deleteSelected,
    toggleAdjust,
    adjustMode,
    subtotal,
    tax,
    discount,
    total,
    formatIDR,
    appliedCoupon,
    paymentSheetOpen,
    setPaymentSheetOpen,
    locked,
    setLocked,
    addOrder,
    items,
    applyCoupon,
    clearCoupon,
    cartId,
    clearCartState,
    products, 
  } = useCart();
  const { showNotif } = useNotification();
  const { session } = useSession();
  const token = session?.token ?? '';
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [loadingPaymentTypes, setLoadingPaymentTypes] = useState(true);
  const [selectedPaymentType, setSelectedPaymentType] =
    useState<PaymentType | null>(null);
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const statuses = ['In Queue', 'In Process', 'Waiting Payment'] as const;
  const statusLabels = {
    'In Queue': t('Aside.statusSheet.queue'),
    'In Process': t('Aside.statusSheet.process'),
    'Waiting Payment': t('Aside.statusSheet.waiting'),
  };

  // --- STATE UNTUK AUTO-PRINT ---
  const [printingOrder, setPrintingOrder] = useState<{
    order: DetailedPosOrder;
    taxAmount: number;
    discountAmount: number;
    processingFee: number;
    paymentMethodName: string;
    grandTotal: number;
  } | null>(null);

  // --- EFFECT AUTO-PRINT (Kondisi 1 & 2) ---
  useEffect(() => {
    if (printingOrder) {
      // Trigger print setelah state di-update dan komponen PrintableReceipt di-render
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (error) {
          console.error("Gagal print (mungkin printer tidak tersedia):", error);
          // Kondisi 1: Printer mati/tidak terdeteksi = Silent Fail (Order tetap lanjut)
        } finally {
          // Bersihkan state agar tidak print berulang
          setPrintingOrder(null);
        }
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [printingOrder]);


  useEffect(() => {
    if (session?.token) {
      setLoadingPaymentTypes(true);
      fetchPaymentTypes(session.token)
        .then((res) => {
          const activeTypes = (res.data || []).filter((pt) => pt.is_active);
          setPaymentTypes(activeTypes);
          const cashDefault = activeTypes.find((pt) =>
            pt.payment_name.toLowerCase().includes('cash')
          );
          if (cashDefault) {
            setSelectedPaymentType(cashDefault);
          }
        })
        .catch((err) => console.error('Gagal mengambil payment types:', err))
        .finally(() => setLoadingPaymentTypes(false));
    }
  }, [session?.token]);

  const getPaymentIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('cash')) {
      return <Banknote className='w-4 h-4' />;
    }
    if (lowerName.includes('qris')) {
      return <QrCode className='w-4 h-4' />;
    }
    return <CreditCard className='w-4 h-4' />;
  };

  function clearAll() {
    clearCartState({ deleteBackendCart: false });
    setSelectedPaymentType(null);
    setAmountTendered('');
    const cashDefault = paymentTypes.find((pt) =>
      pt.payment_name.toLowerCase().includes('cash')
    );
    if (cashDefault) {
      setSelectedPaymentType(cashDefault);
    }
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

  const processingFee = useMemo(() => {
    if (!selectedPaymentType || !selectedPaymentType.processing_fee_rate) {
      return 0;
    }
    return calculateProcessingFee(
      selectedPaymentType.processing_fee_rate,
      total
    );
  }, [selectedPaymentType, total]);

  const grandTotal = useMemo(
    () => total + processingFee,
    [total, processingFee]
  );

  async function handleProcessPayment(): Promise<void> {
    if (!cartId || items.length === 0) {
      showNotif({
        type: 'error',
        message: t('Aside.errors.emptyCart'),
      });
      return;
    }
    const unassignedService = items.find(
      (it) => it.type === 'service' && !it.isApiSynced
    );
    if (unassignedService) {
      showNotif({
        type: 'error',
        message: t('Aside.errors.unassignedService', {
          name: unassignedService.name,
        }),
      });
      return;
    }
    if (!selectedPaymentType || !selectedPaymentType.id) {
      showNotif({
        type: 'error',
        message: t('Aside.errors.noPaymentMethod'),
      });
      return;
    }
    const isCash = selectedPaymentType.payment_name
      .toLowerCase()
      .includes('cash');
    const tendered = Number(amountTendered) || 0;
    if (isCash && tendered < grandTotal) {
      showNotif({
        type: 'error',
        message: t('Aside.errors.cashInsufficient', {
          tendered: tendered.toLocaleString('id-ID'),
          grandTotal: grandTotal.toLocaleString('id-ID'),
        }),
      });
      return;
    }
    setBusy(true);
    setLocked(true);
    try {
      setPaymentSheetOpen(false);
      const paymentTypeId = selectedPaymentType.id;
      const paymentName = selectedPaymentType.payment_name;
      const orderPayload = {
        cart_id: cartId,
        document_number: `INV-${Date.now()}`,
        total_amount: total,
        subtotal: subtotal,
        additional_info: `Payment Fee: ${processingFee} (Metode: ${paymentName}, Rate: ${selectedPaymentType.processing_fee_rate})`,
        notes: `Payment type: ${paymentName}`,
      };
      
      const { data: order } = await createOrderFromCart(orderPayload, token);
      const createdOrderId = order.id;
      const paymentPayload = {
        order_id: createdOrderId,
        paid_amount: String(grandTotal),
        payment_type_id: paymentTypeId,
        reference_number: `TRX-${Date.now()}`,
      };
      
      await processPaymentApi(paymentPayload, token);
      addOrder({
        id: String(createdOrderId),
        orderNo: order.document_number ?? `INV-${createdOrderId}`,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        items: [...items],
        status: paymentName.toLowerCase().includes('cash')
          ? 'Done'
          : 'Waiting Payment',
        paymentType: paymentName,
        paymentBank: undefined,
        total: grandTotal,
      });
      showNotif({
        type: 'success',
        message: `Order ${createdOrderId} processed. Payment OK`,
        amount: grandTotal,
        method: paymentName,
      });

      // === KONDISI 2: Auto Print saat Order Sukses ===
      // Siapkan data untuk PrintableReceipt
      const orderForPrint: DetailedPosOrder = {
        id: order.id,
        document_number: order.document_number,
        orders_date: { seconds: Date.now() / 1000 },
        subtotal: subtotal,
        // Map cart items ke structure order_items yang dibutuhkan
        order_items: items.map(item => ({
            id: Number(item.id),
            product_name: item.name,
            quantity: item.qty,
            line_total: (item.price * item.qty).toString(),
            product_code: item.itemId ?? item.id,
            price: item.price,
            total_price: item.price * item.qty
        })),
        payment_type: { payment_name: selectedPaymentType.payment_name },
        notes: `Payment type: ${selectedPaymentType.payment_name}`,
      } as DetailedPosOrder; 

      setPrintingOrder({
        order: orderForPrint,
        taxAmount: tax,
        discountAmount: discount,
        processingFee: processingFee,
        paymentMethodName: selectedPaymentType.payment_name,
        grandTotal: grandTotal,
      });
      
      clearAll();
    } catch (err) {
      console.error('Payment processing failed:', err);
      const errorMessage =
        err instanceof Error ? err.message : t('Aside.errors.paymentFailed');
      showNotif({
        type: 'error',
        message: `${errorMessage}`,
      });
      setLocked(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleVoidOrder(): Promise<void> {
    if (!cartId || items.length === 0) {
      showNotif({
        type: 'info',
        message: t('Aside.errors.emptyCart'),
      });
      return;
    }
    setBusy(true);
    setLocked(true);
    try {
      const { data: createdOrder } = await createOrderFromCart(
        {
          cart_id: cartId,
          document_number: `VOID-${Date.now()}`,
          notes: 'Dibatalkan oleh kasir sebelum pembayaran',
          total_amount: total,
          subtotal: subtotal,
        },
        token
      );
      const newOrderId = createdOrder.id;
      if (!newOrderId) {
        throw new Error('Gagal membuat entry order untuk di-void.');
      }
      await voidOrderApi(
        {
          id: newOrderId,
          voided_by: 1, // replace with real user id if available
          reason: 'Voided from cart by user',
        },
        token
      );
      showNotif({
        type: 'success',
        message: `Order ${createdOrder.document_number} berhasil di-void.`,
      });
      
      // === KONDISI 3: Void = Tidak Print ===
      // Kita TIDAK memanggil setPrintingOrder() di sini.
      
      clearCartState({ deleteBackendCart: false });
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : t('Aside.errors.voidFailed');
      showNotif({ type: 'error', message: errorMessage });
      setLocked(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleSelectAndApplyDiscount(coupon: Coupon): Promise<void> {
    if (items.length === 0) {
      showNotif({
        type: 'error',
        message: t('Aside.errors.discountCartEmpty'),
      });
      return;
    }

    if (appliedCoupon) {
      console.log('Mengganti diskon: Menghapus diskon lama terlebih dahulu...');
      await clearCoupon();
    }

    const unassignedService = items.find(
      (it) => it.type === 'service' && !it.isApiSynced
    );
    if (unassignedService) {
      showNotif({
        type: 'error',
        message: t('Aside.errors.unassignedService', {
          name: unassignedService.name,
        }),
      });
      return;
    }
    if (!cartId) {
      showNotif({
        type: 'error',
        message: t('Aside.errors.discountNoCartId'),
      });
      return;
    }
    setBusy(true);
    try {
      const discountIdToApply = Number(coupon.id);
      if (!discountIdToApply) {
        throw new Error(t('Aside.errors.discountInvalidId'));
      }
      const discountPayload: DiscountPayload = {
        cart_id: cartId,
        discount_id: discountIdToApply,
        item_ids: items.map((it) => String(it.itemId)),
      };
      const result = await applyDiscountApi(discountPayload, token);
      console.log('API Discount Response:', result);
      if (!result.success) {
        throw new Error(result.message || t('Aside.errors.discountApiFailed'));
      }
      const syncData: ApiCartSyncData = {
        subtotal: parseFloat(result.subtotal ?? '0'),
        tax: parseFloat(result.tax_amount ?? '0'),
        discount: parseFloat(result.discount_amount ?? '0'),
        total: parseFloat(result.total_amount ?? '0'),
        items: result.items || [],
      };
      applyCoupon(coupon, syncData);
      showNotif({ type: 'success', message: 'Diskon diterapkan.' });
    } catch (err) {
      console.error(err);
      await clearCoupon(); 
      const errorMessage =
        err instanceof Error
          ? err.message
          : t('Aside.errors.discountApiFailed');
      showNotif({ type: 'error', message: errorMessage });
    } finally {
      setBusy(false);
    }
  }

  const asideBlur =
    paymentSheetOpen || statusSheetOpen
      ? 'filter blur-md pointer-events-none'
      : '';
  const handleChooseStatus = (status: string) => {
    console.log(`Status changed to: ${status}`);
  };
  const isCashPayment = selectedPaymentType?.payment_name
    .toLowerCase()
    .includes('cash');
  const tenderedAmountNum = Number(amountTendered) || 0;
  const changeDue =
    isCashPayment && tenderedAmountNum > 0 && tenderedAmountNum >= grandTotal
      ? tenderedAmountNum - grandTotal
      : 0;
  const isProcessDisabled =
    busy ||
    !selectedPaymentType ||
    (isCashPayment && tenderedAmountNum < grandTotal);

  return (
    <div className='flex flex-col gap-4 h-full  overflow-hidden relative'>
      <div className={asideBlur}></div>
      <div className='flex items-center gap-3 h-6 flex-shrink-0'>
        <SmallPill
          prefKey='aside:pill:delete'
          defaultLabel={t('Aside.pills.delete')}
          icon={<Trash className='h-3 w-3 ' />}
          onClick={!locked ? deleteSelected : undefined}
        />
        <SmallPill
          prefKey='aside:pill:quantity'
          defaultLabel={t('Aside.pills.quantity')}
          icon={<Columns3 className='h-3 w-3' />}
          onClick={
            !locked
              ? async () => {
                  await clearCoupon(); 
                  toggleAdjust();
                }
              : undefined
          }
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
            <div className='text-muted-foreground'>
              {t('Aside.totals.subtotal')}
            </div>
            <div className='font-medium font-rubik text-foreground'>
              {formatIDR(subtotal)}
            </div>
          </div>
          <div className='flex justify-between'>
            <div className='text-muted-foreground'>{t('Aside.totals.tax')}</div>
            <div className='font-medium font-rubik text-foreground'>
              {formatIDR(tax)}
            </div>
          </div>
          <div className='flex justify-between'>
            <div className='text-muted-foreground'>
              {t('Aside.totals.discount')}
            </div>
            <div className='font-medium font-rubik text-foreground'>
              -{formatIDR(discount)}
            </div>
          </div>
          <div className='flex justify-between border-t border-border/30 pt-2 font-rubik font-semibold text-lg'>
            <div className='text-foreground'>{t('Aside.totals.total')}</div>
            <div className='text-foreground'>{formatIDR(total)}</div>
          </div>
          <div className='text-[11px] text-muted-foreground'>
            {t('Aside.totals.adjustMode')}{' '}
            <span className='font-medium font-rubik'>
              {adjustMode
                ? t('Aside.totals.adjustOn')
                : t('Aside.totals.adjustOff')}
            </span>
          </div>
        </div>
        <BillOptionSection
          onVoid={handleVoidOrder}
          onCreateOrder={() => setPaymentSheetOpen(true)}
        />
        <div className='flex justify-end'></div>
      </div>
      {paymentSheetOpen && (
        <div className='absolute inset-0 z-50 flex items-end justify-center'>
          <div
            className='absolute inset-0 bg-black/30 backdrop-blur-sm z-0'
            onClick={() => {
              setPaymentSheetOpen(false);
              setAmountTendered('');
            }}
          />
          <div className='relative w-full max-w-md h-auto bg-secondary rounded-t-2xl shadow-lg p-6 flex flex-col gap-4 min-h-[480px] z-10'>
            <div className='mx-auto mb-2 h-1 w-12 rounded-full bg-muted-foreground/40' />
            <div className='text-center font-bold font-rubik text-foreground text-lg mb-2'>
              {t('Aside.paymentSheet.title')}
            </div>
            <div className='rounded-lg border border-border bg-card p-3 text-foreground space-y-1'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>
                  {t('Aside.paymentSheet.orderTotal')}
                </span>
                <span className='font-medium'>{formatIDR(total)}</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>
                  {t('Aside.paymentSheet.serviceFee', {
                    paymentName: selectedPaymentType?.payment_name || '...',
                  })}
                </span>
                <span className='font-medium'>{formatIDR(processingFee)}</span>
              </div>
              <div className='flex justify-between text-lg font-bold font-rubik mt-2 border-t border-border/30 pt-2'>
                <span>{t('Aside.paymentSheet.grandTotal')}</span>
                <span>{formatIDR(grandTotal)}</span>
              </div>
            </div>
            <div>
              <div className='font-medium mb-1'>
                {t('Aside.paymentSheet.paymentType')}
              </div>
              <div className='flex flex-wrap gap-2 mb-3'>
                {loadingPaymentTypes ? (
                  <div className='flex items-center justify-center w-full text-muted-foreground'>
                    <Loader2 className='w-4 h-4 animate-spin mr-2' />
                    <span>{t('Aside.paymentSheet.loadingMethods')}</span>
                  </div>
                ) : (
                  paymentTypes.map((pt) => (
                    <button
                      key={pt.id}
                      type='button'
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md border ${
                        selectedPaymentType?.id === pt.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                      onClick={() => setSelectedPaymentType(pt)}
                    >
                      {getPaymentIcon(pt.payment_name)}
                      <span className='text-sm'>{pt.payment_name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
            {isCashPayment && (
              <div className='space-y-3'>
                <div>
                  <label
                    htmlFor='amountTendered'
                    className='font-medium mb-1 text-sm'
                  >
                    {t('Aside.paymentSheet.amountTendered')}
                  </label>
                  <input
                    type='number'
                    id='amountTendered'
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder='e.g. 100000'
                    className='w-full px-3 py-2 rounded border bg-card text-foreground text-lg'
                  />
                </div>
                {tenderedAmountNum >= grandTotal && (
                  <div className='text-right font-medium text-lg'>
                    {t('Aside.paymentSheet.changeDue')}{' '}
                    <span className='font-bold text-primary'>
                      {formatIDR(changeDue)}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className='mt-auto flex gap-3'>
              <button
                className='flex-1 px-6 py-2 bg-muted text-foreground rounded-lg font-rubik font-semibold'
                onClick={() => {
                  setPaymentSheetOpen(false);
                  setAmountTendered('');
                }}
              >
                {t('Aside.paymentSheet.back')}
              </button>
              <button
                className='flex-1 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-rubik font-semibold disabled:opacity-50'
                onClick={handleProcessPayment}
                disabled={isProcessDisabled}
              >
                {busy
                  ? t('Aside.paymentSheet.processing')
                  : t('Aside.paymentSheet.process')}
              </button>
            </div>
          </div>
        </div>
      )}
      {statusSheetOpen && (
        <div className='absolute inset-0 z-50 flex items-end justify-center'>
          <div
            className='absolute inset-0 bg-black/30 backdrop-blur-sm z-0'
            onClick={() => setStatusSheetOpen(false)}
          />
          <div className='relative w-full max-w-md h-auto bg-secondary rounded-t-2xl shadow-lg p-6 flex flex-col gap-6 min-h-[300px] z-10'>
            <div className='mx-auto mb-2 h-1 w-12 rounded-full bg-muted-foreground/40' />
            <div className='text-center font-bold font-rubik text-foreground text-lg mb-2'>
              {t('Aside.statusSheet.title')}
            </div>
            <div className='grid grid-cols-1 gap-3 mt-2'>
              {statuses.map((st) => (
                <button
                  key={st}
                  className='w-full px-6 py-3 rounded-lg border bg-card text-foreground font-semibold text-lg hover:bg-secondary transition'
                  onClick={() => handleChooseStatus(st)}
                >
                  {statusLabels[st]}
                </button>
              ))}
            </div>
            <button
              className='mt-5 flex-1 px-6 py-2 bg-muted text-foreground rounded-lg font-rubik font-semibold'
              onClick={() => setStatusSheetOpen(false)}
            >
              {t('Aside.statusSheet.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* RENDER PRINTABLE RECEIPT JIKA ADA DATA PRINT */}
      {printingOrder && (
        <PrintableReceipt
          order={printingOrder.order}
          products={products.map((p) => ({
             product_code: p.itemId,
             product_name: p.name,
          } as unknown as PosProduct))} 
          taxAmount={printingOrder.taxAmount}
          discountAmount={printingOrder.discountAmount}
          processingFee={printingOrder.processingFee}
          paymentMethodName={printingOrder.paymentMethodName}
          grandTotal={printingOrder.grandTotal}
        />
      )}
    </div>
  );
}