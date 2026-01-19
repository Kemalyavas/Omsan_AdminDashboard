import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL ve Anon Key tanımlanmalı!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  tax_office?: string
  tax_number?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface StoneType {
  id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StoneFeature {
  id: string
  name: string
  default_price?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id?: string
  order_id?: string
  stone_type_id?: string
  stone_type_name?: string
  stone_feature_id?: string
  stone_feature_name?: string
  thickness?: number
  width?: number
  length?: number
  quantity: number
  square_meter?: number
  linear_meter?: number
  unit_price: number
  total_price: number
  notes?: string
  stone_type?: StoneType
  stone_feature?: StoneFeature
}

export interface Order {
  id: string
  order_number: string
  customer_id?: string
  order_date: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  subtotal: number
  discount_rate?: number
  discount_amount?: number
  total: number
  vat_rate: number
  vat_amount: number
  grand_total: number
  notes?: string
  created_at: string
  updated_at: string
  customer?: Customer
  order_items?: OrderItem[]
}

export interface DashboardStats {
  total_orders: number
  pending_orders: number
  completed_orders: number
  total_revenue: number
  monthly_revenue: number
  total_customers: number
}
