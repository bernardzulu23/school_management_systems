'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { useAuth } from '@/lib/auth'
import { sessionFetch } from '@/lib/auth/sessionFetch'
import PaymentForm, { PaymentHistory, PaymentStats } from '@/components/payments/PaymentForm'
import ProviderLogos from '@/components/payments/ProviderLogos'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, History, Phone } from 'lucide-react'

export default function PaymentsPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pay')

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await sessionFetch('/api/payments/mobile-money')
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      setActiveTab('history')
      fetchTransactions()
    }
  }, [searchParams, fetchTransactions])

  useEffect(() => {
    const hasPending = transactions.some((tx) => tx.status === 'pending')
    if (!hasPending) return undefined

    const interval = setInterval(fetchTransactions, 10_000)
    return () => clearInterval(interval)
  }, [transactions, fetchTransactions])

  const completed = transactions.filter((tx) => tx.status === 'completed')
  const stats = {
    totalTransactions: transactions.length,
    totalAmount: completed.reduce((sum, tx) => sum + (tx.amount || 0), 0),
    successRate:
      transactions.length > 0 ? Math.round((completed.length / transactions.length) * 100) : 0,
    pendingCount: transactions.filter((tx) => tx.status === 'pending').length,
  }

  return (
    <DashboardLayout title="Payments">
      <div className="space-y-6">
        <PaymentStats stats={stats} />

        <div className="flex gap-2 border-b border-royalPurple-border">
          <button
            onClick={() => setActiveTab('pay')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'pay'
                ? 'text-royalPurple-accent border-b-2 border-royalPurple-accent'
                : 'text-royalPurple-text2 hover:text-royalPurple-text1'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Make Payment
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-royalPurple-accent border-b-2 border-royalPurple-accent'
                : 'text-royalPurple-text2 hover:text-royalPurple-text1'
            }`}
          >
            <History className="w-4 h-4" />
            Transaction History
          </button>
        </div>

        {activeTab === 'pay' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PaymentForm
                userRole={user?.role}
                onSuccess={(result) => {
                  if (result.transaction) {
                    setTransactions((prev) => {
                      const exists = prev.some((tx) => tx.id === result.transaction.id)
                      if (exists) {
                        return prev.map((tx) =>
                          tx.id === result.transaction.id ? result.transaction : tx
                        )
                      }
                      return [result.transaction, ...prev]
                    })
                  }
                  fetchTransactions()
                  if (result.transaction?.status === 'pending') {
                    setActiveTab('history')
                  }
                }}
              />
            </div>

            <div className="space-y-4">
              <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
                <CardHeader>
                  <CardTitle className="text-royalPurple-text1 text-sm flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    How It Works
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-royalPurple-text2 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-royalPurple-accent">1.</span>
                    <p>Enter the amount and select your mobile money provider</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-royalPurple-accent">2.</span>
                    <p>Enter your phone number registered with the provider</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-royalPurple-accent">3.</span>
                    <p>Click Pay and check your phone for a USSD prompt</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-royalPurple-accent">4.</span>
                    <p>Enter your PIN on your phone to confirm payment</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-royalPurple-muted/60 border-royalPurple-border/40">
                <CardHeader>
                  <CardTitle className="text-royalPurple-text1 text-sm">
                    Supported Providers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProviderLogos size={40} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <PaymentHistory transactions={transactions} loading={loading} />
        )}
      </div>
    </DashboardLayout>
  )
}
