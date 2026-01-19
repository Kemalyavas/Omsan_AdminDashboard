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
      customer:customers(*)
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
  const vatRate = orderFields.vat_rate || 20
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
  const orderItems = items.map(item => ({
    ...item,
    order_id: order.id,
  }))
  
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)
  
  if (itemsError) throw itemsError
  
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
    const vatRate = orderFields.vat_rate || 20
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
    const orderItems = items.map(item => ({
      ...item,
      order_id: id,
    }))
    
    await supabase
      .from('order_items')
      .insert(orderItems)
    
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
// Bu fonksiyonlar Vercel API routes kullanacak
const API_URL = import.meta.env.VITE_API_URL || ''

export const downloadOrderPdf = async (id: string) => {
  const response = await fetch(`${API_URL}/api/pdf/${id}`, {
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
    }
  })
  
  if (!response.ok) throw new Error('PDF indirilemedi')
  
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `Siparis-${id}.pdf`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const downloadOrderExcel = async (id: string) => {
  const response = await fetch(`${API_URL}/api/excel/${id}`, {
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
    }
  })
  
  if (!response.ok) throw new Error('Excel indirilemedi')
  
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `Siparis-${id}.xlsx`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
