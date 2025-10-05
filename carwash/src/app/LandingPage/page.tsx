'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoginPage from '../Login/login';

export default function Home() {
  const router = useRouter();

  return (
    <main className='min-h-screen flex items-center justify-center bg-background text-foreground'>
      <div className='flex flex-col items-center gap-6 text-center'>
        {/* Login Page */}
        <div className='w-full max-w-sm'>
          <LoginPage />
        </div>
      </div>
    </main>
  );
}
