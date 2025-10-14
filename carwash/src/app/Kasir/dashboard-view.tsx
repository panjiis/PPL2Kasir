'use client';

import { usePreferences } from '@/app/providers/preferences-context';

export default function DashboardView() {
  const { getUserProfile } = usePreferences();
  const user = getUserProfile();

  return (
    <div className='h-full flex flex-col items-center justify-center p-6 text-center'>
      <h1 className='text-4xl font-bold text-foreground'>
        Welcome back, {user.name}!
      </h1>
      <p className='mt-2 text-lg text-muted-foreground'>
        Select an option from the sidebar to get started.
      </p>
    </div>
  );
}
