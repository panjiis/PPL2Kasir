'use client';
import { useState, useMemo, useEffect } from 'react'; // <-- Impor useEffect
import { useSession } from '../lib/context/session';
import type { PosProduct, StockItem } from '@/app/lib/types/pos'; // <-- Impor StockItem
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import { useProducts } from '@/app/Hooks/useProducts';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { fetchStocks } from '../lib/utils/pos-api'; // <-- Impor fetchStocks

const formatRupiah = (amount?: number) => {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const ITEMS_PER_PAGE = 12;

export default function ProductsView() {
  const { session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { t } = useTranslation();
  const {
    data: products = [],
    isLoading: loading,
    error,
  } = useProducts(session?.token ?? '');

  // --- TAMBAHAN: State untuk Stocks ---
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(true);

  // --- TAMBAHAN: useEffect untuk fetchStocks ---
  useEffect(() => {
    if (session?.token) {
      setLoadingStocks(true);
      fetchStocks(session.token)
        .then((response) => {
          setStocks(response.data || []);
        })
        .catch((err) => {
          console.error('Failed to fetch stocks:', err);
        })
        .finally(() => {
          setLoadingStocks(false);
        });
    } else {
      setLoadingStocks(false);
      setStocks([]);
    }
  }, [session?.token]);

  console.log('STATUS API PRODUCTS:', {
    token: session?.token ? 'Token Ada' : 'Token KOSONG',
    loading,
    error,
    productsData: products,
    stocksData: stocks,
  });

  // --- TAMBAHAN: Memo untuk memetakan total stok ---
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!stocks || stocks.length === 0) return map;

    for (const item of stocks) {
      const currentQty = map.get(item.product_code) || 0;
      map.set(item.product_code, currentQty + item.available_quantity);
    }
    return map;
  }, [stocks]);

  // --- MODIFIKASI: mappedProducts sekarang menyertakan stok dan itemType ---
  const mappedProducts = useMemo(() => {
    return (products || []).map(
      (p): PosProduct & { itemType: 'product' | 'service' } => {
        const prefix = (p.product_code || '').split('-')[0] || '';
        const itemType = prefix === 'SRV' ? 'service' : 'product';
        return {
          ...p,
          price: Number(p.product_price ?? p.price ?? 0),
          product_name: p.product_name ?? '',
          product_code: p.product_code ?? '',
          available_quantity: stockMap.get(p.product_code) ?? 0,
          itemType: itemType, // <-- Tambahkan itemType
        };
      }
    );
  }, [products, stockMap]); // <-- Tambahkan stockMap sebagai dependensi

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

  const totalItems = filteredProducts.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const startItem = totalItems === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);

  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : t('ProductsView.errorUnknown')
    : null;

  // --- MODIFIKASI: Perbarui pengecekan loading ---
  const mainLoading = loading || loadingStocks;

  if (mainLoading)
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        <Loader2 className='h-8 w-8 animate-spin mr-2' />
        <span>{t('ProductsView.loading')}</span>
      </div>
    );

  if (errorMessage)
    return (
      <div className='flex flex-col items-center justify-center h-full text-destructive'>
        <AlertTriangle className='h-10 w-10 mb-2' />
        <span className='font-semibold'>
          {t('ProductsView.errorTitle')}
        </span>{' '}
        <p className='text-sm'>{errorMessage}</p>
      </div>
    );

  return (
    <div className='h-full flex flex-col bg-card'>
      <header className='p-4'>
        <h1 className='text-2xl font-bold text-foreground'>
          {t('ProductsView.title')}
        </h1>
        <p className='text-muted-foreground'>{t('ProductsView.description')}</p>
      </header>

      <div className='px-4 pb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground' />
          <input
            type='text'
            placeholder={t('ProductsView.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className='w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50'
          />
        </div>
      </div>

      <div className='flex-1 overflow-y-auto px-4'>
        <div className='border rounded-lg overflow-hidden'>
          <table className='w-full text-sm'>
            <thead className='bg-muted/50 sticky top-0 backdrop-blur-sm'>
              <tr>
                <th className='text-left font-medium p-3'>
                  {t('ProductsView.colName')}
                </th>
                <th className='text-left font-medium p-3'>
                  {t('ProductsView.colCode')}
                </th>
                <th className='text-right font-medium p-3'>
                  {t('ProductsView.colQty', 'Kuantitas')}
                </th>
                <th className='text-right font-medium p-3'>
                  {t('ProductsView.colPrice')}
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border'>
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((item) => (
                  <tr
                    key={item.product_code}
                    className='hover:bg-accent transition-colors'
                  >
                    <td className='p-3 font-medium'>{item.product_name}</td>
                    <td className='text-muted-foreground p-3'>
                      {item.product_code}
                    </td>
                    {/* --- MODIFIKASI: Tampilkan Qty atau '-' --- */}
                    <td className='p-3 text-right font-medium'>
                      {item.itemType === 'product'
                        ? item.available_quantity
                        : '-'}
                    </td>
                    <td className='p-3 text-right font-semibold'>
                      {formatRupiah(Number(item.price))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4} // <-- Pastikan colspan 4
                    className='text-center p-6 text-muted-foreground'
                  >
                    {t('ProductsView.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <footer className='p-4 border-t flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <span className='text-sm text-muted-foreground'>
              {t('Pagination.pageOf', { currentPage, totalPages })}
            </span>
            <span className='text-sm text-muted-foreground hidden sm:block'>
              {t('Pagination.showingOf', { startItem, endItem, totalItems })}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              {t('Pagination.previous')}
            </Button>
            <Button
              variant='outline'
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
