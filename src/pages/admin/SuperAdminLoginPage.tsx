import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { authApi } from '@/api/auth'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import toast from 'react-hot-toast'

export default function SuperAdminLoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.superAdminLogin(form.email, form.password)
      setAuth(data.user, data.accessToken)
      toast.success('Signed in to System Console')
      navigate('/admin')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed. Check your credentials.')
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
            <ShieldCheck className="w-6 h-6 text-scalio-300" /> System Console
          </h1>
          <p className="mt-1 text-sm text-gray-400">Scalio Pharma · Platform administration</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Super Admin sign in</h2>

          {error && (
            <div className="mb-4 p-3 bg-scalio-50 border border-scalio-100 rounded-lg text-sm text-scalio-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" value={form.email} required
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="admin@scaliolab.com"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-scalio-600"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link to="/admin/forgot-password" className="text-sm font-medium text-scalio-700 hover:text-scalio-800">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} value={form.password} required
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-scalio-600"
                />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-scalio-700 text-white py-3 rounded-lg font-semibold hover:bg-scalio-800 transition disabled:opacity-60"
            >
              {loading && <LoadingSpinner size="sm" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
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
