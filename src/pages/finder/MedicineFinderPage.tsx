import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { medicinesApi } from '@/api/medicines'
import { apiClient, tenantPath } from '@/api/client'
import { useAuthStore } from '@/store/useAuthStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { Badge } from '@/components/shared/PageHeader'
import { formatDate, formatStripStock } from '@/lib/utils'
import type { ApiResponse, Medicine, MedicineStockSummary, TenantSettings } from '@/types'
import { LocateFixed, MapPin, PackageSearch } from 'lucide-react'

export default function MedicineFinderPage() {
  const tenantId = useAuthStore((s) => s.tenantId())!
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Medicine | null>(null)

  const { data: settings } = useQuery({
    queryKey: ['settings', tenantId],
    queryFn: () => apiClient.get<ApiResponse<TenantSettings>>(`${tenantPath(tenantId)}/settings`).then(r => r.data.data),
  })

  const { data, isFetching } = useQuery({
    queryKey: ['locator-search', tenantId, search],
    queryFn: () => medicinesApi.list(tenantId, { search, size: 12 }),
    enabled: search.trim().length >= 2,
  })

  const { data: summary } = useQuery({
    queryKey: ['locator-summary', tenantId, selected?.id],
    queryFn: () => medicinesApi.getById(tenantId, selected!.id),
    enabled: !!selected,
  })

  const showBoth = settings?.showStripsAndTabs ?? false
  const available = (summary?.totalRemaining ?? selected?.totalStock ?? 0) > 0
  const alternatives = (data?.content ?? [])
    .filter(med => med.id !== selected?.id && (med.totalStock ?? 0) > 0)
    .filter(med => !selected || med.genericName === selected.genericName || med.category === selected.category)
    .slice(0, 4)

  return (
    <div>
      <PageHeader title="Medicine Locator" subtitle="Quickly find stock, rack, batch, and expiry details" />

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <SearchInput value={search} onChange={value => { setSearch(value); setSelected(null) }} placeholder="Search medicine, batch, rack, or barcode..." autoFocus />
          </div>
          <div className="divide-y divide-gray-50 max-h-[680px] overflow-y-auto">
            {search.trim().length < 2 && (
              <div className="py-16 text-center text-gray-300">
                <PackageSearch className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">Type at least 2 characters.</p>
              </div>
            )}
            {isFetching && <p className="p-4 text-sm text-gray-400">Searching...</p>}
            {data?.content?.length === 0 && <p className="p-4 text-sm text-gray-400">No medicine found.</p>}
            {data?.content?.map(medicine => (
              <button
                key={medicine.id}
                onClick={() => setSelected(medicine)}
                className={`w-full text-left p-4 hover:bg-pharma-50 ${selected?.id === medicine.id ? 'bg-pharma-50' : ''}`}
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-800">{medicine.name}</p>
                    <p className="text-xs text-gray-400">{[medicine.genericName, medicine.companyName].filter(Boolean).join(' · ')}</p>
                    {(medicine.rackLocations?.length ?? 0) > 0 && (
                      <p className="text-xs text-amber-700 mt-1">Rack: {medicine.rackLocations!.join(', ')}</p>
                    )}
                  </div>
                  <p className={`text-sm font-bold ${(medicine.totalStock ?? 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {formatStripStock(medicine.totalStock ?? 0, medicine.tabletsPerStrip, showBoth, medicine)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm min-h-[420px]">
          {!selected ? (
            <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-gray-300">
              <LocateFixed className="w-14 h-14 mb-3" />
              <p>Select a medicine to view location details.</p>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                  <p className="text-sm text-gray-400">{[selected.genericName, selected.companyName, selected.category].filter(Boolean).join(' · ')}</p>
                </div>
                <Badge variant={available ? 'success' : 'danger'}>{available ? 'Available' : 'Out of stock'}</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Info label="Current Stock" value={formatStripStock(summary?.totalRemaining ?? selected.totalStock ?? 0, selected.tabletsPerStrip, showBoth, selected)} />
                <Info label="Total Purchased" value={summary ? formatStripStock(summary.totalPurchased, selected.tabletsPerStrip, showBoth, selected) : '-'} />
                <Info label="Total Sold" value={summary ? formatStripStock(summary.totalSold, selected.tabletsPerStrip, showBoth, selected) : '-'} />
              </div>

              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>{['Batch', 'Expiry', 'Stock', 'Location'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {!summary && <tr><td colSpan={4} className="py-8 text-center text-gray-400">Loading batch details...</td></tr>}
                    {summary?.batches?.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-gray-400">No batch records.</td></tr>}
                    {summary?.batches?.map(batch => (
                      <tr key={batch.id} className={batch.remainingQuantity > 0 && !batch.isExpired ? '' : 'opacity-50'}>
                        <td className="px-4 py-3 font-mono text-pharma-700">{batch.batchNumber}</td>
                        <td className="px-4 py-3">
                          <span className={batch.isExpired ? 'text-red-500 font-medium' : 'text-gray-600'}>{formatDate(batch.expiryDate)}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-green-600">{formatStripStock(batch.remainingQuantity, batch.tabletsPerStrip, showBoth, selected)}</td>
                        <td className="px-4 py-3">
                          {batch.rackLocation ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded">
                              <MapPin className="w-3 h-3" /> {batch.rackLocation}
                            </span>
                          ) : <span className="text-gray-300">Not assigned</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!available && alternatives.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Available alternatives</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {alternatives.map(medicine => (
                      <button key={medicine.id} onClick={() => setSelected(medicine)} className="text-left rounded-lg border border-gray-100 p-3 hover:bg-pharma-50">
                        <p className="font-medium text-sm">{medicine.name}</p>
                        <p className="text-xs text-green-600">{formatStripStock(medicine.totalStock ?? 0, medicine.tabletsPerStrip, showBoth, medicine)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-bold text-gray-800 mt-1">{value}</p>
    </div>
  )
}
