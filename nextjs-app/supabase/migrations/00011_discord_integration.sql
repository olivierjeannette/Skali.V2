-- =====================================================
-- SKALI PROG V3 - DISCORD INTEGRATION SCHEMA
-- Tables pour integration Discord (webhooks + notifications)
-- =====================================================
-- Date: 2026-02-01
-- Epic: Discord Integration
-- =====================================================

-- =====================================================
-- 1. CUSTOM TYPES (ENUMS)
-- =====================================================

-- Types de messages Discord
DO $$ BEGIN
    CREATE TYPE discord_message_type AS ENUM (
        'wod',
        'welcome',
        'class_reminder',
        'subscription_alert',
        'achievement',
        'announcement',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Status des messages Discord
DO $$ BEGIN
    CREATE TYPE discord_message_status AS ENUM ('pending', 'sent', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. DISCORD CONFIG (Per Organization)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.discord_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Webhooks
    webhook_url TEXT,                    -- Webhook principal pour notifications
    wod_channel_webhook TEXT,           -- Webhook specifique pour les WODs

    -- Bot config (futur)
    guild_id TEXT,                       -- ID du serveur Discord
    bot_channel_id TEXT,                -- Channel par defaut du bot

    -- Auto-post WOD settings
    auto_post_wod BOOLEAN DEFAULT false,
    post_wod_time TIME DEFAULT '06:00:00',
    post_wod_days TEXT[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday'],

    -- Notification types enabled
    notification_types JSONB DEFAULT '{
        "welcome": true,
        "class_reminder": false,
        "subscription_alert": false,
        "achievement": true,
        "announcement": true
    }'::jsonb,

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_wod_posted_at TIMESTAMPTZ,
    last_wod_workout_id UUID,

    -- Meta
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_discord_config_org ON public.discord_config(org_id);
CREATE INDEX IF NOT EXISTS idx_discord_config_active ON public.discord_config(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.discord_config ENABLE ROW LEVEL SECURITY;

-- Policies
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

-- =====================================================
-- 3. DISCORD LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.discord_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Related entities
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,

    -- Message details
    message_type discord_message_type NOT NULL,
    webhook_url TEXT NOT NULL,
    content TEXT,
    embed_data JSONB,

    -- Status
    status discord_message_status NOT NULL DEFAULT 'pending',
    discord_message_id TEXT,
    error_message TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- Index
CREATE INDEX IF NOT EXISTS idx_discord_logs_org ON public.discord_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_discord_logs_status ON public.discord_logs(status);
CREATE INDEX IF NOT EXISTS idx_discord_logs_type ON public.discord_logs(message_type);
CREATE INDEX IF NOT EXISTS idx_discord_logs_created ON public.discord_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discord_logs_workout ON public.discord_logs(workout_id) WHERE workout_id IS NOT NULL;

-- RLS
ALTER TABLE public.discord_logs ENABLE ROW LEVEL SECURITY;

-- Policies
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
-- 4. UPDATED_AT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS update_discord_config_updated_at ON public.discord_config;
CREATE TRIGGER update_discord_config_updated_at
    BEFORE UPDATE ON public.discord_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. HELPER FUNCTIONS
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
        COALESCE(dc.notification_types, '{"welcome":true,"class_reminder":false,"subscription_alert":false,"achievement":true,"announcement":true}'::JSONB),
        COALESCE(dc.is_active, true)
    FROM public.organizations o
    LEFT JOIN public.discord_config dc ON dc.org_id = o.id
    WHERE o.id = p_org_id;
END;
$$;

-- Check if Discord notification type is enabled for org
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
    SELECT * INTO config FROM public.discord_config
    WHERE org_id = p_org_id AND is_active = true;

    -- If no config, not enabled
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Check if webhook exists
    IF config.webhook_url IS NULL OR config.webhook_url = '' THEN
        RETURN false;
    END IF;

    -- Check specific type in notification_types JSONB
    RETURN COALESCE((config.notification_types->>p_notification_type)::BOOLEAN, false);
END;
$$;

-- Get orgs with auto-post WOD enabled for today
CREATE OR REPLACE FUNCTION public.get_orgs_for_wod_post(p_day_of_week TEXT)
RETURNS TABLE (
    org_id UUID,
    org_name TEXT,
    webhook_url TEXT,
    post_wod_time TIME
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.org_id,
        o.name,
        COALESCE(dc.wod_channel_webhook, dc.webhook_url),
        dc.post_wod_time
    FROM public.discord_config dc
    JOIN public.organizations o ON o.id = dc.org_id
    WHERE dc.is_active = true
      AND dc.auto_post_wod = true
      AND (dc.wod_channel_webhook IS NOT NULL OR dc.webhook_url IS NOT NULL)
      AND p_day_of_week = ANY(dc.post_wod_days);
END;
$$;
