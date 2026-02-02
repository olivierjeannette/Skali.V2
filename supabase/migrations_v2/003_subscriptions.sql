-- =====================================================
-- SKALI PROG V3 - SUBSCRIPTIONS SCHEMA
-- Migration 003: Plans, subscriptions, payments
-- =====================================================
-- Requires: 001_base_schema.sql
-- =====================================================

-- =====================================================
-- 1. ENUMS
-- =====================================================

DO $$ BEGIN
    CREATE TYPE plan_type AS ENUM ('monthly', 'quarterly', 'biannual', 'annual', 'session_card', 'unlimited');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('card', 'sepa', 'cash', 'check', 'transfer', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. PLANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Plan info
    name TEXT NOT NULL,
    description TEXT,
    plan_type plan_type NOT NULL DEFAULT 'monthly',

    -- Price
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'EUR',

    -- Duration (in days) or session count
    duration_days INTEGER,
    session_count INTEGER,

    -- Limits
    max_classes_per_week INTEGER,
    max_bookings_per_day INTEGER,

    -- Features included
    features JSONB DEFAULT '{
        "all_classes": true,
        "priority_booking": false,
        "guest_passes": 0,
        "freeze_days": 0
    }'::jsonb,

    -- Stripe
    stripe_product_id TEXT,
    stripe_price_id TEXT,
    stripe_price_type TEXT DEFAULT 'one_time',

    -- Meta
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_org ON public.plans(org_id);
CREATE INDEX IF NOT EXISTS idx_plans_active ON public.plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plans_stripe_product ON public.plans(stripe_product_id);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view their org plans" ON public.plans;
CREATE POLICY "Staff can view their org plans" ON public.plans
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
CREATE POLICY "Admins can manage plans" ON public.plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_users
            WHERE organization_users.org_id = plans.org_id
            AND organization_users.user_id = auth.uid()
            AND organization_users.role IN ('owner', 'admin')
            AND organization_users.is_active = true
        )
    );

-- =====================================================
-- 3. SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,

    -- Status
    status subscription_status NOT NULL DEFAULT 'active',

    -- Dates
    start_date DATE NOT NULL,
    end_date DATE,
    paused_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    -- For session cards
    sessions_total INTEGER,
    sessions_used INTEGER DEFAULT 0,

    -- Price applied (can differ from plan if promo)
    price_paid DECIMAL(10, 2),
    discount_percent DECIMAL(5, 2),
    discount_reason TEXT,

    -- Stripe
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,

    -- Renewal
    auto_renew BOOLEAN DEFAULT true,
    renewal_reminder_sent BOOLEAN DEFAULT false,

    -- Notes
    notes TEXT,

    -- Meta
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_member ON public.subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON public.subscriptions(end_date);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view their org subscriptions" ON public.subscriptions;
CREATE POLICY "Staff can view their org subscriptions" ON public.subscriptions
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Staff can manage subscriptions" ON public.subscriptions
    FOR ALL USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Members can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Members can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (is_member_self(member_id));

-- =====================================================
-- 4. PAYMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,

    -- Amount
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'EUR',

    -- Status and method
    status payment_status NOT NULL DEFAULT 'pending',
    payment_method payment_method NOT NULL DEFAULT 'card',

    -- Description
    description TEXT,

    -- Dates
    paid_at TIMESTAMPTZ,
    due_date DATE,

    -- Stripe
    stripe_payment_intent_id TEXT,
    stripe_invoice_id TEXT,
    stripe_charge_id TEXT,

    -- Refund
    refunded_amount DECIMAL(10, 2),
    refunded_at TIMESTAMPTZ,
    refund_reason TEXT,

    -- Meta
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_org ON public.payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_member ON public.payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON public.payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(created_at);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view their org payments" ON public.payments;
CREATE POLICY "Staff can view their org payments" ON public.payments
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
CREATE POLICY "Admins can manage payments" ON public.payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_users
            WHERE organization_users.org_id = payments.org_id
            AND organization_users.user_id = auth.uid()
            AND organization_users.role IN ('owner', 'admin')
            AND organization_users.is_active = true
        )
    );

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_plans_updated_at ON public.plans;
CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Check if subscription is active
CREATE OR REPLACE FUNCTION public.is_subscription_active(sub_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sub RECORD;
BEGIN
    SELECT * INTO sub FROM public.subscriptions WHERE id = sub_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF sub.status != 'active' THEN
        RETURN false;
    END IF;

    IF sub.end_date IS NOT NULL AND sub.end_date < CURRENT_DATE THEN
        RETURN false;
    END IF;

    IF sub.sessions_total IS NOT NULL AND sub.sessions_used >= sub.sessions_total THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$;

-- Get member's active subscription
CREATE OR REPLACE FUNCTION public.get_member_active_subscription(m_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sub_id UUID;
BEGIN
    SELECT id INTO sub_id
    FROM public.subscriptions
    WHERE member_id = m_id
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    AND (sessions_total IS NULL OR sessions_used < sessions_total)
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN sub_id;
END;
$$;
