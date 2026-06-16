import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { Stethoscope, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

type Step = 'email' | 'otp' | 'done'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword(email, subdomain)
      toast.success('OTP sent to your email!')
      setStep('otp')
    } catch { /* handled globally */ }
    finally { setLoading(false) }
  }

  const resetPwd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.resetPassword(email, subdomain, otp, newPassword)
      toast.success('Password reset successful!')
      setStep('done')
    } catch { /* handled globally */ }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pharma-900 to-pharma-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Stethoscope className="w-10 h-10 text-white mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
          {step === 'email' && (
            <form onSubmit={sendOtp} className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">
                Enter your pharmacy subdomain and email. We'll send you a 6-digit OTP.
              </p>
              <input
                type="text" value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                placeholder="Pharmacy subdomain" required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500"
              />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com" required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500"
              />
              <button type="submit" disabled={loading}
                className="w-full bg-pharma-600 text-white py-3 rounded-lg font-semibold hover:bg-pharma-700 disabled:opacity-60">
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={resetPwd} className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">Enter the 6-digit OTP sent to <strong>{email}</strong></p>
              <input
                type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit OTP" maxLength={6} required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500 text-center text-xl tracking-widest"
              />
              <input
                type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 8 chars)" minLength={8} required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500"
              />
              <button type="submit" disabled={loading}
                className="w-full bg-pharma-600 text-white py-3 rounded-lg font-semibold hover:bg-pharma-700 disabled:opacity-60">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-green-700 font-semibold">Password reset successfully!</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1 text-sm text-pharma-600 hover:underline">
              <ArrowLeft className="w-4 h-4" /> Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
