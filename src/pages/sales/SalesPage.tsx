import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi } from '@/api/sales'
import { useAuthStore } from '@/store/useAuthStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Badge, Button } from '@/components/shared/PageHeader'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Sale, PaymentMode } from '@/types'

export default function SalesPage() {
  const tenantId = useAuthStore((s) => s.tenantId())!
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<Sale | null>(null)
  // Record-payment form state
  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode] = useState<PaymentMode>('CASH')

  const { data, isLoading } = useQuery({
    queryKey: ['sales', tenantId, search, page, from, to],
    queryFn: () => salesApi.list(tenantId, { page, size: 20, from: from || undefined, to: to || undefined }),
    placeholderData: (prev) => prev,
  })

  // Payment history for the open sale
  const { data: payments } = useQuery({
    queryKey: ['sale-payments', tenantId, selected?.id],
    queryFn: () => salesApi.getPayments(tenantId, selected!.id),
    enabled: !!selected,
  })

  const paymentMutation = useMutation({
    mutationFn: ({ amount, mode }: { amount: number; mode: PaymentMode }) =>
      salesApi.recordPayment(tenantId, selected!.id, amount, mode),
    onSuccess: (updated) => {
      setSelected(updated)
      setPayAmount('')
      toast.success('Payment recorded')
      queryClient.invalidateQueries({ queryKey: ['sales', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['sale-payments', tenantId, updated.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', tenantId] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to record payment'),
  })

  const submitPayment = () => {
    const amt = parseFloat(payAmount)
    if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return }
    if (selected && amt > selected.balanceDue) { toast.error(`Max is ${formatCurrency(selected.balanceDue)}`); return }
    paymentMutation.mutate({ amount: amt, mode: payMode })
  }

  const statusVariant = (s: string) => {
    if (s === 'COMPLETED') return 'success'
    if (s === 'CANCELLED') return 'danger'
    if (s === 'FULLY_RETURNED') return 'danger'
    if (s === 'PARTIAL_RETURN') return 'warning'
    return 'default'
  }

  const payStatusVariant = (s: string) =>
    s === 'PAID' ? 'success' : s === 'PARTIAL' ? 'warning' : 'danger'

  return (
    <div>
      <PageHeader title="Sales" subtitle={`${data?.totalElements ?? 0} total sales`} />

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder="Invoice / patient..." className="flex-1 min-w-40" />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? <PageLoader /> : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Invoice', 'Patient', 'Date', 'Payment', 'Discount', 'Total', 'Status', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.content?.map((sale: Sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-pharma-700">{sale.invoiceNumber}</td>
                      <td className="px-4 py-3 text-gray-600">{sale.patientName || 'Walk-in'}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(sale.createdAt)}</td>
                      <td className="px-4 py-3"><Badge>{sale.paymentMode}</Badge></td>
                      <td className="px-4 py-3 text-green-600">
                        {sale.discountAmount > 0 ? `- ${formatCurrency(sale.discountAmount)}` : '-'}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatCurrency(sale.totalAmount)}
                        {sale.balanceDue > 0 && (
                          <span className="block text-xs font-normal text-amber-600">Due {formatCurrency(sale.balanceDue)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(sale.status)}>{sale.status.replace('_', ' ')}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelected(sale)} className="text-pharma-500 hover:text-pharma-700">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-50">
              {data?.content?.map((sale: Sale) => (
                <div key={sale.id} className="px-4 py-3 flex items-center justify-between" onClick={() => setSelected(sale)}>
                  <div>
                    <p className="text-sm font-semibold text-pharma-700">{sale.invoiceNumber}</p>
                    <p className="text-xs text-gray-500">{sale.patientName || 'Walk-in'} • {formatDate(sale.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(sale.totalAmount)}</p>
                    <Badge variant={statusVariant(sale.status)}>{sale.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              ))}
            </div>

            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-gray-500">Page {page + 1} of {data.totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Prev</Button>
                  <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages - 1}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sale detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">{selected.invoiceNumber}</p>
                <p className="text-xs text-gray-400">{formatDate(selected.createdAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={statusVariant(selected.status)}>{selected.status}</Badge>
                <Badge variant={payStatusVariant(selected.paymentStatus)}>{selected.paymentStatus}</Badge>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {selected.patientName && <p className="text-sm text-gray-600">Patient: <strong>{selected.patientName}</strong></p>}
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-400 uppercase border-b">
                  <th className="pb-2 text-left">Medicine</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr></thead>
                <tbody>
                  {selected.items?.map((item: any) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-2">{item.medicineName}</td>
                      <td className="py-2 text-right text-gray-500">{item.quantity}</td>
                      <td className="py-2 text-right">{formatCurrency(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1.5 text-sm pt-2">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(selected.subtotal)}</span></div>
                {selected.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600"><span>Discount</span><span>- {formatCurrency(selected.discountAmount)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-gray-500">GST</span><span>{formatCurrency(selected.taxAmount)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{formatCurrency(selected.totalAmount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Paid ({selected.paymentMode})</span><span>{formatCurrency(selected.amountPaid)}</span></div>
                {selected.balanceDue > 0 && (
                  <div className="flex justify-between font-semibold text-amber-600"><span>Balance Due</span><span>{formatCurrency(selected.balanceDue)}</span></div>
                )}
              </div>

              {/* Record a repayment against an outstanding balance */}
              {selected.balanceDue > 0 && selected.status !== 'CANCELLED' && (
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Record Payment</p>
                  <div className="flex gap-2">
                    <input
                      type="number" min={0.01} step="0.01" max={selected.balanceDue}
                      value={payAmount} placeholder={`Max ${formatCurrency(selected.balanceDue)}`}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500"
                    />
                    <select
                      value={payMode} onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                      className="px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500"
                    >
                      {(['CASH', 'UPI', 'CARD'] as PaymentMode[]).map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <Button size="sm" onClick={submitPayment} disabled={paymentMutation.isPending}>
                      {paymentMutation.isPending ? '...' : 'Pay'}
                    </Button>
                  </div>
                  <button
                    onClick={() => { setPayAmount(String(selected.balanceDue)); }}
                    className="text-xs text-pharma-600 hover:underline"
                  >Pay full balance</button>
                </div>
              )}

              {/* Payment history */}
              {(payments?.length ?? 0) > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Payment History</p>
                  <div className="space-y-1.5">
                    {payments!.map((p) => (
                      <div key={p.id} className="flex justify-between text-xs text-gray-600">
                        <span>{formatDateTime(p.paidAt)} · {p.paymentMode}</span>
                        <span className="font-medium text-green-600">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
