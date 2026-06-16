import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { purchasesApi, suppliersApi } from '@/api/purchases'
import { useAuthStore } from '@/store/useAuthStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Badge, Button } from '@/components/shared/PageHeader'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Purchase, Supplier } from '@/types'

const blank = () => ({
  supplierId: '',
  invoiceNumber: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  totalAmount: '',
  notes: '',
  paymentStatus: 'PENDING',
})

export default function PurchasesPage() {
  const tenantId = useAuthStore((s) => s.tenantId())!
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(blank())

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', tenantId, page],
    queryFn: () => purchasesApi.list(tenantId, { page, size: 20 }),
    placeholderData: (prev) => prev,
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-all', tenantId],
    queryFn: () => suppliersApi.list(tenantId, { size: 100 }),
  })

  const createMutation = useMutation({
    mutationFn: () => purchasesApi.create(tenantId, {
      supplierId: form.supplierId || undefined,
      invoiceNumber: form.invoiceNumber,
      invoiceDate: form.invoiceDate,
      totalAmount: parseFloat(form.totalAmount) || 0,
      notes: form.notes,
      paymentStatus: form.paymentStatus,
      items: [],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', tenantId] })
      toast.success('Purchase recorded!')
      setShowForm(false)
      setForm(blank())
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  })

  return (
    <div>
      <PageHeader
        title="Purchases"
        subtitle={`${data?.totalElements ?? 0} purchase entries`}
        action={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> New Purchase</Button>}
      />

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="font-bold text-lg">Record Purchase</h2>
                <p className="text-xs text-gray-400 mt-0.5">Track medicine expense from a supplier</p>
              </div>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier <span className="text-gray-400 font-normal">(optional)</span></label>
                <select value={form.supplierId} onChange={(e) => set('supplierId', e.target.value)} className={ic}>
                  <option value="">Select supplier</option>
                  {suppliers?.content?.map((s: Supplier) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice No.</label>
                  <input value={form.invoiceNumber} onChange={(e) => set('invoiceNumber', e.target.value)} className={ic} placeholder="INV/001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={form.invoiceDate} onChange={(e) => set('invoiceDate', e.target.value)} className={ic} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount ? <span className="text-red-400">*</span></label>
                  <input type="number" min={0} step="0.01" value={form.totalAmount} onChange={(e) => set('totalAmount', e.target.value)} className={ic} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment</label>
                  <select value={form.paymentStatus} onChange={(e) => set('paymentStatus', e.target.value)} className={ic}>
                    <option value="PENDING">Pending</option>
                    <option value="PAID">Paid</option>
                    <option value="PARTIAL">Partial</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} className={ic + ' resize-none'} rows={2} placeholder="e.g. 50 strips Paracetamol, 20 bottles Cough syrup..." />
              </div>
              <div className="flex gap-3 pt-1">
                <Button disabled={!form.totalAmount || createMutation.isPending} onClick={() => createMutation.mutate()}>
                  {createMutation.isPending ? 'Saving...' : 'Save Purchase'}
                </Button>
                <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? <PageLoader /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Date', 'Invoice No.', 'Supplier', 'Amount', 'Payment', 'Notes'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.content?.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No purchases yet. Click <b>New Purchase</b> to record one.</td></tr>
                  )}
                  {data?.content?.map((p: Purchase) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(p.invoiceDate)}</td>
                      <td className="px-4 py-3 font-medium text-pharma-700">{p.invoiceNumber || <span className="text-gray-300">-</span>}</td>
                      <td className="px-4 py-3 text-gray-600">{(p as any).supplierName || <span className="text-gray-300">-</span>}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(p.netAmount)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={p.paymentStatus === 'PAID' ? 'success' : p.paymentStatus === 'PENDING' ? 'warning' : 'info'}>
                          {p.paymentStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{(p as any).notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    </div>
  )
}

const ic = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500 bg-white'
