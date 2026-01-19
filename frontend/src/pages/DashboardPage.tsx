import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, 
  Users, 
  TrendingUp, 
  Clock,
  Plus,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getDashboardStats, getOrders } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const statusLabels: Record<string, { label: string; variant: 'default' | 'warning' | 'success' | 'destructive' }> = {
  pending: { label: 'Beklemede', variant: 'warning' },
  processing: { label: 'İşleniyor', variant: 'default' },
  completed: { label: 'Tamamlandı', variant: 'success' },
  cancelled: { label: 'İptal', variant: 'destructive' },
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => getOrders(),
  })

  const statCards = [
    {
      title: 'Toplam Sipariş',
      value: stats?.total_orders || 0,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      title: 'Bekleyen Siparişler',
      value: stats?.pending_orders || 0,
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      title: 'Tamamlanan',
      value: stats?.completed_orders || 0,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: 'Toplam Müşteri',
      value: stats?.total_customers || 0,
      icon: Users,
      color: 'bg-purple-500',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Sipariş yönetim sistemine hoş geldiniz</p>
        </div>
        <Button onClick={() => navigate('/orders/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Sipariş
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Revenue */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Bu Ay Toplam Gelir</p>
              <p className="text-3xl font-bold mt-1 text-green-600">
                {formatCurrency(stats?.monthly_revenue || 0)}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-500 opacity-20" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Son Siparişler</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
            Tümünü Gör
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-gray-500">
                  <th className="pb-3 font-medium">Sipariş No</th>
                  <th className="pb-3 font-medium">Müşteri</th>
                  <th className="pb-3 font-medium">Tarih</th>
                  <th className="pb-3 font-medium">Tutar</th>
                  <th className="pb-3 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentOrders?.slice(0, 5).map((order: any) => {
                  const status = statusLabels[order.status] || statusLabels.pending
                  return (
                    <tr 
                      key={order.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <td className="py-3 font-medium">{order.order_number}</td>
                      <td className="py-3">{order.customer?.name}</td>
                      <td className="py-3 text-gray-500">{formatDate(order.order_date)}</td>
                      <td className="py-3 font-medium">{formatCurrency(order.grand_total)}</td>
                      <td className="py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
                {(!recentOrders || recentOrders.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      Henüz sipariş bulunmuyor
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
