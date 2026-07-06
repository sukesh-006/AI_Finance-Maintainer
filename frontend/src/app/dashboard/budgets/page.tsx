'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency, currentMonth, currentYear } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import toast from 'react-hot-toast'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'

function Modal({ open, onClose, children, title }: any) {
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

export default function BudgetsPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [month, setMonth] = useState(currentMonth())
  const [year, setYear] = useState(currentYear())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category_id: '', amount: '' })

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets', month, year],
    queryFn: () => api.get(`/api/budgets?month=${month}&year=${year}`).then(r => r.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories-expense'],
    queryFn: () => api.get('/api/transactions/categories?type=expense').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/api/budgets', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); toast.success('Budget created'); setShowForm(false); setForm({ category_id: '', amount: '' }) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/budgets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); toast.success('Budget removed') },
  })

  const totalBudget = budgets?.reduce((s: number, b: any) => s + b.amount, 0) || 0
  const totalSpent = budgets?.reduce((s: number, b: any) => s + b.spent, 0) || 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.category_id || !form.amount) return toast.error('Fill all fields')
    createMutation.mutate({ category_id: parseInt(form.category_id), amount: parseFloat(form.amount), month, year })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Budgets</h1>
          <p className="text-gray-500 text-sm mt-0.5">Set spending limits by category</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="select w-auto" value={month} onChange={e => setMonth(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleString('default', { month: 'short' })}</option>
            ))}
          </select>
          <select className="select w-auto" value={year} onChange={e => setYear(+e.target.value)}>
            {[currentYear() - 1, currentYear(), currentYear() + 1].map(y => <option key={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add budget
          </button>
        </div>
      </div>

      {/* Summary */}
      {budgets?.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Total budget utilization</span>
            <span className="text-sm font-medium text-white">
              {formatCurrency(totalSpent, user?.currency)} / {formatCurrency(totalBudget, user?.currency)}
            </span>
          </div>
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${totalSpent / totalBudget > 0.9 ? 'bg-red-500' : totalSpent / totalBudget > 0.7 ? 'bg-amber-500' : 'bg-brand-500'}`}
              style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{Math.min(Math.round((totalSpent / totalBudget) * 100), 100)}% used</span>
            <span className="text-xs text-gray-500">{formatCurrency(Math.max(totalBudget - totalSpent, 0), user?.currency)} remaining</span>
          </div>
        </div>
      )}

      {/* Budget cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 text-center text-gray-500 py-12">Loading…</div>
        ) : budgets?.length === 0 ? (
          <div className="col-span-2 card text-center py-12">
            <p className="text-gray-500 mb-3">No budgets set for this month</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mx-auto">Add your first budget</button>
          </div>
        ) : budgets?.map((b: any) => (
          <div key={b.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{b.category.icon}</span>
                <div>
                  <div className="font-medium text-white">{b.category.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatCurrency(b.spent, user?.currency)} spent of {formatCurrency(b.amount, user?.currency)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {b.usage_pct > 90 && <AlertTriangle size={14} className="text-red-400" />}
                <button onClick={() => deleteMutation.mutate(b.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${b.usage_pct > 90 ? 'bg-red-500' : b.usage_pct > 70 ? 'bg-amber-500' : 'bg-brand-500'}`}
                style={{ width: `${Math.min(b.usage_pct, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{b.usage_pct}% used</span>
              <span className={b.remaining === 0 ? 'text-red-400' : 'text-emerald-400'}>
                {formatCurrency(b.remaining, user?.currency)} left
              </span>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Create Budget">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Category *</label>
            <select className="select" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Select category</option>
              {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Budget amount *</label>
            <input type="number" min="1" className="input" placeholder="e.g. 5000" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">Create budget</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
