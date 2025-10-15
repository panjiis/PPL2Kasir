'use client';

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  LayoutDashboard,
  Boxes,
  Users,
  Warehouse,
  Tag,
  MoreVertical,
} from 'lucide-react';
import { useCart } from './cart-content';
import { usePreferences } from '../providers/preferences-context';
import { useSession } from '../lib/context/session';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// ---- TYPE DEFINITIONS ----
interface NavItem {
  key: string;
  label: string;
  icon: typeof Boxes;
}

// ---- NAV CONFIG ----
const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'products', label: 'Products', icon: Boxes },
  { key: 'groups', label: 'Groups', icon: Tag },
  { key: 'paymentTypes', label: 'Payment', icon: Warehouse },
  { key: 'orders', label: 'Orders', icon: Users },
];

// ---- TILE BUTTON ----
function SidebarTileButton({
  icon: Icon,
  label,
  itemKey,
  onClick,
  isActive,
}: {
  icon: typeof Boxes;
  label: string;
  itemKey: string;
  onClick: () => void;
  isActive: boolean;
}) {
  const { isCustomize, getButtonLabel, setButtonPref, getButtonColorClasses } =
    usePreferences();
  const key = `sidebar:${itemKey}`;
  const shownLabel = getButtonLabel(key, label);
  const color = getButtonColorClasses(key);

  return (
    <div className='p-3 text-center transition group'>
      <button
        type='button'
        className={[
          'block rounded-md p-2 w-full transition',
          color.bg,
          color.text,
          color.border ?? 'border-border',
          'hover:ring-2',
          isActive ? 'ring-2 ring-primary ring-offset-2' : '',
        ].join(' ')}
        onClick={!isCustomize ? onClick : undefined}
      >
        <div className='mx-auto mb-2 grid h-10 w-10 place-items-center text-current'>
          <Icon className='h-5 w-5' />
        </div>
        {isCustomize ? (
          <input
            defaultValue={shownLabel}
            onBlur={(e) => setButtonPref(key, { label: e.currentTarget.value })}
            className='text-xs text-center w-full rounded-md border border-border bg-card text-foreground px-1 py-0.5'
          />
        ) : (
          <div className='text-xs'>{shownLabel}</div>
        )}
      </button>
    </div>
  );
}

// ---- MAIN COMPONENT ----
export default function SidebarMock({
  activeView,
  onNavigate,
}: {
  activeView: string;
  onNavigate: (view: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { setPaymentSheetOpen, billOption } = useCart();
  const {
    isCustomize,
    toggleCustomize,
    colorOptions,
    globalBackgroundColor,
    setGlobalBackgroundColor,
    globalButtonColor,
    setGlobalButtonColor,
    getGlobalButtonClasses,
    getGlobalBackgroundClasses,
    getUserProfile,
  } = usePreferences();
  const { clearSession } = useSession();

  const userProfile = getUserProfile();
  const globalBtn = getGlobalButtonClasses();
  const globalBg = getGlobalBackgroundClasses();
  const router = useRouter();
  const [company, setCompany] = useState({
    name: 'Ezel Carwash Cilodong',
    logo: '/logo.png',
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className={[
        'flex h-full flex-col gap-3 p-3 overflow-y-auto',
        globalBg.bg,
      ].join(' ')}
    >
      {/* HEADER */}
      <div className='flex flex-col items-center mb-3'>
        {/* ✅ Logo company lebih ke bawah dengan margin & posisi center */}
        <div className='h-14 w-14 rounded-lg overflow-hidden mb-2 mt-2'>
          <Image
            src={
              company.logo?.startsWith('http')
                ? company.logo
                : company.logo || '/logo.png'
            }
            alt='Company Logo'
            width={56}
            height={56}
            className='object-cover h-full w-full'
            unoptimized
          />
        </div>

        {/* Company name */}
        {isCustomize ? (
          <input
            defaultValue={company.name}
            onBlur={(e) =>
              setCompany({ ...company, name: e.currentTarget.value })
            }
            className='h-10 text-center rounded-md text-black font-bold text-base'
          />
        ) : (
          <div className='text-center font-bold text-base text-foreground'>
            {company.name}
          </div>
        )}

        <div className='text-[12px] text-muted-foreground mt-1'>
          Powered by{' '}
          <span className='font-semibold text-primary uppercase'>SYNTRA</span>
        </div>
      </div>

      {/* NAVIGATION */}
      <div className='grid grid-cols-2 gap-3'>
        <div
          className={[
            'col-span-2 rounded-lg border p-3 cursor-pointer',
            globalBtn.bg,
            globalBtn.text,
            !billOption ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
          onClick={() => billOption && setPaymentSheetOpen(true)}
        >
          <div className='flex items-center gap-2 justify-center'>
            <div className='grid h-7 w-7 place-items-center text-current/80'>
              <Plus className='h-4 w-4' />
            </div>
            <span className='text-sm font-medium'>Create order</span>
          </div>
        </div>

        {navItems.map((item) => (
          <SidebarTileButton
            key={item.key}
            icon={item.icon}
            label={item.label}
            itemKey={item.key}
            onClick={() => onNavigate(item.key)}
            isActive={activeView === item.key}
          />
        ))}
      </div>

      {/* CUSTOMIZE SECTION */}
      {isCustomize && (
        <div className='mt-4 px-1'>
          <div className='rounded-lg border border-border bg-card p-3'>
            <h3 className='font-semibold text-sm mb-2'>Customize Theme</h3>
            {/* Background options */}
            <div className='mb-3'>
              <div className='text-xs mb-1'>Global Background</div>
              <div className='flex flex-wrap gap-2'>
                {colorOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setGlobalBackgroundColor(opt.key)}
                    className={[
                      'h-8 w-8 rounded-md border-2 transition-transform',
                      opt.classes.bg,
                      globalBackgroundColor === opt.key
                        ? 'ring-2 ring-offset-1 ring-primary'
                        : 'border-border',
                    ].join(' ')}
                  />
                ))}
              </div>
            </div>
            {/* Button options */}
            <div>
              <div className='text-xs mb-1'>Global Button Color</div>
              <div className='flex flex-wrap gap-2'>
                {colorOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setGlobalButtonColor(opt.key)}
                    className={[
                      'h-8 w-8 rounded-md border-2 transition-transform',
                      opt.classes.bg,
                      globalButtonColor === opt.key
                        ? 'ring-2 ring-offset-1 ring-primary'
                        : 'border-border',
                    ].join(' ')}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className='mt-auto space-y-2'>
        <button
          onClick={toggleCustomize}
          className={[
            'w-full rounded-lg border border-border p-3 flex items-center gap-2 justify-center hover:opacity-90 transition',
            globalBtn.bg,
            globalBtn.text,
          ].join(' ')}
        >
          <LayoutDashboard className='h-4 w-4' />
          <span className='text-sm'>{isCustomize ? 'Done' : 'Customize'}</span>
        </button>

        <div
          className='rounded-lg border border-border bg-card p-3 relative'
          ref={menuRef}
        >
          <div className='flex items-center gap-3'>
            <div className='h-9 w-9 rounded-md overflow-hidden'>
              <Image
                src={
                  company.logo?.startsWith('http')
                    ? company.logo
                    : company.logo || './Logo.png'
                }
                alt='User Profile'
                width={48}
                height={48}
                className='h-full w-full object-cover'
                unoptimized
              />
            </div>

            <div className='flex flex-col flex-1'>
              <span className='text-base font-medium text-foreground'>
                {userProfile.name}
              </span>
              <span className='text-xs text-muted-foreground'>
                {userProfile.role}
              </span>
            </div>

            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className='p-1 rounded hover:bg-accent transition'
            >
              <MoreVertical className='h-4 w-4 text-muted-foreground' />
            </button>

            {menuOpen && (
              <div className='absolute right-2 bottom-14 bg-card border border-border rounded-md shadow-md py-1 z-50 w-28'>
                <button
                  onClick={() => {
                    clearSession(); // hapus sesi
                    router.replace('/Login'); // ⬅️ arahkan ke /Kasir
                  }}
                  className='w-full text-left text-sm px-3 py-2 hover:bg-accent hover:text-destructive transition'
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
