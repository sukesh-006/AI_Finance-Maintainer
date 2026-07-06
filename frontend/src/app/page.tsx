import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Nav */}
      <nav className="border-b border-surface-border px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">₹</div>
          <span className="font-semibold text-white text-lg">FinanceAI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost text-sm">Log in</Link>
          <Link href="/register" className="btn-primary text-sm">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          AI-Powered Finance Management
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 max-w-4xl">
          Your money,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-info">
            smarter
          </span>
        </h1>

        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          Track income, set budgets, plan savings goals, and get personalized AI recommendations —
          built for students and early job holders.
        </p>

        <div className="flex items-center gap-4">
          <Link href="/register" className="btn-primary px-8 py-3 text-base">
            Start for free
          </Link>
          <Link href="/login" className="text-gray-400 hover:text-white text-sm transition-colors">
            Already have an account →
          </Link>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-4xl w-full">
          {[
            { icon: '📊', label: 'Smart Dashboard', desc: 'Income, expenses & savings at a glance' },
            { icon: '🎯', label: 'Goal Planner', desc: 'Track progress toward any financial goal' },
            { icon: '🤖', label: 'AI Advisor', desc: 'Personalized tips based on your spending' },
            { icon: '📈', label: 'Spending Analytics', desc: 'Visual charts and category breakdowns' },
          ].map((f) => (
            <div key={f.label} className="card text-left hover:border-brand-500/30 transition-colors">
              <div className="text-2xl mb-3">{f.icon}</div>
              <div className="font-semibold text-white text-sm mb-1">{f.label}</div>
              <div className="text-gray-500 text-xs">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-surface-border px-6 py-6 text-center text-gray-600 text-sm">
        Built for final-year B.Tech students · FinanceAI {new Date().getFullYear()}
      </footer>
    </div>
  )
}
