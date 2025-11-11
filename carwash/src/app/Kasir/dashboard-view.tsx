'use client';

import { usePreferences } from '@/app/providers/preferences-context';
import { useTranslation } from 'react-i18next';

export default function DashboardView() {
  const { getUserProfile } = usePreferences();
  const user = getUserProfile();
  const { t } = useTranslation();

  return (
    <div className='h-full flex flex-col items-center justify-center p-6 text-center'>
      <h1 className='text-4xl font-bold text-foreground'>
        {t('DashboardView.welcome', { name: user.name })}
      </h1>
      <p className='mt-2 text-lg text-muted-foreground'>
        {t('DashboardView.prompt')} 
      </p>
    </div>
  );
}