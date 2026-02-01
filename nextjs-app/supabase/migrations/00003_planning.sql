-- ============================================
-- PLANNING (Classes, Reservations)
-- ============================================

-- Enums
CREATE TYPE class_type AS ENUM ('group', 'private', 'open_gym', 'event', 'workshop');
CREATE TYPE class_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE booking_status AS ENUM ('confirmed', 'waitlist', 'cancelled', 'no_show', 'attended');
CREATE TYPE recurrence_type AS ENUM ('none', 'daily', 'weekly', 'biweekly', 'monthly');

-- ============================================
-- Class Templates (modeles de cours)
-- ============================================
CREATE TABLE class_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    class_type class_type NOT NULL DEFAULT 'group',
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    max_participants INTEGER,
    min_participants INTEGER DEFAULT 1,
    color VARCHAR(7) DEFAULT '#3b82f6', -- Couleur pour le calendrier
    default_coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    default_location VARCHAR(255),
    requires_subscription BOOLEAN DEFAULT true,
    allowed_plan_types TEXT[], -- Types de plans autorises
    session_cost INTEGER DEFAULT 1, -- Nombre de seances deduites
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Classes (instances de cours)
-- ============================================
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES class_templates(id) ON DELETE SET NULL,
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
    coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assistant_coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

    -- Location
    location VARCHAR(255),
    room VARCHAR(100),

    -- Styling
    color VARCHAR(7) DEFAULT '#3b82f6',

    -- Recurrence
    recurrence_type recurrence_type DEFAULT 'none',
    recurrence_id UUID, -- Grouper les classes recurrentes
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

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Bookings (reservations)
-- ============================================
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    status booking_status NOT NULL DEFAULT 'confirmed',
    waitlist_position INTEGER,

    -- Check-in
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    -- For drop-in (sans abonnement)
    is_drop_in BOOLEAN DEFAULT false,
    drop_in_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,

    -- Tracking
    sessions_deducted INTEGER DEFAULT 0,
    cancelled_at TIMESTAMPTZ,
    cancelled_reason TEXT,
    no_show_at TIMESTAMPTZ,

    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Un membre ne peut pas reserver deux fois le meme cours
    UNIQUE(class_id, member_id)
);

-- ============================================
-- Wait List History (historique liste d'attente)
-- ============================================
CREATE TABLE waitlist_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    position_at_join INTEGER NOT NULL,
    promoted_at TIMESTAMPTZ,
    removed_at TIMESTAMPTZ,
    removal_reason TEXT
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_class_templates_org ON class_templates(org_id);
CREATE INDEX idx_class_templates_active ON class_templates(org_id, is_active);

CREATE INDEX idx_classes_org ON classes(org_id);
CREATE INDEX idx_classes_start ON classes(org_id, start_time);
CREATE INDEX idx_classes_coach ON classes(coach_id);
CREATE INDEX idx_classes_template ON classes(template_id);
CREATE INDEX idx_classes_recurrence ON classes(recurrence_id);
CREATE INDEX idx_classes_status ON classes(org_id, status);

CREATE INDEX idx_bookings_class ON bookings(class_id);
CREATE INDEX idx_bookings_member ON bookings(member_id);
CREATE INDEX idx_bookings_subscription ON bookings(subscription_id);
CREATE INDEX idx_bookings_status ON bookings(class_id, status);
CREATE INDEX idx_bookings_org ON bookings(org_id);

CREATE INDEX idx_waitlist_booking ON waitlist_history(booking_id);
CREATE INDEX idx_waitlist_class ON waitlist_history(class_id);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE class_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_history ENABLE ROW LEVEL SECURITY;

-- Class Templates policies
CREATE POLICY "Users can view class templates of their organizations"
    ON class_templates FOR SELECT
    USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Staff can manage class templates"
    ON class_templates FOR ALL
    USING (is_org_staff(org_id));

-- Classes policies
CREATE POLICY "Users can view classes of their organizations"
    ON classes FOR SELECT
    USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Staff can manage classes"
    ON classes FOR ALL
    USING (is_org_staff(org_id));

-- Bookings policies
CREATE POLICY "Users can view bookings of their organizations"
    ON bookings FOR SELECT
    USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Staff can manage bookings"
    ON bookings FOR ALL
    USING (is_org_staff(org_id));

-- Members can view and manage their own bookings
CREATE POLICY "Members can view own bookings"
    ON bookings FOR SELECT
    USING (
        member_id IN (
            SELECT id FROM members
            WHERE user_id = auth.uid()
        )
    );

-- Waitlist History policies
CREATE POLICY "Users can view waitlist history of their organizations"
    ON waitlist_history FOR SELECT
    USING (
        class_id IN (
            SELECT id FROM classes
            WHERE org_id IN (SELECT get_user_org_ids())
        )
    );

-- ============================================
-- Triggers
-- ============================================

-- Update timestamps
CREATE TRIGGER update_class_templates_updated_at
    BEFORE UPDATE ON class_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Functions
-- ============================================

-- Mettre a jour le compteur de participants
CREATE OR REPLACE FUNCTION update_class_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'confirmed' THEN
            UPDATE classes
            SET current_participants = current_participants + 1
            WHERE id = NEW.class_id;
        ELSIF NEW.status = 'waitlist' THEN
            UPDATE classes
            SET waitlist_count = waitlist_count + 1
            WHERE id = NEW.class_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- De confirmed a autre chose
        IF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
            UPDATE classes
            SET current_participants = current_participants - 1
            WHERE id = NEW.class_id;
        END IF;
        -- De autre chose a confirmed
        IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
            UPDATE classes
            SET current_participants = current_participants + 1
            WHERE id = NEW.class_id;
        END IF;
        -- De waitlist a autre chose
        IF OLD.status = 'waitlist' AND NEW.status != 'waitlist' THEN
            UPDATE classes
            SET waitlist_count = waitlist_count - 1
            WHERE id = NEW.class_id;
        END IF;
        -- De autre chose a waitlist
        IF OLD.status != 'waitlist' AND NEW.status = 'waitlist' THEN
            UPDATE classes
            SET waitlist_count = waitlist_count + 1
            WHERE id = NEW.class_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.status = 'confirmed' THEN
            UPDATE classes
            SET current_participants = current_participants - 1
            WHERE id = OLD.class_id;
        ELSIF OLD.status = 'waitlist' THEN
            UPDATE classes
            SET waitlist_count = waitlist_count - 1
            WHERE id = OLD.class_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER booking_participant_count
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_class_participant_count();

-- Verifier la disponibilite avant reservation
CREATE OR REPLACE FUNCTION check_booking_availability()
RETURNS TRIGGER AS $$
DECLARE
    class_record RECORD;
    member_sub RECORD;
BEGIN
    -- Recuperer les infos du cours
    SELECT * INTO class_record FROM classes WHERE id = NEW.class_id;

    IF class_record IS NULL THEN
        RAISE EXCEPTION 'Cours introuvable';
    END IF;

    -- Verifier que le cours n'est pas annule
    IF class_record.status = 'cancelled' THEN
        RAISE EXCEPTION 'Ce cours a ete annule';
    END IF;

    -- Verifier que le cours n'est pas termine
    IF class_record.status = 'completed' THEN
        RAISE EXCEPTION 'Ce cours est deja termine';
    END IF;

    -- Verifier la capacite
    IF class_record.max_participants IS NOT NULL AND NEW.status = 'confirmed' THEN
        IF class_record.current_participants >= class_record.max_participants THEN
            -- Mettre en liste d'attente
            NEW.status := 'waitlist';
            NEW.waitlist_position := class_record.waitlist_count + 1;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_booking_before_insert
    BEFORE INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION check_booking_availability();

-- Promouvoir depuis la liste d'attente
CREATE OR REPLACE FUNCTION promote_from_waitlist()
RETURNS TRIGGER AS $$
DECLARE
    next_waitlist RECORD;
BEGIN
    -- Seulement si une place se libere (de confirmed a cancelled/no_show)
    IF OLD.status = 'confirmed' AND NEW.status IN ('cancelled', 'no_show') THEN
        -- Trouver le premier sur la liste d'attente
        SELECT * INTO next_waitlist
        FROM bookings
        WHERE class_id = NEW.class_id
          AND status = 'waitlist'
        ORDER BY waitlist_position ASC
        LIMIT 1;

        IF next_waitlist IS NOT NULL THEN
            -- Promouvoir
            UPDATE bookings
            SET status = 'confirmed',
                waitlist_position = NULL
            WHERE id = next_waitlist.id;

            -- Enregistrer dans l'historique
            UPDATE waitlist_history
            SET promoted_at = now()
            WHERE booking_id = next_waitlist.id
              AND promoted_at IS NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER promote_waitlist_after_cancel
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION promote_from_waitlist();

-- ============================================
-- Helper Functions
-- ============================================

-- Recuperer les classes pour une periode
CREATE OR REPLACE FUNCTION get_classes_for_period(
    p_org_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS SETOF classes AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM classes
    WHERE org_id = p_org_id
      AND start_time >= p_start_date
      AND start_time < (p_end_date + INTERVAL '1 day')
    ORDER BY start_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recuperer les reservations d'un membre
CREATE OR REPLACE FUNCTION get_member_bookings(
    p_member_id UUID,
    p_status booking_status DEFAULT NULL
)
RETURNS TABLE (
    booking_id UUID,
    class_name VARCHAR,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status booking_status,
    coach_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id as booking_id,
        c.name as class_name,
        c.start_time,
        c.end_time,
        b.status,
        p.full_name as coach_name
    FROM bookings b
    JOIN classes c ON c.id = b.class_id
    LEFT JOIN profiles p ON p.id = c.coach_id
    WHERE b.member_id = p_member_id
      AND (p_status IS NULL OR b.status = p_status)
    ORDER BY c.start_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verifier si un membre peut reserver un cours
CREATE OR REPLACE FUNCTION can_member_book_class(
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
    v_member RECORD;
    v_subscription RECORD;
    v_existing_booking RECORD;
BEGIN
    -- Recuperer le cours
    SELECT * INTO v_class FROM classes WHERE id = p_class_id;
    IF v_class IS NULL THEN
        RETURN QUERY SELECT false, 'Cours introuvable'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Verifier si deja reserve
    SELECT * INTO v_existing_booking
    FROM bookings
    WHERE class_id = p_class_id
      AND member_id = p_member_id
      AND status NOT IN ('cancelled', 'no_show');

    IF v_existing_booking IS NOT NULL THEN
        RETURN QUERY SELECT false, 'Deja inscrit a ce cours'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Verifier le statut du cours
    IF v_class.status = 'cancelled' THEN
        RETURN QUERY SELECT false, 'Cours annule'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    IF v_class.status = 'completed' THEN
        RETURN QUERY SELECT false, 'Cours termine'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Verifier si un abonnement est requis
    IF v_class.requires_subscription THEN
        -- Chercher un abonnement actif
        SELECT * INTO v_subscription
        FROM subscriptions
        WHERE member_id = p_member_id
          AND status = 'active'
          AND (end_date IS NULL OR end_date >= CURRENT_DATE)
          AND (sessions_total IS NULL OR sessions_used < sessions_total)
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_subscription IS NULL THEN
            IF v_class.drop_in_price IS NOT NULL THEN
                RETURN QUERY SELECT true, 'Drop-in disponible'::TEXT, NULL::UUID;
                RETURN;
            ELSE
                RETURN QUERY SELECT false, 'Abonnement requis'::TEXT, NULL::UUID;
                RETURN;
            END IF;
        END IF;

        RETURN QUERY SELECT true, 'OK'::TEXT, v_subscription.id;
        RETURN;
    END IF;

    -- Pas d'abonnement requis
    RETURN QUERY SELECT true, 'OK'::TEXT, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
