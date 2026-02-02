-- =====================================================
-- SKALI PROG V3 - TEAMS & TV DISPLAY
-- Migration 007: Teams, stations, TV state
-- =====================================================
-- Requires: 001_base_schema.sql, 005_workouts.sql
-- =====================================================

-- =====================================================
-- 1. TEAMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,

    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    position INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_org_id ON public.teams(org_id);
CREATE INDEX IF NOT EXISTS idx_teams_class_id ON public.teams(class_id);
CREATE INDEX IF NOT EXISTS idx_teams_workout_id ON public.teams(workout_id);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view teams in their org" ON public.teams;
CREATE POLICY "Staff can view teams in their org" ON public.teams
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can manage teams in their org" ON public.teams;
CREATE POLICY "Staff can manage teams in their org" ON public.teams
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- 2. TEAM MEMBERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    station VARCHAR(50),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(team_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member_id ON public.team_members(member_id);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view team members" ON public.team_members;
CREATE POLICY "Staff can view team members" ON public.team_members
    FOR SELECT USING (
        team_id IN (SELECT id FROM public.teams WHERE is_org_staff(org_id))
    );

DROP POLICY IF EXISTS "Staff can manage team members" ON public.team_members;
CREATE POLICY "Staff can manage team members" ON public.team_members
    FOR ALL USING (
        team_id IN (SELECT id FROM public.teams WHERE is_org_staff(org_id))
    );

-- =====================================================
-- 3. CARDIO STATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.cardio_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cardio_stations_org_id ON public.cardio_stations(org_id);
CREATE INDEX IF NOT EXISTS idx_cardio_stations_type ON public.cardio_stations(type);

ALTER TABLE public.cardio_stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view cardio stations in their org" ON public.cardio_stations;
CREATE POLICY "Staff can view cardio stations in their org" ON public.cardio_stations
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can manage cardio stations in their org" ON public.cardio_stations;
CREATE POLICY "Staff can manage cardio stations in their org" ON public.cardio_stations
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- 4. TEAM TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.team_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    description TEXT,

    config JSONB NOT NULL DEFAULT '{
        "team_count": 2,
        "team_names": ["Team 1", "Team 2"],
        "team_colors": ["#EF4444", "#3B82F6"],
        "balance_by": "random"
    }'::jsonb,

    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_templates_org_id ON public.team_templates(org_id);

ALTER TABLE public.team_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view team templates in their org" ON public.team_templates;
CREATE POLICY "Staff can view team templates in their org" ON public.team_templates
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can manage team templates in their org" ON public.team_templates;
CREATE POLICY "Staff can manage team templates in their org" ON public.team_templates
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- 5. TV STATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tv_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    mode VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (mode IN ('waiting', 'workout', 'timer', 'leaderboard', 'teams')),
    workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
    timer_state JSONB,
    teams_data JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id)
);

CREATE INDEX IF NOT EXISTS idx_tv_states_org_id ON public.tv_states(org_id);

ALTER TABLE public.tv_states ENABLE ROW LEVEL SECURITY;

-- TV states are publicly viewable (for TV display)
DROP POLICY IF EXISTS "TV states are viewable by anyone" ON public.tv_states;
CREATE POLICY "TV states are viewable by anyone" ON public.tv_states
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage TV states" ON public.tv_states;
CREATE POLICY "Staff can manage TV states" ON public.tv_states
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cardio_stations_updated_at ON public.cardio_stations;
CREATE TRIGGER update_cardio_stations_updated_at
    BEFORE UPDATE ON public.cardio_stations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_templates_updated_at ON public.team_templates;
CREATE TRIGGER update_team_templates_updated_at
    BEFORE UPDATE ON public.team_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tv_states_updated_at ON public.tv_states;
CREATE TRIGGER update_tv_states_updated_at
    BEFORE UPDATE ON public.tv_states
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. ENABLE REALTIME FOR TV STATES
-- =====================================================

-- Note: This may fail if publication doesn't exist, that's OK
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_states;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON TABLE public.teams IS 'Team configurations for classes and workouts';
COMMENT ON TABLE public.team_members IS 'Links members to teams with optional station assignment';
COMMENT ON TABLE public.cardio_stations IS 'Cardio equipment inventory for station assignment';
COMMENT ON TABLE public.team_templates IS 'Reusable team configuration templates';
COMMENT ON TABLE public.tv_states IS 'Stores the current state of TV displays for each organization';
