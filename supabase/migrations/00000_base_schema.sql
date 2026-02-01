-- =====================================================
-- SKALI PROG V3 - BASE SCHEMA
-- Multi-tenant SaaS pour salles de sport
-- =====================================================
-- Date: 2026-01-31
-- Next.js 14 + Supabase
-- =====================================================

-- =====================================================
-- 1. EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. CUSTOM TYPES (ENUMS)
-- =====================================================

-- Roles staff
DO $$ BEGIN
    CREATE TYPE org_role AS ENUM ('owner', 'admin', 'coach', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Statuts membres
DO $$ BEGIN
    CREATE TYPE member_status AS ENUM ('active', 'inactive', 'suspended', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Genre
DO $$ BEGIN
    CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 3. CORE TABLES (ORDRE: pas de dépendances circulaires)
-- =====================================================

-- -----------------------------------------------------
-- profiles (Users publics - lies a auth.users)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies profiles (pas de dépendances)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------
-- organizations (Salles de sport - TENANTS)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identite
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,

    -- Settings
    settings JSONB DEFAULT '{}'::jsonb,
    features JSONB DEFAULT '{
        "members": true,
        "subscriptions": true,
        "classes": true,
        "bookings": true,
        "workouts": true,
        "teams": false,
        "communications": false,
        "finance": false
    }'::jsonb,

    -- Stripe
    stripe_account_id TEXT,
    stripe_customer_id TEXT,

    -- Meta
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- RLS (policies ajoutées après organization_users)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- organization_users (Lien users <-> orgs)
-- DOIT ÊTRE CRÉÉE AVANT les fonctions qui l'utilisent
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role org_role NOT NULL DEFAULT 'staff',
    permissions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(org_id, user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_organization_users_org ON public.organization_users(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_user ON public.organization_users(user_id);

-- RLS
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- members (Membres des salles)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Info membre
    member_number TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    birth_date DATE,
    gender gender_type,
    avatar_url TEXT,

    -- Contacts urgence et medical (JSONB)
    emergency_contact JSONB DEFAULT '{}'::jsonb,
    medical_info JSONB DEFAULT '{}'::jsonb,

    -- Tags et statut
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    status member_status NOT NULL DEFAULT 'active',

    -- Dates
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_members_org ON public.members(org_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_name ON public.members(last_name, first_name);

-- RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. HELPER FUNCTIONS (après toutes les tables)
-- =====================================================

-- Function to check if user is staff of org
CREATE OR REPLACE FUNCTION public.is_org_staff(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE organization_users.org_id = is_org_staff.org_id
        AND organization_users.user_id = auth.uid()
        AND organization_users.is_active = true
    );
END;
$$;

-- Function to get user's org IDs
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN ARRAY(
        SELECT org_id FROM public.organization_users
        WHERE user_id = auth.uid() AND is_active = true
    );
END;
$$;

-- =====================================================
-- 5. POLICIES (après fonctions helper)
-- =====================================================

-- Policies organizations
DROP POLICY IF EXISTS "Staff can view their org" ON public.organizations;
CREATE POLICY "Staff can view their org" ON public.organizations
    FOR SELECT USING (is_org_staff(id));

DROP POLICY IF EXISTS "Owners can update their org" ON public.organizations;
CREATE POLICY "Owners can update their org" ON public.organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.organization_users
            WHERE organization_users.org_id = organizations.id
            AND organization_users.user_id = auth.uid()
            AND organization_users.role = 'owner'
            AND organization_users.is_active = true
        )
    );

DROP POLICY IF EXISTS "Anyone can insert org" ON public.organizations;
CREATE POLICY "Anyone can insert org" ON public.organizations
    FOR INSERT WITH CHECK (true);

-- Policies organization_users
DROP POLICY IF EXISTS "Staff can view their org members" ON public.organization_users;
CREATE POLICY "Staff can view their org members" ON public.organization_users
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Admins can manage org members" ON public.organization_users;
CREATE POLICY "Admins can manage org members" ON public.organization_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.org_id = organization_users.org_id
            AND ou.user_id = auth.uid()
            AND ou.role IN ('owner', 'admin')
            AND ou.is_active = true
        )
    );

DROP POLICY IF EXISTS "Users can insert own org_user" ON public.organization_users;
CREATE POLICY "Users can insert own org_user" ON public.organization_users
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policies members
DROP POLICY IF EXISTS "Staff can view their org members" ON public.members;
CREATE POLICY "Staff can view their org members" ON public.members
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can manage their org members" ON public.members;
CREATE POLICY "Staff can manage their org members" ON public.members
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- 6. UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_members_updated_at ON public.members;
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
