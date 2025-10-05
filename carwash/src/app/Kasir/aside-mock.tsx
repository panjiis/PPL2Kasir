'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { Trash, Columns3, Lock, RefreshCcw, CircleSlash } from 'lucide-react';
import { useCart } from './cart-content';
import { employees, Coupon } from './dummy'; // <-- import Coupon type!
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNotification } from './notification-context';
import { usePreferences } from '@/app/providers/preferences-context';

interface SmallPillProps {
  prefKey: string;
  defaultLabel: string;
  icon: React.ReactNode;
  onClick?: () => void;
  forceColorFrom?: string;
}

function SmallPill({
  prefKey,
  defaultLabel,
  icon,
  onClick,
  forceColorFrom,
}: SmallPillProps) {
  const {
    isCustomize,
    getButtonLabel,
    setButtonPref,
    getButtonColorClasses,
    colorOptions,
  } = usePreferences();
  const label = getButtonLabel(prefKey, defaultLabel);
  const color = getButtonColorClasses(forceColorFrom ?? prefKey);

  return (
    <div className='flex flex-col items-start gap-1'>
      <button
        type='button'
        onClick={onClick}
        className={[
          'inline-flex items-center h-6 px-2 rounded-md justify-center font-rubik font-bold tracking-wide text-sm',
          color.bg,
          color.text,
        ].join(' ')}
      >
        <div className='grid h-4 w-4 place-items-center text-[10px] leading-none'>
          {icon}
        </div>
        {label}
      </button>
      {isCustomize &&
        (prefKey === 'aside:pill:delete' ? (
          <div className='flex items-center gap-2 bg-muted px-2 py-1 rounded-md mt-1'>
            <input
              className='w-24 rounded border border-border bg-card text-xs px-2 py-0.5'
              defaultValue={label}
              onBlur={(e) =>
                setButtonPref(prefKey, { label: e.currentTarget.value })
              }
            />
            <div className='flex gap-1'>
              {colorOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setButtonPref(prefKey, { color: opt.key })}
                  className={[
                    'h-4 w-4 rounded-full border border-black',
                    opt.classes.bg,
                  ].join(' ')}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className='flex items-center gap-2 bg-muted px-2 py-1 rounded-md mt-1'>
            <input
              className='w-24 rounded border border-border bg-card text-xs px-2 py-0.5'
              defaultValue={label}
              onBlur={(e) =>
                setButtonPref(prefKey, { label: e.currentTarget.value })
              }
            />
          </div>
        ))}
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
  const [inputQty, setInputQty] = useState<number>(qty);

  useEffect(() => {
    setInputQty(qty);
  }, [qty]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const intVal = Math.max(1, Number(val.replace(/\D/g, '')) || 1);
    setInputQty(intVal);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSetQty && allowAdjust && selected) {
      if (inputQty !== qty) onSetQty(inputQty);
    }
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border ${
        selected ? 'ring-2' : ''
      } border-border bg-card p-2`}
    >
      <button
        type='button'
        onClick={onSelect}
        className='mt-0.5 grid h-6 w-6 place-items-center rounded-md border-2 border-dashed border-border text-foreground'
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
          onBlur={() => setInputQty(qty)}
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

function CouponPanel() {
  const { appliedCoupon, applyCoupon, clearCoupon } = useCart();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'product' | 'service'>('all');
  const [codeInput, setCodeInput] = useState('');

  // Use correct Coupon shape and fields!
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

  const handleApplyByCode = () => {
    const c = coupons.find(
      (coupon) => coupon.code.toLowerCase() === codeInput.toLowerCase()
    );
    if (!c) return;
    applyCoupon(c);
    setOpen(false);
  };

  return (
    <div className='rounded-lg border border-border bg-card p-3 space-y-3 relative'>
      <div className='flex gap-2'>
        <div className='relative w-40'>
          <button
            type='button'
            onClick={() => setOpen((s) => !s)}
            className='w-full inline-flex items-center justify-between rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground'
          >
            <span>
              {filter === 'all'
                ? 'Semua'
                : filter === 'product'
                ? 'Produk'
                : 'Service'}
            </span>
            <span className='ml-2 text-xs'>▾</span>
          </button>

          {open && (
            <div className='absolute left-0 mt-2 w-44 rounded-md border border-border bg-card shadow z-20'>
              {(['all', 'product', 'service'] as const).map((t) => (
                <button
                  key={t}
                  type='button'
                  onClick={() => {
                    setFilter(t);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary ${
                    filter === t ? 'bg-muted font-semibold font-rubik' : ''
                  }`}
                >
                  {t === 'all'
                    ? 'Semua'
                    : t === 'product'
                    ? 'Produk'
                    : 'Service'}
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
            placeholder='Masukkan kode kupon'
            className='flex-1 bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground'
          />
          <button
            type='button'
            onClick={handleApplyByCode}
            className='bg-primary px-3 text-xs text-primary-foreground'
          >
            Apply
          </button>
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
              onClick={() => applyCoupon(c)}
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

function BillOptionSection() {
  const {
    billOption,
    setBillOption,
    locked,
    setLocked,
    repeatRound,
    voidOrder,
  } = useCart();
  const {
    isCustomize,
    getButtonLabel,
    getButtonColorClasses,
    setButtonPref,
    colorOptions,
  } = usePreferences();
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
          <div key={opt.value} className='rounded-lg border border-border p-2'>
            <button
              type='button'
              className={[
                'rounded-lg p-3 text-center transition w-full',
                color.bg,
                color.text,
                active ? 'ring-2' : '',
              ].join(' ')}
              onClick={() => {
                setBillOption(opt.value);
                if (opt.value === 'Lock') setLocked(!locked);
                else if (opt.value === 'repeat') repeatRound();
                else if (opt.value === 'void') {
                  if (window.confirm('Yakin void order ini?')) voidOrder();
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
                <div className='flex flex-wrap gap-1'>
                  {colorOptions.map((optc) => (
                    <button
                      key={optc.key}
                      onClick={() =>
                        setButtonPref(prefKey, { color: optc.key })
                      }
                      className={[
                        'h-5 w-5 rounded border border-black',
                        optc.classes.bg,
                      ].join(' ')}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AsideMock() {
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
  } = useCart();

  const { showNotif } = useNotification();

  function clearAll() {
    setItems([]);
    setSelectedItemId(null);
    setAdjustMode(false);

    setPaymentSheetOpen(false);
  }

  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => setTime(new Date().toLocaleTimeString());
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  function handlePaymentResult(
    status: 'success' | 'error',
    method?: string,
    amount?: number
  ) {
    if (status === 'success') {
      showNotif({
        type: 'success',
        message: 'Pembayaran berhasil!',
        amount: amount,
        method,
      });
      setPaymentSheetOpen(false);
      setTimeout(() => {
        clearAll();
      }, 500);
    } else {
      showNotif({
        type: 'error',
        message: 'Pembayaran gagal! Silakan cek kembali.',
        amount: amount,
        method,
      });
    }
  }

  const asideBlur = paymentSheetOpen
    ? 'filter blur-md pointer-events-none'
    : '';
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
        <CouponPanel />
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
        <BillOptionSection />
      </div>
      {paymentSheetOpen && (
        <div className='absolute inset-0 z-50 flex items-end justify-center'>
          <div
            className='absolute inset-0 bg-black/30 backdrop-blur-sm z-0'
            onClick={() => setPaymentSheetOpen(false)}
          />
          <div className='relative w-full max-w-md h-auto bg-secondary rounded-t-2xl shadow-lg p-6 flex flex-col gap-6 min-h-[450px] z-10'>
            <div className='mx-auto mb-2 h-1 w-12 rounded-full bg-muted-foreground/40' />
            <div className='text-center font-bold font-rubik text-foreground text-lg mb-2'>
              Calculation
            </div>
            <div className='rounded-lg border border-border bg-primary p-3 text-primary-foreground text-center font-rubik font-semibold mb-2'>
              Total: {formatIDR(total)}
            </div>
            <div className='mt-auto flex gap-3'>
              <button
                className='flex-1 px-6 py-2 bg-muted text-foreground rounded-lg font-rubik font-semibold'
                onClick={() => setPaymentSheetOpen(false)}
              >
                Back
              </button>
              <button
                className='flex-1 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-rubik font-semibold'
                onClick={() => handlePaymentResult('success', 'cash', total)}
              >
                Process
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
