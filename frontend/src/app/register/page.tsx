'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/auth-store'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading, user, loadUser } = useAuthStore()
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  useEffect(() => { loadUser() }, [])
  useEffect(() => { if (user) router.replace('/dashboard') }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await register(form.name, form.email, form.password)
      toast.success('Account created!')
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
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Start managing your finances smarter</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Full name</label>
              <input
                type="text"
                required
                className="input"
                placeholder="Aarthaa Sharma"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
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
                minLength={6}
                className="input"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 mt-2">
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-400 hover:text-brand-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
