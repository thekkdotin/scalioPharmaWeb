import { apiClient, tenantPath } from './client'
import { ApiResponse, PageResponse, Rack } from '@/types'

export const racksApi = {
  list: (tenantId: string, search = '', page = 0, size = 20) =>
    apiClient.get<ApiResponse<PageResponse<Rack>>>(
      `${tenantPath(tenantId)}/racks?search=${encodeURIComponent(search)}&page=${page}&size=${size}`
    ),

  listActive: (tenantId: string) =>
    apiClient.get<ApiResponse<Rack[]>>(
      `${tenantPath(tenantId)}/racks/active`
    ),

  getById: (tenantId: string, rackId: string) =>
    apiClient.get<ApiResponse<Rack>>(
      `${tenantPath(tenantId)}/racks/${rackId}`
    ),

  create: (tenantId: string, data: Rack) =>
    apiClient.post<ApiResponse<Rack>>(
      `${tenantPath(tenantId)}/racks`,
      data
    ),

  update: (tenantId: string, rackId: string, data: Rack) =>
    apiClient.put<ApiResponse<Rack>>(
      `${tenantPath(tenantId)}/racks/${rackId}`,
      data
    ),

  delete: (tenantId: string, rackId: string) =>
    apiClient.delete<ApiResponse<void>>(
      `${tenantPath(tenantId)}/racks/${rackId}`
    ),
}
