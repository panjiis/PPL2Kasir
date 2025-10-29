'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from '../lib/context/session';
import type { PosProduct } from '@/app/lib/types/pos';
import { AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';
// PERBAIKAN: Impor fungsi fetchProducts
import { fetchProducts } from '@/app/lib/utils/pos-api';

// const API_BASE_URL = ...; // Dihapus, tidak perlu lagi

// Komponen untuk menampilkan item produk (tidak ada perubahan)
const ProductItem = ({ product }: { product: PosProduct }) => (
  <div className='border rounded-lg p-3 bg-card shadow-sm'>
    <h4 className='font-bold text-md text-foreground'>
      {product.product_name}
    </h4>
    <p className='text-sm text-muted-foreground'>
      Kode: {product.product_code}
    </p>
    <p className='text-sm font-semibold mt-1'>
      {new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(Number(product.price ?? 0))}
    </p>
  </div>
);

// Komponen untuk menampilkan item grup (tidak ada perubahan)
const GroupItem = ({
  groupName,
  onClick,
}: {
  groupName: string;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className='border rounded-lg p-4 bg-card shadow-sm cursor-pointer hover:bg-accent transition-colors'
  >
    <h3 className='font-bold text-lg text-primary capitalize'>
      {groupName.toLowerCase()}
    </h3>
    <p className='text-sm text-muted-foreground'>Kategori Produk</p>
  </div>
);

export default function GroupsView() {
  const { session } = useSession();

  // State untuk menyimpan semua produk, status loading, dan grup yang dipilih
  const [allProducts, setAllProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // 1. Ambil SEMUA produk saat komponen pertama kali dimuat
  useEffect(() => {
    if (!session?.token) {
      setError('Session not found. Please login again.');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        // PERBAIKAN: Ganti fetch manual dengan fungsi yang sudah ada
        const body = await fetchProducts(session.token);

        // Kode di bawah ini sudah benar karena 'body' sekarang dijamin punya '.data'
        const data = Array.isArray(body.data) ? body.data : [];

        // Normalize
        const mapped: PosProduct[] = data.map((p: unknown) => {
          const raw = p as Partial<PosProduct> & {
            product_price?: string | number;
          };
          return {
            ...raw,
            price: Number(raw.product_price ?? raw.price ?? 0),
            product_name: raw.product_name ?? '',
            product_code: raw.product_code ?? '',
          };
        });

        setAllProducts(mapped);
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

  // 2. Buat daftar grup secara dinamis dari daftar produk
  const groups = useMemo(() => {
    const groupSet = new Set<string>();
    allProducts.forEach((product) => {
      // Ambil bagian sebelum tanda hubung pertama, e.g., "FOOD" dari "FOOD-002"
      const codePrefix = (product.product_code || '').split('-')[0];
      if (codePrefix) {
        groupSet.add(codePrefix);
      }
    });
    return Array.from(groupSet); // Hasilnya: ['FOOD', 'BEVERAGES', 'SERVICES']
  }, [allProducts]);

  // 3. Filter produk yang akan ditampilkan berdasarkan grup yang dipilih
  const filteredProducts = useMemo(() => {
    if (!selectedGroup) return [];
    return allProducts.filter((p) =>
      (p.product_code || '').startsWith(selectedGroup)
    );
  }, [selectedGroup, allProducts]);

  // Handler untuk memilih grup dan kembali
  const handleSelectGroup = (groupName: string) => {
    setSelectedGroup(groupName);
  };

  const handleGoBack = () => {
    setSelectedGroup(null);
  };

  // Tampilan Loading dan Error
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

  // Tampilan Utama
  return (
    <div className='h-full flex flex-col p-1'>
      <header className='p-3 flex items-center'>
        {selectedGroup && (
          <button
            onClick={handleGoBack}
            className='mr-4 p-2 rounded-md hover:bg-accent'
          >
            <ArrowLeft className='h-5 w-5' />
          </button>
        )}
        <div>
          <h1 className='text-2xl font-bold text-foreground capitalize'>
            {selectedGroup ? selectedGroup.toLowerCase() : 'Product Groups'}
          </h1>
          <p className='text-muted-foreground'>
            {selectedGroup
              ? `Produk dalam kategori ${selectedGroup}`
              : 'Pilih kategori untuk melihat produk.'}
          </p>
        </div>
      </header>
      <div className='flex-1 overflow-y-auto px-3 pb-3'>
        <div className='space-y-3'>
          {!selectedGroup ? (
            // Tampilan Folder Grup
            groups.length > 0 ? (
              groups.map((groupName) => (
                <GroupItem
                  key={groupName}
                  groupName={groupName}
                  onClick={() => handleSelectGroup(groupName)}
                />
              ))
            ) : (
              <div className='text-center text-muted-foreground mt-10'>
                No products found to create groups.
              </div>
            )
          ) : // Tampilan Daftar Produk di dalam Grup
          filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <ProductItem key={product.product_code} product={product} />
            ))
          ) : (
            <div className='text-center text-muted-foreground mt-10'>
              No products found in this group.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
