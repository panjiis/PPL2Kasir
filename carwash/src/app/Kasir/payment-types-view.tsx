'use client';
import { useEffect, useState } from 'react';
import { useSession } from '@/app/lib/context/session';
import { fetchPaymentTypes } from '@/app/lib/utils/pos-api';
import type { PaymentType } from '@/app/lib/types/pos';
import { AlertTriangle, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function PaymentTypesView() {
  const { session } = useSession();
  const [data, setData] = useState<PaymentType[]>([]);
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
        const result = await fetchPaymentTypes(session.token);
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
        <span>Loading Payment Types...</span>
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
        No payment types found.
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col p-1'>
      <header className='p-3'>
        <h1 className='text-2xl font-bold text-foreground'>Payment Methods</h1>
        <p className='text-muted-foreground'>
          View and manage accepted payment types.
        </p>
      </header>
      <div className='flex-1 overflow-y-auto px-3 pb-3'>
        <div className='border rounded-lg overflow-hidden'>
          <table className='w-full text-sm'>
            <thead className='bg-muted'>
              <tr>
                <th className='text-left font-medium p-3'>Name</th>
                <th className='text-left font-medium p-3'>Processing Fee</th>
                <th className='text-center font-medium p-3'>Status</th>
              </tr>
            </thead>
            <tbody className='bg-card'>
              {data.map((item) => (
                <tr key={item.id} className='border-t'>
                  <td className='p-3 font-medium'>{item.payment_name}</td>
                  <td className='p-3 text-muted-foreground'>
                    {parseFloat(item.processing_fee_rate)}%
                  </td>
                  <td className='p-3'>
                    <div className='flex items-center justify-center gap-2'>
                      {item.is_active ? (
                        <>
                          <CheckCircle className='h-4 w-4 text-green-500' />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className='h-4 w-4 text-red-500' />
                          <span>Inactive</span>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}