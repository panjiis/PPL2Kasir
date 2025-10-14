'use client';
import Image from 'next/image';
import { useState } from 'react';
import SidebarMock from './sidebar-mock';
import CenterMock from './center-mock'; // This can be removed if dashboard is the default
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

// Import the view components
// import DashboardView from './dashboard-view'; // <-- Add Dashboard
import ProductsView from './products-view';
import GroupsView from './groups-view';
import PaymentTypesView from './payment-types-view';
import OrdersView from './orders-view';

function KasirInnerPage() {
  const { addItem } = useCart();
  const { getGlobalBackgroundClasses } = usePreferences();
  const surface = getGlobalBackgroundClasses();

  // ---- Set 'dashboard' as the default view ----
  const [currentView, setCurrentView] = useState('dashboard');

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
      // Render DashboardView by default
      case 'dashboard':
      default:
        return <CenterMock />;
    }
  };

  return (
    <DndContext onDragEnd={onDragEnd}>
      <main className='h-screen w-full bg-background overflow-hidden'>
        <div className='mx-auto max-w-[1400px] px-4 h-full flex flex-col'>
          <div className='grid gap-2 md:grid-cols-[300px_1fr_340px] flex-1 overflow-hidden'>
            <aside
              aria-label='Navigation'
              className={[
                'rounded-lg border border-border h-full overflow-hidden',
                surface.bg,
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
                surface.bg,
              ].join(' ')}
            >
              {renderCurrentView()}
            </section>

            <aside
              aria-label='Right Sidebar'
              className={[
                'rounded-lg border border-border p-3 md:p-4 h-full overflow-hidden relative',
                surface.bg,
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
  );
}
