'use client';
import { useState, useEffect, useMemo } from 'react';
import { Search, Tag, Tags, Wrench, Box, GripVertical } from 'lucide-react';
import { useCart, type CartItem } from './cart-content';
import DynamicIsland from './DynamicIsland';
import { useNotification } from './notification-context';
import { usePreferences } from '../providers/preferences-context';
import { useSession } from '../lib/context/session';
import { fetchProducts, fetchProductGroups } from '../lib/utils/pos-api';
import type { PosProduct, ProductGroup } from '../lib/types/pos';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

// --- TAMBAHAN: Impor Dnd-Kit ---
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// --- AKHIR TAMBAHAN ---

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
  isAdding?: boolean;
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
  isAdding,
}: ProductCardProps) {
  const { t } = useTranslation();
  const { isCustomize, getProductImage, setProductImage } = usePreferences();
  const finalImage = id ? getProductImage(id, image_url) : image_url;

  return (
    <div className='text-left rounded-lg border border-border bg-card p-3 transition-all flex flex-col justify-between h-full hover:shadow-md hover:ring-2 hover:ring-primary/70'>
      <button
        type='button'
        onClick={onAdd}
        aria-label={t('Center.card.ariaAdd', { name: name })}
        disabled={isAdding}
        className='w-full flex flex-col flex-1 disabled:opacity-50 disabled:cursor-wait'
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
                ? t('Center.card.service')
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
            {t('Center.card.customizeLabel')}
          </label>
          <div className='flex gap-2 w-full overflow-hidden'>
            <input
              className='flex-1 min-w-0 rounded-md border border-border bg-card text-foreground text-xs px-2 py-1 
                   focus:outline-none focus:ring-1 focus:ring-primary 
                   overflow-hidden text-ellipsis break-all'
              placeholder={t('Center.card.customizePlaceholder')}
              defaultValue={finalImage}
              onBlur={(ev) => setProductImage(id, ev.currentTarget.value)}
            />
            <button
              type='button'
              className='px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90 whitespace-nowrap'
              onClick={() => {
                const url = prompt(
                  t('Center.card.customizePlaceholder'),
                  finalImage || ''
                );
                if (url !== null) setProductImage(id, url);
              }}
            >
              {t('Center.card.customizeButton')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- KOMPONEN BARU: SortableGroupSection ---
type SortableGroupSectionProps = {
  group: ProductGroup;
  products: CartItem[];
  onAddItem: (item: CartItem) => void;
  addingItemId: string | null;
};

function SortableGroupSection({
  group,
  products,
  onAddItem,
  addingItemId,
}: SortableGroupSectionProps) {
  // Gunakan group code sebagai ID, fallback ke group ID
  const id = group.product_group_code || String(group.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined, // Pastikan item yang di-drag di atas
    opacity: isDragging ? 0.9 : 1, // Beri efek visual saat di-drag
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className='rounded-xl border border-border bg-card' // Ganti ke bg-card agar kontras
    >
      {/* Header "folder" sekarang menjadi drag handle */}
      <header
        {...attributes}
        {...listeners}
        className='p-4 border-b border-border/60 bg-muted/30 rounded-t-xl flex items-center justify-between cursor-grab active:cursor-grabbing'
      >
        <h2 className='text-xl font-bold text-primary tracking-tight capitalize'>
          {group.product_group_name?.toLowerCase()}
        </h2>
        <GripVertical className='h-5 w-5 text-muted-foreground/50' />
      </header>

      {/* Grid produk */}
      <div className='p-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
        {products.map((p) => (
          <ProductCard
            key={p.id}
            id={p.id}
            name={p.name}
            image_url={p.image}
            price={p.price}
            type={p.type}
            description={p.description}
            onAdd={() => onAddItem(p)}
            isAdding={addingItemId === p.id}
          />
        ))}
      </div>
    </section>
  );
}
// --- AKHIR KOMPONEN BARU ---

// ============================ //
// ====== Main Component ====== //
// ============================ //

export default function CenterMock() {
  const { t } = useTranslation();
  const [searchType, setSearchType] = useState<'name' | 'id'>('name');
  const [typeFilter, setTypeFilter] = useState<'service' | 'nonService' | null>(
    null
  );
  const [query, setQuery] = useState('');

  const { session } = useSession();
  const token = session?.token ?? '';

  const [apiProducts, setApiProducts] = useState<CartItem[]>([]);
  // State untuk Groups sekarang akan menjadi sumber urutan
  const [apiGroups, setApiGroups] = useState<ProductGroup[]>([]);
  const [apiLoading, setApiLoading] = useState(true);

  // --- Konfigurasi Dnd-Kit ---
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Hanya mulai drag jika mouse digeser > 8px
      },
    })
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setApiLoading(true);
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
            category: prefix,
            product_group_id: p.product_group_id,
            description: p.unit_of_measure ?? '',
            qty: 1,
          };
        });

        setApiProducts(mapped);

        // Proses Groups
        const rawGroups: ProductGroup[] = Array.isArray(groupResult.data)
          ? groupResult.data
          : [];
        
        // TODO: Di sini Anda bisa memuat urutan
        // yang disimpan dari localStorage/API dan
        // mengurutkan `rawGroups` sebelum di-set.
        
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
      setApiGroups([]);
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

  const groupedAndFilteredProducts = useMemo(() => {
    const groupMap = new Map<number, ProductGroup>();
    apiGroups.forEach((g) => {
      if (g.id !== null && g.id !== undefined) {
        groupMap.set(g.id, g);
      }
    });

    const groupCodeMap = new Map<string, ProductGroup>();
    apiGroups.forEach((g) => {
      if (g.product_group_code) {
        groupCodeMap.set(g.product_group_code, g);
      }
    });

    const productsByGroupId = new Map<number, CartItem[]>();
    const ungroupedProducts: CartItem[] = [];

    filteredProducts.forEach((p) => {
      let foundGroup = false;

      if (p.product_group_id && groupMap.has(p.product_group_id)) {
        const groupId = p.product_group_id;
        if (!productsByGroupId.has(groupId)) productsByGroupId.set(groupId, []);
        productsByGroupId.get(groupId)!.push(p);
        foundGroup = true;
      } else if (p.category && groupCodeMap.has(p.category)) {
        const group = groupCodeMap.get(p.category)!;
        const groupId = group.id;

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

    // PENTING: Urutan `groupedList` sekarang menghormati urutan `apiGroups`
    const groupedList = apiGroups
      .map((group) => ({
        group,
        products:
          group.id !== null && group.id !== undefined
            ? productsByGroupId.get(group.id) || []
            : [],
      }))
      .filter((g) => g.products.length > 0); // Hanya tampilkan grup yang ada isinya

    if (ungroupedProducts.length > 0) {
      groupedList.push({
        group: {
          id: 0,
          product_group_name: t('Center.list.otherGroup'),
          product_group_code: 'OTHER',
        },
        products: ungroupedProducts,
      });
    }

    return groupedList;
  }, [filteredProducts, apiGroups, t]); // `apiGroups` sekarang menjadi dependensi utama urutan

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

  // --- TAMBAHAN: Fungsi Handler untuk Dnd-Kit ---
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setApiGroups((groups) => {
        // Cari index berdasarkan ID (group_code atau string(id))
        const oldIndex = groups.findIndex(
          (g) => (g.product_group_code || String(g.id)) === active.id
        );
        const newIndex = groups.findIndex(
          (g) => (g.product_group_code || String(g.id)) === over.id
        );

        if (oldIndex === -1 || newIndex === -1) return groups; // Safety check

        const newOrderedGroups = arrayMove(groups, oldIndex, newIndex);
        
        // TODO: Di sini Anda bisa menyimpan `newOrderedGroups`
        // (atau hanya urutan ID-nya) ke localStorage/API
        // untuk preferensi pengguna.
        
        return newOrderedGroups;
      });
    }
  };

  // --- TAMBAHAN: Dapatkan daftar ID untuk SortableContext ---
  // Daftar ID ini HARUS sinkron dengan apa yang di-render
  const renderedGroupIds = useMemo(
    () =>
      groupedAndFilteredProducts.map(
        (g) => g.group.product_group_code || String(g.group.id)
      ),
    [groupedAndFilteredProducts]
  );

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
        {t('Center.title')}
      </div>

      {/* Kontainer Filter (tidak berubah) */}
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
            {t('Center.filters.service')}
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
            {t('Center.filters.nonService')}
          </span>
        </button>

        <div className='h-8 w-px bg-border mx-2' />

        {[
          {
            type: 'name',
            icon: <Tag className='h-5 w-5' />,
            label: t('Center.filters.name'),
          },
          {
            type: 'id',
            icon: <Tags className='h-5 w-5' />,
            label: t('Center.filters.id'),
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
              ? t('Center.search.placeholderId')
              : t('Center.search.placeholderName')
          }
          onSubmit={() => {}}
        />
      </div>

      {/* --- PERUBAHAN: Layout "Folder" dibungkus DndContext --- */}
      <div className='flex-1 overflow-y-auto pr-1 space-y-6'>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={renderedGroupIds} // Berikan ID yang sedang di-render
            strategy={verticalListSortingStrategy}
          >
            {apiLoading ? (
              <div className='text-muted-foreground text-sm p-4'>
                {t('Center.list.loading')}
              </div>
            ) : groupedAndFilteredProducts.length === 0 ? (
              <div className='text-muted-foreground text-sm p-4 text-center'>
                {t('Center.list.empty')}
              </div>
            ) : (
              groupedAndFilteredProducts.map(({ group, products }) => (
                <SortableGroupSection
                  key={group.product_group_code || String(group.id)}
                  group={group}
                  products={products}
                  onAddItem={addItem}
                  addingItemId={addingItemId}
                />
              ))
            )}
          </SortableContext>
        </DndContext>
      </div>
      {/* --- PERUBAHAN UI/UX SELESAI --- */}
    </div>
  );
}