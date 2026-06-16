import { create } from 'zustand'
import type { CartItem, DiscountType, PaymentMode, Medicine, MedicineBatch } from '@/types'
import { calcDiscount } from '@/lib/utils'

/** Simulate FEFO dispatch and return the accurate line total across multiple batches. */
function fefoLineTotal(qty: number, batches: MedicineBatch[]): number {
  let remaining = qty
  let total = 0
  for (const batch of batches) {
    if (remaining <= 0) break
    const take = Math.min(batch.remainingQuantity, remaining)
    total += take * batch.sellingPrice
    remaining -= take
  }
  // If qty exceeds total available (e.g. stale data), charge remainder at last batch price
  if (remaining > 0 && batches.length > 0) {
    total += remaining * batches[batches.length - 1].sellingPrice
  }
  return total
}

interface PosState {
  // Cart
  cartItems: CartItem[]
  // Patient
  patientName: string
  patientPhone: string
  doctorName: string
  // Discount
  discountType: DiscountType
  discountValue: number
  // Payment
  paymentMode: PaymentMode
  amountPaid: number

  // Computed totals (derived)
  subtotal: () => number
  discountAmount: () => number
  taxAmount: () => number
  totalAmount: () => number
  changeAmount: () => number

  // Actions
  addItem: (medicine: Medicine, batches?: MedicineBatch[], qty?: number) => void
  updateQty: (medicineId: string, qty: number) => void
  updateItemPrice: (medicineId: string, customUnitPrice: number | undefined) => void
  removeItem: (medicineId: string) => void
  setDiscount: (type: DiscountType, value: number) => void
  setPaymentMode: (mode: PaymentMode) => void
  setAmountPaid: (amount: number) => void
  setPatient: (name: string, phone: string, doctor: string) => void
  clearCart: () => void
}

export const usePosStore = create<PosState>((set, get) => ({
  cartItems: [],
  patientName: '',
  patientPhone: '',
  doctorName: '',
  discountType: 'FLAT',
  discountValue: 0,
  paymentMode: 'CASH',
  amountPaid: 0,

  subtotal: () =>
    get().cartItems.reduce((sum, item) => sum + item.lineTotal, 0),

  discountAmount: () => {
    const { discountType, discountValue } = get()
    return calcDiscount(get().subtotal(), discountType, discountValue)
  },

  taxAmount: () => {
    const afterDiscount = get().subtotal() - get().discountAmount()
    return get().cartItems.reduce((sum, item) => {
      const itemShare = get().subtotal() > 0 ? item.lineTotal / get().subtotal() : 0
      return sum + afterDiscount * itemShare * (item.gstPercent / 100)
    }, 0)
  },

  totalAmount: () => {
    const sub = get().subtotal()
    const disc = get().discountAmount()
    const tax = get().taxAmount()
    return Math.max(0, sub - disc + tax)
  },

  changeAmount: () => Math.max(0, get().amountPaid - get().totalAmount()),

  addItem: (medicine, batches, qty = 1) => {
    const { cartItems } = get()
    const firstBatch = batches?.[0]
    const tps = firstBatch?.tabletsPerStrip ?? 1
    const unitPrice = firstBatch?.sellingPrice ?? 0
    const existing = cartItems.find((i) => i.medicineId === medicine.id)
    if (existing) {
      set({
        cartItems: cartItems.map((i) => {
          if (i.medicineId !== medicine.id) return i
          const newQty = i.quantity + qty
          const lineTotal = i.customUnitPrice != null
            ? i.customUnitPrice * newQty
            : (i.availableBatches ? fefoLineTotal(newQty, i.availableBatches) : i.unitPrice * newQty)
          return { ...i, quantity: newQty, lineTotal }
        }),
      })
    } else {
      const lineTotal = batches ? fefoLineTotal(qty, batches) : unitPrice * qty
      const newItem: CartItem = {
        medicineId: medicine.id,
        medicineName: medicine.name,
        batchId: firstBatch?.id,
        batchNumber: firstBatch?.batchNumber,
        expiryDate: firstBatch?.expiryDate,
        quantity: qty,
        unitPrice,
        purchasePrice: firstBatch?.purchasePrice ?? 0,
        mrp: firstBatch?.mrp,
        tabletsPerStrip: tps,
        gstPercent: medicine.gstPercentage,
        discountPercent: 0,
        lineTotal,
        availableBatches: batches,
      }
      set({ cartItems: [...cartItems, newItem] })
    }
  },

  updateItemPrice: (medicineId, customUnitPrice) => {
    set({
      cartItems: get().cartItems.map((i) => {
        if (i.medicineId !== medicineId) return i
        const effectivePrice = customUnitPrice != null ? customUnitPrice : i.unitPrice
        return { ...i, customUnitPrice, lineTotal: effectivePrice * i.quantity }
      }),
    })
  },

  updateQty: (medicineId, qty) => {
    if (qty <= 0) return get().removeItem(medicineId)
    set({
      cartItems: get().cartItems.map((i) => {
        if (i.medicineId !== medicineId) return i
        const lineTotal = i.customUnitPrice != null
          ? i.customUnitPrice * qty
          : (i.availableBatches ? fefoLineTotal(qty, i.availableBatches) : i.unitPrice * qty)
        return { ...i, quantity: qty, lineTotal }
      }),
    })
  },

  removeItem: (medicineId) =>
    set({ cartItems: get().cartItems.filter((i) => i.medicineId !== medicineId) }),

  setDiscount: (type, value) => set({ discountType: type, discountValue: value }),

  setPaymentMode: (mode) => set({ paymentMode: mode }),

  setAmountPaid: (amount) => set({ amountPaid: amount }),

  setPatient: (name, phone, doctor) =>
    set({ patientName: name, patientPhone: phone, doctorName: doctor }),

  clearCart: () =>
    set({
      cartItems: [],
      patientName: '',
      patientPhone: '',
      doctorName: '',
      discountType: 'FLAT',
      discountValue: 0,
      paymentMode: 'CASH',
      amountPaid: 0,
    }),
}))
