// ── All domain types for the frontend ─────────────────────────

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

// ── Auth ──────────────────────────────────────────────────────
export interface UserInfo {
  id: string
  name: string
  email: string
  role: 'SYSTEM' | 'ADMIN' | 'STAFF'
  tenantId: string
  tenantName: string
  tenantSubdomain: string
  purchaseModuleEnabled: boolean
  maxStaffDiscountPercent: number
  subscriptionStatus?: 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'NONE'
  subscriptionStartDate?: string
  subscriptionEndDate?: string
  subscriptionGraceEndDate?: string
  /** Tenant branding */
  appTitle?: string
  primaryColor?: string
  fontFamily?: string
}

export interface AuthResponse {
  // Tokens are delivered as HttpOnly cookies; these remain only for non-browser clients.
  accessToken?: string
  refreshToken?: string
  tokenType?: string
  expiresIn?: number
  user: UserInfo
}

// ── Tenant ────────────────────────────────────────────────────
export interface Tenant {
  id: string
  name: string
  subdomain: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  gstNumber?: string
  drugLicenseNumber?: string
  pincode?: string
  purchaseModuleEnabled: boolean
  billingModuleEnabled: boolean
  reportsModuleEnabled: boolean
  maxStaffDiscountPercent: number
  isActive: boolean
  appTitle?: string
  primaryColor?: string
  fontFamily?: string
  createdAt: string
}

export interface Subscription {
  id: string
  tenantId: string
  planName: string
  startDate: string
  endDate: string
  graceEndDate: string
  status: 'ACTIVE' | 'GRACE' | 'EXPIRED'
  notes?: string
}

// ── Medicine ──────────────────────────────────────────────────
export interface Medicine {
  id: string
  tenantId: string
  name: string
  genericName?: string
  companyName?: string
  barcode?: string
  category?: string
  unit?: string
  hsnCode?: string
  gstPercentage: number
  minStockAlert: number
  description?: string
  isActive: boolean
  totalStock?: number
  tabletsPerStrip?: number
  sellingPrice?: number
  mrp?: number
  rackLocations?: string[]
  createdAt: string
}

export interface MedicineBatch {
  id: string
  tenantId: string
  medicineId: string
  batchNumber: string
  purchaseQuantity: number
  remainingQuantity: number
  purchasePrice: number
  sellingPrice: number
  mrp?: number
  /** Tablets/capsules per strip. 1 = sell by unit; >1 = quantities tracked in individual tablets */
  tabletsPerStrip: number
  manufactureDate?: string
  expiryDate: string
  isExpired: boolean
  /** Storage rack/location where this batch is stored */
  rackLocationId?: string
  rackName?: string
  rackCode?: string
  rackLocation?: string
  createdAt: string
}

export interface MedicineStockSummary {
  medicine: Medicine
  totalPurchased: number
  totalSold: number
  totalRemaining: number
  batches: MedicineBatch[]
}

// ── Supplier ──────────────────────────────────────────────────
export interface Supplier {
  id: string
  tenantId: string
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  gstNumber?: string
  drugLicenseNumber?: string
  isActive: boolean
}

// ── Purchase ──────────────────────────────────────────────────
export interface PurchaseItem {
  id: string
  medicineId: string
  batchNumber: string
  quantity: number
  purchasePrice: number
  sellingPrice: number
  mrp?: number
  tabletsPerStrip: number
  expiryDate: string
  taxPercentage: number
  totalAmount: number
}

export interface Purchase {
  id: string
  tenantId: string
  supplierId?: string
  invoiceNumber?: string
  invoiceDate?: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  netAmount: number
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIAL'
  notes?: string
  items: PurchaseItem[]
  createdAt: string
}

// ── Sale ──────────────────────────────────────────────────────
export type DiscountType = 'PERCENTAGE' | 'FLAT'
export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'CREDIT'

export interface SaleItem {
  id: string
  medicineId: string
  medicineName: string
  batchId: string
  batchNumber: string
  expiryDate?: string
  quantity: number
  tabletsPerStrip: number
  unitPrice: number
  purchasePrice: number
  discountPercent: number
  gstPercent: number
  totalAmount: number
  profit: number
}

export interface Sale {
  id: string
  tenantId: string
  invoiceNumber: string
  patientName?: string
  patientPhone?: string
  doctorName?: string
  paymentMode: PaymentMode
  subtotal: number
  discountType: DiscountType
  discountValue: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  amountPaid: number
  changeAmount: number
  balanceDue: number
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID'
  status: 'COMPLETED' | 'PARTIAL_RETURN' | 'FULLY_RETURNED' | 'CANCELLED'
  notes?: string
  createdBy: string
  items: SaleItem[]
  createdAt: string
}

// ── POS Cart ──────────────────────────────────────────────────
export interface CartItem {
  medicineId: string
  medicineName: string
  category?: string
  unit?: string
  batchId?: string
  batchNumber?: string
  expiryDate?: string
  quantity: number          // in tablets when tabletsPerStrip > 1, else in units
  unitPrice: number         // per tablet — first FEFO batch's price, used for display
  purchasePrice: number     // per tablet (for staff reference)
  mrp?: number              // MRP per tablet (for display)
  tabletsPerStrip: number   // 1 = sell by unit; >1 = strip.tablet entry enabled
  customUnitPrice?: number  // cashier override; null means use FEFO pricing
  gstPercent: number
  discountPercent: number
  lineTotal: number         // FEFO-accurate total across all batches, before GST
  availableBatches?: MedicineBatch[]  // all non-expired batches sorted FEFO, for accurate line-total
}

// ── Dashboard ─────────────────────────────────────────────────
export interface RecentSale {
  id: string
  invoiceNumber: string
  patientName?: string
  totalAmount: number
  paymentMode: string
  createdAt: string
}

export interface LowStockItem {
  medicineId: string
  medicineName: string
  remainingQuantity: number
  minStockAlert: number
}

export interface NearExpiryItem {
  batchId: string
  medicineId: string
  medicineName: string
  batchNumber: string
  remainingQuantity: number
  expiryDate: string
  daysToExpiry: number
}

export interface DashboardData {
  todaySalesAmount: number
  todaySalesCount: number
  todayProfit: number
  monthSalesAmount: number
  totalMedicines: number
  lowStockCount: number
  nearExpiryCount: number
  expiredStockCount: number
  activeUsers?: number
  outstandingDueAmount: number
  outstandingDueCount: number
  recentSales: RecentSale[]
  lowStockItems: LowStockItem[]
  nearExpiryItems: NearExpiryItem[]
  expiredStockItems: NearExpiryItem[]
}

// ── Reports ───────────────────────────────────────────────────
export interface SaleRow {
  id: string
  invoiceNumber: string
  patientName: string
  paymentMode: string
  totalAmount: number
  profit: number
  createdAt: string
}

export interface SalesReport {
  title: string
  totalRevenue: number
  totalCost: number
  totalProfit: number
  profitPct: number
  totalSales: number
  totalDiscount: number
  cashAmount: number
  upiAmount: number
  cardAmount: number
  creditAmount: number
  sales: SaleRow[]
}

export interface DailyRow {
  date: string
  salesCount: number
  revenue: number
  cost: number
  profit: number
  profitPct: number
  cashAmount: number
  upiAmount: number
  cardAmount: number
}

export interface HistoricalDailySale {
  id?: string
  tenantId?: string
  saleDate: string
  salesCount: number
  salesValue?: number
  purchaseValue?: number
  revenue: number
  cost: number
  profit: number
  cashAmount: number
  upiAmount: number
  cardAmount: number
  notes?: string
}

export interface SaleReturnItem {
  medicineId: string
  medicineName: string
  batchNumber: string
  quantity: number
  unitPrice: number
  refundAmount: number
}

export interface SaleReturn {
  id: string
  saleId: string
  tenantId: string
  returnDate: string
  reason?: string
  totalRefund: number
  items: SaleReturnItem[]
}

export interface SalePayment {
  id: string
  saleId?: string
  amount: number
  paymentMode: PaymentMode
  paidAt: string
  notes?: string
  createdAt: string
}

export interface OutstandingDue {
  saleId: string
  invoiceNumber: string
  patientName?: string
  patientPhone?: string
  totalAmount: number
  amountPaid: number
  balanceDue: number
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID'
  paymentMode: PaymentMode
  createdAt: string
}

export interface OutstandingDuesReport {
  totalOutstanding: number
  count: number
  dues: OutstandingDue[]
}

export interface BestSellingMedicine {
  medicineId: string
  medicineName: string
  totalQuantity: number
  totalRevenue: number
}

export type PurchaseOrderStatus = 'PENDING' | 'ORDERED' | 'DELIVERED'

export interface PurchaseOrderLine {
  id: string
  medicineId?: string
  medicineName: string
  quantity: number
  supplierId?: string
  supplierName?: string
  currentStock?: number
  category?: string
  unit?: string
  tabletsPerStrip?: number
  reason?: string
}

export interface PurchaseOrderDraft {
  id: string
  orderNumber: string
  status: PurchaseOrderStatus
  createdAt: string
  supplierId?: string
  supplierName?: string
  notes?: string
  lines: PurchaseOrderLine[]
}

export interface MedicineInventoryItem {
  medicineId: string
  medicineName: string
  companyName: string
  category?: string
  unit?: string
  totalPurchased: number
  totalSold: number
  remaining: number
  tabletsPerStrip: number
  batches: {
    batchNumber: string
    expiryDate: string
    purchaseQuantity: number
    remainingQuantity: number
    sellingPrice: number
    tabletsPerStrip: number
    rackName?: string
    rackCode?: string
    rackLocation?: string
    expired: boolean
  }[]
}

// ── Rack Management ───────────────────────────────────────────
export interface Rack {
  id?: string
  tenantId?: string
  rackName: string
  rackCode?: string
  description?: string
  isActive: boolean
  createdAt?: string
}

// ── Settings ──────────────────────────────────────────────────
export interface TenantSettings {
  id?: string
  tenantId?: string
  invoicePrefix: string
  invoiceFooterText?: string
  thermalPrinterEnabled: boolean
  gstStateCode?: string
  isIntraState: boolean
  currencySymbol: string
  theme: 'light' | 'dark'
  showDoctorName: boolean
  nearExpiryDays: number
  /** When true (default): POS allows loose tablet sales. When false: full strips only. */
  allowLooseSale: boolean
  /** When true: show stock as "X strips, Y tabs". When false: show total tablet count. */
  showStripsAndTabs: boolean
  /** Shows first-time onboarding tools for opening stock totals and old daily sales. */
  firstTimeSetupEnabled: boolean
  /** CURRENT_STOCK = go-live stock only; FULL_HISTORY = purchased/sold/remaining setup. */
  inventoryOnboardingMode: 'CURRENT_STOCK' | 'FULL_HISTORY'
  /** Hides and blocks onboarding-only tools once setup is complete. */
  inventoryOnboardingCompleted: boolean
  /** Enables the scheduled daily sales and profit email. */
  dailySalesEmailEnabled: boolean
  /** Comma-separated recipient email addresses. */
  dailySalesEmailRecipients?: string
  /** Daily send time in Asia/Kolkata, HH:mm format. */
  dailySalesEmailTime: string
  dailySalesEmailLastSentDate?: string
}
