'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from '../lib/context/session';
import type { PosProduct, ProductGroup } from '@/app/lib/types/pos';
import { AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';
import { fetchProductGroups, fetchProducts } from '@/app/lib/utils/pos-api';
import { useTranslation } from 'react-i18next';

// Komponen ProductItem
const ProductItem = ({ product }: { product: PosProduct }) => {
  const { t } = useTranslation();
  return (
    <div className='border rounded-lg p-3 bg-card shadow-sm flex flex-col h-full justify-between hover:border-primary/50 transition-colors'>
      <div>
        <h4 className='font-bold text-sm sm:text-base text-foreground line-clamp-2'>
          {product.product_name}
        </h4>
        <p className='text-xs text-muted-foreground mt-1'>
          {t('GroupsView.productCode')} {product.product_code}
        </p>
      </div>
      <p className='text-sm sm:text-base font-semibold mt-2 text-primary'>
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
  const { t } = useTranslation();
  return (
    <div
      onClick={onClick}
      className='border rounded-lg p-4 bg-card shadow-sm cursor-pointer hover:bg-accent hover:border-primary/50 transition-all flex flex-col justify-center h-full min-h-[80px] sm:min-h-[100px]'
    >
      <h3 className='font-bold text-base sm:text-lg text-primary capitalize line-clamp-1'>
        {group.product_group_name?.toLowerCase() ??
          t('GroupsView.unnamedGroup')}
      </h3>
      <p className='text-xs sm:text-sm text-muted-foreground'>
        {group.product_group_code ?? t('GroupsView.groupCategory')}
      </p>
    </div>
  );
};

export default function GroupsView() {
  const { t } = useTranslation();
  const { session } = useSession();

  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [allProducts, setAllProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ProductGroup | null>(null);

  useEffect(() => {
    if (!session?.token) {
      setError(t('GroupsView.errorSession'));
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

        const groupData = Array.isArray(groupResponse.data)
          ? groupResponse.data
          : [];
        setGroups(groupData);

        const productData = Array.isArray(productResponse.data)
          ? productResponse.data
          : [];
        const mappedProducts: PosProduct[] = productData.map((p: unknown) => {
          const raw = p as Partial<PosProduct> & {
            product_price?: string | number;
            product_group_id?: number;
          };
          return {
            ...raw,
            price: Number(raw.product_price ?? raw.price ?? 0),
            product_name: raw.product_name ?? '',
            product_code: raw.product_code ?? '',
            product_group_id: raw.product_group_id,
          };
        });
        setAllProducts(mappedProducts);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t('GroupsView.errorUnknown')
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [session, t]);

  const filteredProducts = useMemo(() => {
    if (!selectedGroup) return [];

    const groupId = selectedGroup.id;
    const groupCode = selectedGroup.product_group_code;

    return allProducts.filter((p) => {
      if (p.product_group_id) {
        return p.product_group_id === groupId;
      }
      if (groupCode) {
        return (p.product_code || '').startsWith(groupCode);
      }
      return false;
    });
  }, [selectedGroup, allProducts]);

  const handleSelectGroup = (group: ProductGroup) => {
    setSelectedGroup(group);
  };

  const handleGoBack = () => {
    setSelectedGroup(null);
  };

  const selectedGroupName =
    selectedGroup?.product_group_name ?? t('GroupsView.title');

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        <Loader2 className='h-8 w-8 animate-spin mr-2' />
        <span>{t('GroupsView.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-destructive'>
        <AlertTriangle className='h-10 w-10 mb-2' />
        <span className='font-semibold'>{t('GroupsView.errorTitle')}</span>
        <p className='text-sm'>{error}</p>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col p-1 sm:p-2'>
      <header className='p-2 sm:p-3 flex items-center mb-2 sticky top-0 bg-card z-10 pb-4 border-b sm:border-none'>
        {selectedGroup && (
          <button
            onClick={handleGoBack}
            className='mr-3 sm:mr-4 p-2 rounded-md hover:bg-accent bg-muted/50 sm:bg-transparent'
          >
            <ArrowLeft className='h-5 w-5' />
          </button>
        )}
        <div>
          <h1 className='text-xl sm:text-2xl font-bold text-foreground capitalize line-clamp-1'>
            {selectedGroupName.toLowerCase()}
          </h1>
          <p className='text-xs sm:text-sm text-muted-foreground line-clamp-1'>
            {selectedGroup
              ? t('GroupsView.subtitle', { groupName: selectedGroupName })
              : t('GroupsView.prompt')}
          </p>
        </div>
      </header>

      <div className='flex-1 overflow-y-auto px-1 sm:px-3 pb-3'>
        {/* RESPONSIVE GRID SYSTEM */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 auto-rows-fr'>
          {!selectedGroup ? (
            groups.length > 0 ? (
              groups.map((group) => (
                <GroupItem
                  key={group.id ?? group.product_group_code}
                  group={group}
                  onClick={() => handleSelectGroup(group)}
                />
              ))
            ) : (
              <div className='col-span-full text-center text-muted-foreground mt-10'>
                {t('GroupsView.emptyGroups')}
              </div>
            )
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <ProductItem key={product.product_code} product={product} />
            ))
          ) : (
            <div className='col-span-full text-center text-muted-foreground mt-10'>
              {t('GroupsView.emptyProducts')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
