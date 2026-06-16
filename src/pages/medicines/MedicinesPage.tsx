import { useState, useCallback, Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { medicinesApi } from '@/api/medicines'
import { useAuthStore } from '@/store/useAuthStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Badge, Button } from '@/components/shared/PageHeader'
import { Plus, Edit, Package, ChevronRight, ChevronDown } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient, tenantPath } from '@/api/client'
import { formatStripStock } from '@/lib/utils'
import type { Medicine, MedicineStockSummary, TenantSettings, ApiResponse } from '@/types'

/** Format stock as strips + loose tabs for easy tracking */
function formatStock(tabs: number, tps: number | undefined, showBoth: boolean): string {
  return formatStripStock(tabs, tps, showBoth)
}

/** Full readable label for the strip format */
function stockLabel(tabs: number, tps: number | undefined, showBoth: boolean): string {
  return formatStock(tabs, tps, showBoth)
}

export default function MedicinesPage() {
  const tenantId = useAuthStore((s) => s.tenantId())!
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [batchCache, setBatchCache] = useState<Record<string, MedicineStockSummary>>({})

  // Fetch tenant settings to get the show strips and tabs preference
  const { data: settings } = useQuery({
    queryKey: ['settings', tenantId],
    queryFn: () => apiClient.get<ApiResponse<TenantSettings>>(`${tenantPath(tenantId)}/settings`).then(r => r.data.data),
  })

  const toggleExpand = useCallback(async (medId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(medId)) { next.delete(medId) } else { next.add(medId) }
      return next
    })
    if (!batchCache[medId]) {
      const summary = await medicinesApi.getById(tenantId, medId)
      setBatchCache(prev => ({ ...prev, [medId]: summary }))
    }
  }, [batchCache, tenantId])

  const { data, isLoading } = useQuery({
    queryKey: ['medicines', tenantId, search, page],
    queryFn: () => medicinesApi.list(tenantId, { search, page, size: 20 }),
    placeholderData: (prev) => prev,
  })

  return (
    <div>
      <PageHeader
        title="Medicines"
        subtitle={`${data?.totalElements ?? 0} total medicines`}
        action={
          <Button onClick={() => navigate('/medicines/new')}>
            <Plus className="w-4 h-4" /> Add Medicine
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(0) }}
          placeholder="Search by name, generic name, barcode, or rack..."
          className="max-w-sm"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[
                      'Medicine',
                      'Category',
                      'Tabs/Strip',
                      'GST %',
                      'Stock',
                      'Status',
                      '',
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.content?.map((med: Medicine) => {
                    const tps = med.tabletsPerStrip
                    const tabs = med.totalStock ?? 0
                    const low = tabs === 0 || tabs <= (med.minStockAlert ?? 10)
                    const isExpanded = expandedIds.has(med.id)
                    const summary = batchCache[med.id]
                    return (
                      <Fragment key={med.id}>
                      <tr className={`hover:bg-gray-50 transition ${isExpanded ? 'bg-pharma-50/30' : ''}`}>
                        {/* Medicine */}
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-1.5">
                            <button
                              onClick={() => toggleExpand(med.id)}
                              className="mt-0.5 text-gray-300 hover:text-pharma-600 flex-shrink-0 transition-colors"
                              title={isExpanded ? 'Collapse batches' : 'Expand batches'}
                            >
                              {isExpanded
                                ? <ChevronDown className="w-4 h-4" />
                                : <ChevronRight className="w-4 h-4" />}
                            </button>
                            <div>
                              <p className="font-semibold text-gray-800">{med.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {[med.genericName, med.companyName].filter(Boolean).join(' · ')}
                              </p>
                              {med.barcode && <p className="text-xs text-gray-300 mt-0.5">{med.barcode}</p>}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3 text-gray-600 text-xs">{med.category || '—'}</td>

                        {/* Tabs/Strip */}
                        <td className="px-4 py-3 text-center">
                          {tps && tps > 1 ? (
                            <span className="inline-block bg-pharma-50 text-pharma-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                              {tps}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">single</span>
                          )}
                        </td>

                        {/* GST % */}
                        <td className="px-4 py-3 text-gray-500 text-xs text-center">{med.gstPercentage}%</td>

                        {/* Stock */}
                        <td className="px-4 py-3">
                          <span
                            className={`text-sm font-bold ${tabs === 0 ? 'text-red-500' : low ? 'text-amber-500' : 'text-green-600'}`}
                            title={stockLabel(tabs, tps, settings?.showStripsAndTabs ?? false)}
                          >
                            {formatStock(tabs, tps, settings?.showStripsAndTabs ?? false)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge variant={med.isActive ? 'success' : 'danger'}>
                            {med.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>

                        {/* Edit */}
                        <td className="px-4 py-3">
                          <Link to={`/medicines/${med.id}/edit`} className="text-pharma-600 hover:text-pharma-800">
                            <Edit className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                      {/* Batch expansion */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={7} className="px-0 py-0">
                            {!summary ? (
                              <div className="px-8 py-2 text-xs text-gray-400 italic">Loading batches…</div>
                            ) : summary.batches.length === 0 ? (
                              <div className="px-8 py-2 text-xs text-gray-400 italic">No batches on record.</div>
                            ) : (
                              <div className="px-8 py-3 border-t border-pharma-100">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-400 border-b border-gray-100">
                                      <th className="pb-1.5 text-left font-medium">Batch</th>
                                      <th className="pb-1.5 text-left font-medium">Location</th>
                                      <th className="pb-1.5 text-left font-medium">Expiry</th>
                                      <th className="pb-1.5 text-right font-medium">Purchased</th>
                                      <th className="pb-1.5 text-right font-medium">Sold</th>
                                      <th className="pb-1.5 text-right font-medium">Remaining</th>
                                      <th className="pb-1.5 text-right font-medium">Purchase Price</th>
                                      <th className="pb-1.5 text-right font-medium">Sell Price</th>
                                      <th className="pb-1.5 text-right font-medium">MRP</th>
                                      <th className="pb-1.5 text-center font-medium">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {summary.batches.map(batch => {
                                      const btps = batch.tabletsPerStrip
                                      const sold = batch.purchaseQuantity - batch.remainingQuantity
                                      return (
                                        <tr key={batch.id} className="hover:bg-white/60">
                                          <td className="py-1.5 font-mono font-semibold text-pharma-700">{batch.batchNumber}</td>
                                          <td className="py-1.5">
                                            {batch.rackLocation ? (
                                              <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                                                Rack: {batch.rackLocation}
                                              </span>
                                            ) : (
                                              <span className="text-gray-300 text-xs">—</span>
                                            )}
                                          </td>
                                          <td className={`py-1.5 ${batch.isExpired ? 'text-red-500 font-medium' : 'text-gray-500'}`}>{batch.expiryDate}</td>
                                          <td className="py-1.5 text-right text-blue-600 font-medium whitespace-nowrap">{formatStock(batch.purchaseQuantity, btps, settings?.showStripsAndTabs ?? false)}</td>
                                          <td className="py-1.5 text-right text-orange-500 whitespace-nowrap">{formatStock(sold, btps, settings?.showStripsAndTabs ?? false)}</td>
                                          <td className={`py-1.5 text-right font-bold whitespace-nowrap ${batch.remainingQuantity === 0 ? 'text-red-400' : 'text-green-600'}`}>{formatStock(batch.remainingQuantity, btps, settings?.showStripsAndTabs ?? false)}</td>
                                          <td className="py-1.5 text-right">
                                            <span className="text-gray-600">
                                              {btps > 1 ? `₹${(batch.purchasePrice * btps).toFixed(2)}/strip` : `₹${batch.purchasePrice.toFixed(2)}`}
                                            </span>
                                            {(settings?.showStripsAndTabs ?? false) && btps > 1 && (
                                              <span className="block text-gray-400">₹{batch.purchasePrice.toFixed(2)}/tab</span>
                                            )}
                                          </td>
                                          <td className="py-1.5 text-right">
                                            <span className="text-green-700 font-semibold">
                                              {btps > 1 ? `₹${(batch.sellingPrice * btps).toFixed(2)}/strip` : `₹${batch.sellingPrice.toFixed(2)}`}
                                            </span>
                                            {(settings?.showStripsAndTabs ?? false) && btps > 1 && (
                                              <span className="block text-gray-400">₹{batch.sellingPrice.toFixed(2)}/tab</span>
                                            )}
                                          </td>
                                          <td className="py-1.5 text-right">
                                            {batch.mrp ? (
                                              <>
                                                <span className="text-amber-600">
                                                  {btps > 1 ? `₹${(batch.mrp * btps).toFixed(2)}/strip` : `₹${batch.mrp.toFixed(2)}`}
                                                </span>
                                                {(settings?.showStripsAndTabs ?? false) && btps > 1 && (
                                                  <span className="block text-gray-400">₹{batch.mrp.toFixed(2)}/tab</span>
                                                )}
                                              </>
                                            ) : <span className="text-gray-300">—</span>}
                                          </td>
                                          <td className="py-1.5 text-center">
                                            <Badge variant={batch.isExpired ? 'danger' : 'success'}>
                                              {batch.isExpired ? 'Expired' : 'Active'}
                                            </Badge>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {data?.content?.map((med: Medicine) => {
                const tps = med.tabletsPerStrip
                const tabs = med.totalStock ?? 0
                return (
                  <div key={med.id} className="px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 bg-pharma-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-pharma-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{med.name}</p>
                          <p className="text-xs text-gray-400">{med.genericName} · {med.companyName}</p>
                          <p className="text-xs text-gray-400">{med.category} · GST {med.gstPercentage}%</p>
                        </div>
                      </div>
                      <Link to={`/medicines/${med.id}/edit`}>
                        <Edit className="w-4 h-4 text-pharma-500" />
                      </Link>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-50 rounded px-2 py-1 text-center">
                        <p className="text-gray-400">Tabs/Strip</p>
                        <p className="font-semibold text-gray-700">{tps && tps > 1 ? tps : '—'}</p>
                      </div>
                      <div className="bg-gray-50 rounded px-2 py-1 text-center">
                        <p className="text-gray-400">Stock</p>
                        <p className={`font-bold ${tabs === 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {formatStock(tabs, tps, settings?.showStripsAndTabs ?? false)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Page {page + 1} of {data.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                    Prev
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages - 1}>
                    Next
                  </Button>
                </div>
              </div>
            )}

            {data?.content?.length === 0 && (
              <div className="py-16 text-center">
                <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No medicines found</p>
                <Link to="/medicines/new" className="mt-2 inline-block text-sm text-pharma-600 hover:underline">
                  Add your first medicine →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
