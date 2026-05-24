import { TrendingUp, TrendingDown, DollarSign, Calendar, Download, Filter, BarChart3, PieChart, Activity, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiRequest } from '../lib/api'
import { useRefresh } from '../context/SocketContext'

export default function Revenue() {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedMetric, setSelectedMetric] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    dailyRevenue: 0,
    revenueByService: {},
    recentTransactions: [],
    totalBookings: 0,
    monthlyBookings: 0,
    weeklyBookings: 0,
    dailyBookings: 0
  })

  const fetchRevenueData = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiRequest('/admin/revenue-data')
      setRevenueData(response.data)
    } catch (err) {
      setError(err.message || 'Failed to fetch revenue data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRevenueData()
  }, [])

  // Real-time updates for revenue
  useRefresh('revenue', fetchRevenueData)

  const handleExportReport = () => {
    // Create CSV content from transactions data
    const headers = ['Transaction ID', 'Customer', 'Service', 'Worker', 'Amount', 'Date', 'Status', 'Commission']
    const rows = revenueData.recentTransactions.map(t => [
      `#${t.id.toString().padStart(6, '0')}`,
      t.customer,
      t.service,
      t.worker,
      t.amount,
      t.date,
      t.status,
      t.commission
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `revenue_report_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const transactions = revenueData.recentTransactions || []

  const serviceRevenue = Object.entries(revenueData.revenueByService || {}).map(([service, revenue]) => {
    const totalRevenue = revenueData.totalRevenue || 1
    const percentage = totalRevenue > 0 ? (revenue / totalRevenue * 100).toFixed(1) : 0
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500']
    const color = colors[Object.keys(revenueData.revenueByService || {}).indexOf(service) % colors.length]
    
    return { service, revenue, percentage: parseFloat(percentage), color }
  })

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusColor = (status) => {
    const colors = {
      'completed': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'cancelled': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center py-20">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 mt-4">Loading revenue data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Revenue</h1>
          <p className="text-slate-600 mt-2">Track earnings and financial performance</p>
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-400"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button onClick={handleExportReport} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Revenue Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-950 mt-1">{formatCurrency(revenueData.totalRevenue)}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp size={16} className="text-green-600" />
                <span className="text-sm text-green-600">Live</span>
                <span className="text-sm text-slate-500">Real-time data</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-slate-950 mt-1">{formatCurrency(revenueData.monthlyRevenue)}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp size={16} className="text-green-600" />
                <span className="text-sm text-green-600">{revenueData.monthlyBookings} bookings</span>
                <span className="text-sm text-slate-500">this month</span>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Weekly Revenue</p>
              <p className="text-2xl font-bold text-slate-950 mt-1">{formatCurrency(revenueData.weeklyRevenue)}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp size={16} className="text-green-600" />
                <span className="text-sm text-green-600">{revenueData.weeklyBookings} bookings</span>
                <span className="text-sm text-slate-500">this week</span>
              </div>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <BarChart3 className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Daily Revenue</p>
              <p className="text-2xl font-bold text-slate-950 mt-1">{formatCurrency(revenueData.dailyRevenue)}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp size={16} className="text-green-600" />
                <span className="text-sm text-green-600">{revenueData.dailyBookings} bookings</span>
                <span className="text-sm text-slate-500">today</span>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Activity className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Service Revenue Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-950 flex items-center gap-2">
            <PieChart size={20} className="text-orange-600" />
            Service Revenue Breakdown
          </h2>
          <p className="text-sm text-slate-600 mt-1">Revenue distribution by service category</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {serviceRevenue.map((service, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded ${service.color}`}></div>
                  <span className="text-sm font-medium text-slate-900">{service.service}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-slate-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${service.color}`}
                      style={{ width: `${service.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-slate-900 w-20 text-right">
                    {formatCurrency(service.revenue)}
                  </span>
                  <span className="text-sm text-slate-500 w-12 text-right">
                    {service.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-950 flex items-center gap-2">
            <DollarSign size={20} className="text-orange-600" />
            Recent Transactions
          </h2>
          <p className="text-sm text-slate-600 mt-1">Latest customer payments and earnings</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Transaction</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Worker</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-slate-900">#{transaction.id.toString().padStart(6, '0')}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-900">{transaction.customer}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-900">{transaction.service}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-900">{transaction.worker}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-slate-900">{formatCurrency(transaction.amount)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-900">{formatDate(transaction.date)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
