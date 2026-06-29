import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useTenantBranding } from '@/hooks/useTenantBranding'
import MainLayout from '@/components/layout/MainLayout'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/auth/LoginPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import SuperAdminLoginPage from '@/pages/admin/SuperAdminLoginPage'
import SuperAdminForgotPasswordPage from '@/pages/admin/SuperAdminForgotPasswordPage'
import SuperAdminPage from '@/pages/admin/SuperAdminPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import MedicinesPage from '@/pages/medicines/MedicinesPage'
import MedicineFormPage from '@/pages/medicines/MedicineFormPage'
import PosPage from '@/pages/pos/PosPage'
import SalesPage from '@/pages/sales/SalesPage'
import PurchasesPage from '@/pages/purchases/PurchasesPage'
import OrdersPage from '@/pages/orders/OrdersPage'
import MedicineFinderPage from '@/pages/finder/MedicineFinderPage'
import SuppliersPage from '@/pages/suppliers/SuppliersPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import SettingsPage from '@/pages/settings/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.user?.role)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  // SYSTEM users have no tenant — keep them in the system console, not the tenant app.
  if (role === 'SYSTEM') return <Navigate to="/admin" replace />
  return <>{children}</>
}

function SystemRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.user?.role)
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  if (role !== 'SYSTEM') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function ModuleRoute({ allowed, children }: { allowed: boolean; children: React.ReactNode }) {
  if (!allowed) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  useTenantBranding()
  const perms = usePermissions()

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Super Admin (SYSTEM) console */}
        <Route path="/admin/login" element={<SuperAdminLoginPage />} />
        <Route path="/admin/forgot-password" element={<SuperAdminForgotPasswordPage />} />
        <Route path="/admin" element={<SystemRoute><SuperAdminPage /></SystemRoute>} />

        {/* Protected routes inside layout */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard"    element={<DashboardPage />} />
          <Route path="medicines"    element={<MedicinesPage />} />
          <Route path="medicines/new"         element={<MedicineFormPage />} />
          <Route path="medicines/:id/edit"    element={<MedicineFormPage />} />
          <Route path="locator"      element={<MedicineFinderPage />} />
          <Route path="pos"          element={<ModuleRoute allowed={perms.canBill}><PosPage /></ModuleRoute>} />
          <Route path="sales"        element={<SalesPage />} />
          <Route path="purchases"    element={<ModuleRoute allowed={perms.canManagePurchases}><PurchasesPage /></ModuleRoute>} />
          <Route path="orders"       element={<ModuleRoute allowed={perms.canManagePurchases}><OrdersPage /></ModuleRoute>} />
          <Route path="suppliers"    element={<ModuleRoute allowed={perms.canManagePurchases}><SuppliersPage /></ModuleRoute>} />
          <Route path="reports"      element={<ModuleRoute allowed={perms.canViewReports}><ReportsPage /></ModuleRoute>} />
          <Route path="settings"     element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
