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
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useCart } from './cart-content';
import { usePreferences } from '../providers/preferences-context';
import { useSession } from '../lib/context/session';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  fetchProducts,
  fetchProductGroups,
  fetchPaymentTypes,
  fetchOrders,
} from '../lib/utils/pos-api';

interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const defaultNavItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'products', label: 'Products', icon: Boxes },
  { key: 'groups', label: 'Groups', icon: Tag },
  { key: 'paymentTypes', label: 'Payment', icon: Warehouse },
  { key: 'orders', label: 'Orders', icon: Users },
];

function ThemeSwitcher() {
  const { setActiveThemeKey } = usePreferences();
  const [theme, setTheme] = useState<'system' | 'dark' | 'light'>('system');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window === 'undefined') return;

    const savedTheme =
      (localStorage.getItem('theme-preference') as
        | 'system'
        | 'dark'
        | 'light') || 'system';
    setTheme(savedTheme);

    const root = document.documentElement;

    const apply = (t: 'system' | 'dark' | 'light') => {
      if (t === 'dark') {
        root.classList.add('dark');
        localStorage.setItem('theme-preference', 'dark');
      } else if (t === 'light') {
        root.classList.remove('dark');
        localStorage.setItem('theme-preference', 'light');
      } else {
        localStorage.setItem('theme-preference', 'system');
        const prefersDark =
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) root.classList.add('dark');
        else root.classList.remove('dark');
      }
    };

    apply(savedTheme);

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (savedTheme === 'system') {
        if (e.matches) root.classList.add('dark');
        else root.classList.remove('dark');
      }
    };
    mql.addEventListener('change', handler);

    return () => mql.removeEventListener('change', handler);
  }, []);

  if (!isMounted) return null;

  const handleThemeChange = (newTheme: 'system' | 'dark' | 'light') => {
    setTheme(newTheme);
    const root = document.documentElement;

    // Sinkronisasi dengan Theme Packages
    if (newTheme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme-preference', 'dark');
      setActiveThemeKey('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
      localStorage.setItem('theme-preference', 'light');
      setActiveThemeKey('light');
    } else {
      localStorage.setItem('theme-preference', 'system');
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      if (prefersDark) {
        root.classList.add('dark');
        setActiveThemeKey('dark');
      } else {
        root.classList.remove('dark');
        setActiveThemeKey('light');
      }
    }
  };

  const getIcon = (t: 'system' | 'dark' | 'light') => {
    if (t === 'dark') return <Moon className='w-4 h-4' />;
    if (t === 'light') return <Sun className='w-4 h-4' />;
    return <Monitor className='w-4 h-4' />;
  };

  return (
    <div className='mt-2 flex items-center justify-center gap-2'>
      <div
        className='inline-flex rounded-md border border-border bg-secondary p-1 transition-colors duration-500 ease-in-out'
        style={{
          transition: 'background-color 0.5s ease, color 0.5s ease',
        }}
      >
        {(['system', 'light', 'dark'] as const).map((t) => (
          <button
            key={t}
            type='button'
            onClick={() => handleThemeChange(t)}
            aria-pressed={theme === t}
            className={[
              'flex items-center gap-2 px-3 py-1 text-xs rounded transition-all duration-500 ease-in-out',
              theme === t
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-transparent text-foreground hover:bg-muted',
            ].join(' ')}
            title={t === 'system' ? 'Follow system (Windows) setting' : t}
          >
            {getIcon(t)}
            <span className='capitalize'>{t === 'system' ? 'System' : t}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SidebarTileButton({
  icon: Icon,
  label,
  itemKey,
  onClick,
  isActive,
  isDragging,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  itemKey: string;
  onClick: () => void;
  isActive: boolean;
  isDragging?: boolean;
}) {
  const { isCustomize, getButtonLabel, setButtonPref, getButtonClasses } =
    usePreferences();
  const key = `sidebar:${itemKey}`;
  const color = getButtonClasses();

  // ✅ Hindari mismatch dengan menunggu client mount
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const shownLabel = isMounted ? getButtonLabel(key, label) : label;

  return (
    <div
      className={`p-3 text-center transition group ${
        isDragging ? 'opacity-90' : ''
      }`}
    >
      <button
        type='button'
        className={[
          'block rounded-md p-2 w-full transition',
          color.bg,
          color.text,
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
          <div className='text-xs' suppressHydrationWarning>
            {shownLabel}
          </div>
        )}
      </button>
    </div>
  );
}

function SortableNavItem({
  id,
  item,
  onNavigate,
  isActive,
}: {
  id: string;
  item: NavItem;
  onNavigate: (view: string) => void;
  isActive: boolean;
  onFetch: (key: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <SidebarTileButton
        icon={item.icon}
        label={item.label}
        itemKey={item.key}
        onClick={() => {
          onNavigate(item.key);
        }}
        isActive={isActive}
        isDragging={isDragging}
      />
    </div>
  );
}

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
    themePackages,
    activeThemeKey,
    setActiveThemeKey,
    getButtonClasses,
    getBackgroundClass,
    getUserProfile,
  } = usePreferences();
  const { session, clearSession } = useSession();

  const userProfile = getUserProfile();
  const globalBtn = getButtonClasses();
  const globalBg = getBackgroundClass();
  const router = useRouter();
  const [company, setCompany] = useState({
    name: 'Ezel Carwash Cilodong',
    logo: '/logo.png',
  });

  const [navItems, setNavItems] = useState<NavItem[]>(defaultNavItems);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const oldIndex = navItems.findIndex((n) => n.key === active.id);
      const newIndex = navItems.findIndex((n) => n.key === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      setNavItems((items) => arrayMove(items, oldIndex, newIndex));
    }
  };

  // popup state for API results
  const [popupContent, setPopupContent] = useState<React.ReactNode | null>(
    null
  );
  const [loadingApi, setLoadingApi] = useState(false);

  const apiMap: Record<
    string,
    | ((token: string) => Promise<
        | { data: unknown[]; message?: string; success?: boolean } // Mengganti 'any[]' dengan 'unknown[]'
        | unknown // Mengganti 'any' dengan 'unknown'
      >)
    | undefined
  > = {
    products: fetchProducts,
    groups: fetchProductGroups,
    paymentTypes: fetchPaymentTypes,
    orders: fetchOrders,
  };

  const handleNavClickFetch = async (key: string) => {
    const apiFn = apiMap[key];
    if (!apiFn) {
      setPopupContent(<div>No API mapped for {key}</div>);
      return;
    }
    if (!session?.token) {
      setPopupContent(<div>Session expired, please login again.</div>);
      return;
    }
    setLoadingApi(true);
    try {
      const res = await apiFn(session.token);
      let content: React.ReactNode = <div>Tidak ada data.</div>;
      const data = (res as { data?: unknown[] })?.data ?? res;

      if (Array.isArray(data) && data.length > 0) {
        content = (
          <div>
            <h2 className='font-bold mb-3 capitalize'>{key} Data</h2>
            <div className='grid gap-3'>
              {data.map((row: unknown, idx: number) => {
                // FIX: Mengganti 'any' dengan 'unknown'
                const item = row as Record<string, unknown>;

                // FIX: Menggunakan String() untuk konversi yang aman dari 'unknown'
                const itemKey = String(
                  item?.id ??
                    item?.product_code ??
                    item?.payment_name ??
                    item?.order_no ??
                    idx
                );

                // FIX: Menggunakan String() untuk konversi yang aman dari 'unknown'
                const itemTitle = String(
                  item?.product_name ??
                    item?.product_group_name ??
                    item?.payment_name ??
                    item?.order_no ??
                    `Item ${idx + 1}`
                );

                return (
                  <div
                    key={itemKey}
                    className='border rounded-lg p-3 bg-muted shadow dark:bg-muted'
                  >
                    <div className='mb-2 text-base font-bold'>{itemTitle}</div>
                    <div className='text-xs text-gray-700 dark:text-gray-200 space-y-1'>
                      {/* Kode ini sudah aman karena 'v' akan bertipe 'unknown' 
                        dan String(v ?? '') menanganinya dengan benar. */}
                      {Object.entries(item).map(([k, v]) => (
                        <div key={k}>
                          <strong className='mr-1'>{k}:</strong>{' '}
                          {String(v ?? '')}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      setPopupContent(
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>{content}</div>
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPopupContent(<div className='text-red-500'>{message}</div>);
    } finally {
      setLoadingApi(false);
    }
  };

  return (
    <div
      className={[
        'flex h-full flex-col gap-3 p-3 overflow-y-auto',
        globalBg,
      ].join(' ')}
    >
      <div className='flex flex-col items-center mb-3'>
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

        <ThemeSwitcher />
      </div>

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

        {!isMounted &&
          navItems.map((item) => (
            <SidebarTileButton
              key={item.key}
              icon={item.icon}
              label={item.label}
              itemKey={item.key}
              onClick={() => onNavigate(item.key)}
              isActive={activeView === item.key}
            />
          ))}

        {isMounted && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={navItems.map((n) => n.key)}
              strategy={verticalListSortingStrategy}
            >
              {navItems.map((item) => (
                <SortableNavItem
                  key={item.key}
                  id={item.key}
                  item={item}
                  onNavigate={onNavigate}
                  isActive={activeView === item.key}
                  onFetch={handleNavClickFetch}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {isCustomize && (
        <div className='mt-4 px-1'>
          <div className='rounded-lg border border-border bg-card p-3'>
            <h3 className='font-semibold text-sm mb-2'>Customize Theme</h3>

            <div className='text-xs mb-1'>Theme Package</div>
            <div className='flex flex-wrap gap-2'>
              {themePackages.map(
                (opt: { key: string; label: string; bg: string }) => (
                  <button
                    key={opt.key}
                    onClick={() => setActiveThemeKey(opt.key)}
                    className={[
                      'h-8 w-8 rounded-md border-2 transition-transform',
                      opt.bg,
                      activeThemeKey === opt.key
                        ? 'ring-2 ring-offset-1 ring-primary'
                        : 'border-border',
                    ].join(' ')}
                    title={opt.label}
                  />
                )
              )}
            </div>
          </div>
        </div>
      )}

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
                    clearSession();
                    router.replace('/Login');
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

      {/* Popup modal for API results */}
      {popupContent && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
          <div className='bg-white dark:bg-card rounded-lg shadow-lg p-6 max-w-lg w-[min(95vw,640px)]'>
            <div className='mt-4 flex justify-between items-center'>
              <div className='text-sm text-muted-foreground'>
                {loadingApi ? 'Loading...' : 'API result'}
              </div>
              <div className='text-right'>
                <button
                  className='px-4 py-2 rounded bg-primary text-primary-foreground'
                  onClick={() => setPopupContent(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
