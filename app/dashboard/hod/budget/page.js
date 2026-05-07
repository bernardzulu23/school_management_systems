'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ArrowLeft,
  Download,
  Calendar,
  PieChart,
  BarChart3,
  CheckCircle,
  Clock,
  Target,
  Wallet,
} from 'lucide-react'
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import Link from 'next/link'
import { percentTextClass } from '@/lib/utils/percentColor'

export default function BudgetPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('current')
  const [activeTab, setActiveTab] = useState('overview')

  // Sample budget data
  const budgetOverview = {
    totalAllocated: 50000,
    totalSpent: 32500,
    remaining: 17500,
    pendingRequests: 5,
    approvedRequests: 12,
  }

  const utilizedPercent =
    budgetOverview.totalAllocated > 0
      ? Math.round((budgetOverview.totalSpent / budgetOverview.totalAllocated) * 100)
      : 0

  const budgetCategories = [
    {
      name: 'Teaching Materials',
      allocated: 15000,
      spent: 12000,
      remaining: 3000,
      color: 'var(--warn-color)',
    },
    {
      name: 'Equipment',
      allocated: 12000,
      spent: 8500,
      remaining: 3500,
      color: 'var(--color-accent)',
    },
    {
      name: 'Professional Development',
      allocated: 8000,
      spent: 6000,
      remaining: 2000,
      color: 'var(--rp-text2)',
    },
    {
      name: 'Maintenance',
      allocated: 7000,
      spent: 4000,
      remaining: 3000,
      color: 'var(--rp-border)',
    },
    {
      name: 'Miscellaneous',
      allocated: 8000,
      spent: 2000,
      remaining: 6000,
      color: 'var(--color-brand-hover)',
    },
  ]

  const monthlySpending = [
    { month: 'Jan', amount: 4500 },
    { month: 'Feb', amount: 6200 },
    { month: 'Mar', amount: 5800 },
    { month: 'Apr', amount: 7100 },
    { month: 'May', amount: 4900 },
    { month: 'Jun', amount: 3900 },
  ]

  // Recent transactions - will be loaded from API
  const [recentTransactions, setRecentTransactions] = useState([])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-royalPurple-successTx" />
      case 'pending':
        return <Clock className="h-4 w-4 text-warn/100" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-royalPurple-accentTx" />
      default:
        return <AlertCircle className="h-4 w-4 text-royalPurple-text3" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-royalPurple-success text-royalPurple-successTx'
      case 'pending':
        return 'bg-warn/20 text-g-800'
      case 'completed':
        return 'bg-royalPurple-accent text-royalPurple-accentTx'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1'
    }
  }

  const getBudgetHealth = (spent, allocated) => {
    const percentage = (spent / allocated) * 100
    if (percentage > 90) return { color: 'text-royalPurple-dangerTx', status: 'Critical' }
    if (percentage > 75) return { color: 'text-warn', status: 'Warning' }
    return { color: 'text-royalPurple-successTx', status: 'Healthy' }
  }

  return (
    <DashboardLayout title="Budget File">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/hod">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-royalPurple-text1 flex items-center">
                <DollarSign className="h-6 w-6 mr-2" />
                Budget File
              </h1>
              <p className="text-royalPurple-text2">Department budget management and tracking</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <select
              className="px-3 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-g-500"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="current">Current Year</option>
              <option value="previous">Previous Year</option>
              <option value="quarter">This Quarter</option>
            </select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </div>
        </div>

        {/* Budget Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Wallet className="h-8 w-8 text-royalPurple-accentTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Total Allocated</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    ${budgetOverview.totalAllocated.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingDown className="h-8 w-8 text-royalPurple-dangerTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Total Spent</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    ${budgetOverview.totalSpent.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-royalPurple-successTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Remaining</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    ${budgetOverview.remaining.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-warn" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Pending</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {budgetOverview.pendingRequests}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-royalPurple-pillTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Approved</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {budgetOverview.approvedRequests}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Health Indicator */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Budget Health</h3>
              <div className="flex items-center">
                <Target className="h-5 w-5 text-royalPurple-successTx mr-2" />
                <span className={`font-medium ${percentTextClass(utilizedPercent)}`}>
                  {utilizedPercent}% Utilized
                </span>
              </div>
            </div>
            <div className="w-full bg-royalPurple-card2 rounded-full h-4">
              <div
                className="bg-royalPurple-success h-4 rounded-full"
                style={{
                  width: `${(budgetOverview.totalSpent / budgetOverview.totalAllocated) * 100}%`,
                }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-royalPurple-text2 mt-2">
              <span>$0</span>
              <span>${budgetOverview.totalAllocated.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Budget by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Budget by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={budgetCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                    outerRadius={80}
                    fill="var(--color-accent)"
                    dataKey="allocated"
                  >
                    {budgetCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Spending */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Spending Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlySpending}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="var(--warn-color)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Category Details */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Categories Detail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="zsms-table">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-left py-3 px-4">Allocated</th>
                    <th className="text-left py-3 px-4">Spent</th>
                    <th className="text-left py-3 px-4">Remaining</th>
                    <th className="text-left py-3 px-4">Utilization</th>
                    <th className="text-left py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetCategories.map((category, index) => {
                    const utilization = (category.spent / category.allocated) * 100
                    const utilizationPercent = Math.round(utilization)
                    const pctClass = percentTextClass(utilizationPercent)
                    const health = getBudgetHealth(category.spent, category.allocated)
                    return (
                      <tr key={index}>
                        <td className="py-3 px-4 font-medium">{category.name}</td>
                        <td className="py-3 px-4">${category.allocated.toLocaleString()}</td>
                        <td className="py-3 px-4">${category.spent.toLocaleString()}</td>
                        <td className="py-3 px-4">${category.remaining.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-16 mr-2 progress-track overflow-hidden">
                              <div
                                className={`progress-fill progress-fill-semantic ${pctClass}`}
                                style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                              />
                            </div>
                            <span className={`text-sm ${pctClass}`}>{utilizationPercent}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${health.color} bg-opacity-10`}
                          >
                            {health.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="zsms-table">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Requested By</th>
                    <th className="text-left py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="py-3 px-4 font-medium">{transaction.description}</td>
                      <td className="py-3 px-4">
                        <span className="badge-brand">{transaction.category}</span>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        ${transaction.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-royalPurple-text3">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">{transaction.requestedBy}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {getStatusIcon(transaction.status)}
                          <span
                            className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}
                          >
                            {transaction.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
