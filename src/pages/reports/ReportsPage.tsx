import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { salesApi } from '@/api/sales'
import { apiClient, tenantPath } from '@/api/client'
import { useAuthStore } from '@/store/useAuthStore'
import { PageHeader, Button } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency, formatDate, formatStripStock, getStockUnitLabels } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  IndianRupee, ShoppingCart, TrendingUp, Award, Layers,
  ChevronDown, ChevronRight, Banknote, Smartphone, CreditCard, BarChart2, Wallet, X,
} from 'lucide-react'
import type { ApiResponse, MedicineInventoryItem, DailyRow, SaleRow, OutstandingDue, PaymentMode, TenantSettings, HistoricalDailySale } from '@/types'

type TabKey = 'daily' | 'monthly' | 'trend' | 'top' | 'inventory' | 'dues'

function profitColor(pct: number) {
  if (pct >= 20) return 'text-green-600'
  if (pct >= 10) return 'text-amber-500'
  return 'text-red-500'
}

function ProfitBadge({ pct }: { pct: number }) {
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${profitColor(pct)} bg-gray-50`}>
      {Number(pct).toFixed(1)}%
    </span>
  )
}

function formatStockQuantity(quantity: number, tabletsPerStrip?: number, showBoth = false, context?: { category?: string; unit?: string }) {
  return formatStripStock(quantity, tabletsPerStrip, showBoth, context)
}

export default function ReportsPage() {
  const tenantId = useAuthStore((s) => s.tenantId())!
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  // Record-payment modal (launched from the Dues tab)
  const [payTarget, setPayTarget] = useState<OutstandingDue | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode] = useState<PaymentMode>('CASH')
  const now = new Date()
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [tab, setTab] = useState<TabKey>('daily')
  const [expandedMed, setExpandedMed] = useState<string | null>(null)

  // Profit trend date range â€” default: current month
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const [trendFrom, setTrendFrom] = useState(defaultFrom)
  const [trendTo, setTrendTo] = useState(today)
  const [historyForm, setHistoryForm] = useState<Partial<HistoricalDailySale>>({
    saleDate: today, revenue: 0, profit: 0,
  })

  const { data: daily, isLoading: dl } = useQuery({
    queryKey: ['report-daily', tenantId, selectedDate],
    queryFn: () => reportsApi.daily(tenantId, selectedDate),
    enabled: tab === 'daily',
  })

  const { data: monthly, isLoading: ml } = useQuery({
    queryKey: ['report-monthly', tenantId, selectedYear, selectedMonth],
    queryFn: () => reportsApi.monthly(tenantId, selectedYear, selectedMonth),
    enabled: tab === 'monthly',
  })

  const { data: trend, isLoading: tl } = useQuery({
    queryKey: ['report-trend', tenantId, trendFrom, trendTo],
    queryFn: () => reportsApi.range(tenantId, trendFrom, trendTo),
    enabled: tab === 'trend',
  })

  const fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const { data: best, isLoading: bl } = useQuery({
    queryKey: ['report-best', tenantId, fromDate, today],
    queryFn: () => reportsApi.bestSelling(tenantId, fromDate, today, 10),
    enabled: tab === 'top',
  })

  const { data: inventory, isLoading: invl } = useQuery({
    queryKey: ['report-inventory', tenantId],
    queryFn: () => reportsApi.inventory(tenantId),
    enabled: tab === 'inventory',
  })

  const { data: settings } = useQuery({
    queryKey: ['settings', tenantId],
    queryFn: () => apiClient.get<ApiResponse<TenantSettings>>(`${tenantPath(tenantId)}/settings`).then(r => r.data.data),
    staleTime: 60_000,
  })

  const historicalOnboardingOpen =
    (settings?.firstTimeSetupEnabled ?? true) &&
    !(settings?.inventoryOnboardingCompleted ?? false) &&
    (settings?.inventoryOnboardingMode ?? 'CURRENT_STOCK') === 'FULL_HISTORY'

  const { data: historicalRows = [] } = useQuery({
    queryKey: ['historical-daily-sales', tenantId, trendFrom, trendTo],
    queryFn: () => reportsApi.historicalDailySales(tenantId, trendFrom, trendTo),
    enabled: tab === 'trend' && historicalOnboardingOpen,
  })

  const { data: dues, isLoading: dul } = useQuery({
    queryKey: ['report-dues', tenantId],
    queryFn: () => reportsApi.outstandingDues(tenantId),
    enabled: tab === 'dues',
  })

  const payMutation = useMutation({
    mutationFn: ({ saleId, amount, mode }: { saleId: string; amount: number; mode: PaymentMode }) =>
      salesApi.recordPayment(tenantId, saleId, amount, mode),
    onSuccess: () => {
      toast.success('Payment recorded')
      setPayTarget(null); setPayAmount('')
      queryClient.invalidateQueries({ queryKey: ['report-dues', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['sales', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', tenantId] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to record payment'),
  })

  const saveHistory = useMutation({
    mutationFn: () => reportsApi.saveHistoricalDailySale(tenantId, historyForm),
    onSuccess: () => {
      toast.success('Old sales row saved')
      queryClient.invalidateQueries({ queryKey: ['report-trend', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['report-daily', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['report-monthly', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['historical-daily-sales', tenantId] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save old sales row'),
  })

  const deleteHistory = useMutation({
    mutationFn: (date: string) => reportsApi.deleteHistoricalDailySale(tenantId, date),
    onSuccess: () => {
      toast.success('Old sales row deleted')
      queryClient.invalidateQueries({ queryKey: ['report-trend', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['historical-daily-sales', tenantId] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete old sales row'),
  })

  const openPay = (d: OutstandingDue) => {
    setPayTarget(d); setPayAmount(String(d.balanceDue)); setPayMode('CASH')
  }
  const submitPay = () => {
    const amt = parseFloat(payAmount)
    if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return }
    if (payTarget && amt > payTarget.balanceDue) { toast.error(`Max is ${formatCurrency(payTarget.balanceDue)}`); return }
    if (payTarget) payMutation.mutate({ saleId: payTarget.saleId, amount: amt, mode: payMode })
  }

  const setHistoryNumber = (key: keyof HistoricalDailySale, value: string) => {
    const amount = Number(value)
    const nextAmount = Number.isFinite(amount) ? amount : 0
    setHistoryForm(f => {
      const next = { ...f, [key]: nextAmount }
      if (key === 'revenue' || key === 'profit') {
        next.salesValue = Number(next.revenue ?? 0)
        next.cost = Number(next.revenue ?? 0) - Number(next.profit ?? 0)
        next.purchaseValue = next.cost
      }
      return next
    })
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'daily',     label: 'Daily' },
    { key: 'monthly',   label: 'Monthly' },
    { key: 'trend',     label: 'Profit Trend' },
    { key: 'top',       label: 'Top Medicines' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'dues',      label: 'Dues' },
  ]

  return (
    <div>
      <PageHeader title="Reports" subtitle="Sales analytics, profit tracking and inventory" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-100 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${
              tab === t.key ? 'border-pharma-600 text-pharma-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* â”€â”€ DAILY â”€â”€ */}
      {tab === 'daily' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600">Date:</label>
            <input type="date" value={selectedDate} max={today}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500" />
          </div>
          {dl ? <PageLoader /> : daily && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Revenue"     value={formatCurrency(daily.totalRevenue)}  icon={IndianRupee}  color="green"  />
                <StatCard title="Cost"        value={formatCurrency(daily.totalCost ?? 0)} icon={TrendingUp}   color="amber"  />
                <StatCard title="Net Profit"  value={formatCurrency(daily.totalProfit)}   icon={TrendingUp}   color="purple" />
                <StatCard title="Profit %"    value={`${Number(daily.profitPct ?? 0).toFixed(1)}%`} icon={BarChart2} color="blue" />
              </div>
              {/* Payment breakdown */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Cash',   val: daily.cashAmount,   icon: Banknote,    color: 'text-green-600' },
                  { label: 'UPI',    val: daily.upiAmount,    icon: Smartphone,  color: 'text-blue-600'  },
                  { label: 'Card',   val: daily.cardAmount,   icon: CreditCard,  color: 'text-purple-600'},
                  { label: 'Sales',  val: daily.totalSales,   icon: ShoppingCart,color: 'text-gray-600'  },
                ].map(({ label, val, icon: Icon, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <div>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className={`font-bold text-sm ${color}`}>
                        {label === 'Sales' ? val : formatCurrency(val as number)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Transactions with profit */}
              {(daily.sales?.length ?? 0) > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-700">Transactions</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {['Invoice','Patient','Payment','Total','Profit','Profit %'].map(h => (
                            <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {daily.sales?.map((s: SaleRow) => {
                          const pct = s.totalAmount > 0 ? (s.profit / s.totalAmount) * 100 : 0
                          return (
                            <tr key={s.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-pharma-700 font-medium">{s.invoiceNumber}</td>
                              <td className="px-4 py-2 text-gray-600">{s.patientName || 'Walk-in'}</td>
                              <td className="px-4 py-2 text-gray-500">{s.paymentMode}</td>
                              <td className="px-4 py-2 font-semibold">{formatCurrency(s.totalAmount)}</td>
                              <td className="px-4 py-2 text-green-600 font-medium">{formatCurrency(s.profit)}</td>
                              <td className="px-4 py-2"><ProfitBadge pct={pct} /></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ MONTHLY â”€â”€ */}
      {tab === 'monthly' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500">
              {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {ml ? <PageLoader /> : monthly && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Revenue"    value={formatCurrency(monthly.totalRevenue)}  icon={IndianRupee}  color="green"  />
                <StatCard title="Cost"       value={formatCurrency(monthly.totalCost ?? 0)} icon={TrendingUp}   color="amber"  />
                <StatCard title="Net Profit" value={formatCurrency(monthly.totalProfit)}   icon={TrendingUp}   color="purple" />
                <StatCard title="Profit %"   value={`${Number(monthly.profitPct ?? 0).toFixed(1)}%`} icon={BarChart2} color="blue" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Cash',    val: monthly.cashAmount,   icon: Banknote,     color: 'text-green-600' },
                  { label: 'UPI',     val: monthly.upiAmount,    icon: Smartphone,   color: 'text-blue-600'  },
                  { label: 'Card',    val: monthly.cardAmount,   icon: CreditCard,   color: 'text-purple-600'},
                  { label: 'Sales',   val: monthly.totalSales,   icon: ShoppingCart, color: 'text-gray-600'  },
                ].map(({ label, val, icon: Icon, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <div>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className={`font-bold text-sm ${color}`}>
                        {label === 'Sales' ? val : formatCurrency(val as number)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ PROFIT TREND â”€â”€ */}
      {tab === 'trend' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-600">From:</label>
            <input type="date" value={trendFrom} max={trendTo}
              onChange={(e) => setTrendFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500" />
            <label className="text-sm font-medium text-gray-600">To:</label>
            <input type="date" value={trendTo} min={trendFrom} max={today}
              onChange={(e) => setTrendTo(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500" />
          </div>

          {historicalOnboardingOpen && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-700">Old Daily Sales Entry</h3>
                <p className="text-xs text-gray-400">Enter date, total old sales revenue, and profit or loss for that day.</p>
              </div>
              <Button size="sm" onClick={() => saveHistory.mutate()} disabled={saveHistory.isPending || !historyForm.saleDate}>
                {saveHistory.isPending ? 'Saving...' : 'Save Row'}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="date" value={historyForm.saleDate || today} max={today}
                onChange={(e) => setHistoryForm(f => ({ ...f, saleDate: e.target.value }))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500" />
              <input type="number" min={0} step="0.01" value={historyForm.revenue ?? 0} placeholder="Old sales value"
                onChange={(e) => setHistoryNumber('revenue', e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500" />
              <input type="number" step="0.01" value={historyForm.profit ?? 0} placeholder="Profit / loss"
                onChange={(e) => setHistoryNumber('profit', e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500" />
            </div>
            {historicalRows.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {historicalRows.map(row => (
                  <button
                    key={row.saleDate}
                    type="button"
                    onClick={() => setHistoryForm(row)}
                    className="text-xs rounded-lg border border-gray-200 px-2 py-1 text-gray-600 hover:border-pharma-300"
                  >
                    {row.saleDate}: {formatCurrency(row.revenue)} / {formatCurrency(row.profit)}
                    <span
                      onClick={(e) => { e.stopPropagation(); deleteHistory.mutate(row.saleDate) }}
                      className="ml-2 text-red-500"
                    >
                      remove
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          {tl ? <PageLoader /> : trend && (
            <>
              {/* Totals across range */}
              {trend.length > 0 && (() => {
                const totRev  = trend.reduce((s, r) => s + Number(r.revenue), 0)
                const totCost = trend.reduce((s, r) => s + Number(r.cost), 0)
                const totProfit = trend.reduce((s, r) => s + Number(r.profit), 0)
                const pct = totRev > 0 ? (totProfit / totRev) * 100 : 0
                return (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Revenue" value={formatCurrency(totRev)}    icon={IndianRupee} color="green"  />
                    <StatCard title="Total Cost"    value={formatCurrency(totCost)}   icon={TrendingUp}  color="amber"  />
                    <StatCard title="Total Profit"  value={formatCurrency(totProfit)} icon={TrendingUp}  color="purple" />
                    <StatCard title="Avg Profit %"  value={`${pct.toFixed(1)}%`}      icon={BarChart2}   color="blue"   />
                  </div>
                )
              })()}

              {/* Per-day table */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-pharma-600" />
                  <h3 className="font-semibold text-gray-700">Daily Breakdown</h3>
                  <span className="ml-auto text-xs text-gray-400">{trend.length} days</span>
                </div>
                {trend.length === 0 ? (
                  <p className="text-center py-10 text-gray-400 text-sm">No sales in this date range</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {['Date','Sales','Revenue','Cost','Profit','Profit %','Cash','UPI','Card'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {trend.map((row: DailyRow) => (
                          <tr key={row.date} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{row.date}</td>
                            <td className="px-4 py-3 text-gray-600 text-center">{row.salesCount}</td>
                            <td className="px-4 py-3 font-semibold text-gray-800">{formatCurrency(row.revenue)}</td>
                            <td className="px-4 py-3 text-amber-600">{formatCurrency(row.cost)}</td>
                            <td className="px-4 py-3 text-green-600 font-semibold">{formatCurrency(row.profit)}</td>
                            <td className="px-4 py-3"><ProfitBadge pct={Number(row.profitPct)} /></td>
                            <td className="px-4 py-3 text-green-700">{formatCurrency(row.cashAmount)}</td>
                            <td className="px-4 py-3 text-blue-600">{formatCurrency(row.upiAmount)}</td>
                            <td className="px-4 py-3 text-purple-600">{formatCurrency(row.cardAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* â”€â”€ TOP MEDICINES â”€â”€ */}
      {tab === 'top' && (
        <div>
          {bl ? <PageLoader /> : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-gray-700">Top 10 Best Selling â€” Current Month</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['#', 'Medicine', 'Qty Sold', 'Revenue'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {best?.map((item: any, idx: number) => (
                      <tr key={item.medicineId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400 font-bold text-lg">#{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{item.medicineName}</td>
                        <td className="px-4 py-3 text-gray-600">{item.totalQuantity}</td>
                        <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(item.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ INVENTORY â”€â”€ */}
      {tab === 'inventory' && (
        <div>
          {invl ? <PageLoader /> : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <Layers className="w-4 h-4 text-pharma-600" />
                <h3 className="font-semibold text-gray-700">Medicine Stock Inventory</h3>
                <span className="ml-auto text-xs text-gray-400">{inventory?.length ?? 0} medicines</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Medicine', 'Company', 'Purchased', 'Sold', 'Remaining', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {inventory?.map((item: MedicineInventoryItem) => (
                      <>
                        <tr key={item.medicineId}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpandedMed(expandedMed === item.medicineId ? null : item.medicineId)}>
                          <td className="px-4 py-3 font-medium text-gray-800">
                            <span className="flex items-center gap-1">
                              {expandedMed === item.medicineId
                                ? <ChevronDown className="w-3 h-3 text-pharma-600" />
                                : <ChevronRight className="w-3 h-3 text-gray-400" />}
                              {item.medicineName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{item.companyName || '-'}</td>
                          <td className="px-4 py-3 text-blue-600 font-medium whitespace-nowrap">
                            {formatStockQuantity(item.totalPurchased, item.tabletsPerStrip, settings?.showStripsAndTabs ?? false, item)}
                          </td>
                          <td className="px-4 py-3 text-orange-500 font-medium whitespace-nowrap">
                            {formatStockQuantity(item.totalSold, item.tabletsPerStrip, settings?.showStripsAndTabs ?? false, item)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-bold whitespace-nowrap ${item.remaining === 0 ? 'text-red-500' : item.remaining < 10 ? 'text-amber-500' : 'text-green-600'}`}>
                              {formatStockQuantity(item.remaining, item.tabletsPerStrip, settings?.showStripsAndTabs ?? false, item)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{item.batches.length} batch{item.batches.length !== 1 ? 'es' : ''}</td>
                        </tr>
                        {expandedMed === item.medicineId && item.batches.map((batch, i) => (
                          <tr key={i} className="bg-pharma-50/40">
                            <td className="pl-10 pr-4 py-2 text-xs text-gray-500" colSpan={1}>
                              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{batch.batchNumber}</span>
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-500">
                              Exp: <span className={`font-medium ${batch.expired ? 'text-red-500' : new Date(batch.expiryDate) < new Date(Date.now() + 90*24*60*60*1000) ? 'text-amber-600' : 'text-gray-700'}`}>
                                {batch.expiryDate}
                              </span>
                              {batch.expired && <span className="ml-1 text-red-500">(Expired)</span>}
                            </td>
                            <td className="px-4 py-2 text-xs text-blue-500 whitespace-nowrap">
                              {formatStockQuantity(batch.purchaseQuantity, batch.tabletsPerStrip, settings?.showStripsAndTabs ?? false, item)}
                            </td>
                            <td className="px-4 py-2 text-xs text-orange-400 whitespace-nowrap">
                              {formatStockQuantity(batch.purchaseQuantity - batch.remainingQuantity, batch.tabletsPerStrip, settings?.showStripsAndTabs ?? false, item)}
                            </td>
                            <td className="px-4 py-2 text-xs font-semibold text-green-600 whitespace-nowrap">
                              {formatStockQuantity(batch.remainingQuantity, batch.tabletsPerStrip, settings?.showStripsAndTabs ?? false, item)}
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-400">
                              <div className="flex items-center gap-2 justify-between">
                                <span>{batch.rackLocation && `Rack: ${batch.rackLocation}`}</span>
                                <span>
                                  Sell: {batch.tabletsPerStrip > 1
                                    ? `${formatCurrency(batch.sellingPrice * batch.tabletsPerStrip)}/${getStockUnitLabels(item).pack}`
                                    : formatCurrency(batch.sellingPrice)}
                                  {(settings?.showStripsAndTabs ?? false) && batch.tabletsPerStrip > 1
                                    ? ` (${formatCurrency(batch.sellingPrice)}/${getStockUnitLabels(item).loose})`
                                    : ''}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                    {inventory?.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-10 text-gray-400">No medicines found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── OUTSTANDING DUES ── */}
      {tab === 'dues' && (
        <div className="space-y-4">
          {dul ? <PageLoader /> : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title="Total Outstanding" value={formatCurrency(dues?.totalOutstanding ?? 0)} icon={Wallet} color="amber" />
                <StatCard title="Credit Sales Due"  value={dues?.count ?? 0}                            icon={CreditCard} color="red" />
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold text-gray-700">Outstanding Balances</h3>
                  <span className="ml-auto text-xs text-gray-400">{dues?.dues.length ?? 0} sales</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Invoice', 'Patient', 'Phone', 'Date', 'Total', 'Paid', 'Due', 'Status', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {dues?.dues.map((d: OutstandingDue) => (
                        <tr key={d.saleId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-pharma-700">{d.invoiceNumber}</td>
                          <td className="px-4 py-3 text-gray-600">{d.patientName || 'Walk-in'}</td>
                          <td className="px-4 py-3 text-gray-500">{d.patientPhone || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(d.createdAt)}</td>
                          <td className="px-4 py-3">{formatCurrency(d.totalAmount)}</td>
                          <td className="px-4 py-3 text-green-600">{formatCurrency(d.amountPaid)}</td>
                          <td className="px-4 py-3 font-semibold text-amber-600">{formatCurrency(d.balanceDue)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${d.paymentStatus === 'PARTIAL' ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'}`}>
                              {d.paymentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Button size="sm" onClick={() => openPay(d)}>Pay</Button>
                          </td>
                        </tr>
                      ))}
                      {(dues?.dues.length ?? 0) === 0 && (
                        <tr><td colSpan={9} className="text-center py-10 text-gray-400">No outstanding dues 🎉</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Record-payment modal (Dues tab) */}
      {payTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setPayTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">Record Payment</h3>
              <button onClick={() => setPayTarget(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="text-sm text-gray-500 mb-3">
              <p>{payTarget.invoiceNumber} · {payTarget.patientName || 'Walk-in'}</p>
              <p className="text-amber-600 font-semibold mt-1">Balance due: {formatCurrency(payTarget.balanceDue)}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Amount (₹)</label>
                <input
                  type="number" min={0.01} step="0.01" max={payTarget.balanceDue}
                  value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Tender</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(['CASH', 'UPI', 'CARD'] as PaymentMode[]).map((m) => (
                    <button key={m} onClick={() => setPayMode(m)}
                      className={`py-1.5 text-xs font-medium rounded-lg border transition ${
                        payMode === m ? 'bg-pharma-600 text-white border-pharma-600' : 'bg-white border-gray-200 text-gray-600 hover:border-pharma-300'
                      }`}>{m}</button>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={submitPay} disabled={payMutation.isPending}>
                {payMutation.isPending ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

