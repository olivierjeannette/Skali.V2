-- =====================================================
-- SKALI PROG V3 - WORKOUTS SCHEMA
-- Tables pour gestion WODs, exercices et scores
-- =====================================================
-- Date: 2026-01-31
-- Epic 5: Builder de Seances (WOD)
-- =====================================================

-- =====================================================
-- 1. CUSTOM TYPES (ENUMS)
-- =====================================================

-- Types de blocs dans une seance
DO $$ BEGIN
    CREATE TYPE workout_block_type AS ENUM (
        'warmup',
        'skill',
        'strength',
        'wod',
        'cooldown',
        'accessory',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Types de WOD
DO $$ BEGIN
    CREATE TYPE wod_type AS ENUM (
        'amrap',
        'emom',
        'for_time',
        'tabata',
        'rounds',
        'max_reps',
        'max_weight',
        'chipper',
        'ladder',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Categories d'exercices
DO $$ BEGIN
    CREATE TYPE exercise_category AS ENUM (
        'weightlifting',
        'gymnastics',
        'cardio',
        'strongman',
        'core',
        'mobility',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Types de scores
DO $$ BEGIN
    CREATE TYPE score_type AS ENUM (
        'time',
        'reps',
        'rounds_reps',
        'weight',
        'calories',
        'distance',
        'points'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. EXERCISES TABLE (Bibliotheque de mouvements)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Info
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    category exercise_category NOT NULL DEFAULT 'other',

    -- Media
    video_url TEXT,
    image_url TEXT,

    -- Equipment
    equipment TEXT[] DEFAULT '{}',

    -- Flags
    is_global BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Meta
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Contrainte: soit global, soit appartient a une org
    CONSTRAINT exercise_org_or_global CHECK (
        (is_global = true AND org_id IS NULL) OR
        (is_global = false AND org_id IS NOT NULL)
    )
);

-- Index
CREATE INDEX IF NOT EXISTS idx_exercises_org ON public.exercises(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON public.exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_global ON public.exercises(is_global) WHERE is_global = true;

-- RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Anyone can view global exercises" ON public.exercises;
CREATE POLICY "Anyone can view global exercises" ON public.exercises
    FOR SELECT USING (is_global = true);

DROP POLICY IF EXISTS "Staff can view their org exercises" ON public.exercises;
CREATE POLICY "Staff can view their org exercises" ON public.exercises
    FOR SELECT USING (org_id IS NOT NULL AND is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can manage their org exercises" ON public.exercises;
CREATE POLICY "Staff can manage their org exercises" ON public.exercises
    FOR ALL USING (org_id IS NOT NULL AND is_org_staff(org_id));

-- =====================================================
-- 3. WORKOUTS TABLE (Seances/WODs)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Info
    name TEXT NOT NULL,
    description TEXT,
    date DATE,

    -- Flags
    is_template BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,

    -- Meta
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_workouts_org ON public.workouts(org_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON public.workouts(date DESC) WHERE date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workouts_template ON public.workouts(is_template) WHERE is_template = true;

-- RLS
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Staff can view their org workouts" ON public.workouts;
CREATE POLICY "Staff can view their org workouts" ON public.workouts
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can manage their org workouts" ON public.workouts;
CREATE POLICY "Staff can manage their org workouts" ON public.workouts
    FOR ALL USING (is_org_staff(org_id));

-- Members can see published workouts
DROP POLICY IF EXISTS "Members can view published workouts" ON public.workouts;
CREATE POLICY "Members can view published workouts" ON public.workouts
    FOR SELECT USING (
        is_published = true AND
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.org_id = workouts.org_id
            AND m.user_id = auth.uid()
        )
    );

-- =====================================================
-- 4. WORKOUT BLOCKS TABLE (Blocs de seance)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workout_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,

    -- Info
    name TEXT,
    block_type workout_block_type NOT NULL DEFAULT 'wod',
    wod_type wod_type,

    -- Timing
    time_cap INTEGER,
    rounds INTEGER,
    work_time INTEGER,
    rest_time INTEGER,

    -- Display order
    position INTEGER NOT NULL DEFAULT 0,

    -- Notes
    notes TEXT,

    -- Meta
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_workout_blocks_workout ON public.workout_blocks(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_blocks_position ON public.workout_blocks(workout_id, position);

-- RLS
ALTER TABLE public.workout_blocks ENABLE ROW LEVEL SECURITY;

-- Policies (inherits from workout)
DROP POLICY IF EXISTS "Users can view workout blocks" ON public.workout_blocks;
CREATE POLICY "Users can view workout blocks" ON public.workout_blocks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workouts w
            WHERE w.id = workout_blocks.workout_id
            AND (
                is_org_staff(w.org_id) OR
                (w.is_published = true AND EXISTS (
                    SELECT 1 FROM public.members m
                    WHERE m.org_id = w.org_id AND m.user_id = auth.uid()
                ))
            )
        )
    );

DROP POLICY IF EXISTS "Staff can manage workout blocks" ON public.workout_blocks;
CREATE POLICY "Staff can manage workout blocks" ON public.workout_blocks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workouts w
            WHERE w.id = workout_blocks.workout_id
            AND is_org_staff(w.org_id)
        )
    );

-- =====================================================
-- 5. BLOCK EXERCISES TABLE (Exercices dans un bloc)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.block_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES public.workout_blocks(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,

    -- Custom exercise (if not from library)
    custom_name TEXT,

    -- Prescription RX
    reps INTEGER,
    reps_unit TEXT DEFAULT 'reps',
    weight_male DECIMAL(10,2),
    weight_female DECIMAL(10,2),
    weight_unit TEXT DEFAULT 'kg',
    distance INTEGER,
    distance_unit TEXT DEFAULT 'm',
    time_seconds INTEGER,
    calories INTEGER,

    -- Prescription Scaled
    scaled_reps INTEGER,
    scaled_weight_male DECIMAL(10,2),
    scaled_weight_female DECIMAL(10,2),

    -- Display
    position INTEGER NOT NULL DEFAULT 0,
    notes TEXT,

    -- Meta
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_block_exercises_block ON public.block_exercises(block_id);
CREATE INDEX IF NOT EXISTS idx_block_exercises_exercise ON public.block_exercises(exercise_id) WHERE exercise_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_block_exercises_position ON public.block_exercises(block_id, position);

-- RLS
ALTER TABLE public.block_exercises ENABLE ROW LEVEL SECURITY;

-- Policies (inherits from block -> workout)
DROP POLICY IF EXISTS "Users can view block exercises" ON public.block_exercises;
CREATE POLICY "Users can view block exercises" ON public.block_exercises
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workout_blocks b
            JOIN public.workouts w ON w.id = b.workout_id
            WHERE b.id = block_exercises.block_id
            AND (
                is_org_staff(w.org_id) OR
                (w.is_published = true AND EXISTS (
                    SELECT 1 FROM public.members m
                    WHERE m.org_id = w.org_id AND m.user_id = auth.uid()
                ))
            )
        )
    );

DROP POLICY IF EXISTS "Staff can manage block exercises" ON public.block_exercises;
CREATE POLICY "Staff can manage block exercises" ON public.block_exercises
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workout_blocks b
            JOIN public.workouts w ON w.id = b.workout_id
            WHERE b.id = block_exercises.block_id
            AND is_org_staff(w.org_id)
        )
    );

-- =====================================================
-- 6. WORKOUT SCORES TABLE (Scores des membres)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workout_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    block_id UUID REFERENCES public.workout_blocks(id) ON DELETE SET NULL,

    -- Score
    score_type score_type NOT NULL,
    score_value DECIMAL(10,2) NOT NULL,
    score_secondary INTEGER,

    -- Details
    is_rx BOOLEAN DEFAULT true,
    notes TEXT,

    -- Meta
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: one score per member per workout (or block)
    UNIQUE(workout_id, member_id, block_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_workout_scores_workout ON public.workout_scores(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_scores_member ON public.workout_scores(member_id);
CREATE INDEX IF NOT EXISTS idx_workout_scores_recorded ON public.workout_scores(recorded_at DESC);

-- RLS
ALTER TABLE public.workout_scores ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Staff can view all scores in their org" ON public.workout_scores;
CREATE POLICY "Staff can view all scores in their org" ON public.workout_scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workouts w
            WHERE w.id = workout_scores.workout_id
            AND is_org_staff(w.org_id)
        )
    );

DROP POLICY IF EXISTS "Members can view their own scores" ON public.workout_scores;
CREATE POLICY "Members can view their own scores" ON public.workout_scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = workout_scores.member_id
            AND m.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Members can view leaderboard" ON public.workout_scores;
CREATE POLICY "Members can view leaderboard" ON public.workout_scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workouts w
            JOIN public.members m ON m.org_id = w.org_id
            WHERE w.id = workout_scores.workout_id
            AND w.is_published = true
            AND m.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff can manage scores" ON public.workout_scores;
CREATE POLICY "Staff can manage scores" ON public.workout_scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workouts w
            WHERE w.id = workout_scores.workout_id
            AND is_org_staff(w.org_id)
        )
    );

DROP POLICY IF EXISTS "Members can manage their own scores" ON public.workout_scores;
CREATE POLICY "Members can manage their own scores" ON public.workout_scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = workout_scores.member_id
            AND m.user_id = auth.uid()
        )
    );

-- =====================================================
-- 7. PERSONAL RECORDS TABLE (PRs des membres)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.personal_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,

    -- Record
    record_type TEXT NOT NULL,
    record_value DECIMAL(10,2) NOT NULL,
    record_unit TEXT NOT NULL,

    -- Context
    workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
    notes TEXT,

    -- Meta
    achieved_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique: one PR per member per exercise per type
    UNIQUE(member_id, exercise_id, record_type)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_personal_records_member ON public.personal_records(member_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_exercise ON public.personal_records(exercise_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_achieved ON public.personal_records(achieved_at DESC);

-- RLS
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Staff can view PRs in their org" ON public.personal_records;
CREATE POLICY "Staff can view PRs in their org" ON public.personal_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = personal_records.member_id
            AND is_org_staff(m.org_id)
        )
    );

DROP POLICY IF EXISTS "Members can view their own PRs" ON public.personal_records;
CREATE POLICY "Members can view their own PRs" ON public.personal_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = personal_records.member_id
            AND m.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff can manage PRs" ON public.personal_records;
CREATE POLICY "Staff can manage PRs" ON public.personal_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = personal_records.member_id
            AND is_org_staff(m.org_id)
        )
    );

DROP POLICY IF EXISTS "Members can manage their own PRs" ON public.personal_records;
CREATE POLICY "Members can manage their own PRs" ON public.personal_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = personal_records.member_id
            AND m.user_id = auth.uid()
        )
    );

-- =====================================================
-- 8. CLASS-WORKOUT JUNCTION (Lier workout a un cours)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.class_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,

    -- Meta
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique
    UNIQUE(class_id, workout_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_class_workouts_class ON public.class_workouts(class_id);
CREATE INDEX IF NOT EXISTS idx_class_workouts_workout ON public.class_workouts(workout_id);

-- RLS
ALTER TABLE public.class_workouts ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Staff can view class workouts" ON public.class_workouts;
CREATE POLICY "Staff can view class workouts" ON public.class_workouts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = class_workouts.class_id
            AND is_org_staff(c.org_id)
        )
    );

DROP POLICY IF EXISTS "Staff can manage class workouts" ON public.class_workouts;
CREATE POLICY "Staff can manage class workouts" ON public.class_workouts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = class_workouts.class_id
            AND is_org_staff(c.org_id)
        )
    );

-- =====================================================
-- 9. UPDATED_AT TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_exercises_updated_at ON public.exercises;
CREATE TRIGGER update_exercises_updated_at
    BEFORE UPDATE ON public.exercises
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workouts_updated_at ON public.workouts;
CREATE TRIGGER update_workouts_updated_at
    BEFORE UPDATE ON public.workouts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workout_blocks_updated_at ON public.workout_blocks;
CREATE TRIGGER update_workout_blocks_updated_at
    BEFORE UPDATE ON public.workout_blocks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workout_scores_updated_at ON public.workout_scores;
CREATE TRIGGER update_workout_scores_updated_at
    BEFORE UPDATE ON public.workout_scores
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_personal_records_updated_at ON public.personal_records;
CREATE TRIGGER update_personal_records_updated_at
    BEFORE UPDATE ON public.personal_records
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 10. SEED DATA: Global Exercises (Bibliotheque de base)
-- =====================================================

INSERT INTO public.exercises (name, name_en, category, equipment, is_global) VALUES
-- Weightlifting
('Clean', 'Clean', 'weightlifting', '{"barbell"}', true),
('Clean & Jerk', 'Clean & Jerk', 'weightlifting', '{"barbell"}', true),
('Snatch', 'Snatch', 'weightlifting', '{"barbell"}', true),
('Power Clean', 'Power Clean', 'weightlifting', '{"barbell"}', true),
('Power Snatch', 'Power Snatch', 'weightlifting', '{"barbell"}', true),
('Hang Clean', 'Hang Clean', 'weightlifting', '{"barbell"}', true),
('Hang Snatch', 'Hang Snatch', 'weightlifting', '{"barbell"}', true),
('Front Squat', 'Front Squat', 'weightlifting', '{"barbell"}', true),
('Back Squat', 'Back Squat', 'weightlifting', '{"barbell"}', true),
('Overhead Squat', 'Overhead Squat', 'weightlifting', '{"barbell"}', true),
('Deadlift', 'Deadlift', 'weightlifting', '{"barbell"}', true),
('Sumo Deadlift', 'Sumo Deadlift', 'weightlifting', '{"barbell"}', true),
('Push Press', 'Push Press', 'weightlifting', '{"barbell"}', true),
('Push Jerk', 'Push Jerk', 'weightlifting', '{"barbell"}', true),
('Split Jerk', 'Split Jerk', 'weightlifting', '{"barbell"}', true),
('Strict Press', 'Strict Press', 'weightlifting', '{"barbell"}', true),
('Thruster', 'Thruster', 'weightlifting', '{"barbell"}', true),
('Cluster', 'Cluster', 'weightlifting', '{"barbell"}', true),
('Romanian Deadlift', 'Romanian Deadlift', 'weightlifting', '{"barbell"}', true),
('Good Morning', 'Good Morning', 'weightlifting', '{"barbell"}', true),

-- Gymnastics
('Pull-up', 'Pull-up', 'gymnastics', '{"pull-up bar"}', true),
('Chest-to-Bar Pull-up', 'Chest-to-Bar Pull-up', 'gymnastics', '{"pull-up bar"}', true),
('Kipping Pull-up', 'Kipping Pull-up', 'gymnastics', '{"pull-up bar"}', true),
('Butterfly Pull-up', 'Butterfly Pull-up', 'gymnastics', '{"pull-up bar"}', true),
('Muscle-up', 'Muscle-up', 'gymnastics', '{"rings","pull-up bar"}', true),
('Bar Muscle-up', 'Bar Muscle-up', 'gymnastics', '{"pull-up bar"}', true),
('Ring Muscle-up', 'Ring Muscle-up', 'gymnastics', '{"rings"}', true),
('Toes-to-Bar', 'Toes-to-Bar', 'gymnastics', '{"pull-up bar"}', true),
('Knees-to-Elbow', 'Knees-to-Elbow', 'gymnastics', '{"pull-up bar"}', true),
('Handstand Push-up', 'Handstand Push-up', 'gymnastics', '{"wall"}', true),
('Strict Handstand Push-up', 'Strict Handstand Push-up', 'gymnastics', '{"wall"}', true),
('Handstand Walk', 'Handstand Walk', 'gymnastics', '{}', true),
('Dip', 'Dip', 'gymnastics', '{"rings","parallel bars"}', true),
('Ring Dip', 'Ring Dip', 'gymnastics', '{"rings"}', true),
('Push-up', 'Push-up', 'gymnastics', '{}', true),
('Burpee', 'Burpee', 'gymnastics', '{}', true),
('Burpee Over Bar', 'Burpee Over Bar', 'gymnastics', '{"barbell"}', true),
('Box Jump', 'Box Jump', 'cardio', '{"box"}', true),
('Box Jump Over', 'Box Jump Over', 'cardio', '{"box"}', true),
('Step-up', 'Step-up', 'gymnastics', '{"box"}', true),
('Pistol', 'Pistol', 'gymnastics', '{}', true),
('Air Squat', 'Air Squat', 'gymnastics', '{}', true),
('Lunge', 'Lunge', 'gymnastics', '{}', true),
('Walking Lunge', 'Walking Lunge', 'gymnastics', '{}', true),
('Sit-up', 'Sit-up', 'core', '{}', true),
('GHD Sit-up', 'GHD Sit-up', 'core', '{"GHD"}', true),
('V-up', 'V-up', 'core', '{}', true),
('L-sit', 'L-sit', 'gymnastics', '{"rings","parallel bars"}', true),
('Rope Climb', 'Rope Climb', 'gymnastics', '{"rope"}', true),
('Legless Rope Climb', 'Legless Rope Climb', 'gymnastics', '{"rope"}', true),

-- Cardio
('Row', 'Row', 'cardio', '{"rower"}', true),
('Bike', 'Bike', 'cardio', '{"assault bike","echo bike"}', true),
('Ski', 'Ski', 'cardio', '{"ski erg"}', true),
('Run', 'Run', 'cardio', '{}', true),
('Double Under', 'Double Under', 'cardio', '{"jump rope"}', true),
('Single Under', 'Single Under', 'cardio', '{"jump rope"}', true),
('Triple Under', 'Triple Under', 'cardio', '{"jump rope"}', true),

-- Accessories
('Dumbbell Snatch', 'Dumbbell Snatch', 'weightlifting', '{"dumbbell"}', true),
('Dumbbell Clean', 'Dumbbell Clean', 'weightlifting', '{"dumbbell"}', true),
('Dumbbell Thruster', 'Dumbbell Thruster', 'weightlifting', '{"dumbbell"}', true),
('Dumbbell Press', 'Dumbbell Press', 'weightlifting', '{"dumbbell"}', true),
('Kettlebell Swing', 'Kettlebell Swing', 'weightlifting', '{"kettlebell"}', true),
('Kettlebell Snatch', 'Kettlebell Snatch', 'weightlifting', '{"kettlebell"}', true),
('Turkish Get-up', 'Turkish Get-up', 'weightlifting', '{"kettlebell","dumbbell"}', true),
('Goblet Squat', 'Goblet Squat', 'weightlifting', '{"kettlebell","dumbbell"}', true),
('Wall Ball', 'Wall Ball', 'cardio', '{"wall ball"}', true),
('Ball Slam', 'Ball Slam', 'cardio', '{"slam ball"}', true),
('Sled Push', 'Sled Push', 'strongman', '{"sled"}', true),
('Sled Pull', 'Sled Pull', 'strongman', '{"sled"}', true),
('Farmers Carry', 'Farmers Carry', 'strongman', '{"kettlebell","dumbbell"}', true),
('Sandbag Carry', 'Sandbag Carry', 'strongman', '{"sandbag"}', true),
('Atlas Stone', 'Atlas Stone', 'strongman', '{"atlas stone"}', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 11. HELPER FUNCTIONS
-- =====================================================

-- Get workout with all details
CREATE OR REPLACE FUNCTION public.get_workout_details(p_workout_id UUID)
RETURNS TABLE (
    workout_id UUID,
    workout_name TEXT,
    workout_description TEXT,
    workout_date DATE,
    is_published BOOLEAN,
    blocks JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.name,
        w.description,
        w.date,
        w.is_published,
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'id', b.id,
                    'name', b.name,
                    'block_type', b.block_type,
                    'wod_type', b.wod_type,
                    'time_cap', b.time_cap,
                    'rounds', b.rounds,
                    'work_time', b.work_time,
                    'rest_time', b.rest_time,
                    'notes', b.notes,
                    'position', b.position,
                    'exercises', COALESCE(
                        (SELECT jsonb_agg(
                            jsonb_build_object(
                                'id', be.id,
                                'exercise_id', be.exercise_id,
                                'exercise_name', COALESCE(e.name, be.custom_name),
                                'reps', be.reps,
                                'reps_unit', be.reps_unit,
                                'weight_male', be.weight_male,
                                'weight_female', be.weight_female,
                                'weight_unit', be.weight_unit,
                                'distance', be.distance,
                                'distance_unit', be.distance_unit,
                                'time_seconds', be.time_seconds,
                                'calories', be.calories,
                                'notes', be.notes,
                                'position', be.position
                            ) ORDER BY be.position
                        )
                        FROM public.block_exercises be
                        LEFT JOIN public.exercises e ON e.id = be.exercise_id
                        WHERE be.block_id = b.id
                        ), '[]'::jsonb
                    )
                ) ORDER BY b.position
            )
            FROM public.workout_blocks b
            WHERE b.workout_id = w.id
            ), '[]'::jsonb
        ) as blocks
    FROM public.workouts w
    WHERE w.id = p_workout_id;
END;
$$;

-- Get leaderboard for a workout
CREATE OR REPLACE FUNCTION public.get_workout_leaderboard(
    p_workout_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    rank BIGINT,
    member_id UUID,
    member_name TEXT,
    score_value DECIMAL,
    score_type score_type,
    is_rx BOOLEAN,
    recorded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (
            ORDER BY
                ws.is_rx DESC,
                CASE
                    WHEN ws.score_type = 'time' THEN ws.score_value
                    ELSE -ws.score_value
                END
        ) as rank,
        ws.member_id,
        CONCAT(m.first_name, ' ', m.last_name) as member_name,
        ws.score_value,
        ws.score_type,
        ws.is_rx,
        ws.recorded_at
    FROM public.workout_scores ws
    JOIN public.members m ON m.id = ws.member_id
    WHERE ws.workout_id = p_workout_id
    AND ws.block_id IS NULL
    ORDER BY rank
    LIMIT p_limit;
END;
$$;
