import { apiClient, tenantPath } from './client'
import type { ApiResponse, DashboardData } from '@/types'

export const dashboardApi = {
  get: (tenantId: string) =>
    apiClient.get<ApiResponse<DashboardData>>(`${tenantPath(tenantId)}/dashboard`).then(r => r.data.data),
}
