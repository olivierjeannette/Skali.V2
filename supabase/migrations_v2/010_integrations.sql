-- =====================================================
-- SKALI PROG V3 - INTEGRATIONS
-- Migration 010: Discord, RGPD, Stripe Connect extras
-- =====================================================
-- Requires: 001_base_schema.sql, 005_workouts.sql
-- =====================================================

-- =====================================================
-- PART 1: DISCORD INTEGRATION
-- =====================================================

-- 1.1 ENUMS
DO $$ BEGIN
    CREATE TYPE discord_message_type AS ENUM ('wod', 'welcome', 'class_reminder', 'subscription_alert', 'achievement', 'announcement', 'custom');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE discord_message_status AS ENUM ('pending', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 1.2 DISCORD CONFIG TABLE
CREATE TABLE IF NOT EXISTS public.discord_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,

    webhook_url TEXT,
    wod_channel_webhook TEXT,

    guild_id TEXT,
    bot_channel_id TEXT,

    auto_post_wod BOOLEAN DEFAULT false,
    post_wod_time TIME DEFAULT '06:00:00',
    post_wod_days TEXT[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday'],

    notification_types JSONB DEFAULT '{
        "welcome": true, "class_reminder": false, "subscription_alert": false,
        "achievement": true, "announcement": true
    }'::jsonb,

    is_active BOOLEAN DEFAULT true,
    last_wod_posted_at TIMESTAMPTZ,
    last_wod_workout_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discord_config_org ON public.discord_config(org_id);
CREATE INDEX IF NOT EXISTS idx_discord_config_active ON public.discord_config(is_active) WHERE is_active = true;

ALTER TABLE public.discord_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view their org discord config" ON public.discord_config;
CREATE POLICY "Staff can view their org discord config" ON public.discord_config
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Admins can manage their org discord config" ON public.discord_config;
CREATE POLICY "Admins can manage their org discord config" ON public.discord_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.org_id = discord_config.org_id
            AND ou.user_id = auth.uid()
            AND ou.role IN ('owner', 'admin')
            AND ou.is_active = true
        )
    );

-- 1.3 DISCORD LOGS TABLE
CREATE TABLE IF NOT EXISTS public.discord_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,

    message_type discord_message_type NOT NULL,
    webhook_url TEXT NOT NULL,
    content TEXT,
    embed_data JSONB,

    status discord_message_status NOT NULL DEFAULT 'pending',
    discord_message_id TEXT,
    error_message TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_discord_logs_org ON public.discord_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_discord_logs_status ON public.discord_logs(status);
CREATE INDEX IF NOT EXISTS idx_discord_logs_type ON public.discord_logs(message_type);
CREATE INDEX IF NOT EXISTS idx_discord_logs_created ON public.discord_logs(created_at DESC);

ALTER TABLE public.discord_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view their org discord logs" ON public.discord_logs;
CREATE POLICY "Staff can view their org discord logs" ON public.discord_logs
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can insert discord logs" ON public.discord_logs;
CREATE POLICY "Staff can insert discord logs" ON public.discord_logs
    FOR INSERT WITH CHECK (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can update their org discord logs" ON public.discord_logs;
CREATE POLICY "Staff can update their org discord logs" ON public.discord_logs
    FOR UPDATE USING (is_org_staff(org_id));

-- =====================================================
-- PART 2: RGPD COMPLIANCE
-- =====================================================

-- 2.1 ENUMS
DO $$ BEGIN
    CREATE TYPE consent_type AS ENUM (
        'terms_of_service', 'privacy_policy', 'marketing_email', 'marketing_sms',
        'marketing_push', 'data_analytics', 'third_party_sharing',
        'cookies_essential', 'cookies_analytics', 'cookies_marketing'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE rgpd_request_status AS ENUM ('pending', 'processing', 'completed', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE rgpd_request_type AS ENUM ('data_export', 'data_deletion', 'data_rectification', 'processing_restriction', 'objection');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2.2 MEMBER CONSENTS TABLE
CREATE TABLE IF NOT EXISTS public.member_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,

    consent_type consent_type NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT false,

    source TEXT NOT NULL DEFAULT 'web',
    ip_address INET,
    user_agent TEXT,

    document_version TEXT,
    document_url TEXT,

    consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_consents_org ON public.member_consents(org_id);
CREATE INDEX IF NOT EXISTS idx_member_consents_member ON public.member_consents(member_id);
CREATE INDEX IF NOT EXISTS idx_member_consents_type ON public.member_consents(consent_type);

ALTER TABLE public.member_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view consents" ON public.member_consents;
CREATE POLICY "Staff can view consents" ON public.member_consents
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can insert consents" ON public.member_consents;
CREATE POLICY "Staff can insert consents" ON public.member_consents
    FOR INSERT WITH CHECK (is_org_staff(org_id));

DROP POLICY IF EXISTS "Members can view own consents" ON public.member_consents;
CREATE POLICY "Members can view own consents" ON public.member_consents
    FOR SELECT USING (is_member_self(member_id));

DROP POLICY IF EXISTS "Members can manage own consents" ON public.member_consents;
CREATE POLICY "Members can manage own consents" ON public.member_consents
    FOR INSERT WITH CHECK (is_member_self(member_id));

-- 2.3 RGPD REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.rgpd_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,

    request_type rgpd_request_type NOT NULL,
    status rgpd_request_status NOT NULL DEFAULT 'pending',

    requester_email TEXT NOT NULL,
    requester_name TEXT,

    reason TEXT,
    scope JSONB DEFAULT '[]'::jsonb,

    processed_by UUID REFERENCES public.profiles(id),
    processed_at TIMESTAMPTZ,
    rejection_reason TEXT,

    export_file_url TEXT,
    export_file_expires_at TIMESTAMPTZ,

    ip_address INET,
    user_agent TEXT,

    due_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rgpd_requests_org ON public.rgpd_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_rgpd_requests_member ON public.rgpd_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_rgpd_requests_status ON public.rgpd_requests(status);
CREATE INDEX IF NOT EXISTS idx_rgpd_requests_due ON public.rgpd_requests(due_date);

ALTER TABLE public.rgpd_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view requests" ON public.rgpd_requests;
CREATE POLICY "Staff can view requests" ON public.rgpd_requests
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can manage requests" ON public.rgpd_requests;
CREATE POLICY "Staff can manage requests" ON public.rgpd_requests
    FOR ALL USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Members can view own requests" ON public.rgpd_requests;
CREATE POLICY "Members can view own requests" ON public.rgpd_requests
    FOR SELECT USING (is_member_self(member_id));

DROP POLICY IF EXISTS "Members can create own requests" ON public.rgpd_requests;
CREATE POLICY "Members can create own requests" ON public.rgpd_requests
    FOR INSERT WITH CHECK (is_member_self(member_id));

-- 2.4 RGPD AUDIT LOG
CREATE TABLE IF NOT EXISTS public.rgpd_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    user_id UUID REFERENCES public.profiles(id),
    member_id UUID REFERENCES public.members(id),

    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,

    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rgpd_audit_org ON public.rgpd_audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_rgpd_audit_user ON public.rgpd_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_rgpd_audit_member ON public.rgpd_audit_log(member_id);
CREATE INDEX IF NOT EXISTS idx_rgpd_audit_action ON public.rgpd_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_rgpd_audit_date ON public.rgpd_audit_log(created_at);

ALTER TABLE public.rgpd_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view audit logs" ON public.rgpd_audit_log;
CREATE POLICY "Staff can view audit logs" ON public.rgpd_audit_log
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "System can insert audit logs" ON public.rgpd_audit_log;
CREATE POLICY "System can insert audit logs" ON public.rgpd_audit_log
    FOR INSERT WITH CHECK (is_org_staff(org_id));

-- =====================================================
-- PART 3: STRIPE CONNECT EXTRAS
-- =====================================================

-- 3.1 CHECKOUT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.checkout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,

    stripe_session_id TEXT UNIQUE NOT NULL,
    stripe_payment_intent_id TEXT,
    stripe_customer_id TEXT,

    status TEXT NOT NULL DEFAULT 'pending',

    amount_subtotal INTEGER,
    amount_total INTEGER,
    currency TEXT DEFAULT 'eur',

    application_fee_amount INTEGER,

    success_url TEXT,
    cancel_url TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_org ON public.checkout_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_member ON public.checkout_sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_stripe ON public.checkout_sessions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status ON public.checkout_sessions(status);

ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view checkout sessions" ON public.checkout_sessions;
CREATE POLICY "Staff can view checkout sessions" ON public.checkout_sessions
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can manage checkout sessions" ON public.checkout_sessions;
CREATE POLICY "Staff can manage checkout sessions" ON public.checkout_sessions
    FOR ALL USING (is_org_staff(org_id));

-- 3.2 STRIPE EVENTS TABLE (Webhook Idempotency)
CREATE TABLE IF NOT EXISTS public.stripe_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    processed BOOLEAN DEFAULT false,
    error TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_id ON public.stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON public.stripe_events(event_type);

-- =====================================================
-- PART 4: TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_discord_config_updated_at ON public.discord_config;
CREATE TRIGGER update_discord_config_updated_at
    BEFORE UPDATE ON public.discord_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_rgpd_requests_updated_at ON public.rgpd_requests;
CREATE TRIGGER update_rgpd_requests_updated_at
    BEFORE UPDATE ON public.rgpd_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_checkout_sessions_updated_at ON public.checkout_sessions;
CREATE TRIGGER update_checkout_sessions_updated_at
    BEFORE UPDATE ON public.checkout_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PART 5: HELPER FUNCTIONS
-- =====================================================

-- Get org Discord config
CREATE OR REPLACE FUNCTION public.get_org_discord_config(p_org_id UUID)
RETURNS TABLE (
    webhook_url TEXT,
    wod_channel_webhook TEXT,
    auto_post_wod BOOLEAN,
    post_wod_time TIME,
    post_wod_days TEXT[],
    notification_types JSONB,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.webhook_url,
        dc.wod_channel_webhook,
        COALESCE(dc.auto_post_wod, false),
        COALESCE(dc.post_wod_time, '06:00:00'::TIME),
        COALESCE(dc.post_wod_days, ARRAY['monday','tuesday','wednesday','thursday','friday']),
        COALESCE(dc.notification_types, '{"welcome":true}'::JSONB),
        COALESCE(dc.is_active, true)
    FROM public.organizations o
    LEFT JOIN public.discord_config dc ON dc.org_id = o.id
    WHERE o.id = p_org_id;
END;
$$;

-- Check if Discord notification type is enabled
CREATE OR REPLACE FUNCTION public.is_discord_notification_enabled(
    p_org_id UUID,
    p_notification_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    config RECORD;
BEGIN
    SELECT * INTO config FROM public.discord_config WHERE org_id = p_org_id AND is_active = true;

    IF NOT FOUND THEN RETURN false; END IF;
    IF config.webhook_url IS NULL OR config.webhook_url = '' THEN RETURN false; END IF;

    RETURN COALESCE((config.notification_types->>p_notification_type)::BOOLEAN, false);
END;
$$;

-- Get member active consents
CREATE OR REPLACE FUNCTION public.get_member_active_consents(p_member_id UUID)
RETURNS TABLE (
    consent_type consent_type,
    granted BOOLEAN,
    consented_at TIMESTAMPTZ,
    document_version TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (mc.consent_type)
        mc.consent_type, mc.granted, mc.consented_at, mc.document_version
    FROM public.member_consents mc
    WHERE mc.member_id = p_member_id
    AND (mc.expires_at IS NULL OR mc.expires_at > NOW())
    ORDER BY mc.consent_type, mc.consented_at DESC;
END;
$$;

-- Check if member has a specific consent
CREATE OR REPLACE FUNCTION public.has_consent(p_member_id UUID, p_consent_type consent_type)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_granted BOOLEAN;
BEGIN
    SELECT granted INTO v_granted
    FROM public.member_consents
    WHERE member_id = p_member_id AND consent_type = p_consent_type
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY consented_at DESC
    LIMIT 1;

    RETURN COALESCE(v_granted, false);
END;
$$;

-- Record a consent
CREATE OR REPLACE FUNCTION public.record_consent(
    p_org_id UUID, p_member_id UUID, p_consent_type consent_type, p_granted BOOLEAN,
    p_source TEXT DEFAULT 'web', p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL, p_document_version TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_consent_id UUID;
BEGIN
    INSERT INTO public.member_consents (
        org_id, member_id, consent_type, granted, source, ip_address, user_agent, document_version
    )
    VALUES (p_org_id, p_member_id, p_consent_type, p_granted, p_source, p_ip_address, p_user_agent, p_document_version)
    RETURNING id INTO v_consent_id;

    INSERT INTO public.rgpd_audit_log (org_id, member_id, action, entity_type, entity_id, details)
    VALUES (
        p_org_id, p_member_id, 'consent_change', 'member_consent', v_consent_id,
        jsonb_build_object('consent_type', p_consent_type, 'granted', p_granted, 'source', p_source)
    );

    RETURN v_consent_id;
END;
$$;

-- Anonymize a member (for RGPD deletion)
CREATE OR REPLACE FUNCTION public.anonymize_member(p_member_id UUID, p_processed_by UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_anonymous_id TEXT;
BEGIN
    SELECT org_id INTO v_org_id FROM public.members WHERE id = p_member_id;

    IF v_org_id IS NULL THEN RETURN false; END IF;

    v_anonymous_id := 'ANON_' || substr(md5(random()::text), 1, 8);

    UPDATE public.members
    SET
        first_name = 'Membre', last_name = 'Supprimé',
        email = v_anonymous_id || '@anonymized.local',
        phone = NULL, birth_date = NULL, avatar_url = NULL,
        emergency_contact = '{}'::jsonb, medical_info = '{}'::jsonb,
        tags = ARRAY[]::TEXT[], status = 'archived',
        user_id = NULL, member_number = v_anonymous_id, updated_at = NOW()
    WHERE id = p_member_id;

    INSERT INTO public.rgpd_audit_log (org_id, user_id, member_id, action, entity_type, entity_id, details)
    VALUES (v_org_id, p_processed_by, p_member_id, 'delete', 'member', p_member_id,
            jsonb_build_object('type', 'anonymization', 'reason', 'RGPD deletion request'));

    RETURN true;
END;
$$;

-- Log data access
CREATE OR REPLACE FUNCTION public.log_data_access(
    p_org_id UUID, p_user_id UUID, p_member_id UUID, p_action TEXT, p_entity_type TEXT,
    p_entity_id UUID DEFAULT NULL, p_details JSONB DEFAULT '{}'::jsonb,
    p_ip_address INET DEFAULT NULL, p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.rgpd_audit_log (
        org_id, user_id, member_id, action, entity_type, entity_id, details, ip_address, user_agent
    )
    VALUES (p_org_id, p_user_id, p_member_id, p_action, p_entity_type, p_entity_id, p_details, p_ip_address, p_user_agent)
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- Can org accept payments
CREATE OR REPLACE FUNCTION public.can_accept_payments(org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org RECORD;
BEGIN
    SELECT * INTO org FROM public.organizations WHERE id = org_uuid;

    IF NOT FOUND THEN RETURN false; END IF;
    IF org.stripe_account_id IS NULL THEN RETURN false; END IF;
    IF NOT org.stripe_charges_enabled THEN RETURN false; END IF;
    IF org.platform_subscription_status NOT IN ('active', 'trialing') THEN RETURN false; END IF;

    RETURN true;
END;
$$;

-- Calculate platform fee
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

    RETURN CEIL(amount_cents * fee_percent / 100);
END;
$$;

-- =====================================================
-- PART 6: VIEWS
-- =====================================================

CREATE OR REPLACE VIEW public.v_rgpd_pending_requests AS
SELECT
    r.id, r.org_id, o.name as org_name, r.member_id,
    m.first_name || ' ' || m.last_name as member_name,
    r.request_type, r.requester_email, r.status, r.due_date, r.created_at,
    (r.due_date - NOW()) as time_remaining,
    CASE
        WHEN r.due_date < NOW() THEN 'overdue'
        WHEN r.due_date < NOW() + INTERVAL '7 days' THEN 'urgent'
        ELSE 'normal'
    END as urgency
FROM public.rgpd_requests r
JOIN public.organizations o ON o.id = r.org_id
LEFT JOIN public.members m ON m.id = r.member_id
WHERE r.status IN ('pending', 'processing');

-- =====================================================
-- PART 7: COMMENTS
-- =====================================================

COMMENT ON TABLE public.discord_config IS 'Discord integration settings per organization';
COMMENT ON TABLE public.discord_logs IS 'Log of Discord messages sent';
COMMENT ON TABLE public.member_consents IS 'RGPD consent records';
COMMENT ON TABLE public.rgpd_requests IS 'RGPD data subject requests (export, deletion, etc.)';
COMMENT ON TABLE public.rgpd_audit_log IS 'Audit log for RGPD compliance';
COMMENT ON TABLE public.checkout_sessions IS 'Stripe Checkout sessions for member payments';
COMMENT ON TABLE public.stripe_events IS 'Webhook event idempotency tracking';
