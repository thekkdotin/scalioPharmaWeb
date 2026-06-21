import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format currency in Indian Rupee format: ₹1,00,000.00 */
export function formatCurrency(amount: number, symbol = '₹'): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${symbol}${formatted}`
}

/** Format date: DD/MM/YYYY */
export function formatDate(date: string | undefined | null): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), 'dd/MM/yyyy')
  } catch {
    return date
  }
}

/** Format datetime: DD/MM/YYYY HH:mm */
export function formatDateTime(date: string | undefined | null): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), 'dd/MM/yyyy HH:mm')
  } catch {
    return date
  }
}

/** Days until expiry */
export type StockLabelContext = {
  category?: string | null
  unit?: string | null
}

export function getStockUnitLabels(context?: StockLabelContext) {
  const category = context?.category?.toLowerCase() || ''
  const unit = context?.unit?.toLowerCase() || ''
  if (unit === 'sachet') return { pack: 'pack', packs: 'packs', loose: 'sachet', loosePlural: 'sachets' }
  if (category === 'pack' || unit === 'pack' || unit === 'box') {
    return { pack: unit === 'box' ? 'box' : 'pack', packs: unit === 'box' ? 'boxes' : 'packs', loose: 'piece', loosePlural: 'pieces' }
  }
  if (unit === 'piece' || unit === 'pieces') return { pack: 'pack', packs: 'packs', loose: 'piece', loosePlural: 'pieces' }
  return { pack: 'strip', packs: 'strips', loose: 'tab', loosePlural: 'tabs' }
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return value === 1 ? singular : pluralLabel
}

/** Format stock with pack/loose breakdown. Quantities are stored in smallest units. */
function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(/\.?0+$/, '')
}

export function formatStripStock(
  quantity: number | undefined | null,
  tabletsPerStrip?: number | null,
  showBoth = true,
  context?: StockLabelContext
): string {
  const total = Number(quantity ?? 0)
  const tps = tabletsPerStrip && tabletsPerStrip > 1 ? tabletsPerStrip : 1
  if (tps === 1) return `${total}`

  const labels = getStockUnitLabels(context)
  const packs = Math.floor(total / tps)
  const loose = total % tps
  const packLabel = `${packs} ${packs === 1 ? labels.pack : labels.packs}`
  const looseLabel = loose > 0 ? `, ${loose} ${plural(loose, labels.loose, labels.loosePlural)}` : ''
  if (loose > 0) {
    return `${packLabel}${looseLabel} (${total} ${plural(total, labels.loose, labels.loosePlural)})`
  }
  if (!showBoth) {
    const exactPacks = total / tps
    return `${formatNumber(exactPacks)} ${exactPacks === 1 ? labels.pack : labels.packs}`
  }

  return `${packLabel}${looseLabel} (${total} ${plural(total, labels.loose, labels.loosePlural)})`
}

/** Short stock label for compact POS search rows. */
export function formatCompactStripStock(
  quantity: number | undefined | null,
  tabletsPerStrip?: number | null,
  showBoth = true,
  context?: StockLabelContext
): string {
  const total = Number(quantity ?? 0)
  const tps = tabletsPerStrip && tabletsPerStrip > 1 ? tabletsPerStrip : 1
  if (tps === 1) return `${total}`

  const labels = getStockUnitLabels(context)
  const packs = Math.floor(total / tps)
  const loose = total % tps
  if (loose > 0) {
    return `${packs} ${packs === 1 ? labels.pack : labels.packs}, ${loose} ${plural(loose, labels.loose, labels.loosePlural)} (${total} ${plural(total, labels.loose, labels.loosePlural)})`
  }
  if (!showBoth) {
    const exactPacks = total / tps
    return `${formatNumber(exactPacks)} ${exactPacks === 1 ? labels.pack : labels.packs}`
  }

  const breakdown = loose > 0
    ? `${packs} ${packs === 1 ? labels.pack : labels.packs}, ${loose} ${plural(loose, labels.loose, labels.loosePlural)}`
    : `${packs} ${packs === 1 ? labels.pack : labels.packs}`
  return `${breakdown} (${total} ${plural(total, labels.loose, labels.loosePlural)})`
}

export function daysUntilExpiry(expiryDate: string): number {
  const today = new Date()
  const expiry = parseISO(expiryDate)
  const diffMs = expiry.getTime() - today.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

/** Color coding for expiry */
export function expiryBadgeClass(expiryDate: string): string {
  const days = daysUntilExpiry(expiryDate)
  if (days < 0)  return 'bg-red-100 text-red-800'
  if (days <= 30) return 'bg-red-100 text-red-800'
  if (days <= 90) return 'bg-amber-100 text-amber-800'
  return 'bg-green-100 text-green-800'
}

/** Generate invoice preview HTML for printing */
export function triggerPrint() {
  window.print()
}

/** Truncate text */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/** Calculate discount amount */
export function calcDiscount(
  subtotal: number,
  discountType: 'PERCENTAGE' | 'FLAT',
  discountValue: number
): number {
  if (discountType === 'PERCENTAGE') {
    return (subtotal * discountValue) / 100
  }
  return Math.min(discountValue, subtotal)
}
