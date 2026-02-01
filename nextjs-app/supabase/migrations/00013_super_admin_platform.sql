-- =====================================================
-- SKALI PROG V3 - SUPER ADMIN & PLATFORM SYSTEM
-- Multi-tenant SaaS B2B2C
-- =====================================================
-- Date: 2026-02-01
-- Description: Super Admin, Platform fees, Multi-org members
-- =====================================================

-- =====================================================
-- 1. SUPER ADMIN SYSTEM
-- =====================================================

-- Add super_admin flag to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Index for super admin lookup
CREATE INDEX IF NOT EXISTS idx_profiles_super_admin
ON public.profiles(is_super_admin) WHERE is_super_admin = true;

-- Function to check if current user is super admin
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

-- =====================================================
-- 2. PLATFORM SUBSCRIPTION PLANS (for gyms)
-- =====================================================

-- Platform plan tiers
DO $$ BEGIN
    CREATE TYPE platform_plan_tier AS ENUM ('free_trial', 'basic', 'pro', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Platform subscription status
DO $$ BEGIN
    CREATE TYPE platform_subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'unpaid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Platform plans (what YOU sell to gyms)
CREATE TABLE IF NOT EXISTS public.platform_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    name TEXT NOT NULL,
    tier platform_plan_tier NOT NULL UNIQUE,
    description TEXT,

    -- Pricing
    price_monthly INTEGER NOT NULL, -- in cents (e.g., 2900 = 29.00 EUR)
    price_yearly INTEGER, -- optional yearly discount
    currency TEXT NOT NULL DEFAULT 'eur',

    -- Limits
    max_members INTEGER, -- null = unlimited
    max_staff INTEGER DEFAULT 5,
    max_classes_per_month INTEGER, -- null = unlimited

    -- Features included
    features JSONB DEFAULT '{
        "members": true,
        "subscriptions": true,
        "planning": true,
        "workouts": true,
        "tv_display": false,
        "teams": false,
        "discord": false,
        "workflows": false,
        "api_access": false,
        "white_label": false,
        "priority_support": false
    }'::jsonb,

    -- Stripe
    stripe_product_id TEXT,
    stripe_price_monthly_id TEXT,
    stripe_price_yearly_id TEXT,

    -- Platform fee on transactions (percentage)
    platform_fee_percent DECIMAL(5,2) DEFAULT 1.00, -- 1% default

    -- Meta
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default plans
-- Note: platform_fee_percent sur les plans n'est plus utilise
-- Le fee est maintenant base sur le country_code de l'organisation
INSERT INTO public.platform_plans (name, tier, description, price_monthly, price_yearly, max_members, max_staff, features, platform_fee_percent, sort_order)
VALUES
    ('Essai Gratuit', 'free_trial', '14 jours d''essai avec toutes les fonctionnalites', 0, NULL, 20, 2,
     '{"members": true, "subscriptions": true, "planning": true, "workouts": true, "tv_display": true, "teams": true, "discord": true, "workflows": true}'::jsonb,
     0.00, 0),
    ('Basic', 'basic', 'Pour les petites salles', 2900, 29000, 50, 3,
     '{"members": true, "subscriptions": true, "planning": true, "workouts": true, "tv_display": false, "teams": false, "discord": false, "workflows": false}'::jsonb,
     0.00, 1),
    ('Pro', 'pro', 'Pour les salles en croissance', 7900, 79000, 200, 10,
     '{"members": true, "subscriptions": true, "planning": true, "workouts": true, "tv_display": true, "teams": true, "discord": true, "workflows": true}'::jsonb,
     0.00, 2),
    ('Enterprise', 'enterprise', 'Pour les grandes structures', 14900, 149000, NULL, NULL,
     '{"members": true, "subscriptions": true, "planning": true, "workouts": true, "tv_display": true, "teams": true, "discord": true, "workflows": true, "api_access": true, "white_label": true, "priority_support": true}'::jsonb,
     0.00, 3)
ON CONFLICT (tier) DO NOTHING;

-- RLS for platform_plans
ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read plans
DROP POLICY IF EXISTS "Anyone can view platform plans" ON public.platform_plans;
CREATE POLICY "Anyone can view platform plans" ON public.platform_plans
    FOR SELECT USING (is_active = true);

-- Only super admin can manage plans
DROP POLICY IF EXISTS "Super admin can manage platform plans" ON public.platform_plans;
CREATE POLICY "Super admin can manage platform plans" ON public.platform_plans
    FOR ALL USING (is_super_admin());

-- =====================================================
-- 3. ORGANIZATION ENHANCEMENTS
-- =====================================================

-- Add platform subscription fields to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS platform_plan_id UUID REFERENCES public.platform_plans(id),
ADD COLUMN IF NOT EXISTS platform_subscription_status platform_subscription_status DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS platform_subscription_id TEXT, -- Stripe subscription ID
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
ADD COLUMN IF NOT EXISTS platform_subscription_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id), -- Super admin who created it
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES public.profiles(id), -- Primary owner
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'FR',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Paris';

-- Index for subscription status
CREATE INDEX IF NOT EXISTS idx_organizations_platform_status
ON public.organizations(platform_subscription_status);

-- Index for trial ending soon
CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends
ON public.organizations(trial_ends_at) WHERE platform_subscription_status = 'trialing';

-- Update RLS for super admin
DROP POLICY IF EXISTS "Super admin can view all orgs" ON public.organizations;
CREATE POLICY "Super admin can view all orgs" ON public.organizations
    FOR SELECT USING (is_super_admin());

DROP POLICY IF EXISTS "Super admin can manage all orgs" ON public.organizations;
CREATE POLICY "Super admin can manage all orgs" ON public.organizations
    FOR ALL USING (is_super_admin());

-- =====================================================
-- 4. MULTI-ORG MEMBER SYSTEM (Global Members)
-- =====================================================

-- Global member accounts (one per real person)
CREATE TABLE IF NOT EXISTS public.global_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Identity (source of truth)
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    birth_date DATE,
    gender gender_type,
    avatar_url TEXT,

    -- Verification
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,

    -- Preferences
    preferred_language TEXT DEFAULT 'fr',
    notification_preferences JSONB DEFAULT '{
        "email": true,
        "push": true,
        "sms": false
    }'::jsonb,

    -- Meta
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_global_members_email ON public.global_members(email);
CREATE INDEX IF NOT EXISTS idx_global_members_user ON public.global_members(user_id);

-- RLS for global_members
ALTER TABLE public.global_members ENABLE ROW LEVEL SECURITY;

-- Users can view their own global profile
DROP POLICY IF EXISTS "Users can view own global profile" ON public.global_members;
CREATE POLICY "Users can view own global profile" ON public.global_members
    FOR SELECT USING (user_id = auth.uid() OR is_super_admin());

-- Users can update their own global profile
DROP POLICY IF EXISTS "Users can update own global profile" ON public.global_members;
CREATE POLICY "Users can update own global profile" ON public.global_members
    FOR UPDATE USING (user_id = auth.uid());

-- Super admin can manage all
DROP POLICY IF EXISTS "Super admin can manage global members" ON public.global_members;
CREATE POLICY "Super admin can manage global members" ON public.global_members
    FOR ALL USING (is_super_admin());

-- =====================================================
-- 5. MEMBER-ORG LINKAGE (Membership per gym)
-- =====================================================

-- Link status
DO $$ BEGIN
    CREATE TYPE member_link_status AS ENUM ('pending', 'active', 'inactive', 'transferred');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Link between global member and organization
CREATE TABLE IF NOT EXISTS public.member_org_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    global_member_id UUID NOT NULL REFERENCES public.global_members(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    local_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL, -- Link to local copy

    -- Link info
    status member_link_status NOT NULL DEFAULT 'active',
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unlinked_at TIMESTAMPTZ,

    -- Transfer tracking
    transferred_from_org_id UUID REFERENCES public.organizations(id),
    transferred_at TIMESTAMPTZ,
    transfer_reason TEXT,

    -- Who initiated the link
    initiated_by TEXT NOT NULL DEFAULT 'member', -- 'member', 'gym', 'super_admin'

    -- Preferences for this gym
    receive_notifications BOOLEAN DEFAULT true,

    -- Meta
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(global_member_id, org_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_member_org_links_global ON public.member_org_links(global_member_id);
CREATE INDEX IF NOT EXISTS idx_member_org_links_org ON public.member_org_links(org_id);
CREATE INDEX IF NOT EXISTS idx_member_org_links_status ON public.member_org_links(status);

-- RLS for member_org_links
ALTER TABLE public.member_org_links ENABLE ROW LEVEL SECURITY;

-- Staff can see links for their org
DROP POLICY IF EXISTS "Staff can view org member links" ON public.member_org_links;
CREATE POLICY "Staff can view org member links" ON public.member_org_links
    FOR SELECT USING (is_org_staff(org_id));

-- Staff can manage links for their org
DROP POLICY IF EXISTS "Staff can manage org member links" ON public.member_org_links;
CREATE POLICY "Staff can manage org member links" ON public.member_org_links
    FOR ALL USING (is_org_staff(org_id));

-- Members can see their own links
DROP POLICY IF EXISTS "Members can view own links" ON public.member_org_links;
CREATE POLICY "Members can view own links" ON public.member_org_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.global_members gm
            WHERE gm.id = member_org_links.global_member_id
            AND gm.user_id = auth.uid()
        )
    );

-- Super admin can manage all
DROP POLICY IF EXISTS "Super admin can manage all links" ON public.member_org_links;
CREATE POLICY "Super admin can manage all links" ON public.member_org_links
    FOR ALL USING (is_super_admin());

-- =====================================================
-- 6. PLATFORM AUDIT LOG
-- =====================================================

-- Audit event types
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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Platform-level audit log
CREATE TABLE IF NOT EXISTS public.platform_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who
    actor_id UUID REFERENCES public.profiles(id),
    actor_email TEXT,
    actor_type TEXT NOT NULL DEFAULT 'user', -- 'user', 'system', 'webhook'

    -- What
    event_type platform_audit_event NOT NULL,

    -- Target
    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    target_type TEXT, -- 'organization', 'member', 'subscription', etc.
    target_id UUID,

    -- Details
    description TEXT,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Request info
    ip_address INET,
    user_agent TEXT,

    -- Meta
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_platform_audit_actor ON public.platform_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_org ON public.platform_audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_event ON public.platform_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON public.platform_audit_log(created_at DESC);

-- RLS for platform_audit_log
ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admin can view platform audit
DROP POLICY IF EXISTS "Super admin can view platform audit" ON public.platform_audit_log;
CREATE POLICY "Super admin can view platform audit" ON public.platform_audit_log
    FOR SELECT USING (is_super_admin());

-- System can insert (no auth check for inserts via service role)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.platform_audit_log;
CREATE POLICY "System can insert audit logs" ON public.platform_audit_log
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 7. ORGANIZATION INVITATIONS
-- =====================================================

-- Invitation status
DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Invitations table (for inviting owners/staff)
CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Invitee info
    email TEXT NOT NULL,
    role org_role NOT NULL DEFAULT 'staff',

    -- Token for accepting
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

    -- Status
    status invitation_status NOT NULL DEFAULT 'pending',

    -- Who invited
    invited_by UUID NOT NULL REFERENCES public.profiles(id),

    -- Timing
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,

    -- Meta
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON public.organization_invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.organization_invitations(status);

-- RLS for organization_invitations
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Staff can view invitations for their org
DROP POLICY IF EXISTS "Staff can view org invitations" ON public.organization_invitations;
CREATE POLICY "Staff can view org invitations" ON public.organization_invitations
    FOR SELECT USING (is_org_staff(org_id) OR is_super_admin());

-- Admins can manage invitations
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
    FOR SELECT USING (true); -- Token is verified in app logic

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Get organization's platform plan
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
    SELECT
        pp.name,
        pp.tier,
        pp.max_members,
        pp.features,
        pp.platform_fee_percent
    FROM public.organizations o
    LEFT JOIN public.platform_plans pp ON pp.id = o.platform_plan_id
    WHERE o.id = p_org_id;
END;
$$;

-- Check if org is within plan limits
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
    -- Get plan limits
    SELECT pp.max_members, pp.max_staff
    INTO v_max_members, v_max_staff
    FROM public.organizations o
    LEFT JOIN public.platform_plans pp ON pp.id = o.platform_plan_id
    WHERE o.id = p_org_id;

    -- Count current members
    SELECT COUNT(*)
    INTO v_current_members
    FROM public.members m
    WHERE m.org_id = p_org_id AND m.status = 'active';

    -- Count current staff
    SELECT COUNT(*)
    INTO v_current_staff
    FROM public.organization_users ou
    WHERE ou.org_id = p_org_id AND ou.is_active = true;

    -- Return results
    within_member_limit := v_max_members IS NULL OR v_current_members < v_max_members;
    current_members := v_current_members;
    max_members := v_max_members;
    within_staff_limit := v_max_staff IS NULL OR v_current_staff < v_max_staff;
    current_staff := v_current_staff;
    max_staff := v_max_staff;

    RETURN NEXT;
END;
$$;

-- Create a new organization with owner (for super admin)
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
    p_name TEXT,
    p_slug TEXT,
    p_owner_email TEXT,
    p_plan_tier platform_plan_tier DEFAULT 'free_trial',
    p_country_code TEXT DEFAULT 'FR',
    p_timezone TEXT DEFAULT 'Europe/Paris'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_plan_id UUID;
    v_super_admin_id UUID;
BEGIN
    -- Check if caller is super admin
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Only super admin can create organizations';
    END IF;

    -- Get super admin id
    v_super_admin_id := auth.uid();

    -- Get plan id
    SELECT id INTO v_plan_id FROM public.platform_plans WHERE tier = p_plan_tier;

    -- Create organization
    INSERT INTO public.organizations (
        name,
        slug,
        platform_plan_id,
        platform_subscription_status,
        trial_ends_at,
        created_by,
        billing_email,
        country_code,
        timezone
    )
    VALUES (
        p_name,
        p_slug,
        v_plan_id,
        'trialing',
        NOW() + INTERVAL '14 days',
        v_super_admin_id,
        p_owner_email,
        p_country_code,
        p_timezone
    )
    RETURNING id INTO v_org_id;

    -- Log the creation
    INSERT INTO public.platform_audit_log (
        actor_id,
        actor_type,
        event_type,
        org_id,
        target_type,
        target_id,
        description,
        new_values
    )
    VALUES (
        v_super_admin_id,
        'user',
        'org_created',
        v_org_id,
        'organization',
        v_org_id,
        'Organization created by super admin',
        jsonb_build_object(
            'name', p_name,
            'slug', p_slug,
            'owner_email', p_owner_email,
            'plan', p_plan_tier
        )
    );

    RETURN v_org_id;
END;
$$;

-- Link member to organization (copy data)
CREATE OR REPLACE FUNCTION public.link_member_to_org(
    p_global_member_id UUID,
    p_org_id UUID,
    p_copy_data BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_link_id UUID;
    v_local_member_id UUID;
    v_global_member RECORD;
BEGIN
    -- Check if link already exists
    IF EXISTS (
        SELECT 1 FROM public.member_org_links
        WHERE global_member_id = p_global_member_id
        AND org_id = p_org_id
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Member is already linked to this organization';
    END IF;

    -- Get global member data
    SELECT * INTO v_global_member
    FROM public.global_members
    WHERE id = p_global_member_id;

    -- Create local member copy if requested
    IF p_copy_data THEN
        INSERT INTO public.members (
            org_id,
            user_id,
            first_name,
            last_name,
            email,
            phone,
            birth_date,
            gender,
            avatar_url,
            status
        )
        VALUES (
            p_org_id,
            v_global_member.user_id,
            v_global_member.first_name,
            v_global_member.last_name,
            v_global_member.email,
            v_global_member.phone,
            v_global_member.birth_date,
            v_global_member.gender,
            v_global_member.avatar_url,
            'active'
        )
        RETURNING id INTO v_local_member_id;
    END IF;

    -- Create link
    INSERT INTO public.member_org_links (
        global_member_id,
        org_id,
        local_member_id,
        status,
        initiated_by
    )
    VALUES (
        p_global_member_id,
        p_org_id,
        v_local_member_id,
        'active',
        CASE WHEN is_super_admin() THEN 'super_admin'
             WHEN is_org_staff(p_org_id) THEN 'gym'
             ELSE 'member'
        END
    )
    RETURNING id INTO v_link_id;

    -- Log the link
    INSERT INTO public.platform_audit_log (
        actor_id,
        event_type,
        org_id,
        target_type,
        target_id,
        description
    )
    VALUES (
        auth.uid(),
        'member_linked',
        p_org_id,
        'member',
        p_global_member_id,
        'Member linked to organization'
    );

    RETURN v_link_id;
END;
$$;

-- Transfer member between organizations
CREATE OR REPLACE FUNCTION public.transfer_member(
    p_global_member_id UUID,
    p_from_org_id UUID,
    p_to_org_id UUID,
    p_copy_history BOOLEAN DEFAULT true,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_link_id UUID;
    v_old_link RECORD;
    v_old_member RECORD;
    v_new_member_id UUID;
BEGIN
    -- Get old link
    SELECT * INTO v_old_link
    FROM public.member_org_links
    WHERE global_member_id = p_global_member_id
    AND org_id = p_from_org_id
    AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Member is not linked to source organization';
    END IF;

    -- Get old member data
    SELECT * INTO v_old_member
    FROM public.members
    WHERE id = v_old_link.local_member_id;

    -- Mark old link as transferred
    UPDATE public.member_org_links
    SET status = 'transferred',
        unlinked_at = NOW()
    WHERE id = v_old_link.id;

    -- Create new member in destination org
    INSERT INTO public.members (
        org_id,
        user_id,
        member_number,
        first_name,
        last_name,
        email,
        phone,
        birth_date,
        gender,
        avatar_url,
        emergency_contact,
        medical_info,
        status
    )
    VALUES (
        p_to_org_id,
        v_old_member.user_id,
        NULL, -- New gym will assign their own number
        v_old_member.first_name,
        v_old_member.last_name,
        v_old_member.email,
        v_old_member.phone,
        v_old_member.birth_date,
        v_old_member.gender,
        v_old_member.avatar_url,
        v_old_member.emergency_contact,
        v_old_member.medical_info,
        'active'
    )
    RETURNING id INTO v_new_member_id;

    -- Create new link
    INSERT INTO public.member_org_links (
        global_member_id,
        org_id,
        local_member_id,
        status,
        transferred_from_org_id,
        transferred_at,
        transfer_reason,
        initiated_by
    )
    VALUES (
        p_global_member_id,
        p_to_org_id,
        v_new_member_id,
        'active',
        p_from_org_id,
        NOW(),
        p_reason,
        CASE WHEN is_super_admin() THEN 'super_admin'
             WHEN is_org_staff(p_to_org_id) THEN 'gym'
             ELSE 'member'
        END
    )
    RETURNING id INTO v_new_link_id;

    -- Copy workout scores if requested
    IF p_copy_history THEN
        INSERT INTO public.workout_scores (
            org_id,
            workout_id,
            member_id,
            score_type,
            score_value,
            rx,
            notes,
            created_at
        )
        SELECT
            p_to_org_id,
            ws.workout_id,
            v_new_member_id,
            ws.score_type,
            ws.score_value,
            ws.rx,
            ws.notes || ' (transferred from previous gym)',
            ws.created_at
        FROM public.workout_scores ws
        WHERE ws.member_id = v_old_link.local_member_id;

        -- Copy personal records
        INSERT INTO public.personal_records (
            org_id,
            member_id,
            exercise_name,
            pr_type,
            value,
            unit,
            achieved_at,
            notes
        )
        SELECT
            p_to_org_id,
            v_new_member_id,
            pr.exercise_name,
            pr.pr_type,
            pr.value,
            pr.unit,
            pr.achieved_at,
            pr.notes || ' (transferred)'
        FROM public.personal_records pr
        WHERE pr.member_id = v_old_link.local_member_id;
    END IF;

    -- Log the transfer
    INSERT INTO public.platform_audit_log (
        actor_id,
        event_type,
        org_id,
        target_type,
        target_id,
        description,
        metadata
    )
    VALUES (
        auth.uid(),
        'member_transferred',
        p_to_org_id,
        'member',
        p_global_member_id,
        'Member transferred between organizations',
        jsonb_build_object(
            'from_org_id', p_from_org_id,
            'to_org_id', p_to_org_id,
            'copied_history', p_copy_history,
            'reason', p_reason
        )
    );

    RETURN v_new_link_id;
END;
$$;

-- =====================================================
-- 9. TRIGGERS
-- =====================================================

-- Update updated_at for new tables
DROP TRIGGER IF EXISTS update_platform_plans_updated_at ON public.platform_plans;
CREATE TRIGGER update_platform_plans_updated_at
    BEFORE UPDATE ON public.platform_plans
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
-- 10. VIEWS FOR ADMIN DASHBOARD
-- =====================================================

-- Organizations overview
CREATE OR REPLACE VIEW public.v_platform_organizations AS
SELECT
    o.id,
    o.name,
    o.slug,
    o.logo_url,
    o.is_active,
    o.platform_subscription_status,
    o.trial_ends_at,
    o.country_code,
    o.timezone,
    o.created_at,
    pp.name as plan_name,
    pp.tier as plan_tier,
    pp.price_monthly as plan_price,
    (SELECT COUNT(*) FROM public.members m WHERE m.org_id = o.id AND m.status = 'active') as member_count,
    (SELECT COUNT(*) FROM public.organization_users ou WHERE ou.org_id = o.id AND ou.is_active = true) as staff_count,
    (SELECT p.email FROM public.profiles p WHERE p.id = o.owner_user_id) as owner_email
FROM public.organizations o
LEFT JOIN public.platform_plans pp ON pp.id = o.platform_plan_id;

-- Platform stats
CREATE OR REPLACE VIEW public.v_platform_stats AS
SELECT
    (SELECT COUNT(*) FROM public.organizations WHERE is_active = true) as total_orgs,
    (SELECT COUNT(*) FROM public.organizations WHERE platform_subscription_status = 'active') as active_subscriptions,
    (SELECT COUNT(*) FROM public.organizations WHERE platform_subscription_status = 'trialing') as trials,
    (SELECT COUNT(*) FROM public.members WHERE status = 'active') as total_members,
    (SELECT COUNT(*) FROM public.global_members) as global_members,
    (SELECT SUM(pp.price_monthly) FROM public.organizations o
     JOIN public.platform_plans pp ON pp.id = o.platform_plan_id
     WHERE o.platform_subscription_status = 'active') as mrr_cents;
