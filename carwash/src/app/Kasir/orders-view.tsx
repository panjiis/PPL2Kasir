'use client';
import { useEffect, useState, useMemo } from 'react';
import { useSession } from '@/app/lib/context/session';
import {
  fetchOrders,
  fetchProducts,
  returnOrder as returnOrderApi,
} from '@/app/lib/utils/pos-api';
import type { DetailedPosOrder, PosProduct } from '@/app/lib/types/pos';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import { useNotification } from './notification-context';

// Import Dialog components from shadcn/ui
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component

const formatDate = (seconds?: number) => {
  if (!seconds) return '-';
  const d = new Date(seconds * 1000);
  return d
    .toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(/\./g, ':');
};

const formatRupiah = (amount?: number) => {
  if (amount == null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace('IDR', 'Rp');
};

const ITEMS_PER_PAGE = 10;

export default function OrdersView() {
  const { session } = useSession();
  const { showNotif } = useNotification();
  const [orders, setOrders] = useState<DetailedPosOrder[]>([]);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] =
    useState<DetailedPosOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

  // Fetch Orders & Products
  useEffect(() => {
    if (!session?.token) {
      setError('Session not found. Please login again.');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [ordersRes, productsRes] = await Promise.all([
          fetchOrders(session.token),
          fetchProducts(session.token),
        ]);
        setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
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

  const handleReturnOrder = async () => {
    if (!selectedOrder || !session?.token) {
      showNotif({ type: 'error', message: 'Order details or token are missing.' });
      return;
    }
    setBusy(true);
    try {
      await returnOrderApi(
        {
          original_order_id: selectedOrder.id,
          item_ids: [], // Returning the whole order
          processed_by: 1, // Assuming cashier ID 1
          reason: 'Return initiated from Orders view',
        },
        session.token
      );
      showNotif({
        type: 'success',
        message: `Return created for order ${selectedOrder.document_number}`,
      });
      setIsReturnDialogOpen(false); // Close the dialog
      setSelectedOrder(null); // Close the details modal
    } catch (err) {
      console.error(err);
      showNotif({ type: 'error', message: 'Failed to create return.' });
    } finally {
      setBusy(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) =>
      String(order.document_number)
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        <Loader2 className='h-8 w-8 animate-spin mr-2' />
        <span>Loading Orders...</span>
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

  return (
    <div className='h-full flex flex-col p-1'>
      <header className='p-3'>
        <h1 className='text-2xl font-bold text-foreground'>Orders</h1>
        <p className='text-muted-foreground'>
          Browse and review past transactions.
        </p>
      </header>

      {/* Search */}
      <div className='px-3 pb-3'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground' />
          <input
            type='text'
            placeholder='Search by order number...'
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className='w-full pl-10 pr-4 py-2 border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/50'
          />
        </div>
      </div>

      {/* Table */}
      <div className='flex-1 overflow-y-auto px-3 pb-3'>
        <div className='border rounded-lg overflow-hidden'>
          <table className='w-full text-sm'>
            <thead className='bg-muted'>
              <tr>
                <th className='text-left font-medium p-3'>Order #</th>
                <th className='text-left font-medium p-3'>Date</th>
                <th className='text-left font-medium p-3'>Payment</th>
                <th className='text-right font-medium p-3'>Subtotal</th>
                <th className='text-center font-medium p-3'>Actions</th>
              </tr>
            </thead>
            <tbody className='bg-card'>
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className='border-t hover:bg-accent/30 transition-colors'
                  >
                    <td className='p-3 font-medium text-primary'>
                      #{order.document_number}
                    </td>
                    <td className='p-3 text-muted-foreground'>
                      {formatDate(order.orders_date?.seconds)}
                    </td>
                    <td className='p-3'>
                      {order.payment_type?.payment_name ?? 'N/A'}
                    </td>
                    <td className='p-3 text-right font-semibold'>
                      {formatRupiah(order.subtotal ?? order.total_amount)}
                    </td>
                    <td className='p-3 text-center'>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className='px-3 py-1 text-xs border rounded-md hover:bg-accent transition'
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className='text-center p-6 text-muted-foreground'
                  >
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <footer className='p-4 border-t flex items-center justify-between'>
          <span className='text-sm text-muted-foreground'>
            Page {currentPage} of {totalPages}
          </span>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant='outline'
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </footer>
      )}

      {/* Modal Detail - Now uses Dialog for confirmation */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className='max-w-3xl max-h-[90vh] flex flex-col'>
            <DialogHeader>
              <DialogTitle>Order #{selectedOrder.document_number}</DialogTitle>
            </DialogHeader>

            <div className='flex-1 overflow-y-auto p-1'>
              <div className='border rounded-lg p-4 bg-gray-50 shadow-sm mb-4'>
                <table className='w-full text-xs'>
                  <tbody>
                    <tr><td className='font-medium pr-2 py-1'>ID</td><td>{selectedOrder.id}</td></tr>
                    <tr><td className='font-medium pr-2 py-1'>Tanggal</td><td>{formatDate(selectedOrder.orders_date?.seconds)}</td></tr>
                    <tr><td className='font-medium pr-2 py-1'>Subtotal</td><td>{formatRupiah(selectedOrder.subtotal)}</td></tr>
                    <tr><td className='font-medium pr-2 py-1'>Total</td><td>{formatRupiah(selectedOrder.total_amount)}</td></tr>
                    <tr><td className='font-medium pr-2 py-1'>Metode Pembayaran</td><td>{selectedOrder.payment_type?.payment_name ?? '-'}</td></tr>
                    {selectedOrder.notes && <tr><td className='font-medium pr-2 py-1'>Catatan</td><td>{selectedOrder.notes}</td></tr>}
                    {selectedOrder.additional_info && <tr><td className='font-medium pr-2 py-1'>Info Tambahan</td><td>{selectedOrder.additional_info}</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className='border rounded-lg bg-white shadow-sm'>
                <div className='font-semibold text-sm px-4 py-2 bg-gray-100 border-b'>Daftar Item</div>
                <table className='w-full text-xs'>
                  <thead>
                    <tr className='bg-gray-100'>
                      <th className='border px-2 py-1 text-left'>Produk</th>
                      <th className='border px-2 py-1 text-center'>Qty</th>
                      <th className='border px-2 py-1 text-right'>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.order_items.map((item, idx) => {
                      const product = products.find((p) => p.id === item.product_id);
                      const productName = product?.product_name ?? 'Unknown';
                      const price = Number(product?.price ?? 0);
                      const total = (item.quantity ?? 0) * price;
                      return (
                        <tr key={idx}><td className='border px-2 py-1'>{productName}</td><td className='border px-2 py-1 text-center'>{item.quantity}</td><td className='border px-2 py-1 text-right'>{formatRupiah(total)}</td></tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter className='mt-4 gap-2'>
              <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant='destructive' disabled={busy}>
                    {busy ? 'Processing...' : 'Return Order'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Konfirmasi Pengembalian Pesanan</DialogTitle>
                    <DialogDescription className='py-4 text-base text-center'>
                       Apakah Anda yakin ingin mengembalikan pesanan{' '}
                      <span className='font-semibold'>
                        #{selectedOrder.document_number}
                      </span>
                      ?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className='gap-2'>
                    <DialogClose asChild>
                      <Button variant='outline'>Batal</Button>
                    </DialogClose>
                    <Button
                      variant='destructive'
                      onClick={handleReturnOrder}
                      disabled={busy}
                    >
                      {busy ? 'Memproses...' : 'Ya, Kembalikan'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant='outline' onClick={() => setSelectedOrder(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}