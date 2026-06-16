import { apiClient } from './client'
import type { ApiResponse, AuthResponse } from '@/types'

export const authApi = {
  login: (email: string, password: string, subdomain: string) =>
    apiClient.post<ApiResponse<AuthResponse>>('/api/v1/auth/login', { email, password, subdomain })
      .then(r => r.data.data),

  superAdminLogin: (email: string, password: string) =>
    apiClient.post<ApiResponse<AuthResponse>>('/api/v1/auth/super-admin/login', { email, password })
      .then(r => r.data.data),

  superAdminForgotPassword: (email: string) =>
    apiClient.post('/api/v1/auth/super-admin/forgot-password', { email }),

  superAdminResetPassword: (email: string, otp: string, newPassword: string) =>
    apiClient.post('/api/v1/auth/super-admin/reset-password', { email, otp, newPassword }),

  register: (data: {
    pharmacyName: string; subdomain: string; email: string; phone: string;
    adminName: string; password: string; city?: string; state?: string;
    gstNumber?: string; drugLicenseNumber?: string
  }) =>
    apiClient.post<ApiResponse<AuthResponse>>('/api/v1/auth/register', data).then(r => r.data.data),

  forgotPassword: (email: string, subdomain: string) =>
    apiClient.post('/api/v1/auth/forgot-password', { email, subdomain }),

  resetPassword: (email: string, subdomain: string, otp: string, newPassword: string) =>
    apiClient.post('/api/v1/auth/reset-password', { email, subdomain, otp, newPassword }),

  refreshToken: () =>
    apiClient.post<ApiResponse<AuthResponse>>('/api/v1/auth/refresh-token', {})
      .then(r => r.data.data),

  logout: () => apiClient.post('/api/v1/auth/logout'),
}
