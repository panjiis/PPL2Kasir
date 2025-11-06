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
import { fetchProducts } from '../lib/utils/pos-api';
import type { PosProduct } from '../lib/types/pos';
import Image from 'next/image';

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
  const { isCustomize, getProductImage, setProductImage } = usePreferences();
  const finalImage = id ? getProductImage(id, image_url) : image_url;

  return (
    <div className='text-left rounded-lg border border-border bg-card p-3 hover:shadow transition flex flex-col justify-between h-full'>
      <button
        type='button'
        onClick={onAdd}
        aria-label={`Tambah ${name} ke pesanan`}
        // --- PERBAIKAN: Tambahkan disabled dan style-nya ---
        disabled={isAdding}
        className='w-full flex flex-col flex-1 disabled:opacity-50 disabled:cursor-wait'
        // --- AKHIR PERBAIKAN ---
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
              {type === 'service' ? 'Service' : 'Product'} • Rp
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
            Gambar produk:
          </label>
          <div className='flex gap-2 w-full overflow-hidden'>
            <input
              className='flex-1 min-w-0 rounded-md border border-border bg-card text-foreground text-xs px-2 py-1 
                   focus:outline-none focus:ring-1 focus:ring-primary 
                   overflow-hidden text-ellipsis break-all'
              placeholder='URL gambar produk...'
              defaultValue={finalImage}
              onBlur={(ev) => setProductImage(id, ev.currentTarget.value)}
            />
            <button
              type='button'
              className='px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90 whitespace-nowrap'
              onClick={() => {
                const url = prompt(
                  'Masukkan URL gambar untuk produk ini',
                  finalImage || ''
                );
                if (url !== null) setProductImage(id, url);
              }}
            >
              Ubah
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
  // const [selectedTiles] = useState<Set<string>>(new Set());
  
  const [searchType, setSearchType] = useState<'name' | 'id'>('name');
  const [typeFilter, setTypeFilter] = useState<'service' | 'nonService' | null>(
    null
  );
  const [query, setQuery] = useState('');

  const { session } = useSession();
  const token = session?.token ?? '';

  const [apiProducts, setApiProducts] = useState<CartItem[]>([]);
  const [apiLoading, setApiLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const result = await fetchProducts(token);
        const raw: PosProduct[] = Array.isArray(result.data) ? result.data : [];

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
            category: prefix, 
            description: p.unit_of_measure ?? '',
            qty: 1, 
          };
        });

        setApiProducts(mapped);
      } catch (err) {
        console.error('Failed to load products from API:', err);
      } finally {
        setApiLoading(false);
      }
    };

    if (token) {
      loadProducts();
    } else {
      setApiProducts([]);
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
        Main Menu
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
          <span className='mt-1 text-xs text-foreground'>Service</span>
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
          <span className='mt-1 text-xs text-foreground'>Non-Service</span>
        </button>

        <div className='h-8 w-px bg-border mx-2' />

        {[
          { type: 'name', icon: <Tag className='h-5 w-5' />, label: 'Name' },
          { type: 'id', icon: <Tags className='h-5 w-5' />, label: 'ID' },
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
              ? 'Cari berdasarkan Item ID...'
              : 'Cari berdasarkan nama...'
          }
          onSubmit={() => {}}
        />
      </div>


      {/* PRODUCT LIST */}
      <div className='flex-1 overflow-y-auto pr-1'>
        {apiLoading ? (
          <div className='text-muted-foreground text-sm p-4'>
            Loading products...
          </div>
        ) : (
          <div className='grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
            {filteredProducts.map((p) => (
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
        )}
      </div>
    </div>
  );
}