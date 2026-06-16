import { useState, useEffect } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { Navigate } from 'react-router-dom'
import { UserPlus, Edit2, Trash2, ToggleLeft, ToggleRight, Key } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: string
  phone?: string
  active: boolean
}

interface FormData {
  name: string
  email: string
  password: string
  role: string
  phone: string
}

const ROLES = ['STAFF']

export default function UserManagementPage() {
  const perms = usePermissions()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState<User | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [form, setForm] = useState<FormData>({ name: '', email: '', password: '', role: 'STAFF', phone: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!perms.canManageUsers) return <Navigate to="/dashboard" replace />

  // Auth is via HttpOnly cookie — send it with credentials: 'include'.
  const headers = { 'Content-Type': 'application/json' }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/users', { headers, credentials: 'include' })
      const json = await res.json()
      setUsers(json.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/v1/users', { method: 'POST', headers, credentials: 'include', body: JSON.stringify(form) })
      const json = await res.json()
      if (!json.success) { setError(json.message || 'Failed to create user'); return }
      setShowModal(false)
      setForm({ name: '', email: '', password: '', role: 'STAFF', phone: '' })
      fetchUsers()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (user: User) => {
    await fetch(`/api/v1/users/${user.id}/toggle-active`, {
      method: 'PATCH', headers, credentials: 'include', body: JSON.stringify({ active: !user.active })
    })
    fetchUsers()
  }

  const deleteUser = async (user: User) => {
    if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return
    await fetch(`/api/v1/users/${user.id}`, { method: 'DELETE', headers, credentials: 'include' })
    fetchUsers()
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showResetModal) return
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/users/${showResetModal.id}/reset-password`, {
        method: 'PUT', headers, credentials: 'include', body: JSON.stringify({ newPassword: resetPassword })
      })
      const json = await res.json()
      if (!json.success) { setError(json.message || 'Failed'); return }
      setShowResetModal(null)
      setResetPassword('')
    } finally {
      setSaving(false)
    }
  }

  const roleBadgeColor = (role: string) => {
    if (role === 'ADMIN') return 'bg-blue-100 text-blue-800'
    if (role === 'SYSTEM') return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage staff accounts for your pharmacy</p>
        </div>
        <button
          onClick={() => { setError(''); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-pharma-600 text-white rounded-lg text-sm font-medium hover:bg-pharma-700"
        >
          <UserPlus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Email', 'Role', 'Phone', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No staff users yet</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${roleBadgeColor(u.role)}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{u.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.role !== 'ADMIN' && (
                        <>
                          <button title={u.active ? 'Deactivate' : 'Activate'} onClick={() => toggleActive(u)} className="text-gray-400 hover:text-indigo-600">
                            {u.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                          <button title="Reset Password" onClick={() => { setShowResetModal(u); setResetPassword(''); setError('') }} className="text-gray-400 hover:text-amber-600">
                            <Key className="w-4 h-4" />
                          </button>
                          <button title="Delete" onClick={() => deleteUser(u)} className="text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Add Staff User</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-pharma-600 text-white rounded-lg hover:bg-pharma-700 disabled:opacity-60">
                  {saving ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Reset Password — {showResetModal.name}</h2>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
                <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} required minLength={6} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowResetModal(null)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60">
                  {saving ? 'Saving…' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
