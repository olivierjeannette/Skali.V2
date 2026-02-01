-- =====================================================
-- MIGRATION 00008: WORKFLOW AUTOMATION SYSTEM
-- Systeme d'automatisation style N8N avec React Flow
-- =====================================================

-- =====================================================
-- SECTION 1: ENUMS POUR LE SYSTEME DE WORKFLOWS
-- =====================================================

-- Types de triggers disponibles (MVP: 5 principaux)
DO $$ BEGIN
    CREATE TYPE trigger_type AS ENUM (
        -- MVP Triggers
        'member_created',
        'subscription_expiring_soon',
        'class_starting_soon',
        'personal_record_achieved',
        'manual_trigger',

        -- Future Triggers (Phase 2)
        'member_updated',
        'member_deleted',
        'member_birthday',
        'member_inactive_days',
        'member_first_class',
        'subscription_created',
        'subscription_renewed',
        'subscription_expired',
        'subscription_cancelled',
        'subscription_payment_failed',
        'class_created',
        'class_cancelled',
        'class_ended',
        'reservation_created',
        'reservation_cancelled',
        'reservation_no_show',
        'waitlist_spot_available',
        'score_submitted',
        'benchmark_completed',
        'payment_received',
        'payment_failed',
        'schedule_daily',
        'schedule_weekly',
        'schedule_cron',
        'webhook_received'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Types d'actions disponibles (MVP: 5 principales)
DO $$ BEGIN
    CREATE TYPE action_type AS ENUM (
        -- MVP Actions
        'send_email',
        'send_in_app_notification',
        'delay',
        'condition_branch',
        'update_member',

        -- Future Actions (Phase 2)
        'send_sms',
        'send_push_notification',
        'send_discord_message',
        'send_slack_message',
        'add_member_tag',
        'remove_member_tag',
        'assign_subscription',
        'pause_subscription',
        'create_reservation',
        'cancel_reservation',
        'create_invoice',
        'apply_discount',
        'http_request',
        'call_webhook',
        'set_variable',
        'log_event',
        'split',
        'merge'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Statut d'execution
DO $$ BEGIN
    CREATE TYPE workflow_execution_status AS ENUM (
        'pending',
        'running',
        'completed',
        'failed',
        'cancelled',
        'paused',
        'waiting'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Statut d'un noeud dans l'execution
DO $$ BEGIN
    CREATE TYPE node_execution_status AS ENUM (
        'pending',
        'running',
        'completed',
        'failed',
        'skipped',
        'waiting'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- SECTION 2: TABLES PRINCIPALES
-- =====================================================

-- Table principale des workflows
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'workflow',
    color VARCHAR(7) DEFAULT '#6366f1',
    folder_id UUID,
    tags TEXT[] DEFAULT '{}',

    -- Status
    is_active BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,

    -- React Flow data (positions des nodes)
    canvas_data JSONB DEFAULT '{
        "nodes": [],
        "edges": [],
        "viewport": {"x": 0, "y": 0, "zoom": 1}
    }',

    -- Configuration
    settings JSONB DEFAULT '{
        "timezone": "Europe/Paris",
        "max_executions_per_day": 1000,
        "retry_failed": true,
        "retry_count": 3,
        "retry_delay_seconds": 60,
        "log_level": "info",
        "notifications": {
            "on_failure": true,
            "on_success": false,
            "notify_emails": []
        }
    }',

    -- Stats
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    last_executed_at TIMESTAMPTZ,

    -- Audit
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dossiers pour organiser les workflows
CREATE TABLE IF NOT EXISTS public.workflow_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.workflow_folders(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key after workflow_folders exists
DO $$ BEGIN
    ALTER TABLE public.workflows ADD CONSTRAINT fk_workflow_folder
        FOREIGN KEY (folder_id) REFERENCES public.workflow_folders(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Noeuds du workflow (chaque step)
CREATE TABLE IF NOT EXISTS public.workflow_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,

    -- Identification
    node_id VARCHAR(100) NOT NULL, -- ID utilise dans React Flow
    node_type VARCHAR(50) NOT NULL, -- 'trigger', 'action', 'condition'

    -- Pour les triggers
    trigger_type trigger_type,
    trigger_config JSONB DEFAULT '{}',

    -- Pour les actions
    action_type action_type,
    action_config JSONB DEFAULT '{}',

    -- Position et display (pour React Flow)
    position_x NUMERIC DEFAULT 0,
    position_y NUMERIC DEFAULT 0,
    width INTEGER DEFAULT 250,
    height INTEGER DEFAULT 80,

    -- Metadata
    label VARCHAR(255),
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),

    -- Execution config
    timeout_seconds INTEGER DEFAULT 30,
    retry_on_fail BOOLEAN DEFAULT true,
    continue_on_fail BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(workflow_id, node_id)
);

-- Connexions entre les noeuds (edges dans React Flow)
CREATE TABLE IF NOT EXISTS public.workflow_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,

    -- Connexion source -> target
    edge_id VARCHAR(100) NOT NULL, -- ID React Flow
    source_node_id VARCHAR(100) NOT NULL,
    target_node_id VARCHAR(100) NOT NULL,
    source_handle VARCHAR(50) DEFAULT 'output', -- 'output', 'true', 'false'
    target_handle VARCHAR(50) DEFAULT 'input',

    -- Pour les conditions
    condition_expression TEXT,
    condition_label VARCHAR(100),

    -- Styling
    edge_type VARCHAR(20) DEFAULT 'smoothstep', -- 'smoothstep', 'step', 'straight', 'bezier'
    animated BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(workflow_id, edge_id)
);

-- =====================================================
-- SECTION 3: EXECUTION DES WORKFLOWS
-- =====================================================

-- Historique des executions
CREATE TABLE IF NOT EXISTS public.workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Status
    status workflow_execution_status DEFAULT 'pending',

    -- Trigger info
    triggered_by VARCHAR(50) NOT NULL, -- 'trigger', 'manual', 'api', 'schedule'
    trigger_node_id VARCHAR(100),
    trigger_data JSONB DEFAULT '{}',

    -- Execution data
    variables JSONB DEFAULT '{}',
    context JSONB DEFAULT '{}',

    -- Results
    output_data JSONB DEFAULT '{}',
    error_message TEXT,
    error_stack TEXT,

    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Metadata
    executed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Execution de chaque noeud
CREATE TABLE IF NOT EXISTS public.workflow_node_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
    node_id VARCHAR(100) NOT NULL,

    -- Status
    status node_execution_status DEFAULT 'pending',

    -- Data
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',

    -- Error handling
    error_message TEXT,
    error_stack TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECTION 4: TEMPLATES PRE-CONFIGURES
-- =====================================================

-- Templates de workflows pre-configures
CREATE TABLE IF NOT EXISTS public.workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Peut etre global (NULL) ou specifique a une org
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- 'onboarding', 'retention', 'billing', 'marketing', etc.
    icon VARCHAR(50) DEFAULT 'template',

    -- Template data (React Flow format)
    nodes_config JSONB DEFAULT '[]',
    edges_config JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',

    -- Metadata
    is_official BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECTION 5: LOGS
-- =====================================================

-- Logs detailles des executions
CREATE TABLE IF NOT EXISTS public.workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
    node_id VARCHAR(100),

    -- Log info
    level VARCHAR(20) NOT NULL, -- 'debug', 'info', 'warn', 'error'
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECTION 6: INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_workflows_org ON public.workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON public.workflows(org_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workflows_folder ON public.workflows(folder_id);

CREATE INDEX IF NOT EXISTS idx_workflow_nodes_workflow ON public.workflow_nodes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_type ON public.workflow_nodes(workflow_id, node_type);

CREATE INDEX IF NOT EXISTS idx_workflow_edges_workflow ON public.workflow_edges(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_source ON public.workflow_edges(workflow_id, source_node_id);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON public.workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_org ON public.workflow_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON public.workflow_runs(workflow_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_created ON public.workflow_runs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_node_runs_run ON public.workflow_node_runs(run_id);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_run ON public.workflow_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_created ON public.workflow_logs(created_at DESC);

-- =====================================================
-- SECTION 7: RLS POLICIES
-- =====================================================

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_node_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;

-- Workflows
DROP POLICY IF EXISTS "workflows_staff_select" ON public.workflows;
CREATE POLICY "workflows_staff_select" ON public.workflows
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "workflows_staff_insert" ON public.workflows;
CREATE POLICY "workflows_staff_insert" ON public.workflows
    FOR INSERT WITH CHECK (is_org_staff(org_id));

DROP POLICY IF EXISTS "workflows_staff_update" ON public.workflows;
CREATE POLICY "workflows_staff_update" ON public.workflows
    FOR UPDATE USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "workflows_staff_delete" ON public.workflows;
CREATE POLICY "workflows_staff_delete" ON public.workflows
    FOR DELETE USING (is_org_staff(org_id));

-- Workflow folders
DROP POLICY IF EXISTS "workflow_folders_staff_all" ON public.workflow_folders;
CREATE POLICY "workflow_folders_staff_all" ON public.workflow_folders
    FOR ALL USING (is_org_staff(org_id));

-- Workflow nodes (through workflow)
DROP POLICY IF EXISTS "workflow_nodes_staff_all" ON public.workflow_nodes;
CREATE POLICY "workflow_nodes_staff_all" ON public.workflow_nodes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.workflows w WHERE w.id = workflow_id AND is_org_staff(w.org_id))
    );

-- Workflow edges (through workflow)
DROP POLICY IF EXISTS "workflow_edges_staff_all" ON public.workflow_edges;
CREATE POLICY "workflow_edges_staff_all" ON public.workflow_edges
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.workflows w WHERE w.id = workflow_id AND is_org_staff(w.org_id))
    );

-- Workflow runs
DROP POLICY IF EXISTS "workflow_runs_staff_all" ON public.workflow_runs;
CREATE POLICY "workflow_runs_staff_all" ON public.workflow_runs
    FOR ALL USING (is_org_staff(org_id));

-- Workflow node runs (through run)
DROP POLICY IF EXISTS "workflow_node_runs_staff_all" ON public.workflow_node_runs;
CREATE POLICY "workflow_node_runs_staff_all" ON public.workflow_node_runs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.workflow_runs r WHERE r.id = run_id AND is_org_staff(r.org_id))
    );

-- Templates: voir les templates officiels OU ceux de son org
DROP POLICY IF EXISTS "workflow_templates_select" ON public.workflow_templates;
CREATE POLICY "workflow_templates_select" ON public.workflow_templates
    FOR SELECT USING (org_id IS NULL OR is_org_staff(org_id));

DROP POLICY IF EXISTS "workflow_templates_modify" ON public.workflow_templates;
CREATE POLICY "workflow_templates_modify" ON public.workflow_templates
    FOR ALL USING (org_id IS NOT NULL AND is_org_staff(org_id));

-- Logs (through run)
DROP POLICY IF EXISTS "workflow_logs_staff_all" ON public.workflow_logs;
CREATE POLICY "workflow_logs_staff_all" ON public.workflow_logs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.workflow_runs r WHERE r.id = run_id AND is_org_staff(r.org_id))
    );

-- =====================================================
-- SECTION 8: TRIGGERS
-- =====================================================

-- Create update_updated_at function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update timestamps
DROP TRIGGER IF EXISTS update_workflows_updated_at ON public.workflows;
CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON public.workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_workflow_nodes_updated_at ON public.workflow_nodes;
CREATE TRIGGER update_workflow_nodes_updated_at
    BEFORE UPDATE ON public.workflow_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_workflow_templates_updated_at ON public.workflow_templates;
CREATE TRIGGER update_workflow_templates_updated_at
    BEFORE UPDATE ON public.workflow_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
    FOR EACH ROW EXECUTE FUNCTION update_workflow_stats();

-- =====================================================
-- SECTION 9: SEED DATA - TEMPLATES OFFICIELS MVP
-- =====================================================

INSERT INTO public.workflow_templates (name, description, category, icon, is_official, nodes_config, edges_config)
VALUES
-- Welcome New Member
('Welcome New Member', 'Envoie un email de bienvenue quand un nouveau membre est cree', 'onboarding', 'user-plus', true,
'[
    {"id": "trigger_1", "type": "trigger", "data": {"trigger_type": "member_created", "label": "Nouveau membre"}, "position": {"x": 100, "y": 200}},
    {"id": "delay_1", "type": "action", "data": {"action_type": "delay", "label": "Attendre 1h", "config": {"duration": 3600, "unit": "seconds"}}, "position": {"x": 400, "y": 200}},
    {"id": "email_1", "type": "action", "data": {"action_type": "send_email", "label": "Email bienvenue", "config": {"template": "welcome", "subject": "Bienvenue chez {{org.name}}!"}}, "position": {"x": 700, "y": 200}}
]',
'[
    {"id": "e1", "source": "trigger_1", "target": "delay_1"},
    {"id": "e2", "source": "delay_1", "target": "email_1"}
]'),

-- Subscription Expiring
('Subscription Expiring Soon', 'Alerte 7 jours avant expiration dabonnement', 'billing', 'credit-card', true,
'[
    {"id": "trigger_1", "type": "trigger", "data": {"trigger_type": "subscription_expiring_soon", "label": "Expire dans 7j", "config": {"days_before": 7}}, "position": {"x": 100, "y": 200}},
    {"id": "email_1", "type": "action", "data": {"action_type": "send_email", "label": "Email renouvellement", "config": {"template": "renewal_reminder"}}, "position": {"x": 400, "y": 200}},
    {"id": "notif_1", "type": "action", "data": {"action_type": "send_in_app_notification", "label": "Notification in-app", "config": {"title": "Abonnement bientot expire", "message": "Votre abonnement expire dans 7 jours"}}, "position": {"x": 700, "y": 200}}
]',
'[
    {"id": "e1", "source": "trigger_1", "target": "email_1"},
    {"id": "e2", "source": "email_1", "target": "notif_1"}
]'),

-- Class Reminder
('Class Reminder', 'Rappel 2h avant une seance reservee', 'classes', 'calendar', true,
'[
    {"id": "trigger_1", "type": "trigger", "data": {"trigger_type": "class_starting_soon", "label": "Cours dans 2h", "config": {"hours_before": 2}}, "position": {"x": 100, "y": 200}},
    {"id": "notif_1", "type": "action", "data": {"action_type": "send_in_app_notification", "label": "Notification rappel", "config": {"title": "Seance dans 2h!", "message": "{{class.name}} a {{class.time}}"}}, "position": {"x": 400, "y": 200}}
]',
'[
    {"id": "e1", "source": "trigger_1", "target": "notif_1"}
]'),

-- Personal Record Celebration
('Personal Record Celebration', 'Felicite le membre pour un nouveau PR', 'performance', 'trophy', true,
'[
    {"id": "trigger_1", "type": "trigger", "data": {"trigger_type": "personal_record_achieved", "label": "Nouveau PR!"}, "position": {"x": 100, "y": 200}},
    {"id": "notif_1", "type": "action", "data": {"action_type": "send_in_app_notification", "label": "Notification felicitations", "config": {"title": "Nouveau Record Personnel!", "message": "{{exercise.name}}: {{pr.value}}"}}, "position": {"x": 400, "y": 150}},
    {"id": "email_1", "type": "action", "data": {"action_type": "send_email", "label": "Email felicitations", "config": {"template": "pr_celebration", "subject": "Bravo pour ton nouveau PR!"}}, "position": {"x": 400, "y": 300}}
]',
'[
    {"id": "e1", "source": "trigger_1", "target": "notif_1"},
    {"id": "e2", "source": "trigger_1", "target": "email_1"}
]')

ON CONFLICT DO NOTHING;

-- =====================================================
-- SECTION 10: UTILITY FUNCTIONS
-- =====================================================

-- Fonction pour dupliquer un workflow
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

    -- Copy workflow
    INSERT INTO public.workflows (org_id, name, description, icon, color, canvas_data, settings, created_by)
    VALUES (v_workflow.org_id, p_new_name, v_workflow.description, v_workflow.icon, v_workflow.color,
            v_workflow.canvas_data, v_workflow.settings, p_created_by)
    RETURNING id INTO v_new_workflow_id;

    -- Copy nodes
    INSERT INTO public.workflow_nodes (workflow_id, node_id, node_type, trigger_type, trigger_config, action_type, action_config,
                                       position_x, position_y, width, height, label, description, icon, color,
                                       timeout_seconds, retry_on_fail, continue_on_fail)
    SELECT v_new_workflow_id, node_id, node_type, trigger_type, trigger_config, action_type, action_config,
           position_x, position_y, width, height, label, description, icon, color,
           timeout_seconds, retry_on_fail, continue_on_fail
    FROM public.workflow_nodes WHERE workflow_id = p_workflow_id;

    -- Copy edges
    INSERT INTO public.workflow_edges (workflow_id, edge_id, source_node_id, target_node_id, source_handle, target_handle,
                                       condition_expression, condition_label, edge_type, animated)
    SELECT v_new_workflow_id, edge_id, source_node_id, target_node_id, source_handle, target_handle,
           condition_expression, condition_label, edge_type, animated
    FROM public.workflow_edges WHERE workflow_id = p_workflow_id;

    RETURN v_new_workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
