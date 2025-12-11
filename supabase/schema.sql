-- LevRegAI Newsletter Engine - Supabase Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users table (syncs with Supabase Auth)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Voice Profiles table
-- ============================================
CREATE TABLE IF NOT EXISTS voice_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  newsletter_brand TEXT,

  -- Questionnaire responses
  tone JSONB DEFAULT '[]'::jsonb,
  formality INTEGER CHECK (formality BETWEEN 1 AND 5),
  detail_level INTEGER CHECK (detail_level BETWEEN 1 AND 5),
  sentence_style TEXT CHECK (sentence_style IN ('short', 'mixed', 'flowing')),
  vocabulary_level TEXT CHECK (vocabulary_level IN ('simple', 'professional', 'academic')),

  -- Analysis results
  samples JSONB DEFAULT '[]'::jsonb,
  avg_sentence_length DECIMAL(5,2),
  common_phrases TEXT[] DEFAULT ARRAY[]::TEXT[],
  avoid_phrases TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Signature elements
  uses_questions BOOLEAN DEFAULT false,
  uses_data BOOLEAN DEFAULT false,
  uses_anecdotes BOOLEAN DEFAULT false,
  uses_metaphors BOOLEAN DEFAULT false,
  uses_humor BOOLEAN DEFAULT false,

  -- Structure preferences
  paragraph_pattern TEXT,

  -- Generated AI prompts
  voice_prompt TEXT,
  system_prompt TEXT,

  -- Status and metadata
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'analyzing', 'ready', 'approved')),
  total_generations INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),
  approved_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_profile_name CHECK (LENGTH(profile_name) BETWEEN 1 AND 100)
);

-- ============================================
-- Generations table
-- ============================================
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES voice_profiles(id) ON DELETE SET NULL,

  -- Input data
  content_type TEXT NOT NULL CHECK (content_type IN ('Twitter', 'YouTube', 'Article')),
  content_source TEXT NOT NULL,
  input_data JSONB,

  -- Processing
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  n8n_execution_id TEXT,
  error_message TEXT,

  -- Output data
  newsletters JSONB,
  google_drive_folder TEXT,
  google_drive_files JSONB,

  -- Metrics
  execution_time_seconds INTEGER,
  api_cost DECIMAL(10,4),
  word_count_total INTEGER,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_content_source CHECK (LENGTH(content_source) > 0)
);

-- ============================================
-- Subscriptions table (for future billing)
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Stripe integration
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,

  -- Plan details
  plan_name TEXT NOT NULL DEFAULT 'starter' CHECK (plan_name IN ('starter', 'professional', 'agency')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),

  -- Billing period
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  cancel_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,

  -- Usage limits
  generations_this_period INTEGER DEFAULT 0,
  generations_limit INTEGER NOT NULL DEFAULT 20,

  -- Metadata
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT one_subscription_per_user UNIQUE (user_id)
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_voice_profiles_user ON voice_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_profiles_status ON voice_profiles(status);
CREATE INDEX IF NOT EXISTS idx_generations_user ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);
CREATE INDEX IF NOT EXISTS idx_generations_created ON generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Voice profiles policies
CREATE POLICY "Users can view own voice profiles" ON voice_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice profiles" ON voice_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice profiles" ON voice_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice profiles" ON voice_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Generations policies
CREATE POLICY "Users can view own generations" ON generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations" ON generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generations" ON generations
  FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- Functions
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  -- Create default subscription
  INSERT INTO public.subscriptions (user_id, plan_name, status, generations_limit)
  VALUES (NEW.id, 'starter', 'active', 20);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_voice_profiles_updated_at
  BEFORE UPDATE ON voice_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
