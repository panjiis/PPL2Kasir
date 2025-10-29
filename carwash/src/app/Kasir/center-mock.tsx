'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Barcode,
  HeartCrack as ChartBarStacked,
  Tag,
  Tags,
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
  image: string;
  price: number;
  type: 'product' | 'service';
  description?: string;
  onAdd?: () => void;
};

type OrderStatus = 'In Queue' | 'In Process' | 'Waiting Payment' | 'Done';

type Order = {
  id: string;
  orderNo: string;
  createdAt: string;
  customer?: string;
  items: CartItem[];
  status: OrderStatus;
  paymentType: 'cash' | 'credit' | 'qris';
  paymentBank?: string;
  total: number;
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
  image,
  price,
  type,
  description,
  onAdd,
}: ProductCardProps) {
  const { isCustomize, getProductImage, setProductImage } = usePreferences();
  const finalImage = id ? getProductImage(id, image) : image;

  return (
    <div className='text-left rounded-lg border border-border bg-card p-3 hover:shadow transition flex flex-col justify-between h-full'>
      <button
        type='button'
        onClick={onAdd}
        aria-label={`Tambah ${name} ke pesanan`}
        className='w-full flex flex-col flex-1'
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
// ===== Order Card List  ===== //
// ============================ //

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  let color = 'bg-gray-200 text-gray-600';
  if (status === 'In Queue') color = 'bg-yellow-200 text-yellow-800';
  if (status === 'In Process') color = 'bg-blue-200 text-blue-800';
  if (status === 'Waiting Payment') color = 'bg-gray-300 text-gray-700';
  if (status === 'Done') color = 'bg-green-200 text-green-800';
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${color}`}
    >
      {status}
    </span>
  );
}

function getNextStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case 'Waiting Payment':
      return 'In Queue';
    case 'In Queue':
      return 'In Process';
    case 'In Process':
      return 'Done';
    default:
      return null;
  }
}

function OrderCard({
  order,
  onStatusChange,
}: {
  order: Order;
  onStatusChange: (id: string, next: OrderStatus) => void;
}) {
  const next = getNextStatus(order.status);

  return (
    <div className='flex-shrink-0 w-[320px] rounded-lg border border-border bg-card p-4 flex flex-col gap-2 mr-3'>
      <div className='flex items-center justify-between gap-2'>
        <div className='font-bold font-rubik text-foreground'>
          Order {order.orderNo}
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className='text-xs text-muted-foreground'>{order.createdAt}</div>
      <div className='text-xs text-muted-foreground'>
        Metode: {order.paymentType}
        {order.paymentBank ? ` (${order.paymentBank})` : ''}
      </div>
      <ul className='mt-2 text-xs text-foreground/90 grid gap-1'>
        {order.items.map((it, idx) => (
          <li key={idx} className='flex justify-between'>
            <span>
              {it.name} × {it.qty}
            </span>
            <span>Rp{(it.price * it.qty).toLocaleString('id-ID')}</span>
          </li>
        ))}
      </ul>
      <div className='mt-2 text-xs font-bold text-primary'>
        Total: Rp{order.total.toLocaleString('id-ID')}
      </div>

      {next && (
        <button
          onClick={() => onStatusChange(order.id, next)}
          className='mt-3 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90 transition'
        >
          Ubah ke {next}
        </button>
      )}
    </div>
  );
}

// ============================ //
// ====== Main Component ====== //
// ============================ //

export default function CenterMock() {
  const [detailMode, setDetailMode] = useState<
    null | 'services' | 'non-services'
  >(null);
  const [selectedTiles] = useState<Set<string>>(new Set());
  const [searchType, setSearchType] = useState<
    'barcode' | 'category' | 'name' | 'itemId'
  >('name');
  const [query, setQuery] = useState('');

  const { orders, updateOrderStatus } = useCart();
  const filteredOrders = orders.filter((o) => o.status !== 'Done');

  const { session } = useSession();
  const token = session?.token ?? '';

  const [apiProducts, setApiProducts] = useState<CartItem[]>([]);
  const [apiLoading, setApiLoading] = useState(true);

  // 🔹 Langsung fetch produk saat komponen dimount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const result = await fetchProducts(token);
        const raw: PosProduct[] = Array.isArray(result.data) ? result.data : [];

        const mapped: CartItem[] = raw.map((p) => ({
          id: String(p.product_code),
          itemId: p.product_code,
          barcode: p.product_code || '',
          name: p.product_name,
          image: '/placeholder.svg',
          price: Number(p.product_price) ?? 0,
          type: 'product',
          // FIX (Perbaikan 1 & 2): Ambil kategori dari prefix product_code
          category: (p.product_code || '').split('-')[0] || '',
          description: p.unit_of_measure ?? '',
          qty: 1,
        }));

        setApiProducts(mapped);
      } catch (err) {
        console.error('Failed to load products from API:', err);
      } finally {
        setApiLoading(false);
      }
    };

    if (token) {
      // Hanya jalankan jika token sudah ada
      loadProducts();
    } else {
      // Jika token belum siap, pastikan list kosong dan tidak loading
      setApiProducts([]);
      setApiLoading(false);
    }
  }, [token]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apiProducts.filter((p) => {
      const tileOk =
        selectedTiles.size === 0 ? true : selectedTiles.has(p.category ?? '');
      if (!q) return tileOk;
      const hay =
        searchType === 'barcode'
          ? p.barcode?.toLowerCase() || ''
          : searchType === 'category'
          ? p.category?.toLowerCase() || ''
          : searchType === 'itemId'
          ? p.itemId?.toLowerCase() || ''
          : p.name.toLowerCase();
      return tileOk && hay.includes(q);
    });
  }, [query, searchType, selectedTiles, apiProducts]);

  const { addItem } = useCart();
  const { notif, clearNotif } = useNotification();

  return (
    <div className='flex flex-col gap-6 p-4 h-full overflow-y-auto'>
      <DynamicIsland
        type={notif.type as 'success' | 'error' | null}
        message={notif.message}
        amount={notif.amount}
        method={notif.method}
        onClose={clearNotif}
      />

      <div className='h-12 text-4xl font-bold font-rubik text-foreground tracking-wide'>
        Ongoing Order
      </div>

      <div
        className='flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-400'
        style={{ maxHeight: 200 }}
      >
        {filteredOrders.length === 0 ? (
          <div className='text-sm text-muted-foreground py-4'>
            Belum ada order.
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={(id, next) => updateOrderStatus(id, next)}
            />
          ))
        )}
      </div>

      <hr className='border-t border-border my-2' />

      <div className='h-12 text-3xl font-bold font-rubik text-foreground tracking-wide'>
        Detailing
      </div>

      <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
        <button
          type='button'
          onClick={() =>
            setDetailMode(detailMode === 'services' ? null : 'services')
          }
          className={[
            'rounded-lg border px-4 py-3 bg-secondary border-border text-foreground',
            detailMode === 'services' ? 'ring-2' : '',
          ].join(' ')}
        >
          Services
        </button>
        <button
          type='button'
          onClick={() =>
            setDetailMode(detailMode === 'non-services' ? null : 'non-services')
          }
          className={[
            'rounded-lg border px-4 py-3 bg-secondary border-border text-foreground',
            detailMode === 'non-services' ? 'ring-2' : '',
          ].join(' ')}
        >
          Non-Services
        </button>
      </div>

      <hr className='border-t border-border my-2' />

      <div className='h-12 text-3xl font-bold font-rubik text-foreground tracking-wide'>
        Main Menu
      </div>

      {/* SEARCH & FILTER */}
      <div className='flex items-center gap-2'>
        {[
          // Search buttons
          {
            type: 'barcode',
            icon: <Barcode className='h-5 w-5' />,
            label: 'Barcode',
          },
          {
            type: 'category',
            icon: <ChartBarStacked className='h-5 w-5' />,
            label: 'Category',
          },
          { type: 'name', icon: <Tag className='h-5 w-5' />, label: 'Name' },
          {
            type: 'itemId',
            icon: <Tags className='h-5 w-5' />,
            label: 'Item ID',
          },
        ].map((btn) => (
          <button
            key={btn.type}
            type='button'
            onClick={() => setSearchType(btn.type as typeof searchType)}
            className={[
              'flex flex-col items-center justify-center rounded-lg border bg-secondary border-border h-12 w-24 ml-1 px-2',
              searchType === btn.type ? 'ring-2' : '',
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
            searchType === 'barcode'
              ? 'Cari berdasarkan barcode...'
              : searchType === 'category'
              ? 'Cari berdasarkan kategori...'
              : searchType === 'itemId'
              ? 'Cari berdasarkan Item ID...'
              : 'Cari berdasarkan nama...'
          }
          onSubmit={() => {}}
        />
      </div>

      {/* PRODUCT LIST */}
      <div className='flex-1 overflow-y-auto max-h-[50vh] pr-1'>
        {apiLoading ? (
          <div className='text-muted-foreground text-sm p-4'>
            Loading products...
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {filteredProducts.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                image={p.image}
                price={p.price}
                type={p.type}
                description={p.description}
                onAdd={() => addItem(p)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}