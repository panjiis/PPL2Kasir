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
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

// --- Utility functions ---
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

const ITEMS_PER_PAGE = 8;

/**
 * PrintableReceipt
 */
const PrintableReceipt = ({
  order,
  products,
  taxAmount,
  discountAmount,
  processingFee,
  paymentMethodName,
  grandTotal,
  storeName = 'EZEL CARWASH CILODONG',
  storeAddress = 'Jl. Raya Bogor KM. 34,5, Cilodong, Depok',
  storePhone = '(0812) 3456-7890',
  paperWidth = '58mm',
}: {
  order: DetailedPosOrder;
  products: PosProduct[];
  taxAmount: number;
  discountAmount: number;
  processingFee: number;
  paymentMethodName: string;
  grandTotal: number;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  paperWidth?: string;
}) => {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);

  // PERBAIKAN 1: Bungkus printStyles dengan useMemo untuk mengatasi warning useEffect
  const printStyles = useMemo(
    () => `
  @media print {
    @page {
      size: ${paperWidth} auto; 
      margin: 0;
      padding: 0;
    }
    body {
      display: block !important; 
      justify-content: normal !important;
      align-items: normal !important;
      padding: 0 !important; 
      margin: 0 !important;
      width: 100% !important;
      height: auto !important;
    }
    body > * { display: none !important; visibility: hidden !important; }
    #printable-receipt {
      display: block !important;
      visibility: visible !important;
      width: ${paperWidth};
      max-width: ${paperWidth};
      margin: 0; 
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
  `,
    [paperWidth]
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  // PERBAIKAN 1 (Lanjutan): Masukkan printStyles ke dependency array
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
  }, [isClient, printStyles]);

  const getProductName = (item: {
    product_name?: string;
    product_code?: string;
  }) =>
    item.product_name ??
    products.find((p) => p.product_code === item.product_code)?.product_name ??
    item.product_code ??
    'Unknown';

  if (!isClient) return null;
  if (typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <div id='printable-receipt' className='hidden' aria-hidden>
      <div className='rcpt-header'>
        <h2>{storeName}</h2>
        <div className='rcpt-meta'>
          <p>{storeAddress}</p>
          <p>{storePhone}</p>
        </div>
      </div>
      <div className='rcpt-divider' />
      <div className='rcpt-meta'>
        <p>
          {t('OrdersView.receipt.order')}: {order.document_number}
        </p>
        <p>
          {t('OrdersView.modal.date')}: {formatDate(order.orders_date?.seconds)}
        </p>
        <p>
          {t('OrdersView.receipt.kasir')}:{' '}
          {sessionStorage.getItem('username') ?? t('OrdersView.receipt.kasir')}
        </p>
      </div>
      <div className='rcpt-divider' />
      <table className='rcpt-items' role='table' aria-label='items'>
        <thead>
          <tr>
            <th style={{ width: '55%' }}>{t('OrdersView.receipt.item')}</th>
            <th style={{ width: '15%', textAlign: 'center' }}>
              {t('OrdersView.receipt.qty')}
            </th>
            <th style={{ width: '30%', textAlign: 'right' }}>
              {t('OrdersView.receipt.total')}
            </th>
          </tr>
        </thead>
        <tbody>
          {order.order_items.map((item, idx) => {
            const total = Number(item.line_total ?? item.total_price ?? 0);
            return (
              <tr key={idx}>
                <td style={{ wordBreak: 'break-word' }}>
                  {getProductName(item)}
                </td>
                <td className='qty' style={{ textAlign: 'center' }}>
                  {item.quantity}
                </td>
                <td className='price' style={{ textAlign: 'right' }}>
                  {formatRupiah(total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className='rcpt-divider' />
      <table className='rcpt-summary' role='table' aria-label='summary'>
        <tbody>
          <tr>
            <td>{t('OrdersView.modal.subtotal')}</td>
            <td style={{ textAlign: 'right' }}>
              {formatRupiah(order.subtotal)}
            </td>
          </tr>
          <tr>
            <td>{t('Aside.totals.tax')} (10%)</td>
            <td style={{ textAlign: 'right' }}>{formatRupiah(taxAmount)}</td>
          </tr>
          <tr>
            <td>{t('Aside.totals.discount')}</td>
            <td style={{ textAlign: 'right' }}>
              - {formatRupiah(discountAmount)}
            </td>
          </tr>
          {processingFee > 0 && (
            <tr>
              <td>
                {t('Aside.paymentSheet.serviceFee', {
                  paymentName: paymentMethodName,
                })}
              </td>
              <td style={{ textAlign: 'right' }}>
                {formatRupiah(processingFee)}
              </td>
            </tr>
          )}
          <tr className='total'>
            <td>{t('OrdersView.receipt.grandtotal')}</td>
            <td style={{ textAlign: 'right' }}>{formatRupiah(grandTotal)}</td>
          </tr>
          {order.payment_type && (
            <tr>
              <td>{t('OrdersView.modal.paymentMethod')}</td>
              <td style={{ textAlign: 'right' }}>
                {order.payment_type.payment_name ?? '-'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className='rcpt-divider' />
      <div className='rcpt-footer'>
        <div style={{ marginBottom: 4 }}>{order.notes ?? ''}</div>
        <div style={{ fontSize: 10, marginTop: 6 }}>
          {t('OrdersView.receipt.thankyou')}
        </div>
        <div style={{ fontSize: 9 }}>{t('OrdersView.receipt.comeagain')}</div>
      </div>
    </div>,
    document.body
  );
};

export default function OrdersView() {
  const { t } = useTranslation();
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

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<DetailedPosOrder | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

  const discountAmount = useMemo(() => {
    if (!selectedOrder) return 0;
    return Number(selectedOrder.discount_amount ?? 0);
  }, [selectedOrder]);

  const taxAmount = useMemo(() => {
    if (!selectedOrder) return 0;
    const baseForTax = Number(selectedOrder.subtotal ?? 0) - discountAmount;
    return Math.round(baseForTax * 0.1);
  }, [selectedOrder, discountAmount]);

  const { processingFee, paymentMethodName } = useMemo(() => {
    if (!selectedOrder?.additional_info) {
      return { processingFee: 0, paymentMethodName: '' };
    }
    const feeMatch = selectedOrder.additional_info.match(/Payment Fee: (\d+)/);
    const methodMatch =
      selectedOrder.additional_info.match(/Metode: ([\w\s]+),/);

    const fee = feeMatch && feeMatch[1] ? Number(feeMatch[1]) : 0;
    const name =
      methodMatch && methodMatch[1]
        ? methodMatch[1].trim()
        : selectedOrder.payment_type?.payment_name ?? '';

    return { processingFee: fee, paymentMethodName: name };
  }, [selectedOrder]);

  const grandTotal = useMemo(() => {
    if (!selectedOrder) return 0;
    const subtotalNum = Number(selectedOrder.subtotal ?? 0);
    return subtotalNum - discountAmount + taxAmount + processingFee;
  }, [selectedOrder, discountAmount, taxAmount, processingFee]);

  const handleReturnOrder = async () => {
    const token = session?.token;
    if (!selectedOrder || !token) {
      showNotif({
        type: 'error',
        message: t('OrdersView.errors.missingDetails'),
      });
      return;
    }
    setBusy(true);
    try {
      const allItemIds = selectedOrder.order_items
        .map((item) => item.id)
        .filter((id) => id != null) as number[];

      if (allItemIds.length === 0) {
        throw new Error(t('OrdersView.errors.noReturnItems'));
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
      showNotif({
        type: 'success',
        message: t('OrdersView.errors.returnSuccess', {
          orderNumber: selectedOrder.document_number,
        }),
      });
      setIsReturnDialogOpen(false);
      setSelectedOrder(null);
      refetchOrders();
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : t('OrdersView.errors.returnFailed');
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
      String(order.document_number)
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)
  );

  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  // PERBAIKAN 2: Tambahkan "- 1" agar halaman benar-benar berkurang
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  const loading = loadingOrders || loadingProducts;
  const error = errorOrders || errorProducts;
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : 'An unknown error occurred.'
    : null;

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        <Loader2 className='h-8 w-8 animate-spin mr-2' />
        <span>{t('OrdersView.loading')}</span>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-destructive'>
        <AlertTriangle className='h-10 w-10 mb-2' />
        <span className='font-semibold'>{t('OrdersView.errorTitle')}</span>
        <p className='text-sm'>{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col bg-card print:hidden'>
      <header className='p-4'>
        <h1 className='text-xl sm:text-2xl font-bold text-foreground'>
          {t('OrdersView.title')}
        </h1>
        <p className='text-sm text-muted-foreground'>
          {t('OrdersView.description')}
        </p>
      </header>
      <div className='px-4 pb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground' />
          <input
            type='text'
            placeholder={t('OrdersView.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className='w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm'
          />
        </div>
      </div>

      {/* Responsive Table Container */}
      <div className='flex-1 overflow-hidden px-2 sm:px-4 flex flex-col'>
        <div className='border rounded-lg overflow-hidden flex-1 flex flex-col bg-background'>
          <div className='overflow-x-auto flex-1'>
            <table className='w-full text-sm min-w-[700px]'>
              <thead className='bg-muted/50 sticky top-0 backdrop-blur-sm z-10'>
                <tr>
                  <th className='text-left font-medium p-3 whitespace-nowrap'>
                    {t('OrdersView.colOrder')}
                  </th>
                  <th className='text-left font-medium p-3 whitespace-nowrap'>
                    {t('OrdersView.colDate')}
                  </th>
                  <th className='text-left font-medium p-3 whitespace-nowrap'>
                    {t('OrdersView.colPayment')}
                  </th>
                  <th className='text-right font-medium p-3 whitespace-nowrap'>
                    {t('OrdersView.colSubtotal')}
                  </th>
                  <th className='text-center font-medium p-3 whitespace-nowrap'>
                    {t('OrdersView.colActions')}
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {paginatedOrders.length > 0 ? (
                  paginatedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className='hover:bg-accent transition-colors'
                    >
                      <td className='p-3 font-medium text-primary whitespace-nowrap'>
                        #{order.document_number}
                      </td>
                      <td className='p-3 text-muted-foreground whitespace-nowrap'>
                        {formatDate(order.orders_date?.seconds)}
                      </td>
                      <td className='p-3 whitespace-nowrap'>
                        {order.payment_type?.payment_name ?? 'N/A'}
                      </td>
                      <td className='p-3 text-right font-semibold whitespace-nowrap'>
                        {formatRupiah(order.subtotal ?? order.total_amount)}
                      </td>
                      <td className='p-3 text-center'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => setSelectedOrder(order)}
                        >
                          {t('OrdersView.viewDetails')}
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className='text-center p-6 text-muted-foreground'
                    >
                      {t('OrdersView.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <footer className='p-4 border-t flex items-center justify-between bg-card z-10'>
          <span className='text-xs sm:text-sm text-muted-foreground'>
            {t('Pagination.pageOf', { currentPage, totalPages })}
          </span>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              {t('Pagination.previous')}
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              {t('Pagination.next')}
            </Button>
          </div>
        </footer>
      )}

      {/* Modal Detail */}
      {selectedOrder && (
        <>
          <PrintableReceipt
            order={selectedOrder}
            products={products}
            taxAmount={taxAmount}
            discountAmount={discountAmount}
            processingFee={processingFee}
            paymentMethodName={paymentMethodName}
            grandTotal={grandTotal}
            paperWidth='58mm'
          />

          <Dialog
            open={!!selectedOrder}
            onOpenChange={(open) => !open && setSelectedOrder(null)}
          >
            <DialogContent className='w-[95vw] max-w-3xl max-h-[85vh] flex flex-col bg-card text-foreground print:hidden p-0 overflow-hidden rounded-lg'>
              <DialogHeader className='p-4 sm:p-6 pb-2 border-b'>
                <DialogTitle className='text-lg sm:text-xl'>
                  {t('OrdersView.modal.title', {
                    orderNumber: selectedOrder.document_number,
                  })}
                </DialogTitle>
              </DialogHeader>

              <div className='flex-1 overflow-y-auto p-4 sm:p-6 space-y-4'>
                {/* Order Details Table */}
                <div className='border rounded-lg p-3 sm:p-4 bg-muted shadow-sm'>
                  <table className='w-full text-xs sm:text-sm'>
                    <tbody>
                      <tr>
                        <td className='font-medium pr-2 py-1 text-muted-foreground w-1/3'>
                          {t('OrdersView.modal.id')}
                        </td>
                        <td>{selectedOrder.id}</td>
                      </tr>
                      <tr>
                        <td className='font-medium pr-2 py-1 text-muted-foreground'>
                          {t('OrdersView.modal.date')}
                        </td>
                        <td>
                          {formatDate(selectedOrder.orders_date?.seconds)}
                        </td>
                      </tr>
                      <tr>
                        <td className='font-medium pr-2 py-1 text-muted-foreground'>
                          {t('OrdersView.modal.subtotal')}
                        </td>
                        <td>{formatRupiah(selectedOrder.subtotal)}</td>
                      </tr>
                      <tr>
                        <td className='font-medium pr-2 py-1 text-muted-foreground'>
                          {t('Aside.totals.tax')}
                        </td>
                        <td>{formatRupiah(taxAmount)}</td>
                      </tr>
                      <tr>
                        <td className='font-medium pr-2 py-1 text-muted-foreground'>
                          {t('Aside.totals.discount')}
                        </td>
                        <td>- {formatRupiah(discountAmount)}</td>
                      </tr>
                      {processingFee > 0 && (
                        <tr>
                          <td className='font-medium pr-2 py-1 text-muted-foreground'>
                            {t('Aside.paymentSheet.serviceFee', {
                              paymentName: paymentMethodName,
                            })}
                          </td>
                          <td>{formatRupiah(processingFee)}</td>
                        </tr>
                      )}
                      <tr className='border-t border-dashed border-foreground/20'>
                        <td className='font-bold pr-2 py-2'>
                          {t('OrdersView.modal.total')}
                        </td>
                        <td className='font-bold py-2'>
                          {formatRupiah(grandTotal)}
                        </td>
                      </tr>
                      <tr>
                        <td className='font-medium pr-2 py-1 text-muted-foreground'>
                          {t('OrdersView.modal.paymentMethod')}
                        </td>
                        <td>
                          {selectedOrder.payment_type?.payment_name ?? '-'}
                        </td>
                      </tr>
                      {selectedOrder.notes && (
                        <tr>
                          <td className='font-medium pr-2 py-1 text-muted-foreground'>
                            {t('OrdersView.modal.notes')}
                          </td>
                          <td>{selectedOrder.notes}</td>
                        </tr>
                      )}
                      {selectedOrder.additional_info && (
                        <tr>
                          <td className='font-medium pr-2 py-1 text-muted-foreground'>
                            {t('OrdersView.modal.additionalInfo')}
                          </td>
                          <td>{selectedOrder.additional_info}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Items Table */}
                <div className='border rounded-lg bg-muted shadow-sm overflow-hidden'>
                  <div className='font-semibold text-sm px-3 py-2 bg-muted/50 border-b'>
                    {t('OrdersView.modal.itemsTitle')}
                  </div>
                  <div className='overflow-x-auto'>
                    <table className='w-full text-xs sm:text-sm min-w-[300px]'>
                      <thead>
                        <tr className='bg-muted/50'>
                          <th className='border-b px-3 py-2 text-left font-medium'>
                            {t('OrdersView.modal.itemProduct')}
                          </th>
                          <th className='border-b px-3 py-2 text-center font-medium w-[60px]'>
                            {t('OrdersView.modal.itemQty')}
                          </th>
                          <th className='border-b px-3 py-2 text-right font-medium'>
                            {t('OrdersView.modal.itemTotal')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.order_items.map((item, idx) => {
                          const productName =
                            item.product?.product_name ??
                            item.product_name ??
                            item.product_code ??
                            'Unknown';
                          const quantity = item.quantity ?? item.qty ?? 0;
                          const total = Number(
                            item.line_total ?? item.total_price ?? 0
                          );
                          return (
                            <tr key={item.id ?? idx}>
                              <td className='border-b px-3 py-2'>
                                {productName}
                              </td>
                              <td className='border-b px-3 py-2 text-center'>
                                {quantity}
                              </td>
                              <td className='border-b px-3 py-2 text-right whitespace-nowrap'>
                                {formatRupiah(total)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <DialogFooter className='p-4 border-t gap-2 sm:gap-2 flex-col sm:flex-row'>
                <div className='flex gap-2 w-full sm:w-auto'>
                  <Dialog
                    open={isReturnDialogOpen}
                    onOpenChange={setIsReturnDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant='destructive'
                        disabled={busy}
                        className='flex-1 sm:flex-none'
                      >
                        {busy
                          ? t('OrdersView.modal.processing')
                          : t('OrdersView.modal.return')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {t('OrdersView.modal.returnTitle')}
                        </DialogTitle>
                        <DialogDescription className='py-4 text-base text-center'>
                          {t('OrdersView.modal.returnConfirm', {
                            orderNumber: selectedOrder.document_number,
                          })}
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className='gap-2 sm:space-x-2'>
                        <DialogClose asChild>
                          <Button variant='outline'>
                            {t('OrdersView.modal.returnCancel')}
                          </Button>
                        </DialogClose>
                        <Button
                          variant='destructive'
                          onClick={handleReturnOrder}
                          disabled={busy}
                        >
                          {busy
                            ? t('OrdersView.modal.processing')
                            : t('OrdersView.modal.returnYes')}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant='outline'
                    onClick={handlePrintReceipt}
                    className='flex-1 sm:flex-none'
                  >
                    {t('OrdersView.modal.print')}
                  </Button>
                </div>
                <Button
                  variant='outline'
                  onClick={() => setSelectedOrder(null)}
                  className='w-full sm:w-auto'
                >
                  {t('OrdersView.modal.close')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
