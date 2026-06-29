import { useAuthStore } from '@/store/useAuthStore'

/** Role-based permission helpers — 3 roles: SYSTEM, ADMIN, STAFF */
export function usePermissions() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role

  const isSystem = role === 'SYSTEM'
  const isAdmin = role === 'ADMIN' || isSystem
  const purchaseEnabled = user?.purchaseModuleEnabled ?? true
  const billingEnabled = user?.billingModuleEnabled ?? true
  const reportsEnabled = user?.reportsModuleEnabled ?? true

  return {
    role,
    isSystem,
    isAdmin,
    isStaff: role === 'STAFF',

    canManageMedicines: isAdmin,
    canDelete: isAdmin,
    canManageUsers: isAdmin,
    canManagePurchases: isAdmin && purchaseEnabled,
    canManageSuppliers: isAdmin && purchaseEnabled,
    canBill: billingEnabled,
    canViewReports: isAdmin && reportsEnabled,
    canAccessSettings: isAdmin,
    canAccessSystem: isSystem,
  }
}
