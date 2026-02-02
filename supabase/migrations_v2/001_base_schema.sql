-- =====================================================
-- SKALI PROG V3 - BASE SCHEMA
-- Migration 001: Core tables and functions
-- =====================================================
-- Execute this FIRST - all other migrations depend on it
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
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Statuts membres
DO $$ BEGIN
    CREATE TYPE member_status AS ENUM ('active', 'inactive', 'suspended', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Genre
DO $$ BEGIN
    CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 3. UTILITY FUNCTIONS (needed by other objects)
-- =====================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CORE TABLES
-- =====================================================

-- -----------------------------------------------------
-- profiles (Public users - linked to auth.users)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    is_super_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_super_admin ON public.profiles(is_super_admin) WHERE is_super_admin = true;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

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
-- organizations (Gyms - TENANTS)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
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

    -- Stripe Connect
    stripe_account_id TEXT,
    stripe_customer_id TEXT,
    stripe_onboarding_complete BOOLEAN DEFAULT false,
    stripe_charges_enabled BOOLEAN DEFAULT false,
    stripe_payouts_enabled BOOLEAN DEFAULT false,

    -- Platform subscription
    platform_plan_id UUID,
    platform_subscription_status TEXT DEFAULT 'trialing',
    platform_subscription_id TEXT,
    platform_fee_percent DECIMAL(5,2) DEFAULT 2.5,
    trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),

    -- Ownership
    created_by UUID REFERENCES public.profiles(id),
    owner_user_id UUID REFERENCES public.profiles(id),
    billing_email TEXT,

    -- Location
    country_code TEXT DEFAULT 'FR',
    timezone TEXT DEFAULT 'Europe/Paris',

    -- Meta
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_account ON public.organizations(stripe_account_id);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- organization_users (Link users <-> orgs)
-- MUST be created BEFORE helper functions
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

CREATE INDEX IF NOT EXISTS idx_organization_users_org ON public.organization_users(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_user ON public.organization_users(user_id);

ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- members (Gym members)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Member info
    member_number TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    birth_date DATE,
    gender gender_type,
    avatar_url TEXT,

    -- Emergency contact and medical (JSONB)
    emergency_contact JSONB DEFAULT '{}'::jsonb,
    medical_info JSONB DEFAULT '{}'::jsonb,

    -- Tags and status
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    status member_status NOT NULL DEFAULT 'active',

    -- RGPD fields
    last_data_export_at TIMESTAMPTZ,
    deletion_requested_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),

    -- Dates
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_org ON public.members(org_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_name ON public.members(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_members_user ON public.members(user_id);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. HELPER FUNCTIONS (after all tables exist)
-- =====================================================

-- Check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND is_super_admin = true
    );
END;
$$;

-- Check if user is staff of an org
CREATE OR REPLACE FUNCTION public.is_org_staff(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Super admin has access to all
    IF is_super_admin() THEN
        RETURN true;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE organization_users.org_id = is_org_staff.org_id
        AND organization_users.user_id = auth.uid()
        AND organization_users.is_active = true
    );
END;
$$;

-- Get user's org IDs
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Super admin sees all orgs
    IF is_super_admin() THEN
        RETURN ARRAY(SELECT id FROM public.organizations WHERE is_active = true);
    END IF;

    RETURN ARRAY(
        SELECT org_id FROM public.organization_users
        WHERE user_id = auth.uid() AND is_active = true
    );
END;
$$;

-- Check if current user is the member themselves
CREATE OR REPLACE FUNCTION public.is_member_self(member_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.members
        WHERE id = member_id
        AND user_id = auth.uid()
    );
END;
$$;

-- =====================================================
-- 6. RLS POLICIES (after functions exist)
-- =====================================================

-- Organizations policies
DROP POLICY IF EXISTS "Staff can view their org" ON public.organizations;
CREATE POLICY "Staff can view their org" ON public.organizations
    FOR SELECT USING (is_org_staff(id));

DROP POLICY IF EXISTS "Super admin can view all orgs" ON public.organizations;
CREATE POLICY "Super admin can view all orgs" ON public.organizations
    FOR SELECT USING (is_super_admin());

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

DROP POLICY IF EXISTS "Super admin can manage all orgs" ON public.organizations;
CREATE POLICY "Super admin can manage all orgs" ON public.organizations
    FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Anyone can insert org" ON public.organizations;
CREATE POLICY "Anyone can insert org" ON public.organizations
    FOR INSERT WITH CHECK (true);

-- Organization users policies
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

-- Members policies
DROP POLICY IF EXISTS "Staff can view their org members" ON public.members;
CREATE POLICY "Staff can view their org members" ON public.members
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can manage their org members" ON public.members;
CREATE POLICY "Staff can manage their org members" ON public.members
    FOR ALL USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Members can view own profile" ON public.members;
CREATE POLICY "Members can view own profile" ON public.members
    FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

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
