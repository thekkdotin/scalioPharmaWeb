import { apiClient, tenantPath } from './client'
import type { ApiResponse, Medicine, MedicineStockSummary, PageResponse } from '@/types'

export type OpeningStockPayload = {
  batchNumber?: string
  quantity: number
  looseQuantity?: number
  totalPurchasedQuantity?: number
  totalPurchasedLooseQuantity?: number
  totalSoldQuantity?: number
  totalSoldLooseQuantity?: number
  remainingQuantity?: number
  remainingLooseQuantity?: number
  purchasePrice: number
  sellingPrice: number
  expiryDate: string
  manufactureDate?: string
  mrp?: number
  tabletsPerStrip?: number
  rackLocationId?: string
}

export const medicinesApi = {
  list: (tenantId: string, params?: { search?: string; page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<Medicine>>>(`${tenantPath(tenantId)}/medicines`, { params })
      .then(r => r.data.data),

  getById: (tenantId: string, id: string) =>
    apiClient.get<ApiResponse<MedicineStockSummary>>(`${tenantPath(tenantId)}/medicines/${id}`)
      .then(r => r.data.data),

  getByBarcode: (tenantId: string, barcode: string) =>
    apiClient.get<ApiResponse<Medicine>>(`${tenantPath(tenantId)}/medicines/barcode/${barcode}`)
      .then(r => r.data.data),

  create: (tenantId: string, data: Partial<Medicine>) =>
    apiClient.post<ApiResponse<Medicine>>(`${tenantPath(tenantId)}/medicines`, data).then(r => r.data.data),

  update: (tenantId: string, id: string, data: Partial<Medicine>) =>
    apiClient.put<ApiResponse<Medicine>>(`${tenantPath(tenantId)}/medicines/${id}`, data).then(r => r.data.data),

  delete: (tenantId: string, id: string) =>
    apiClient.delete(`${tenantPath(tenantId)}/medicines/${id}`),

  addBatch: (tenantId: string, medicineId: string, data: OpeningStockPayload) =>
    apiClient.post<ApiResponse<unknown>>(`${tenantPath(tenantId)}/medicines/${medicineId}/batches`, data)
      .then(r => r.data.data),

  updateBatch: (tenantId: string, medicineId: string, batchId: string, data: OpeningStockPayload) =>
    apiClient.put<ApiResponse<unknown>>(`${tenantPath(tenantId)}/medicines/${medicineId}/batches/${batchId}`, data)
      .then(r => r.data.data),

  resolveExpiredStock: (
    tenantId: string,
    medicineId: string,
    batchId: string,
    action: 'RETURN_TO_SELLER' | 'DISPOSE',
    notes?: string
  ) =>
    apiClient.post<ApiResponse<unknown>>(`${tenantPath(tenantId)}/medicines/${medicineId}/batches/${batchId}/expired-stock-action`, { action, notes })
      .then(r => r.data.data),

  findByName: (tenantId: string, name: string) =>
    apiClient.get<ApiResponse<Medicine | null>>(`${tenantPath(tenantId)}/medicines/by-name`, { params: { name } })
      .then(r => r.data.data),
}
