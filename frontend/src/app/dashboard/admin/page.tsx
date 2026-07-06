'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Users, TrendingUp, TrendingDown, Activity, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const qc = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/api/admin/stats').then(r => r.data),
  })

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/api/admin/users').then(r => r.data),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => api.put(`/api/admin/users/${id}/toggle`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User status updated') },
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <p className="text-gray-500 text-sm mt-0.5">Platform overview and user management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats?.total_users || 0, icon: <Users size={18} />, color: 'bg-brand-500/10 text-brand-400' },
          { label: 'Active Users', value: stats?.active_users || 0, icon: <Activity size={18} />, color: 'bg-emerald-500/10 text-emerald-400' },
          { label: 'Total Transactions', value: stats?.total_transactions || 0, icon: <TrendingUp size={18} />, color: 'bg-amber-500/10 text-amber-400' },
          { label: 'Platform Income', value: `₹${((stats?.total_income_on_platform || 0) / 1000).toFixed(0)}K`, icon: <TrendingDown size={18} />, color: 'bg-info/10 text-info' },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>{s.icon}</div>
            <div>
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-xl font-bold text-white">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h2 className="font-semibold text-white">All Users</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              {['ID', 'Name', 'Email', 'Admin', 'Joined', 'Status', 'Action'].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users?.map((u: any) => (
              <tr key={u.id} className="border-b border-surface-border/50 hover:bg-surface-hover/50 transition-colors">
                <td className="px-4 py-3 text-gray-500">#{u.id}</td>
                <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-400">{u.email}</td>
                <td className="px-4 py-3">
                  {u.is_admin
                    ? <span className="badge-income">Admin</span>
                    : <span className="text-gray-600 text-xs">User</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(u.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={u.is_active ? 'badge-income' : 'badge-expense'}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleMutation.mutate(u.id)}
                    className="text-gray-500 hover:text-brand-400 transition-colors"
                    title={u.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {u.is_active ? <ToggleRight size={20} className="text-emerald-400" /> : <ToggleLeft size={20} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
