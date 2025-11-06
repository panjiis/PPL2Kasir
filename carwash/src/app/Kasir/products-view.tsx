'use client';
import { useState, useMemo } from 'react';
import { useSession } from '../lib/context/session';
import type { PosProduct } from '@/app/lib/types/pos';
import { AlertTriangle, Loader2, Search } from 'lucide-react'; // Menghapus 'Pencil'
import { useProducts } from '@/app/Hooks/useProducts';
import { Button } from '@/components/ui/button';

const formatRupiah = (amount?: number) => {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// PERUBAHAN: Diubah dari 10 menjadi 8
const ITEMS_PER_PAGE = 12;

// Menghapus prop 'onEdit'
export default function ProductsView() {
  const { session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: products = [],
    isLoading: loading,
    error,
  } = useProducts(session?.token ?? '');

  console.log('STATUS API PRODUCTS:', {
    token: session?.token ? 'Token Ada' : 'Token KOSONG',
    loading,
    error,
    productsData: products,
  });

  const mappedProducts = useMemo(() => {
    return (products || []).map(
      (p): PosProduct => ({
        ...p,
        price: Number(p.product_price ?? p.price ?? 0),
        product_name: p.product_name ?? '',
        product_code: p.product_code ?? '',
      })
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    return mappedProducts.filter(
      (product) =>
        product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.product_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [mappedProducts, searchTerm]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : 'An unknown error occurred.'
    : null;

  if (loading)
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        <Loader2 className='h-8 w-8 animate-spin mr-2' />
        <span>Loading Products...</span>
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
    // Mengubah padding dan menambahkan bg-card untuk konsistensi
    <div className='h-full flex flex-col bg-card'>
      {/* Menggunakan padding-4 yang konsisten */}
      <header className='p-4'>
        <h1 className='text-2xl font-bold text-foreground'>Products</h1>
        <p className='text-muted-foreground'>
          Search and view your product inventory.
        </p>
      </header>

      {/* Menggunakan padding-4 horizontal dan padding-bottom */}
      <div className='px-4 pb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground' />
          <input
            type='text'
            placeholder='Search by product name or code...'
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            // Mengganti bg-card menjadi bg-background untuk kontras input
            className='w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50'
          />
        </div>
      </div>

      {/* Menggunakan px-4 untuk padding horizontal */}
      <div className='flex-1 overflow-y-auto px-4'>
        <div className='border rounded-lg overflow-hidden'>
          <table className='w-full text-sm'>
            {/* Membuat header tabel sticky untuk UX yang lebih baik saat scrolling */}
            <thead className='bg-muted/50 sticky top-0 backdrop-blur-sm'>
              <tr>
                <th className='text-left font-medium p-3'>Product Name</th>
                <th className='text-left font-medium p-3'>Product Code</th>
                <th className='text-right font-medium p-3'>Price</th>
                {/* Menghapus kolom 'Actions' */}
              </tr>
            </thead>
            {/* Menggunakan divide-y for pemisah baris yang lebih bersih */}
            <tbody className='divide-y divide-border'>
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((item) => (
                  <tr
                    key={item.product_code}
                    // Menghapus border-t dan memperbaiki hover
                    className='hover:bg-accent transition-colors'
                  >
                    <td className='p-3 font-medium'>{item.product_name}</td>
                    <td className='text-muted-foreground p-3'>
                      {item.product_code}
                    </td>
                    <td className='p-3 text-right font-semibold'>
                      {formatRupiah(Number(item.price))}
                    </td>
                    {/* Menghapus sel 'Actions' */}
                  </tr>
                ))
              ) : (
                <tr>
                  {/* Mengubah colSpan from 4 menjadi 3 */}
                  <td
                    colSpan={3}
                    className='text-center p-6 text-muted-foreground'
                  >
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Paginasi (Tidak berubah, sudah baik) */}
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