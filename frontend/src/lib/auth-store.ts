import { create } from 'zustand'
import api from '@/lib/api'

interface User {
  id: number
  name: string
  email: string
  currency: string
  monthly_income: number
  avatar_url: string | null
  is_admin: boolean
  created_at: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (data: Partial<User>) => void
  loadUser: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,

  loadUser: () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user')
      if (stored) set({ user: JSON.parse(stored) })
    }
  },

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      set({ user: data.user, isLoading: false })
    } catch {
      set({ isLoading: false })
      throw new Error('Invalid email or password')
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await api.post('/api/auth/register', { name, email, password })
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      set({ user: data.user, isLoading: false })
    } catch (e: any) {
      set({ isLoading: false })
      throw new Error(e.response?.data?.detail || 'Registration failed')
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    set({ user: null })
  },

  updateUser: (data) => {
    set((state) => {
      const updated = { ...state.user!, ...data }
      localStorage.setItem('user', JSON.stringify(updated))
      return { user: updated }
    })
  },
}))
