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
// import type {
//   PosProduct,
//   ProductGroup,
//   PaymentType,
//   PosOrder,
// } from '../lib/types/pos';
import Image from 'next/image';

// ---- TYPE DEFINITIONS ----


interface NavItem {
  key: string;
  label: string;
  icon: typeof Boxes;
}

// ---- ✅ NAV CONFIG (API property removed) ----
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
  isActive, // <-- new prop to highlight active button
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
          isActive ? 'ring-2 ring-primary ring-offset-2' : '', // <-- highlight style
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

  const globalBtn = getGlobalButtonClasses();
  const globalBg = getGlobalBackgroundClasses();
  const userProfile = getUserProfile();

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

  const { clearSession } = useSession();

  return (
    <div
      className={[
        'flex h-full flex-col gap-3 p-3 overflow-y-auto',
        globalBg.bg,
      ].join(' ')}
    >
      {/* HEADER */}
      <div className='flex items-center gap-2 px-1 mb-2'>
        <div className='h-12 w-12 rounded-md overflow-hidden'>
          <Image
            src={
              company.logo?.startsWith('http')
                ? company.logo
                : company.logo || '/logo.png'
            }
            alt='Logo'
            width={48}
            height={48}
            className='h-12 w-12 object-cover'
            unoptimized
          />
        </div>
        {isCustomize ? (
          <input
            defaultValue={company.name}
            onBlur={(e) =>
              setCompany({ ...company, name: e.currentTarget.value })
            }
            className='h-10 flex-1 rounded-md text-black text-center font-bold text-base'
          />
        ) : (
          <div className='h-10 flex-1 rounded-md text-black flex items-center justify-center font-bold text-base px-2'>
            {company.name}
          </div>
        )}
      </div>

      {/* POWERED BY */}
      <div className='flex items-center justify-center text-[12px] text-muted-foreground mt-[-15px] mb-2'>
        <span>Powered by</span>
        <span className='ml-1 font-semibold tracking-wide text-primary uppercase'>
          SYNTRA
        </span>
      </div>

      {/* NAVIGATION BUTTONS */}
      <div className='grid grid-cols-2 gap-3 px-0'>
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
            onClick={() => onNavigate(item.key)} // <-- Triggers navigation
            isActive={activeView === item.key} // <-- Sets active state
          />
        ))}
      </div>

      {/* CUSTOMIZE THEME */}
      {isCustomize && (
        <div className='mt-4 px-1'>
          <div className='rounded-lg border border-border bg-card p-3'>
            <h3 className='font-semibold text-sm text-foreground mb-2'>
              Customize Theme
            </h3>
            <div className='mb-3'>
              <div className='text-xs text-muted-foreground mb-1'>
                Global Background
              </div>
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
            <div>
              <div className='text-xs text-muted-foreground mb-1'>
                Global Button Color
              </div>
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

      {/* FOOTER / LOGOUT */}
      <div className='mt-auto px-1 space-y-2'>
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
            <div className='h-8 w-8 rounded-md overflow-hidden'>
              <Image
                src={userProfile.photo || '/logo.png'}
                alt='User'
                width={32}
                height={32}
                className='h-8 w-8 object-cover'
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
                    clearSession();
                    window.location.reload();
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