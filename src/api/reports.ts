import { apiClient, tenantPath } from './client'
import type { ApiResponse, SalesReport, BestSellingMedicine, MedicineInventoryItem, DailyRow, OutstandingDuesReport } from '@/types'

export const reportsApi = {
  daily: (tenantId: string, date?: string) =>
    apiClient.get<ApiResponse<SalesReport>>(`${tenantPath(tenantId)}/reports/daily`, { params: { date } })
      .then(r => r.data.data),

  monthly: (tenantId: string, year: number, month: number) =>
    apiClient.get<ApiResponse<SalesReport>>(`${tenantPath(tenantId)}/reports/monthly`, { params: { year, month } })
      .then(r => r.data.data),

  bestSelling: (tenantId: string, from: string, to: string, limit = 10) =>
    apiClient.get<ApiResponse<BestSellingMedicine[]>>(`${tenantPath(tenantId)}/reports/best-selling`, {
      params: { from, to, limit },
    }).then(r => r.data.data),

  inventory: (tenantId: string) =>
    apiClient.get<ApiResponse<MedicineInventoryItem[]>>(`${tenantPath(tenantId)}/reports/inventory`)
      .then(r => r.data.data),

  range: (tenantId: string, from: string, to: string) =>
    apiClient.get<ApiResponse<DailyRow[]>>(`${tenantPath(tenantId)}/reports/range`, { params: { from, to } })
      .then(r => r.data.data),

  outstandingDues: (tenantId: string) =>
    apiClient.get<ApiResponse<OutstandingDuesReport>>(`${tenantPath(tenantId)}/reports/outstanding-dues`)
      .then(r => r.data.data),
}
