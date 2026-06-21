import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
/** Format currency in Indian Rupee format: INR symbol + 1,00,000.00 */
export function formatCurrency(amount: number, symbol = '\u20B9'): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${symbol}${formatted}`
}
/** Clean text that was previously rendered with mojibake separators/symbols. */
export function cleanDisplayText(value: string | undefined | null, fallback = ''): string {
  if (!value) return fallback
  return value
    .replace(/ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·|ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·|Ãƒâ€šÃ‚Â·/g, ' - ')
    .replace(/ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢|ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢|ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢/g, ' - ')
    .replace(/ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â|ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â|ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â/g, '-')
    .replace(/ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦|ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦|ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦/g, '...')
    .replace(/ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹|ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¹|ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¹|Ã¢â€šÂ¹/g, '\u20B9')
    .replace(/\s+-\s+-\s+/g, ' - ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Format date: DD/MM/YYYY */
export function formatDate(date: string | undefined | null): string {
  if (!date) return '-'
  try {
    return format(parseISO(date), 'dd/MM/yyyy')
  } catch {
    return date
  }
}

/** Format datetime: DD/MM/YYYY HH:mm */
export function formatDateTime(date: string | undefined | null): string {
  if (!date) return '-'
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

  if (category === 'capsule') {
    return { pack: 'strip', packs: 'strips', loose: 'capsule', loosePlural: 'capsules' }
  }
  if (category === 'tablet' || unit === 'strip') {
    return { pack: 'strip', packs: 'strips', loose: 'tab', loosePlural: 'tabs' }
  }
  if (category === 'injection' || unit === 'vial' || unit === 'vials') {
    return { pack: 'box', packs: 'boxes', loose: 'vial', loosePlural: 'vials' }
  }
  if (category === 'syrup' || unit === 'bottle' || unit === 'bottles') {
    return { pack: 'box', packs: 'boxes', loose: 'bottle', loosePlural: 'bottles' }
  }
  if (category === 'ointment' || unit === 'tube' || unit === 'tubes') {
    return { pack: 'box', packs: 'boxes', loose: 'tube', loosePlural: 'tubes' }
  }
  if (category === 'drops') {
    return { pack: 'box', packs: 'boxes', loose: 'bottle', loosePlural: 'bottles' }
  }
  if (category === 'powder' || unit === 'sachet' || unit === 'sachets') {
    return { pack: 'pack', packs: 'packs', loose: 'sachet', loosePlural: 'sachets' }
  }
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

  const labels = getStockUnitLabels(context)
  if (tps === 1) return `${total} ${plural(total, labels.loose, labels.loosePlural)}`
  const packs = Math.floor(total / tps)
  const loose = total % tps
  const packLabel = `${packs} ${packs === 1 ? labels.pack : labels.packs}`
  const looseLabel = loose > 0 ? `, ${loose} ${plural(loose, labels.loose, labels.loosePlural)}` : ''
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

  const labels = getStockUnitLabels(context)
  if (tps === 1) return `${total} ${plural(total, labels.loose, labels.loosePlural)}`
  const packs = Math.floor(total / tps)
  const loose = total % tps
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
