import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { authApi } from '@/api/auth'
import { Eye, EyeOff } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [form, setForm] = useState({ email: '', password: '', subdomain: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login(form.email, form.password, form.subdomain)
      setAuth(data.user)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* LEFT SIDE - RED THEME BRANDING */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-scalio-700 via-scalio-800 to-scalio-900 text-white flex-col items-start justify-between p-12">
        {/* Top Logo */}
        <a href="https://scaliolab.com/" target="_blank" rel="noreferrer" className="flex items-center gap-3">
          <img
            src="/scaliolab-logo.png"
            alt="ScalioLab"
            className="w-12 h-12 rounded-xl shadow-lg"
          />
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-white">Scalio</span>
            <span className="text-red-300">Lab</span>
          </h1>
        </a>

        {/* Main Content */}
        <div>
          <h2 className="text-5xl font-bold mb-6 leading-tight">
            ScalioPharma
          </h2>
          <p className="text-xl text-red-100 mb-12 max-w-md leading-relaxed">
            Modern Pharmacy Management Software - Streamline your operations with our comprehensive platform.
          </p>

          {/* Features */}
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mt-1">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-lg text-red-50">Complete inventory management</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mt-1">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-lg text-red-50">POS & billing integration</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mt-1">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-lg text-red-50">Real-time analytics & reports</span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <a href="https://scaliolab.com/" target="_blank" rel="noreferrer" className="text-sm text-red-200 hover:text-white">
          Copyright 2026 ScalioLab. All rights reserved.
        </a>
      </div>

      {/* RIGHT SIDE - LOGIN FORM */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo (visible on small screens) */}
          <div className="lg:hidden text-center mb-8">
            <a href="https://scaliolab.com/" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 mb-4">
              <img
                src="/scaliolab-logo.png"
                alt="ScalioLab"
                className="w-12 h-12 rounded-xl shadow-md"
              />
              <h1 className="text-2xl font-bold">
                <span className="text-gray-900">Scalio</span>
                <span className="text-red-600">Lab</span>
              </h1>
            </a>
            <p className="text-gray-600">ScalioPharma</p>
          </div>

          {/* Form Card */}
          <div className="bg-white">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600 mb-8">Sign in to your pharmacy account</p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Subdomain */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pharmacy / Subdomain
                </label>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-red-500 focus-within:border-transparent">
                  <input
                    type="text"
                    value={form.subdomain}
                    onChange={(e) => setForm(f => ({ ...f, subdomain: e.target.value.toLowerCase() }))}
                    placeholder="your-pharmacy"
                    required
                    className="flex-1 px-4 py-3 text-sm outline-none bg-white"
                  />
                  <span className="px-4 py-3 bg-gray-100 text-gray-600 text-sm border-l border-gray-300 font-medium">
                    .pharma
                  </span>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 pr-12 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember me + forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm font-medium text-red-600 hover:text-red-700 transition">
                  Forgot password?
                </Link>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed mt-6"
              >
                {loading && <LoadingSpinner size="sm" />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-8">
              New pharmacy?{' '}
              <a
                href="https://scaliolab.com/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-red-600 hover:text-red-700 transition"
              >
                Contact ScalioLab
              </a>
            </p>
          </div>

          {/* Footer Attribution */}
          <a
            href="https://scaliolab.com/"
            target="_blank"
            rel="noreferrer"
            className="block mt-12 text-center text-xs text-gray-500 hover:text-scalio-700"
          >
            Copyright 2026 <span className="font-semibold">ScalioLab</span>. All rights reserved.
          </a>
        </div>
      </div>
    </div>
  )
}
