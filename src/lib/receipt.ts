import type { Sale, Tenant, TenantSettings } from '@/types'

type ReceiptOptions = {
  sale: Sale
  tenant?: Tenant
  settings?: TenantSettings
}

export function formatReceiptQuantity(quantity: number, unitsPerPack = 1): string {
  const total = Number(quantity || 0)
  const packSize = Number(unitsPerPack || 1)
  if (packSize <= 1) return `${total} unit${total === 1 ? '' : 's'}`

  const packs = Math.floor(total / packSize)
  const loose = total % packSize
  const parts: string[] = []
  if (packs > 0) parts.push(`${packs} strip${packs === 1 ? '' : 's'}`)
  if (loose > 0) parts.push(`${loose} tab${loose === 1 ? '' : 's'}`)
  return parts.length > 0 ? parts.join(' ') : '0 tabs'
}

export function printReceipt(options: ReceiptOptions) {
  const win = window.open('', '_blank', 'width=920,height=760')
  if (!win) return false
  win.document.write(buildReceiptHtml(options))
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
  return true
}

export function downloadReceipt(options: ReceiptOptions) {
  const html = buildReceiptHtml(options)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safeFilename(options.sale.invoiceNumber)}-receipt.html`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function buildReceiptHtml({ sale, tenant, settings }: ReceiptOptions): string {
  const thermal = settings?.thermalPrinterEnabled ?? false
  const currency = settings?.currencySymbol || '\u20B9'
  const address = [
    tenant?.address,
    [tenant?.city, tenant?.state, tenant?.pincode].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ')
  const items = (sale.items ?? []).map((item, index) => `
    <tr>
      <td class="num">${index + 1}</td>
      <td>
        <div class="item-name">${escapeHtml(item.medicineName)}</div>
        ${item.expiryDate ? `<div class="muted">Exp ${formatDate(item.expiryDate)}</div>` : ''}
      </td>
      <td>${escapeHtml(formatReceiptQuantity(item.quantity, item.tabletsPerStrip))}</td>
      <td class="right">${money(item.unitPrice, currency)}</td>
      <td class="right">${number(item.gstPercent)}%</td>
      <td class="right strong">${money(item.totalAmount, currency)}</td>
    </tr>
  `).join('')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(sale.invoiceNumber)} - Receipt</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;background:#eef1f4;color:#172033;font-family:Arial,Helvetica,sans-serif}
    .receipt{width:${thermal ? '80mm' : '210mm'};min-height:${thermal ? 'auto' : '270mm'};margin:20px auto;background:#fff;padding:${thermal ? '6mm 4mm' : '14mm'};box-shadow:0 8px 28px rgba(15,23,42,.12)}
    .brand{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #123c69;padding-bottom:14px}
    h1{font-size:${thermal ? '18px' : '24px'};margin:0;color:#123c69}
    .pharmacy-details,.muted{color:#667085;font-size:${thermal ? '9px' : '11px'};line-height:1.5}
    .invoice-meta{text-align:right;font-size:${thermal ? '9px' : '11px'}}
    .invoice-meta strong{display:block;font-size:${thermal ? '13px' : '16px'};color:#172033;margin-bottom:4px}
    .details{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
    .detail{border:1px solid #dfe4ea;padding:9px}
    .label{font-size:9px;text-transform:uppercase;color:#7b8492;font-weight:700;margin-bottom:3px}
    .value{font-size:${thermal ? '10px' : '12px'};font-weight:600}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:${thermal ? '8px' : '10px'}}
    th{background:#123c69;color:#fff;text-align:left;padding:7px 6px;font-size:${thermal ? '7px' : '9px'};text-transform:uppercase}
    td{padding:7px 6px;border-bottom:1px solid #e8ebef;vertical-align:top}
    .num{width:24px}.right{text-align:right}.strong,.item-name{font-weight:700}
    .summary{width:${thermal ? '100%' : '46%'};margin:14px 0 0 auto}
    .summary-row{display:flex;justify-content:space-between;padding:5px 0;font-size:${thermal ? '9px' : '11px'}}
    .summary-row.total{border-top:2px solid #123c69;margin-top:5px;padding-top:8px;font-size:${thermal ? '13px' : '16px'};font-weight:800;color:#123c69}
    .due{color:#b45309;font-weight:700}
    .footer{margin-top:22px;padding-top:12px;border-top:1px solid #dfe4ea;text-align:center;font-size:${thermal ? '8px' : '10px'};color:#667085}
    @media(max-width:720px){.receipt{width:100%;margin:0;box-shadow:none}.details{grid-template-columns:1fr}.brand{display:block}.invoice-meta{text-align:left;margin-top:10px}}
    @media print{
      @page{size:${thermal ? '80mm auto' : 'A4'};margin:0}
      body{background:#fff}
      .receipt{margin:0;box-shadow:none;width:${thermal ? '80mm' : '210mm'};min-height:${thermal ? 'auto' : '297mm'}}
    }
  </style>
</head>
<body>
  <main class="receipt">
    <header class="brand">
      <div>
        <h1>${escapeHtml(tenant?.name || 'Pharmacy')}</h1>
        <div class="pharmacy-details">
          ${address ? `<div>${escapeHtml(address)}</div>` : ''}
          ${tenant?.phone ? `<div>Phone: ${escapeHtml(tenant.phone)}</div>` : ''}
          ${tenant?.email ? `<div>Email: ${escapeHtml(tenant.email)}</div>` : ''}
          ${tenant?.gstNumber ? `<div>GSTIN: ${escapeHtml(tenant.gstNumber)}</div>` : ''}
          ${tenant?.drugLicenseNumber ? `<div>Drug Licence: ${escapeHtml(tenant.drugLicenseNumber)}</div>` : ''}
        </div>
      </div>
      <div class="invoice-meta">
        <strong>TAX INVOICE</strong>
        <div>${escapeHtml(sale.invoiceNumber)}</div>
        <div>${formatDateTime(sale.createdAt)}</div>
      </div>
    </header>

    <section class="details">
      <div class="detail">
        <div class="label">Customer</div>
        <div class="value">${escapeHtml(sale.patientName || 'Walk-in customer')}</div>
        ${sale.patientPhone ? `<div class="muted">${escapeHtml(sale.patientPhone)}</div>` : ''}
      </div>
      <div class="detail">
        <div class="label">Prescription / Payment</div>
        ${settings?.showDoctorName !== false && sale.doctorName ? `<div class="value">Dr. ${escapeHtml(sale.doctorName)}</div>` : '<div class="value">Retail sale</div>'}
        <div class="muted">${escapeHtml(sale.paymentMode)} | ${escapeHtml(sale.paymentStatus)}</div>
      </div>
    </section>

    <table>
      <thead>
        <tr><th>#</th><th>Medicine</th><th>Quantity</th><th class="right">Rate</th><th class="right">GST</th><th class="right">Amount</th></tr>
      </thead>
      <tbody>${items}</tbody>
    </table>

    <section class="summary">
      <div class="summary-row"><span>Subtotal</span><span>${money(sale.subtotal, currency)}</span></div>
      ${sale.discountAmount > 0 ? `<div class="summary-row"><span>Discount</span><span>- ${money(sale.discountAmount, currency)}</span></div>` : ''}
      <div class="summary-row"><span>GST</span><span>${money(sale.taxAmount, currency)}</span></div>
      <div class="summary-row total"><span>Total</span><span>${money(sale.totalAmount, currency)}</span></div>
      <div class="summary-row"><span>Paid</span><span>${money(sale.amountPaid, currency)}</span></div>
      ${sale.changeAmount > 0 ? `<div class="summary-row"><span>Change</span><span>${money(sale.changeAmount, currency)}</span></div>` : ''}
      ${sale.balanceDue > 0 ? `<div class="summary-row due"><span>Balance due</span><span>${money(sale.balanceDue, currency)}</span></div>` : ''}
    </section>

    ${sale.notes ? `<div class="muted" style="margin-top:16px"><strong>Note:</strong> ${escapeHtml(sale.notes)}</div>` : ''}
    <footer class="footer">${escapeHtml(settings?.invoiceFooterText || 'Thank you for choosing us. Get well soon.')}</footer>
  </main>
</body>
</html>`
}

function money(value: number, symbol: string) {
  return `${escapeHtml(symbol)}${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function number(value: number) {
  return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? escapeHtml(value) : date.toLocaleDateString('en-IN')
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? escapeHtml(value) : date.toLocaleString('en-IN')
}

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '-')
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
