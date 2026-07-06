'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/auth-store'
import { avatarUrl } from '@/lib/utils'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target,
  BarChart3, Bot, Upload, Settings, LogOut, ShieldCheck
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/dashboard/budgets', label: 'Budgets', icon: Wallet },
  { href: '/dashboard/goals', label: 'Goals', icon: Target },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/ai', label: 'AI Assistant', icon: Bot },
  { href: '/dashboard/import', label: 'Import CSV', icon: Upload },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loadUser } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      router.replace('/login')
    }
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-surface-border flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">₹</div>
            <span className="font-semibold text-white">FinanceAI</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-500/15 text-brand-400'
                    : 'text-gray-400 hover:text-white hover:bg-surface-hover'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}

          {user?.is_admin && (
            <Link
              href="/dashboard/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/dashboard/admin'
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-gray-400 hover:text-white hover:bg-surface-hover'
              }`}
            >
              <ShieldCheck size={16} />
              Admin
            </Link>
          )}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-surface-border">
          <div className="flex items-center gap-3 px-2 py-2">
            {user && (
              <>
                <img
                  src={user.avatar_url || avatarUrl(user.name)}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{user.name}</div>
                  <div className="text-xs text-gray-500 truncate">{user.email}</div>
                </div>
                <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors">
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
