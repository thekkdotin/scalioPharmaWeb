import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple'
  subtitle?: string
  trend?: number
  onClick?: () => void
}

const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-500',   text: 'text-blue-600'  },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-500',  text: 'text-green-600' },
  amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-500',  text: 'text-amber-600' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-500',    text: 'text-red-600'   },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-500', text: 'text-purple-600'},
}

export function StatCard({ title, value, icon: Icon, color = 'blue', subtitle, trend, onClick }: StatCardProps) {
  const c = colorMap[color]
  const Component = onClick ? 'button' : 'div'
  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full rounded-xl p-4 text-left shadow-sm border border-gray-100 md:p-5',
        onClick && 'transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-pharma-500 focus:ring-offset-2',
        c.bg
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className={cn('text-2xl font-bold mt-1 truncate', c.text)}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          {typeof trend === 'number' && (
            <p className={cn('text-xs font-medium mt-1', trend >= 0 ? 'text-green-600' : 'text-red-600')}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs yesterday
            </p>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', c.icon)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </Component>
  )
}
