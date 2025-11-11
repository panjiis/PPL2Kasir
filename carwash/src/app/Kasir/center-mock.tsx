'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Tag,
  Tags,
  Wrench,
  Box,
} from 'lucide-react';
import { useCart, type CartItem } from './cart-content';
import DynamicIsland from './DynamicIsland';
import { useNotification } from './notification-context';
import { usePreferences } from '../providers/preferences-context';
import { useSession } from '../lib/context/session';
// --- Impor fetchProductGroups ---
import { fetchProducts, fetchProductGroups } from '../lib/utils/pos-api';
// --- Impor ProductGroup ---
import type { PosProduct, ProductGroup } from '../lib/types/pos';
import Image from 'next/image';
import { useTranslation } from 'react-i18next'; // <-- 1. Impor hook

// ============================ //
// ===== Helper Type/Utils ===== //
// ============================ //

type ProductCardProps = {
  id?: string;
  name: string;
  image_url: string;
  price: number;
  type: 'product' | 'service';
  description?: string;
  onAdd?: () => void;
  isAdding?: boolean; // <-- TAMBAHKAN INI
};

// ============================ //
// ===== Search Component ===== //
// ============================ //

function SearchPill({
  query,
  setQuery,
  placeholder,
  onSubmit,
}: {
  query: string;
  setQuery: (v: string) => void;
  placeholder: string;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        onSubmit();
      }}
      className='flex-1 flex items-center rounded-lg border border-border bg-secondary h-12 px-3 min-w-[200px]'
    >
      <Search className='h-5 w-5 text-muted-foreground mr-2' />
      <input
        type='text'
        value={query}
        onChange={(ev) => setQuery(ev.target.value)}
        placeholder={placeholder}
        className='flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground h-full'
      />
    </form>
  );
}

// ============================ //
// ===== Product Component ==== //
// ============================ //

function ProductCard({
  id,
  name,
  image_url,
  price,
  type,
  description,
  onAdd,
  isAdding, // <-- TAMBAHKAN INI
}: ProductCardProps) {
  const { t } = useTranslation(); // <-- 2. Panggil hook
  const { isCustomize, getProductImage, setProductImage } = usePreferences();
  const finalImage = id ? getProductImage(id, image_url) : image_url;

  return (
    <div className='text-left rounded-lg border border-border bg-card p-3 hover:shadow transition flex flex-col justify-between h-full'>
      <button
        type='button'
        onClick={onAdd}
        aria-label={t('Center.card.ariaAdd', { name: name })} // <-- 3. Ganti teks
        // --- PERBAIKAIKAN: Tambahkan disabled dan style-nya ---
        disabled={isAdding}
        className='w-full flex flex-col flex-1 disabled:opacity-50 disabled:cursor-wait'
        // --- AKHIR PERBAIKAIKAN ---
      >
        <div className='grid place-items-center rounded-lg border border-border bg-secondary overflow-hidden'>
          <Image
            src={
              finalImage?.startsWith('http')
                ? finalImage
                : finalImage || '/placeholder.svg'
            }
            alt={name}
            width={300}
            height={100}
            className='h-[100px] w-full object-cover rounded-md'
            unoptimized
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.svg';
            }}
          />
        </div>

        <div className='mt-2 flex flex-col justify-between flex-1'>
          <div>
            <div className='font-bold font-rubik text-foreground text-sm leading-tight'>
              {name}
            </div>
            <div className='text-[11px] text-muted-foreground'>
              {type === 'service'
                ? t('Center.card.service') // <-- 3. Ganti teks
                : t('Center.card.product')}{' '}
              • Rp
              {price.toLocaleString('id-ID')}
            </div>
          </div>
          {description && (
            <div className='mt-1 text-[11px] text-muted-foreground line-clamp-2'>
              {description}
            </div>
          )}
        </div>
      </button>

      {isCustomize && id && (
        <div className='mt-3 flex flex-col gap-1.5'>
          <label className='text-[11px] text-muted-foreground font-medium'>
            {t('Center.card.customizeLabel')} {/* <-- 3. Ganti teks */}
          </label>
          <div className='flex gap-2 w-full overflow-hidden'>
            <input
              className='flex-1 min-w-0 rounded-md border border-border bg-card text-foreground text-xs px-2 py-1 
                   focus:outline-none focus:ring-1 focus:ring-primary 
                   overflow-hidden text-ellipsis break-all'
              placeholder={t('Center.card.customizePlaceholder')} // <-- 3. Ganti teks
              defaultValue={finalImage}
              onBlur={(ev) => setProductImage(id, ev.currentTarget.value)}
            />
            <button
              type='button'
              className='px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90 whitespace-nowrap'
              onClick={() => {
                const url = prompt(
                  t('Center.card.customizePlaceholder'), // <-- 3. Ganti teks
                  finalImage || ''
                );
                if (url !== null) setProductImage(id, url);
              }}
            >
              {t('Center.card.customizeButton')} {/* <-- 3. Ganti teks */}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================ //
// ====== Main Component ====== //
// ============================ //

export default function CenterMock() {
  const { t } = useTranslation(); // <-- 2. Panggil hook
  const [searchType, setSearchType] = useState<'name' | 'id'>('name');
  const [typeFilter, setTypeFilter] = useState<'service' | 'nonService' | null>(
    null
  );
  const [query, setQuery] = useState('');

  const { session } = useSession();
  const token = session?.token ?? '';

  const [apiProducts, setApiProducts] = useState<CartItem[]>([]);
  // --- PERUBAHAN: State untuk Groups ---
  const [apiGroups, setApiGroups] = useState<ProductGroup[]>([]);
  const [apiLoading, setApiLoading] = useState(true);

  // --- PERUBAHAN: useEffect mengambil data products dan groups ---
  useEffect(() => {
    const loadData = async () => {
      try {
        setApiLoading(true); // Pindahkan ke atas
        const [productResult, groupResult] = await Promise.all([
          fetchProducts(token),
          fetchProductGroups(token),
        ]);

        // Proses Products
        const raw: PosProduct[] = Array.isArray(productResult.data)
          ? productResult.data
          : [];

        const mapped: CartItem[] = raw.map((p) => {
          const prefix = (p.product_code || '').split('-')[0] || '';
          const itemType = prefix === 'SRV' ? 'service' : 'product';

          return {
            id: String(p.product_code),
            itemId: p.product_code,
            barcode: p.product_code || '',
            name: p.product_name,
            image: p.image_url || '/placeholder.svg',
            price: Number(p.product_price ?? p.price ?? 0),
            type: itemType,
            category: prefix, // Ini adalah group CODE (cth: "FOD")
            product_group_id: p.product_group_id, // Ini adalah group ID (cth: 12)
            description: p.unit_of_measure ?? '',
            qty: 1,
          };
        });

        setApiProducts(mapped);

        // Proses Groups
        const rawGroups: ProductGroup[] = Array.isArray(groupResult.data)
          ? groupResult.data
          : [];
        setApiGroups(rawGroups);
      } catch (err) {
        console.error('Failed to load products or groups from API:', err);
      } finally {
        setApiLoading(false);
      }
    };

    if (token) {
      loadData();
    } else {
      setApiProducts([]);
      setApiGroups([]); // <-- Reset groups
      setApiLoading(false);
    }
  }, [token]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();

    return apiProducts.filter((p) => {
      let typeFilterPassed = true;
      if (typeFilter === 'service') {
        typeFilterPassed = p.type === 'service';
      } else if (typeFilter === 'nonService') {
        typeFilterPassed = p.type === 'product';
      }

      if (!q) {
        return typeFilterPassed;
      }

      const hay =
        searchType === 'id'
          ? p.itemId?.toLowerCase() || ''
          : p.name.toLowerCase();

      const textFilterPassed = hay.includes(q);

      return typeFilterPassed && textFilterPassed;
    });
  }, [query, searchType, typeFilter, apiProducts]);

  // --- PERUBAHAN: Memo baru untuk mengelompokkan produk yang sudah difilter ---
  const groupedAndFilteredProducts = useMemo(() => {
    // 1. Buat map dari group ID -> ProductGroup
    const groupMap = new Map<number, ProductGroup>();
    apiGroups.forEach((g) => {
      // --- PERBAIKAN: Pastikan ID ada sebelum di-set ---
      if (g.id !== null && g.id !== undefined) {
        groupMap.set(g.id, g);
      }
    });

    // 2. Buat map dari group Code -> ProductGroup (untuk fallback)
    const groupCodeMap = new Map<string, ProductGroup>();
    apiGroups.forEach((g) => {
      if (g.product_group_code) {
        groupCodeMap.set(g.product_group_code, g);
      }
    });

    // 3. Kelompokkan produk yang sudah difilter
    const productsByGroupId = new Map<number, CartItem[]>();
    const ungroupedProducts: CartItem[] = [];

    filteredProducts.forEach((p) => {
      let foundGroup = false;

      // Prioritas 1: Gunakan product_group_id
      // --- PERBAIKAN: Cek p.product_group_id ada DAN ada di map ---
      if (p.product_group_id && groupMap.has(p.product_group_id)) {
        const groupId = p.product_group_id; // Di sini, groupId pasti number
        if (!productsByGroupId.has(groupId))
          productsByGroupId.set(groupId, []);
        productsByGroupId.get(groupId)!.push(p);
        foundGroup = true;
      }
      // Prioritas 2: Gunakan category (kode prefix)
      else if (p.category && groupCodeMap.has(p.category)) {
        const group = groupCodeMap.get(p.category)!;
        const groupId = group.id; // Ini bisa jadi number | undefined

        // --- PERBAIKAN: Cek groupId ada sebelum dipakai ---
        if (groupId !== null && groupId !== undefined) {
          if (!productsByGroupId.has(groupId)) {
            productsByGroupId.set(groupId, []);
          }
          productsByGroupId.get(groupId)!.push(p);
          foundGroup = true;
        }
      }

      if (!foundGroup) {
        ungroupedProducts.push(p);
      }
    });

    // 4. Ubah map menjadi array agar bisa di-render
    const groupedList = apiGroups
      .map((group) => ({
        group,
        // --- PERBAIKAN: Cek group.id ada sebelum .get() ---
        products:
          group.id !== null && group.id !== undefined
            ? productsByGroupId.get(group.id) || []
            : [],
      }))
      .filter((g) => g.products.length > 0); // Hanya tampilkan grup yang ada isinya

    // 5. Tambahkan produk tanpa grup di akhir
    if (ungroupedProducts.length > 0) {
      groupedList.push({
        // Grup dummy (pastikan id-nya unik, misal 0 atau -1)
        group: {
          id: 0,
          product_group_name: t('Center.list.otherGroup'), // <-- 3. Ganti teks
          product_group_code: 'OTHER',
        },
        products: ungroupedProducts,
      });
    }

    return groupedList;
  }, [filteredProducts, apiGroups, t]); // <-- 4. Tambahkan 't' ke dependencies

  // --- PERBAIKAN: Ambil 'addingItemId' dari useCart ---
  const { addItem, addingItemId } = useCart();
  const { notif, clearNotif } = useNotification();

  const handleTypeFilterToggle = (key: 'service' | 'nonService') => {
    setTypeFilter((current) => {
      if (current === key) {
        return null;
      }
      return key;
    });
  };

  return (
    <div className='flex flex-col gap-4 p-4 h-full overflow-y-auto'>
      <DynamicIsland
        type={notif.type as 'success' | 'error' | null}
        message={notif.message}
        amount={notif.amount}
        method={notif.method}
        onClose={clearNotif}
      />

      <div className='h-12 text-3xl font-bold font-rubik text-foreground tracking-wide'>
        {t('Center.title')} {/* <-- 3. Ganti teks */}
      </div>

      <div className='flex items-center gap-2'>
        <button
          type='button'
          onClick={() => handleTypeFilterToggle('service')}
          className={[
            'flex flex-col items-center justify-center rounded-lg border bg-secondary border-border h-12 w-24 ml-1 px-2 transition-all',
            typeFilter === 'service' ? 'ring-2 ring-primary' : 'ring-0',
          ].join(' ')}
        >
          <div className='grid h-5 w-5 place-items-center text-muted-foreground'>
            <Wrench className='h-5 w-5' />
          </div>
          <span className='mt-1 text-xs text-foreground'>
            {t('Center.filters.service')} {/* <-- 3. Ganti teks */}
          </span>
        </button>
        <button
          type='button'
          onClick={() => handleTypeFilterToggle('nonService')}
          className={[
            'flex flex-col items-center justify-center rounded-lg border bg-secondary border-border h-12 w-24 ml-1 px-2 transition-all',
            typeFilter === 'nonService' ? 'ring-2 ring-primary' : 'ring-0',
          ].join(' ')}
        >
          <div className='grid h-5 w-5 place-items-center text-muted-foreground'>
            <Box className='h-5 w-5' />
          </div>
          <span className='mt-1 text-xs text-foreground'>
            {t('Center.filters.nonService')} {/* <-- 3. Ganti teks */}
          </span>
        </button>

        <div className='h-8 w-px bg-border mx-2' />

        {[
          {
            type: 'name',
            icon: <Tag className='h-5 w-5' />,
            label: t('Center.filters.name'), // <-- 3. Ganti teks
          },
          {
            type: 'id',
            icon: <Tags className='h-5 w-5' />,
            label: t('Center.filters.id'), // <-- 3. Ganti teks
          },
        ].map((btn) => (
          <button
            key={btn.type}
            type='button'
            onClick={() => setSearchType(btn.type as typeof searchType)}
            className={[
              'flex flex-col items-center justify-center rounded-lg border bg-secondary border-border h-12 w-24 ml-1 px-2 transition-all',
              searchType === btn.type ? 'ring-2 ring-primary' : 'ring-0',
            ].join(' ')}
          >
            <div className='grid h-5 w-5 place-items-center text-muted-foreground'>
              {btn.icon}
            </div>
            <span className='mt-1 text-xs text-foreground'>{btn.label}</span>
          </button>
        ))}

        <SearchPill
          query={query}
          setQuery={setQuery}
          placeholder={
            searchType === 'id'
              ? t('Center.search.placeholderId') // <-- 3. Ganti teks
              : t('Center.search.placeholderName') // <-- 3. Ganti teks
          }
          onSubmit={() => {}}
        />
      </div>


      {/* --- PERUBAHAN: PRODUCT LIST RENDER --- */}
      <div className='flex-1 overflow-y-auto pr-1 space-y-6'>
        {apiLoading ? (
          <div className='text-muted-foreground text-sm p-4'>
            {t('Center.list.loading')} {/* <-- 3. Ganti teks */}
          </div>
        ) : groupedAndFilteredProducts.length === 0 ? (
          <div className='text-muted-foreground text-sm p-4 text-center'>
            {t('Center.list.empty')} {/* <-- 3. Ganti teks */}
          </div>
        ) : (
          groupedAndFilteredProducts.map(({ group, products }) => (
            <div key={group.id ?? group.product_group_code}>
              <h2 className='text-xl font-bold text-foreground mb-3 capitalize'>
                {group.product_group_name?.toLowerCase()}
              </h2>
              <div className='grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    image_url={p.image}
                    price={p.price}
                    type={p.type}
                    description={p.description}
                    onAdd={() => addItem(p)}
                    isAdding={addingItemId === p.id} // <-- TAMBAHKAN INI
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}