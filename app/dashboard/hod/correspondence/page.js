'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/SimpleDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Mail,
  MailOpen,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react'
import Link from 'next/link'

export default function CorrespondencePage() {
  const [activeTab, setActiveTab] = useState('incoming')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Correspondence data - will be loaded from API
  const [correspondenceData, setCorrespondenceData] = useState({
    incoming: [],
    outgoing: [],
  })

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'responded':
        return <CheckCircle className="h-4 w-4 text-royalPurple-successTx" />
      case 'sent':
        return <MailOpen className="h-4 w-4 text-royalPurple-accentTx" />
      case 'draft':
        return <Edit className="h-4 w-4 text-royalPurple-text3" />
      default:
        return <Mail className="h-4 w-4 text-royalPurple-text3" />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-royalPurple-danger text-royalPurple-dangerTx'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-royalPurple-success text-royalPurple-successTx'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'responded':
        return 'bg-royalPurple-success text-royalPurple-successTx'
      case 'sent':
        return 'bg-royalPurple-accent text-royalPurple-accentTx'
      case 'draft':
        return 'bg-royalPurple-card2 text-royalPurple-text1'
      default:
        return 'bg-royalPurple-card2 text-royalPurple-text1'
    }
  }

  const stats = {
    total: correspondenceData.incoming.length + correspondenceData.outgoing.length,
    pending: correspondenceData.incoming.filter((item) => item.status === 'pending').length,
    responded: correspondenceData.incoming.filter((item) => item.status === 'responded').length,
    drafts: correspondenceData.outgoing.filter((item) => item.status === 'draft').length,
  }

  return (
    <DashboardLayout title="Correspondence File">
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
                <FileText className="h-6 w-6 mr-2" />
                Correspondence File
              </h1>
              <p className="text-royalPurple-text2">Manage incoming and outgoing communications</p>
            </div>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Correspondence
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-royalPurple-accentTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Total Items</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Pending</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-royalPurple-successTx" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Responded</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">{stats.responded}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Edit className="h-8 w-8 text-royalPurple-text2" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-royalPurple-text2">Drafts</p>
                  <p className="text-2xl font-bold text-royalPurple-text1">{stats.drafts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex space-x-1">
                <Button
                  variant={activeTab === 'incoming' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('incoming')}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Incoming ({correspondenceData.incoming.length})
                </Button>
                <Button
                  variant={activeTab === 'outgoing' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('outgoing')}
                >
                  <MailOpen className="h-4 w-4 mr-2" />
                  Outgoing ({correspondenceData.outgoing.length})
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-royalPurple-text3" />
                  <input
                    type="text"
                    placeholder="Search correspondence..."
                    className="pl-10 pr-4 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 border border-royalPurple-border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="responded">Responded</option>
                  <option value="sent">Sent</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="zsms-table">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-4">Subject</th>
                    <th className="text-left py-3 px-4">
                      {activeTab === 'incoming' ? 'Sender' : 'Recipient'}
                    </th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Priority</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Attachments</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {correspondenceData[activeTab].map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 px-4 font-medium">{item.subject}</td>
                      <td className="py-3 px-4">
                        {activeTab === 'incoming' ? item.sender : item.recipient}
                      </td>
                      <td className="py-3 px-4 text-sm text-royalPurple-text3">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(item.priority)}`}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {getStatusIcon(item.status)}
                          <span
                            className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="badge-brand">{item.type}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.attachments > 0 && (
                          <span className="text-royalPurple-accentTx">{item.attachments}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
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
