'use client';
import { useEffect, useState } from 'react';
import { useSession } from '@/app/lib/context/session';
import { fetchProductGroups } from '@/app/lib/utils/pos-api';
import type { ProductGroup } from '@/app/lib/types/pos';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function GroupsView() {
  const { session } = useSession();
  const [data, setData] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.token) {
      setError('Session not found. Please login again.');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const result = await fetchProductGroups(session.token);
        setData(Array.isArray(result.data) ? result.data : []);
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

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        <Loader2 className='h-8 w-8 animate-spin mr-2' />
        <span>Loading Product Groups...</span>
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

  if (data.length === 0) {
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        No product groups found.
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col p-1'>
      <header className='p-3'>
        <h1 className='text-2xl font-bold text-foreground'>Product Groups</h1>
        <p className='text-muted-foreground'>
          Organize your products into groups.
        </p>
      </header>
      <div className='flex-1 overflow-y-auto px-3 pb-3'>
        <div className='space-y-3'>
          {data.map((item) => (
            <div
              key={item.id}
              className='border rounded-lg p-4 bg-card shadow-sm'
            >
              <h3 className='font-bold text-lg text-primary'>
                {item.product_group_name}
              </h3>
              <p className='text-sm text-muted-foreground mb-2'>
                Code: {item.product_group_code}
              </p>
              {item.desc && <p className='text-sm mt-1'>{item.desc}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}