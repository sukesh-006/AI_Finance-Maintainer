'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { avatarUrl } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()
  const [form, setForm] = useState({
    name: user?.name || '',
    currency: user?.currency || 'INR',
    monthly_income: user?.monthly_income || 0,
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put('/api/auth/me', data),
    onSuccess: (res) => { updateUser(res.data); toast.success('Profile updated!') },
    onError: () => toast.error('Update failed'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(form)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your profile and preferences</p>
      </div>

      {/* Avatar */}
      <div className="card flex items-center gap-4 mb-6">
        <img
          src={user?.avatar_url || avatarUrl(user?.name || 'User')}
          alt="Avatar"
          className="w-16 h-16 rounded-full"
        />
        <div>
          <div className="font-semibold text-white">{user?.name}</div>
          <div className="text-sm text-gray-500">{user?.email}</div>
          {user?.is_admin && (
            <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full mt-1 inline-block">Admin</span>
          )}
        </div>
      </div>

      {/* Profile form */}
      <div className="card">
        <h2 className="font-semibold text-white mb-5">Profile Settings</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Display name</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Currency</label>
            <select className="select" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
              <option value="INR">₹ Indian Rupee (INR)</option>
              <option value="USD">$ US Dollar (USD)</option>
              <option value="EUR">€ Euro (EUR)</option>
              <option value="GBP">£ British Pound (GBP)</option>
              <option value="SGD">$ Singapore Dollar (SGD)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Monthly income</label>
            <input
              type="number"
              min="0"
              className="input"
              placeholder="Your approximate monthly income"
              value={form.monthly_income}
              onChange={e => setForm({ ...form, monthly_income: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-gray-600 mt-1">Used by the AI advisor to generate better recommendations</p>
          </div>
          <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Info card */}
      <div className="card mt-4 border-surface-border/50">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Account info</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="text-white">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Member since</span>
            <span className="text-white">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
