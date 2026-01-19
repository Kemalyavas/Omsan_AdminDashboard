import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, FileDown, Printer, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getOrder, downloadOrderPdf, downloadOrderExcel, updateOrderStatus } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const statusLabels: Record<string, { label: string; variant: 'default' | 'warning' | 'success' | 'destructive' }> = {
  pending: { label: 'Beklemede', variant: 'warning' },
  processing: { label: 'İşleniyor', variant: 'default' },
  completed: { label: 'Tamamlandı', variant: 'success' },
  cancelled: { label: 'İptal', variant: 'destructive' },
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id!),
    enabled: !!id,
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateOrderStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      toast({ title: 'Durum güncellendi' })
    },
  })

  const handleDownloadPdf = async () => {
    try {
      await downloadOrderPdf(id!)
      toast({ title: 'PDF indirildi' })
    } catch {
      toast({ title: 'Hata', description: 'PDF indirilemedi', variant: 'destructive' })
    }
  }

  const handleDownloadExcel = async () => {
    try {
      await downloadOrderExcel(id!)
      toast({ title: 'Excel indirildi' })
    } catch {
      toast({ title: 'Hata', description: 'Excel indirilemedi', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Yükleniyor...</div>
  }

  if (!order) {
    return <div className="text-center py-8">Sipariş bulunamadı</div>
  }

  const status = statusLabels[order.status] || statusLabels.pending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-gray-500">{formatDate(order.orderDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={order.status} onValueChange={(value) => statusMutation.mutate(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Beklemede</SelectItem>
              <SelectItem value="processing">İşleniyor</SelectItem>
              <SelectItem value="completed">Tamamlandı</SelectItem>
              <SelectItem value="cancelled">İptal</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleDownloadPdf}>
            <FileDown className="h-4 w-4 mr-2" />
            PDF İndir
          </Button>
          <Button variant="outline" onClick={handleDownloadExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel İndir
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Yazdır
          </Button>
          <Button onClick={() => navigate(`/orders/${id}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" />
            Düzenle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Müşteri Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Firma</p>
              <p className="font-medium">{order.customer?.name}</p>
            </div>
            {order.customer?.phone && (
              <div>
                <p className="text-sm text-gray-500">Telefon</p>
                <p className="font-medium">{order.customer.phone}</p>
              </div>
            )}
            {order.customer?.email && (
              <div>
                <p className="text-sm text-gray-500">E-posta</p>
                <p className="font-medium">{order.customer.email}</p>
              </div>
            )}
            {order.customer?.address && (
              <div>
                <p className="text-sm text-gray-500">Adres</p>
                <p className="font-medium">{order.customer.address}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Sipariş Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Ara Toplam</p>
                <p className="text-xl font-bold">{formatCurrency(order.subtotal)}</p>
              </div>
              {order.discount_amount && order.discount_amount > 0 && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">İskonto</p>
                  <p className="text-xl font-bold text-red-600">-{formatCurrency(order.discount_amount)}</p>
                </div>
              )}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">KDV (%{order.vat_rate})</p>
                <p className="text-xl font-bold">{formatCurrency(order.vat_amount)}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Genel Toplam</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(order.grand_total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sipariş Kalemleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-gray-500">
                  <th className="pb-3 font-medium">#</th>
                  <th className="pb-3 font-medium">Taş Cinsi</th>
                  <th className="pb-3 font-medium">Özellik</th>
                  <th className="pb-3 font-medium">Kalınlık</th>
                  <th className="pb-3 font-medium">Genişlik</th>
                  <th className="pb-3 font-medium">Uzunluk</th>
                  <th className="pb-3 font-medium">Adet</th>
                  <th className="pb-3 font-medium">M²</th>
                  <th className="pb-3 font-medium">Birim Fiyat</th>
                  <th className="pb-3 font-medium">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.order_items?.map((item: any, index: number) => (
                  <tr key={item.id}>
                    <td className="py-3">{index + 1}</td>
                    <td className="py-3 font-medium">
                      {item.stone_type?.name || item.stone_type_name || '-'}
                    </td>
                    <td className="py-3">
                      {item.stone_feature?.name || item.stone_feature_name || '-'}
                    </td>
                    <td className="py-3">{item.thickness || '-'}</td>
                    <td className="py-3">{item.width || '-'}</td>
                    <td className="py-3">{item.length || '-'}</td>
                    <td className="py-3">{item.quantity}</td>
                    <td className="py-3">{item.square_meter?.toFixed(2) || item.linear_meter?.toFixed(2) || '-'}</td>
                    <td className="py-3">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 font-medium">{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notlar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
