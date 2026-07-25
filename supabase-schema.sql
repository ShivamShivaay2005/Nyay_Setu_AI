-- =======================================================================
-- NYAY SETU AI - KISAN NYAY LEDGER SQL SCHEMA
-- Target Database: Supabase / PostgreSQL 15+
-- =======================================================================

-- 1. Create custom types/enums for security and validation
CREATE TYPE user_role AS ENUM ('farmer', 'officer', 'admin');
CREATE TYPE claim_status AS ENUM (
  'pending_ai', 
  'pending_weather', 
  'pending_officer', 
  'approved', 
  'rejected', 
  'more_evidence', 
  'appealed'
);
CREATE TYPE damage_severity AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- 2. Users Table (Linked to Supabase Auth)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'farmer',
  phone TEXT,
  aadhaar TEXT,
  wallet_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);



-- 3. Claims Table
CREATE TABLE public.claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  farmer_name TEXT NOT NULL,
  crop_type TEXT NOT NULL,
  damage_type TEXT NOT NULL,
  sowing_date DATE NOT NULL,
  damage_date DATE NOT NULL,
  area_acres NUMERIC(6, 2) NOT NULL,
  estimated_loss_inr NUMERIC(12, 2) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  ipfs_url TEXT DEFAULT '',
  supplemental_evidence JSONB DEFAULT '[]'::jsonb,
  supplemental_evidence_at TIMESTAMP WITH TIME ZONE,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  status claim_status NOT NULL DEFAULT 'pending_ai',
  blockchain_tx_hash TEXT,
  blockchain_block_number INTEGER,
  blockchain_network TEXT,
  blockchain_mode TEXT,
  blockchain_explorer_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);



-- 4. AI Results Table (Populated by Gemini AI via edge function / backend)
CREATE TABLE public.ai_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE UNIQUE NOT NULL,
  crop_type_detected TEXT NOT NULL,
  damage_type_detected TEXT NOT NULL,
  severity damage_severity NOT NULL,
  severity_percent INTEGER NOT NULL CHECK (severity_percent BETWEEN 0 AND 100),
  confidence_score NUMERIC(4, 3) NOT NULL CHECK (confidence_score BETWEEN 0.0 AND 1.0),
  reasoning TEXT NOT NULL,
  manual_review_required BOOLEAN DEFAULT TRUE NOT NULL,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);



-- 5. Weather Verification Table (Populated by Weather API)
CREATE TABLE public.weather_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE UNIQUE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  temperature NUMERIC(4, 1),
  humidity INTEGER,
  precipitation NUMERIC(5, 2),
  weather_description TEXT,
  wind_speed NUMERIC(5, 2),
  station_name TEXT,
  analysis_note TEXT NOT NULL,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);



-- 6. Officer Decisions Table
CREATE TABLE public.officer_decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  officer_id UUID REFERENCES public.profiles(id) NOT NULL,
  officer_name TEXT NOT NULL,
  status_selected claim_status NOT NULL,
  comments TEXT NOT NULL,
  blockchain_block_id INTEGER,
  decided_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);



-- 7. Appeals Table
CREATE TABLE public.appeals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE UNIQUE NOT NULL,
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  new_evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);



CREATE TABLE public.blockchain_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  block_number INTEGER UNIQUE NOT NULL,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  evidence_hash TEXT NOT NULL,
  status claim_status NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  officer_wallet TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL,
  nonce INTEGER NOT NULL,
  network TEXT,
  simulated BOOLEAN DEFAULT TRUE,
  explorer_url TEXT
);

-- Disable Row Level Security (bypassed for backend API operations)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_verifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_decisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_logs DISABLE ROW LEVEL SECURITY;

-- =======================================================================
-- HELPER TRIGGERS
-- =======================================================================

-- Trigger to auto-update profile timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_claims_timestamp BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
