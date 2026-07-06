import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function getMonthName(month: number): string {
  return new Date(2024, month - 1).toLocaleString('default', { month: 'long' })
}

export function currentMonth() {
  return new Date().getMonth() + 1
}

export function currentYear() {
  return new Date().getFullYear()
}

export function avatarUrl(name: string): string {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=6366f1&textColor=ffffff`
}
