import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'
import { medicinesApi } from '@/api/medicines'
import { useAuthStore } from '@/store/useAuthStore'
import { StatCard } from '@/components/shared/StatCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency, formatDate, daysUntilExpiry, expiryBadgeClass } from '@/lib/utils'
import {
  TrendingUp, Package, AlertTriangle, Users,
  ShoppingCart, Calendar, IndianRupee, Activity, X, Undo2, Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import type { NearExpiryItem } from '@/types'

type ExpiryDialogMode = 'near' | 'expired'

export default function DashboardPage() {
  const tenantId = useAuthStore((s) => s.tenantId())!
  const queryClient = useQueryClient()
  const [expiryDialog, setExpiryDialog] = useState<ExpiryDialogMode | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', tenantId],
    queryFn: () => dashboardApi.get(tenantId),
    refetchInterval: 60_000,
  })

  const expiredActionMutation = useMutation({
    mutationFn: ({ item, action }: { item: NearExpiryItem; action: 'RETURN_TO_SELLER' | 'DISPOSE' }) =>
      medicinesApi.resolveExpiredStock(tenantId, item.medicineId, item.batchId, action),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard', tenantId] })
      await queryClient.invalidateQueries({ queryKey: ['medicines', tenantId] })
      toast.success(vars.action === 'RETURN_TO_SELLER' ? 'Marked as returned to seller' : 'Marked as disposed')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update expired stock'),
  })

  if (isLoading || !data) return <PageLoader />

  const d = data
  const nearExpiryItems = d.nearExpiryItems ?? []
  const expiredStockItems = d.expiredStockItems ?? []
  const dialogItems = expiryDialog === 'expired' ? expiredStockItems : nearExpiryItems
  const dialogTitle = expiryDialog === 'expired' ? 'Expired Stock' : 'Near Expiry Medicines'

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Today, ${formatDate(new Date().toISOString())}`} />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Today's Revenue"     value={formatCurrency(d.todaySalesAmount)}  icon={IndianRupee}   color="green"  />
        <StatCard title="Today's Sales"       value={d.todaySalesCount}                   icon={ShoppingCart}  color="blue"   />
        <StatCard title="Month Revenue"       value={formatCurrency(d.monthSalesAmount)}  icon={TrendingUp}    color="purple" />
        <StatCard title="Invested Amount"    value={formatCurrency(d.currentStockInvestment ?? 0)} icon={Package} color="amber" subtitle="Current live stock" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard title="Total Medicines"     value={d.totalMedicines} icon={Package} color="blue" />
        <StatCard title="Low Stock Alerts"    value={d.lowStockCount}   icon={AlertTriangle} color="amber" subtitle="Need reorder" />
        <StatCard
          title="Near Expiry (90d)"
          value={d.nearExpiryCount}
          icon={Calendar}
          color="red"
          subtitle="Click to view"
          onClick={() => setExpiryDialog('near')}
        />
        <StatCard
          title="Expired Stock"
          value={d.expiredStockCount}
          icon={AlertTriangle}
          color="red"
          subtitle="Return or dispose"
          onClick={() => setExpiryDialog('expired')}
        />
        <StatCard title="Outstanding Dues"    value={formatCurrency(d.outstandingDueAmount ?? 0)} icon={IndianRupee} color="amber" subtitle={`${d.outstandingDueCount ?? 0} credit sale${(d.outstandingDueCount ?? 0) === 1 ? '' : 's'}`} />
        <StatCard title="Active Staff"        value={d.activeUsers ?? 0} icon={Users}         color="blue"  />
      </div>

      {/* Low stock & recent sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Near expiry batches */}
        {nearExpiryItems.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Near Expiry Batches
              </h3>
              <button type="button" onClick={() => setExpiryDialog('near')} className="text-xs text-pharma-600 hover:underline">View all</button>
            </div>
            <div className="divide-y divide-gray-50">
              {nearExpiryItems.slice(0, 6).map((item) => (
                <div key={item.batchId} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{item.medicineName}</p>
                    <p className="text-xs text-gray-400">Batch: {item.batchNumber}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${expiryBadgeClass(item.expiryDate)}`}>
                      {daysUntilExpiry(item.expiryDate)}d left
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">Qty: {item.remainingQuantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent sales */}
        {d.recentSales?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-pharma-500" /> Recent Sales
              </h3>
              <Link to="/sales" className="text-xs text-pharma-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {d.recentSales.slice(0, 6).map((sale: any) => (
                <div key={sale.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{sale.invoiceNumber}</p>
                    <p className="text-xs text-gray-400">{sale.patientName || 'Walk-in'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">{formatCurrency(sale.totalAmount)}</p>
                    <p className="text-xs text-gray-400">{formatDate(sale.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {expiryDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setExpiryDialog(null)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{dialogTitle}</h2>
                <p className="text-xs text-gray-400">{dialogItems.length} batch{dialogItems.length === 1 ? '' : 'es'} with remaining stock</p>
              </div>
              <button type="button" onClick={() => setExpiryDialog(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {dialogItems.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-400">No batches found.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {dialogItems.map((item) => {
                    const days = daysUntilExpiry(item.expiryDate)
                    const isExpired = days < 0
                    const busy = expiredActionMutation.isPending && expiredActionMutation.variables?.item.batchId === item.batchId

                    return (
                      <div key={item.batchId} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-800">{item.medicineName}</p>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${expiryBadgeClass(item.expiryDate)}`}>
                              {isExpired ? `${Math.abs(days)}d expired` : `${days}d left`}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Batch: <span className="font-mono">{item.batchNumber}</span>
                            <span className="mx-2 text-gray-300">|</span>
                            Exp: {formatDate(item.expiryDate)}
                            <span className="mx-2 text-gray-300">|</span>
                            Qty: {item.remainingQuantity}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                          <Link to={`/medicines`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                            Open Medicine
                          </Link>
                          {expiryDialog === 'expired' && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => expiredActionMutation.mutate({ item, action: 'RETURN_TO_SELLER' })}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                              >
                                <Undo2 className="h-4 w-4" /> Return
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => expiredActionMutation.mutate({ item, action: 'DISPOSE' })}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" /> Dispose
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
