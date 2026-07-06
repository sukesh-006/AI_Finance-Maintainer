'use client'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Bot, Send, RefreshCw, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const SUGGESTED = [
  'How much should I save each month?',
  'Why am I overspending?',
  'How can I reduce my expenses?',
  'Is my emergency fund enough?',
  'How do I reach my savings goal faster?',
]

export default function AIPage() {
  const qc = useQueryClient()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: "Hi! I'm your AI finance advisor. Ask me anything about your spending, savings, or financial goals. I'll give you practical tips based on your data." }
  ])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: recs, refetch: refetchRecs } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api.get('/api/ai/recommendations').then(r => r.data),
  })

  const generateMutation = useMutation({
    mutationFn: () => api.post('/api/ai/recommend'),
    onSuccess: () => { refetchRecs(); toast.success('Recommendations refreshed!') },
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.put(`/api/ai/recommendations/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recommendations'] }),
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const { data } = await api.post('/api/ai/chat', { message: text })
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const priorityStyle: Record<string, string> = {
    high: 'border-red-500/30 bg-red-500/5',
    medium: 'border-amber-500/30 bg-amber-500/5',
    low: 'border-brand-500/20 bg-brand-500/5',
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
        <p className="text-gray-500 text-sm mt-0.5">Get personalized financial advice and recommendations</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Chatbot */}
        <div className="lg:col-span-3 flex flex-col card p-0 overflow-hidden" style={{ height: '70vh' }}>
          <div className="px-5 py-4 border-b border-surface-border flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-500/20 rounded-full flex items-center justify-center">
              <Bot size={16} className="text-brand-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">FinanceAI Chat</div>
              <div className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-sm px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-brand-500 text-white rounded-br-sm'
                    : 'bg-surface-card border border-surface-border text-gray-200 rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-card border border-surface-border px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested */}
          {messages.length === 1 && (
            <div className="px-5 pb-3 flex flex-wrap gap-2">
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="text-xs bg-surface border border-surface-border hover:border-brand-500/50 text-gray-400 hover:text-white px-3 py-1.5 rounded-full transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-5 py-4 border-t border-surface-border flex gap-3">
            <input
              className="input flex-1"
              placeholder="Ask about your finances…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            />
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
              className="btn-primary px-4 disabled:opacity-40">
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* Recommendations panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">AI Recommendations</h2>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="btn-ghost text-xs flex items-center gap-1"
            >
              <RefreshCw size={12} className={generateMutation.isPending ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '65vh' }}>
            {recs?.length === 0 && (
              <div className="card text-center py-8">
                <p className="text-gray-500 text-sm mb-3">No recommendations yet</p>
                <button onClick={() => generateMutation.mutate()} className="btn-primary text-sm">
                  Generate insights
                </button>
              </div>
            )}
            {recs?.map((r: any) => (
              <div key={r.id} className={`p-4 rounded-xl border ${priorityStyle[r.priority]} relative`}>
                {!r.is_read && (
                  <button
                    onClick={() => markReadMutation.mutate(r.id)}
                    className="absolute top-3 right-3 text-gray-600 hover:text-brand-400 transition-colors"
                    title="Mark as read"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
                <div className="flex items-start gap-2 pr-5">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded uppercase tracking-wide ${
                    r.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                    r.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-brand-500/20 text-brand-400'
                  }`}>{r.priority}</span>
                </div>
                <div className="text-sm font-semibold text-white mt-2 mb-1">{r.title}</div>
                <div className="text-xs text-gray-400 leading-relaxed">{r.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
