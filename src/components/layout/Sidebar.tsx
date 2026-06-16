import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { usePermissions } from '@/hooks/usePermissions'
import { authApi } from '@/api/auth'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Pill, ShoppingCart, TrendingUp, Package,
  Users, BarChart3, Settings, LogOut, X, ClipboardList, MapPinned,
} from 'lucide-react'

interface Props {
  onClose: () => void
  mobile?: boolean
}

export default function Sidebar({ onClose, mobile }: Props) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const perms = usePermissions()

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* clear locally even if the call fails */ }
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full bg-pharma-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-pharma-800">
        <div className="flex items-center gap-2">
          <a href="https://scaliolab.com/" target="_blank" rel="noreferrer" aria-label="Open ScalioLab website">
            <img src="/scaliolab-logo.png" alt="ScalioLab" className="w-8 h-8 rounded-lg flex-shrink-0" />
          </a>
          <div>
            <p className="font-bold text-sm leading-tight">{user?.tenantName}</p>
            <a
              href="https://scaliolab.com/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-pharma-300 hover:text-white"
            >
              Powered by ScalioLab
            </a>
          </div>
        </div>
        {mobile && (
          <button onClick={onClose} className="p-1 rounded hover:bg-pharma-800">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {[
          { to: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard, show: true },
          { to: '/pos',        label: 'Billing / POS', icon: ShoppingCart,    show: perms.canBill },
          { to: '/medicines',  label: 'Medicines',    icon: Pill,            show: true },
          { to: '/locator',    label: 'Locator',      icon: MapPinned,       show: true },
          { to: '/sales',      label: 'Sales',        icon: TrendingUp,      show: true },
          { to: '/purchases',  label: 'Purchases',    icon: Package,         show: perms.canManagePurchases },
          { to: '/orders',     label: 'Orders',       icon: ClipboardList,   show: perms.canManagePurchases },
          { to: '/suppliers',  label: 'Suppliers',    icon: Users,           show: perms.canManageSuppliers },
          { to: '/reports',    label: 'Reports',      icon: BarChart3,       show: perms.canViewReports },
          { to: '/settings',   label: 'Settings',     icon: Settings,        show: perms.canAccessSettings },
        ]
          .filter(item => item.show)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={mobile ? onClose : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-pharma-700 text-white'
                    : 'text-pharma-200 hover:bg-pharma-800 hover:text-white'
                )
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
      </nav>

      {/* User footer */}
      <div className="px-2 py-4 border-t border-pharma-800">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs font-semibold text-pharma-300 uppercase tracking-wider">
            {user?.name}
          </p>
          <p className="text-xs text-pharma-400">{user?.email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-pharma-700 rounded-full">
            {user?.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-pharma-200 hover:bg-pharma-800 hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
        <a
          href="https://scaliolab.com/"
          target="_blank"
          rel="noreferrer"
          className="block px-3 mt-3 text-[10px] text-pharma-400 hover:text-pharma-200 text-center"
        >
          Scalio Pharma - Powered by ScalioLab
        </a>
      </div>
    </div>
  )
}
