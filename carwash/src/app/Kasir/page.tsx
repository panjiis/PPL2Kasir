'use client';
import Image from 'next/image';
import SidebarMock from './sidebar-mock';
import CenterMock from './center-mock';
import AsideMock from './aside-mock';
import { CartProvider } from './cart-content';
import { NotificationProvider } from './notification-context';
import { AuthProvider } from '@/app/providers/auth-context';
import { PreferencesProvider } from '@/app/providers/preferences-context';

export default function KasirPage() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <NotificationProvider>
          <CartProvider>
            <main className='min-h-screen w-full bg-background'>
              <div className='mx-auto max-w-[1400px] px-4 py-4 md:py-2'>
                <div className='grid gap-4 md:grid-cols-[300px_1fr_340px]'>
                  <aside
                    aria-label='Navigation'
                    className='rounded-lg border border-border bg-secondary p-3 md:p-4'
                  >
                    <SidebarMock />
                  </aside>

                  <section
                    aria-label='Content'
                    className='rounded-lg border border-border bg-card p-3 md:p-4 relative'
                  >
                    <CenterMock />
                  </section>

                  <aside
                    aria-label='Right Sidebar'
                    className='rounded-lg border border-border bg-secondary p-3 md:p-4 relative'
                  >
                    <AsideMock />
                  </aside>
                </div>

                <footer className='mt-2 rounded-lg bg-primary px-4 py-3 text-primary-foreground'>
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
          </CartProvider>
        </NotificationProvider>
      </PreferencesProvider>
    </AuthProvider>
  );
}
