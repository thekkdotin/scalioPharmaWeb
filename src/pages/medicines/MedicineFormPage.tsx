import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { medicinesApi } from '@/api/medicines'
import { racksApi } from '@/api/racks'
import { apiClient, tenantPath } from '@/api/client'
import { useAuthStore } from '@/store/useAuthStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import toast from 'react-hot-toast'
import type { ApiResponse, Medicine, MedicineBatch, Rack, TenantSettings } from '@/types'
import { Package2 } from 'lucide-react'

const CATEGORIES = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Powder', 'Other']
const UNITS = ['Strip', 'Bottle', 'Box', 'Vial', 'Tube', 'Sachet', 'Piece', 'Pack']
const GST_RATES = ['0', '5', '12', '18', '28']

const BLANK: Partial<Medicine> = {
  name: '', genericName: '', companyName: '', barcode: '',
  category: 'Tablet', unit: 'Strip', hsnCode: '', gstPercentage: 0,
  minStockAlert: 10, description: '', isActive: true,
}

interface OpeningStock {
  entryMode: 'current' | 'setup'
  batchNumber: string
  quantity: number
  totalPurchasedQuantity: number
  totalSoldQuantity: number
  remainingQuantity: number
  purchasePrice: number
  sellingPrice: number
  mrp: number
  tabletsPerStrip: number
  expiryDate: string
  manufactureDate: string
  rackLocationId: string
}

const BLANK_STOCK: OpeningStock = {
  entryMode: 'current', batchNumber: '', quantity: 1, totalPurchasedQuantity: 1, totalSoldQuantity: 0, remainingQuantity: 1,
  purchasePrice: 0, sellingPrice: 0, mrp: 0, tabletsPerStrip: 1, expiryDate: '', manufactureDate: '', rackLocationId: '',
}

export default function MedicineFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const tenantId = useAuthStore((s) => s.tenantId())!
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<Partial<Medicine>>(BLANK)
  const [addStock, setAddStock] = useState(false)
  const [stock, setStock] = useState<OpeningStock>(BLANK_STOCK)
  const [selectedExisting, setSelectedExisting] = useState<Medicine | null>(null)

  const { data: stockSummary, isLoading } = useQuery({
    queryKey: ['medicine', tenantId, id],
    queryFn: () => medicinesApi.getById(tenantId, id!),
    enabled: isEdit,
  })

  const { data: racks = [] } = useQuery({
    queryKey: ['racks', tenantId, 'active'],
    queryFn: () => racksApi.listActive(tenantId).then(r => r.data.data),
  })

  const { data: settings } = useQuery({
    queryKey: ['settings', tenantId],
    queryFn: () => apiClient.get<ApiResponse<TenantSettings>>(`${tenantPath(tenantId)}/settings`).then(r => r.data.data),
  })

  const { data: existingMatches } = useQuery({
    queryKey: ['medicine-existing-matches', tenantId, form.name],
    queryFn: () => medicinesApi.list(tenantId, { search: form.name, size: 6 }),
    enabled: !isEdit && !selectedExisting && (form.name?.trim().length ?? 0) >= 2,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (stockSummary?.medicine) setForm(stockSummary.medicine)
  }, [stockSummary])

  const applyBatchDefaults = (batch?: MedicineBatch, fallbackTps?: number) => {
    const tps = batch?.tabletsPerStrip ?? fallbackTps ?? 1
    setStock({
      ...BLANK_STOCK,
      quantity: 1,
      totalPurchasedQuantity: 1,
      totalSoldQuantity: 0,
      remainingQuantity: 1,
      purchasePrice: batch ? Number((batch.purchasePrice * tps).toFixed(2)) : 0,
      sellingPrice: batch ? Number((batch.sellingPrice * tps).toFixed(2)) : 0,
      mrp: batch?.mrp ? Number((batch.mrp * tps).toFixed(2)) : 0,
      tabletsPerStrip: tps,
      rackLocationId: batch?.rackLocationId || '',
    })
  }

  const selectExistingMedicine = async (medicine: Medicine) => {
    setSelectedExisting(medicine)
    setForm(medicine)
    setAddStock(true)
    try {
      const summary = await medicinesApi.getById(tenantId, medicine.id)
      const reusableBatch = [...summary.batches]
        .filter(batch => !batch.isExpired)
        .sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime())[0]
      applyBatchDefaults(reusableBatch, medicine.tabletsPerStrip)
    } catch {
      applyBatchDefaults(undefined, medicine.tabletsPerStrip)
    }
  }

  const clearExistingMedicine = () => {
    setSelectedExisting(null)
    setForm(BLANK)
    setStock(BLANK_STOCK)
    setAddStock(false)
  }

  const stockPayload = () => {
    const isSetup = (settings?.firstTimeSetupEnabled ?? true) && stock.entryMode === 'setup'
    const remaining = Math.max(0, stock.remainingQuantity)
    return {
      batchNumber: stock.batchNumber || undefined,
      quantity: isSetup ? Math.max(1, remaining) : stock.quantity,
      totalPurchasedQuantity: isSetup ? Math.max(1, stock.totalPurchasedQuantity) : undefined,
      totalSoldQuantity: isSetup ? Math.max(0, stock.totalSoldQuantity) : undefined,
      remainingQuantity: isSetup ? remaining : undefined,
      purchasePrice: stock.purchasePrice,
      sellingPrice: stock.sellingPrice,
      mrp: stock.mrp > 0 ? stock.mrp : undefined,
      tabletsPerStrip: stock.tabletsPerStrip > 1 ? stock.tabletsPerStrip : undefined,
      expiryDate: stock.expiryDate,
      manufactureDate: stock.manufactureDate || undefined,
      rackLocationId: stock.rackLocationId || undefined,
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!isEdit && selectedExisting) {
        await medicinesApi.addBatch(tenantId, selectedExisting.id, stockPayload())
        return selectedExisting
      }

      if (!isEdit) {
        // Dedup check: see if a medicine with same name already exists
        const existing = form.name ? await medicinesApi.findByName(tenantId, form.name) : null
        if (existing) {
          // Medicine exists — just add stock batch if requested, otherwise warn
          if (addStock && stock.expiryDate && stock.quantity > 0) {
            await medicinesApi.addBatch(tenantId, existing.id, stockPayload())
            return existing
          } else {
            throw new Error(`"${form.name}" already exists. Enable "Add Opening Stock" to add stock to the existing record.`)
          }
        }
      }

      // Normal create/update
      const medicine = await (isEdit
        ? medicinesApi.update(tenantId, id!, form)
        : medicinesApi.create(tenantId, form))

      // Add opening stock for new medicine
      if (!isEdit && addStock && stock.expiryDate && stock.quantity > 0) {
        await medicinesApi.addBatch(tenantId, medicine.id, stockPayload())
      }
      return medicine
    },
    onSuccess: (med) => {
      queryClient.invalidateQueries({ queryKey: ['medicines', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['medicine', tenantId, med?.id] })
      const wasDedup = !isEdit && med?.name === form.name
      toast.success(isEdit ? 'Medicine updated!' : (wasDedup || selectedExisting ? `Batch added to "${med.name}"!` : 'Medicine created!'))
      navigate('/medicines')
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to save medicine')
    },
  })

  const setField = (field: keyof Medicine, value: any) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); mutation.mutate() }
  const isUsingExisting = !isEdit && !!selectedExisting
  const firstTimeSetupEnabled = settings?.firstTimeSetupEnabled ?? true

  if (isEdit && isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Medicine' : 'Add Medicine'}
        subtitle={isEdit ? form.name : 'Create a new medicine record'}
        action={<Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>}
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-700">Basic Information</h3>

            <Field label="Medicine Name *">
              <input required value={form.name || ''} disabled={isUsingExisting} onChange={(e) => setField('name', e.target.value)}
                className={inputClass} placeholder="e.g. Paracetamol 500mg" />
            </Field>

            {!isEdit && !selectedExisting && (existingMatches?.content?.length ?? 0) > 0 && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Existing medicines</p>
                <div className="space-y-1">
                  {existingMatches!.content.map(medicine => (
                    <button
                      key={medicine.id}
                      type="button"
                      onClick={() => selectExistingMedicine(medicine)}
                      className="w-full text-left rounded-md bg-white px-3 py-2 text-sm hover:bg-blue-100 transition"
                    >
                      <span className="font-medium text-gray-800">{medicine.name}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        {[medicine.genericName, medicine.companyName].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedExisting && (
              <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700 flex items-center justify-between gap-3">
                <span>Adding a new batch to existing medicine: <strong>{selectedExisting.name}</strong></span>
                <button type="button" onClick={clearExistingMedicine} className="text-xs font-medium text-green-800 hover:underline">
                  Change
                </button>
              </div>
            )}

            <Field label="Generic Name">
              <input value={form.genericName || ''} disabled={isUsingExisting} onChange={(e) => setField('genericName', e.target.value)}
                className={inputClass} placeholder="e.g. Acetaminophen" />
            </Field>

            <Field label="Company/Manufacturer *">
              <input required value={form.companyName || ''} disabled={isUsingExisting} onChange={(e) => setField('companyName', e.target.value)}
                className={inputClass} placeholder="e.g. Sun Pharma" />
            </Field>

            <Field label="Barcode">
              <input value={form.barcode || ''} disabled={isUsingExisting} onChange={(e) => setField('barcode', e.target.value)}
                className={inputClass} placeholder="Scan or enter barcode" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select value={form.category || 'Tablet'} disabled={isUsingExisting} onChange={(e) => setField('category', e.target.value)} className={inputClass}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Unit">
                <select value={form.unit || 'Strip'} disabled={isUsingExisting} onChange={(e) => setField('unit', e.target.value)} className={inputClass}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* GST & Stock */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-700">Tax & Stock Settings</h3>

            <div className="grid grid-cols-2 gap-3">
              <Field label="HSN Code">
                <input value={form.hsnCode || ''} disabled={isUsingExisting} onChange={(e) => setField('hsnCode', e.target.value)}
                  className={inputClass} placeholder="e.g. 30049099" />
              </Field>
              <Field label="GST %">
                <select value={String(form.gstPercentage ?? 0)} disabled={isUsingExisting} onChange={(e) => setField('gstPercentage', Number(e.target.value))} className={inputClass}>
                  {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </Field>
            </div>

            <Field label="Min Stock Alert Qty">
              <input type="number" min={0} value={form.minStockAlert ?? 10} disabled={isUsingExisting}
                onChange={(e) => setField('minStockAlert', Number(e.target.value))}
                className={inputClass} />
            </Field>

            <Field label="Description">
              <textarea value={form.description || ''} disabled={isUsingExisting} onChange={(e) => setField('description', e.target.value)}
                className={`${inputClass} resize-none`} rows={3} placeholder="Usage notes, storage conditions..." />
            </Field>

            <Field label="Status">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.isActive ?? true} disabled={isUsingExisting}
                  onChange={(e) => setField('isActive', e.target.checked)} className="w-4 h-4 accent-pharma-600" />
                <span className="text-sm text-gray-700">Active (available for billing)</span>
              </label>
            </Field>
          </div>
        </div>

        {/* Opening Stock — only for new medicines */}
        {!isEdit && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <input type="checkbox" checked={addStock || isUsingExisting} disabled={isUsingExisting} onChange={e => setAddStock(e.target.checked)}
                className="w-4 h-4 accent-pharma-600" />
              <span className="font-semibold text-gray-700 flex items-center gap-2">
                <Package2 className="w-4 h-4 text-pharma-600" /> {isUsingExisting ? 'Add New Batch' : 'Add Opening Stock'}
              </span>
            </label>
            {isUsingExisting && (
              <p className="text-sm text-gray-500 mb-4">
                Medicine details are reused. Enter only this batch's number, expiry, quantity, prices, and rack.
              </p>
            )}
            {(addStock || isUsingExisting) && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {([
                    ['current', 'Current stock only'],
                    ...(firstTimeSetupEnabled ? [['setup', 'First-time totals'] as const] : []),
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setStock(s => ({ ...s, entryMode: mode }))}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                        stock.entryMode === mode
                          ? 'bg-pharma-600 text-white border-pharma-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-pharma-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {firstTimeSetupEnabled && stock.entryMode === 'setup' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border border-amber-100 bg-amber-50 p-3">
                    <Field label="Total Stock Entered *">
                      <input type="number" min={1} value={stock.totalPurchasedQuantity}
                        onChange={e => {
                          const total = Math.max(1, Number(e.target.value))
                          setStock(s => ({
                            ...s,
                            totalPurchasedQuantity: total,
                            totalSoldQuantity: Math.min(s.totalSoldQuantity, total),
                            remainingQuantity: Math.max(0, total - Math.min(s.totalSoldQuantity, total)),
                            quantity: Math.max(1, total),
                          }))
                        }}
                        className={inputClass} />
                    </Field>
                    <Field label="Old Sold Qty *">
                      <input type="number" min={0} max={stock.totalPurchasedQuantity} value={stock.totalSoldQuantity}
                        onChange={e => {
                          const sold = Math.min(Math.max(0, Number(e.target.value)), stock.totalPurchasedQuantity)
                          setStock(s => ({
                            ...s,
                            totalSoldQuantity: sold,
                            remainingQuantity: Math.max(0, s.totalPurchasedQuantity - sold),
                          }))
                        }}
                        className={inputClass} />
                    </Field>
                    <Field label="Current Remaining *">
                      <input type="number" min={0} max={stock.totalPurchasedQuantity} value={stock.remainingQuantity}
                        onChange={e => setStock(s => ({...s, remainingQuantity: Math.min(Math.max(0, Number(e.target.value)), s.totalPurchasedQuantity)}))}
                        className={inputClass} />
                    </Field>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Batch Number">
                  <input value={stock.batchNumber} onChange={e => setStock(s => ({...s, batchNumber: e.target.value}))}
                    className={inputClass} placeholder="Auto-generated if empty" />
                </Field>
                <Field label={stock.entryMode === 'setup' ? 'Current Batch Qty' : 'Quantity *'}>
                  <input type="number" min={1} required={addStock} value={stock.quantity}
                    disabled={stock.entryMode === 'setup'}
                    onChange={e => {
                      const qty = Math.max(1, Number(e.target.value))
                      setStock(s => ({...s, quantity: qty, totalPurchasedQuantity: qty, remainingQuantity: qty}))
                    }}
                    className={inputClass} />
                </Field>
                <Field label="Storage Rack">
                  <select value={stock.rackLocationId} onChange={e => setStock(s => ({...s, rackLocationId: e.target.value}))}
                    className={inputClass}>
                    <option value="">Select rack (optional)</option>
                    {racks.map(rack => (
                      <option key={rack.id} value={rack.id}>{rack.rackName}{rack.rackCode ? ` (${rack.rackCode})` : ''}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Expiry Date *">
                  <input type="date" required={addStock} value={stock.expiryDate}
                    onChange={e => setStock(s => ({...s, expiryDate: e.target.value}))}
                    className={inputClass} />
                </Field>
                <Field label="Purchase Price (₹) *">
                  <input type="number" min={0} step="0.01" required={addStock} value={stock.purchasePrice}
                    onChange={e => setStock(s => ({...s, purchasePrice: Number(e.target.value)}))}
                    className={inputClass} />
                </Field>
                <Field label="Selling Price (₹) *">
                  <input type="number" min={0.01} step="0.01" required={addStock} value={stock.sellingPrice}
                    onChange={e => setStock(s => ({...s, sellingPrice: Number(e.target.value)}))}
                    className={inputClass} />
                </Field>
                <Field label="MRP (₹) — optional">
                  <input type="number" min={0} step="0.01" value={stock.mrp || ''}
                    onChange={e => setStock(s => ({...s, mrp: Number(e.target.value)}))}
                    className={inputClass} placeholder="Max Retail Price per strip/pack" />
                </Field>
                <Field label="Tablets / Capsules per Strip">
                  <input type="number" min={1} step="1" value={stock.tabletsPerStrip}
                    onChange={e => setStock(s => ({...s, tabletsPerStrip: Math.max(1, parseInt(e.target.value) || 1)}))}
                    className={inputClass} placeholder="1 = sell as whole unit" />
                  {stock.tabletsPerStrip > 1 && (settings?.showStripsAndTabs ?? false) && (
                    <p className="text-xs text-pharma-600 mt-1">
                      Purchase price/tab: ₹{stock.purchasePrice > 0 ? (stock.purchasePrice / stock.tabletsPerStrip).toFixed(2) : '0.00'}
                      &nbsp;·&nbsp;Selling price/tab: ₹{stock.sellingPrice > 0 ? (stock.sellingPrice / stock.tabletsPerStrip).toFixed(2) : '0.00'}
                      {stock.mrp > 0 && <>&nbsp;·&nbsp;MRP/tab: ₹{(stock.mrp / stock.tabletsPerStrip).toFixed(2)}</>}
                    </p>
                  )}
                </Field>
                <Field label="Manufacture Date">
                  <input type="date" value={stock.manufactureDate}
                    onChange={e => setStock(s => ({...s, manufactureDate: e.target.value}))}
                    className={inputClass} />
                </Field>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 mt-6">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : (isEdit ? 'Update Medicine' : isUsingExisting ? 'Add Batch' : 'Create Medicine')}
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

const inputClass = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500 bg-white'
