'use client';

import { useState, useMemo } from 'react';
import { useSession } from '../lib/context/session';
import type { PaymentType } from '@/app/lib/types/pos';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import { usePaymentTypes } from '@/app/Hooks/usePaymentTypes'; // FIX: Menggunakan hook
import { Button } from '@/components/ui/button'; // +++ Tambahan: Impor Button
import { useTranslation } from 'react-i18next'; // <-- 1. Impor hook

const ITEMS_PER_PAGE = 10; // +++ Tambahan: Paginasi

export default function PaymentTypesView() {
  const { t } = useTranslation(); // <-- 2. Panggil hook
  const { session } = useSession();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1); // +++ Tambahan: Paginasi

  const {
    data: rawPaymentTypes = [],
    isLoading: loading,
    error,
  } = usePaymentTypes(session?.token ?? '');

  const paymentTypes = useMemo(() => {
    // Normalisasi untuk memastikan semua field ada
    return (rawPaymentTypes as PaymentType[]).map(
      (p): PaymentType => ({
        id: p.id,
        payment_name: p.payment_name ?? 'Unnamed',
        // --- PERBAIKAN: Pastikan 'processing_fee_rate' diambil ---
        processing_fee_rate: p.processing_fee_rate ?? '0%', // Ini sudah benar
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

  // +++ Tambahan: Logika Paginasi
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPayments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPayments, currentPage]);

  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);

  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  // +++ Selesai: Logika Paginasi

  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : t('PaymentTypesView.errorUnknown') // <-- 3. Ganti teks
    : null;

  if (loading)
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        <Loader2 className='h-8 w-8 animate-spin mr-2' />
        <span>{t('PaymentTypesView.loading')}</span> {/* <-- 3. Ganti teks */}
      </div>
    );

  if (errorMessage)
    return (
      <div className='flex flex-col items-center justify-center h-full text-destructive'>
        <AlertTriangle className='h-10 w-10 mb-2' />
        <span className='font-semibold'>
          {t('PaymentTypesView.errorTitle')} {/* <-- 3. Ganti teks */}
        </span>
        <p className='text-sm'>{errorMessage}</p>
      </div>
    );

  return (
    <div className='h-full flex flex-col p-1'>
      <header className='p-3'>
        <h1 className='text-2xl font-bold text-foreground'>
          {t('PaymentTypesView.title')} {/* <-- 3. Ganti teks */}
        </h1>
        <p className='text-muted-foreground'>
          {t('PaymentTypesView.description')} {/* <-- 3. Ganti teks */}
        </p>
      </header>

      {/* Search */}
      <div className='px-3 pb-3'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground' />
          <input
            type='text'
            placeholder={t('PaymentTypesView.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // +++ Tambahan: Reset ke halaman 1
            }}
            className='w-full pl-10 pr-4 py-2 border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/50'
          />
        </div>
      </div>

      {/* Table */}
      <div className='flex-1 overflow-y-auto px-3 pb-3'>
        <div className='border rounded-lg overflow-hidden'>
          <table className='w-full text-sm'>
            <thead className='bg-muted'>
              <tr>
                <th className='text-left font-medium p-3'>
                  {t('PaymentTypesView.colName')} {/* <-- 3. Ganti teks */}
                </th>
                {/* --- PERBAIKAN: Menambahkan kembali kolom Fee --- */}
                <th className='text-left font-medium p-3'>
                  {t('PaymentTypesView.colFee')} {/* <-- 3. Ganti teks */}
                </th>
                <th className='text-center font-medium p-3'>
                  {t('PaymentTypesView.colStatus')} {/* <-- 3. Ganti teks */}
                </th>
              </tr>
            </thead>
            <tbody className='bg-card'>
              {paginatedPayments.length > 0 ? (
                paginatedPayments.map((pt) => (
                  <tr
                    key={pt.id ?? pt.payment_name}
                    className='border-t hover:bg-accent/30 transition-colors'
                  >
                    <td className='p-3 font-medium'>{pt.payment_name}</td>
                    {/* --- PERBAIKAN: Menambahkan kembali data Fee --- */}
                    <td className='p-3'>{pt.processing_fee_rate}</td>
                    <td className='p-3 text-center'>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          pt.is_active
                            ? 'bg-green-200 text-green-800'
                            : 'bg-gray-300 text-gray-700'
                        }`}
                      >
                        {pt.is_active
                          ? t('PaymentTypesView.statusActive') // <-- 3. Ganti teks
                          : t('PaymentTypesView.statusInactive')}{' '}
                        {/* <-- 3. Ganti teks */}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3} // --- PERBAIKAN: Colspan menjadi 3
                    className='text-center p-6 text-muted-foreground'
                  >
                    {t('PaymentTypesView.empty')} {/* <-- 3. Ganti teks */}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* +++ Tambahan: Paginasi Footer */}
      {totalPages > 1 && (
        <footer className='p-4 border-t flex items-center justify-between'>
          <span className='text-sm text-muted-foreground'>
            {t('Pagination.pageOf', {
              currentPage: currentPage,
              totalPages: totalPages,
            })}{' '}
            {/* <-- 3. Ganti teks */}
          </span>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              {t('Pagination.previous')} {/* <-- 3. Ganti teks */}
            </Button>
            <Button
              variant='outline'
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              {t('Pagination.next')} {/* <-- 3. Ganti teks */}
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
