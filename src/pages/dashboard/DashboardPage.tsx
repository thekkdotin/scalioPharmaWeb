import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'
import { useAuthStore } from '@/store/useAuthStore'
import { StatCard } from '@/components/shared/StatCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency, formatDate, daysUntilExpiry, expiryBadgeClass } from '@/lib/utils'
import {
  TrendingUp, Package, AlertTriangle, Users,
  ShoppingCart, Calendar, IndianRupee, Activity,
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function DashboardPage() {
  const tenantId = useAuthStore((s) => s.tenantId())!

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', tenantId],
    queryFn: () => dashboardApi.get(tenantId),
    refetchInterval: 60_000,
  })

  if (isLoading || !data) return <PageLoader />

  const d = data

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Today, ${formatDate(new Date().toISOString())}`} />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Today's Revenue"     value={formatCurrency(d.todaySalesAmount)}  icon={IndianRupee}   color="green"  />
        <StatCard title="Today's Sales"       value={d.todaySalesCount}                   icon={ShoppingCart}  color="blue"   />
        <StatCard title="Month Revenue"       value={formatCurrency(d.monthSalesAmount)}  icon={TrendingUp}    color="purple" />
        <StatCard title="Total Medicines"     value={d.totalMedicines}                  icon={Package}       color="blue"   />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Low Stock Alerts"    value={d.lowStockCount}   icon={AlertTriangle} color="amber" subtitle="Need reorder" />
        <StatCard title="Near Expiry (90d)"   value={d.nearExpiryCount} icon={Calendar}      color="red"   subtitle="Check batches" />
        <StatCard title="Outstanding Dues"    value={formatCurrency(d.outstandingDueAmount ?? 0)} icon={IndianRupee} color="amber" subtitle={`${d.outstandingDueCount ?? 0} credit sale${(d.outstandingDueCount ?? 0) === 1 ? '' : 's'}`} />
        <StatCard title="Active Staff"        value={d.activeUsers ?? 0} icon={Users}         color="blue"  />
      </div>

      {/* Low stock & recent sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Near expiry batches */}
        {d.nearExpiryItems?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Near Expiry Batches
              </h3>
              <Link to="/medicines" className="text-xs text-pharma-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {d.nearExpiryItems.slice(0, 6).map((item: any) => (
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
    </div>
  )
}
