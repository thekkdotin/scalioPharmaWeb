import { apiClient } from './client'
import type { ApiResponse, PageResponse, Tenant, Subscription, TenantSettings } from '@/types'

export interface CreateTenantPayload {
  name: string
  subdomain: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  gstNumber?: string
  drugLicenseNumber?: string
  adminName: string
  adminEmail: string
  adminPassword: string
  appTitle?: string
  primaryColor?: string
  fontFamily?: string
}

export type UpdateTenantPayload = {
  name: string
  subdomain: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  gstNumber?: string
  drugLicenseNumber?: string
  logoUrl?: string
}

export interface FeatureFlags {
  purchaseModuleEnabled: boolean
  billingModuleEnabled: boolean
  reportsModuleEnabled: boolean
}

export interface TenantUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'STAFF' | 'SYSTEM'
  phone?: string
  active: boolean
}

const ADMIN = '/api/v1/admin'

export const adminApi = {
  listTenants: (page = 0, size = 200) =>
    apiClient.get<ApiResponse<PageResponse<Tenant>>>(`${ADMIN}/tenants`, { params: { page, size } })
      .then(r => r.data.data),

  createTenant: (data: CreateTenantPayload) =>
    apiClient.post<ApiResponse<Tenant>>(`${ADMIN}/tenants`, data).then(r => r.data.data),

  updateTenant: (id: string, data: UpdateTenantPayload) =>
    apiClient.patch<ApiResponse<Tenant>>(`${ADMIN}/tenants/${id}`, data).then(r => r.data.data),

  toggleActive: (id: string, active: boolean) =>
    apiClient.patch<ApiResponse<Tenant>>(`${ADMIN}/tenants/${id}/toggle-active`, { active })
      .then(r => r.data.data),

  updateFlags: (id: string, flags: FeatureFlags) =>
    apiClient.patch<ApiResponse<Tenant>>(`${ADMIN}/tenants/${id}/feature-flags`, flags)
      .then(r => r.data.data),

  setMaxDiscount: (id: string, maxStaffDiscountPercent: number) =>
    apiClient.patch<ApiResponse<Tenant>>(`${ADMIN}/tenants/${id}/max-discount`,
      { maxStaffDiscountPercent: String(maxStaffDiscountPercent) }).then(r => r.data.data),

  updateBranding: (id: string, branding: { appTitle?: string; primaryColor?: string; fontFamily?: string }) =>
    apiClient.patch<ApiResponse<Tenant>>(`${ADMIN}/tenants/${id}/branding`, branding)
      .then(r => r.data.data),

  listTenantUsers: (tenantId: string) =>
    apiClient.get<ApiResponse<TenantUser[]>>(`${ADMIN}/tenants/${tenantId}/users`)
      .then(r => r.data.data),

  setTenantUserTemporaryPassword: (tenantId: string, userId: string, temporaryPassword: string) =>
    apiClient.put<ApiResponse<TenantUser>>(`${ADMIN}/tenants/${tenantId}/users/${userId}/temporary-password`, { temporaryPassword })
      .then(r => r.data.data),

  getTenantSettings: (tenantId: string) =>
    apiClient.get<ApiResponse<TenantSettings>>(`/api/v1/tenants/${tenantId}/settings`).then(r => r.data.data),

  updateTenantSettings: (tenantId: string, data: Partial<TenantSettings>) =>
    apiClient.put<ApiResponse<TenantSettings>>(`/api/v1/tenants/${tenantId}/settings`, data).then(r => r.data.data),

  listSubscriptions: () =>
    apiClient.get<ApiResponse<Subscription[]>>(`${ADMIN}/subscriptions`).then(r => r.data.data),

  upsertSubscription: (tenantId: string, data: { planName?: string; startDate: string; endDate: string; notes?: string }) =>
    apiClient.post<ApiResponse<Subscription>>(`${ADMIN}/subscriptions/${tenantId}`, data)
      .then(r => r.data.data),
}
