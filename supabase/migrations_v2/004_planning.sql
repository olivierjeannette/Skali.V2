-- =====================================================
-- SKALI PROG V3 - PLANNING SCHEMA
-- Migration 004: Classes, templates, bookings
-- =====================================================
-- Requires: 001_base_schema.sql, 003_subscriptions.sql
-- =====================================================

-- =====================================================
-- 1. ENUMS
-- =====================================================

DO $$ BEGIN
    CREATE TYPE class_type AS ENUM ('group', 'private', 'open_gym', 'event', 'workshop');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE class_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('confirmed', 'waitlist', 'cancelled', 'no_show', 'attended');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE recurrence_type AS ENUM ('none', 'daily', 'weekly', 'biweekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. CLASS TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.class_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    class_type class_type NOT NULL DEFAULT 'group',
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    max_participants INTEGER,
    min_participants INTEGER DEFAULT 1,
    color VARCHAR(7) DEFAULT '#3b82f6',
    default_coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    default_location VARCHAR(255),
    requires_subscription BOOLEAN DEFAULT true,
    allowed_plan_types TEXT[],
    session_cost INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_templates_org ON public.class_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_class_templates_active ON public.class_templates(org_id, is_active);

ALTER TABLE public.class_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view class templates of their organizations" ON public.class_templates;
CREATE POLICY "Users can view class templates of their organizations" ON public.class_templates
    FOR SELECT USING (org_id = ANY(get_user_org_ids()));

DROP POLICY IF EXISTS "Staff can manage class templates" ON public.class_templates;
CREATE POLICY "Staff can manage class templates" ON public.class_templates
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- 3. CLASSES (instances)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.class_templates(id) ON DELETE SET NULL,
    workout_id UUID, -- Will be linked after workouts table exists
    name VARCHAR(255) NOT NULL,
    description TEXT,
    class_type class_type NOT NULL DEFAULT 'group',
    status class_status NOT NULL DEFAULT 'scheduled',

    -- Timing
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,

    -- Capacity
    max_participants INTEGER,
    min_participants INTEGER DEFAULT 1,
    current_participants INTEGER DEFAULT 0,
    waitlist_count INTEGER DEFAULT 0,

    -- Staff
    coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assistant_coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Location
    location VARCHAR(255),
    room VARCHAR(100),

    -- Styling
    color VARCHAR(7) DEFAULT '#3b82f6',

    -- Recurrence
    recurrence_type recurrence_type DEFAULT 'none',
    recurrence_id UUID,
    recurrence_end_date DATE,

    -- Pricing
    requires_subscription BOOLEAN DEFAULT true,
    drop_in_price DECIMAL(10,2),
    session_cost INTEGER DEFAULT 1,
    allowed_plan_types TEXT[],

    -- Notes
    notes TEXT,
    cancelled_reason TEXT,
    cancelled_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_org ON public.classes(org_id);
CREATE INDEX IF NOT EXISTS idx_classes_start ON public.classes(org_id, start_time);
CREATE INDEX IF NOT EXISTS idx_classes_coach ON public.classes(coach_id);
CREATE INDEX IF NOT EXISTS idx_classes_template ON public.classes(template_id);
CREATE INDEX IF NOT EXISTS idx_classes_recurrence ON public.classes(recurrence_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON public.classes(org_id, status);
CREATE INDEX IF NOT EXISTS idx_classes_workout ON public.classes(workout_id);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view classes of their organizations" ON public.classes;
CREATE POLICY "Users can view classes of their organizations" ON public.classes
    FOR SELECT USING (org_id = ANY(get_user_org_ids()));

DROP POLICY IF EXISTS "Staff can manage classes" ON public.classes;
CREATE POLICY "Staff can manage classes" ON public.classes
    FOR ALL USING (is_org_staff(org_id));

-- =====================================================
-- 4. BOOKINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,

    status booking_status NOT NULL DEFAULT 'confirmed',
    waitlist_position INTEGER,

    -- Check-in
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- For drop-in
    is_drop_in BOOLEAN DEFAULT false,
    drop_in_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,

    -- Tracking
    sessions_deducted INTEGER DEFAULT 0,
    cancelled_at TIMESTAMPTZ,
    cancelled_reason TEXT,
    no_show_at TIMESTAMPTZ,

    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(class_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_class ON public.bookings(class_id);
CREATE INDEX IF NOT EXISTS idx_bookings_member ON public.bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_bookings_subscription ON public.bookings(subscription_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(class_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_org ON public.bookings(org_id);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view bookings of their organizations" ON public.bookings;
CREATE POLICY "Users can view bookings of their organizations" ON public.bookings
    FOR SELECT USING (org_id = ANY(get_user_org_ids()));

DROP POLICY IF EXISTS "Staff can manage bookings" ON public.bookings;
CREATE POLICY "Staff can manage bookings" ON public.bookings
    FOR ALL USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Members can view own bookings" ON public.bookings;
CREATE POLICY "Members can view own bookings" ON public.bookings
    FOR SELECT USING (is_member_self(member_id));

-- =====================================================
-- 5. WAITLIST HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS public.waitlist_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,

    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    position_at_join INTEGER NOT NULL,
    promoted_at TIMESTAMPTZ,
    removed_at TIMESTAMPTZ,
    removal_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_waitlist_booking ON public.waitlist_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_class ON public.waitlist_history(class_id);

ALTER TABLE public.waitlist_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view waitlist history of their organizations" ON public.waitlist_history;
CREATE POLICY "Users can view waitlist history of their organizations" ON public.waitlist_history
    FOR SELECT USING (
        class_id IN (SELECT id FROM public.classes WHERE org_id = ANY(get_user_org_ids()))
    );

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_class_templates_updated_at ON public.class_templates;
CREATE TRIGGER update_class_templates_updated_at
    BEFORE UPDATE ON public.class_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_classes_updated_at ON public.classes;
CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. BOOKING FUNCTIONS
-- =====================================================

-- Update participant count
CREATE OR REPLACE FUNCTION public.update_class_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'confirmed' THEN
            UPDATE public.classes SET current_participants = current_participants + 1 WHERE id = NEW.class_id;
        ELSIF NEW.status = 'waitlist' THEN
            UPDATE public.classes SET waitlist_count = waitlist_count + 1 WHERE id = NEW.class_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
            UPDATE public.classes SET current_participants = current_participants - 1 WHERE id = NEW.class_id;
        END IF;
        IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
            UPDATE public.classes SET current_participants = current_participants + 1 WHERE id = NEW.class_id;
        END IF;
        IF OLD.status = 'waitlist' AND NEW.status != 'waitlist' THEN
            UPDATE public.classes SET waitlist_count = waitlist_count - 1 WHERE id = NEW.class_id;
        END IF;
        IF OLD.status != 'waitlist' AND NEW.status = 'waitlist' THEN
            UPDATE public.classes SET waitlist_count = waitlist_count + 1 WHERE id = NEW.class_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.status = 'confirmed' THEN
            UPDATE public.classes SET current_participants = current_participants - 1 WHERE id = OLD.class_id;
        ELSIF OLD.status = 'waitlist' THEN
            UPDATE public.classes SET waitlist_count = waitlist_count - 1 WHERE id = OLD.class_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS booking_participant_count ON public.bookings;
CREATE TRIGGER booking_participant_count
    AFTER INSERT OR UPDATE OR DELETE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_class_participant_count();

-- Check availability before booking
CREATE OR REPLACE FUNCTION public.check_booking_availability()
RETURNS TRIGGER AS $$
DECLARE
    class_record RECORD;
BEGIN
    SELECT * INTO class_record FROM public.classes WHERE id = NEW.class_id;

    IF class_record IS NULL THEN
        RAISE EXCEPTION 'Class not found';
    END IF;

    IF class_record.status = 'cancelled' THEN
        RAISE EXCEPTION 'This class has been cancelled';
    END IF;

    IF class_record.status = 'completed' THEN
        RAISE EXCEPTION 'This class is already completed';
    END IF;

    IF class_record.max_participants IS NOT NULL AND NEW.status = 'confirmed' THEN
        IF class_record.current_participants >= class_record.max_participants THEN
            NEW.status := 'waitlist';
            NEW.waitlist_position := class_record.waitlist_count + 1;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_booking_before_insert ON public.bookings;
CREATE TRIGGER check_booking_before_insert
    BEFORE INSERT ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.check_booking_availability();

-- Promote from waitlist
CREATE OR REPLACE FUNCTION public.promote_from_waitlist()
RETURNS TRIGGER AS $$
DECLARE
    next_waitlist RECORD;
BEGIN
    IF OLD.status = 'confirmed' AND NEW.status IN ('cancelled', 'no_show') THEN
        SELECT * INTO next_waitlist
        FROM public.bookings
        WHERE class_id = NEW.class_id AND status = 'waitlist'
        ORDER BY waitlist_position ASC
        LIMIT 1;

        IF next_waitlist IS NOT NULL THEN
            UPDATE public.bookings
            SET status = 'confirmed', waitlist_position = NULL
            WHERE id = next_waitlist.id;

            UPDATE public.waitlist_history
            SET promoted_at = NOW()
            WHERE booking_id = next_waitlist.id AND promoted_at IS NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS promote_waitlist_after_cancel ON public.bookings;
CREATE TRIGGER promote_waitlist_after_cancel
    AFTER UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.promote_from_waitlist();

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Get classes for a period
CREATE OR REPLACE FUNCTION public.get_classes_for_period(
    p_org_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS SETOF public.classes AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.classes
    WHERE org_id = p_org_id
      AND start_time >= p_start_date
      AND start_time < (p_end_date + INTERVAL '1 day')
    ORDER BY start_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if member can book a class
CREATE OR REPLACE FUNCTION public.can_member_book_class(
    p_member_id UUID,
    p_class_id UUID
)
RETURNS TABLE (
    can_book BOOLEAN,
    reason TEXT,
    use_subscription_id UUID
) AS $$
DECLARE
    v_class RECORD;
    v_subscription RECORD;
    v_existing_booking RECORD;
BEGIN
    SELECT * INTO v_class FROM public.classes WHERE id = p_class_id;
    IF v_class IS NULL THEN
        RETURN QUERY SELECT false, 'Class not found'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    SELECT * INTO v_existing_booking
    FROM public.bookings
    WHERE class_id = p_class_id AND member_id = p_member_id AND status NOT IN ('cancelled', 'no_show');

    IF v_existing_booking IS NOT NULL THEN
        RETURN QUERY SELECT false, 'Already booked for this class'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    IF v_class.status = 'cancelled' THEN
        RETURN QUERY SELECT false, 'Class cancelled'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    IF v_class.status = 'completed' THEN
        RETURN QUERY SELECT false, 'Class completed'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    IF v_class.requires_subscription THEN
        SELECT * INTO v_subscription
        FROM public.subscriptions
        WHERE member_id = p_member_id
          AND status = 'active'
          AND (end_date IS NULL OR end_date >= CURRENT_DATE)
          AND (sessions_total IS NULL OR sessions_used < sessions_total)
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_subscription IS NULL THEN
            IF v_class.drop_in_price IS NOT NULL THEN
                RETURN QUERY SELECT true, 'Drop-in available'::TEXT, NULL::UUID;
                RETURN;
            ELSE
                RETURN QUERY SELECT false, 'Subscription required'::TEXT, NULL::UUID;
                RETURN;
            END IF;
        END IF;

        RETURN QUERY SELECT true, 'OK'::TEXT, v_subscription.id;
        RETURN;
    END IF;

    RETURN QUERY SELECT true, 'OK'::TEXT, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
