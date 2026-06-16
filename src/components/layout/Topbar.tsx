import { Link } from 'react-router-dom'
import { Menu, Bell, Sun, Moon, MapPinned } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useState } from 'react'

interface Props { onMenuClick: () => void }

export default function Topbar({ onMenuClick }: Props) {
  const user = useAuthStore((s) => s.user)
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('darkMode') === 'true'
    if (saved) document.documentElement.classList.add('dark')
    return saved
  })

  const toggleDark = () => {
    setDark((d) => {
      const next = !d
      localStorage.setItem('darkMode', String(next))
      document.documentElement.classList.toggle('dark', next)
      return next
    })
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 bg-white border-b border-gray-200 px-4 shadow-sm">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Tenant + parent-company attribution */}
      <div className="hidden sm:block">
        <p className="text-sm font-semibold text-gray-800 leading-tight">{user?.tenantName}</p>
        <a
          href="https://scaliolab.com/"
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-gray-400 hover:text-pharma-700"
        >
          Powered by ScalioLab
        </a>
      </div>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <Link
          to="/locator"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-pharma-700 bg-pharma-50 hover:bg-pharma-100 transition"
          title="Open medicine locator"
        >
          <MapPinned className="w-4 h-4" />
          <span className="hidden md:inline">Locator</span>
        </Link>

        <button
          onClick={toggleDark}
          className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition"
          title="Toggle dark mode"
        >
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition">
          <Bell className="w-5 h-5" />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-pharma-600 flex items-center justify-center text-white font-semibold text-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-700 leading-tight">{user?.name}</p>
            <p className="text-xs text-gray-400">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
