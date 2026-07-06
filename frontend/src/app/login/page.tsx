'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/auth-store'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, user, loadUser } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) router.replace('/dashboard')
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold">₹</div>
            <span className="font-semibold text-white text-xl">FinanceAI</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                required
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <input
                type="password"
                required
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 mt-2">
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            No account?{' '}
            <Link href="/register" className="text-brand-400 hover:text-brand-300">
              Create one free
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Demo: admin@financeai.com / admin123
        </p>
      </div>
    </div>
  )
}
