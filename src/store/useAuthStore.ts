import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserInfo } from '@/types'

interface AuthState {
  // Tokens are NOT stored here — they live in HttpOnly cookies the JS can't read.
  // Only non-sensitive user info is persisted (for display/branding/permissions).
  user: UserInfo | null
  accessToken: string | null
  isAuthenticated: boolean

  setAuth: (user: UserInfo, accessToken?: string | null) => void
  logout: () => void
  tenantId: () => string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken) => set({ user, accessToken: accessToken ?? null, isAuthenticated: true }),

      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),

      tenantId: () => get().user?.tenantId ?? '',
    }),
    {
      name: 'pharma-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
