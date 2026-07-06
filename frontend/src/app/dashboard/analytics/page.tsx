'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency, currentMonth, currentYear } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'

export default function AnalyticsPage() {
  const { user } = useAuthStore()
  const [month, setMonth] = useState(currentMonth())
  const [year, setYear] = useState(currentYear())

  const { data: monthly } = useQuery({
    queryKey: ['monthly-trend'],
    queryFn: () => api.get('/api/analytics/monthly?months=6').then(r => r.data),
  })

  const { data: expenseCategories } = useQuery({
    queryKey: ['cat-expense', month, year],
    queryFn: () => api.get(`/api/analytics/categories?month=${month}&year=${year}&type=expense`).then(r => r.data),
  })

  const { data: incomeCategories } = useQuery({
    queryKey: ['cat-income', month, year],
    queryFn: () => api.get(`/api/analytics/categories?month=${month}&year=${year}&type=income`).then(r => r.data),
  })

  const { data: summary } = useQuery({
    queryKey: ['dashboard', month, year],
    queryFn: () => api.get(`/api/analytics/dashboard?month=${month}&year=${year}`).then(r => r.data),
  })

  const currency = user?.currency || 'INR'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">Visualize your financial patterns</p>
        </div>
        <div className="flex gap-3">
          <select className="select w-auto" value={month} onChange={e => setMonth(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleString('default', { month: 'short' })}</option>
            ))}
          </select>
          <select className="select w-auto" value={year} onChange={e => setYear(+e.target.value)}>
            {[currentYear() - 1, currentYear()].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Income', value: formatCurrency(summary?.total_income || 0, currency), color: 'text-emerald-400' },
          { label: 'Expenses', value: formatCurrency(summary?.total_expense || 0, currency), color: 'text-red-400' },
          { label: 'Savings', value: formatCurrency(summary?.net_savings || 0, currency), color: 'text-brand-400' },
        ].map(k => (
          <div key={k.label} className="card text-center">
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Income vs Expense trend */}
        <div className="card">
          <h2 className="font-semibold text-white mb-5">6-Month Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#161627', border: '1px solid #1e1e35', borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Savings trend */}
        <div className="card">
          <h2 className="font-semibold text-white mb-5">Savings Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly || []}>
              <defs>
                <linearGradient id="savings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#161627', border: '1px solid #1e1e35', borderRadius: 8 }} />
              <Area type="monotone" dataKey="savings" stroke="#6366f1" fill="url(#savings)" strokeWidth={2} name="Savings" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Expense by category - Pie */}
        <div className="card">
          <h2 className="font-semibold text-white mb-5">Expense by Category</h2>
          {expenseCategories?.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={expenseCategories} dataKey="amount" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                    {expenseCategories.map((c: any, i: number) => (
                      <Cell key={i} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => formatCurrency(v, currency)}
                    contentStyle={{ background: '#161627', border: '1px solid #1e1e35', borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {expenseCategories.slice(0, 6).map((c: any) => (
                  <div key={c.category} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-300">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                      {c.icon} {c.category}
                    </span>
                    <span className="text-white font-medium">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">No expense data for this period</p>
          )}
        </div>

        {/* Income by category */}
        <div className="card">
          <h2 className="font-semibold text-white mb-5">Income Sources</h2>
          <div className="space-y-3">
            {incomeCategories?.length > 0 ? incomeCategories.map((c: any) => (
              <div key={c.category}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-300">{c.icon} {c.category}</span>
                  <span className="text-white font-medium">{formatCurrency(c.amount, currency)}</span>
                </div>
                <div className="h-1.5 bg-surface rounded-full">
                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-sm text-center py-8">No income data for this period</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
