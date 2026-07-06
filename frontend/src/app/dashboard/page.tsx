'use client'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency, currentMonth, currentYear } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import { TrendingUp, TrendingDown, Wallet, Target, Bot, PiggyBank } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import Link from 'next/link'

function StatCard({ icon, label, value, sub, color }: any) {
  return (
    <div className="stat-card">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-xs text-gray-500 font-medium">{label}</div>
        <div className="text-xl font-bold text-white mt-0.5">{value}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const month = currentMonth()
  const year = currentYear()

  const { data: summary } = useQuery({
    queryKey: ['dashboard', month, year],
    queryFn: () => api.get(`/api/analytics/dashboard?month=${month}&year=${year}`).then(r => r.data),
  })

  const { data: monthly } = useQuery({
    queryKey: ['monthly-trend'],
    queryFn: () => api.get('/api/analytics/monthly?months=6').then(r => r.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories-chart', month, year],
    queryFn: () => api.get(`/api/analytics/categories?month=${month}&year=${year}`).then(r => r.data),
  })

  const { data: recs } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api.get('/api/ai/recommendations').then(r => r.data),
  })

  const currency = user?.currency || 'INR'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
          {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Here&apos;s your financial summary for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<TrendingUp size={18} className="text-emerald-400" />}
          color="bg-emerald-500/10"
          label="Total Income"
          value={formatCurrency(summary?.total_income || 0, currency)}
          sub="This month"
        />
        <StatCard
          icon={<TrendingDown size={18} className="text-red-400" />}
          color="bg-red-500/10"
          label="Total Expenses"
          value={formatCurrency(summary?.total_expense || 0, currency)}
          sub="This month"
        />
        <StatCard
          icon={<PiggyBank size={18} className="text-brand-400" />}
          color="bg-brand-500/10"
          label="Net Savings"
          value={formatCurrency(summary?.net_savings || 0, currency)}
          sub={`${summary?.savings_rate || 0}% savings rate`}
        />
        <StatCard
          icon={<Wallet size={18} className="text-amber-400" />}
          color="bg-amber-500/10"
          label="Budget Used"
          value={`${summary?.budget_used_pct || 0}%`}
          sub={`${summary?.active_goals || 0} active goals`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Area chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-white">Income vs Expenses</h2>
            <span className="text-xs text-gray-500">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly || []}>
              <defs>
                <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#161627', border: '1px solid #1e1e35', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#income)" strokeWidth={2} name="Income" />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#expense)" strokeWidth={2} name="Expense" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category breakdown */}
        <div className="card">
          <h2 className="font-semibold text-white mb-4">Top Spending</h2>
          <div className="space-y-3">
            {(categories || []).slice(0, 6).map((cat: any) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-300 flex items-center gap-1.5">
                    <span>{cat.icon}</span>
                    {cat.category}
                  </span>
                  <span className="text-white font-medium">{formatCurrency(cat.amount, currency)}</span>
                </div>
                <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
            {(!categories || categories.length === 0) && (
              <p className="text-gray-500 text-sm text-center py-4">No expense data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      {recs && recs.length > 0 && (
        <div className="mt-6 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Bot size={16} className="text-brand-400" />
              AI Recommendations
            </h2>
            <Link href="/dashboard/ai" className="text-xs text-brand-400 hover:text-brand-300">
              View all →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {recs.slice(0, 4).map((r: any) => (
              <div key={r.id} className={`p-4 rounded-lg border ${
                r.priority === 'high'
                  ? 'border-red-500/20 bg-red-500/5'
                  : r.priority === 'medium'
                  ? 'border-amber-500/20 bg-amber-500/5'
                  : 'border-brand-500/20 bg-brand-500/5'
              }`}>
                <div className="text-sm font-medium text-white mb-1">{r.title}</div>
                <div className="text-xs text-gray-400">{r.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
