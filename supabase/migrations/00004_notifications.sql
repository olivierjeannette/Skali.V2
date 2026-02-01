-- =====================================================
-- SKALI PROG V3 - NOTIFICATIONS SCHEMA
-- Tables pour gestion emails et notifications
-- =====================================================
-- Date: 2026-01-31
-- Epic 6: Communications & Notifications
-- =====================================================

-- =====================================================
-- 1. CUSTOM TYPES (ENUMS)
-- =====================================================

-- Status des emails
DO $$ BEGIN
    CREATE TYPE email_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Types de templates emails
DO $$ BEGIN
    CREATE TYPE email_template_type AS ENUM (
        'welcome',
        'booking_confirmation',
        'class_reminder',
        'class_cancelled',
        'subscription_expiring',
        'subscription_expired',
        'payment_confirmation',
        'password_reset',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Types de triggers pour les notifications auto
DO $$ BEGIN
    CREATE TYPE notification_trigger AS ENUM (
        'member_created',
        'booking_created',
        'booking_cancelled',
        'class_reminder_24h',
        'class_reminder_2h',
        'class_cancelled',
        'subscription_expiring_30d',
        'subscription_expiring_7d',
        'subscription_expired',
        'payment_received'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. EMAIL LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Destinataire
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,

    -- Contenu
    template_type email_template_type NOT NULL,
    subject TEXT NOT NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Status
    status email_status NOT NULL DEFAULT 'pending',
    resend_message_id TEXT,
    error_message TEXT,

    -- Timestamps
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_email_logs_org ON public.email_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_member ON public.email_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON public.email_logs(template_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON public.email_logs(created_at DESC);

-- RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Staff can view their org email logs" ON public.email_logs;
CREATE POLICY "Staff can view their org email logs" ON public.email_logs
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can insert email logs" ON public.email_logs;
CREATE POLICY "Staff can insert email logs" ON public.email_logs
    FOR INSERT WITH CHECK (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can update their org email logs" ON public.email_logs;
CREATE POLICY "Staff can update their org email logs" ON public.email_logs
    FOR UPDATE USING (is_org_staff(org_id));

-- =====================================================
-- 3. NOTIFICATION SETTINGS (Per Organization)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Email config
    from_name TEXT DEFAULT 'Skali Prog',
    from_email TEXT,
    reply_to_email TEXT,

    -- Auto-notifications toggles
    send_welcome_email BOOLEAN DEFAULT true,
    send_booking_confirmation BOOLEAN DEFAULT true,
    send_class_reminder_24h BOOLEAN DEFAULT true,
    send_class_reminder_2h BOOLEAN DEFAULT false,
    send_class_cancelled BOOLEAN DEFAULT true,
    send_subscription_expiring_30d BOOLEAN DEFAULT true,
    send_subscription_expiring_7d BOOLEAN DEFAULT true,
    send_subscription_expired BOOLEAN DEFAULT false,

    -- Custom settings
    settings JSONB DEFAULT '{}'::jsonb,

    -- Meta
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_notification_settings_org ON public.notification_settings(org_id);

-- RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Staff can view their org notification settings" ON public.notification_settings;
CREATE POLICY "Staff can view their org notification settings" ON public.notification_settings
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Admins can manage their org notification settings" ON public.notification_settings;
CREATE POLICY "Admins can manage their org notification settings" ON public.notification_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.org_id = notification_settings.org_id
            AND ou.user_id = auth.uid()
            AND ou.role IN ('owner', 'admin')
            AND ou.is_active = true
        )
    );

-- =====================================================
-- 4. MEMBER NOTIFICATION PREFERENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.member_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL UNIQUE REFERENCES public.members(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Preferences
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,

    -- Types
    receive_class_reminders BOOLEAN DEFAULT true,
    receive_subscription_alerts BOOLEAN DEFAULT true,
    receive_booking_confirmations BOOLEAN DEFAULT true,
    receive_marketing BOOLEAN DEFAULT false,

    -- Meta
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_member_notif_prefs_member ON public.member_notification_preferences(member_id);
CREATE INDEX IF NOT EXISTS idx_member_notif_prefs_org ON public.member_notification_preferences(org_id);

-- RLS
ALTER TABLE public.member_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Staff can view their org member prefs" ON public.member_notification_preferences;
CREATE POLICY "Staff can view their org member prefs" ON public.member_notification_preferences
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can manage their org member prefs" ON public.member_notification_preferences;
CREATE POLICY "Staff can manage their org member prefs" ON public.member_notification_preferences
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- 5. SCHEDULED NOTIFICATIONS (For cron jobs)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Target
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,

    -- Type and content
    trigger_type notification_trigger NOT NULL,
    template_type email_template_type NOT NULL,

    -- Scheduling
    scheduled_for TIMESTAMPTZ NOT NULL,

    -- Status
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    email_log_id UUID REFERENCES public.email_logs(id) ON DELETE SET NULL,

    -- Meta
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_scheduled_notif_org ON public.scheduled_notifications(org_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notif_scheduled ON public.scheduled_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_notif_pending ON public.scheduled_notifications(is_processed, scheduled_for)
    WHERE is_processed = false;

-- RLS
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Staff can view their org scheduled notifs" ON public.scheduled_notifications;
CREATE POLICY "Staff can view their org scheduled notifs" ON public.scheduled_notifications
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can manage their org scheduled notifs" ON public.scheduled_notifications;
CREATE POLICY "Staff can manage their org scheduled notifs" ON public.scheduled_notifications
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- 6. UPDATED_AT TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON public.notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON public.notification_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_member_notif_prefs_updated_at ON public.member_notification_preferences;
CREATE TRIGGER update_member_notif_prefs_updated_at
    BEFORE UPDATE ON public.member_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Get org notification settings (with defaults)
CREATE OR REPLACE FUNCTION public.get_org_notification_settings(p_org_id UUID)
RETURNS TABLE (
    send_welcome_email BOOLEAN,
    send_booking_confirmation BOOLEAN,
    send_class_reminder_24h BOOLEAN,
    send_class_reminder_2h BOOLEAN,
    send_class_cancelled BOOLEAN,
    send_subscription_expiring_30d BOOLEAN,
    send_subscription_expiring_7d BOOLEAN,
    send_subscription_expired BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ns.send_welcome_email, true),
        COALESCE(ns.send_booking_confirmation, true),
        COALESCE(ns.send_class_reminder_24h, true),
        COALESCE(ns.send_class_reminder_2h, false),
        COALESCE(ns.send_class_cancelled, true),
        COALESCE(ns.send_subscription_expiring_30d, true),
        COALESCE(ns.send_subscription_expiring_7d, true),
        COALESCE(ns.send_subscription_expired, false)
    FROM public.organizations o
    LEFT JOIN public.notification_settings ns ON ns.org_id = o.id
    WHERE o.id = p_org_id;
END;
$$;

-- Check if member wants to receive a notification type
CREATE OR REPLACE FUNCTION public.member_wants_notification(
    p_member_id UUID,
    p_notification_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    prefs RECORD;
BEGIN
    SELECT * INTO prefs FROM public.member_notification_preferences
    WHERE member_id = p_member_id;

    -- If no preferences, default to true (opt-out model)
    IF NOT FOUND THEN
        RETURN true;
    END IF;

    -- Check email enabled first
    IF NOT prefs.email_enabled THEN
        RETURN false;
    END IF;

    -- Check specific type
    CASE p_notification_type
        WHEN 'class_reminder' THEN RETURN prefs.receive_class_reminders;
        WHEN 'subscription_alert' THEN RETURN prefs.receive_subscription_alerts;
        WHEN 'booking_confirmation' THEN RETURN prefs.receive_booking_confirmations;
        WHEN 'marketing' THEN RETURN prefs.receive_marketing;
        ELSE RETURN true;
    END CASE;
END;
$$;
