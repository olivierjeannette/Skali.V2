-- 00006_tv_display.sql
-- TV Display feature - state management for TV screens

-- TV States table for controlling TV displays
CREATE TABLE IF NOT EXISTS tv_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mode VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (mode IN ('waiting', 'workout', 'timer', 'leaderboard', 'teams')),
    workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
    timer_state JSONB,
    teams_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id)
);

-- Enable RLS
ALTER TABLE tv_states ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read TV states (public display)
CREATE POLICY "TV states are viewable by anyone"
    ON tv_states FOR SELECT
    USING (true);

-- Policy: Organization members can update TV states
CREATE POLICY "Organization members can update TV states"
    ON tv_states FOR UPDATE
    USING (
        org_id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: Organization members can insert TV states
CREATE POLICY "Organization members can insert TV states"
    ON tv_states FOR INSERT
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: Organization members can delete TV states
CREATE POLICY "Organization members can delete TV states"
    ON tv_states FOR DELETE
    USING (
        org_id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tv_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tv_states_updated_at
    BEFORE UPDATE ON tv_states
    FOR EACH ROW
    EXECUTE FUNCTION update_tv_states_updated_at();

-- Enable realtime for TV states (for live sync)
ALTER PUBLICATION supabase_realtime ADD TABLE tv_states;

-- Index for quick lookup by org
CREATE INDEX IF NOT EXISTS idx_tv_states_org_id ON tv_states(org_id);

-- Add class_workouts table for linking workouts to classes (if not exists)
CREATE TABLE IF NOT EXISTS class_workouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, workout_id)
);

-- Enable RLS on class_workouts
ALTER TABLE class_workouts ENABLE ROW LEVEL SECURITY;

-- Policy: Organization members can manage class_workouts
CREATE POLICY "Organization members can view class_workouts"
    ON class_workouts FOR SELECT
    USING (
        class_id IN (
            SELECT id FROM classes WHERE org_id IN (
                SELECT org_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Organization members can insert class_workouts"
    ON class_workouts FOR INSERT
    WITH CHECK (
        class_id IN (
            SELECT id FROM classes WHERE org_id IN (
                SELECT org_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Organization members can delete class_workouts"
    ON class_workouts FOR DELETE
    USING (
        class_id IN (
            SELECT id FROM classes WHERE org_id IN (
                SELECT org_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Index for class_workouts lookups
CREATE INDEX IF NOT EXISTS idx_class_workouts_class_id ON class_workouts(class_id);
CREATE INDEX IF NOT EXISTS idx_class_workouts_workout_id ON class_workouts(workout_id);

COMMENT ON TABLE tv_states IS 'Stores the current state of TV displays for each organization';
COMMENT ON TABLE class_workouts IS 'Links workouts to specific class sessions';
