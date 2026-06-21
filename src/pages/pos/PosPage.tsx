import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { medicinesApi } from '@/api/medicines'
import { salesApi, type CreateSalePayload } from '@/api/sales'
import { apiClient, tenantPath } from '@/api/client'
import { useAuthStore } from '@/store/useAuthStore'
import { usePosStore } from '@/store/usePosStore'
import { formatCompactStripStock, formatCurrency, getStockUnitLabels, type StockLabelContext } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Trash2, Plus, Minus, Printer, ShoppingCart, X, Percent, IndianRupee, Check, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Medicine, PaymentMode, TenantSettings, ApiResponse } from '@/types'


export default function PosPage() {
  const tenantId = useAuthStore((s) => s.tenantId())!
  const user = useAuthStore((s) => s.user)
  const maxDiscount = user?.maxStaffDiscountPercent ?? 100

  const queryClient = useQueryClient()
  const store = usePosStore()
  const cartItems = store.cartItems
  const discountType = store.discountType
  const discountValue = store.discountValue
  const paymentMode = store.paymentMode
  const amountPaid = store.amountPaid
  const patientName = store.patientName
  const patientPhone = store.patientPhone
  const doctorName = store.doctorName
  // Derived (computed functions in store)
  const subtotal = store.subtotal()
  const discountAmount = store.discountAmount()
  const taxAmount = store.taxAmount()
  const totalAmount = store.totalAmount()
  const changeAmount = store.changeAmount()

  // Effective paid amount sent to backend:
  // UPI/CARD pay the full total; CASH and CREDIT use the entered value (may be partial / 0).
  const effectiveAmountPaid =
    paymentMode === 'UPI' || paymentMode === 'CARD' ? totalAmount
    : amountPaid
  // Anything not covered is owed by the customer (credit / partial payment)
  const balanceDue = Math.max(0, totalAmount - effectiveAmountPaid)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [saleCreated, setSaleCreated] = useState<any>(null)
  const invoiceRef = useRef<HTMLDivElement>(null)
  // Map medicineId → raw price string being edited
  const [priceEditMap, setPriceEditMap] = useState<Record<string, string | undefined>>({})

  // Fetch tenant settings for loose-sale toggle
  const { data: settings } = useQuery({
    queryKey: ['settings', tenantId],
    queryFn: () => apiClient.get<ApiResponse<TenantSettings>>(`${tenantPath(tenantId)}/settings`).then(r => r.data.data),
    staleTime: 60_000,
  })
  const allowLooseSale = settings?.allowLooseSale ?? true
  const showBothStockAndTabPrice = settings?.showStripsAndTabs ?? false

  const priceInfo = (pricePerTab: number | undefined, tps: number, label: string, context?: StockLabelContext) => {
    if (pricePerTab == null) return null
    if (tps > 1) {
      const stripPrice = pricePerTab * tps
      const labels = getStockUnitLabels(context)
      return (
        <span className="text-xs text-gray-500">
          {label}: {formatCurrency(stripPrice)}/{labels.pack}
          {showBothStockAndTabPrice && <span className="text-gray-400"> ({formatCurrency(pricePerTab)}/{labels.loose})</span>}
        </span>
      )
    }
    return <span className="text-xs text-gray-500">{label}: {formatCurrency(pricePerTab)}</span>
  }

  const salePriceLabel = (pricePerTab: number, tps: number, context?: StockLabelContext) => {
    if (tps <= 1) return formatCurrency(pricePerTab)
    const labels = getStockUnitLabels(context)
    const stripLabel = `${formatCurrency(pricePerTab * tps)}/${labels.pack}`
    return showBothStockAndTabPrice
      ? `${stripLabel} (${formatCurrency(pricePerTab)}/${labels.loose})`
      : stripLabel
  }

  // Debounce medicine search — prevents an API call on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (allowLooseSale) return
    cartItems.forEach((item) => {
      const tps = item.tabletsPerStrip ?? 1
      if (tps > 1 && item.quantity % tps !== 0) {
        store.updateQty(item.medicineId, Math.ceil(item.quantity / tps) * tps)
      }
    })
  }, [allowLooseSale, cartItems, store])

  const { data: medicines, isFetching } = useQuery({
    queryKey: ['medicines-search', tenantId, debouncedSearch],
    queryFn: () => medicinesApi.list(tenantId, { search: debouncedSearch, size: 10 }),
    enabled: debouncedSearch.length >= 2,
  })

  const createSaleMutation = useMutation({
    mutationFn: (payload: CreateSalePayload) => salesApi.create(tenantId, payload),
    onSuccess: (sale) => {
      setSaleCreated(sale)
      store.clearCart()
      toast.success(`Invoice ${sale.invoiceNumber} created!`)
      // Stock and dashboard figures changed — refetch them instead of showing stale data
      queryClient.invalidateQueries({ queryKey: ['dashboard', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['sales', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['medicines-search', tenantId] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create sale')
    },
  })

  const handlePrint = () => {
    if (!saleCreated) return
    const win = window.open('', '_blank', 'width=420,height=680')
    if (!win) return
    const items = (saleCreated.items ?? []).map((item: any) => {
      const batchInfo = [
        item.batchNumber ? `Batch: ${item.batchNumber}` : '',
        item.expiryDate ? `Exp: ${item.expiryDate}` : '',
      ].filter(Boolean).join(' · ')
      return `<tr>
        <td>
          <div>${item.medicineName}</div>
          ${batchInfo ? `<div style="font-size:9px;color:#888;font-family:monospace">${batchInfo}</div>` : ''}
        </td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">₹${Number(item.totalAmount).toFixed(2)}</td>
      </tr>`
    }).join('')
    const change = saleCreated.changeAmount > 0
      ? `<tr><td>Change</td><td></td><td style="text-align:right">₹${Number(saleCreated.changeAmount).toFixed(2)}</td></tr>` : ''
    const balance = saleCreated.balanceDue > 0
      ? `<tr><td><strong>Balance Due</strong></td><td></td><td style="text-align:right"><strong>₹${Number(saleCreated.balanceDue).toFixed(2)}</strong></td></tr>` : ''
    win.document.write(`<!DOCTYPE html><html><head><title>Invoice - ${saleCreated.invoiceNumber}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:12px;margin:0;padding:16px;max-width:300px}
      h2{text-align:center;margin:0 0 4px;font-size:14px}
      .center{text-align:center;color:#555;font-size:11px}
      table{width:100%;border-collapse:collapse;margin:8px 0}
      th{background:#f5f5f5;padding:4px 6px;text-align:left;font-size:11px}
      td{padding:3px 6px;border-bottom:1px solid #eee}
      .totals td{border:none;padding:2px 6px}
      .grand td{font-weight:bold;font-size:13px;padding:4px 6px;border-top:2px solid #333}
      .footer{text-align:center;color:#888;font-size:10px;margin-top:10px}
      @media print{@page{size:80mm auto;margin:0}body{padding:8px}}
    </style></head><body>
    <h2>${user?.tenantName ?? 'Pharmacy'}</h2>
    <p class="center">Invoice: <strong>${saleCreated.invoiceNumber}</strong></p>
    <p class="center">${new Date().toLocaleString()}</p>
    <hr/>
    <table><thead><tr><th>Item</th><th>Qty</th><th style="text-align:right">Amt</th></tr></thead>
    <tbody>${items}</tbody></table>
    <hr/>
    <table class="totals">
      <tr><td>Subtotal</td><td></td><td style="text-align:right">₹${Number(saleCreated.subtotal).toFixed(2)}</td></tr>
      ${saleCreated.discountAmount > 0 ? `<tr><td>Discount</td><td></td><td style="text-align:right">-₹${Number(saleCreated.discountAmount).toFixed(2)}</td></tr>` : ''}
      <tr><td>GST</td><td></td><td style="text-align:right">₹${Number(saleCreated.taxAmount).toFixed(2)}</td></tr>
    </table>
    <table class="totals grand"><tr><td>Total</td><td></td><td style="text-align:right">₹${Number(saleCreated.totalAmount).toFixed(2)}</td></tr></table>
    <table class="totals"><tr><td>Paid (${saleCreated.paymentMode})</td><td></td><td style="text-align:right">₹${Number(saleCreated.amountPaid).toFixed(2)}</td></tr>${change}${balance}</table>
    <p class="footer">Thank you! Get well soon.</p>
    </body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); setTimeout(() => win.close(), 500) }, 300)
  }

  const handleCheckout = () => {
    if (cartItems.length === 0) { toast.error('Cart is empty'); return }
    if (discountType === 'PERCENTAGE' && discountValue > maxDiscount) {
      toast.error(`Max allowed discount is ${maxDiscount}%`)
      return
    }
    const payload: CreateSalePayload = {
      patientName: patientName || undefined,
      patientPhone: patientPhone || undefined,
      doctorName: doctorName || undefined,
      paymentMode: paymentMode,
      discountType: discountType,
      discountValue: discountValue,
      discountAmount: discountAmount,
      amountPaid: effectiveAmountPaid,
      items: cartItems.map(i => ({
        medicineId: i.medicineId,
        quantity: i.quantity,
        // Do not send batchId — let backend do full multi-batch FEFO
        discountPercent: i.discountPercent,
        customUnitPrice: i.customUnitPrice != null && i.customUnitPrice !== i.unitPrice
          ? i.customUnitPrice : undefined,
      })),
    }
    createSaleMutation.mutate(payload)
  }

  const handleBarcodeSearch = async () => {
    if (!search.trim()) return
    try {
      const med = await medicinesApi.getByBarcode(tenantId, search.trim())
      const qty = allowLooseSale ? 1 : Math.max(1, med.tabletsPerStrip ?? 1)
      store.addItem(med, undefined, qty)
      setSearch('')
    } catch {
      // not a barcode, let normal search handle
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Left: Product Search + Cart */}
      <div className="flex-1 flex flex-col gap-4">
        <PageHeader title="Billing / POS" subtitle="Point of Sale" />

        {/* Search bar */}
        <div className="flex gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search medicine, rack number, or scan barcode..."
            className="flex-1"
            onEnter={handleBarcodeSearch}
            autoFocus
          />
        </div>

        {/* Search results dropdown */}
        {search.length >= 2 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-lg divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {isFetching && (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            )}
            {!isFetching && medicines?.content?.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No medicines found</p>
            )}
            {medicines?.content?.map((med: Medicine) => (
              <button
                key={med.id}
                onClick={async () => {
                  try {
                    const summary = await medicinesApi.getById(tenantId, med.id)
                    // Pass all FEFO-sorted batches so the store can calculate accurate multi-batch pricing
                    const fefoSortedBatches = summary.batches
                      .filter(b => !b.isExpired && b.remainingQuantity > 0)
                      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                    const tps = fefoSortedBatches[0]?.tabletsPerStrip ?? summary.medicine.tabletsPerStrip ?? 1
                    const qty = allowLooseSale ? 1 : Math.max(1, tps)
                    store.addItem(summary.medicine, fefoSortedBatches, qty)
                  } catch {
                    const qty = allowLooseSale ? 1 : Math.max(1, med.tabletsPerStrip ?? 1)
                    store.addItem(med, undefined, qty)
                  }
                  setSearch('')
                }}
                className="w-full flex flex-col px-4 py-3 hover:bg-pharma-50 text-left transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{med.name}</p>
                    <p className="text-xs text-gray-400">{med.genericName} • {med.companyName}</p>
                    {(med.rackLocations?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {med.rackLocations!.slice(0, 3).map((rack) => (
                          <span key={rack} className="text-[11px] font-mono bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded">
                            Rack: {rack}
                          </span>
                        ))}
                        {med.rackLocations!.length > 3 && (
                          <span className="text-[11px] text-gray-400">+{med.rackLocations!.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Stock: {formatCompactStripStock(med.totalStock ?? 0, med.tabletsPerStrip, showBothStockAndTabPrice, med)}
                    </p>
                    <Plus className="w-4 h-4 text-pharma-600 ml-auto" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Cart */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-700 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Cart ({cartItems.length} items)
            </span>
            {cartItems.length > 0 && (
              <button onClick={() => store.clearCart()} className="text-xs text-red-500 hover:underline">
                Clear all
              </button>
            )}
          </div>

          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <ShoppingCart className="w-12 h-12 mb-2" />
              <p className="text-sm">Cart is empty. Search medicines above.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 overflow-y-auto max-h-[350px]">
              {cartItems.map((item) => {
                const tps = item.tabletsPerStrip ?? 1
                const displayPrice = item.customUnitPrice ?? item.unitPrice
                const rawPriceInput = priceEditMap[item.medicineId]
                const strips = Math.floor(item.quantity / tps)
                const looseTabs = item.quantity % tps
                const labels = getStockUnitLabels(item)

                return (
                <div key={item.medicineId} className="flex flex-col px-4 py-3 gap-1.5">
                  {/* Top row: name + qty controls + trash */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.medicineName}</p>

                      {/* Per-unit price details */}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {priceInfo(item.purchasePrice, tps, 'Cost', item)}
                        {priceInfo(item.unitPrice, tps, 'Sell', item)}
                        {item.mrp != null && (
                          <span className="text-xs text-amber-600">
                            MRP: {tps > 1 ? `${formatCurrency(item.mrp * tps)}/${labels.pack}` : formatCurrency(item.mrp)}
                            {showBothStockAndTabPrice && tps > 1 && <span className="text-amber-500"> ({formatCurrency(item.mrp)}/{labels.loose})</span>}
                          </span>
                        )}
                        {showBothStockAndTabPrice && tps > 1 && (
                          <span className="text-xs font-medium bg-pharma-50 text-pharma-600 px-1.5 py-0.5 rounded">
                            {tps} {labels.loosePlural}/{labels.pack}
                          </span>
                        )}
                      </div>

                      {(item.batchNumber || item.expiryDate) && (
                        <p className="text-xs text-pharma-600 mt-0.5 font-mono">
                          {item.batchNumber && <span>Batch: {item.batchNumber}</span>}
                          {item.batchNumber && item.expiryDate && <span className="mx-1">·</span>}
                          {item.expiryDate && <span>Exp: {item.expiryDate}</span>}
                        </p>
                      )}
                    </div>

                    {/* Qty controls */}
                    <div className="flex flex-col items-end gap-1">
                      {tps > 1 ? (
                        /* Strip counter + loose tab counter */
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500 w-10 text-right capitalize">{labels.pack}</span>
                            <button
                              onClick={() => {
                                if (strips <= 0) return
                                const newQty = (strips - 1) * tps + (allowLooseSale ? looseTabs : 0)
                                if (newQty <= 0) store.removeItem(item.medicineId)
                                else store.updateQty(item.medicineId, newQty)
                              }}
                              className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-red-50"
                            ><Minus className="w-3 h-3" /></button>
                            <span className="w-6 text-center text-sm font-bold">{strips}</span>
                            <button
                              onClick={() => store.updateQty(item.medicineId, (strips + 1) * tps + (allowLooseSale ? looseTabs : 0))}
                              className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-pharma-50"
                            ><Plus className="w-3 h-3" /></button>
                          </div>
                          {allowLooseSale && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-500 w-10 text-right capitalize">{labels.loose}</span>
                              <button
                                onClick={() => {
                                  if (item.quantity <= 1) return store.removeItem(item.medicineId)
                                  store.updateQty(item.medicineId, item.quantity - 1)
                                }}
                                className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-red-50"
                              ><Minus className="w-3 h-3" /></button>
                              <span className="w-6 text-center text-sm font-bold">{looseTabs}</span>
                              <button
                                onClick={() => store.updateQty(item.medicineId, item.quantity + 1)}
                                className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-pharma-50"
                              ><Plus className="w-3 h-3" /></button>
                            </div>
                          )}
                          {showBothStockAndTabPrice && (
                            <span className="text-xs text-gray-400 pr-0.5">{item.quantity} {labels.loosePlural} total</span>
                          )}
                        </>
                      ) : (
                        /* Standard integer qty */
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => store.updateQty(item.medicineId, item.quantity - 1)}
                            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                          ><Minus className="w-3 h-3" /></button>
                          <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => store.updateQty(item.medicineId, item.quantity + 1)}
                            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                          ><Plus className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>

                    <button onClick={() => store.removeItem(item.medicineId)} className="text-gray-300 hover:text-red-500 transition mt-0.5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Price + total row */}
                  <div className="flex items-center gap-2 pl-0">
                    {rawPriceInput !== undefined ? (
                      /* Editing price */
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">₹</span>
                        <input
                          type="number"
                          min={0.01}
                          step="0.01"
                          value={rawPriceInput}
                          autoFocus
                          onChange={e => setPriceEditMap(m => ({ ...m, [item.medicineId]: e.target.value }))}
                          onBlur={() => {
                            const parsed = parseFloat(rawPriceInput ?? '')
                            if (!isNaN(parsed) && parsed > 0) {
                              store.updateItemPrice(item.medicineId, parsed)
                            }
                            setPriceEditMap(m => ({ ...m, [item.medicineId]: undefined }))
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                            if (e.key === 'Escape') {
                              store.updateItemPrice(item.medicineId, undefined)
                              setPriceEditMap(m => ({ ...m, [item.medicineId]: undefined }))
                            }
                          }}
                          className="w-20 text-sm border border-pharma-400 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-pharma-500"
                        />
                        <span className="text-xs text-gray-400">× {item.quantity} = {formatCurrency(displayPrice * item.quantity)}</span>
                      </div>
                    ) : (
                      /* Display price */
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPriceEditMap(m => ({ ...m, [item.medicineId]: String(displayPrice) }))}
                          className="flex items-center gap-1 text-xs text-gray-600 hover:text-pharma-700 group"
                          title="Click to set custom price"
                        >
                          {item.customUnitPrice != null ? (
                            <span className="font-semibold text-pharma-700">
                              {salePriceLabel(displayPrice, tps, item)}
                            </span>
                          ) : (
                            <span>{salePriceLabel(displayPrice, tps, item)}</span>
                          )}
                          <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-pharma-500" />
                        </button>
                        <span className="text-xs text-gray-400">× {item.quantity} = <span className="font-semibold text-gray-700">{formatCurrency(item.lineTotal)}</span></span>
                        {item.customUnitPrice != null && (
                          <button
                            onClick={() => { store.updateItemPrice(item.medicineId, undefined); setPriceEditMap(m => ({ ...m, [item.medicineId]: undefined })) }}
                            className="text-xs text-red-400 hover:text-red-600"
                            title="Reset to batch price"
                          >reset</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Checkout panel */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Patient info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm">Patient Details</h3>
          <input
            type="text" placeholder="Patient name (optional)"
            value={patientName} onChange={(e) => store.setPatient(e.target.value, patientPhone, doctorName)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500"
          />
          <input
            type="tel" placeholder="Phone (optional)"
            value={patientPhone} onChange={(e) => store.setPatient(patientName, e.target.value, doctorName)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500"
          />
          <input
            type="text" placeholder="Doctor name (optional)"
            value={doctorName} onChange={(e) => store.setPatient(patientName, patientPhone, e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500"
          />
        </div>

        {/* Bill summary */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm">Bill Summary</h3>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>

          {/* Discount toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 flex-1">Discount</span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => store.setDiscount('FLAT', discountValue)}
                  className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition ${
                    discountType === 'FLAT' ? 'bg-pharma-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <IndianRupee className="w-3 h-3" /> Flat
                </button>
                <button
                  onClick={() => store.setDiscount('PERCENTAGE', discountValue)}
                  className={`px-2 py-1 text-xs font-medium flex items-center gap-1 transition ${
                    discountType === 'PERCENTAGE' ? 'bg-pharma-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Percent className="w-3 h-3" /> %
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="number" min={0}
                max={discountType === 'PERCENTAGE' ? maxDiscount : subtotal}
                step="0.01"
                value={discountValue}
                onChange={(e) => store.setDiscount(discountType, Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500 pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                {discountType === 'PERCENTAGE' ? `% (max ${maxDiscount}%)` : '₹'}
              </span>
            </div>
            {discountAmount > 0 && (
              <p className="text-xs text-green-600">- {formatCurrency(discountAmount)} discount applied</p>
            )}
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">GST</span>
            <span className="font-medium">+ {formatCurrency(taxAmount)}</span>
          </div>

          <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
            <span>Total</span>
            <span className="text-pharma-700">{formatCurrency(totalAmount)}</span>
          </div>

          {/* Payment mode */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {(['CASH', 'UPI', 'CARD', 'CREDIT'] as PaymentMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  store.setPaymentMode(m)
                  // Auto-set amount paid based on mode
                  if (m === 'UPI' || m === 'CARD') {
                    store.setAmountPaid(totalAmount)
                  } else if (m === 'CREDIT') {
                    store.setAmountPaid(0)   // default: nothing paid upfront (editable below)
                  }
                  // CASH: leave amountPaid for the user to enter
                }}
                className={`py-1.5 text-xs font-medium rounded-lg border transition ${
                  paymentMode === m ? 'bg-pharma-600 text-white border-pharma-600' : 'bg-white border-gray-200 text-gray-600 hover:border-pharma-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Amount paid */}
          {paymentMode === 'CASH' || paymentMode === 'CREDIT' ? (
            <div className="space-y-1">
              <label className="text-sm text-gray-500">
                Amount Paid (₹){paymentMode === 'CREDIT' && <span className="text-gray-400"> — optional upfront</span>}
              </label>
              <input
                type="number" min={0} step="0.01"
                value={amountPaid}
                onChange={(e) => store.setAmountPaid(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500"
              />
              {changeAmount > 0 && (
                <p className="text-xs font-semibold text-blue-600">Change: {formatCurrency(changeAmount)}</p>
              )}
              {balanceDue > 0 && (
                <p className="text-xs font-semibold text-amber-600">Balance due: {formatCurrency(balanceDue)}</p>
              )}
            </div>
          ) : (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount Paid ({paymentMode})</span>
              <span className="font-semibold text-green-600">{formatCurrency(effectiveAmountPaid)}</span>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={cartItems.length === 0 || createSaleMutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-pharma-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-pharma-700 transition disabled:opacity-60 mt-2"
          >
            {createSaleMutation.isPending ? <LoadingSpinner size="sm" /> : <Check className="w-5 h-5" />}
            {createSaleMutation.isPending ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </div>

      {/* Invoice print area (hidden) */}
      {saleCreated && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSaleCreated(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                <span className="font-semibold">Sale Complete!</span>
              </div>
              <button onClick={() => setSaleCreated(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {/* Invoice preview */}
            <div ref={invoiceRef} className="border border-gray-200 rounded-lg p-4 text-sm print:border-none">
              <div className="text-center mb-3">
                <p className="font-bold text-base">{user?.tenantName}</p>
                <p className="text-gray-500 text-xs">Invoice: {saleCreated.invoiceNumber}</p>
              </div>
              <hr className="my-2" />
              {saleCreated.items?.map((item: any) => (
                <div key={item.id} className="py-1 border-b border-gray-50 last:border-0">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{item.medicineName} × {item.quantity}</span>
                    <span>{formatCurrency(item.totalAmount)}</span>
                  </div>
                  {(item.batchNumber || item.expiryDate) && (
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {item.batchNumber && `Batch: ${item.batchNumber}`}
                      {item.batchNumber && item.expiryDate && ' · '}
                      {item.expiryDate && `Exp: ${item.expiryDate}`}
                    </p>
                  )}
                </div>
              ))}
              <hr className="my-2" />
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(saleCreated.subtotal)}</span></div>
                {saleCreated.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span><span>- {formatCurrency(saleCreated.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between"><span>GST</span><span>{formatCurrency(saleCreated.taxAmount)}</span></div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t">
                  <span>Total</span><span>{formatCurrency(saleCreated.totalAmount)}</span>
                </div>
                <div className="flex justify-between"><span>Paid</span><span>{formatCurrency(saleCreated.amountPaid)}</span></div>
                {saleCreated.changeAmount > 0 && (
                  <div className="flex justify-between"><span>Change</span><span>{formatCurrency(saleCreated.changeAmount)}</span></div>
                )}
                {saleCreated.balanceDue > 0 && (
                  <div className="flex justify-between font-semibold text-amber-600"><span>Balance Due</span><span>{formatCurrency(saleCreated.balanceDue)}</span></div>
                )}
              </div>
              <p className="text-center text-xs text-gray-400 mt-4">Thank you! Get well soon.</p>
            </div>

            <button
              onClick={handlePrint}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-gray-800 text-white py-3 rounded-lg font-semibold hover:bg-gray-900"
            >
              <Printer className="w-4 h-4" /> Print Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
