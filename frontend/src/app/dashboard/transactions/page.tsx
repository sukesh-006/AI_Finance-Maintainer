'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency, formatDate, currentMonth, currentYear } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import toast from 'react-hot-toast'
import { Plus, Search, Trash2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'

type TxType = 'income' | 'expense' | ''

function Modal({ open, onClose, title, children }: any) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-5">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<TxType>('')
  const [filterMonth, setFilterMonth] = useState(currentMonth())
  const [filterYear, setFilterYear] = useState(currentYear())
  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState<any>(null)
  const [form, setForm] = useState({
    category_id: '', amount: '', type: 'expense', description: '',
    payment_mode: 'upi', date: new Date().toISOString().slice(0, 10), notes: ''
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/transactions/categories').then(r => r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page, search, filterType, filterMonth, filterYear],
    queryFn: () => api.get('/api/transactions', {
      params: { page, per_page: 15, search: search || undefined, type: filterType || undefined, month: filterMonth, year: filterYear }
    }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/api/transactions', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Transaction added'); setShowForm(false); resetForm() },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/transactions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Deleted') },
  })

  const resetForm = () => setForm({ category_id: '', amount: '', type: 'expense', description: '', payment_mode: 'upi', date: new Date().toISOString().slice(0, 10), notes: '' })

  const filteredCats = categories?.filter((c: any) => form.type ? c.type === form.type : true) || []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.category_id || !form.amount) return toast.error('Fill all required fields')
    createMutation.mutate({ ...form, amount: parseFloat(form.amount), category_id: parseInt(form.category_id) })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track your income and expenses</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add transaction
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input pl-9" placeholder="Search transactions…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="select w-auto" value={filterType} onChange={e => setFilterType(e.target.value as TxType)}>
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select className="select w-auto" value={filterMonth} onChange={e => setFilterMonth(+e.target.value)}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleString('default', { month: 'long' })}</option>
          ))}
        </select>
        <select className="select w-auto" value={filterYear} onChange={e => setFilterYear(+e.target.value)}>
          {[currentYear() - 1, currentYear(), currentYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              {['Date', 'Description', 'Category', 'Type', 'Mode', 'Amount', ''].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center text-gray-500 py-12">Loading…</td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-500 py-12">No transactions found. Add your first one!</td></tr>
            ) : data?.items?.map((t: any) => (
              <tr key={t.id} className="border-b border-surface-border/50 hover:bg-surface-hover/50 transition-colors">
                <td className="px-4 py-3 text-gray-400">{formatDate(t.date)}</td>
                <td className="px-4 py-3 text-white font-medium">{t.description || '—'}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <span>{t.category.icon}</span>
                    {t.category.name}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={t.type === 'income' ? 'badge-income' : 'badge-expense'}>
                    {t.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 capitalize">{t.payment_mode.replace('_', ' ')}</td>
                <td className={`px-4 py-3 font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, user?.currency)}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteMutation.mutate(t.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
            <span className="text-xs text-gray-500">
              Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, data.total)} of {data.total}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost py-1 px-2 disabled:opacity-30">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-gray-400">{page} / {data.pages}</span>
              <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages} className="btn-ghost py-1 px-2 disabled:opacity-30">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Transaction">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Type *</label>
              <select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value, category_id: '' })}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Amount *</label>
              <input type="number" min="1" step="0.01" className="input" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Category *</label>
            <select className="select" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Select category</option>
              {filteredCats.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Date *</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Payment mode</label>
              <select className="select" value={form.payment_mode} onChange={e => setForm({ ...form, payment_mode: e.target.value })}>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
            <input type="text" className="input" placeholder="What was this for?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
              {createMutation.isPending ? 'Saving…' : 'Add transaction'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
