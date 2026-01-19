import { createClient } from '@supabase/supabase-js'

export const config = {
  runtime: 'edge',
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(request: Request) {
  const url = new URL(request.url)
  const id = url.pathname.split('/').pop()

  if (!id) {
    return new Response('Order ID required', { status: 400 })
  }

  // Verify auth
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Get order
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      order_items(
        *,
        stone_type:stone_types(*),
        stone_feature:stone_features(*)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !order) {
    return new Response('Order not found', { status: 404 })
  }

  // Generate CSV (simpler for edge runtime, can be opened in Excel)
  const csv = generateCsv(order)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=${order.order_number}.csv`,
    },
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

function generateCsv(order: any): string {
  const BOM = '\uFEFF' // UTF-8 BOM for Excel Turkish character support
  
  let csv = BOM
  
  // Header info
  csv += `OMSAN MERMER SAN. TİC. LTD. ŞTİ.\n`
  csv += `\n`
  csv += `Sipariş No;${order.order_number}\n`
  csv += `Tarih;${new Date(order.order_date).toLocaleDateString('tr-TR')}\n`
  csv += `Müşteri;${order.customer?.name || '-'}\n`
  csv += `Telefon;${order.customer?.phone || '-'}\n`
  csv += `\n`
  
  // Table header
  csv += `#;Taş Cinsi;Özellik;Kalınlık;Genişlik;Uzunluk;Adet;M²/Mtül;Birim Fiyat;Tutar\n`
  
  // Items
  order.order_items?.forEach((item: any, index: number) => {
    const stoneType = item.stone_type?.name || item.stone_type_name || '-'
    const feature = item.stone_feature?.name || item.stone_feature_name || '-'
    const measure = item.linear_meter 
      ? `${item.linear_meter.toFixed(2)} Mtül` 
      : `${(item.square_meter || 0).toFixed(2)} M²`
    
    csv += `${index + 1};${stoneType};${feature};${item.thickness || '-'};${item.width || '-'};${item.length || '-'};${item.quantity};${measure};${formatCurrency(item.unit_price)} TL;${formatCurrency(item.total_price)} TL\n`
  })
  
  // Totals
  csv += `\n`
  csv += `;;;;;;;;Ara Toplam;${formatCurrency(order.subtotal)} TL\n`
  if (order.discount_amount) {
    csv += `;;;;;;;;İskonto;-${formatCurrency(order.discount_amount)} TL\n`
  }
  csv += `;;;;;;;;KDV (%${order.vat_rate});${formatCurrency(order.vat_amount)} TL\n`
  csv += `;;;;;;;;GENEL TOPLAM;${formatCurrency(order.grand_total)} TL\n`
  
  if (order.notes) {
    csv += `\n`
    csv += `Notlar;${order.notes}\n`
  }
  
  return csv
}
