'use client';

import { useState, useEffect } from 'react';
import { useSession } from '../lib/context/session';
import { useProductByCode, useUpdateProduct } from '@/app/Hooks/useProducts';
import type { PosProduct } from '@/app/lib/types/pos';
import { Loader2, ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotification } from './notification-context';

interface ProductUpdateViewProps {
  productCode: string;
  onBack: () => void;
  onSuccess: () => void;
}

type ProductFormData = {
  product_name: string;
  product_price: string;
  cost_price: string;
  commission_eligible: boolean;
  requires_service_employee: boolean;
  is_active: boolean;
};

export default function ProductUpdateView({
  productCode,
  onBack,
  onSuccess,
}: ProductUpdateViewProps) {
  const { session } = useSession();
  const { showNotif } = useNotification();
  const [formData, setFormData] = useState<ProductFormData | null>(null);

  const {
    data: product,
    isLoading: isLoadingProduct,
    error: errorProduct,
  } = useProductByCode(productCode, session?.token ?? '');

  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct(
    productCode,
    session?.token ?? ''
  );

  useEffect(() => {
    if (product) {
      setFormData({
        product_name: product.product_name ?? '',
        product_price: String(product.product_price ?? product.price ?? '0'),
        cost_price: String(product.cost_price ?? '0'),
        commission_eligible: product.commision_eligible ?? false,
        requires_service_employee: product.requires_service_employee ?? false,
        is_active: product.is_active ?? true,
      });
    }
  }, [product]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => {
      if (!prev) return null;
      if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        return { ...prev, [name]: checked };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !product?.product_code) return;

    const payload: Partial<PosProduct> = {
      ...formData,
      product_price: formData.product_price,
      cost_price: formData.cost_price,
    };

    updateProduct(
      { code: product.product_code, productData: payload },
      {
        onSuccess: () => {
          showNotif({
            type: 'success',
            message: 'Produk berhasil diperbarui!',
          });
          onSuccess();
        },
        onError: (err) => {
          showNotif({ type: 'error', message: err.message });
        },
      }
    );
  };

  if (isLoadingProduct) {
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        <Loader2 className='h-8 w-8 animate-spin mr-2' />
        <span>Loading Product Data...</span>
      </div>
    );
  }

  if (errorProduct) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-destructive'>
        <AlertTriangle className='h-10 w-10 mb-2' />
        <span className='font-semibold'>Gagal memuat produk</span>
        <p className='text-sm'>{errorProduct.message}</p>
        <Button variant='outline' onClick={onBack} className='mt-4'>
          Kembali
        </Button>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        Data form tidak ditemukan.
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col p-1'>
      <header className='p-3 flex items-center gap-4'>
        <Button variant='outline' size='icon' onClick={onBack}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold text-foreground'>Update Product</h1>
          <p className='text-muted-foreground'>
            Mengedit: {product?.product_name} ({product?.product_code})
          </p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className='flex-1 overflow-y-auto px-3 pb-3 space-y-4'
      >
        <div>
          <label
            htmlFor='product_name'
            className='block text-sm font-medium text-foreground'
          >
            Nama Produk
          </label>
          <input
            type='text'
            id='product_name'
            name='product_name'
            value={formData.product_name}
            onChange={handleChange}
            className='w-full mt-1 pl-4 pr-4 py-2 border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/50'
          />
        </div>

        <div>
          <label
            htmlFor='product_price'
            className='block text-sm font-medium text-foreground'
          >
            Harga Jual (Rp)
          </label>
          <input
            type='number'
            id='product_price'
            name='product_price'
            value={formData.product_price}
            onChange={handleChange}
            className='w-full mt-1 pl-4 pr-4 py-2 border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/50'
          />
        </div>

        <div>
          <label
            htmlFor='cost_price'
            className='block text-sm font-medium text-foreground'
          >
            Harga Modal (Rp)
          </label>
          <input
            type='number'
            id='cost_price'
            name='cost_price'
            value={formData.cost_price}
            onChange={handleChange}
            className='w-full mt-1 pl-4 pr-4 py-2 border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/50'
          />
        </div>

        <div className='space-y-2 pt-2'>
          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id='is_active'
              name='is_active'
              checked={formData.is_active}
              onChange={handleChange}
              className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
            />
            <label htmlFor='is_active' className='text-sm text-foreground'>
              Aktif (dijual)
            </label>
          </div>
          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id='commission_eligible'
              name='commission_eligible'
              checked={formData.commission_eligible}
              onChange={handleChange}
              className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
            />
            <label
              htmlFor='commission_eligible'
              className='text-sm text-foreground'
            >
              Bisa Komisi
            </label>
          </div>
          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id='requires_service_employee'
              name='requires_service_employee'
              checked={formData.requires_service_employee}
              onChange={handleChange}
              className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
            />
            <label
              htmlFor='requires_service_employee'
              className='text-sm text-foreground'
            >
              Butuh Karyawan (Layanan)
            </label>
          </div>
        </div>

        <footer className='p-4 border-t flex items-center justify-end gap-2'>
          <Button type='button' variant='outline' onClick={onBack}>
            Batal
          </Button>
          <Button type='submit' disabled={isUpdating}>
            {isUpdating ? (
              <Loader2 className='h-4 w-4 animate-spin mr-2' />
            ) : (
              <Save className='h-4 w-4 mr-2' />
            )}
            Simpan Perubahan
          </Button>
        </footer>
      </form>
    </div>
  );
}
