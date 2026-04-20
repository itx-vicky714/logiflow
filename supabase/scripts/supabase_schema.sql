-- ============================================================
-- LogiFlow Complete Database Schema v2
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ENUMS (skip if already exist)
DO $$ BEGIN
  CREATE TYPE shipment_mode AS ENUM ('road', 'rail', 'air', 'sea');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE shipment_status AS ENUM ('pending', 'in_transit', 'on_time', 'delayed', 'delivered');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- PROFILES TABLE (extended user data)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  company TEXT,
  role TEXT,
  phone TEXT,
  whatsapp TEXT,
  avatar_url TEXT,
  email_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- SHIPMENTS TABLE (with new extended fields)
CREATE TABLE IF NOT EXISTS shipments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shipment_code TEXT UNIQUE NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  mode shipment_mode NOT NULL,
  status shipment_status NOT NULL DEFAULT 'pending',
  eta TIMESTAMP WITH TIME ZONE,
  cargo_type TEXT,
  weight_kg NUMERIC,
  declared_value NUMERIC DEFAULT 0,
  supplier_name TEXT,
  supplier_email TEXT,
  vehicle_number TEXT,
  transporter_name TEXT,
  eway_bill TEXT,
  eway_bill_expiry TIMESTAMP WITH TIME ZONE,
  reference_number TEXT,
  driver_contact TEXT,
  whatsapp_alerts TEXT,
  priority TEXT DEFAULT 'normal',
  special_handling JSONB DEFAULT '{}',
  notes TEXT,
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to existing shipments table (migration-safe)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS declared_value NUMERIC DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS supplier_email TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS transporter_name TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS eway_bill TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS eway_bill_expiry TIMESTAMP WITH TIME ZONE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS driver_contact TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS whatsapp_alerts TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS special_handling JSONB DEFAULT '{}';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS notes TEXT;

-- RLS POLICIES
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own shipments" ON shipments FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own shipments" ON shipments FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own shipments" ON shipments FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own shipments" ON shipments FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ALERTS TABLE
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own alerts" ON alerts FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM shipments WHERE id = alerts.shipment_id AND user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own alerts" ON alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- REPORTS TABLE
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  content JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own reports" ON reports FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
