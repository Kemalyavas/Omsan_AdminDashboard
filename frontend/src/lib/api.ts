import { supabase, Customer, StoneType, StoneFeature, Order, OrderItem, DashboardStats } from './supabase'

// ==================== AUTH ====================
export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const onAuthStateChange = (callback: (user: any) => void) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null)
  })
}

// ==================== CUSTOMERS ====================
export const getCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data || []
}

export const getCustomer = async (id: string): Promise<Customer | null> => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export const createCustomer = async (customer: Partial<Customer>): Promise<Customer> => {
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateCustomer = async (id: string, customer: Partial<Customer>): Promise<Customer> => {
  const { data, error } = await supabase
    .from('customers')
    .update(customer)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteCustomer = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// ==================== STONE TYPES ====================
export const getStoneTypes = async (): Promise<StoneType[]> => {
  const { data, error } = await supabase
    .from('stone_types')
    .select('*')
    .eq('is_active', true)
    .order('name')
  
  if (error) throw error
  return data || []
}

export const createStoneType = async (name: string): Promise<StoneType> => {
  const { data, error } = await supabase
    .from('stone_types')
    .insert({ name })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteStoneType = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('stone_types')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// ==================== STONE FEATURES ====================
export const getStoneFeatures = async (): Promise<StoneFeature[]> => {
  const { data, error } = await supabase
    .from('stone_features')
    .select('*')
    .eq('is_active', true)
    .order('name')
  
  if (error) throw error
  return data || []
}

export const createStoneFeature = async (name: string, defaultPrice?: number): Promise<StoneFeature> => {
  const { data, error } = await supabase
    .from('stone_features')
    .insert({ name, default_price: defaultPrice })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteStoneFeature = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('stone_features')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// ==================== ORDERS ====================
export const getOrders = async (params?: { 
  status?: string
  customerId?: string
  search?: string 
}): Promise<Order[]> => {
  let query = supabase
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      order_items(*)
    `)
    .order('created_at', { ascending: false })
  
  if (params?.status) {
    query = query.eq('status', params.status)
  }
  if (params?.customerId) {
    query = query.eq('customer_id', params.customerId)
  }
  if (params?.search) {
    query = query.or(`order_number.ilike.%${params.search}%`)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data || []
}

export const getOrder = async (id: string): Promise<Order | null> => {
  const { data, error } = await supabase
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
  
  if (error) throw error
  return data
}

export const createOrder = async (orderData: {
  customer_id: string
  order_date?: string
  status?: string
  discount_rate?: number
  discount_amount?: number
  vat_rate?: number
  notes?: string
  items: Partial<OrderItem>[]
}): Promise<Order> => {
  const { items, ...orderFields } = orderData
  
  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0)
  const discount = orderFields.discount_amount || 0
  const total = subtotal - discount
  const vatRate = orderFields.vat_rate !== undefined ? orderFields.vat_rate : 20
  const vatAmount = total * (vatRate / 100)
  const grandTotal = total + vatAmount
  
  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      ...orderFields,
      subtotal,
      total,
      vat_amount: vatAmount,
      grand_total: grandTotal,
    })
    .select()
    .single()
  
  if (orderError) throw orderError
  
  // Create order items
  if (items && items.length > 0) {
    const orderItems = items.map(item => ({
      order_id: order.id,
      stone_type_id: item.stone_type_id || null,
      stone_type_name: item.stone_type_name || null,
      stone_feature_id: item.stone_feature_id || null,
      stone_feature_name: item.stone_feature_name || null,
      thickness: item.thickness || null,
      width: item.width || null,
      length: item.length || null,
      quantity: item.quantity || 1,
      square_meter: item.square_meter || null,
      linear_meter: item.linear_meter || null,
      unit_price: item.unit_price || 0,
      total_price: item.total_price || 0,
      notes: item.notes || null,
    }))
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
    
    if (itemsError) {
      console.error('Order items insert error:', itemsError)
      throw itemsError
    }
  }
  
  return order
}

export const updateOrder = async (id: string, orderData: {
  customer_id?: string
  order_date?: string
  status?: string
  discount_rate?: number
  discount_amount?: number
  vat_rate?: number
  notes?: string
  items?: Partial<OrderItem>[]
}): Promise<Order> => {
  const { items, ...orderFields } = orderData
  
  if (items) {
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0)
    const discount = orderFields.discount_amount || 0
    const total = subtotal - discount
    const vatRate = orderFields.vat_rate !== undefined ? orderFields.vat_rate : 20
    const vatAmount = total * (vatRate / 100)
    const grandTotal = total + vatAmount
    
    // Delete existing items
    await supabase
      .from('order_items')
      .delete()
      .eq('order_id', id)
    
    // Update order with new totals
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        ...orderFields,
        subtotal,
        total,
        vat_amount: vatAmount,
        grand_total: grandTotal,
      })
      .eq('id', id)
      .select()
      .single()
    
    if (orderError) throw orderError
    
    // Create new items
    if (items && items.length > 0) {
      const orderItems = items.map(item => ({
        order_id: id,
        stone_type_id: item.stone_type_id || null,
        stone_type_name: item.stone_type_name || null,
        stone_feature_id: item.stone_feature_id || null,
        stone_feature_name: item.stone_feature_name || null,
        thickness: item.thickness || null,
        width: item.width || null,
        length: item.length || null,
        quantity: item.quantity || 1,
        square_meter: item.square_meter || null,
        linear_meter: item.linear_meter || null,
        unit_price: item.unit_price || 0,
        total_price: item.total_price || 0,
        notes: item.notes || null,
      }))
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)
      
      if (itemsError) {
        console.error('Order items update error:', itemsError)
        throw itemsError
      }
    }
    
    return order
  } else {
    // Just update order fields
    const { data, error } = await supabase
      .from('orders')
      .update(orderFields)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

export const updateOrderStatus = async (id: string, status: string): Promise<Order> => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteOrder = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// ==================== DASHBOARD ====================
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const { data, error } = await supabase
    .from('dashboard_stats')
    .select('*')
    .single()
  
  if (error) throw error
  return data
}

export const getRecentOrders = async (limit: number = 5): Promise<Order[]> => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

// ==================== PDF & EXCEL ====================
// Frontend'den direkt oluştur - Vercel API gerektirmez

function formatCurrencyForExport(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0) + ' TL'
}

export const downloadOrderPdf = async (id: string) => {
  // Siparişi al
  const order = await getOrder(id)
  if (!order) throw new Error('Sipariş bulunamadı')
  
  // HTML oluştur
  const itemsHtml = order.order_items?.map((item: any, index: number) => {
    const stoneType = item.stone_type?.name || item.stone_type_name || '-'
    const feature = item.stone_feature?.name || item.stone_feature_name || '-'
    let measure = '-'
    if (item.linear_meter) {
      measure = `${(item.linear_meter * item.quantity).toFixed(2)} mtül`
    } else if (item.square_meter) {
      measure = `${(item.square_meter * item.quantity).toFixed(2)} m²`
    }
    
    return `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${stoneType}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${feature}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.thickness || '-'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.width || '-'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.length || '-'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${measure}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrencyForExport(item.unit_price)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${formatCurrencyForExport(item.total_price)}</td>
      </tr>
    `
  }).join('') || ''

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Sipariş ${order.order_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e40af; padding-bottom: 15px; }
        .company-name { font-size: 22px; font-weight: bold; color: #1e40af; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .info-box { background: #f8fafc; padding: 12px; border-radius: 6px; flex: 1; margin: 0 5px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
        th { background: #1e40af; color: white; padding: 10px; text-align: left; }
        .totals { text-align: right; margin-top: 15px; }
        .total-row { display: flex; justify-content: flex-end; padding: 5px 0; }
        .total-label { width: 150px; }
        .total-value { width: 120px; text-align: right; font-weight: bold; }
        .grand-total { font-size: 18px; color: #1e40af; border-top: 2px solid #1e40af; padding-top: 10px; margin-top: 10px; }
        @media print { body { padding: 10px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">OMSAN MERMER SAN. TİC. LTD. ŞTİ.</div>
        <div>Camicedit Mah. İstanbul Cad. No:92 Osmaneli/Bilecik</div>
        <div>Tel: 0 228 461 46 39 | E-posta: omsangranit@gmail.com</div>
      </div>
      
      <div class="info-row">
        <div class="info-box">
          <strong>Sipariş No:</strong> ${order.order_number}<br>
          <strong>Tarih:</strong> ${new Date(order.order_date).toLocaleDateString('tr-TR')}
        </div>
        <div class="info-box">
          <strong>Müşteri:</strong> ${order.customer?.name || '-'}<br>
          <strong>Telefon:</strong> ${order.customer?.phone || '-'}
        </div>
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
            <th>Miktar</th>
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
          <span class="total-value">${formatCurrencyForExport(order.subtotal)}</span>
        </div>
        ${order.discount_amount ? `
        <div class="total-row" style="color: #dc2626;">
          <span class="total-label">İskonto:</span>
          <span class="total-value">-${formatCurrencyForExport(order.discount_amount)}</span>
        </div>
        ` : ''}
        <div class="total-row">
          <span class="total-label">KDV (%${order.vat_rate}):</span>
          <span class="total-value">${formatCurrencyForExport(order.vat_amount)}</span>
        </div>
        <div class="total-row grand-total">
          <span class="total-label">GENEL TOPLAM:</span>
          <span class="total-value">${formatCurrencyForExport(order.grand_total)}</span>
        </div>
      </div>
      
      ${order.notes ? `
      <div style="margin-top: 20px; padding: 10px; background: #fef3c7; border-radius: 6px;">
        <strong>Notlar:</strong><br>${order.notes}
      </div>
      ` : ''}
      
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `
  
  // Yeni pencerede aç (yazdırma için)
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  }
}

export const downloadOrderExcel = async (id: string) => {
  // Siparişi al
  const order = await getOrder(id)
  if (!order) throw new Error('Sipariş bulunamadı')
  
  // CSV oluştur (Excel'de açılabilir)
  const BOM = '\uFEFF' // UTF-8 BOM for Turkish characters
  let csv = BOM
  
  csv += `OMSAN MERMER SAN. TİC. LTD. ŞTİ.\n\n`
  csv += `Sipariş No;${order.order_number}\n`
  csv += `Tarih;${new Date(order.order_date).toLocaleDateString('tr-TR')}\n`
  csv += `Müşteri;${order.customer?.name || '-'}\n`
  csv += `Telefon;${order.customer?.phone || '-'}\n\n`
  
  csv += `#;Taş Cinsi;Özellik;Kalınlık;Genişlik;Uzunluk;Adet;Miktar;Birim Fiyat;Tutar\n`
  
  order.order_items?.forEach((item: any, index: number) => {
    const stoneType = item.stone_type?.name || item.stone_type_name || '-'
    const feature = item.stone_feature?.name || item.stone_feature_name || '-'
    let measure = '-'
    if (item.linear_meter) {
      measure = `${(item.linear_meter * item.quantity).toFixed(2)} mtül`
    } else if (item.square_meter) {
      measure = `${(item.square_meter * item.quantity).toFixed(2)} m²`
    }
    
    csv += `${index + 1};${stoneType};${feature};${item.thickness || '-'};${item.width || '-'};${item.length || '-'};${item.quantity};${measure};${formatCurrencyForExport(item.unit_price)};${formatCurrencyForExport(item.total_price)}\n`
  })
  
  csv += `\n;;;;;;;;Ara Toplam;${formatCurrencyForExport(order.subtotal)}\n`
  if (order.discount_amount) {
    csv += `;;;;;;;;İskonto;-${formatCurrencyForExport(order.discount_amount)}\n`
  }
  csv += `;;;;;;;;KDV (%${order.vat_rate});${formatCurrencyForExport(order.vat_amount)}\n`
  csv += `;;;;;;;;GENEL TOPLAM;${formatCurrencyForExport(order.grand_total)}\n`
  
  if (order.notes) {
    csv += `\nNotlar;${order.notes}\n`
  }
  
  // İndir
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `${order.order_number}.csv`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
