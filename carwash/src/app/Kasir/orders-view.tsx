'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from '../lib/context/session';
import { returnOrder as returnOrderApi } from '@/app/lib/utils/pos-api';

import { useOrders } from '@/app/Hooks/useOrders';
import { useProducts } from '@/app/Hooks/useProducts';

import type { DetailedPosOrder, PosProduct } from '@/app/lib/types/pos';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import { useNotification } from './notification-context';

// Import Dialog components
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
// Import Button component
import { Button } from '@/components/ui/button';

// --- Utility functions --- (Tidak berubah)
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
// -------------------------

const ITEMS_PER_PAGE = 8;

/**
 * PrintableReceipt
 * (Komponen ini berisi perbaikan)
 */
const PrintableReceipt = ({
  order,
  products,
  storeName = 'EZEL CARWASH CILODONG',
  storeAddress = 'Jl. Raya Bogor KM. 34,5, Cilodong, Depok',
  storePhone = '(0812) 3456-7890',
  paperWidth = '58mm',
}: {
  order: DetailedPosOrder;
  products: PosProduct[];
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  paperWidth?: string;
}) => {
  const [isClient, setIsClient] = useState(false);

  // print CSS (thermal friendly)
  const printStyles = `
  /* ... (Styles CSS tidak berubah) ... */
  @media print {
    body > * { display: none !important; visibility: hidden !important; }
    #printable-receipt {
      display: block !important;
      visibility: visible !important;
      width: ${paperWidth};
      max-width: ${paperWidth};
      margin: 0 auto;
      padding: 4mm 4mm 6mm 4mm;
      box-sizing: border-box;
      font-family: "Courier New", Courier, monospace;
      color: #000;
      background: #fff;
      font-size: 10px;
      line-height: 1.25;
    }
    #printable-receipt, #printable-receipt * { visibility: visible !important; color: #000 !important; background: transparent !important; }
    .rcpt-header { text-align: center; margin-bottom: 4px; }
    .rcpt-header h2 { font-size: 12px; margin: 0; font-weight: 700; }
    .rcpt-meta { font-size: 9px; margin-bottom: 4px; }
    .rcpt-meta p { margin: 2px 0; }
    .rcpt-divider { border-top: 1px dashed #000; margin: 4px 0; }
    .rcpt-items { width: 100%; border-collapse: collapse; font-size: 10px; }
    .rcpt-items thead th { text-align: left; font-size: 9px; padding-bottom: 4px; }
    .rcpt-items td { padding: 2px 0; vertical-align: top; }
    .rcpt-items td.qty { width: 10%; text-align: center; }
    .rcpt-items td.price { width: 30%; text-align: right; }
    .rcpt-summary { width: 100%; margin-top: 6px; font-size: 10px; border-collapse: collapse; }
    .rcpt-summary td { padding: 2px 0; }
    .rcpt-summary tr.total td { border-top: 1px dashed #000; font-weight: 700; padding-top: 4px; }
    .rcpt-footer { text-align: center; margin-top: 6px; font-size: 10px; }
    .print\\:hidden { display: none !important; }
  }
  `;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const styleId = 'printable-receipt-styles';
    if (document.getElementById(styleId)) return;
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.type = 'text/css';
    styleEl.appendChild(document.createTextNode(printStyles));
    document.head.appendChild(styleEl);
    return () => {
      styleEl.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, paperWidth]);

  const getProductName = (item: { product_name?: string, product_code?: string }) =>
    item.product_name ?? 
    products.find((p) => p.product_code === item.product_code)?.product_name ?? 
    item.product_code ?? 'Unknown';

  if (!isClient) return null;
  if (typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <div id="printable-receipt" className="hidden" aria-hidden>
      <div className="rcpt-header">
        <h2>{storeName}</h2>
        <div className="rcpt-meta">
          <p>{storeAddress}</p>
          <p>{storePhone}</p>
        </div>
      </div>

      <div className="rcpt-divider" />

      <div className="rcpt-meta">
        <p>Order #: {order.document_number}</p>
        <p>Tanggal: {formatDate(order.orders_date?.seconds)}</p>
        <p>Kasir: {sessionStorage.getItem('username') ?? 'Kasir'}</p>
      </div>

      <div className="rcpt-divider" />

      <table className="rcpt-items" role="table" aria-label="items">
        <thead>
          <tr>
            <th style={{ width: '55%' }}>Item</th>
            <th style={{ width: '15%', textAlign: 'center' }}>Qty</th>
            <th style={{ width: '30%', textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.order_items.map((item, idx) => {
            const total = Number(item.line_total ?? item.total_price ?? 0);
            return (
              <tr key={idx}>
                <td style={{ wordBreak: 'break-word' }}>{getProductName(item)}</td>
                <td className="qty" style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td className="price" style={{ textAlign: 'right' }}>{formatRupiah(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="rcpt-divider" />

      <table className="rcpt-summary" role="table" aria-label="summary">
        <tbody>
          <tr>
            <td>Subtotal</td>
            <td style={{ textAlign: 'right' }}>{formatRupiah(order.subtotal)}</td>
          </tr>

          {/* --- PERBAIKAN ESLINT DI SINI --- */}
          {('discount_amount' in order) && (
            <tr>
              <td>Discount</td>
              <td style={{ textAlign: 'right' }}>
                {/* Kita memberi tahu TypeScript bahwa 'order' di sini 
                  adalah objek yang mungkin memiliki 'discount_amount' 
                */}
                {formatRupiah(
                  (order as { discount_amount?: number }).discount_amount ?? 0
                )}
              </td>
            </tr>
          )}
          {/* --- AKHIR PERBAIKAN --- */}

          <tr className="total">
            <td>TOTAL</td>
            <td style={{ textAlign: 'right' }}>{formatRupiah(order.total_amount)}</td>
          </tr>

          {order.payment_type && (
            <tr>
              <td>Metode Bayar</td>
              <td style={{ textAlign: 'right' }}>{order.payment_type.payment_name ?? '-'}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="rcpt-divider" />

      <div className="rcpt-footer">
        <div style={{ marginBottom: 4 }}>{order.notes ?? ''}</div>
        <div style={{ fontSize: 10, marginTop: 6 }}>Terima kasih atas kunjungan Anda!</div>
        <div style={{ fontSize: 9 }}>~ Sampai jumpa lagi ~</div>
      </div>
    </div>,
    document.body
  );
};
// --- end PrintableReceipt ---


export default function OrdersView() {
  const { session } = useSession();
  const { showNotif } = useNotification();

  const {
    data: orders = [],
    isLoading: loadingOrders,
    error: errorOrders,
    refetch: refetchOrders,
  } = useOrders(session?.token ?? '');

  const {
    data: products = [],
    isLoading: loadingProducts,
    error: errorProducts,
  } = useProducts(session?.token ?? '');

  // ... (state lokal, handleReturnOrder, handlePrintReceipt tidak berubah) ...
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<DetailedPosOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

  const handleReturnOrder = async () => {
    const token = session?.token;
    if (!selectedOrder || !token) {
      showNotif({ type: 'error', message: 'Order details or token are missing.' });
      return;
    }
    setBusy(true);
    try {
      const allItemIds = selectedOrder.order_items.map((item) => item.id);
      if (allItemIds.length === 0) {
        throw new Error('Tidak ada item ID yang valid untuk di-return.');
      }
      await returnOrderApi(
        {
          original_order_id: selectedOrder.id,
          item_ids: allItemIds,
          processed_by: 1,
          reason: 'Return initiated from Orders view',
        },
        token
      );
      showNotif({ type: 'success', message: `Return created for order ${selectedOrder.document_number}` });
      setIsReturnDialogOpen(false);
      setSelectedOrder(null);
      refetchOrders();
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create return.';
      showNotif({ type: 'error', message: errorMessage });
    } finally {
      setBusy(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };


  const filteredOrders = useMemo(() => {
    return orders.filter((order) =>
      String(order.document_number).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));

  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  const loading = loadingOrders || loadingProducts;
  const error = errorOrders || errorProducts;
  const errorMessage = error ? (error instanceof Error ? error.message : 'An unknown error occurred.') : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading Orders...</span>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive">
        <AlertTriangle className="h-10 w-10 mb-2" />
        <span className="font-semibold">Failed to load data</span>
        <p className="text-sm">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card print:hidden">
      {/* ... (Header, Search, Table tidak berubah) ... */}
      <header className="p-4">
        <h1 className="text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-muted-foreground">Browse and review past transactions</p>
      </header>
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by order number..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4">
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 backdrop-blur-sm">
              <tr>
                <th className="text-left font-medium p-3">Order #</th>
                <th className="text-left font-medium p-3">Date</th>
                <th className="text-left font-medium p-3">Payment</th>
                <th className="text-right font-medium p-3">Subtotal</th>
                <th className="text-center font-medium p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-accent transition-colors">
                    <td className="p-3 font-medium text-primary">#{order.document_number}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(order.orders_date?.seconds)}</td>
                    <td className="p-3">{order.payment_type?.payment_name ?? 'N/A'}</td>
                    <td className="p-3 text-right font-semibold">{formatRupiah(order.subtotal ?? order.total_amount)}</td>
                    <td className="p-3 text-center">
                      <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center p-6 text-muted-foreground">No orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ... (Pagination tidak berubah) ... */}
      {totalPages > 1 && (
        <footer className="p-4 border-t flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrevPage} disabled={currentPage === 1}>Previous</Button>
            <Button variant="outline" onClick={handleNextPage} disabled={currentPage === totalPages}>Next</Button>
          </div>
        </footer>
      )}


      {/* Modal Detail */}
      {selectedOrder && (
        <>
          <PrintableReceipt order={selectedOrder} products={products} paperWidth="58mm" />

          <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col bg-card text-foreground print:hidden">
              {/* ... (DialogHeader dan info detail tidak berubah) ... */}
              <DialogHeader>
                <DialogTitle>Order #{selectedOrder.document_number}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-1">
                <div className="border rounded-lg p-4 bg-muted shadow-sm mb-4">
                  <table className="w-full text-xs">
                    <tbody>
                      <tr>
                        <td className="font-medium pr-2 py-1">ID</td>
                        <td>{selectedOrder.id}</td>
                      </tr>
                      <tr>
                        <td className="font-medium pr-2 py-1">Tanggal</td>
                        <td>{formatDate(selectedOrder.orders_date?.seconds)}</td>
                      </tr>
                      <tr>
                        <td className="font-medium pr-2 py-1">Subtotal</td>
                        <td>{formatRupiah(selectedOrder.subtotal)}</td>
                      </tr>
                      <tr>
                        <td className="font-medium pr-2 py-1">Total</td>
                        <td>{formatRupiah(selectedOrder.total_amount)}</td>
                      </tr>
                      <tr>
                        <td className="font-medium pr-2 py-1">Metode Pembayaran</td>
                        <td>{selectedOrder.payment_type?.payment_name ?? '-'}</td>
                      </tr>
                      {selectedOrder.notes && (
                        <tr>
                          <td className="font-medium pr-2 py-1">Catatan</td>
                          <td>{selectedOrder.notes}</td>
                        </tr>
                      )}
                      {selectedOrder.additional_info && (
                        <tr>
                          <td className="font-medium pr-2 py-1">Info Tambahan</td>
                          <td>{selectedOrder.additional_info}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border rounded-lg bg-muted shadow-sm">
                  <div className="font-semibold text-sm px-4 py-2 bg-muted border-b">Daftar Item</div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border px-2 py-1 text-left">Produk</th>
                        <th className="border px-2 py-1 text-center">Qty</th>
                        <th className="border px-2 py-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.order_items.map((item, idx) => {
                        const productName = item.product?.product_name ?? item.product_name ?? item.product_code ?? 'Unknown';
                        const quantity = item.quantity ?? item.qty ?? 0;
                        const total = Number(item.line_total ?? item.total_price ?? 0);

                        return (
                          <tr key={item.id ?? idx}>
                            <td className="border px-2 py-1">{productName}</td>
                            <td className="border px-2 py-1 text-center">{quantity}</td>
                            <td className="border px-2 py-1 text-right">{formatRupiah(total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ... (DialogFooter dan tombol-tombol tidak berubah) ... */}
              <DialogFooter className="mt-4 gap-2">
                <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" disabled={busy}>{busy ? 'Processing...' : 'Return Order'}</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Konfirmasi Pengembalian Pesanan</DialogTitle>
                      <DialogDescription className="py-4 text-base text-center">
                        Apakah Anda yakin ingin mengembalikan pesanan <span className="font-semibold">#{selectedOrder.document_number}</span>?
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                      <DialogClose asChild>
                        <Button variant="outline">Batal</Button>
                      </DialogClose>
                      <Button variant="destructive" onClick={handleReturnOrder} disabled={busy}>
                        {busy ? 'Memproses...' : 'Ya, Kembalikan'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" onClick={handlePrintReceipt}>Print Struk</Button>
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}