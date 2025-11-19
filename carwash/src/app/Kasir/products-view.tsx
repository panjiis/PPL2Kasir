'use client';
import { useState, useMemo, useEffect } from 'react';
import { useSession } from '../lib/context/session';
import type { PosProduct, StockItem } from '@/app/lib/types/pos';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import { useProducts } from '@/app/Hooks/useProducts';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { fetchStocks } from '../lib/utils/pos-api';

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

  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(true);

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

  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!stocks || stocks.length === 0) return map;

    for (const item of stocks) {
      const currentQty = map.get(item.product_code) || 0;
      map.set(item.product_code, currentQty + item.available_quantity);
    }
    return map;
  }, [stocks]);

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
          itemType: itemType,
        };
      }
    );
  }, [products, stockMap]);

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

  const mainLoading = loading || loadingStocks;
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : t('ProductsView.errorUnknown')
    : null;

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
        <h1 className='text-xl sm:text-2xl font-bold text-foreground'>
          {t('ProductsView.title')}
        </h1>
        <p className='text-sm text-muted-foreground'>
          {t('ProductsView.description')}
        </p>
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
            className='w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm'
          />
        </div>
      </div>

      <div className='flex-1 overflow-hidden px-2 sm:px-4 flex flex-col'>
        <div className='border rounded-lg overflow-hidden flex-1 flex flex-col bg-background'>
          {/* Scroll Container for Table */}
          <div className='overflow-x-auto flex-1'>
            <table className='w-full text-sm min-w-[600px]'>
              <thead className='bg-muted/50 sticky top-0 backdrop-blur-sm z-10'>
                <tr>
                  <th className='text-left font-medium p-3 whitespace-nowrap'>
                    {t('ProductsView.colName')}
                  </th>
                  <th className='text-left font-medium p-3 whitespace-nowrap'>
                    {t('ProductsView.colCode')}
                  </th>
                  <th className='text-right font-medium p-3 whitespace-nowrap'>
                    {t('ProductsView.colQty', 'Kuantitas')}
                  </th>
                  <th className='text-right font-medium p-3 whitespace-nowrap'>
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
                      <td className='p-3 font-medium min-w-[150px]'>
                        {item.product_name}
                      </td>
                      <td className='text-muted-foreground p-3 whitespace-nowrap'>
                        {item.product_code}
                      </td>
                      <td className='p-3 text-right font-medium whitespace-nowrap'>
                        {item.itemType === 'product'
                          ? item.available_quantity
                          : '-'}
                      </td>
                      <td className='p-3 text-right font-semibold whitespace-nowrap'>
                        {formatRupiah(Number(item.price))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
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
      </div>

      {totalPages > 1 && (
        <footer className='p-4 border-t flex items-center justify-between flex-wrap gap-3 bg-card z-10'>
          <div className='flex items-center gap-2 sm:gap-4'>
            <span className='text-xs sm:text-sm text-muted-foreground'>
              {t('Pagination.pageOf', { currentPage, totalPages })}
            </span>
            <span className='text-xs sm:text-sm text-muted-foreground hidden md:block'>
              {t('Pagination.showingOf', { startItem, endItem, totalItems })}
            </span>
          </div>
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
