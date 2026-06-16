import { useAuthStore } from '@/store/useAuthStore'
import { AlertTriangle, XCircle } from 'lucide-react'

export default function SubscriptionBanner() {
  const status = useAuthStore(s => s.user?.subscriptionStatus)
  const endDate = useAuthStore(s => s.user?.subscriptionEndDate)
  const graceEndDate = useAuthStore(s => s.user?.subscriptionGraceEndDate)

  if (!status) return null

  if (status === 'ACTIVE') {
    const daysLeft = daysUntil(endDate)
    if (daysLeft == null || daysLeft > 3) return null

    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-pharma-50 border-b border-pharma-100 text-pharma-900 text-sm">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-pharma-600" />
        <span>
          <strong>Scalio Pharma subscription reminder:</strong> Your subscription expires on{' '}
          <strong>{endDate}</strong>
          {daysLeft >= 0 ? ` (${daysLeft} day${daysLeft === 1 ? '' : 's'} left)` : ''}.
          Contact{' '}
          <a href="https://scaliolab.com/" target="_blank" rel="noreferrer" className="font-semibold underline">
            ScalioLab support
          </a>{' '}
          to renew before billing and write access are affected.
        </span>
      </div>
    )
  }

  if (status === 'GRACE') {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
        <span>
          <strong>Scalio Pharma grace period:</strong> Your subscription ended on{' '}
          <strong>{endDate ?? 'N/A'}</strong>. The system is now in{' '}
          <strong>read-only mode</strong>; billing, sales, and other write operations are locked.
          Renew before <strong>{graceEndDate ?? 'the grace end date'}</strong> to continue service.
        </span>
      </div>
    )
  }

  if (status === 'NONE') {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border-b border-red-200 text-red-800 text-sm">
        <XCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
        <span>
          <strong>Subscription missing.</strong> Billing and write operations are locked.
          Contact{' '}
          <a href="https://scaliolab.com/" target="_blank" rel="noreferrer" className="font-semibold underline">
            ScalioLab support
          </a>{' '}
          to activate your Scalio Pharma subscription.
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border-b border-red-200 text-red-800 text-sm">
      <XCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
      <span>
        <strong>Scalio Pharma subscription expired.</strong> Your subscription has ended. The system is in{' '}
        <strong>read-only mode</strong>; billing, sales, and other write operations are locked.
        Contact{' '}
        <a href="https://scaliolab.com/" target="_blank" rel="noreferrer" className="font-semibold underline">
          ScalioLab support
        </a>{' '}
        to renew.
      </span>
    </div>
  )
}

function daysUntil(date?: string) {
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}
