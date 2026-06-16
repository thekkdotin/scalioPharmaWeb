import { apiClient, tenantPath } from './client'
import type { ApiResponse, Sale, SaleReturn, SalePayment, PageResponse, CartItem, DiscountType, PaymentMode } from '@/types'

export interface CreateSalePayload {
  patientName?: string
  patientPhone?: string
  doctorName?: string
  paymentMode: PaymentMode
  discountType: DiscountType
  discountValue: number
  discountAmount: number
  amountPaid: number
  notes?: string
  items: {
    medicineId: string
    quantity: number
    batchId?: string
    discountPercent: number
    customUnitPrice?: number
  }[]
}

export const salesApi = {
  list: (tenantId: string, params?: { from?: string; to?: string; search?: string; page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<Sale>>>(`${tenantPath(tenantId)}/sales`, { params })
      .then(r => r.data.data),

  getById: (tenantId: string, id: string) =>
    apiClient.get<ApiResponse<Sale>>(`${tenantPath(tenantId)}/sales/${id}`).then(r => r.data.data),

  create: (tenantId: string, data: CreateSalePayload) =>
    apiClient.post<ApiResponse<Sale>>(`${tenantPath(tenantId)}/sales`, data).then(r => r.data.data),

  returnSale: (tenantId: string, saleId: string, items: { batchId: string; quantity: number }[], reason: string) =>
    apiClient.post<ApiResponse<SaleReturn>>(`${tenantPath(tenantId)}/sales/${saleId}/returns`, { items, reason })
      .then(r => r.data.data),

  recordPayment: (tenantId: string, saleId: string, amount: number, paymentMode: PaymentMode, notes?: string) =>
    apiClient.post<ApiResponse<Sale>>(`${tenantPath(tenantId)}/sales/${saleId}/payments`, { amount, paymentMode, notes })
      .then(r => r.data.data),

  getPayments: (tenantId: string, saleId: string) =>
    apiClient.get<ApiResponse<SalePayment[]>>(`${tenantPath(tenantId)}/sales/${saleId}/payments`)
      .then(r => r.data.data),
}
