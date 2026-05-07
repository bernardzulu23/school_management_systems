'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { percentTextClass } from '@/lib/utils/percentColor'

export default function StockBookPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // Stock data - will be loaded from API
  const [stockData, setStockData] = useState([])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'in_stock':
        return <CheckCircle className="h-4 w-4 text-royalPurple-successTx" />
      case 'low_stock':
        return <AlertTriangle className="h-4 w-4 text-warn/100" />
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-royalPurple-dangerTx" />
      case 'out_of_stock':
        return <TrendingDown className="h-4 w-4 text-royalPurple-dangerTx" />
      default:
        return <Package className="h-4 w-4 text-royalPurple-text3" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'in_stock':
        return 'bg-royalPurple-success text-royalPurple-successTx'
      case 'low_stock':
        return 'bg-warn/20 text-g-800'
      case 'critical':
        return 'bg-royalPurple-danger text-royalPurple-dangerTx'
      case 'out_of_stock':
        return 'bg-royalPurple-danger text-royalPurple-dangerTx'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1'
    }
  }

  const getCategoryColor = (category) => {
    return 'badge-brand'
  }

  const getStockLevel = (current, minimum, maximum) => {
    if (current <= minimum * 0.5) return 'critical'
    if (current <= minimum) return 'low_stock'
    if (current >= minimum && current <= maximum) return 'in_stock'
    return 'overstocked'
  }

  const filteredStock = stockData.filter((item) => {
    const matchesSearch =
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const stockStats = {
    totalItems: stockData.length,
    totalValue: stockData.reduce((sum, item) => sum + item.totalValue, 0),
    lowStockItems: stockData.filter(
      (item) => item.status === 'low_stock' || item.status === 'critical'
    ).length,
    inStockItems: stockData.filter((item) => item.status === 'in_stock').length,
  }

  return (
    <DashboardLayout title="Stock Book">
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
                <Package className="h-6 w-6 mr-2" />
                Stock Book Management
              </h1>
              <p className="text-royalPurple-text2">
                Inventory and stock management for department resources
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Inventory
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-royalPurple-accentTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Total Items</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {stockStats.totalItems}
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
                  <p className="text-sm font-medium text-royalPurple-text2">Total Value</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    ${stockStats.totalValue.toLocaleString()}
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
                  <p className="text-sm font-medium text-royalPurple-text2">In Stock</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {stockStats.inStockItems}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-royalPurple-dangerTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Low Stock</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">
                    {stockStats.lowStockItems}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Inventory Management</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-royalPurple-text3" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    className="form-input pl-10 pr-4 py-2"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="zsms-select px-3 py-2"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  <option value="Books">Books</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Stationery">Stationery</option>
                  <option value="Technology">Technology</option>
                </select>
                <select
                  className="zsms-select px-3 py-2"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="critical">Critical</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="zsms-table">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-4">Item Name</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-left py-3 px-4">Current Stock</th>
                    <th className="text-left py-3 px-4">Stock Level</th>
                    <th className="text-left py-3 px-4">Unit Price</th>
                    <th className="text-left py-3 px-4">Total Value</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Location</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((item) => {
                    const percent =
                      item.maximumStock > 0
                        ? Math.round((item.currentStock / item.maximumStock) * 100)
                        : 0
                    const pctClass = percentTextClass(percent)
                    return (
                      <tr key={item.id}>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-royalPurple-text1">
                              {item.itemName}
                            </div>
                            <div className="text-sm text-royalPurple-text3">
                              Supplier: {item.supplier}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={getCategoryColor(item.category)}>{item.category}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-center">
                            <div className="font-medium">{item.currentStock}</div>
                            <div className="text-xs text-royalPurple-text3">
                              Min: {item.minimumStock}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="progress-track">
                            <div
                              className={`progress-fill progress-fill-semantic ${pctClass}`}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                          <div className={`text-xs mt-1 ${pctClass}`}>{percent}%</div>
                        </td>
                        <td className="py-3 px-4 font-medium">${item.unitPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 font-medium">${item.totalValue.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {getStatusIcon(item.status)}
                            <span
                              className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}
                            >
                              {item.status.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-royalPurple-text2">
                          {item.location}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <TrendingDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Stock Alerts and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stockData
                  .filter((item) => item.status === 'critical' || item.status === 'low_stock')
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 border rounded-lg ${
                        item.status === 'critical'
                          ? 'bg-royalPurple-danger border-royalPurple-border'
                          : 'bg-warn/10 border-warn/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4
                            className={`font-medium ${
                              item.status === 'critical'
                                ? 'text-royalPurple-dangerTx'
                                : 'text-g-800'
                            }`}
                          >
                            {item.itemName}
                          </h4>
                          <p
                            className={`text-sm ${
                              item.status === 'critical'
                                ? 'text-royalPurple-dangerTx'
                                : 'text-g-700'
                            }`}
                          >
                            Current: {item.currentStock} | Minimum: {item.minimumStock}
                          </p>
                        </div>
                        <Button size="sm">Reorder</Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Item
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Stock In
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Stock Out
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Package className="h-4 w-4 mr-2" />
                  Generate Reorder Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Export Stock Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stock Movement History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Stock Movements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-royalPurple-success border border-royalPurple-border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-royalPurple-successTx">
                      Stock In: Scientific Calculators
                    </h4>
                    <p className="text-sm text-royalPurple-successTx">
                      Added 25 units • Total: 75 units
                    </p>
                  </div>
                  <span className="text-xs text-royalPurple-successTx">2 hours ago</span>
                </div>
              </div>
              <div className="p-3 bg-royalPurple-danger border border-royalPurple-border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-royalPurple-dangerTx">
                      Stock Out: Whiteboard Markers
                    </h4>
                    <p className="text-sm text-royalPurple-dangerTx">
                      Issued 8 units • Remaining: 12 units
                    </p>
                  </div>
                  <span className="text-xs text-royalPurple-dangerTx">1 day ago</span>
                </div>
              </div>
              <div className="p-3 bg-royalPurple-accent border border-royalPurple-border2 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-royalPurple-accentTx">
                      New Item Added: Laboratory Equipment Set
                    </h4>
                    <p className="text-sm text-royalPurple-accentTx">
                      Initial stock: 8 units • Value: $1,200
                    </p>
                  </div>
                  <span className="text-xs text-royalPurple-accentTx">3 days ago</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
