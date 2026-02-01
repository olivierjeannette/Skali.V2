-- 00007_teams.sql
-- Teams & Random Draw feature for workouts

-- =====================================================
-- 1. TEAMS TABLE
-- =====================================================
-- Stores team configurations for classes/workouts

CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,

    -- Team info
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6', -- Hex color
    position INTEGER NOT NULL DEFAULT 0, -- Order in list

    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teams_org_id ON teams(org_id);
CREATE INDEX IF NOT EXISTS idx_teams_class_id ON teams(class_id);
CREATE INDEX IF NOT EXISTS idx_teams_workout_id ON teams(workout_id);

-- =====================================================
-- 2. TEAM MEMBERS TABLE
-- =====================================================
-- Links members to teams

CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0, -- Order in team

    -- Optional: assigned equipment/station
    station VARCHAR(50), -- e.g., 'Rower 1', 'Bike 3', 'SkiErg 2'

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(team_id, member_id)
);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member_id ON team_members(member_id);

-- =====================================================
-- 3. CARDIO STATIONS TABLE
-- =====================================================
-- Configurable cardio equipment for the gym

CREATE TABLE IF NOT EXISTS cardio_stations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Station info
    type VARCHAR(50) NOT NULL, -- 'rower', 'assault_bike', 'ski_erg', 'bike_erg', 'treadmill', 'other'
    name VARCHAR(100) NOT NULL, -- e.g., 'Rower 1', 'Assault Bike A'
    position INTEGER NOT NULL DEFAULT 0, -- Order in list
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cardio_stations ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cardio_stations_org_id ON cardio_stations(org_id);
CREATE INDEX IF NOT EXISTS idx_cardio_stations_type ON cardio_stations(type);

-- =====================================================
-- 4. TEAM TEMPLATES TABLE
-- =====================================================
-- Save team configurations as templates for reuse

CREATE TABLE IF NOT EXISTS team_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Template info
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Configuration (stored as JSON)
    config JSONB NOT NULL DEFAULT '{
        "team_count": 2,
        "team_names": ["Team 1", "Team 2"],
        "team_colors": ["#EF4444", "#3B82F6"],
        "balance_by": "random"
    }'::jsonb,

    -- balance_by options: 'random', 'gender', 'skill_level', 'manual'

    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE team_templates ENABLE ROW LEVEL SECURITY;

-- Index
CREATE INDEX IF NOT EXISTS idx_team_templates_org_id ON team_templates(org_id);

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- Teams policies
CREATE POLICY "Staff can view teams in their org"
    ON teams FOR SELECT
    USING (is_org_staff(org_id));

CREATE POLICY "Staff can manage teams in their org"
    ON teams FOR ALL
    USING (is_org_staff(org_id));

-- Team members policies (through teams)
CREATE POLICY "Staff can view team members"
    ON team_members FOR SELECT
    USING (
        team_id IN (
            SELECT id FROM teams WHERE is_org_staff(org_id)
        )
    );

CREATE POLICY "Staff can manage team members"
    ON team_members FOR ALL
    USING (
        team_id IN (
            SELECT id FROM teams WHERE is_org_staff(org_id)
        )
    );

-- Cardio stations policies
CREATE POLICY "Staff can view cardio stations in their org"
    ON cardio_stations FOR SELECT
    USING (is_org_staff(org_id));

CREATE POLICY "Staff can manage cardio stations in their org"
    ON cardio_stations FOR ALL
    USING (is_org_staff(org_id));

-- Team templates policies
CREATE POLICY "Staff can view team templates in their org"
    ON team_templates FOR SELECT
    USING (is_org_staff(org_id));

CREATE POLICY "Staff can manage team templates in their org"
    ON team_templates FOR ALL
    USING (is_org_staff(org_id));

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Auto-update updated_at for teams
CREATE TRIGGER trigger_update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for cardio_stations
CREATE TRIGGER trigger_update_cardio_stations_updated_at
    BEFORE UPDATE ON cardio_stations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for team_templates
CREATE TRIGGER trigger_update_team_templates_updated_at
    BEFORE UPDATE ON team_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. COMMENTS
-- =====================================================

COMMENT ON TABLE teams IS 'Team configurations for classes and workouts';
COMMENT ON TABLE team_members IS 'Links members to teams with optional station assignment';
COMMENT ON TABLE cardio_stations IS 'Cardio equipment inventory for station assignment';
COMMENT ON TABLE team_templates IS 'Reusable team configuration templates';

-- =====================================================
-- 8. DEFAULT CARDIO STATION TYPES
-- =====================================================
-- Note: Insert default stations via application code, not migration
-- Types: rower, assault_bike, ski_erg, bike_erg, echo_bike, treadmill, other
