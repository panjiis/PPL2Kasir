'use client'

import { useState, useMemo } from "react"
import { useSession } from "../lib/context/session"
import type { PaymentType } from "@/app/lib/types/pos"
import { AlertTriangle, Loader2, Search } from "lucide-react"
// import { fetchPaymentTypes } from "@/app/lib/utils/pos-api" // Dihapus
import { usePaymentTypes } from "@/app/Hooks/usePaymentTypes" // FIX: Menggunakan hook

export default function PaymentTypesView() {
  const { session } = useSession()
  const [searchTerm, setSearchTerm] = useState<string>("")

  // FIX: Menggunakan usePaymentTypes hook (Perbaikan 3)
  const { 
    data: rawPaymentTypes = [], 
    isLoading: loading, 
    error 
  } = usePaymentTypes(session?.token ?? '');
  
  // useEffect untuk fetching data dihapus

  const paymentTypes = useMemo(() => {
    // Normalisasi untuk memastikan semua field ada
    return (rawPaymentTypes as PaymentType[]).map(
      (p): PaymentType => ({
        id: p.id,
        payment_name: p.payment_name ?? "Unnamed",
        processing_fee_rate: p.processing_fee_rate ?? "0%",
        is_active: Boolean(p.is_active),
      }),
    )
  }, [rawPaymentTypes]);


  const filteredPayments = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return paymentTypes.filter(
      (pt) => pt.payment_name.toLowerCase().includes(term) || pt.processing_fee_rate.toLowerCase().includes(term),
    )
  }, [searchTerm, paymentTypes])

  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : 'An unknown error occurred.'
    : null;


  if (loading)
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading Payment Types...</span>
      </div>
    )

  if (errorMessage)
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive">
        <AlertTriangle className="h-10 w-10 mb-2" />
        <span className="font-semibold">Failed to load data</span>
        <p className="text-sm">{errorMessage}</p>
      </div>
    )

  return (
    <div className="h-full flex flex-col p-1">
      <header className="p-3">
        <h1 className="text-2xl font-bold text-foreground">Payment Types</h1>
        <p className="text-muted-foreground">View and manage available payment methods.</p>
      </header>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by payment name or rate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left font-medium p-3">Name</th>
                <th className="text-left font-medium p-3">Processing Fee</th>
                <th className="text-left font-medium p-3">Status</th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((pt) => (
                  <tr key={pt.id ?? pt.payment_name} className="border-t hover:bg-accent/30 transition-colors">
                    <td className="p-3 font-medium">{pt.payment_name}</td>
                    <td className="p-3 text-muted-foreground">{pt.processing_fee_rate}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          pt.is_active ? "bg-green-200 text-green-800" : "bg-gray-300 text-gray-700"
                        }`}
                      >
                        {pt.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center p-6 text-muted-foreground">
                    No payment types found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}