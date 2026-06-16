import { apiClient, tenantPath } from './client'
import type { ApiResponse, Purchase, Supplier, PageResponse } from '@/types'

export const suppliersApi = {
  list: (tenantId: string, params?: { search?: string; page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<Supplier>>>(`${tenantPath(tenantId)}/suppliers`, { params })
      .then(r => r.data.data),

  getById: (tenantId: string, id: string) =>
    apiClient.get<ApiResponse<Supplier>>(`${tenantPath(tenantId)}/suppliers/${id}`).then(r => r.data.data),

  create: (tenantId: string, data: Partial<Supplier>) =>
    apiClient.post<ApiResponse<Supplier>>(`${tenantPath(tenantId)}/suppliers`, data).then(r => r.data.data),

  update: (tenantId: string, id: string, data: Partial<Supplier>) =>
    apiClient.put<ApiResponse<Supplier>>(`${tenantPath(tenantId)}/suppliers/${id}`, data).then(r => r.data.data),

  delete: (tenantId: string, id: string) =>
    apiClient.delete(`${tenantPath(tenantId)}/suppliers/${id}`),
}

export const purchasesApi = {
  list: (tenantId: string, params?: { supplierId?: string; from?: string; to?: string; page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<Purchase>>>(`${tenantPath(tenantId)}/purchases`, { params })
      .then(r => r.data.data),

  getById: (tenantId: string, id: string) =>
    apiClient.get<ApiResponse<Purchase>>(`${tenantPath(tenantId)}/purchases/${id}`).then(r => r.data.data),

  create: (tenantId: string, data: unknown) =>
    apiClient.post<ApiResponse<Purchase>>(`${tenantPath(tenantId)}/purchases`, data).then(r => r.data.data),
}
