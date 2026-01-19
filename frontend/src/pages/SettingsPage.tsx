import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { getStoneTypes, getStoneFeatures, createStoneType, createStoneFeature, deleteStoneType, deleteStoneFeature } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

export default function SettingsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Stone Type State
  const [stoneTypeDialog, setStoneTypeDialog] = useState(false)
  const [newStoneTypeName, setNewStoneTypeName] = useState('')

  // Stone Feature State
  const [featureDialog, setFeatureDialog] = useState(false)
  const [newFeatureName, setNewFeatureName] = useState('')
  const [newFeaturePrice, setNewFeaturePrice] = useState('')

  // Queries
  const { data: stoneTypes = [] } = useQuery({
    queryKey: ['stone-types'],
    queryFn: getStoneTypes,
  })

  const { data: stoneFeatures = [] } = useQuery({
    queryKey: ['stone-features'],
    queryFn: getStoneFeatures,
  })

  // Mutations
  const createStoneTypeMutation = useMutation({
    mutationFn: createStoneType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stone-types'] })
      setStoneTypeDialog(false)
      setNewStoneTypeName('')
      toast({ title: 'Taş cinsi eklendi' })
    },
    onError: (error: any) => {
      toast({ 
        title: 'Hata', 
        description: error.response?.data?.error || 'Taş cinsi eklenemedi', 
        variant: 'destructive' 
      })
    },
  })

  const createFeatureMutation = useMutation({
    mutationFn: (data: { name: string; defaultPrice?: number }) => 
      createStoneFeature(data.name, data.defaultPrice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stone-features'] })
      setFeatureDialog(false)
      setNewFeatureName('')
      setNewFeaturePrice('')
      toast({ title: 'Özellik eklendi' })
    },
    onError: (error: any) => {
      toast({ 
        title: 'Hata', 
        description: error.response?.data?.error || 'Özellik eklenemedi', 
        variant: 'destructive' 
      })
    },
  })

  const deleteStoneTypeMutation = useMutation({
    mutationFn: deleteStoneType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stone-types'] })
      toast({ title: 'Taş cinsi silindi' })
    },
    onError: () => {
      toast({ 
        title: 'Hata', 
        description: 'Taş cinsi silinemedi. Bu taş cinsi kullanımda olabilir.', 
        variant: 'destructive' 
      })
    },
  })

  const deleteFeatureMutation = useMutation({
    mutationFn: deleteStoneFeature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stone-features'] })
      toast({ title: 'Özellik silindi' })
    },
    onError: () => {
      toast({ 
        title: 'Hata', 
        description: 'Özellik silinemedi. Bu özellik kullanımda olabilir.', 
        variant: 'destructive' 
      })
    },
  })

  const handleDeleteStoneType = (id: string, name: string) => {
    if (confirm(`"${name}" taş cinsini silmek istediğinizden emin misiniz?`)) {
      deleteStoneTypeMutation.mutate(id)
    }
  }

  const handleDeleteFeature = (id: string, name: string) => {
    if (confirm(`"${name}" özelliğini silmek istediğinizden emin misiniz?`)) {
      deleteFeatureMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
        <p className="text-gray-500">Sistem ayarlarını yönetin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stone Types */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Taş Cinsleri</CardTitle>
              <CardDescription>Sistemde kayıtlı taş cinsleri</CardDescription>
            </div>
            <Button size="sm" onClick={() => setStoneTypeDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ekle
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stoneTypes.map((type: any) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
                >
                  <span className="font-medium">{type.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    onClick={() => handleDeleteStoneType(type.id, type.name)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {stoneTypes.length === 0 && (
                <p className="text-gray-500 text-center py-4">Henüz taş cinsi eklenmemiş</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stone Features */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Taş Özellikleri</CardTitle>
              <CardDescription>Sistemde kayıtlı özellikler ve varsayılan fiyatlar</CardDescription>
            </div>
            <Button size="sm" onClick={() => setFeatureDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ekle
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stoneFeatures.map((feature: any) => (
                <div
                  key={feature.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
                >
                  <span className="font-medium">{feature.name}</span>
                  <div className="flex items-center gap-2">
                    {feature.default_price && (
                      <span className="text-gray-500">{formatCurrency(feature.default_price)}</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      onClick={() => handleDeleteFeature(feature.id, feature.name)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              {stoneFeatures.length === 0 && (
                <p className="text-gray-500 text-center py-4">Henüz özellik eklenmemiş</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Firma Bilgileri</CardTitle>
          <CardDescription>PDF çıktılarında görünecek firma bilgileri</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Firma Adı</Label>
              <Input defaultValue="OMSAN MERMER SAN. TİC. LTD. ŞTİ." />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input defaultValue="0 228 461 46 39" />
            </div>
            <div>
              <Label>E-posta</Label>
              <Input defaultValue="omsangranit@gmail.com" />
            </div>
            <div>
              <Label>Adres</Label>
              <Input defaultValue="Camicedit Mah. İstanbul Cad. No:92 Osmaneli/Bilecik" />
            </div>
          </div>
          <Button>Kaydet</Button>
        </CardContent>
      </Card>

      {/* New Stone Type Dialog */}
      <Dialog open={stoneTypeDialog} onOpenChange={setStoneTypeDialog}>
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
            <Button variant="outline" onClick={() => setStoneTypeDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={() => createStoneTypeMutation.mutate(newStoneTypeName)}
              disabled={!newStoneTypeName || createStoneTypeMutation.isPending}
            >
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Feature Dialog */}
      <Dialog open={featureDialog} onOpenChange={setFeatureDialog}>
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
            <Button variant="outline" onClick={() => setFeatureDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={() => createFeatureMutation.mutate({
                name: newFeatureName,
                defaultPrice: newFeaturePrice ? Number(newFeaturePrice) : undefined,
              })}
              disabled={!newFeatureName || createFeatureMutation.isPending}
            >
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
