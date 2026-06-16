import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

type Step = 'email' | 'otp' | 'done'

export default function SuperAdminForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.superAdminForgotPassword(email)
      toast.success('OTP sent to system admin email')
      setStep('otp')
    } catch {
      /* handled globally */
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.superAdminResetPassword(email, otp, newPassword)
      toast.success('System admin password reset')
      setStep('done')
    } catch {
      /* handled globally */
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-scalio-950 via-gray-900 to-scalio-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <a href="https://scaliolab.com/" target="_blank" rel="noreferrer" aria-label="Open ScalioLab website">
            <img src="/scaliolab-logo.png" alt="ScalioLab" className="w-16 h-16 mx-auto rounded-2xl shadow-lg" />
          </a>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <ShieldCheck className="w-6 h-6 text-scalio-300" /> Reset System Password
          </h1>
          <p className="mt-1 text-sm text-gray-400">System Console password recovery</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
          {step === 'email' && (
            <form onSubmit={sendOtp} className="space-y-4">
              <p className="text-sm text-gray-500">
                Enter the registered system admin email. We will send a 6-digit OTP.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@scaliolab.com"
                required
                className={inputClass}
              />
              <button type="submit" disabled={loading} className={buttonClass}>
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={resetPassword} className="space-y-4">
              <p className="text-sm text-gray-500">
                Enter the OTP sent to <strong>{email}</strong>.
              </p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit OTP"
                maxLength={6}
                required
                className={`${inputClass} text-center text-xl tracking-widest`}
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
                minLength={8}
                required
                className={inputClass}
              />
              <button type="submit" disabled={loading} className={buttonClass}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-700 font-bold">
                OK
              </div>
              <p className="text-green-700 font-semibold">Password reset successfully.</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/admin/login" className="inline-flex items-center gap-1 text-sm text-scalio-700 hover:underline">
              <ArrowLeft className="w-4 h-4" /> Back to System Console login
            </Link>
          </div>
        </div>

        <a
          href="https://scaliolab.com/"
          target="_blank"
          rel="noreferrer"
          className="block mt-6 text-center text-xs text-gray-400 hover:text-white"
        >
          Powered by ScalioLab
        </a>
      </div>
    </div>
  )
}

const inputClass = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-scalio-600'
const buttonClass = 'w-full bg-scalio-700 text-white py-3 rounded-lg font-semibold hover:bg-scalio-800 transition disabled:opacity-60'
