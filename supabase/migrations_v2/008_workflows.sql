-- =====================================================
-- SKALI PROG V3 - WORKFLOWS
-- Migration 008: Automation system (N8N-style)
-- =====================================================
-- Requires: 001_base_schema.sql
-- =====================================================

-- =====================================================
-- 1. ENUMS
-- =====================================================

DO $$ BEGIN
    CREATE TYPE trigger_type AS ENUM (
        'member_created', 'subscription_expiring_soon', 'class_starting_soon',
        'personal_record_achieved', 'manual_trigger',
        'member_updated', 'member_deleted', 'member_birthday', 'member_inactive_days',
        'subscription_created', 'subscription_renewed', 'subscription_expired', 'subscription_cancelled',
        'class_created', 'class_cancelled', 'class_ended',
        'reservation_created', 'reservation_cancelled', 'reservation_no_show',
        'payment_received', 'payment_failed',
        'schedule_daily', 'schedule_weekly', 'schedule_cron', 'webhook_received'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE action_type AS ENUM (
        'send_email', 'send_in_app_notification', 'delay', 'condition_branch', 'update_member',
        'send_sms', 'send_push_notification', 'send_discord_message',
        'add_member_tag', 'remove_member_tag',
        'assign_subscription', 'pause_subscription',
        'create_reservation', 'cancel_reservation',
        'http_request', 'call_webhook', 'set_variable', 'log_event'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE workflow_execution_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled', 'paused', 'waiting');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE node_execution_status AS ENUM ('pending', 'running', 'completed', 'failed', 'skipped', 'waiting');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. WORKFLOW FOLDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workflow_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.workflow_folders(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workflow_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_folders_staff_all" ON public.workflow_folders;
CREATE POLICY "workflow_folders_staff_all" ON public.workflow_folders
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- 3. WORKFLOWS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'workflow',
    color VARCHAR(7) DEFAULT '#6366f1',
    folder_id UUID REFERENCES public.workflow_folders(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',

    is_active BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,

    canvas_data JSONB DEFAULT '{"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}',

    settings JSONB DEFAULT '{
        "timezone": "Europe/Paris",
        "max_executions_per_day": 1000,
        "retry_failed": true,
        "retry_count": 3,
        "retry_delay_seconds": 60
    }',

    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    last_executed_at TIMESTAMPTZ,

    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_org ON public.workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON public.workflows(org_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workflows_folder ON public.workflows(folder_id);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflows_staff_select" ON public.workflows;
CREATE POLICY "workflows_staff_select" ON public.workflows
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "workflows_staff_all" ON public.workflows;
CREATE POLICY "workflows_staff_all" ON public.workflows
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- 4. WORKFLOW NODES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workflow_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,

    node_id VARCHAR(100) NOT NULL,
    node_type VARCHAR(50) NOT NULL,

    trigger_type trigger_type,
    trigger_config JSONB DEFAULT '{}',

    action_type action_type,
    action_config JSONB DEFAULT '{}',

    position_x NUMERIC DEFAULT 0,
    position_y NUMERIC DEFAULT 0,
    width INTEGER DEFAULT 250,
    height INTEGER DEFAULT 80,

    label VARCHAR(255),
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),

    timeout_seconds INTEGER DEFAULT 30,
    retry_on_fail BOOLEAN DEFAULT true,
    continue_on_fail BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(workflow_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_nodes_workflow ON public.workflow_nodes(workflow_id);

ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_nodes_staff_all" ON public.workflow_nodes;
CREATE POLICY "workflow_nodes_staff_all" ON public.workflow_nodes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.workflows w WHERE w.id = workflow_id AND is_org_staff(w.org_id))
    );

-- =====================================================
-- 5. WORKFLOW EDGES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workflow_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,

    edge_id VARCHAR(100) NOT NULL,
    source_node_id VARCHAR(100) NOT NULL,
    target_node_id VARCHAR(100) NOT NULL,
    source_handle VARCHAR(50) DEFAULT 'output',
    target_handle VARCHAR(50) DEFAULT 'input',

    condition_expression TEXT,
    condition_label VARCHAR(100),

    edge_type VARCHAR(20) DEFAULT 'smoothstep',
    animated BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(workflow_id, edge_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_edges_workflow ON public.workflow_edges(workflow_id);

ALTER TABLE public.workflow_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_edges_staff_all" ON public.workflow_edges;
CREATE POLICY "workflow_edges_staff_all" ON public.workflow_edges
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.workflows w WHERE w.id = workflow_id AND is_org_staff(w.org_id))
    );

-- =====================================================
-- 6. WORKFLOW RUNS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    status workflow_execution_status DEFAULT 'pending',

    triggered_by VARCHAR(50) NOT NULL,
    trigger_node_id VARCHAR(100),
    trigger_data JSONB DEFAULT '{}',

    variables JSONB DEFAULT '{}',
    context JSONB DEFAULT '{}',

    output_data JSONB DEFAULT '{}',
    error_message TEXT,
    error_stack TEXT,

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    executed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON public.workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_org ON public.workflow_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON public.workflow_runs(workflow_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_created ON public.workflow_runs(created_at DESC);

ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_runs_staff_all" ON public.workflow_runs;
CREATE POLICY "workflow_runs_staff_all" ON public.workflow_runs
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- 7. WORKFLOW NODE RUNS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workflow_node_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
    node_id VARCHAR(100) NOT NULL,

    status node_execution_status DEFAULT 'pending',

    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',

    error_message TEXT,
    error_stack TEXT,
    retry_count INTEGER DEFAULT 0,

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_node_runs_run ON public.workflow_node_runs(run_id);

ALTER TABLE public.workflow_node_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_node_runs_staff_all" ON public.workflow_node_runs;
CREATE POLICY "workflow_node_runs_staff_all" ON public.workflow_node_runs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.workflow_runs r WHERE r.id = run_id AND is_org_staff(r.org_id))
    );

-- =====================================================
-- 8. WORKFLOW LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
    node_id VARCHAR(100),

    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_run ON public.workflow_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_created ON public.workflow_logs(created_at DESC);

ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_logs_staff_all" ON public.workflow_logs;
CREATE POLICY "workflow_logs_staff_all" ON public.workflow_logs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.workflow_runs r WHERE r.id = run_id AND is_org_staff(r.org_id))
    );

-- =====================================================
-- 9. WORKFLOW TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    icon VARCHAR(50) DEFAULT 'template',

    nodes_config JSONB DEFAULT '[]',
    edges_config JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',

    is_official BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_templates_select" ON public.workflow_templates;
CREATE POLICY "workflow_templates_select" ON public.workflow_templates
    FOR SELECT USING (org_id IS NULL OR is_org_staff(org_id));

DROP POLICY IF EXISTS "workflow_templates_modify" ON public.workflow_templates;
CREATE POLICY "workflow_templates_modify" ON public.workflow_templates
    FOR ALL USING (org_id IS NOT NULL AND is_org_staff(org_id));

-- =====================================================
-- 10. SCHEDULED RUNS (for delays)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workflow_scheduled_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    next_node_ids TEXT[] NOT NULL DEFAULT '{}',
    execute_at TIMESTAMPTZ NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error TEXT,

    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_runs_org ON public.workflow_scheduled_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_runs_status ON public.workflow_scheduled_runs(status, execute_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_runs_execute_at ON public.workflow_scheduled_runs(execute_at) WHERE status = 'pending';

ALTER TABLE public.workflow_scheduled_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_scheduled_runs_staff_all" ON public.workflow_scheduled_runs;
CREATE POLICY "workflow_scheduled_runs_staff_all" ON public.workflow_scheduled_runs
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- 11. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_workflows_updated_at ON public.workflows;
CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON public.workflows
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflow_nodes_updated_at ON public.workflow_nodes;
CREATE TRIGGER update_workflow_nodes_updated_at
    BEFORE UPDATE ON public.workflow_nodes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflow_templates_updated_at ON public.workflow_templates;
CREATE TRIGGER update_workflow_templates_updated_at
    BEFORE UPDATE ON public.workflow_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update workflow stats after run completion
CREATE OR REPLACE FUNCTION public.update_workflow_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('completed', 'failed') AND (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'failed')) THEN
        UPDATE public.workflows
        SET
            total_executions = total_executions + 1,
            successful_executions = CASE WHEN NEW.status = 'completed' THEN successful_executions + 1 ELSE successful_executions END,
            failed_executions = CASE WHEN NEW.status = 'failed' THEN failed_executions + 1 ELSE failed_executions END,
            last_executed_at = NOW()
        WHERE id = NEW.workflow_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_workflow_stats_trigger ON public.workflow_runs;
CREATE TRIGGER update_workflow_stats_trigger
    AFTER INSERT OR UPDATE ON public.workflow_runs
    FOR EACH ROW EXECUTE FUNCTION public.update_workflow_stats();

-- =====================================================
-- 12. SEED: OFFICIAL TEMPLATES
-- =====================================================

INSERT INTO public.workflow_templates (name, description, category, icon, is_official, nodes_config, edges_config)
VALUES
('Welcome New Member', 'Send welcome email when a new member is created', 'onboarding', 'user-plus', true,
'[{"id": "trigger_1", "type": "trigger", "data": {"trigger_type": "member_created", "label": "New member"}, "position": {"x": 100, "y": 200}},
  {"id": "delay_1", "type": "action", "data": {"action_type": "delay", "label": "Wait 1h", "config": {"duration": 3600}}, "position": {"x": 400, "y": 200}},
  {"id": "email_1", "type": "action", "data": {"action_type": "send_email", "label": "Welcome email"}, "position": {"x": 700, "y": 200}}]',
'[{"id": "e1", "source": "trigger_1", "target": "delay_1"}, {"id": "e2", "source": "delay_1", "target": "email_1"}]'),

('Subscription Expiring Soon', 'Alert 7 days before subscription expires', 'billing', 'credit-card', true,
'[{"id": "trigger_1", "type": "trigger", "data": {"trigger_type": "subscription_expiring_soon", "label": "Expires in 7d"}, "position": {"x": 100, "y": 200}},
  {"id": "email_1", "type": "action", "data": {"action_type": "send_email", "label": "Renewal email"}, "position": {"x": 400, "y": 200}}]',
'[{"id": "e1", "source": "trigger_1", "target": "email_1"}]'),

('Class Reminder', 'Reminder 2h before a booked class', 'classes', 'calendar', true,
'[{"id": "trigger_1", "type": "trigger", "data": {"trigger_type": "class_starting_soon", "label": "Class in 2h"}, "position": {"x": 100, "y": 200}},
  {"id": "notif_1", "type": "action", "data": {"action_type": "send_in_app_notification", "label": "Reminder"}, "position": {"x": 400, "y": 200}}]',
'[{"id": "e1", "source": "trigger_1", "target": "notif_1"}]')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 13. UTILITY FUNCTIONS
-- =====================================================

-- Duplicate a workflow
CREATE OR REPLACE FUNCTION public.duplicate_workflow(
    p_workflow_id UUID,
    p_new_name VARCHAR(255),
    p_created_by UUID
) RETURNS UUID AS $$
DECLARE
    v_new_workflow_id UUID;
    v_workflow RECORD;
BEGIN
    SELECT * INTO v_workflow FROM public.workflows WHERE id = p_workflow_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workflow not found';
    END IF;

    INSERT INTO public.workflows (org_id, name, description, icon, color, canvas_data, settings, created_by)
    VALUES (v_workflow.org_id, p_new_name, v_workflow.description, v_workflow.icon, v_workflow.color,
            v_workflow.canvas_data, v_workflow.settings, p_created_by)
    RETURNING id INTO v_new_workflow_id;

    INSERT INTO public.workflow_nodes (workflow_id, node_id, node_type, trigger_type, trigger_config, action_type, action_config,
                                       position_x, position_y, width, height, label, description, icon, color,
                                       timeout_seconds, retry_on_fail, continue_on_fail)
    SELECT v_new_workflow_id, node_id, node_type, trigger_type, trigger_config, action_type, action_config,
           position_x, position_y, width, height, label, description, icon, color,
           timeout_seconds, retry_on_fail, continue_on_fail
    FROM public.workflow_nodes WHERE workflow_id = p_workflow_id;

    INSERT INTO public.workflow_edges (workflow_id, edge_id, source_node_id, target_node_id, source_handle, target_handle,
                                       condition_expression, condition_label, edge_type, animated)
    SELECT v_new_workflow_id, edge_id, source_node_id, target_node_id, source_handle, target_handle,
           condition_expression, condition_label, edge_type, animated
    FROM public.workflow_edges WHERE workflow_id = p_workflow_id;

    RETURN v_new_workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
