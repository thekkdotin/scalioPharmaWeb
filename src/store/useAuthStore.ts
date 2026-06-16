import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserInfo } from '@/types'

interface AuthState {
  // Tokens are NOT stored here — they live in HttpOnly cookies the JS can't read.
  // Only non-sensitive user info is persisted (for display/branding/permissions).
  user: UserInfo | null
  isAuthenticated: boolean

  setAuth: (user: UserInfo) => void
  logout: () => void
  tenantId: () => string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      setAuth: (user) => set({ user, isAuthenticated: true }),

      logout: () => set({ user: null, isAuthenticated: false }),

      tenantId: () => get().user?.tenantId ?? '',
    }),
    {
      name: 'pharma-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
