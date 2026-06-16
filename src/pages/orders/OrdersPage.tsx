import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, Badge, Button } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { medicinesApi } from '@/api/medicines'
import { reportsApi } from '@/api/reports'
import { suppliersApi } from '@/api/purchases'
import { useAuthStore } from '@/store/useAuthStore'
import { formatDate, formatStripStock } from '@/lib/utils'
import { ClipboardList, FileText, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Medicine, PurchaseOrderDraft, PurchaseOrderLine, PurchaseOrderStatus, Supplier } from '@/types'

const statusVariant: Record<PurchaseOrderStatus, 'warning' | 'info' | 'success'> = {
  PENDING: 'warning',
  ORDERED: 'info',
  DELIVERED: 'success',
}

function storageKey(tenantId: string) {
  return `purchase-orders:${tenantId}`
}

function collectionKey(tenantId: string) {
  return `purchase-order-collection:${tenantId}`
}

interface OrderCollection {
  lines: PurchaseOrderLine[]
  supplierId: string
  notes: string
  updatedAt?: string
}

function loadOrders(tenantId: string): PurchaseOrderDraft[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(tenantId)) || '[]')
  } catch {
    return []
  }
}

function saveOrders(tenantId: string, orders: PurchaseOrderDraft[]) {
  localStorage.setItem(storageKey(tenantId), JSON.stringify(orders))
}

function loadCollection(tenantId: string): OrderCollection {
  try {
    return JSON.parse(localStorage.getItem(collectionKey(tenantId)) || '{"lines":[],"supplierId":"","notes":""}')
  } catch {
    return { lines: [], supplierId: '', notes: '' }
  }
}

function saveCollection(tenantId: string, collection: OrderCollection) {
  localStorage.setItem(collectionKey(tenantId), JSON.stringify(collection))
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function OrdersPage() {
  const tenantId = useAuthStore((s) => s.tenantId())!
  const user = useAuthStore((s) => s.user)
  const initialCollection = useMemo(() => loadCollection(tenantId), [tenantId])
  const [orders, setOrders] = useState<PurchaseOrderDraft[]>(() => loadOrders(tenantId))
  const [lines, setLines] = useState<PurchaseOrderLine[]>(() => initialCollection.lines || [])
  const [search, setSearch] = useState('')
  const [qty, setQty] = useState(1)
  const [supplierId, setSupplierId] = useState(initialCollection.supplierId || '')
  const [notes, setNotes] = useState(initialCollection.notes || '')
  const [savedAt, setSavedAt] = useState(initialCollection.updatedAt || '')

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-all', tenantId],
    queryFn: () => suppliersApi.list(tenantId, { size: 100 }),
  })

  const { data: medicines } = useQuery({
    queryKey: ['order-medicine-search', tenantId, search],
    queryFn: () => medicinesApi.list(tenantId, { search, size: 8 }),
    enabled: search.trim().length >= 2,
  })

  const { data: inventory = [] } = useQuery({
    queryKey: ['report-inventory', tenantId],
    queryFn: () => reportsApi.inventory(tenantId),
  })

  const today = new Date()
  const from = new Date(today)
  from.setDate(today.getDate() - 30)
  const fromDate = from.toISOString().split('T')[0]
  const toDate = today.toISOString().split('T')[0]
  const { data: bestSelling = [] } = useQuery({
    queryKey: ['order-best-selling', tenantId, fromDate, toDate],
    queryFn: () => reportsApi.bestSelling(tenantId, fromDate, toDate, 20),
  })

  const selectedSupplier = suppliers?.content?.find(s => s.id === supplierId)
  const inventoryById = useMemo(() => new Map(inventory.map(item => [item.medicineId, item])), [inventory])

  useEffect(() => {
    const updatedAt = new Date().toISOString()
    saveCollection(tenantId, { lines, supplierId, notes, updatedAt })
    setSavedAt(updatedAt)
  }, [lines, notes, supplierId, tenantId])

  const updateOrders = (next: PurchaseOrderDraft[]) => {
    setOrders(next)
    saveOrders(tenantId, next)
  }

  const addMedicine = (medicine: Medicine, reason = 'Manual') => {
    const inv = inventoryById.get(medicine.id)
    setLines(current => {
      const existing = current.find(line => line.medicineId === medicine.id && line.supplierId === supplierId)
      if (existing) {
        return current.map(line => line.id === existing.id ? { ...line, quantity: line.quantity + qty } : line)
      }
      return [
        ...current,
        {
          id: uid(),
          medicineId: medicine.id,
          medicineName: medicine.name,
          quantity: qty,
          supplierId: selectedSupplier?.id,
          supplierName: selectedSupplier?.name,
          currentStock: inv?.remaining ?? medicine.totalStock ?? 0,
          reason,
        },
      ]
    })
    setSearch('')
    setQty(1)
  }

  const addSmartSuggestions = () => {
    const outOfStock = inventory
      .filter(item => item.remaining <= 0)
      .slice(0, 20)
      .map(item => ({
        id: uid(),
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        quantity: Math.max(10, Math.ceil((item.totalSold || 10) * 0.5)),
        supplierId: selectedSupplier?.id,
        supplierName: selectedSupplier?.name,
        currentStock: item.remaining,
        reason: 'Out of stock',
      }))

    const lowStock = inventory
      .filter(item => item.remaining > 0 && item.remaining <= 20)
      .slice(0, 20)
      .map(item => ({
        id: uid(),
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        quantity: Math.max(10, 30 - item.remaining),
        supplierId: selectedSupplier?.id,
        supplierName: selectedSupplier?.name,
        currentStock: item.remaining,
        reason: 'Low stock <= 20',
      }))

    const fastMoving = bestSelling
      .map(item => {
        const inv = inventoryById.get(item.medicineId)
        if (!inv || item.totalQuantity <= 0 || inv.remaining > item.totalQuantity * 1.5) return null
        return {
          id: uid(),
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          quantity: Math.max(10, Math.ceil(item.totalQuantity * 1.25 - inv.remaining)),
          supplierId: selectedSupplier?.id,
          supplierName: selectedSupplier?.name,
          currentStock: inv.remaining,
          reason: `High selling (${item.totalQuantity} sold in 30 days)`,
        }
      })
      .filter(Boolean) as PurchaseOrderLine[]

    const merged = new Map<string, PurchaseOrderLine>()
    ;[...lines, ...outOfStock, ...lowStock, ...fastMoving].forEach(line => {
      const key = `${line.medicineId || line.medicineName}:${line.supplierId || ''}`
      const existing = merged.get(key)
      merged.set(key, existing ? { ...existing, quantity: Math.max(existing.quantity, line.quantity), reason: `${existing.reason}, ${line.reason}` } : line)
    })
    const next = [...merged.values()]
    setLines(next)
    toast.success(next.length === lines.length ? 'No new smart suggestions found' : 'Smart suggestions added')
  }

  const saveCurrentCollection = () => {
    const updatedAt = new Date().toISOString()
    saveCollection(tenantId, { lines, supplierId, notes, updatedAt })
    setSavedAt(updatedAt)
    toast.success('Order collection saved')
  }

  const clearCurrentCollection = () => {
    setLines([])
    setNotes('')
    setSupplierId('')
    toast.success('Current order collection cleared')
  }

  const createOrder = () => {
    if (lines.length === 0) {
      toast.error('Add at least one medicine')
      return
    }
    const order: PurchaseOrderDraft = {
      id: uid(),
      orderNumber: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${orders.length + 1}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      supplierId: selectedSupplier?.id,
      supplierName: selectedSupplier?.name,
      notes,
      lines,
    }
    updateOrders([order, ...orders])
    setLines([])
    setNotes('')
    setSupplierId('')
    saveCollection(tenantId, { lines: [], supplierId: '', notes: '', updatedAt: new Date().toISOString() })
    toast.success('Purchase order created')
  }

  const setStatus = (orderId: string, status: PurchaseOrderStatus) => {
    updateOrders(orders.map(order => order.id === orderId ? { ...order, status } : order))
  }

  const exportOrder = (order: PurchaseOrderDraft) => {
    const grouped = order.lines.reduce<Record<string, PurchaseOrderLine[]>>((acc, line) => {
      const key = line.supplierName || order.supplierName || 'General Order'
      acc[key] = [...(acc[key] || []), line]
      return acc
    }, {})
    const rows = Object.entries(grouped).map(([supplier, supplierLines]) => `
      <h3>${supplier}</h3>
      <table>
        <thead><tr><th>#</th><th>Medicine</th><th>Qty</th><th>Stock</th><th>Reason</th></tr></thead>
        <tbody>${supplierLines.map((line, index) => `
          <tr><td>${index + 1}</td><td>${line.medicineName}</td><td>${line.quantity}</td><td>${line.currentStock ?? '-'}</td><td>${line.reason || ''}</td></tr>
        `).join('')}</tbody>
      </table>
    `).join('')
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>${order.orderNumber}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:28px;color:#111}
        h1{margin:0 0 4px;font-size:22px} h2{margin:0 0 18px;font-size:14px;color:#555;font-weight:400}
        h3{margin:22px 0 8px;font-size:15px}
        table{width:100%;border-collapse:collapse;margin-bottom:14px}
        th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
        th{background:#f4f6f8;text-transform:uppercase;font-size:11px}
        .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0;font-size:12px}
        .footer{margin-top:24px;color:#666;font-size:12px}
        @media print{button{display:none}}
      </style></head><body>
      <button onclick="window.print()">Print / Save PDF</button>
      <h1>${user?.tenantName || 'Purchase Order'}</h1>
      <h2>${order.orderNumber}</h2>
      <div class="meta"><div>Date: ${formatDate(order.createdAt)}</div><div>Status: ${order.status}</div></div>
      ${rows}
      ${order.notes ? `<p class="footer"><strong>Notes:</strong> ${order.notes}</p>` : ''}
      <p class="footer">Generated from Budha Pharma inventory system.</p>
      </body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
  }

  return (
    <div>
      <PageHeader title="Orders" subtitle="Create supplier-ready medicine purchase orders" />

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-pharma-600" />
            <h2 className="font-semibold text-gray-800">Current Order Collection</h2>
          </div>
          <div className="rounded-lg bg-pharma-50 border border-pharma-100 px-4 py-3 text-sm text-pharma-900">
            Keep adding medicines today, tomorrow, or next week. This list is auto-saved and only becomes a purchase order when you click Generate Purchase Order.
            {savedAt && <span className="block text-xs text-pharma-600 mt-1">Last saved: {formatDate(savedAt)}</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_220px] gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search medicine to order..." />
            <input type="number" min={1} value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value) || 1))} className={inputClass} />
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={inputClass}>
              <option value="">Supplier optional</option>
              {suppliers?.content?.map((supplier: Supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </div>

          {medicines && search.trim().length >= 2 && (
            <div className="rounded-lg border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              {medicines.content.length === 0 && <p className="p-3 text-sm text-gray-400">No medicines found</p>}
              {medicines.content.map(medicine => (
                <button key={medicine.id} onClick={() => addMedicine(medicine)} className="w-full text-left p-3 hover:bg-pharma-50 flex items-center justify-between">
                  <span>
                    <span className="font-medium text-sm">{medicine.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{medicine.companyName}</span>
                  </span>
                  <span className="text-xs text-gray-500">{formatStripStock(medicine.totalStock ?? 0, medicine.tabletsPerStrip, true)}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={addSmartSuggestions}>
              <Sparkles className="w-4 h-4" /> Smart Suggestions
            </Button>
            <Button type="button" variant="secondary" onClick={saveCurrentCollection}>
              <Save className="w-4 h-4" /> Save Collection
            </Button>
            {lines.length > 0 && (
              <Button type="button" variant="danger" onClick={clearCurrentCollection}>
                Clear Collection
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-red-50 text-red-700 px-3 py-2">Out of stock: stock is zero or below</div>
            <div className="rounded-lg bg-amber-50 text-amber-700 px-3 py-2">Low stock: remaining stock is 20 or less</div>
            <div className="rounded-lg bg-blue-50 text-blue-700 px-3 py-2">High selling: last 30 days sales are high against stock</div>
          </div>

          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Medicine', 'Qty', 'Stock', 'Supplier', 'Reason', ''].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lines.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">Add medicines manually or use smart suggestions.</td></tr>}
                {lines.map(line => (
                  <tr key={line.id}>
                    <td className="px-3 py-2 font-medium">{line.medicineName}</td>
                    <td className="px-3 py-2"><input type="number" min={1} value={line.quantity} onChange={e => setLines(lines.map(l => l.id === line.id ? { ...l, quantity: Math.max(1, Number(e.target.value) || 1) } : l))} className="w-20 px-2 py-1 border rounded" /></td>
                    <td className="px-3 py-2 text-gray-500">{line.currentStock ?? '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{line.supplierName || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{line.reason}</td>
                    <td className="px-3 py-2 text-right"><button onClick={() => setLines(lines.filter(l => l.id !== line.id))} className="text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <textarea value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClass} resize-none`} rows={2} placeholder="Notes for supplier or distributor..." />
          <Button onClick={createOrder}><Plus className="w-4 h-4" /> Generate Purchase Order</Button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-800">Order Status</h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-[680px] overflow-y-auto">
            {orders.length === 0 && <p className="py-10 text-center text-sm text-gray-400">No purchase orders yet.</p>}
            {orders.map(order => (
              <div key={order.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-800">{order.orderNumber}</p>
                    <p className="text-xs text-gray-400">{formatDate(order.createdAt)} · {order.lines.length} items</p>
                  </div>
                  <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                </div>
                <div className="flex gap-2">
                  <select value={order.status} onChange={e => setStatus(order.id, e.target.value as PurchaseOrderStatus)} className={inputClass}>
                    <option value="PENDING">Pending</option>
                    <option value="ORDERED">Ordered</option>
                    <option value="DELIVERED">Delivered</option>
                  </select>
                  <Button size="sm" variant="secondary" onClick={() => exportOrder(order)}>
                    <FileText className="w-4 h-4" /> PDF
                  </Button>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  {order.lines.slice(0, 4).map(line => <p key={line.id}>{line.medicineName} · Qty {line.quantity}</p>)}
                  {order.lines.length > 4 && <p>+{order.lines.length - 4} more</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500 bg-white'
