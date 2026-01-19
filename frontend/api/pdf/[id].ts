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

  // Generate HTML for PDF
  const html = generatePdfHtml(order)

  // Use html2pdf service or return HTML
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(amount || 0)
}

function generatePdfHtml(order: any): string {
  const itemsHtml = order.order_items?.map((item: any, index: number) => {
    const stoneType = item.stone_type?.name || item.stone_type_name || '-'
    const feature = item.stone_feature?.name || item.stone_feature_name || '-'
    const measure = item.linear_meter 
      ? `${item.linear_meter.toFixed(2)} Mtül` 
      : `${(item.square_meter || 0).toFixed(2)} M²`

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${stoneType}</td>
        <td>${feature}</td>
        <td>${item.thickness || '-'}</td>
        <td>${item.width || '-'}</td>
        <td>${item.length || '-'}</td>
        <td>${item.quantity}</td>
        <td>${measure}</td>
        <td>${formatCurrency(item.unit_price)}</td>
        <td>${formatCurrency(item.total_price)}</td>
      </tr>
    `
  }).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 20px; }
        .company-name { font-size: 24px; font-weight: bold; color: #1e40af; }
        .order-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .customer-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #1e40af; color: white; padding: 10px; text-align: left; font-size: 12px; }
        td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
        tr:nth-child(even) { background: #f8fafc; }
        .totals { text-align: right; margin-top: 20px; }
        .total-row { display: flex; justify-content: flex-end; margin: 5px 0; }
        .total-label { width: 150px; text-align: right; margin-right: 20px; }
        .grand-total { font-size: 18px; font-weight: bold; color: #16a34a; background: #dcfce7; padding: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">OMSAN MERMER SAN. TİC. LTD. ŞTİ.</div>
        <p>Fiyat Teklifi</p>
      </div>
      
      <div class="order-info">
        <div><strong>Sipariş No:</strong> ${order.order_number}</div>
        <div><strong>Tarih:</strong> ${new Date(order.order_date).toLocaleDateString('tr-TR')}</div>
      </div>
      
      <div class="customer-info">
        <strong>Müşteri:</strong> ${order.customer?.name || '-'}<br>
        ${order.customer?.phone ? `<strong>Tel:</strong> ${order.customer.phone}<br>` : ''}
        ${order.customer?.address ? `<strong>Adres:</strong> ${order.customer.address}` : ''}
      </div>
      
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Taş Cinsi</th>
            <th>Özellik</th>
            <th>Kalınlık</th>
            <th>Genişlik</th>
            <th>Uzunluk</th>
            <th>Adet</th>
            <th>M²/Mtül</th>
            <th>Birim Fiyat</th>
            <th>Tutar</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <div class="totals">
        <div class="total-row">
          <span class="total-label">Ara Toplam:</span>
          <span>${formatCurrency(order.subtotal)}</span>
        </div>
        ${order.discount_amount ? `
        <div class="total-row" style="color: #dc2626;">
          <span class="total-label">İskonto:</span>
          <span>-${formatCurrency(order.discount_amount)}</span>
        </div>
        ` : ''}
        <div class="total-row">
          <span class="total-label">KDV (%${order.vat_rate}):</span>
          <span>${formatCurrency(order.vat_amount)}</span>
        </div>
        <div class="total-row grand-total">
          <span class="total-label">GENEL TOPLAM:</span>
          <span>${formatCurrency(order.grand_total)}</span>
        </div>
      </div>
      
      ${order.notes ? `
      <div style="margin-top: 30px; padding: 15px; background: #fef3c7; border-radius: 8px;">
        <strong>Notlar:</strong> ${order.notes}
      </div>
      ` : ''}
    </body>
    </html>
  `
}
