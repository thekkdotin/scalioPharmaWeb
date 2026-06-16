import { useAuthStore } from '@/store/useAuthStore'

/** Role-based permission helpers — 3 roles: SYSTEM, ADMIN, STAFF */
export function usePermissions() {
  const role = useAuthStore((s) => s.user?.role)

  const isSystem = role === 'SYSTEM'
  const isAdmin = role === 'ADMIN' || isSystem

  return {
    role,
    isSystem,
    isAdmin,
    isStaff: role === 'STAFF',

    canManageMedicines: isAdmin,
    canDelete: isAdmin,
    canManageUsers: isAdmin,
    canManagePurchases: isAdmin,
    canManageSuppliers: isAdmin,
    canBill: true,
    canViewReports: isAdmin,
    canAccessSettings: isAdmin,
    canAccessSystem: isSystem,
  }
}
