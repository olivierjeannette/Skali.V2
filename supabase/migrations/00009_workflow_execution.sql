-- =====================================================
-- MIGRATION 00009: WORKFLOW EXECUTION ENGINE SUPPORT
-- Tables additionnelles pour l'execution des workflows
-- =====================================================

-- =====================================================
-- SECTION 1: SCHEDULED RUNS (pour les delays)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workflow_scheduled_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Quels nodes executer
    next_node_ids TEXT[] NOT NULL DEFAULT '{}',

    -- Quand executer
    execute_at TIMESTAMPTZ NOT NULL,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error TEXT,

    -- Timestamps
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_runs_org ON public.workflow_scheduled_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_runs_status ON public.workflow_scheduled_runs(status, execute_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_runs_execute_at ON public.workflow_scheduled_runs(execute_at) WHERE status = 'pending';

-- RLS
ALTER TABLE public.workflow_scheduled_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_scheduled_runs_staff_all" ON public.workflow_scheduled_runs;
CREATE POLICY "workflow_scheduled_runs_staff_all" ON public.workflow_scheduled_runs
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- SECTION 2: NOTIFICATIONS TABLE (pour in-app notifications)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,

    -- Contenu
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    icon VARCHAR(50),

    -- Type et source
    type VARCHAR(50) NOT NULL DEFAULT 'general', -- 'workflow', 'system', 'general'
    source_workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
    source_run_id UUID REFERENCES public.workflow_runs(id) ON DELETE SET NULL,

    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications(org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_member ON public.notifications(member_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(member_id, created_at DESC) WHERE is_read = false;

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_member_select" ON public.notifications;
CREATE POLICY "notifications_member_select" ON public.notifications
    FOR SELECT USING (
        is_org_staff(org_id) OR
        (member_id IS NOT NULL AND is_member_self(member_id))
    );

DROP POLICY IF EXISTS "notifications_member_update" ON public.notifications;
CREATE POLICY "notifications_member_update" ON public.notifications
    FOR UPDATE USING (
        is_org_staff(org_id) OR
        (member_id IS NOT NULL AND is_member_self(member_id))
    );

DROP POLICY IF EXISTS "notifications_staff_insert" ON public.notifications;
CREATE POLICY "notifications_staff_insert" ON public.notifications
    FOR INSERT WITH CHECK (is_org_staff(org_id));

DROP POLICY IF EXISTS "notifications_staff_delete" ON public.notifications;
CREATE POLICY "notifications_staff_delete" ON public.notifications
    FOR DELETE USING (is_org_staff(org_id));

-- =====================================================
-- SECTION 3: PUSH NOTIFICATION QUEUE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Subscription data (from browser push API)
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,

    -- Device info
    user_agent TEXT,
    device_type VARCHAR(50), -- 'mobile', 'desktop', 'tablet'

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_member ON public.push_subscriptions(member_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id) WHERE is_active = true;

-- RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_own" ON public.push_subscriptions
    FOR ALL USING (
        auth.uid() = user_id OR
        (member_id IS NOT NULL AND is_member_self(member_id))
    );

-- Push notification queue
CREATE TABLE IF NOT EXISTS public.push_notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,

    -- Notification content
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    url TEXT,
    icon TEXT,
    badge TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    error TEXT,

    -- Retry tracking
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    next_attempt_at TIMESTAMPTZ,

    -- Timestamps
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_queue_status ON public.push_notification_queue(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_push_queue_pending ON public.push_notification_queue(created_at) WHERE status = 'pending';

-- RLS
ALTER TABLE public.push_notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_queue_staff_all" ON public.push_notification_queue;
CREATE POLICY "push_queue_staff_all" ON public.push_notification_queue
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- SECTION 4: WORKFLOW TRIGGER CONFIGS
-- Pour stocker les configurations de triggers specifiques
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workflow_trigger_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Trigger type and config
    trigger_type VARCHAR(100) NOT NULL,
    trigger_config JSONB DEFAULT '{}',

    -- For scheduled triggers
    schedule_cron VARCHAR(100), -- Cron expression
    schedule_timezone VARCHAR(50) DEFAULT 'Europe/Paris',
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trigger_configs_workflow ON public.workflow_trigger_configs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_trigger_configs_type ON public.workflow_trigger_configs(org_id, trigger_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_trigger_configs_schedule ON public.workflow_trigger_configs(next_run_at) WHERE is_active = true AND schedule_cron IS NOT NULL;

-- RLS
ALTER TABLE public.workflow_trigger_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_trigger_configs_staff_all" ON public.workflow_trigger_configs;
CREATE POLICY "workflow_trigger_configs_staff_all" ON public.workflow_trigger_configs
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- SECTION 5: UPDATE TRIGGERS
-- =====================================================

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_workflow_trigger_configs_updated_at ON public.workflow_trigger_configs;
CREATE TRIGGER update_workflow_trigger_configs_updated_at
    BEFORE UPDATE ON public.workflow_trigger_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- SECTION 6: HELPER FUNCTIONS
-- =====================================================

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = true, read_at = NOW()
    WHERE id = p_notification_id
    AND (is_org_staff(org_id) OR is_member_self(member_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a member
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_member_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.notifications
    SET is_read = true, read_at = NOW()
    WHERE member_id = p_member_id
    AND is_read = false
    AND is_member_self(p_member_id);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_member_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM public.notifications
    WHERE member_id = p_member_id
    AND is_read = false;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
