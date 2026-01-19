import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import {
  getOrder,
  getCustomers,
  getStoneTypes,
  getStoneFeatures,
  createOrder,
  updateOrder,
  createCustomer,
  createStoneType,
  createStoneFeature,
} from '@/lib/api'
import { formatCurrency, calculateSquareMeter } from '@/lib/utils'

interface OrderItem {
  id?: string
  stone_type_id?: string
  stone_type_name?: string
  stone_feature_id?: string
  stone_feature_name?: string
  thickness?: number
  width?: number
  length?: number
  quantity: number
  measure_type: 'm2' | 'mtul' | 'none' // M², Metretül veya Adet
  square_meter?: number
  linear_meter?: number
  unit_price: number
  total_price: number
  notes?: string
}

const emptyItem: OrderItem = {
  quantity: 1,
  measure_type: 'none',
  unit_price: 0,
  total_price: 0,
}

export default function OrderFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // State
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState('pending')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [vatRate, setVatRate] = useState(20)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<OrderItem[]>([{ ...emptyItem }])

  // Dialogs
  const [newCustomerDialog, setNewCustomerDialog] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')

  const [newStoneTypeDialog, setNewStoneTypeDialog] = useState(false)
  const [newStoneTypeName, setNewStoneTypeName] = useState('')

  const [newFeatureDialog, setNewFeatureDialog] = useState(false)
  const [newFeatureName, setNewFeatureName] = useState('')
  const [newFeaturePrice, setNewFeaturePrice] = useState('')

  // Queries
  const { data: existingOrder } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id!),
    enabled: isEdit,
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => getCustomers(),
  })

  const { data: stoneTypes = [] } = useQuery({
    queryKey: ['stone-types'],
    queryFn: getStoneTypes,
  })

  const { data: stoneFeatures = [] } = useQuery({
    queryKey: ['stone-features'],
    queryFn: getStoneFeatures,
  })

  // Load existing order data
  useEffect(() => {
    if (existingOrder) {
      setCustomerId(existingOrder.customer_id || null)
      setOrderDate(existingOrder.order_date.split('T')[0])
      setStatus(existingOrder.status)
      setDiscountAmount(existingOrder.discount_amount || 0)
      setVatRate(existingOrder.vat_rate)
      setNotes(existingOrder.notes || '')
      if (!existingOrder.order_items) return
      setItems(existingOrder.order_items.map((item: any) => ({
        id: item.id,
        stone_type_id: item.stone_type_id,
        stone_type_name: item.stone_type_name,
        stone_feature_id: item.stone_feature_id,
        stone_feature_name: item.stone_feature_name,
        thickness: item.thickness,
        width: item.width,
        length: item.length,
        quantity: item.quantity,
        measure_type: item.linear_meter ? 'mtul' : item.square_meter ? 'm2' : 'none',
        square_meter: item.square_meter,
        linear_meter: item.linear_meter,
        unit_price: item.unit_price,
        total_price: item.total_price,
        notes: item.notes,
      })))
    }
  }, [existingOrder])

  // Mutations
  const createMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast({ title: 'Sipariş oluşturuldu' })
      navigate(`/orders/${data.id}`)
    },
    onError: () => {
      toast({ title: 'Hata', description: 'Sipariş oluşturulamadı', variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateOrder(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      toast({ title: 'Sipariş güncellendi' })
      navigate(`/orders/${id}`)
    },
    onError: () => {
      toast({ title: 'Hata', description: 'Sipariş güncellenemedi', variant: 'destructive' })
    },
  })

  const createCustomerMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setCustomerId(data.id)
      setNewCustomerDialog(false)
      setNewCustomerName('')
      setNewCustomerPhone('')
      toast({ title: 'Müşteri eklendi' })
    },
  })

  const createStoneTypeMutation = useMutation({
    mutationFn: createStoneType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stone-types'] })
      setNewStoneTypeDialog(false)
      setNewStoneTypeName('')
      toast({ title: 'Taş cinsi eklendi' })
    },
  })

  const createFeatureMutation = useMutation({
    mutationFn: (data: { name: string; defaultPrice?: number }) => 
      createStoneFeature(data.name, data.defaultPrice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stone-features'] })
      setNewFeatureDialog(false)
      setNewFeatureName('')
      setNewFeaturePrice('')
      toast({ title: 'Özellik eklendi' })
    },
  })

  // Handlers
  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setItems(prevItems => {
      const newItems = [...prevItems]
      newItems[index] = { ...newItems[index], [field]: value }

      // Auto-calculate based on measure type
      const item = newItems[index]
      
      if (item.measure_type === 'm2') {
        // M² hesaplama
        if (item.width && item.length) {
          item.square_meter = calculateSquareMeter(item.width, item.length)
        }
        if (item.square_meter && item.quantity && item.unit_price) {
          item.total_price = item.square_meter * item.quantity * item.unit_price
        }
        item.linear_meter = undefined
      } else if (item.measure_type === 'mtul') {
        // Metretül hesaplama
        if (item.length) {
          item.linear_meter = item.length / 100 // cm to meter
        }
        if (item.linear_meter && item.quantity && item.unit_price) {
          item.total_price = item.linear_meter * item.quantity * item.unit_price
        }
        item.square_meter = undefined
      } else {
        // Adet hesaplama (none)
        item.total_price = item.quantity * item.unit_price
        item.square_meter = undefined
        item.linear_meter = undefined
      }

      return newItems
    })
  }

  const addItem = () => {
    setItems([...items, { ...emptyItem }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const handleFeatureSelect = (index: number, featureId: string) => {
    if (featureId === 'new') {
      setNewFeatureDialog(true)
      return
    }
    
    const feature = stoneFeatures.find((f: any) => f.id === featureId)
    
    setItems(prevItems => {
      const newItems = [...prevItems]
      newItems[index] = { 
        ...newItems[index], 
        stone_feature_id: featureId,
        stone_feature_name: undefined,
        unit_price: feature?.default_price || newItems[index].unit_price
      }
      return newItems
    })
  }

  const handleStoneTypeSelect = (index: number, value: string) => {
    if (value === 'new') {
      setNewStoneTypeDialog(true)
      return
    }
    
    setItems(prevItems => {
      const newItems = [...prevItems]
      newItems[index] = { 
        ...newItems[index], 
        stone_type_id: value,
        stone_type_name: undefined
      }
      return newItems
    })
  }

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0)
  const total = subtotal - discountAmount
  const vatAmount = total * (vatRate / 100)
  const grandTotal = total + vatAmount

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerId) {
      toast({ title: 'Hata', description: 'Müşteri seçiniz', variant: 'destructive' })
      return
    }

    const orderData = {
      customer_id: customerId,
      order_date: orderDate,
      status,
      discount_amount: discountAmount,
      vat_rate: vatRate,
      notes,
      items: items.map(item => ({
        stone_type_id: item.stone_type_id,
        stone_type_name: item.stone_type_name,
        stone_feature_id: item.stone_feature_id,
        stone_feature_name: item.stone_feature_name,
        thickness: item.thickness,
        width: item.width,
        length: item.length,
        quantity: item.quantity,
        square_meter: item.square_meter,
        linear_meter: item.linear_meter,
        unit_price: item.unit_price,
        total_price: item.total_price,
        notes: item.notes,
      })),
    }

    if (isEdit) {
      updateMutation.mutate(orderData)
    } else {
      createMutation.mutate(orderData)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">
            {isEdit ? 'Siparişi Düzenle' : 'Yeni Sipariş'}
          </h1>
          <p className="text-sm text-gray-500">Sipariş bilgilerini doldurun</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        {/* Customer & Order Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Müşteri Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Müşteri</Label>
                  <Select
                    value={customerId || ''}
                    onValueChange={(value) => {
                      if (value === 'new') {
                        setNewCustomerDialog(true)
                      } else {
                        setCustomerId(value)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Müşteri seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">+ Yeni Müşteri Ekle</SelectItem>
                      {customers.map((customer: any) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} {customer.phone && `(${customer.phone})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sipariş Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tarih</Label>
                  <Input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Durum</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Beklemede</SelectItem>
                      <SelectItem value="processing">İşleniyor</SelectItem>
                      <SelectItem value="completed">Tamamlandı</SelectItem>
                      <SelectItem value="cancelled">İptal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between pb-3">
            <CardTitle className="text-base md:text-lg">Sipariş Kalemleri</CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewStoneTypeDialog(true)}>
                + Taş Cinsi
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setNewFeatureDialog(true)}>
                + Özellik
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Mobile Cards View */}
            <div className="md:hidden space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Kalem #{index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  
                  {/* Taş Cinsi */}
                  <div>
                    <Label className="text-xs">Taş Cinsi</Label>
                    <Select
                      value={item.stone_type_id || ''}
                      onValueChange={(value) => handleStoneTypeSelect(index, value)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Seç" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">+ Yeni Ekle</SelectItem>
                        {stoneTypes.map((type: any) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!item.stone_type_id && (
                      <Input
                        className="h-10 mt-1"
                        placeholder="Taş cinsi yazın"
                        value={item.stone_type_name || ''}
                        onChange={(e) => updateItem(index, 'stone_type_name', e.target.value)}
                      />
                    )}
                  </div>

                  {/* Özellik */}
                  <div>
                    <Label className="text-xs">Özellik</Label>
                    <Select
                      value={item.stone_feature_id || ''}
                      onValueChange={(value) => handleFeatureSelect(index, value)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Seç" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">+ Yeni Ekle</SelectItem>
                        {stoneFeatures.map((feature: any) => (
                          <SelectItem key={feature.id} value={feature.id}>
                            {feature.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!item.stone_feature_id && (
                      <Input
                        className="h-10 mt-1"
                        placeholder="Özellik yazın"
                        value={item.stone_feature_name || ''}
                        onChange={(e) => updateItem(index, 'stone_feature_name', e.target.value)}
                      />
                    )}
                  </div>

                  {/* Ölçüler */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Kalınlık</Label>
                      <Input
                        type="number"
                        className="h-10"
                        placeholder="cm"
                        value={item.thickness || ''}
                        onChange={(e) => updateItem(index, 'thickness', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Genişlik</Label>
                      <Input
                        type="number"
                        className="h-10"
                        placeholder="cm"
                        value={item.width || ''}
                        onChange={(e) => updateItem(index, 'width', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Uzunluk</Label>
                      <Input
                        type="number"
                        className="h-10"
                        placeholder="cm"
                        value={item.length || ''}
                        onChange={(e) => updateItem(index, 'length', Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Adet, Ölçü Tipi, Miktar */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Adet</Label>
                      <Input
                        type="number"
                        className="h-10"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Ölçü Tipi</Label>
                      <Select
                        value={item.measure_type || 'none'}
                        onValueChange={(value) => updateItem(index, 'measure_type', value as 'm2' | 'mtul' | 'none')}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Adet</SelectItem>
                          <SelectItem value="m2">M²</SelectItem>
                          <SelectItem value="mtul">Metretül</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Miktar</Label>
                      <Input
                        type="text"
                        className="h-10 bg-gray-100"
                        value={
                          item.measure_type === 'mtul'
                            ? `${((item.linear_meter || 0) * item.quantity).toFixed(2)} mt`
                            : item.measure_type === 'm2'
                              ? `${((item.square_meter || 0) * item.quantity).toFixed(2)} m²`
                              : '-'
                        }
                        readOnly
                        disabled
                      />
                    </div>
                  </div>

                  {/* Fiyat & Tutar */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Birim Fiyat (TL)</Label>
                      <Input
                        type="number"
                        className="h-10"
                        placeholder="0"
                        value={item.unit_price || ''}
                        onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tutar</Label>
                      <div className="h-10 flex items-center justify-end font-bold text-lg text-blue-600">
                        {formatCurrency(item.total_price || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" className="w-full" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Satır Ekle
              </Button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium w-36">Taş Cinsi</th>
                    <th className="pb-2 font-medium w-44">Özellik</th>
                    <th className="pb-2 font-medium w-20">Kalınlık</th>
                    <th className="pb-2 font-medium w-20">Genişlik</th>
                    <th className="pb-2 font-medium w-20">Uzunluk</th>
                    <th className="pb-2 font-medium w-16">Adet</th>
                    <th className="pb-2 font-medium w-20">Ölçü Tipi</th>
                    <th className="pb-2 font-medium w-20">Miktar</th>
                    <th className="pb-2 font-medium w-24">Fiyat</th>
                    <th className="pb-2 font-medium w-24">Tutar</th>
                    <th className="pb-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, index) => (
                    <tr key={index} className="group">
                      <td className="py-2 pr-2">
                        <Select
                          value={item.stone_type_id || ''}
                          onValueChange={(value) => handleStoneTypeSelect(index, value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Seç" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">+ Yeni Ekle</SelectItem>
                            {stoneTypes.map((type: any) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!item.stone_type_id && (
                          <Input
                            className="h-9 mt-1"
                            placeholder="Taş cinsi yazın"
                            value={item.stone_type_name || ''}
                            onChange={(e) => updateItem(index, 'stone_type_name', e.target.value)}
                          />
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <Select
                          value={item.stone_feature_id || ''}
                          onValueChange={(value) => handleFeatureSelect(index, value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Seç" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">+ Yeni Ekle</SelectItem>
                            {stoneFeatures.map((feature: any) => (
                              <SelectItem key={feature.id} value={feature.id}>
                                {feature.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!item.stone_feature_id && (
                          <Input
                            className="h-9 mt-1"
                            placeholder="Özellik yazın"
                            value={item.stone_feature_name || ''}
                            onChange={(e) => updateItem(index, 'stone_feature_name', e.target.value)}
                          />
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="number"
                          className="h-9"
                          placeholder="cm"
                          value={item.thickness || ''}
                          onChange={(e) => updateItem(index, 'thickness', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="number"
                          className="h-9"
                          placeholder="cm"
                          value={item.width || ''}
                          onChange={(e) => updateItem(index, 'width', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="number"
                          className="h-9"
                          placeholder="cm"
                          value={item.length || ''}
                          onChange={(e) => updateItem(index, 'length', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="number"
                          className="h-9"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Select
                          value={item.measure_type || 'none'}
                          onValueChange={(value) => updateItem(index, 'measure_type', value as 'm2' | 'mtul' | 'none')}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Adet</SelectItem>
                            <SelectItem value="m2">M²</SelectItem>
                            <SelectItem value="mtul">Metretül</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 pr-2">
                        {item.measure_type === 'mtul' ? (
                          <Input
                            type="number"
                            step="0.01"
                            className="h-9"
                            placeholder="Mtül"
                            value={((item.linear_meter || 0) * item.quantity).toFixed(2)}
                            readOnly
                          />
                        ) : item.measure_type === 'm2' ? (
                          <Input
                            type="number"
                            step="0.01"
                            className="h-9"
                            placeholder="M²"
                            value={((item.square_meter || 0) * item.quantity).toFixed(2)}
                            readOnly
                          />
                        ) : (
                          <Input
                            type="text"
                            className="h-9 bg-gray-50"
                            value="-"
                            readOnly
                            disabled
                          />
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="number"
                          className="h-9"
                          placeholder="TL"
                          value={item.unit_price || ''}
                          onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <div className="h-9 flex items-center font-medium">
                          {formatCurrency(item.total_price || 0)}
                        </div>
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 opacity-0 group-hover:opacity-100"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button type="button" variant="outline" className="mt-4 hidden md:flex" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Satır Ekle
            </Button>
          </CardContent>
        </Card>

        {/* Totals & Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Notlar</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Sipariş ile ilgili notlar..."
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Toplam</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Ara Toplam</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">İskonto</span>
                <Input
                  type="number"
                  className="w-32 text-right"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Toplam</span>
                <span className="font-medium">{formatCurrency(total)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">KDV</span>
                <div className="flex items-center gap-2">
                  <span>%</span>
                  <Input
                    type="number"
                    className="w-20 text-right"
                    value={vatRate}
                    onChange={(e) => setVatRate(Number(e.target.value))}
                  />
                  <span className="w-24 text-right">{formatCurrency(vatAmount)}</span>
                </div>
              </div>
              <div className="flex justify-between pt-4 border-t text-lg">
                <span className="font-bold">Genel Toplam</span>
                <span className="font-bold text-blue-600">{formatCurrency(grandTotal)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/orders')} className="w-full sm:w-auto">
            İptal
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {isEdit ? 'Güncelle' : 'Kaydet'}
          </Button>
        </div>
      </form>

      {/* New Customer Dialog */}
      <Dialog open={newCustomerDialog} onOpenChange={setNewCustomerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Müşteri Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Firma Adı</Label>
              <Input
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Firma adı"
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="Telefon numarası"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCustomerDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={() => createCustomerMutation.mutate({ name: newCustomerName, phone: newCustomerPhone })}
              disabled={!newCustomerName}
            >
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Stone Type Dialog */}
      <Dialog open={newStoneTypeDialog} onOpenChange={setNewStoneTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Taş Cinsi Ekle</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Taş Cinsi Adı</Label>
            <Input
              value={newStoneTypeName}
              onChange={(e) => setNewStoneTypeName(e.target.value)}
              placeholder="Örn: BERGAMA"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewStoneTypeDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={() => createStoneTypeMutation.mutate(newStoneTypeName)}
              disabled={!newStoneTypeName}
            >
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Feature Dialog */}
      <Dialog open={newFeatureDialog} onOpenChange={setNewFeatureDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Özellik Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Özellik Adı</Label>
              <Input
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
                placeholder="Örn: Cilalı Çift Tarafı Pahlı"
              />
            </div>
            <div>
              <Label>Varsayılan Fiyat (Opsiyonel)</Label>
              <Input
                type="number"
                value={newFeaturePrice}
                onChange={(e) => setNewFeaturePrice(e.target.value)}
                placeholder="TL"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFeatureDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={() => createFeatureMutation.mutate({
                name: newFeatureName,
                defaultPrice: newFeaturePrice ? Number(newFeaturePrice) : undefined,
              })}
              disabled={!newFeatureName}
            >
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
