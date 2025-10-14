'use client';
import { useEffect, useState, useMemo } from 'react';
import { useSession } from '@/app/lib/context/session';
import { fetchProducts } from '@/app/lib/utils/pos-api';
import type { PosProduct } from '@/app/lib/types/pos';
import { AlertTriangle, Loader2, Search } from 'lucide-react';

const formatRupiah = (amount?: number) => {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const ITEMS_PER_PAGE = 10;

export default function ProductsView() {
  const { session } = useSession();
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!session?.token) {
      setError('Session not found. Please login again.');
      setLoading(false);
      return;
    }

    // const formatRupiah = (amount?: number) => {
    //   if (amount == null || isNaN(amount)) return 'Rp 0';
    //   return new Intl.NumberFormat('id-ID', {
    //     style: 'currency',
    //     currency: 'IDR',
    //     minimumFractionDigits: 0,
    //   }).format(amount);
    // };

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await fetchProducts(session.token);

      // ✅ Normalisasi data product agar product_price → price (number)
      const mapped = (Array.isArray(result.data) ? result.data : []).map(
        (p): PosProduct => {
          const priceSource =
            typeof p.price === 'number'
              ? p.price
              : Number(
                  // ambil dari product_price kalau ada
                  (p as Partial<PosProduct> & { product_price?: string | number })
                    .product_price ?? 0
                );

          return {
            ...p,
            price: Number.isFinite(priceSource) ? priceSource : 0,
          };
        }
      );

      setProducts(mapped);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred.'
      );
    } finally {
      setLoading(false);
    }
  };

  loadData();
}, [session]);
  const filteredProducts = useMemo(() => {
    return products.filter(
      (product) =>
        product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.product_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        <Loader2 className='h-8 w-8 animate-spin mr-2' />
        <span>Loading Products...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-destructive'>
        <AlertTriangle className='h-10 w-10 mb-2' />
        <span className='font-semibold'>Failed to load data</span>
        <p className='text-sm'>{error}</p>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col p-1'>
      <header className='p-3'>
        <h1 className='text-2xl font-bold text-foreground'>Products</h1>
        <p className='text-muted-foreground'>
          Search and manage your product inventory.
        </p>
      </header>

      {/* Search */}
      <div className='px-3 pb-3'>
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
                <th className='text-left font-medium p-3'>Product Name</th>
                <th className='text-left font-medium p-3'>Product Code</th>
                <th className='text-right font-medium p-3'>Price</th>
              </tr>
            </thead>
            <tbody className='bg-card'>
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((item) => (
                  <tr
                    key={item.id}
                    className='border-t hover:bg-accent/30 transition-colors'
                  >
                    <td className='p-3 font-medium'>{item.product_name}</td>
                    <td className='p-3 text-muted-foreground'>
                      {item.product_code}
                    </td>
                    <td className='p-3 text-right font-semibold'>
                      {formatRupiah(item.price)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <footer className='p-4 border-t flex items-center justify-between'>
          <span className='text-sm text-muted-foreground'>
            Page {currentPage} of {totalPages}
          </span>
          <div className='flex items-center gap-2'>
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className='px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className='px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Next
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
