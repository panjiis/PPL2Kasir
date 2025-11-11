// sidebar-mock.vB.tsx
'use client';

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import {
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
import { useTranslation } from 'react-i18next'; // <-- 1. Impor hook

interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

// Ini adalah label default (fallback)
const defaultNavItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'products', label: 'Products', icon: Boxes },
  { key: 'groups', label: 'Groups', icon: Tag },
  { key: 'paymentTypes', label: 'Payment', icon: Warehouse },
  { key: 'orders', label: 'Orders', icon: Users },
];

/* =========================
   ThemeSwitcher
   ========================= */
function ThemeSwitcher() {
  const { t } = useTranslation(); // <-- 't' adalah FUNGSI
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
    if (t === 'dark') return <Moon className='w-3.5 h-3.5' />;
    if (t === 'light') return <Sun className='w-3.5 h-3.5' />;
    return <Monitor className='w-3.5 h-3.5' />;
  };

  const themes = ['system', 'light', 'dark'] as const;

  return (
    <div className='mt-2 w-full flex justify-center overflow-x-auto px-1'>
      <div className='inline-flex rounded-md border border-border bg-secondary p-1'>
        {/* --- PERBAIKAN DI SINI --- */}
        {themes.map(
          (
            themeKey // <-- 't' diubah menjadi 'themeKey'
          ) => (
            <button
              key={themeKey} // <-- Gunakan themeKey
              type='button'
              onClick={() => handleThemeChange(themeKey)} // <-- Gunakan themeKey
              aria-pressed={theme === themeKey} // <-- Gunakan themeKey
              className={[
                'flex items-center gap-1 px-2 py-0.5 text-[10px] rounded transition-all whitespace-nowrap',
                theme === themeKey // <-- Gunakan themeKey
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-transparent text-foreground hover:bg-muted',
              ].join(' ')}
              title={
                themeKey === 'system' // <-- Gunakan themeKey
                  ? t('Sidebar.theme.systemTitle') // <-- 't' di sini adalah FUNGSI
                  : t('Sidebar.theme.'+themeKey) // <-- 't' di sini adalah FUNGSI
              }
            >
              {getIcon(themeKey)} {/* <-- Gunakan themeKey */}
              <span className='capitalize'>
                {t('Sidebar.theme.'+themeKey)}{' '}
                {/* <-- 't' di sini adalah FUNGSI */}
              </span>
            </button>
          )
        )}
        {/* --- AKHIR PERBAIKAN --- */}
      </div>
    </div>
  );
}

/* =========================
   LanguageSwitcher (BARU)
   ========================= */
function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const isId = currentLang.startsWith('id');
  const isEn = currentLang.startsWith('en');

  return (
    <div className='mt-2 w-full flex justify-center overflow-x-auto px-1'>
      <div className='inline-flex rounded-md border border-border bg-secondary p-1'>
        <button
          key='id'
          type='button'
          onClick={() => i18n.changeLanguage('id')}
          aria-pressed={isId}
          disabled={isId}
          className={[
            'flex items-center gap-1 px-3 py-0.5 text-[10px] rounded transition-all whitespace-nowrap',
            isId
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-transparent text-foreground hover:bg-muted',
            'disabled:opacity-50',
          ].join(' ')}
        >
          ID
        </button>
        <button
          key='en'
          type='button'
          onClick={() => i18n.changeLanguage('en')}
          aria-pressed={isEn}
          disabled={isEn}
          className={[
            'flex items-center gap-1 px-3 py-0.5 text-[10px] rounded transition-all whitespace-nowrap',
            isEn
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-transparent text-foreground hover:bg-muted',
            'disabled:opacity-50',
          ].join(' ')}
        >
          EN
        </button>
      </div>
    </div>
  );
}

/* =========================
   SidebarTileButton
   ========================= */
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
  // --- 1. PANGGIL HOOK i18n ---
  const { i18n } = useTranslation();

  const { isCustomize, getButtonLabel, setButtonPref, getButtonClasses } =
    usePreferences();

  // --- 2. BUAT KEY SPESIFIK BAHASA ---
  const lang = i18n.language.split('-')[0]; // Hasilnya 'id' atau 'en'
  const key = `sidebar:${itemKey}:${lang}`;  // Contoh: 'sidebar:dashboard:id'
  // --- AKHIR PERBAIKAN ---
  
  const color = getButtonClasses();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // 'label' (fallback) yang masuk sudah diterjemahkan (cth: "Dasbor")
  // 'getButtonLabel' sekarang akan mencari 'sidebar:dashboard:id' di localStorage
  // Jika tidak ada, ia akan 'return label' ("Dasbor")
  const shownLabel = isMounted ? getButtonLabel(key, label) : label;

  return (
    <div
      className={`p-1 text-center transition group ${
        isDragging ? 'opacity-90' : ''
      }`}
    >
      <button
        type='button'
        className={[
          'block rounded-md p-1.5 w-full transition',
          color.bg,
          color.text,
          'hover:ring-2',
          isActive ? 'ring-2 ring-primary ring-offset-1' : '',
        ].join(' ')}
        onClick={!isCustomize ? onClick : undefined}
      >
        <div className='mx-auto mb-1 grid h-8 w-8 place-items-center text-current'>
          <Icon className='h-4 w-4' />
        </div>

        {isCustomize ? (
          <input
            defaultValue={shownLabel} // Ini akan menampilkan 'Dasbor' atau kustomisasi 'id'
            onBlur={(e) => setButtonPref(key, { label: e.currentTarget.value })} // Akan menyimpan ke 'sidebar:dashboard:id'
            className='text-[10px] text-center w-full rounded-md border border-border bg-card text-foreground px-1 py-0.5'
          />
        ) : (
          <div className='text-[10px] text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[86px] mx-auto'>
            {shownLabel}
          </div>
        )}
      </button>
    </div>
  );
}

/* =========================
   SortableNavItem
   ========================= */
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
        label={item.label} // Label yang sudah diterjemahkan
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

/* =========================
   Main Sidebar
   ========================= */
export default function SidebarMock({
  activeView,
  onNavigate,
}: {
  activeView: string;
  onNavigate: (view: string) => void;
}) {
  const { t } = useTranslation(); // <-- 't' adalah FUNGSI
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
    name: 'Ezel Carwash Cilodong', // Sesuai aturan: tidak menerjemahkan nama
    logo: '/logo.png',
  });

  // Gunakan state untuk navItems agar bisa di-drag
  const [navItems, setNavItems] = useState<NavItem[]>(defaultNavItems);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // EFEK UNTUK MENERJEMAHKAN NAV ITEMS SAAT BAHASA BERUBAH
  useEffect(() => {
    setNavItems((currentItems) =>
      currentItems.map((item) => {
        // Cari label default (Inggris) dari defaultNavItems
        const defaultItem = defaultNavItems.find(d => d.key === item.key);
        // Terjemahkan menggunakan 't', fallback ke label Inggris jika tidak ketemu
        const translatedLabel = t(`Sidebar.nav.${item.key}`, defaultItem ? defaultItem.label : '');
        return { ...item, label: translatedLabel };
      })
    );
  }, [t]); // Jalankan ini setiap kali 't' (bahasa) berubah

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
    | ((
        token: string
      ) => Promise<
        { data: unknown[]; message?: string; success?: boolean } | unknown
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
      setPopupContent(<div>{t('Sidebar.apiPopup.noApi', { key })}</div>);
      return;
    }
    if (!session?.token) {
      setPopupContent(<div>{t('Sidebar.apiPopup.sessionExpired')}</div>);
      return;
    }
    setLoadingApi(true);
    try {
      const res = await apiFn(session.token);
      let content: React.ReactNode = <div>{t('Sidebar.apiPopup.noData')}</div>;
      const data = (res as { data?: unknown[] })?.data ?? res;

      if (Array.isArray(data) && data.length > 0) {
        content = (
          <div>
            <h2 className='font-bold mb-3 capitalize'>
              {t('Sidebar.apiPopup.dataTitle', { key })}
            </h2>
            <div className='grid gap-3'>
              {data.map((row: unknown, idx: number) => {
                const item = row as Record<string, unknown>;

                const itemKey = String(
                  item?.id ??
                    item?.product_code ??
                    item?.payment_name ??
                    item?.order_no ??
                    idx
                );

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
        'flex h-full min-h-[640px] flex-col gap-2 p-2 overflow-y-auto',
        globalBg,
      ].join(' ')}
    >
      <div className='flex flex-col items-center mb-3 pt-2'>
        <div className='h-12 w-12 rounded-lg overflow-hidden mb-1'>
          <Image
            src={
              company.logo?.startsWith('http')
                ? company.logo
                : company.logo || '/logo.png'
            }
            alt='Company Logo'
            width={48}
            height={48}
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
            className='h-8 text-center rounded-md text-black font-semibold text-[0.85rem] w-full max-w-[120px]'
          />
        ) : (
          <div className='text-center font-semibold text-[0.9rem] text-foreground leading-tight truncate max-w-[200px]'>
            {company.name}
          </div>
        )}
        <div className='text-[10px] text-muted-foreground mt-1 whitespace-nowrap'>
          Powered by{' '}
          <span className='font-semibold text-primary uppercase'>SYNTRA</span>
        </div>
        <ThemeSwitcher />
        <LanguageSwitcher /> {/* <-- Tombol Bahasa Ditambahkan di Sini */}
      </div>

      <div className='grid grid-cols-2 gap-2'>
        {/* Blok !isMounted (fallback) */}
        {!isMounted &&
          defaultNavItems.map((item) => (
            <SidebarTileButton
              key={item.key}
              icon={item.icon}
              label={item.label} // Akan menampilkan bahasa Inggris
              itemKey={item.key}
              onClick={() => onNavigate(item.key)}
              isActive={activeView === item.key}
            />
          ))}

        {/* Blok isMounted (client-side) */}
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
                  item={item} // 'item' dari state 'navItems' sudah diterjemahkan
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
        <div className='mt-3 px-1'>
          <div className='rounded-lg border border-border bg-card p-2'>
            <h3 className='font-semibold text-sm mb-2'>
              {t('Sidebar.customize.title')}
            </h3>

            <div className='text-xs mb-1'>{t('Sidebar.customize.package')}</div>
            <div className='flex flex-wrap gap-2'>
              {themePackages.map(
                (opt: { key: string; label: string; bg: string }) => (
                  <button
                    key={opt.key}
                    onClick={() => setActiveThemeKey(opt.key)}
                    className={[
                      'h-7 w-7 rounded-md border-2 transition-transform',
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
            'w-full rounded-lg border border-border p-2 flex items-center gap-2 justify-center hover:opacity-90 transition text-sm',
            globalBtn.bg,
            globalBtn.text,
          ].join(' ')}
        >
          <LayoutDashboard className='h-4 w-4' />
          <span className='text-[13px]'>
            {isCustomize
              ? t('Sidebar.customize.done')
              : t('Sidebar.customize.customize')}
          </span>
        </button>

        <div
          className='rounded-lg border border-border bg-card p-2 relative'
          ref={menuRef}
        >
          <div className='flex items-center gap-2'>
            <div className='h-8 w-8 rounded-md overflow-hidden'>
              <Image
                src={
                  company.logo?.startsWith('http')
                    ? company.logo
                    : company.logo || './Logo.png'
                }
                alt='User Profile'
                width={40}
                height={40}
                className='h-full w-full object-cover'
                unoptimized
              />
            </div>

            <div className='flex flex-col flex-1 min-w-0'>
              <span className='text-sm font-medium text-foreground truncate'>
                {userProfile.name}
              </span>
              <span className='text-[11px] text-muted-foreground truncate'>
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
                  {t('Sidebar.profile.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {popupContent && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
          <div className='bg-white dark:bg-card rounded-lg shadow-lg p-6 max-w-lg w-[min(95vw,640px)]'>
            <div className='mt-4 flex justify-between items-center'>
              <div className='text-sm text-muted-foreground'>
                {loadingApi
                  ? t('Sidebar.apiPopup.loading')
                  : t('Sidebar.apiPopup.result')}
              </div>
              <div className='text-right'>
                <button
                  className='px-4 py-2 rounded bg-primary text-primary-foreground'
                  onClick={() => setPopupContent(null)}
                >
                  {t('Sidebar.apiPopup.close')}
                </button>
              </div>
            </div>
            <div className='mt-4'>{popupContent}</div>
          </div>
        </div>
      )}
    </div>
  );
}