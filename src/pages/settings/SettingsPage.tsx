import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/useAuthStore'
import { apiClient, tenantPath } from '@/api/client'
import { racksApi } from '@/api/racks'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button, Badge } from '@/components/shared/PageHeader'
import { PageLoader, LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { TenantSettings, Rack, ApiResponse } from '@/types'
import toast from 'react-hot-toast'
import { Settings, Users, FileText, Printer, Globe, Plus, Trash2, Lock, Eye, EyeOff, UserCheck, UserX, ShoppingCart, Package } from 'lucide-react'

function fetchSettings(tenantId: string) {
  return apiClient.get<ApiResponse<TenantSettings>>(`${tenantPath(tenantId)}/settings`).then(r => r.data.data)
}

function saveSettings(tenantId: string, data: Partial<TenantSettings>) {
  return apiClient.put<ApiResponse<TenantSettings>>(`${tenantPath(tenantId)}/settings`, data).then(r => r.data.data)
}

type UserDto = { id: string; name: string; email: string; role: string; phone: string | null; active: boolean }
type CreateUserReq = { name: string; email: string; password: string; role: string; phone?: string }

const fetchUsers = () => apiClient.get<ApiResponse<UserDto[]>>('/api/v1/users').then(r => r.data.data)
const createUserApi = (d: CreateUserReq) => apiClient.post<ApiResponse<UserDto>>('/api/v1/users', d).then(r => r.data.data)
const toggleActiveApi = (id: string, active: boolean) => apiClient.patch<ApiResponse<UserDto>>(`/api/v1/users/${id}/toggle-active`, { active }).then(r => r.data.data)
const deleteUserApi = (id: string) => apiClient.delete<ApiResponse<void>>(`/api/v1/users/${id}`)
const resetPasswordApi = (id: string, newPassword: string) => apiClient.put<ApiResponse<void>>(`/api/v1/users/${id}/reset-password`, { newPassword })

export default function SettingsPage() {
  const tenantId = useAuthStore((s) => s.tenantId())!
  const qc = useQueryClient()
  const [tab, setTab] = useState<'invoice' | 'gst' | 'printer' | 'pos' | 'racks' | 'users'>('invoice')
  const [form, setForm] = useState<Partial<TenantSettings>>({})

  // Users tab state
  const [showAddUser, setShowAddUser] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [showAddPw, setShowAddPw] = useState(false)
  const [resetPwId, setResetPwId] = useState<string | null>(null)
  const [resetPwVal, setResetPwVal] = useState('')
  const [showResetPw, setShowResetPw] = useState(false)

  // Racks tab state
  const [showAddRack, setShowAddRack] = useState(false)
  const [rackForm, setRackForm] = useState<Partial<Rack>>({ isActive: true })
  const [editingRackId, setEditingRackId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['settings', tenantId],
    queryFn: () => fetchSettings(tenantId),
  })

  useEffect(() => { if (data) setForm(data) }, [data])

  const mutation = useMutation({
    mutationFn: () => saveSettings(tenantId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', tenantId] })
      toast.success('Settings saved!')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save'),
  })

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled: tab === 'users',
  })

  const racksQuery = useQuery({
    queryKey: ['racks', tenantId],
    queryFn: () => racksApi.list(tenantId).then(r => r.data.data),
    enabled: tab === 'racks',
  })

  const createUserMut = useMutation({
    mutationFn: () => createUserApi({ ...addForm, role: 'STAFF' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowAddUser(false)
      setAddForm({ name: '', email: '', password: '', phone: '' })
      toast.success('Staff user created!')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create user'),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleActiveApi(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update user'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteUserApi(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User deleted!') },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete user'),
  })

  const resetPwMut = useMutation({
    mutationFn: () => resetPasswordApi(resetPwId!, resetPwVal),
    onSuccess: () => { setResetPwId(null); setResetPwVal(''); toast.success('Password reset!') },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to reset password'),
  })

  const createRackMut = useMutation({
    mutationFn: () => racksApi.create(tenantId, rackForm as Rack),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['racks', tenantId] })
      setShowAddRack(false)
      setRackForm({ isActive: true })
      toast.success('Rack created!')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create rack'),
  })

  const updateRackMut = useMutation({
    mutationFn: () => racksApi.update(tenantId, editingRackId!, rackForm as Rack),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['racks', tenantId] })
      setEditingRackId(null)
      setRackForm({ isActive: true })
      toast.success('Rack updated!')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update rack'),
  })

  const deleteRackMut = useMutation({
    mutationFn: (rackId: string) => racksApi.delete(tenantId, rackId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['racks', tenantId] }); toast.success('Rack deleted!') },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete rack'),
  })

  const set = (k: keyof TenantSettings, v: any) => setForm(f => ({ ...f, [k]: v }))

  const ic = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500'

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your pharmacy settings" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-100 overflow-x-auto">
        {([
          { key: 'invoice', label: 'Invoice', icon: FileText },
          { key: 'gst', label: 'GST / Tax', icon: Globe },
          { key: 'printer', label: 'Printer', icon: Printer },
          { key: 'pos', label: 'POS', icon: ShoppingCart },
          { key: 'racks', label: 'Storage Racks', icon: Package },
          { key: 'users', label: 'Users', icon: Users },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${
              tab === key ? 'border-pharma-600 text-pharma-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 ${tab === 'users' ? 'max-w-2xl' : 'max-w-lg'}`}>
        {/* Invoice settings */}
        {tab === 'invoice' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><FileText className="w-4 h-4" /> Invoice Settings</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Prefix</label>
              <input value={form.invoicePrefix || ''} onChange={(e) => set('invoicePrefix', e.target.value)} className={ic} placeholder="INV" />
              <p className="text-xs text-gray-400 mt-1">e.g. INV → INV-20240101-001</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
              <textarea value={form.invoiceFooterText || ''} onChange={(e) => set('invoiceFooterText', e.target.value)}
                className={`${ic} resize-none`} rows={3} placeholder="Thank you for your business!" />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.showDoctorName ?? true}
                  onChange={(e) => set('showDoctorName', e.target.checked)} className="w-4 h-4 accent-pharma-600" />
                <span className="text-sm text-gray-700">Show doctor name on invoice</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
              <input value={form.currencySymbol || '₹'} onChange={(e) => set('currencySymbol', e.target.value)} className={ic} />
            </div>
          </div>
        )}

        {/* GST settings */}
        {tab === 'gst' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Globe className="w-4 h-4" /> GST / Tax Settings</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST State Code</label>
              <input value={form.gstStateCode || ''} onChange={(e) => set('gstStateCode', e.target.value)}
                className={ic} placeholder="e.g. 27 (Maharashtra)" />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isIntraState ?? true}
                  onChange={(e) => set('isIntraState', e.target.checked)} className="w-4 h-4 accent-pharma-600" />
                <span className="text-sm text-gray-700">Intra-State (CGST + SGST)</span>
              </label>
              <p className="text-xs text-gray-400 mt-1">Uncheck for Inter-State sales (IGST only)</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
              <strong>GST Split:</strong> {form.isIntraState ? 'CGST + SGST (each = GST% / 2)' : 'IGST (full GST%)'}
            </div>
          </div>
        )}

        {/* Printer settings */}
        {tab === 'printer' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Printer className="w-4 h-4" /> Printer Settings</h3>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.thermalPrinterEnabled ?? false}
                  onChange={(e) => set('thermalPrinterEnabled', e.target.checked)} className="w-4 h-4 accent-pharma-600" />
                <span className="text-sm text-gray-700">Enable 80mm Thermal Printer mode</span>
              </label>
              <p className="text-xs text-gray-400 mt-1">When enabled, invoices print in 80mm thermal format instead of A4</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Near Expiry Alert (days)</label>
              <input type="number" min={1} max={365} value={form.nearExpiryDays ?? 90}
                onChange={(e) => set('nearExpiryDays', Number(e.target.value))} className={ic} />
              <p className="text-xs text-gray-400 mt-1">Alert when batch expiry is within this many days</p>
            </div>
          </div>
        )}

        {/* POS settings */}
        {tab === 'pos' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> POS Settings</h3>
            <div className="border border-gray-100 rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="allowLooseSale"
                  checked={form.allowLooseSale ?? true}
                  onChange={(e) => set('allowLooseSale', e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-pharma-600"
                />
                <div>
                  <label htmlFor="allowLooseSale" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Allow loose tablet sales
                  </label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    When enabled, staff can sell individual tablets (e.g. 3 tabs from a 10-tab strip).
                    When disabled, only full-strip quantities are allowed on the POS.
                  </p>
                </div>
              </div>
              <div className={`text-xs px-3 py-2 rounded-lg ${(form.allowLooseSale ?? true) ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {(form.allowLooseSale ?? true)
                  ? 'Loose sale ON — POS shows separate Strip + Tab counters.'
                  : 'Loose sale OFF — POS shows Strip counter only; quantity is always a multiple of tabs/strip.'}
              </div>

              {/* New setting: Show strips and tabs display */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="showStripsAndTabs"
                    checked={form.showStripsAndTabs ?? false}
                    onChange={(e) => set('showStripsAndTabs', e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-pharma-600"
                  />
                  <div>
                    <label htmlFor="showStripsAndTabs" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Display stock as strips + individual tabs
                    </label>
                    <p className="text-xs text-gray-400 mt-0.5">
                      When enabled, inventory shows stock as "10 strips, 2 tabs" format.
                      When disabled, shows only strip count.
                    </p>
                  </div>
                </div>
                <div className={`text-xs px-3 py-2 rounded-lg mt-2 ${(form.showStripsAndTabs ?? false) ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'}`}>
                  {(form.showStripsAndTabs ?? false)
                    ? 'Display mode: "10 strips, 2 tabs" (total 102 tabs)'
                    : 'Display mode: "10.2 strips" (strip count only)'}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 mt-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="firstTimeSetupEnabled"
                    checked={form.firstTimeSetupEnabled ?? true}
                    onChange={(e) => set('firstTimeSetupEnabled', e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-pharma-600"
                  />
                  <div>
                    <label htmlFor="firstTimeSetupEnabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Show first-time setup tools
                    </label>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Controls opening stock totals and old daily sales entry. Turn this off after onboarding is complete.
                    </p>
                  </div>
                </div>
                <div className={`text-xs px-3 py-2 rounded-lg mt-2 ${(form.firstTimeSetupEnabled ?? true) ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-700'}`}>
                  {(form.firstTimeSetupEnabled ?? true)
                    ? 'Setup tools visible'
                    : 'Setup tools hidden'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Racks tab */}
        {tab === 'racks' && (
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Package className="w-4 h-4" /> Storage Racks & Locations</h3>
              <button
                onClick={() => { setShowAddRack(v => !v); setEditingRackId(null); setRackForm({ isActive: true }) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-pharma-600 text-white rounded-lg hover:bg-pharma-700 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Rack
              </button>
            </div>
            <p className="text-sm text-gray-500">Define storage locations where medicine batches are stored. Use these when receiving medicines or managing inventory.</p>

            {/* Add/Edit rack form */}
            {(showAddRack || editingRackId) && (
              <div className="border border-pharma-200 rounded-lg p-4 space-y-3 bg-pharma-50">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {editingRackId ? 'Edit Rack' : 'New Rack'}
                </p>
                <input
                  value={rackForm.rackName || ''} onChange={e => setRackForm(f => ({ ...f, rackName: e.target.value }))}
                  className={ic} placeholder="Rack name (e.g. A1, Shelf 1) *" />
                <input
                  value={rackForm.rackCode || ''} onChange={e => setRackForm(f => ({ ...f, rackCode: e.target.value }))}
                  className={ic} placeholder="Rack code (optional, e.g. RACK-001)" />
                <textarea
                  value={rackForm.description || ''} onChange={e => setRackForm(f => ({ ...f, description: e.target.value }))}
                  className={`${ic} resize-none`} rows={2} placeholder="Description (e.g. First shelf by window)" />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={rackForm.isActive ?? true}
                    onChange={(e) => setRackForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-pharma-600" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => editingRackId ? updateRackMut.mutate() : createRackMut.mutate()}
                    disabled={!rackForm.rackName || (editingRackId ? updateRackMut.isPending : createRackMut.isPending)}
                    className="px-4 py-2 text-sm font-medium bg-pharma-600 text-white rounded-lg disabled:opacity-50 hover:bg-pharma-700 transition"
                  >
                    {editingRackId
                      ? updateRackMut.isPending ? 'Updating…' : 'Update Rack'
                      : createRackMut.isPending ? 'Creating…' : 'Create Rack'}
                  </button>
                  <button
                    onClick={() => { setShowAddRack(false); setEditingRackId(null); setRackForm({ isActive: true }) }}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Racks list */}
            {racksQuery.isLoading && <p className="text-sm text-gray-400 text-center py-6">Loading racks…</p>}
            {racksQuery.data?.content?.length === 0 && !showAddRack && !editingRackId && (
              <p className="text-sm text-gray-400 text-center py-6">No racks defined yet. Click "Add Rack" to create one.</p>
            )}
            {racksQuery.data?.content && racksQuery.data.content.length > 0 && (
              <div className="space-y-2">
                {racksQuery.data.content.map(rack => (
                  <div key={rack.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                      rack.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                    }`}>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{rack.rackName}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {rack.rackCode && <span>{rack.rackCode}</span>}
                        {rack.description && <span>• {rack.description}</span>}
                      </div>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      rack.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                    }`}>{rack.isActive ? 'Active' : 'Inactive'}</span>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => { setEditingRackId(rack.id || null); setRackForm(rack); setShowAddRack(false) }}
                        className="p-1.5 text-gray-400 hover:text-pharma-600 hover:bg-pharma-50 rounded transition"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => rack.id && deleteRackMut.mutate(rack.id)}
                        disabled={deleteRackMut.isPending}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users tab */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Users className="w-4 h-4" /> User Management</h3>
              <button
                onClick={() => { setShowAddUser(v => !v); setAddForm({ name: '', email: '', password: '', phone: '' }) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-pharma-600 text-white rounded-lg hover:bg-pharma-700 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Staff
              </button>
            </div>
            <p className="text-sm text-gray-500">Manage staff accounts for your pharmacy.</p>

            {/* Add user form */}
            {showAddUser && (
              <div className="border border-pharma-200 rounded-lg p-4 space-y-3 bg-pharma-50">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">New Staff User</p>
                <input
                  value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  className={ic} placeholder="Full name *" />
                <input
                  value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  className={ic} placeholder="Email *" type="email" />
                <div className="relative">
                  <input
                    value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                    className={ic} placeholder="Password (min 6 chars) *"
                    type={showAddPw ? 'text' : 'password'} />
                  <button type="button" onClick={() => setShowAddPw(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showAddPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <input
                  value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                  className={ic} placeholder="Phone (optional)" />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => createUserMut.mutate()}
                    disabled={!addForm.name || !addForm.email || addForm.password.length < 6 || createUserMut.isPending}
                    className="px-4 py-2 text-sm font-medium bg-pharma-600 text-white rounded-lg disabled:opacity-50 hover:bg-pharma-700 transition"
                  >
                    {createUserMut.isPending ? 'Creating…' : 'Create User'}
                  </button>
                  <button onClick={() => setShowAddUser(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
              </div>
            )}

            {/* User list */}
            {usersQuery.isLoading && <p className="text-sm text-gray-400 text-center py-6">Loading users…</p>}
            {usersQuery.data?.length === 0 && !showAddUser && (
              <p className="text-sm text-gray-400 text-center py-6">No staff users yet. Click "Add Staff" to create one.</p>
            )}
            {usersQuery.data && usersQuery.data.length > 0 && (
              <div className="space-y-2">
                {usersQuery.data.map(user => (
                  <div key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                      user.active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                    }`}>
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-pharma-100 text-pharma-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}{user.phone ? ` · ${user.phone}` : ''}</p>
                    </div>
                    {/* Role + status badges */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">{user.role}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        user.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                      }`}>{user.active ? 'Active' : 'Inactive'}</span>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {/* Reset password inline */}
                      {resetPwId === user.id ? (
                        <div className="flex items-center gap-1">
                          <div className="relative">
                            <input value={resetPwVal} onChange={e => setResetPwVal(e.target.value)}
                              className="w-28 px-2 py-1 text-xs border border-gray-200 rounded-lg pr-6"
                              placeholder="New password" type={showResetPw ? 'text' : 'password'} />
                            <button type="button" onClick={() => setShowResetPw(v => !v)}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400">
                              {showResetPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                          <button onClick={() => resetPwMut.mutate()}
                            disabled={resetPwVal.length < 6 || resetPwMut.isPending}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700">
                            {resetPwMut.isPending ? '…' : 'Set'}
                          </button>
                          <button onClick={() => { setResetPwId(null); setResetPwVal('') }}
                            className="p-1 text-gray-400 hover:text-gray-600">
                            <span className="text-xs">✕</span>
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setResetPwId(user.id); setResetPwVal(''); setShowResetPw(false) }}
                          title="Reset password"
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition">
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {/* Toggle active — not for ADMIN/SYSTEM */}
                      {user.role !== 'ADMIN' && user.role !== 'SYSTEM' && (
                        <button
                          onClick={() => toggleMut.mutate({ id: user.id, active: !user.active })}
                          disabled={toggleMut.isPending}
                          title={user.active ? 'Deactivate' : 'Activate'}
                          className="p-1.5 text-gray-400 hover:text-amber-600 rounded hover:bg-amber-50 transition">
                          {user.active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {/* Delete — not for ADMIN/SYSTEM */}
                      {user.role !== 'ADMIN' && user.role !== 'SYSTEM' && (
                        <button
                          onClick={() => { if (window.confirm(`Delete ${user.name}? This cannot be undone.`)) deleteMut.mutate(user.id) }}
                          disabled={deleteMut.isPending}
                          title="Delete user"
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab !== 'users' && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending && <LoadingSpinner size="sm" />}
              Save Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
