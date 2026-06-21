import { useState, useCallback, Fragment, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { medicinesApi } from '@/api/medicines'
import { racksApi } from '@/api/racks'
import { useAuthStore } from '@/store/useAuthStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Badge, Button } from '@/components/shared/PageHeader'
import { Plus, Edit, Package, ChevronRight, ChevronDown, X, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient, tenantPath } from '@/api/client'
import { formatStripStock, getStockUnitLabels } from '@/lib/utils'
import type { Medicine, MedicineBatch, MedicineStockSummary, TenantSettings, ApiResponse } from '@/types'
import toast from 'react-hot-toast'

function formatStock(quantity: number, tps: number | undefined, showBoth: boolean, medicine?: Pick<Medicine, 'category' | 'unit'>): string {
  return formatStripStock(quantity, tps, showBoth, medicine)
}

function stockLabel(quantity: number, tps: number | undefined, showBoth: boolean, medicine?: Pick<Medicine, 'category' | 'unit'>): string {
  return formatStock(quantity, tps, showBoth, medicine)
}

export default function MedicinesPage() {
  const tenantId = useAuthStore((s) => s.tenantId())!
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [batchCache, setBatchCache] = useState<Record<string, MedicineStockSummary>>({})
  const [adjusting, setAdjusting] = useState<{ medicine: Medicine; batch: MedicineBatch } | null>(null)
  const [adjustError, setAdjustError] = useState('')
  const [adjustForm, setAdjustForm] = useState({
    batchNumber: '',
    expiryDate: '',
    manufactureDate: '',
    rackLocationId: '',
    purchasePrice: 0,
    sellingPrice: 0,
    mrp: 0,
    unitsPerPack: 1,
    purchasePacks: 1,
    purchaseLoose: 0,
    remainingPacks: 1,
    remainingLoose: 0,
  })

  // Fetch tenant settings to get the show strips and tabs preference
  const { data: settings } = useQuery({
    queryKey: ['settings', tenantId],
    queryFn: () => apiClient.get<ApiResponse<TenantSettings>>(`${tenantPath(tenantId)}/settings`).then(r => r.data.data),
  })

  const { data: racks = [] } = useQuery({
    queryKey: ['racks', tenantId, 'active'],
    queryFn: () => racksApi.listActive(tenantId).then(r => r.data.data),
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

  const onboardingOpen = (settings?.firstTimeSetupEnabled ?? true) && !(settings?.inventoryOnboardingCompleted ?? false)

  const beginAdjust = (medicine: Medicine, batch: MedicineBatch) => {
    const tps = batch.tabletsPerStrip && batch.tabletsPerStrip > 1 ? batch.tabletsPerStrip : 1
    setAdjustError('')
    setAdjusting({ medicine, batch })
    setAdjustForm({
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      manufactureDate: batch.manufactureDate || '',
      rackLocationId: batch.rackLocationId || '',
      purchasePrice: Number((batch.purchasePrice * tps).toFixed(2)),
      sellingPrice: Number((batch.sellingPrice * tps).toFixed(2)),
      mrp: batch.mrp ? Number((batch.mrp * tps).toFixed(2)) : 0,
      unitsPerPack: tps,
      purchasePacks: Math.floor(batch.purchaseQuantity / tps),
      purchaseLoose: tps > 1 ? batch.purchaseQuantity % tps : 0,
      remainingPacks: Math.floor(batch.remainingQuantity / tps),
      remainingLoose: tps > 1 ? batch.remainingQuantity % tps : 0,
    })
  }

  const clampLoose = (value: number, unitsPerPack: number) => Math.min(Math.max(0, value), Math.max(0, unitsPerPack - 1))

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!adjusting) return
      setAdjustError('')
      const { medicine, batch } = adjusting
      const unitsPerPack = adjustForm.unitsPerPack > 1 ? adjustForm.unitsPerPack : 1
      await medicinesApi.updateBatch(tenantId, medicine.id, batch.id, {
        batchNumber: adjustForm.batchNumber || undefined,
        quantity: Math.max(0, adjustForm.purchasePacks),
        looseQuantity: unitsPerPack > 1 ? adjustForm.purchaseLoose : undefined,
        remainingQuantity: Math.max(0, adjustForm.remainingPacks),
        remainingLooseQuantity: unitsPerPack > 1 ? adjustForm.remainingLoose : undefined,
        purchasePrice: adjustForm.purchasePrice,
        sellingPrice: adjustForm.sellingPrice,
        mrp: adjustForm.mrp > 0 ? adjustForm.mrp : undefined,
        tabletsPerStrip: unitsPerPack > 1 ? unitsPerPack : undefined,
        expiryDate: adjustForm.expiryDate,
        manufactureDate: adjustForm.manufactureDate || undefined,
        rackLocationId: adjustForm.rackLocationId || undefined,
      })
    },
    onSuccess: async () => {
      if (adjusting) {
        const summary = await medicinesApi.getById(tenantId, adjusting.medicine.id)
        setBatchCache(prev => ({ ...prev, [adjusting.medicine.id]: summary }))
      }
      await queryClient.invalidateQueries({ queryKey: ['medicines', tenantId] })
      await queryClient.refetchQueries({ queryKey: ['medicines', tenantId], type: 'active' })
      toast.success('Batch updated')
      setAdjusting(null)
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || 'Failed to update batch'
      setAdjustError(message)
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (medicine: Medicine) => medicinesApi.delete(tenantId, medicine.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines', tenantId] })
      toast.success('Medicine deleted')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete medicine'),
  })

  const deleteMedicine = (medicine: Medicine) => {
    if (!window.confirm(`Delete ${medicine.name}? This is allowed only during onboarding and will remove it from active inventory.`)) return
    deleteMutation.mutate(medicine)
  }

  const adjustingUnitsPerPack = adjustForm.unitsPerPack > 1 ? adjustForm.unitsPerPack : 1
  const adjustingPurchasedTotal = adjustForm.purchasePacks * adjustingUnitsPerPack
    + (adjustingUnitsPerPack > 1 ? adjustForm.purchaseLoose : 0)
  const adjustingRemainingTotal = adjustForm.remainingPacks * adjustingUnitsPerPack
    + (adjustingUnitsPerPack > 1 ? adjustForm.remainingLoose : 0)
  const adjustingLabels = getStockUnitLabels(adjusting?.medicine)
  const canSaveAdjustment = !!adjustForm.batchNumber.trim() && !!adjustForm.expiryDate
    && adjustForm.purchasePrice >= 0 && adjustForm.sellingPrice > 0
    && adjustingPurchasedTotal > 0 && adjustingRemainingTotal >= 0
    && adjustingRemainingTotal <= adjustingPurchasedTotal

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

      {adjusting && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setAdjusting(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-lg">Edit Batch</h2>
                <p className="text-xs text-gray-400 mt-0.5">{adjusting.medicine.name} · Batch {adjusting.batch.batchNumber}</p>
              </div>
              <button type="button" onClick={() => setAdjusting(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
                Batch editing is available only until inventory onboarding is completed.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Batch Number *">
                  <input
                    value={adjustForm.batchNumber}
                    onChange={e => setAdjustForm(f => ({ ...f, batchNumber: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Storage Rack">
                  <select
                    value={adjustForm.rackLocationId}
                    onChange={e => setAdjustForm(f => ({ ...f, rackLocationId: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">Select rack (optional)</option>
                    {racks.map(rack => (
                      <option key={rack.id} value={rack.id}>{rack.rackName}{rack.rackCode ? ` (${rack.rackCode})` : ''}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Expiry Date *">
                  <input
                    type="date"
                    value={adjustForm.expiryDate}
                    onChange={e => setAdjustForm(f => ({ ...f, expiryDate: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Manufacture Date">
                  <input
                    type="date"
                    value={adjustForm.manufactureDate}
                    onChange={e => setAdjustForm(f => ({ ...f, manufactureDate: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Purchase Price *">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={adjustForm.purchasePrice}
                    onChange={e => setAdjustForm(f => ({ ...f, purchasePrice: Math.max(0, Number(e.target.value)) }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Selling Price *">
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={adjustForm.sellingPrice}
                    onChange={e => setAdjustForm(f => ({ ...f, sellingPrice: Math.max(0, Number(e.target.value)) }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="MRP">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={adjustForm.mrp || ''}
                    onChange={e => setAdjustForm(f => ({ ...f, mrp: Math.max(0, Number(e.target.value)) }))}
                    className={inputClass}
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Units per Pack / Strip">
                  <input
                    type="number"
                    min={1}
                    step="1"
                    value={adjustForm.unitsPerPack}
                    onChange={e => {
                      const next = Math.max(1, parseInt(e.target.value) || 1)
                      setAdjustForm(f => ({
                        ...f,
                        unitsPerPack: next,
                        purchaseLoose: clampLoose(f.purchaseLoose, next),
                        remainingLoose: clampLoose(f.remainingLoose, next),
                      }))
                    }}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                <Field label={adjustingUnitsPerPack > 1 ? `Purchased ${adjustingLabels.packs}` : `Purchased ${adjustingLabels.loosePlural}`}>
                  <input
                    type="number"
                    min={0}
                    value={adjustForm.purchasePacks}
                    onChange={e => setAdjustForm(f => ({ ...f, purchasePacks: Math.max(0, Number(e.target.value)) }))}
                    className={inputClass}
                  />
                </Field>
                {adjustingUnitsPerPack > 1 && (
                  <Field label={`Purchased loose ${adjustingLabels.loosePlural}`}>
                    <input
                      type="number"
                      min={0}
                      max={adjustingUnitsPerPack - 1}
                      value={adjustForm.purchaseLoose}
                      onChange={e => setAdjustForm(f => ({ ...f, purchaseLoose: clampLoose(Number(e.target.value), adjustingUnitsPerPack) }))}
                      className={inputClass}
                    />
                  </Field>
                )}
                <Field label={adjustingUnitsPerPack > 1 ? `Remaining ${adjustingLabels.packs}` : `Remaining ${adjustingLabels.loosePlural}`}>
                  <input
                    type="number"
                    min={0}
                    value={adjustForm.remainingPacks}
                    onChange={e => setAdjustForm(f => ({ ...f, remainingPacks: Math.max(0, Number(e.target.value)) }))}
                    className={inputClass}
                  />
                </Field>
                {adjustingUnitsPerPack > 1 && (
                  <Field label={`Remaining loose ${adjustingLabels.loosePlural}`}>
                    <input
                      type="number"
                      min={0}
                      max={adjustingUnitsPerPack - 1}
                      value={adjustForm.remainingLoose}
                      onChange={e => setAdjustForm(f => ({ ...f, remainingLoose: clampLoose(Number(e.target.value), adjustingUnitsPerPack) }))}
                      className={inputClass}
                    />
                  </Field>
                )}
              </div>
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                Purchased total: {adjustingPurchasedTotal} {adjustingLabels.loosePlural} · Remaining total: {adjustingRemainingTotal} {adjustingLabels.loosePlural}
              </div>
              {adjustError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{adjustError}</p>
              )}
              {!canSaveAdjustment && (
                <p className="text-xs text-red-500">Enter batch number, valid prices, expiry date, and remaining stock between 0 and purchased stock.</p>
              )}
              <div className="flex gap-3 pt-1">
                <Button disabled={!canSaveAdjustment || adjustMutation.isPending} onClick={() => adjustMutation.mutate()}>
                  {adjustMutation.isPending ? 'Saving...' : 'Save Batch'}
                </Button>
                <Button variant="secondary" onClick={() => setAdjusting(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      'Units/Pack',
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
                    const categoryUnit = [med.category, med.unit].filter(Boolean).join(' Â· ')
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
                              {categoryUnit && <p className="text-xs text-gray-400 mt-0.5">{categoryUnit}</p>}
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
                            title={stockLabel(tabs, tps, settings?.showStripsAndTabs ?? false, med)}
                          >
                            {formatStock(tabs, tps, settings?.showStripsAndTabs ?? false, med)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge variant={med.isActive ? 'success' : 'danger'}>
                            {med.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link to={`/medicines/${med.id}/edit`} className="text-pharma-600 hover:text-pharma-800" title="Edit medicine">
                              <Edit className="w-4 h-4" />
                            </Link>
                            {onboardingOpen && (
                              <button
                                type="button"
                                onClick={() => deleteMedicine(med)}
                                disabled={deleteMutation.isPending}
                                className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                title="Delete medicine during onboarding"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
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
                                      <th className="pb-1.5 text-right font-medium"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {summary.batches.map(batch => {
                                      const btps = batch.tabletsPerStrip
                                      const sold = batch.purchaseQuantity - batch.remainingQuantity
                                      const labels = getStockUnitLabels(med)
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
                                          <td className="py-1.5 text-right text-blue-600 font-medium whitespace-nowrap">{formatStock(batch.purchaseQuantity, btps, settings?.showStripsAndTabs ?? false, med)}</td>
                                          <td className="py-1.5 text-right text-orange-500 whitespace-nowrap">{formatStock(sold, btps, settings?.showStripsAndTabs ?? false, med)}</td>
                                          <td className={`py-1.5 text-right font-bold whitespace-nowrap ${batch.remainingQuantity === 0 ? 'text-red-400' : 'text-green-600'}`}>{formatStock(batch.remainingQuantity, btps, settings?.showStripsAndTabs ?? false, med)}</td>
                                          <td className="py-1.5 text-right">
                                            <span className="text-gray-600">
                                              {btps > 1 ? `₹${(batch.purchasePrice * btps).toFixed(2)}/${labels.pack}` : `₹${batch.purchasePrice.toFixed(2)}`}
                                            </span>
                                            {(settings?.showStripsAndTabs ?? false) && btps > 1 && (
                                              <span className="block text-gray-400">₹{batch.purchasePrice.toFixed(2)}/{labels.loose}</span>
                                            )}
                                          </td>
                                          <td className="py-1.5 text-right">
                                            <span className="text-green-700 font-semibold">
                                              {btps > 1 ? `₹${(batch.sellingPrice * btps).toFixed(2)}/${labels.pack}` : `₹${batch.sellingPrice.toFixed(2)}`}
                                            </span>
                                            {(settings?.showStripsAndTabs ?? false) && btps > 1 && (
                                              <span className="block text-gray-400">₹{batch.sellingPrice.toFixed(2)}/{labels.loose}</span>
                                            )}
                                          </td>
                                          <td className="py-1.5 text-right">
                                            {batch.mrp ? (
                                              <>
                                                <span className="text-amber-600">
                                                  {btps > 1 ? `₹${(batch.mrp * btps).toFixed(2)}/${labels.pack}` : `₹${batch.mrp.toFixed(2)}`}
                                                </span>
                                                {(settings?.showStripsAndTabs ?? false) && btps > 1 && (
                                                  <span className="block text-gray-400">₹{batch.mrp.toFixed(2)}/{labels.loose}</span>
                                                )}
                                              </>
                                            ) : <span className="text-gray-300">—</span>}
                                          </td>
                                          <td className="py-1.5 text-center">
                                            <Badge variant={batch.isExpired ? 'danger' : 'success'}>
                                              {batch.isExpired ? 'Expired' : 'Active'}
                                            </Badge>
                                          </td>
                                          <td className="py-1.5 text-right">
                                            {onboardingOpen && (
                                              <button
                                                type="button"
                                                onClick={() => beginAdjust(med, batch)}
                                                className="text-xs font-medium text-pharma-600 hover:text-pharma-800"
                                              >
                                                Edit
                                              </button>
                                            )}
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
                const categoryUnit = [med.category, med.unit].filter(Boolean).join(' Â· ')
                return (
                  <div key={med.id} className="px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 bg-pharma-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-pharma-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{med.name}</p>
                          {categoryUnit && <p className="text-xs text-gray-400">{categoryUnit}</p>}
                          <p className="text-xs text-gray-400">{med.genericName} · {med.companyName}</p>
                          <p className="text-xs text-gray-400">{med.category} · GST {med.gstPercentage}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/medicines/${med.id}/edit`}>
                          <Edit className="w-4 h-4 text-pharma-500" />
                        </Link>
                        {onboardingOpen && (
                          <button
                            type="button"
                            onClick={() => deleteMedicine(med)}
                            disabled={deleteMutation.isPending}
                            className="text-red-500 disabled:opacity-50"
                            title="Delete medicine during onboarding"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-50 rounded px-2 py-1 text-center">
                          <p className="text-gray-400">Units/Pack</p>
                        <p className="font-semibold text-gray-700">{tps && tps > 1 ? tps : '—'}</p>
                      </div>
                      <div className="bg-gray-50 rounded px-2 py-1 text-center">
                        <p className="text-gray-400">Stock</p>
                        <p className={`font-bold ${tabs === 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {formatStock(tabs, tps, settings?.showStripsAndTabs ?? false, med)}
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

const inputClass = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500 bg-white'
