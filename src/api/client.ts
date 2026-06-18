import axios, { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/useAuthStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
  // Prefer HttpOnly cookies; also allow a Bearer fallback for cross-site cookie blocking.
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401, attempt a one-shot cookie refresh and retry; otherwise log out.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    const original = error.config as (AxiosError['config'] & { _retry?: boolean }) | undefined
    const url = original?.url ?? ''

    if (error.response?.status === 401 && original && !original._retry && !url.includes('/api/v1/auth/')) {
      original._retry = true
      try {
        // Refresh uses the HttpOnly refresh_token cookie — no body needed.
        await axios.post(`${BASE_URL}/api/v1/auth/refresh-token`, {}, { withCredentials: true })
        return apiClient(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    const message = error.response?.data?.message || error.message || 'An error occurred'
    // Don't toast for 401 (handled above) or validation errors (shown in form)
    if (error.response?.status !== 401 && error.response?.status !== 422) {
      toast.error(message)
    }
    return Promise.reject(error)
  }
)

/** Helper to get tenanted API base path */
export function tenantPath(tenantId: string) {
  return `/api/v1/tenants/${tenantId}`
}
