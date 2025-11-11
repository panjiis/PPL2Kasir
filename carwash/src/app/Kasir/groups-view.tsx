'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from '../lib/context/session';
import type { PosProduct, ProductGroup } from '@/app/lib/types/pos';
import { AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';
import { fetchProductGroups, fetchProducts } from '@/app/lib/utils/pos-api';
import { useTranslation } from 'react-i18next'; // <-- 1. Impor hook

// Komponen ProductItem
const ProductItem = ({ product }: { product: PosProduct }) => {
  const { t } = useTranslation(); // <-- 2. Panggil hook
  return (
    <div className='border rounded-lg p-3 bg-card shadow-sm'>
      <h4 className='font-bold text-md text-foreground'>
        {product.product_name}
      </h4>
      <p className='text-sm text-muted-foreground'>
        {t('GroupsView.productCode')} {product.product_code} {/* <-- 3. Ganti teks */}
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
};

// Komponen GroupItem
const GroupItem = ({
  group,
  onClick,
}: {
  group: ProductGroup;
  onClick: () => void;
}) => {
  const { t } = useTranslation(); // <-- 2. Panggil hook
  return (
    <div
      onClick={onClick}
      className='border rounded-lg p-4 bg-card shadow-sm cursor-pointer hover:bg-accent transition-colors'
    >
      <h3 className='font-bold text-lg text-primary capitalize'>
        {group.product_group_name?.toLowerCase() ??
          t('GroupsView.unnamedGroup')} {/* <-- 3. Ganti teks */}
      </h3>
      <p className='text-sm text-muted-foreground'>
        {group.product_group_code ?? t('GroupsView.groupCategory')} {/* <-- 3. Ganti teks */}
      </p>
    </div>
  );
};

export default function GroupsView() {
  const { t } = useTranslation(); // <-- 2. Panggil hook
  const { session } = useSession();

  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [allProducts, setAllProducts] = useState<PosProduct[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PERBAIKAN: Simpan seluruh objek grup yang dipilih, bukan hanya kode/ID
  const [selectedGroup, setSelectedGroup] = useState<ProductGroup | null>(null);

  // Ambil SEMUA data (Groups dan Products)
  useEffect(() => {
    if (!session?.token) {
      setError(t('GroupsView.errorSession')); // <-- 3. Ganti teks
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [groupResponse, productResponse] = await Promise.all([
          fetchProductGroups(session.token),
          fetchProducts(session.token),
        ]);

        // 1. Proses Groups
        const groupData = Array.isArray(groupResponse.data)
          ? groupResponse.data
          : [];
        setGroups(groupData);

        // 2. Proses Products (Termasuk normalisasi)
        const productData = Array.isArray(productResponse.data)
          ? productResponse.data
          : [];
        const mappedProducts: PosProduct[] = productData.map((p: unknown) => {
          // Normalisasi data produk dari JSON
          const raw = p as Partial<PosProduct> & {
            product_price?: string | number;
            product_group_id?: number; // Pastikan ini ada
          };
          return {
            ...raw,
            price: Number(raw.product_price ?? raw.price ?? 0),
            product_name: raw.product_name ?? '',
            product_code: raw.product_code ?? '',
            // Pastikan product_group_id ada di objek PosProduct
            product_group_id: raw.product_group_id,
          };
        });
        setAllProducts(mappedProducts);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t('GroupsView.errorUnknown') // <-- 3. Ganti teks
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [session, t]); // <-- 4. Tambahkan 't' ke dependencies

  // 2. PERBAIKAN: Logika filter hybrid
  const filteredProducts = useMemo(() => {
    if (!selectedGroup) return [];

    const groupId = selectedGroup.id;
    const groupCode = selectedGroup.product_group_code; // Misal: "SRV" atau "DRINK"

    return allProducts.filter((p) => {
      // PRIORITAS 1: Cocokkan dengan 'product_group_id' jika ada.
      // Ini adalah sumber kebenaran utama.
      if (p.product_group_id) {
        return p.product_group_id === groupId;
      }

      // PRIORITAS 2 (Fallback): Jika 'product_group_id' tidak ada (null/undefined),
      // coba cocokkan dengan awalan 'product_code'.
      if (groupCode) {
        return (p.product_code || '').startsWith(groupCode);
      }

      // Jika tidak ada 'product_group_id' dan grup tidak punya 'groupCode',
      // maka produk tidak bisa dicocokkan.
      return false;
    });
  }, [selectedGroup, allProducts]);

  // Handler untuk memilih grup dan kembali
  const handleSelectGroup = (group: ProductGroup) => {
    setSelectedGroup(group); // Simpan seluruh objek
  };

  const handleGoBack = () => {
    setSelectedGroup(null);
  };

  // Dapatkan nama grup yang sedang dipilih untuk ditampilkan di header
  const selectedGroupName =
    selectedGroup?.product_group_name ?? t('GroupsView.title'); // <-- 3. Ganti teks

  // Tampilan Loading dan Error
  if (loading) {
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        <Loader2 className='h-8 w-8 animate-spin mr-2' />
        <span>{t('GroupsView.loading')}</span> {/* <-- 3. Ganti teks */}
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-destructive'>
        <AlertTriangle className='h-10 w-10 mb-2' />
        <span className='font-semibold'>
          {t('GroupsView.errorTitle')} {/* <-- 3. Ganti teks */}
        </span>
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
            {selectedGroupName.toLowerCase()}
          </h1>
          <p className='text-muted-foreground'>
            {selectedGroup
              ? t('GroupsView.subtitle', { groupName: selectedGroupName }) // <-- 3. Ganti teks
              : t('GroupsView.prompt')} {/* <-- 3. Ganti teks */}
          </p>
        </div>
      </header>
      <div className='flex-1 overflow-y-auto px-3 pb-3'>
        <div className='space-y-3'>
          {!selectedGroup ? (
            // Tampilan Folder Grup
            groups.length > 0 ? (
              groups.map((group) => (
                <GroupItem
                  key={group.id ?? group.product_group_code}
                  group={group}
                  onClick={() => handleSelectGroup(group)}
                />
              ))
            ) : (
              <div className='text-center text-muted-foreground mt-10'>
                {t('GroupsView.emptyGroups')} {/* <-- 3. Ganti teks */}
              </div>
            )
          ) : // Tampilan Daftar Produk di dalam Grup
          filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <ProductItem key={product.product_code} product={product} />
            ))
          ) : (
            // Ini adalah pesan yang Anda lihat di screenshot
            <div className='text-center text-muted-foreground mt-10'>
              {t('GroupsView.emptyProducts')} {/* <-- 3. Ganti teks */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}