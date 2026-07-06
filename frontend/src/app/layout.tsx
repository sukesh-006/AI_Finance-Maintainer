import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import QueryProvider from '@/components/ui/QueryProvider'

export const metadata: Metadata = {
  title: 'FinanceAI — Smart Budgeting & Savings',
  description: 'AI-powered personal finance advisor for students and early job holders',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#161627',
                color: '#fff',
                border: '1px solid #1e1e35',
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  )
}
