'use client';
import React, { useState } from 'react';
import {
  EllipsisVertical,
  ListOrdered,
  LayoutDashboard,
  Boxes,
  Users,
  Warehouse,
  Tag,
} from 'lucide-react';
import { useCart } from './cart-content';
import { usePreferences } from '@/app/providers/preferences-context';
import { useSession } from '../lib/context/session';
import {
  fetchInventoryProducts,
  fetchInventorySuppliers,
  fetchInventoryWarehouses,
  fetchProductTypes,
} from '../lib/utils/inventory-api';
import { useRouter } from 'next/navigation'; // ✅ untuk redirect

const baseUser = {
  name: 'WaziTUYA',
  role: 'Admin',
  photo: './logo.png',
};

const navItems = [
  {
    key: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    api: fetchInventoryProducts,
  },
  {
    key: 'suppliers',
    label: 'Suppliers',
    icon: Users,
    api: fetchInventorySuppliers,
  },
  {
    key: 'warehouses',
    label: 'Warehouses',
    icon: Warehouse,
    api: fetchInventoryWarehouses,
  },
  {
    key: 'productTypes',
    label: 'Product Types',
    icon: Tag,
    api: fetchProductTypes,
  },
];

// --- CHUNK ARRAY FUNCTION ---
function chunkArray<T>(arr: T[], size: number): T[][] {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// --- CUSTOMIZE BUTTON COMPONENT ---
function SidebarTileButton({
  icon: Icon,
  label,
  itemKey,
  onClick,
  loading,
}: {
  icon: typeof Boxes;
  label: string;
  itemKey: string;
  onClick: () => void;
  loading?: boolean;
}) {
  const {
    isCustomize,
    getButtonLabel,
    setButtonPref,
    getButtonColorClasses,
    colorOptions,
  } = usePreferences();
  const key = `sidebar:${itemKey}`;
  const shownLabel = getButtonLabel(key, label);
  const color = getButtonColorClasses(key);

  return (
    <div className="rounded-lg border p-3 text-center transition group">
      <button
        type="button"
        className={[
          'block rounded-md p-2 w-full',
          color?.bg,
          color?.text,
          color?.border ?? 'border-border',
          'hover:ring-2',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={onClick}
        disabled={loading}
      >
        <div className="mx-auto mb-2 grid h-10 w-10 place-items-center text-current">
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-xs">{shownLabel}</div>
      </button>
      {isCustomize && (
        <div className="mt-2 space-y-2">
          <input
            className="w-full rounded-md border border-border bg-card text-foreground text-xs px-2 py-1"
            defaultValue={shownLabel}
            onBlur={(e) => setButtonPref(key, { label: e.currentTarget.value })}
            placeholder="Button name"
          />
          <div className="flex flex-col gap-1">
            {chunkArray(colorOptions, 3).map((row, idx) => (
              <div key={idx} className="flex gap-3">
                {row.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setButtonPref(key, { color: opt.key })}
                    className={['h-5 w-5 rounded border border-black', opt.classes.bg].join(' ')}
                    type="button"
                    aria-label={opt.key}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SidebarMock() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [popupContent, setPopupContent] = useState<React.ReactNode | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const { setPaymentSheetOpen, billOption } = useCart();
  const {
    isCustomize,
    toggleCustomize,
    getButtonLabel,
    getButtonColorClasses,
    colorOptions,
    setButtonPref,
  } = usePreferences();
  const { session, clearSession } = useSession();
  const token = session?.token;
  const router = useRouter();

  // Function logout
  const handleLogout = () => {
    clearSession?.();
    router.push('/Login');
  };

  // Helper untuk menampilkan data inventory lebih rapi
  const renderInventoryList = (data: any[]) => (
    <div>
      <h2 className="font-bold mb-3">Inventory Data</h2>
      <div className="grid gap-3">
        {data.map((row, idx) => (
          <div
            key={row.id || idx}
            className="border rounded-lg p-3 bg-gray-50 shadow"
          >
            <div className="mb-2 text-base font-bold">{row.product_name}</div>
            <div className="text-xs text-gray-700 space-y-1">
              <div>
                <span className="font-medium">Product Code:</span>{' '}
                {row.product_code}
              </div>
              <div>
                <span className="font-medium">Product Type:</span>{' '}
                {row.product_type_id}
              </div>
              <div>
                <span className="font-medium">Supplier:</span>{' '}
                {row.supplier_id}
              </div>
              <div>
                <span className="font-medium">Unit:</span>{' '}
                {row.unit_of_measure}
              </div>
              <div>
                <span className="font-medium">Reorder level:</span>{' '}
                {row.reorder_level}
              </div>
              <div>
                <span className="font-medium">Max stock:</span>{' '}
                {row.max_stock_level}
              </div>
            </div>
            {row.created_at?.seconds && (
              <div className="mt-2 text-xs text-gray-500">
                <span className="font-medium">Created:</span>{' '}
                {new Date(row.created_at.seconds * 1000).toLocaleString()}
              </div>
            )}
            {row.updated_at?.seconds && (
              <div className="text-xs text-gray-500">
                <span className="font-medium">Updated:</span>{' '}
                {new Date(row.updated_at.seconds * 1000).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 text-right text-xs text-muted-foreground">
        Total Data: {data.length}
      </div>
    </div>
  );

  async function handleNavClick(item: (typeof navItems)[number]) {
    if (!token)
      return setPopupContent(<div>Session expired, please login again.</div>);
    setLoading(true);
    try {
      const result = await item.api(token);

      let content: React.ReactNode;

      // khusus inventory
      if (item.key === 'inventory') {
        if (Array.isArray(result?.data) && result.data.length > 0) {
          content = renderInventoryList(result.data);
        } else {
          content = (
            <div>
              <h2 className="font-bold mb-2">Inventory Data</h2>
              <div className="p-4 text-sm text-muted-foreground border rounded bg-gray-50">
                Tidak ada data Inventory.
              </div>
            </div>
          );
        }
      } else if (Array.isArray(result?.data) && result.data.length > 0) {
        content = (
          <pre className="text-xs bg-gray-100 rounded p-2">
            {JSON.stringify(result, null, 2)}
          </pre>
        );
      } else {
        content = (
          <div>
            <h2 className="font-bold mb-2">{item.label} Data</h2>
            <pre className="text-xs bg-gray-100 rounded p-2">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        );
      }

      setPopupContent(
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>{content}</div>
      );
    } catch (e: any) {
      setPopupContent(
        <div className="text-red-500">{e?.message ?? String(e)}</div>
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Top row: Logo + bar */}
      <div className="flex items-center gap-1">
        <img
          src="./logo.png"
          alt="Logo"
          className="h-8 w-8 rounded-md bg-primary object-cover"
        />
        <div className="h-8 flex-1 rounded-md bg-primary flex items-center justify-center font-rubik font-bold tracking-wide text-primary-foreground text-base">
          Ezel Carwash Cilodong
        </div>
      </div>

      {/* Create order & Dashboard button side by side */}
      <div className="flex gap-2">
        <div
          className={[
            'flex-1 rounded-lg border border-border bg-primary p-3 text-primary-foreground cursor-pointer',
            !billOption ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
          onClick={() => billOption && setPaymentSheetOpen(true)}
          aria-disabled={!billOption}
          tabIndex={billOption ? 0 : -1}
        >
          <div className="flex items-center gap-3 justify-center">
            <div className="grid h-7 w-7 place-items-center text-primary-foreground/80">
              <ListOrdered className="h-4 w-4" />
            </div>
            <span className="text-sm">Create order</span>
          </div>
        </div>
        <button
          onClick={toggleCustomize}
          className="flex-1 rounded-lg border border-border bg-primary p-3 text-primary-foreground cursor-pointer flex items-center gap-3 justify-center hover:opacity-90 transition"
          aria-pressed={isCustomize}
        >
          <div className="grid h-7 w-7 place-items-center text-primary-foreground/80">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <span className="text-sm">{isCustomize ? 'Done' : 'Customize'}</span>
        </button>
      </div>

      {/* Grid of nav tiles */}
      <div className="grid grid-cols-2 gap-3">
        {navItems.map((item) => (
          <SidebarTileButton
            key={item.key}
            icon={item.icon}
            label={item.label}
            itemKey={item.key}
            onClick={() => handleNavClick(item)}
            loading={loading}
          />
        ))}
      </div>

      {/* Bottom composer */}
      <div className="mt-auto rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-md border-2 border-dashed text-foreground/70 overflow-hidden">
            <img
              src={baseUser.photo || '/placeholder.svg'}
              alt={baseUser.name}
              className="h-8 w-8 object-cover rounded-md"
            />
          </div>
          <div className="flex flex-col flex-1">
            <span className="text-base font-medium font-rubik text-foreground">
              {baseUser.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {baseUser.role}
            </span>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="h-8 w-8 flex items-center justify-center"
              aria-label="User menu"
            >
              <EllipsisVertical color="currentColor" size={24} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-32 rounded bg-card shadow-lg border border-border z-10">
                <button
                  className="block w-full px-4 py-2 text-left text-foreground hover:bg-secondary"
                  onClick={() => setMenuOpen(false)}
                >
                  User Setting
                </button>
                <button
                  className="block w-full px-4 py-2 text-left text-foreground hover:bg-secondary"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Popup for API data */}
      {popupContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg">
            {popupContent}
            <button
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
              onClick={() => setPopupContent(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}