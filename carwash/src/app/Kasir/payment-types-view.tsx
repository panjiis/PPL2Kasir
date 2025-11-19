'use client';

import { useState, useMemo } from 'react';
import { useSession } from '../lib/context/session';
import type { PaymentType } from '@/app/lib/types/pos';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import { usePaymentTypes } from '@/app/Hooks/usePaymentTypes';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const ITEMS_PER_PAGE = 10;

export default function PaymentTypesView() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: rawPaymentTypes = [],
    isLoading: loading,
    error,
  } = usePaymentTypes(session?.token ?? '');

  const paymentTypes = useMemo(() => {
    return (rawPaymentTypes as PaymentType[]).map(
      (p): PaymentType => ({
        id: p.id,
        payment_name: p.payment_name ?? 'Unnamed',
        processing_fee_rate: p.processing_fee_rate ?? '0%',
        is_active: Boolean(p.is_active),
      })
    );
  }, [rawPaymentTypes]);

  const filteredPayments = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return paymentTypes.filter((pt) =>
      pt.payment_name.toLowerCase().includes(term)
    );
  }, [searchTerm, paymentTypes]);

  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPayments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPayments, currentPage]);

  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);

  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : t('PaymentTypesView.errorUnknown')
    : null;

  if (loading)
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        <Loader2 className='h-8 w-8 animate-spin mr-2' />
        <span>{t('PaymentTypesView.loading')}</span>
      </div>
    );

  if (errorMessage)
    return (
      <div className='flex flex-col items-center justify-center h-full text-destructive'>
        <AlertTriangle className='h-10 w-10 mb-2' />
        <span className='font-semibold'>
          {t('PaymentTypesView.errorTitle')}
        </span>
        <p className='text-sm'>{errorMessage}</p>
      </div>
    );

  return (
    <div className='h-full flex flex-col p-1 bg-card'>
      <header className='p-3 sm:p-4'>
        <h1 className='text-xl sm:text-2xl font-bold text-foreground'>
          {t('PaymentTypesView.title')}
        </h1>
        <p className='text-sm text-muted-foreground'>
          {t('PaymentTypesView.description')}
        </p>
      </header>

      <div className='px-3 sm:px-4 pb-3'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground' />
          <input
            type='text'
            placeholder={t('PaymentTypesView.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className='w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm'
          />
        </div>
      </div>

      <div className='flex-1 overflow-hidden px-2 sm:px-4 flex flex-col'>
        <div className='border rounded-lg overflow-hidden flex-1 flex flex-col bg-background'>
          <div className='overflow-x-auto flex-1'>
            <table className='w-full text-sm min-w-[500px]'>
              <thead className='bg-muted/50 sticky top-0 backdrop-blur-sm z-10'>
                <tr>
                  <th className='text-left font-medium p-3 whitespace-nowrap'>
                    {t('PaymentTypesView.colName')}
                  </th>
                  <th className='text-left font-medium p-3 whitespace-nowrap'>
                    {t('PaymentTypesView.colFee')}
                  </th>
                  <th className='text-center font-medium p-3 whitespace-nowrap'>
                    {t('PaymentTypesView.colStatus')}
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {paginatedPayments.length > 0 ? (
                  paginatedPayments.map((pt) => (
                    <tr
                      key={pt.id ?? pt.payment_name}
                      className='hover:bg-accent/30 transition-colors'
                    >
                      <td className='p-3 font-medium'>{pt.payment_name}</td>
                      <td className='p-3'>{pt.processing_fee_rate}</td>
                      <td className='p-3 text-center'>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            pt.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {pt.is_active
                            ? t('PaymentTypesView.statusActive')
                            : t('PaymentTypesView.statusInactive')}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className='text-center p-6 text-muted-foreground'
                    >
                      {t('PaymentTypesView.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <footer className='p-4 border-t flex items-center justify-between bg-card z-10'>
          <span className='text-xs sm:text-sm text-muted-foreground'>
            {t('Pagination.pageOf', {
              currentPage: currentPage,
              totalPages: totalPages,
            })}
          </span>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              {t('Pagination.previous')}
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              {t('Pagination.next')}
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
