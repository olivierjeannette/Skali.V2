-- =====================================================
-- SKALI PROG V3 - STRIPE CONNECT INTEGRATION
-- Multi-tenant SaaS payments with Stripe Connect
-- =====================================================
-- Date: 2026-02-01
-- Model: Hybrid (Platform subscription + % on transactions)
-- =====================================================

-- =====================================================
-- 1. EXTEND ORGANIZATIONS TABLE
-- =====================================================

-- Add Stripe Connect fields to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS platform_subscription_status TEXT DEFAULT 'trialing', -- trialing, active, past_due, cancelled
ADD COLUMN IF NOT EXISTS platform_subscription_id TEXT, -- Stripe subscription for platform fee
ADD COLUMN IF NOT EXISTS platform_fee_percent DECIMAL(5,2) DEFAULT 2.5, -- Default 2.5% on transactions
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_account
ON public.organizations(stripe_account_id);

-- =====================================================
-- 2. EXTEND PLANS TABLE
-- =====================================================

-- Add Stripe product/price IDs to plans
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_type TEXT DEFAULT 'one_time'; -- one_time, recurring

-- Index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_plans_stripe_product
ON public.plans(stripe_product_id);

-- =====================================================
-- 3. CHECKOUT SESSIONS TABLE
-- =====================================================

-- Track checkout sessions for reconciliation
CREATE TABLE IF NOT EXISTS public.checkout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,

    -- Stripe IDs
    stripe_session_id TEXT UNIQUE NOT NULL,
    stripe_payment_intent_id TEXT,
    stripe_customer_id TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- pending, complete, expired, cancelled

    -- Amounts (in cents)
    amount_subtotal INTEGER,
    amount_total INTEGER,
    currency TEXT DEFAULT 'eur',

    -- Platform fees
    application_fee_amount INTEGER, -- Platform fee in cents

    -- URLs
    success_url TEXT,
    cancel_url TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_org ON public.checkout_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_member ON public.checkout_sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_stripe ON public.checkout_sessions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status ON public.checkout_sessions(status);

-- RLS
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view checkout sessions" ON public.checkout_sessions;
CREATE POLICY "Staff can view checkout sessions" ON public.checkout_sessions
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can manage checkout sessions" ON public.checkout_sessions;
CREATE POLICY "Staff can manage checkout sessions" ON public.checkout_sessions
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- 4. STRIPE EVENTS TABLE (Webhook Idempotency)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.stripe_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    processed BOOLEAN DEFAULT false,
    error TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_id ON public.stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON public.stripe_events(event_type);

-- No RLS needed - only accessed by webhooks

-- =====================================================
-- 5. PLATFORM SUBSCRIPTIONS TABLE
-- =====================================================

-- Track gym subscriptions to the platform itself
CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Plan info
    plan_name TEXT NOT NULL, -- 'starter', 'pro', 'enterprise'
    price_monthly DECIMAL(10,2) NOT NULL,

    -- Stripe IDs
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    stripe_price_id TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'trialing', -- trialing, active, past_due, cancelled, paused

    -- Dates
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    -- Features included
    features JSONB DEFAULT '{
        "max_members": 100,
        "max_staff": 3,
        "tv_displays": 1,
        "api_access": false,
        "custom_domain": false,
        "priority_support": false
    }'::jsonb,

    -- Meta
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_platform_subs_org ON public.platform_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_platform_subs_stripe ON public.platform_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_platform_subs_status ON public.platform_subscriptions(status);

-- RLS
ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view platform subscription" ON public.platform_subscriptions;
CREATE POLICY "Owners can view platform subscription" ON public.platform_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_users
            WHERE organization_users.org_id = platform_subscriptions.org_id
            AND organization_users.user_id = auth.uid()
            AND organization_users.role = 'owner'
            AND organization_users.is_active = true
        )
    );

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_checkout_sessions_updated_at ON public.checkout_sessions;
CREATE TRIGGER update_checkout_sessions_updated_at
    BEFORE UPDATE ON public.checkout_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_subscriptions_updated_at ON public.platform_subscriptions;
CREATE TRIGGER update_platform_subscriptions_updated_at
    BEFORE UPDATE ON public.platform_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Check if org can accept payments
CREATE OR REPLACE FUNCTION public.can_accept_payments(org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org RECORD;
BEGIN
    SELECT * INTO org FROM public.organizations WHERE id = org_uuid;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Must have completed Stripe onboarding
    IF org.stripe_account_id IS NULL THEN
        RETURN false;
    END IF;

    IF NOT org.stripe_charges_enabled THEN
        RETURN false;
    END IF;

    -- Platform subscription must be active or trialing
    IF org.platform_subscription_status NOT IN ('active', 'trialing') THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$;

-- Calculate platform fee for a transaction
CREATE OR REPLACE FUNCTION public.calculate_platform_fee(org_uuid UUID, amount_cents INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    fee_percent DECIMAL(5,2);
BEGIN
    SELECT COALESCE(platform_fee_percent, 2.5) INTO fee_percent
    FROM public.organizations WHERE id = org_uuid;

    -- Return fee in cents (rounded up)
    RETURN CEIL(amount_cents * fee_percent / 100);
END;
$$;

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON TABLE public.checkout_sessions IS 'Tracks Stripe Checkout sessions for member payments';
COMMENT ON TABLE public.stripe_events IS 'Webhook event idempotency tracking';
COMMENT ON TABLE public.platform_subscriptions IS 'Gym subscriptions to Skali Prog platform';
COMMENT ON COLUMN public.organizations.stripe_account_id IS 'Stripe Connect account ID for this gym';
COMMENT ON COLUMN public.organizations.platform_fee_percent IS 'Platform fee percentage on member transactions';
