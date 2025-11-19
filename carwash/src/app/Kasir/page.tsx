'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import SidebarMock from './sidebar-mock';
import CenterMock from './center-mock';
import AsideMock from './aside-mock';
import { CartProvider, useCart, type CartItem } from './cart-content';
import { NotificationProvider } from './notification-context';

import {
  PreferencesProvider,
  usePreferences,
} from '../providers/preferences-context';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import type { ProductItem } from './dummy';
import { SessionProvider } from '../lib/context/session';
import ProductsView from './products-view';
import GroupsView from './groups-view';
import PaymentTypesView from './payment-types-view';
import OrdersView from './orders-view';
import '@/app/lib/il8n';
// import DashboardView from './dashboard-view'; // <-- Tidak lagi digunakan sebagai tampilan default

const queryClient = new QueryClient();

function KasirInnerPage() {
  const { t } = useTranslation();
  const { addItem } = useCart();
  const { getBackgroundClass } = usePreferences();

  // State awal tetap 'dashboard' agar sidebar aktif di tombol pertama
  const [currentView, setCurrentView] = useState('dashboard');
  const [editingProductCode] = useState<string | null>(null);

  // State untuk Drawer Mobile/Tablet
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    function handler(e: Event) {
      const ev = e as CustomEvent;
      if (ev?.detail?.view) {
        setCurrentView(String(ev.detail.view));
        // Tutup sidebar jika navigasi terjadi (UX mobile/tablet)
        if (window.innerWidth < 1280) {
          setIsSidebarOpen(false);
        }
      }
    }
    window.addEventListener('navigate-kasir-view', handler as EventListener);
    return () =>
      window.removeEventListener(
        'navigate-kasir-view',
        handler as EventListener
      );
  }, []);

  function convertProductToCartItem(p: ProductItem): CartItem {
    return {
      id: p.id,
      itemId: p.itemId,
      name: p.name,
      image: p.image ?? '',
      price: p.price,
      type: p.type,
      category: p.category ?? '',
      description: p.description ?? '',
      barcode: p.barcode ?? '',
      qty: 1,
    };
  }

  const onDragEnd = (event: DragEndEvent) => {
    const product = event.active?.data?.current?.product as
      | ProductItem
      | undefined;
    if (product && event.over?.id === 'cart-dropzone') {
      const cartItem = convertProductToCartItem(product);
      addItem(cartItem);
    }
  };

  // --- PERUBAHAN UTAMA DI SINI ---
  const renderCurrentView = () => {
    switch (currentView) {
      case 'products':
        return <ProductsView />;
      case 'groups':
        return <GroupsView />;
      case 'paymentTypes':
        return <PaymentTypesView />;
      case 'orders':
        return <OrdersView />;

      // Hapus case 'dashboard' yang me-return DashboardView (teks selamat datang)
      // case 'dashboard': return <DashboardView />;

      case 'update':
        if (!editingProductCode) {
          setCurrentView('products'); // Redirect ke tabel produk jika tidak ada kode edit
          return <ProductsView />;
        }
        return <ProductsView />;

      case 'dashboard':
      default:
        return <CenterMock />;
    }
  };

  if (!isMounted) return null;

  const surface = getBackgroundClass();

  return (
    <DndContext onDragEnd={onDragEnd}>
      <main className='h-screen w-full bg-background overflow-hidden relative'>
        <div className='mx-auto w-full max-w-[min(1600px,98vw)] px-2 sm:px-4 h-full flex flex-col py-2 sm:py-4'>
          {/* GRID SYSTEM RESPONSIVE */}
          <div
            className='
              grid gap-3 h-full overflow-hidden
              grid-cols-1 
              md:grid-cols-[1fr_320px] 
              xl:grid-cols-[240px_1fr_340px]
            '
          >
            {/* --- 1. DESKTOP SIDEBAR (Hanya muncul di XL ke atas) --- */}
            <aside
              aria-label='Navigation Desktop'
              className={[
                'rounded-lg border border-border overflow-y-auto hidden xl:block',
                surface,
              ].join(' ')}
            >
              <SidebarMock
                activeView={currentView}
                onNavigate={setCurrentView}
              />
            </aside>

            {/* --- 2. MAIN CONTENT CENTER --- */}
            <section
              aria-label='Content'
              className={[
                'rounded-lg border border-border overflow-y-auto relative flex flex-col',
                'p-1',
                surface,
              ].join(' ')}
            >
              {/* Hamburger Button (Muncul di Mobile & Tablet / < XL) */}
              <div className='xl:hidden flex items-center p-2 pb-0 mb-2'>
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className='p-2 rounded-md hover:bg-accent border border-border shadow-sm flex items-center gap-2'
                  aria-label={t('Sidebar.menuLabel', 'Menu')}
                >
                  <Menu className='h-5 w-5' />
                  <span className='text-sm font-semibold'>
                    {t('Sidebar.menuLabel', 'Menu')}
                  </span>
                </button>
              </div>

              {/* Render Content */}
              <div className='flex-1 overflow-y-auto'>
                {renderCurrentView()}
              </div>

              {/* Floating Cart Button (HANYA Mobile < MD) */}
              <div className='md:hidden fixed bottom-6 right-6 z-40'>
                <button
                  type='button'
                  onClick={() => setIsCartDrawerOpen(true)}
                  className='rounded-full bg-primary text-primary-foreground p-4 shadow-lg active:scale-95 transition-transform flex items-center justify-center'
                  aria-label={t('Aside.openCartLabel', 'Buka Keranjang')}
                >
                  <ShoppingCart className='h-6 w-6' />
                </button>
              </div>
            </section>

            {/* --- 3. RIGHT SIDEBAR / CART (Muncul Static di Tablet/MD & Desktop/XL) --- */}
            <aside
              aria-label='Right Sidebar'
              className={[
                'rounded-lg border border-border overflow-hidden relative',
                'hidden md:flex flex-col',
                surface,
              ].join(' ')}
            >
              <div className='flex-1 overflow-y-auto'>
                <AsideMock />
              </div>
            </aside>
          </div>

          {/* --- DRAWER: SIDEBAR (HAMBURGER) --- */}
          {isSidebarOpen && (
            <div className='fixed inset-0 z-[60] flex'>
              <div
                className='absolute inset-0 bg-black/50 backdrop-blur-sm'
                onClick={() => setIsSidebarOpen(false)}
              />

              <div className='relative w-[260px] h-full bg-background border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-200'>
                <div className='flex justify-end p-2'>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className='p-2 hover:bg-accent rounded-md'
                    aria-label={t('Common.close', 'Tutup')}
                  >
                    <X className='h-5 w-5' />
                  </button>
                </div>
                <div className='flex-1 overflow-y-auto px-2 pb-4'>
                  <SidebarMock
                    activeView={currentView}
                    onNavigate={(view) => {
                      setCurrentView(view);
                      setIsSidebarOpen(false);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* --- DRAWER: CART (MOBILE Only) --- */}
          {isCartDrawerOpen && (
            <div
              className='md:hidden fixed inset-0 z-[60] flex items-end justify-center'
              onClick={() => setIsCartDrawerOpen(false)}
            >
              <div className='absolute inset-0 bg-black/50 backdrop-blur-sm' />
              <div
                className='relative w-full max-w-md h-[85vh] bg-background border-t border-border rounded-t-2xl shadow-lg p-0 flex flex-col z-10 animate-in slide-in-from-bottom duration-200'
                onClick={(e) => e.stopPropagation()}
              >
                <div className='flex items-center justify-between p-4 border-b border-border bg-muted/30 rounded-t-2xl'>
                  <div className='mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/20 absolute left-0 right-0 top-3' />
                  <span className='font-bold mt-2'>
                    {t('Aside.cartTitle', 'Keranjang')}
                  </span>
                  <button
                    onClick={() => setIsCartDrawerOpen(false)}
                    className='mt-2'
                    aria-label={t('Common.close', 'Tutup')}
                  >
                    <X className='h-5 w-5' />
                  </button>
                </div>
                <div className='flex-1 overflow-y-auto'>
                  <AsideMock />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </DndContext>
  );
}

export default function KasirPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <PreferencesProvider>
          <NotificationProvider>
            <CartProvider>
              <KasirInnerPage />
            </CartProvider>
          </NotificationProvider>
        </PreferencesProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
