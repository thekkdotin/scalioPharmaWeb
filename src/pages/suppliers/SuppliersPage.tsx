import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { suppliersApi } from '@/api/purchases'
import { useAuthStore } from '@/store/useAuthStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { PageLoader, LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Badge, Button } from '@/components/shared/PageHeader'
import { Plus, Edit, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Supplier } from '@/types'

const blank: Partial<Supplier> = {
  name: '', contactPerson: '', phone: '', email: '',
  address: '', city: '', gstNumber: '', drugLicenseNumber: '', isActive: true,
}

export default function SuppliersPage() {
  const tenantId = useAuthStore((s) => s.tenantId())!
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', tenantId, search, page],
    queryFn: () => suppliersApi.list(tenantId, { search, page, size: 20 }),
    placeholderData: (prev) => prev,
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      editing?.id ? suppliersApi.update(tenantId, editing.id, editing) : suppliersApi.create(tenantId, editing!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers', tenantId] })
      toast.success(editing?.id ? 'Supplier updated!' : 'Supplier added!')
      setEditing(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  })

  const set = (field: keyof Supplier, value: any) => setEditing(s => s ? { ...s, [field]: value } : s)

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle={`${data?.totalElements ?? 0} suppliers`}
        action={<Button onClick={() => setEditing({ ...blank })}><Plus className="w-4 h-4" /> Add Supplier</Button>}
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder="Search by name, phone..." className="max-w-sm" />
      </div>

      {/* Form modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg">{editing.id ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              {([
                { f: 'name', l: 'Name *', span: true },
                { f: 'contactPerson', l: 'Contact Person' },
                { f: 'phone', l: 'Phone' },
                { f: 'email', l: 'Email' },
                { f: 'city', l: 'City' },
                { f: 'address', l: 'Address', span: true },
                { f: 'gstNumber', l: 'GST No.' },
                { f: 'drugLicenseNumber', l: 'Drug License' },
              ] as { f: keyof Supplier; l: string; span?: boolean }[]).map(({ f, l, span }) => (
                <div key={f} className={span ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                  <input
                    value={(editing[f] as string) || ''}
                    onChange={(e) => set(f, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-500"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.isActive ?? true}
                    onChange={(e) => set('isActive', e.target.checked)} className="w-4 h-4 accent-pharma-600" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <LoadingSpinner size="sm" />} Save
              </Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? <PageLoader /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Name', 'Contact', 'Phone', 'City', 'GST', 'Status', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.content?.map((s: Supplier) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                      <td className="px-4 py-3 text-gray-500">{s.contactPerson || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{s.phone}</td>
                      <td className="px-4 py-3 text-gray-500">{s.city || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{s.gstNumber || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={s.isActive ? 'success' : 'danger'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setEditing({ ...s })} className="text-pharma-500 hover:text-pharma-700">
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-gray-500">Page {page + 1} of {data.totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Prev</Button>
                  <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages - 1}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
