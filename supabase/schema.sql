-- Supabase Schema for Sipariş Dashboard
-- Bu SQL'i Supabase SQL Editor'de çalıştırın

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Müşteriler tablosu
CREATE TABLE customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_office TEXT,
  tax_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Taş Cinsleri tablosu
CREATE TABLE stone_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Taş Özellikleri tablosu
CREATE TABLE stone_features (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  default_price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Siparişler tablosu
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount_rate DECIMAL(5,2),
  discount_amount DECIMAL(12,2),
  total DECIMAL(12,2) DEFAULT 0,
  vat_rate DECIMAL(5,2) DEFAULT 20,
  vat_amount DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sipariş Kalemleri tablosu
CREATE TABLE order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  stone_type_id UUID REFERENCES stone_types(id) ON DELETE SET NULL,
  stone_type_name TEXT,
  stone_feature_id UUID REFERENCES stone_features(id) ON DELETE SET NULL,
  stone_feature_name TEXT,
  thickness DECIMAL(10,2),
  width DECIMAL(10,2),
  length DECIMAL(10,2),
  quantity INTEGER DEFAULT 1,
  square_meter DECIMAL(10,4),
  linear_meter DECIMAL(10,4),
  unit_price DECIMAL(12,2) DEFAULT 0,
  total_price DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sipariş numarası oluşturmak için fonksiyon
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  last_num INTEGER;
  new_number TEXT;
BEGIN
  year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(MAX(CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER)), 0)
  INTO last_num
  FROM orders
  WHERE order_number LIKE 'SIP-' || year_part || '-%';
  
  new_number := 'SIP-' || year_part || '-' || LPAD((last_num + 1)::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Sipariş oluşturulduğunda otomatik numara atama
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_stone_types_updated_at
  BEFORE UPDATE ON stone_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_stone_features_updated_at
  BEFORE UPDATE ON stone_features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS) - Authenticated users only
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stone_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE stone_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policies - Authenticated users can do everything
CREATE POLICY "Authenticated users can manage customers" ON customers
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage stone_types" ON stone_types
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage stone_features" ON stone_features
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage orders" ON orders
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage order_items" ON order_items
  FOR ALL USING (auth.role() = 'authenticated');

-- Başlangıç verileri
INSERT INTO stone_types (name) VALUES
  ('Bergama'),
  ('Muğla Beyaz'),
  ('Afyon Şeker'),
  ('Toros Siyah'),
  ('Burdur Bej'),
  ('Denizli Traverten'),
  ('Bilecik Bej');

INSERT INTO stone_features (name, default_price) VALUES
  ('Cilalı Çift Tarafı Pahlı', 1350.00),
  ('Cilalı Tek Tarafı Pahlı', 1200.00),
  ('Kumlanmış Çift Pahlı', 1100.00),
  ('Kumlanmış Tek Pahlı', 1000.00),
  ('Honlu Çift Pahlı', 1250.00),
  ('Honlu Tek Pahlı', 1150.00),
  ('Eskitme', 1400.00),
  ('Fırçalı', 1300.00);

-- Dashboard istatistikleri için view
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM orders) as total_orders,
  (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
  (SELECT COUNT(*) FROM orders WHERE status = 'completed') as completed_orders,
  (SELECT COALESCE(SUM(grand_total), 0) FROM orders WHERE status != 'cancelled') as total_revenue,
  (SELECT COALESCE(SUM(grand_total), 0) FROM orders 
   WHERE status != 'cancelled' 
   AND EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
   AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)) as monthly_revenue,
  (SELECT COUNT(*) FROM customers) as total_customers;
