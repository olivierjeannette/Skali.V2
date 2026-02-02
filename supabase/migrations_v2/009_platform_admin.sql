-- =====================================================
-- SKALI PROG V3 - PLATFORM ADMIN
-- Migration 009: Super admin, platform plans, billing
-- =====================================================
-- Requires: 001_base_schema.sql
-- =====================================================

-- =====================================================
-- 1. ENUMS
-- =====================================================

DO $$ BEGIN
    CREATE TYPE platform_plan_tier AS ENUM ('free_trial', 'basic', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE platform_audit_event AS ENUM (
        'org_created', 'org_updated', 'org_deleted', 'org_suspended', 'org_activated',
        'owner_invited', 'owner_changed', 'staff_added', 'staff_removed',
        'plan_changed', 'subscription_created', 'subscription_canceled',
        'payment_received', 'payment_failed',
        'member_linked', 'member_unlinked', 'member_transferred',
        'super_admin_login', 'super_admin_impersonate',
        'settings_changed', 'feature_toggled'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE member_link_status AS ENUM ('pending', 'active', 'inactive', 'transferred');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. PLATFORM PLANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.platform_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,
    tier platform_plan_tier NOT NULL UNIQUE,
    description TEXT,

    price_monthly INTEGER NOT NULL,
    price_yearly INTEGER,
    currency TEXT NOT NULL DEFAULT 'eur',

    max_members INTEGER,
    max_staff INTEGER DEFAULT 5,
    max_classes_per_month INTEGER,

    features JSONB DEFAULT '{
        "members": true, "subscriptions": true, "planning": true, "workouts": true,
        "tv_display": false, "teams": false, "discord": false, "workflows": false,
        "api_access": false, "white_label": false, "priority_support": false
    }'::jsonb,

    stripe_product_id TEXT,
    stripe_price_monthly_id TEXT,
    stripe_price_yearly_id TEXT,

    platform_fee_percent DECIMAL(5,2) DEFAULT 1.00,

    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view platform plans" ON public.platform_plans;
CREATE POLICY "Anyone can view platform plans" ON public.platform_plans
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Super admin can manage platform plans" ON public.platform_plans;
CREATE POLICY "Super admin can manage platform plans" ON public.platform_plans
    FOR ALL USING (is_super_admin());

-- Add FK from organizations to platform_plans (if not exists)
DO $$ BEGIN
    ALTER TABLE public.organizations
    ADD CONSTRAINT fk_organizations_platform_plan
    FOREIGN KEY (platform_plan_id) REFERENCES public.platform_plans(id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Seed default plans
INSERT INTO public.platform_plans (name, tier, description, price_monthly, price_yearly, max_members, max_staff, features, sort_order)
VALUES
    ('Essai Gratuit', 'free_trial', '14 jours d''essai avec toutes les fonctionnalités', 0, NULL, 20, 2,
     '{"members": true, "subscriptions": true, "planning": true, "workouts": true, "tv_display": true, "teams": true, "discord": true, "workflows": true}'::jsonb, 0),
    ('Basic', 'basic', 'Pour les petites salles', 2900, 29000, 50, 3,
     '{"members": true, "subscriptions": true, "planning": true, "workouts": true, "tv_display": false, "teams": false, "discord": false, "workflows": false}'::jsonb, 1),
    ('Pro', 'pro', 'Pour les salles en croissance', 7900, 79000, 200, 10,
     '{"members": true, "subscriptions": true, "planning": true, "workouts": true, "tv_display": true, "teams": true, "discord": true, "workflows": true}'::jsonb, 2),
    ('Enterprise', 'enterprise', 'Pour les grandes structures', 14900, 149000, NULL, NULL,
     '{"members": true, "subscriptions": true, "planning": true, "workouts": true, "tv_display": true, "teams": true, "discord": true, "workflows": true, "api_access": true, "white_label": true, "priority_support": true}'::jsonb, 3)
ON CONFLICT (tier) DO NOTHING;

-- =====================================================
-- 3. PLATFORM COUPONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.platform_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,

    stripe_coupon_id TEXT UNIQUE,
    stripe_promotion_code_id TEXT,

    discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed_amount')),
    discount_percent NUMERIC(5,2),
    discount_amount_cents INTEGER,
    currency TEXT DEFAULT 'eur',

    duration TEXT NOT NULL DEFAULT 'once' CHECK (duration IN ('once', 'repeating', 'forever')),
    duration_in_months INTEGER,

    max_redemptions INTEGER,
    redemption_count INTEGER DEFAULT 0,
    applies_to_plans UUID[],
    first_time_only BOOLEAN DEFAULT false,
    minimum_amount_cents INTEGER,

    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,

    created_by UUID REFERENCES public.profiles(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_coupons_code ON public.platform_coupons(code);
CREATE INDEX IF NOT EXISTS idx_platform_coupons_active ON public.platform_coupons(is_active, valid_from, valid_until);

ALTER TABLE public.platform_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin full access coupons" ON public.platform_coupons;
CREATE POLICY "Super admin full access coupons" ON public.platform_coupons
    FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.platform_coupons;
CREATE POLICY "Anyone can read active coupons" ON public.platform_coupons
    FOR SELECT USING (is_active = true);

-- =====================================================
-- 4. PLATFORM SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.platform_plans(id),

    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    stripe_price_id TEXT,

    status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')),

    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,

    billing_cycle_anchor TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,

    coupon_id UUID REFERENCES public.platform_coupons(id),
    discount_percent NUMERIC(5,2),
    discount_amount_cents INTEGER,

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_org ON public.platform_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_stripe ON public.platform_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_status ON public.platform_subscriptions(status);

ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin full access subscriptions" ON public.platform_subscriptions;
CREATE POLICY "Super admin full access subscriptions" ON public.platform_subscriptions
    FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Org owners view subscriptions" ON public.platform_subscriptions;
CREATE POLICY "Org owners view subscriptions" ON public.platform_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.org_id = platform_subscriptions.org_id
            AND ou.user_id = auth.uid()
            AND ou.role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- 5. COUPON REDEMPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.platform_coupons(id),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.platform_subscriptions(id),

    discount_applied_cents INTEGER NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(coupon_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_org ON public.coupon_redemptions(org_id);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin full access redemptions" ON public.coupon_redemptions;
CREATE POLICY "Super admin full access redemptions" ON public.coupon_redemptions
    FOR ALL USING (is_super_admin());

-- =====================================================
-- 6. PLATFORM INVOICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.platform_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.platform_subscriptions(id),

    stripe_invoice_id TEXT UNIQUE,
    stripe_payment_intent_id TEXT,
    stripe_hosted_invoice_url TEXT,
    stripe_invoice_pdf TEXT,

    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),

    subtotal_cents INTEGER NOT NULL DEFAULT 0,
    discount_cents INTEGER DEFAULT 0,
    tax_cents INTEGER DEFAULT 0,
    total_cents INTEGER NOT NULL DEFAULT 0,
    amount_paid_cents INTEGER DEFAULT 0,
    amount_due_cents INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'eur',

    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,

    description TEXT,
    invoice_number TEXT,

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_invoices_org ON public.platform_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_stripe ON public.platform_invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_status ON public.platform_invoices(status);

ALTER TABLE public.platform_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin full access invoices" ON public.platform_invoices;
CREATE POLICY "Super admin full access invoices" ON public.platform_invoices
    FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Org owners view invoices" ON public.platform_invoices;
CREATE POLICY "Org owners view invoices" ON public.platform_invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.org_id = platform_invoices.org_id
            AND ou.user_id = auth.uid()
            AND ou.role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- 7. BILLING CONTACTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.billing_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,

    email TEXT NOT NULL,
    name TEXT,
    phone TEXT,

    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'FR',

    vat_number TEXT,
    company_name TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.billing_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin full access billing contacts" ON public.billing_contacts;
CREATE POLICY "Super admin full access billing contacts" ON public.billing_contacts
    FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Org owners manage billing contacts" ON public.billing_contacts;
CREATE POLICY "Org owners manage billing contacts" ON public.billing_contacts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.org_id = billing_contacts.org_id
            AND ou.user_id = auth.uid()
            AND ou.role = 'owner'
        )
    );

-- =====================================================
-- 8. PLATFORM AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS public.platform_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    actor_id UUID REFERENCES public.profiles(id),
    actor_email TEXT,
    actor_type TEXT NOT NULL DEFAULT 'user',

    event_type platform_audit_event NOT NULL,

    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    target_type TEXT,
    target_id UUID,

    description TEXT,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,

    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_actor ON public.platform_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_org ON public.platform_audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_event ON public.platform_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON public.platform_audit_log(created_at DESC);

ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin can view platform audit" ON public.platform_audit_log;
CREATE POLICY "Super admin can view platform audit" ON public.platform_audit_log
    FOR SELECT USING (is_super_admin());

DROP POLICY IF EXISTS "System can insert audit logs" ON public.platform_audit_log;
CREATE POLICY "System can insert audit logs" ON public.platform_audit_log
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 9. ORGANIZATION INVITATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

    email TEXT NOT NULL,
    role org_role NOT NULL DEFAULT 'staff',

    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

    status invitation_status NOT NULL DEFAULT 'pending',

    invited_by UUID NOT NULL REFERENCES public.profiles(id),

    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON public.organization_invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.organization_invitations(status);

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view org invitations" ON public.organization_invitations;
CREATE POLICY "Staff can view org invitations" ON public.organization_invitations
    FOR SELECT USING (is_org_staff(org_id) OR is_super_admin());

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.organization_invitations;
CREATE POLICY "Admins can manage invitations" ON public.organization_invitations
    FOR ALL USING (
        is_super_admin() OR
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.org_id = organization_invitations.org_id
            AND ou.user_id = auth.uid()
            AND ou.role IN ('owner', 'admin')
            AND ou.is_active = true
        )
    );

-- Anyone can view by token (for accepting)
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.organization_invitations;
CREATE POLICY "Anyone can view invitation by token" ON public.organization_invitations
    FOR SELECT USING (true);

-- =====================================================
-- 10. GLOBAL MEMBERS (Multi-org)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.global_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    birth_date DATE,
    gender gender_type,
    avatar_url TEXT,

    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,

    preferred_language TEXT DEFAULT 'fr',
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_members_email ON public.global_members(email);
CREATE INDEX IF NOT EXISTS idx_global_members_user ON public.global_members(user_id);

ALTER TABLE public.global_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own global profile" ON public.global_members;
CREATE POLICY "Users can view own global profile" ON public.global_members
    FOR SELECT USING (user_id = auth.uid() OR is_super_admin());

DROP POLICY IF EXISTS "Users can update own global profile" ON public.global_members;
CREATE POLICY "Users can update own global profile" ON public.global_members
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admin can manage global members" ON public.global_members;
CREATE POLICY "Super admin can manage global members" ON public.global_members
    FOR ALL USING (is_super_admin());

-- =====================================================
-- 11. MEMBER-ORG LINKS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.member_org_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    global_member_id UUID NOT NULL REFERENCES public.global_members(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    local_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,

    status member_link_status NOT NULL DEFAULT 'active',
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unlinked_at TIMESTAMPTZ,

    transferred_from_org_id UUID REFERENCES public.organizations(id),
    transferred_at TIMESTAMPTZ,
    transfer_reason TEXT,

    initiated_by TEXT NOT NULL DEFAULT 'member',

    receive_notifications BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(global_member_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_member_org_links_global ON public.member_org_links(global_member_id);
CREATE INDEX IF NOT EXISTS idx_member_org_links_org ON public.member_org_links(org_id);
CREATE INDEX IF NOT EXISTS idx_member_org_links_status ON public.member_org_links(status);

ALTER TABLE public.member_org_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view org member links" ON public.member_org_links;
CREATE POLICY "Staff can view org member links" ON public.member_org_links
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can manage org member links" ON public.member_org_links;
CREATE POLICY "Staff can manage org member links" ON public.member_org_links
    FOR ALL USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Members can view own links" ON public.member_org_links;
CREATE POLICY "Members can view own links" ON public.member_org_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.global_members gm
            WHERE gm.id = member_org_links.global_member_id
            AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Super admin can manage all links" ON public.member_org_links;
CREATE POLICY "Super admin can manage all links" ON public.member_org_links
    FOR ALL USING (is_super_admin());

-- =====================================================
-- 12. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_platform_plans_updated_at ON public.platform_plans;
CREATE TRIGGER update_platform_plans_updated_at
    BEFORE UPDATE ON public.platform_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_coupons_updated_at ON public.platform_coupons;
CREATE TRIGGER update_platform_coupons_updated_at
    BEFORE UPDATE ON public.platform_coupons
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_subscriptions_updated_at ON public.platform_subscriptions;
CREATE TRIGGER update_platform_subscriptions_updated_at
    BEFORE UPDATE ON public.platform_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_invoices_updated_at ON public.platform_invoices;
CREATE TRIGGER update_platform_invoices_updated_at
    BEFORE UPDATE ON public.platform_invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_billing_contacts_updated_at ON public.billing_contacts;
CREATE TRIGGER update_billing_contacts_updated_at
    BEFORE UPDATE ON public.billing_contacts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_global_members_updated_at ON public.global_members;
CREATE TRIGGER update_global_members_updated_at
    BEFORE UPDATE ON public.global_members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_member_org_links_updated_at ON public.member_org_links;
CREATE TRIGGER update_member_org_links_updated_at
    BEFORE UPDATE ON public.member_org_links
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 13. HELPER FUNCTIONS
-- =====================================================

-- Validate coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(
    p_code TEXT,
    p_org_id UUID,
    p_plan_id UUID DEFAULT NULL
) RETURNS TABLE (
    is_valid BOOLEAN,
    coupon_id UUID,
    discount_type TEXT,
    discount_percent NUMERIC,
    discount_amount_cents INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_coupon RECORD;
    v_already_used BOOLEAN;
BEGIN
    SELECT * INTO v_coupon FROM public.platform_coupons WHERE code = UPPER(p_code) AND is_active = true;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER, 'Code promo invalide';
        RETURN;
    END IF;

    IF v_coupon.valid_from > NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER, 'Code promo pas encore actif';
        RETURN;
    END IF;

    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER, 'Code promo expiré';
        RETURN;
    END IF;

    IF v_coupon.max_redemptions IS NOT NULL AND v_coupon.redemption_count >= v_coupon.max_redemptions THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER, 'Code promo épuisé';
        RETURN;
    END IF;

    SELECT EXISTS(SELECT 1 FROM public.coupon_redemptions WHERE coupon_id = v_coupon.id AND org_id = p_org_id) INTO v_already_used;

    IF v_already_used THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER, 'Code déjà utilisé';
        RETURN;
    END IF;

    RETURN QUERY SELECT true, v_coupon.id, v_coupon.discount_type, v_coupon.discount_percent, v_coupon.discount_amount_cents, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get org plan
CREATE OR REPLACE FUNCTION public.get_org_plan(p_org_id UUID)
RETURNS TABLE (
    plan_name TEXT,
    tier platform_plan_tier,
    max_members INTEGER,
    features JSONB,
    platform_fee_percent DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT pp.name, pp.tier, pp.max_members, pp.features, pp.platform_fee_percent
    FROM public.organizations o
    LEFT JOIN public.platform_plans pp ON pp.id = o.platform_plan_id
    WHERE o.id = p_org_id;
END;
$$;

-- Check org limits
CREATE OR REPLACE FUNCTION public.check_org_limits(p_org_id UUID)
RETURNS TABLE (
    within_member_limit BOOLEAN,
    current_members INTEGER,
    max_members INTEGER,
    within_staff_limit BOOLEAN,
    current_staff INTEGER,
    max_staff INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_max_members INTEGER;
    v_max_staff INTEGER;
    v_current_members INTEGER;
    v_current_staff INTEGER;
BEGIN
    SELECT pp.max_members, pp.max_staff INTO v_max_members, v_max_staff
    FROM public.organizations o
    LEFT JOIN public.platform_plans pp ON pp.id = o.platform_plan_id
    WHERE o.id = p_org_id;

    SELECT COUNT(*) INTO v_current_members FROM public.members m WHERE m.org_id = p_org_id AND m.status = 'active';
    SELECT COUNT(*) INTO v_current_staff FROM public.organization_users ou WHERE ou.org_id = p_org_id AND ou.is_active = true;

    within_member_limit := v_max_members IS NULL OR v_current_members < v_max_members;
    current_members := v_current_members;
    max_members := v_max_members;
    within_staff_limit := v_max_staff IS NULL OR v_current_staff < v_max_staff;
    current_staff := v_current_staff;
    max_staff := v_max_staff;

    RETURN NEXT;
END;
$$;

-- =====================================================
-- 14. VIEWS
-- =====================================================

CREATE OR REPLACE VIEW public.v_platform_organizations AS
SELECT
    o.id, o.name, o.slug, o.logo_url, o.is_active,
    o.platform_subscription_status, o.trial_ends_at, o.country_code, o.timezone, o.created_at,
    pp.name as plan_name, pp.tier as plan_tier, pp.price_monthly as plan_price,
    (SELECT COUNT(*) FROM public.members m WHERE m.org_id = o.id AND m.status = 'active') as member_count,
    (SELECT COUNT(*) FROM public.organization_users ou WHERE ou.org_id = o.id AND ou.is_active = true) as staff_count,
    (SELECT p.email FROM public.profiles p WHERE p.id = o.owner_user_id) as owner_email
FROM public.organizations o
LEFT JOIN public.platform_plans pp ON pp.id = o.platform_plan_id;

CREATE OR REPLACE VIEW public.v_platform_stats AS
SELECT
    (SELECT COUNT(*) FROM public.organizations WHERE is_active = true) as total_orgs,
    (SELECT COUNT(*) FROM public.organizations WHERE platform_subscription_status = 'active') as active_subscriptions,
    (SELECT COUNT(*) FROM public.organizations WHERE platform_subscription_status = 'trialing') as trials,
    (SELECT COUNT(*) FROM public.members WHERE status = 'active') as total_members,
    (SELECT COUNT(*) FROM public.global_members) as global_members,
    (SELECT COALESCE(SUM(pp.price_monthly), 0) FROM public.organizations o
     JOIN public.platform_plans pp ON pp.id = o.platform_plan_id
     WHERE o.platform_subscription_status = 'active') as mrr_cents;
