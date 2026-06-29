import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type CreateTenantPayload, type UpdateTenantPayload } from '@/api/admin'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/useAuthStore'
import { StatCard } from '@/components/shared/StatCard'
import { Button, Badge } from '@/components/shared/PageHeader'
import { PageLoader, LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import { Building2, CheckCircle2, CreditCard, AlertTriangle, LogOut, Plus, X, Settings2, KeyRound, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Tenant, Subscription, TenantSettings } from '@/types'

const subVariant = (s?: string) =>
  s === 'ACTIVE' ? 'success' : s === 'GRACE' ? 'warning' : s === 'EXPIRED' ? 'danger' : 'default'

export default function SuperAdminPage() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const [selected, setSelected] = useState<Tenant | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: tenantsPage, isLoading } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: () => adminApi.listTenants(),
  })
  const { data: subs } = useQuery({
    queryKey: ['admin-subs'],
    queryFn: () => adminApi.listSubscriptions(),
  })

  const tenants = tenantsPage?.content ?? []
  const subByTenant = new Map((subs ?? []).map((s) => [s.tenantId, s]))

  const activeCount = tenants.filter((t) => t.isActive).length
  const activeSubs = (subs ?? []).filter((s) => s.status === 'ACTIVE').length
  const atRisk = (subs ?? []).filter((s) => s.status === 'EXPIRED' || s.status === 'GRACE').length

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* clear locally regardless */ }
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-gradient-to-r from-scalio-900 via-gray-900 to-gray-950 text-white px-4 md:px-6 shadow">
        <a href="https://scaliolab.com/" target="_blank" rel="noreferrer" aria-label="Open ScalioLab website">
          <img src="/scaliolab-logo.png" alt="ScalioLab" className="w-8 h-8 rounded-lg" />
        </a>
        <div>
          <p className="font-bold leading-tight">Scalio Pharma - System Console</p>
          <a
            href="https://scaliolab.com/"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-gray-400 hover:text-white"
          >
            Powered by ScalioLab
          </a>
        </div>
        <div className="flex-1" />
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Pharmacies" value={tenants.length} icon={Building2} color="blue" />
          <StatCard title="Active" value={activeCount} icon={CheckCircle2} color="green" />
          <StatCard title="On Subscription" value={activeSubs} icon={CreditCard} color="purple" />
          <StatCard title="Expired / Grace" value={atRisk} icon={AlertTriangle} color="red" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Tenants</h2>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Onboard Pharmacy
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? <PageLoader /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Pharmacy', 'Status', 'Subscription', 'Modules', 'Max Disc.', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tenants.map((t) => {
                    const sub = subByTenant.get(t.id)
                    return (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{t.name}</p>
                          <p className="text-xs text-gray-400">{t.subdomain}.pharma</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={t.isActive ? 'success' : 'danger'}>{t.isActive ? 'Active' : 'Disabled'}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {sub ? (
                            <div className="flex flex-col gap-0.5">
                              <Badge variant={subVariant(sub.status)}>{sub.status}</Badge>
                              <span className="text-xs text-gray-400">till {formatDate(sub.endDate)}</span>
                            </div>
                          ) : <span className="text-xs text-gray-400">None</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {[['P', t.purchaseModuleEnabled], ['B', t.billingModuleEnabled], ['R', t.reportsModuleEnabled]].map(([k, on]) => (
                              <span key={k as string}
                                className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${on ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                                title={`${k === 'P' ? 'Purchase' : k === 'B' ? 'Billing' : 'Reports'}: ${on ? 'on' : 'off'}`}>
                                {k as string}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{t.maxStaffDiscountPercent}%</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="secondary" onClick={() => setSelected(t)}>
                            <Settings2 className="w-4 h-4" /> Manage
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                  {tenants.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">No tenants yet — onboard one.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {selected && (
        <ManageTenantDrawer
          tenant={selected}
          subscription={subByTenant.get(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
      {showCreate && <CreateTenantModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

// ── Manage drawer ───────────────────────────────────────────────────────────
function ManageTenantDrawer({ tenant, subscription, onClose }:
  { tenant: Tenant; subscription?: Subscription; onClose: () => void }) {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-tenants'] })
    qc.invalidateQueries({ queryKey: ['admin-subs'] })
  }
  const onErr = (e: any) => toast.error(e?.response?.data?.message || 'Action failed')
  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState('')

  const { data: tenantUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-tenant-users', tenant.id],
    queryFn: () => adminApi.listTenantUsers(tenant.id),
  })
  const { data: settings } = useQuery({
    queryKey: ['admin-tenant-settings', tenant.id],
    queryFn: () => adminApi.getTenantSettings(tenant.id),
  })

  const [flags, setFlags] = useState({
    purchaseModuleEnabled: tenant.purchaseModuleEnabled,
    billingModuleEnabled: tenant.billingModuleEnabled,
    reportsModuleEnabled: tenant.reportsModuleEnabled,
  })
  const [details, setDetails] = useState<UpdateTenantPayload>({
    name: tenant.name,
    subdomain: tenant.subdomain,
    email: tenant.email,
    phone: tenant.phone ?? '',
    address: tenant.address ?? '',
    city: tenant.city ?? '',
    state: tenant.state ?? '',
    pincode: tenant.pincode ?? '',
    gstNumber: tenant.gstNumber ?? '',
    drugLicenseNumber: tenant.drugLicenseNumber ?? '',
    logoUrl: tenant.logoUrl ?? '',
  })
  const [maxDisc, setMaxDisc] = useState(String(tenant.maxStaffDiscountPercent ?? 0))
  const [brand, setBrand] = useState({
    appTitle: tenant.appTitle ?? '',
    primaryColor: tenant.primaryColor ?? '#8a0f0f',
    fontFamily: tenant.fontFamily ?? 'Inter',
  })
  const [onboarding, setOnboarding] = useState<Partial<TenantSettings>>({})
  const today = new Date().toISOString().split('T')[0]
  const nextYear = new Date(Date.now() + 365 * 864e5).toISOString().split('T')[0]
  const [sub, setSub] = useState({
    planName: subscription?.planName ?? 'BASIC',
    startDate: subscription?.startDate ?? today,
    endDate: subscription?.endDate ?? nextYear,
    notes: subscription?.notes ?? '',
  })

  const toggleActive = useMutation({
    mutationFn: () => adminApi.toggleActive(tenant.id, !tenant.isActive),
    onSuccess: () => { toast.success('Status updated'); refresh(); onClose() }, onError: onErr,
  })
  const saveDetails = useMutation({
    mutationFn: () => adminApi.updateTenant(tenant.id, { ...details, subdomain: details.subdomain.toLowerCase() }),
    onSuccess: () => { toast.success('Tenant details updated'); refresh() }, onError: onErr,
  })
  const saveFlags = useMutation({
    mutationFn: () => adminApi.updateFlags(tenant.id, flags),
    onSuccess: () => { toast.success('Modules updated'); refresh() }, onError: onErr,
  })
  const saveDisc = useMutation({
    mutationFn: () => adminApi.setMaxDiscount(tenant.id, Number(maxDisc)),
    onSuccess: () => { toast.success('Max discount updated'); refresh() }, onError: onErr,
  })
  const saveBrand = useMutation({
    mutationFn: () => adminApi.updateBranding(tenant.id, brand),
    onSuccess: () => { toast.success('Branding updated'); refresh() }, onError: onErr,
  })
  const saveOnboarding = useMutation({
    mutationFn: () => adminApi.updateTenantSettings(tenant.id, { ...settings, ...onboarding }),
    onSuccess: () => {
      toast.success('Onboarding settings saved')
      qc.invalidateQueries({ queryKey: ['admin-tenant-settings', tenant.id] })
    },
    onError: onErr,
  })
  const setTempPassword = useMutation({
    mutationFn: () => adminApi.setTenantUserTemporaryPassword(tenant.id, resetUserId!, temporaryPassword),
    onSuccess: () => {
      toast.success('Temporary password set')
      setResetUserId(null)
      setTemporaryPassword('')
      qc.invalidateQueries({ queryKey: ['admin-tenant-users', tenant.id] })
    },
    onError: onErr,
  })
  const saveSub = useMutation({
    mutationFn: () => adminApi.upsertSubscription(tenant.id, sub),
    onSuccess: () => { toast.success('Subscription saved'); refresh() }, onError: onErr,
  })

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t border-gray-100 pt-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>
      {children}
    </div>
  )
  const input = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-scalio-600'
  const detailRequired = !details.name.trim() || !details.subdomain.trim() || !details.email.trim()
  const setDetail = (key: keyof UpdateTenantPayload) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDetails(current => ({ ...current, [key]: e.target.value }))
  const onboardingForm = { ...(settings ?? {}), ...onboarding } as Partial<TenantSettings>
  const setOnboardingField = (key: keyof TenantSettings, value: any) =>
    setOnboarding(current => ({ ...current, [key]: value }))

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900">{tenant.name}</p>
            <p className="text-xs text-gray-400">{tenant.subdomain}.pharma · {tenant.email}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status */}
          <Section title="Account status">
            <div className="flex items-center justify-between">
              <Badge variant={tenant.isActive ? 'success' : 'danger'}>{tenant.isActive ? 'Active' : 'Disabled'}</Badge>
              <Button size="sm" variant={tenant.isActive ? 'danger' : 'primary'}
                onClick={() => toggleActive.mutate()} disabled={toggleActive.isPending}>
                {tenant.isActive ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </Section>

          {/* Pharmacy details */}
          <Section title="Pharmacy details">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Pharmacy name *" value={details.name} onChange={setDetail('name')} className={input} />
                <input placeholder="Subdomain *" value={details.subdomain} onChange={setDetail('subdomain')} className={input} />
                <input placeholder="Email *" value={details.email} onChange={setDetail('email')} className={input} />
                <input placeholder="Phone" value={details.phone} onChange={setDetail('phone')} className={input} />
                <input placeholder="City" value={details.city} onChange={setDetail('city')} className={input} />
                <input placeholder="State" value={details.state} onChange={setDetail('state')} className={input} />
                <input placeholder="Pincode" value={details.pincode} onChange={setDetail('pincode')} className={input} />
                <input placeholder="GST number" value={details.gstNumber} onChange={setDetail('gstNumber')} className={input} />
                <input placeholder="Drug license" value={details.drugLicenseNumber} onChange={setDetail('drugLicenseNumber')} className={input} />
                <input placeholder="Logo URL" value={details.logoUrl} onChange={setDetail('logoUrl')} className={input} />
              </div>
              <input placeholder="Address" value={details.address} onChange={setDetail('address')} className={input} />
              <Button size="sm" onClick={() => saveDetails.mutate()} disabled={detailRequired || saveDetails.isPending}>
                Save details
              </Button>
            </div>
          </Section>

          {/* Feature flags */}
          <Section title="Modules">
            <div className="space-y-2">
              {([['purchaseModuleEnabled', 'Purchase'], ['billingModuleEnabled', 'Billing'], ['reportsModuleEnabled', 'Reports & Investment Analytics']] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={flags[key]}
                    onChange={(e) => setFlags(f => ({ ...f, [key]: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-scalio-700 focus:ring-scalio-600" />
                  {label}
                </label>
              ))}
              <Button size="sm" onClick={() => saveFlags.mutate()} disabled={saveFlags.isPending}>Save modules</Button>
            </div>
          </Section>

          {/* Max discount */}
          <Section title="Max staff discount (%)">
            <div className="flex gap-2">
              <input type="number" min={0} max={100} value={maxDisc} onChange={(e) => setMaxDisc(e.target.value)} className={input} />
              <Button size="sm" onClick={() => saveDisc.mutate()} disabled={saveDisc.isPending}>Save</Button>
            </div>
          </Section>

          {/* Branding */}
          <Section title="Branding">
            <div className="space-y-2">
              <input placeholder="App title" value={brand.appTitle}
                onChange={(e) => setBrand(b => ({ ...b, appTitle: e.target.value }))} className={input} />
              <div className="flex items-center gap-2">
                <input type="color" value={brand.primaryColor}
                  onChange={(e) => setBrand(b => ({ ...b, primaryColor: e.target.value }))}
                  className="h-9 w-12 rounded border border-gray-200" />
                <input placeholder="#8a0f0f" value={brand.primaryColor}
                  onChange={(e) => setBrand(b => ({ ...b, primaryColor: e.target.value }))} className={input} />
              </div>
              <input placeholder="Font (e.g. Inter)" value={brand.fontFamily}
                onChange={(e) => setBrand(b => ({ ...b, fontFamily: e.target.value }))} className={input} />
              <Button size="sm" onClick={() => saveBrand.mutate()} disabled={saveBrand.isPending}>Save branding</Button>
            </div>
          </Section>

          {/* Inventory onboarding */}
          <Section title="Inventory onboarding">
            <div className="space-y-3">
              {([
                {
                  mode: 'CURRENT_STOCK',
                  title: 'Current stock only',
                  body: 'Tenant enters only stock available on go-live day.',
                },
                {
                  mode: 'FULL_HISTORY',
                  title: 'Full historical inventory',
                  body: 'Tenant can enter purchased-to-date, old sold quantity, current stock, and old sales summaries.',
                },
              ] as const).map(option => (
                <label
                  key={option.mode}
                  className={`block rounded-lg border p-3 transition ${
                    (onboardingForm.inventoryOnboardingMode ?? 'CURRENT_STOCK') === option.mode
                      ? 'border-scalio-600 bg-scalio-50'
                      : 'border-gray-100 bg-white'
                  } ${onboardingForm.inventoryOnboardingCompleted ? 'opacity-70' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name={`inventoryOnboardingMode-${tenant.id}`}
                      value={option.mode}
                      checked={(onboardingForm.inventoryOnboardingMode ?? 'CURRENT_STOCK') === option.mode}
                      disabled={onboardingForm.inventoryOnboardingCompleted ?? false}
                      onChange={() => setOnboardingField('inventoryOnboardingMode', option.mode)}
                      className="mt-1 h-4 w-4 text-scalio-700 focus:ring-scalio-600"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{option.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{option.body}</p>
                    </div>
                  </div>
                </label>
              ))}

              <label className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
                <input
                  type="checkbox"
                  checked={onboardingForm.firstTimeSetupEnabled ?? true}
                  disabled={onboardingForm.inventoryOnboardingCompleted ?? false}
                  onChange={(e) => setOnboardingField('firstTimeSetupEnabled', e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-scalio-700 focus:ring-scalio-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">Allow onboarding tools</p>
                  <p className="text-xs text-gray-500 mt-0.5">Keep enabled while opening stock and old sales are being entered.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-gray-100 p-3">
                <input
                  type="checkbox"
                  checked={onboardingForm.inventoryOnboardingCompleted ?? false}
                  onChange={(e) => {
                    setOnboardingField('inventoryOnboardingCompleted', e.target.checked)
                    if (e.target.checked) setOnboardingField('firstTimeSetupEnabled', false)
                  }}
                  className="mt-0.5 h-4 w-4 text-scalio-700 focus:ring-scalio-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">Mark onboarding complete</p>
                  <p className="text-xs text-gray-500 mt-0.5">Closes old sale entry and blocks historical import APIs for this tenant.</p>
                </div>
              </label>

              <Button size="sm" onClick={() => saveOnboarding.mutate()} disabled={!settings || saveOnboarding.isPending}>
                Save onboarding
              </Button>
            </div>
          </Section>

          {/* Subscription */}
          <Section title="Subscription">
            <div className="space-y-2">
              <input placeholder="Plan name" value={sub.planName}
                onChange={(e) => setSub(s => ({ ...s, planName: e.target.value }))} className={input} />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-gray-500">Start
                  <input type="date" value={sub.startDate} onChange={(e) => setSub(s => ({ ...s, startDate: e.target.value }))} className={input} />
                </label>
                <label className="text-xs text-gray-500">End
                  <input type="date" value={sub.endDate} onChange={(e) => setSub(s => ({ ...s, endDate: e.target.value }))} className={input} />
                </label>
              </div>
              <input placeholder="Notes (optional)" value={sub.notes}
                onChange={(e) => setSub(s => ({ ...s, notes: e.target.value }))} className={input} />
              <Button size="sm" onClick={() => saveSub.mutate()} disabled={saveSub.isPending}>
                {subscription ? 'Renew / update' : 'Create subscription'}
              </Button>
            </div>
          </Section>

          {/* Password recovery */}
          <Section title="Tenant user password recovery">
            <div className="space-y-3">
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                Use this when a tenant admin or staff member cannot recover their account. Set a temporary password and ask them to change it after login.
              </div>

              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Users className="w-4 h-4 text-scalio-700" /> Registered users
              </div>

              {usersLoading && <p className="text-sm text-gray-400">Loading users...</p>}
              {!usersLoading && tenantUsers.length === 0 && <p className="text-sm text-gray-400">No users found.</p>}

              <div className="space-y-2">
                {tenantUsers.map(user => (
                  <div key={user.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                        <div className="mt-1 flex gap-1">
                          <Badge variant={user.role === 'ADMIN' ? 'info' : 'default'}>{user.role}</Badge>
                          <Badge variant={user.active ? 'success' : 'danger'}>{user.active ? 'Active' : 'Inactive'}</Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setResetUserId(user.id)
                          setTemporaryPassword('')
                        }}
                      >
                        <KeyRound className="w-4 h-4" /> Temp
                      </Button>
                    </div>

                    {resetUserId === user.id && (
                      <div className="mt-3 space-y-2">
                        <input
                          type="text"
                          value={temporaryPassword}
                          onChange={(e) => setTemporaryPassword(e.target.value)}
                          placeholder="Temporary password, min 8 chars"
                          className={input}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => setTempPassword.mutate()}
                            disabled={temporaryPassword.length < 8 || setTempPassword.isPending}
                          >
                            Set temporary password
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setResetUserId(null); setTemporaryPassword('') }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

// ── Onboard modal ────────────────────────────────────────────────────────────
function CreateTenantModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<CreateTenantPayload>({
    name: '', subdomain: '', email: '', phone: '', city: '', state: '',
    gstNumber: '', drugLicenseNumber: '',
    adminName: '', adminEmail: '', adminPassword: '',
    appTitle: '', primaryColor: '#8a0f0f', fontFamily: 'Inter',
  })
  const set = (k: keyof CreateTenantPayload) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const create = useMutation({
    mutationFn: () => adminApi.createTenant({ ...form, subdomain: form.subdomain.toLowerCase() }),
    onSuccess: () => {
      toast.success('Pharmacy onboarded')
      qc.invalidateQueries({ queryKey: ['admin-tenants'] })
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create tenant'),
  })

  const input = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-scalio-600'
  const required = !form.name || !form.subdomain || !form.email || !form.adminName || !form.adminEmail || !form.adminPassword

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Onboard Pharmacy</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Pharmacy</p>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Name *" value={form.name} onChange={set('name')} className={input} />
              <input placeholder="Subdomain *" value={form.subdomain} onChange={set('subdomain')} className={input} />
              <input placeholder="Org email *" value={form.email} onChange={set('email')} className={input} />
              <input placeholder="Phone" value={form.phone} onChange={set('phone')} className={input} />
              <input placeholder="City" value={form.city} onChange={set('city')} className={input} />
              <input placeholder="State" value={form.state} onChange={set('state')} className={input} />
              <input placeholder="GST number" value={form.gstNumber} onChange={set('gstNumber')} className={input} />
              <input placeholder="Drug licence" value={form.drugLicenseNumber} onChange={set('drugLicenseNumber')} className={input} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Admin user</p>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Admin name *" value={form.adminName} onChange={set('adminName')} className={input} />
              <input placeholder="Admin email *" value={form.adminEmail} onChange={set('adminEmail')} className={input} />
              <input placeholder="Temp password *" value={form.adminPassword} onChange={set('adminPassword')} className={`${input} col-span-2`} />
            </div>
          </div>
          <Button className="w-full" onClick={() => create.mutate()} disabled={required || create.isPending}>
            {create.isPending ? <LoadingSpinner size="sm" /> : <Plus className="w-4 h-4" />}
            Create pharmacy
          </Button>
        </div>
      </div>
    </div>
  )
}
