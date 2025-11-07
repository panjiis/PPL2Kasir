'use client';

import { useState, useMemo } from 'react';
import { useSession } from '../lib/context/session';
import type { PaymentType } from '@/app/lib/types/pos';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import { usePaymentTypes } from '@/app/Hooks/usePaymentTypes'; // FIX: Menggunakan hook
import { Button } from '@/components/ui/button'; // +++ Tambahan: Impor Button

const ITEMS_PER_PAGE = 10; // +++ Tambahan: Paginasi

export default function PaymentTypesView() {
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
      : 'An unknown error occurred.'
    : null;

  if (loading)
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        <Loader2 className='h-8 w-8 animate-spin mr-2' />
        <span>Loading Payment Types...</span>
      </div>
    );

  if (errorMessage)
    return (
      <div className='flex flex-col items-center justify-center h-full text-destructive'>
        <AlertTriangle className='h-10 w-10 mb-2' />
        <span className='font-semibold'>Failed to load data</span>
        <p className='text-sm'>{errorMessage}</p>
      </div>
    );

  return (
    <div className='h-full flex flex-col p-1'>
      <header className='p-3'>
        <h1 className='text-2xl font-bold text-foreground'>Payment Types</h1>
        <p className='text-muted-foreground'>
          View and manage available payment methods.
        </p>
      </header>

      {/* Search */}
      <div className='px-3 pb-3'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground' />
          <input
            type='text'
            placeholder='Search by payment name...'
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
                <th className='text-left font-medium p-3'>Name</th>
                {/* --- PERBAIKAN: Menambahkan kembali kolom Fee --- */}
                <th className='text-left font-medium p-3'>Processing Fee</th>
                <th className='text-center font-medium p-3'>Status</th>
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
                        {pt.is_active ? 'Active' : 'Inactive'}
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
                    No payment types found.
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
            Page {currentPage} of {totalPages}
          </span>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant='outline'
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}