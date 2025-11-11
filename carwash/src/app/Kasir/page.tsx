'use client';
// import Image from 'next/image';
// Impor useState dan useEffect
import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShoppingCart } from 'lucide-react'; // <-- PERBAIKAN: Impor ikon keranjang
import { useTranslation } from 'react-i18next'; // <-- 1. Impor hook

import SidebarMock from './sidebar-mock';
import CenterMock from './center-mock';
import AsideMock from './aside-mock';
// Pastikan useCart diimpor dari cart-content, bukan lib/context/cart-content
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

const queryClient = new QueryClient();

function KasirInnerPage() {
  const { t } = useTranslation(); // <-- 2. Panggil hook
  const { addItem } = useCart();
  const { getBackgroundClass } = usePreferences();
  // 'surface' akan didefinisikan nanti setelah 'isMounted' true

  const [currentView, setCurrentView] = useState('dashboard');
  const [editingProductCode] = useState<string | null>(null);
  // <-- PERBAIKAN: State untuk mengontrol drawer keranjang di tablet
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // State untuk melacak apakah komponen sudah di-mount di client
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Set isMounted menjadi true hanya setelah komponen di-mount di client
    setIsMounted(true);
  }, []);

  useEffect(() => {
    function handler(e: Event) {
      const ev = e as CustomEvent;
      if (ev?.detail?.view) {
        setCurrentView(String(ev.detail.view));
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
      case 'update':
        if (!editingProductCode) {
          setCurrentView('products');
          return <ProductsView />;
        }

      case 'dashboard':
      default:
        return <CenterMock />;
    }
  };

  // Jika belum di-mount (SSR atau hydration awal), return null
  // Ini memastikan server dan client render hal yang sama (kosong)
  if (!isMounted) {
    return null;
  }

  // Setelah 'isMounted' true, kita aman memanggil 'getBackgroundClass'
  // karena ini pasti terjadi di client
  const surface = getBackgroundClass();
  console.log(surface);

  return (
    <DndContext onDragEnd={onDragEnd}>
      <main className='h-screen w-full bg-background overflow-hidden'>
        <div className='mx-auto w-full max-w-[min(1400px,96vw)] px-3 sm:px-4 lg:px-6 h-full flex flex-col'>
          {/*
            PERBAIKAN LAYOUT RESPONSIVE:
            - md (768px+): 2 kolom [Sidebar | Konten]
            - lg (1024px+): 2 kolom [Sidebar | Konten] (Tetap 2 kolom untuk iPad portrait)
            - xl (1280px+): 3 kolom [Sidebar | Konten | Keranjang] (Hanya di layar lebar)
          */}
          <div
            className='
     grid gap-3
    grid-cols-1
    sm:grid-cols-[180px_1fr]       /* Mulai dua kolom di 640px */
    md:grid-cols-[200px_1fr]       /* iPad Mini portrait */
    lg:grid-cols-[220px_1fr]       /* iPad Air portrait */
    xl:grid-cols-[260px_1fr_300px] /* Desktop */
    2xl:grid-cols-[300px_1fr_340px]
    flex-1 overflow-hidden
  '
          >
            {/* SIDEBAR KIRI */}
            <aside
              aria-label='Navigation'
              className={[
                'rounded-lg border border-border overflow-y-auto',
                'h-full min-h-[calc(100vh-8rem)]',
                'hidden md:block',
                surface, // 'surface' aman digunakan di sini
              ].join(' ')}
            >
              <SidebarMock
                activeView={currentView}
                onNavigate={setCurrentView}
              />
            </aside>

            {/* BAGIAN TENGAH */}
            <section
              aria-label='Content'
              className={[
                'rounded-lg border border-border overflow-y-auto relative',
                'min-h-[calc(100vh-8rem)] p-3 sm:p-4 md:p-5',
                'text-[clamp(0.85rem,1vw,1rem)]',
                surface, // 'surface' aman digunakan di sini
              ].join(' ')}
            >
              {renderCurrentView()}

              {/*
                PERBAIKAN: TOMBOL CART UNTUK TABLET
                Tombol ini hanya muncul di layar < xl (di bawah 1280px)
                dimana sidebar kanan (AsideMock) tersembunyi.
               
              */}
              <div className='xl:hidden fixed bottom-20 right-[calc(max(24px,env(safe-area-inset-right)))] z-40'>
                <button
                  type='button'
                  onClick={() => setIsCartDrawerOpen(true)}
                  className='rounded-full bg-primary text-primary-foreground p-4 shadow-lg active:scale-95 transition-transform'
                  aria-label={t('Aside.openCartLabel')} // <-- 3. Ganti teks
                >
                  <ShoppingCart className='h-6 w-6' />
                </button>
              </div>
            </section>

            {/* ASIDE KANAN */}
            <aside
              aria-label='Right Sidebar'
              className={[
                'rounded-lg border border-border overflow-hidden relative',
                'p-2 sm:p-3 md:p-4 h-full min-h-[calc(100vh-8rem)]',
                'hidden xl:flex flex-col', // <-- PERBAIKAN: Tampil mulai xl (1280px)
                surface, // 'surface' aman digunakan di sini
              ].join(' ')}
            >
              <div className='flex-1 overflow-y-auto'>
                <AsideMock />
              </div>
            </aside>
          </div>

          {/*
            PERBAIKAN: MODAL/DRAWER UNTUK CART
            Ini akan merender AsideMock di dalam modal
            saat tombol floating cart diklik di tablet.
           
          */}
          {isCartDrawerOpen && (
            <div
              className='xl:hidden fixed inset-0 z-50 flex items-end justify-center'
              onClick={() => setIsCartDrawerOpen(false)} // Klik di luar untuk menutup
            >
              {/* Backdrop */}
              <div className='absolute inset-0 bg-black/30 backdrop-blur-sm' />

              {/* Konten Drawer */}
              <div
                className='relative w-full max-w-md h-[90vh] bg-background border-t border-border rounded-t-2xl shadow-lg p-4 flex flex-col z-10'
                onClick={(e) => e.stopPropagation()} // Mencegah drawer tertutup saat diklik di dalam
              >
                {/* Handle (garis abu-abu) */}
                <div className='mx-auto mb-4 h-1 w-12 flex-shrink-0 rounded-full bg-muted-foreground/40' />

                {/* Konten AsideMock */}
                <div className='flex-1 overflow-y-auto'>
                  <AsideMock />
                </div>
              </div>
            </div>
          )}

          {/* <footer className='mt-2 rounded-lg bg-primary px-3 sm:px-4 py-2 sm:py-3 text-primary-foreground text-center sm:text-left'>
            <div className='mx-auto flex flex-col sm:flex-row items-center justify-between gap-2'>
              <div className='flex items-center gap-2'>
                <Image
                  src='/logo.png'
                  alt='Logo'
                  width={28}
                  height={28}
                  className='rounded-md object-cover bg-muted'
                  priority
                />
              </div>
              <p className='text-xs sm:text-sm opacity-90'>
                Copyright 2025 Ngumpul Pas Deadline
              </p>
            </div>
          </footer> */}
        </div>
      </main>
    </DndContext>
  );
}

export default function KasirPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        {/* <AuthProvider> */} {/* AuthProvider tidak ada di file Anda */}
          <PreferencesProvider>
            <NotificationProvider>
              <CartProvider>
                <KasirInnerPage />
              </CartProvider>
            </NotificationProvider>
          </PreferencesProvider>
        {/* </AuthProvider> */}
      </SessionProvider>
    </QueryClientProvider>
  );
}