'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import toast from 'react-hot-toast'
import { Plus, Trash2, TrendingUp } from 'lucide-react'

const GOAL_ICONS = ['🎯', '💻', '📱', '✈️', '🏠', '🚗', '📚', '🎓', '💍', '🏋️', '🎸', '🌍']

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

export default function GoalsPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [updateGoal, setUpdateGoal] = useState<any>(null)
  const [addAmount, setAddAmount] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', target_amount: '', current_amount: '0',
    target_date: '', icon: '🎯'
  })

  const { data: goals, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.get('/api/goals').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/api/goals', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Goal created!'); setShowForm(false); setForm({ title: '', description: '', target_amount: '', current_amount: '0', target_date: '', icon: '🎯' }) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/api/goals/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Progress updated!'); setUpdateGoal(null); setAddAmount('') },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/goals/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Goal deleted') },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.target_amount || !form.target_date) return toast.error('Fill required fields')
    createMutation.mutate({ ...form, target_amount: parseFloat(form.target_amount), current_amount: parseFloat(form.current_amount || '0') })
  }

  const handleAddProgress = (e: React.FormEvent) => {
    e.preventDefault()
    if (!addAmount || !updateGoal) return
    const newAmount = updateGoal.current_amount + parseFloat(addAmount)
    updateMutation.mutate({ id: updateGoal.id, data: { current_amount: newAmount } })
  }

  const statusColor: Record<string, string> = {
    active: 'text-brand-400 bg-brand-500/10',
    completed: 'text-emerald-400 bg-emerald-500/10',
    paused: 'text-amber-400 bg-amber-500/10',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Savings Goals</h1>
          <p className="text-gray-500 text-sm mt-0.5">Set targets and track your progress</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New goal
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 text-center text-gray-500 py-12">Loading…</div>
        ) : goals?.length === 0 ? (
          <div className="col-span-2 card text-center py-12">
            <div className="text-4xl mb-3">🎯</div>
            <p className="text-gray-400 font-medium mb-1">No goals yet</p>
            <p className="text-gray-600 text-sm mb-4">Set a savings goal for something you want to achieve</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mx-auto">Create your first goal</button>
          </div>
        ) : goals?.map((g: any) => (
          <div key={g.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{g.icon}</div>
                <div>
                  <div className="font-semibold text-white">{g.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Target: {formatDate(g.target_date)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[g.status]}`}>
                  {g.status}
                </span>
                <button onClick={() => deleteMutation.mutate(g.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">{formatCurrency(g.current_amount, user?.currency)} saved</span>
              <span className="text-white font-medium">{formatCurrency(g.target_amount, user?.currency)}</span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all ${g.status === 'completed' ? 'bg-emerald-500' : 'bg-brand-500'}`}
                style={{ width: `${g.progress_pct}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <div className="bg-surface rounded-lg p-2">
                <div className="text-xs text-gray-500">Progress</div>
                <div className="text-sm font-semibold text-white">{g.progress_pct}%</div>
              </div>
              <div className="bg-surface rounded-lg p-2">
                <div className="text-xs text-gray-500">Monthly needed</div>
                <div className="text-sm font-semibold text-white">{formatCurrency(g.monthly_needed, user?.currency)}</div>
              </div>
              <div className="bg-surface rounded-lg p-2">
                <div className="text-xs text-gray-500">Months left</div>
                <div className="text-sm font-semibold text-white">{g.months_remaining}</div>
              </div>
            </div>

            {g.status === 'active' && (
              <button onClick={() => setUpdateGoal(g)} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                <TrendingUp size={14} /> Add progress
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Savings Goal">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Pick an icon</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm({ ...form, icon })}
                  className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-colors ${form.icon === icon ? 'bg-brand-500/30 border-2 border-brand-500' : 'bg-surface hover:bg-surface-hover border-2 border-transparent'}`}
                >{icon}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Goal title *</label>
            <input className="input" placeholder="e.g. New Laptop" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Target amount *</label>
              <input type="number" min="1" className="input" placeholder="50000" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Already saved</label>
              <input type="number" min="0" className="input" placeholder="0" value={form.current_amount} onChange={e => setForm({ ...form, current_amount: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Target date *</label>
            <input type="date" className="input" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">Create goal</button>
          </div>
        </form>
      </Modal>

      {/* Update Progress Modal */}
      <Modal open={!!updateGoal} onClose={() => setUpdateGoal(null)} title={`Update: ${updateGoal?.title}`}>
        <form onSubmit={handleAddProgress} className="space-y-4">
          <div className="bg-surface rounded-lg p-4 text-center">
            <div className="text-3xl mb-1">{updateGoal?.icon}</div>
            <div className="text-sm text-gray-400">
              {formatCurrency(updateGoal?.current_amount, user?.currency)} saved of {formatCurrency(updateGoal?.target_amount, user?.currency)}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Amount to add</label>
            <input type="number" min="1" className="input" placeholder="1000" value={addAmount} onChange={e => setAddAmount(e.target.value)} autoFocus />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setUpdateGoal(null)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={updateMutation.isPending} className="btn-primary flex-1">Save progress</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
