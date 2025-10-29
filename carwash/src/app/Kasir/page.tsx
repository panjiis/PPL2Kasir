'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import SidebarMock from './sidebar-mock';
import CenterMock from './center-mock';
import AsideMock from './aside-mock';
import { CartProvider, type CartItem } from './cart-content';
import { NotificationProvider } from './notification-context';
import { AuthProvider } from '../providers/auth-context';
import {
  PreferencesProvider,
  usePreferences,
} from '../providers/preferences-context';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { useCart } from './cart-content';
import type { ProductItem } from './dummy';
import { SessionProvider } from '../lib/context/session';
import ProductsView from './products-view';
import GroupsView from './groups-view';
import PaymentTypesView from './payment-types-view';
import OrdersView from './orders-view';
import ProductUpdateView from './product-update-view';

const queryClient = new QueryClient();

function KasirInnerPage() {
  const { addItem } = useCart();
  const { getBackgroundClass } = usePreferences();
  const surface = getBackgroundClass();
  console.log(surface);

  const [currentView, setCurrentView] = useState('dashboard');
  const [editingProductCode, setEditingProductCode] = useState<string | null>(null);

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

  const handleEditProduct = (code: string) => {
    setEditingProductCode(code);
    setCurrentView('update');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'products':
        return (
          <ProductsView
            onEdit={handleEditProduct}
          />
        );
      case 'groups':
        return <GroupsView />;
      case 'paymentTypes':
        return <PaymentTypesView />;
      case 'orders':
        return <OrdersView />;
      case 'update':
        if (!editingProductCode) {
          setCurrentView('products');
          return <ProductsView onEdit={handleEditProduct} />;
        }
        return (
          <ProductUpdateView
            productCode={editingProductCode}
            onBack={() => {
              setEditingProductCode(null);
              setCurrentView('products');
            }}
            onSuccess={() => {
              setEditingProductCode(null);
              setCurrentView('products');
            }}
          />
        );
      case 'dashboard':
      default:
        return <CenterMock />;
    }
  };

  return (
    <DndContext onDragEnd={onDragEnd}>
      <main className='h-screen w-full bg-background overflow-hidden'>
        <div className='mx-auto w-full max-w-[min(1400px,96vw)] px-3 sm:px-4 lg:px-6 h-full flex flex-col'>
          <div className='grid gap-2 md:grid-cols-[300px_1fr_340px] flex-1 overflow-hidden'>
            <aside
              aria-label='Navigation'
              className={[
                'rounded-lg border border-border h-full overflow-hidden',
                surface,
              ].join(' ')}
            >
              <SidebarMock
                activeView={currentView}
                onNavigate={setCurrentView}
              />
            </aside>

            <section
              aria-label='Content'
              className={[
                'rounded-lg border border-border h-full overflow-y-auto relative',
                surface,
              ].join(' ')}
            >
              {renderCurrentView()}
            </section>

            <aside
              aria-label='Right Sidebar'
              className={[
                'rounded-lg border border-border p-3 md:p-4 h-full overflow-hidden relative',
                surface,
              ].join(' ')}
            >
              <AsideMock />
            </aside>
          </div>

          <footer className='mt-2 rounded-lg bg-primary px-4 py-3 text-primary-foreground flex-shrink-0'>
            <div className='mx-auto flex max-w-[1400px] items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Image
                  src='/logo.png'
                  alt='Logo'
                  width={32}
                  height={32}
                  className='rounded-md object-cover bg-muted'
                  priority
                />
              </div>
              <p className='text-sm opacity-90'>
                Copyright 2025 Ngumpul Pas Deadline
              </p>
            </div>
          </footer>
        </div>
      </main>
    </DndContext>
  );
}

export default function KasirPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AuthProvider>
          <PreferencesProvider>
            <NotificationProvider>
              <CartProvider>
                <KasirInnerPage />
              </CartProvider>
            </NotificationProvider>
          </PreferencesProvider>
        </AuthProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}