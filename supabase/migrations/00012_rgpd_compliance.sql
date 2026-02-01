-- =====================================================
-- SKALI PROG V3 - RGPD COMPLIANCE
-- Conformite RGPD pour protection des donnees personnelles
-- =====================================================
-- Date: 2026-02-01
-- Features: Consentements, Export, Suppression, Audit
-- =====================================================

-- =====================================================
-- 1. ENUMS
-- =====================================================

-- Types de consentement
DO $$ BEGIN
    CREATE TYPE consent_type AS ENUM (
        'terms_of_service',      -- CGU
        'privacy_policy',        -- Politique de confidentialite
        'marketing_email',       -- Emails marketing
        'marketing_sms',         -- SMS marketing
        'marketing_push',        -- Push notifications marketing
        'data_analytics',        -- Utilisation pour analytics
        'third_party_sharing',   -- Partage avec tiers (Stripe, etc.)
        'cookies_essential',     -- Cookies essentiels
        'cookies_analytics',     -- Cookies analytics
        'cookies_marketing'      -- Cookies marketing
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Statut des demandes RGPD
DO $$ BEGIN
    CREATE TYPE rgpd_request_status AS ENUM (
        'pending',       -- En attente de traitement
        'processing',    -- En cours de traitement
        'completed',     -- Terminee
        'rejected',      -- Rejetee (motif requis)
        'cancelled'      -- Annulee par le membre
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Type de demande RGPD
DO $$ BEGIN
    CREATE TYPE rgpd_request_type AS ENUM (
        'data_export',           -- Export des donnees (Art. 15 & 20)
        'data_deletion',         -- Suppression (Art. 17)
        'data_rectification',    -- Rectification (Art. 16)
        'processing_restriction',-- Limitation traitement (Art. 18)
        'objection'              -- Opposition (Art. 21)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABLES CONSENTEMENTS
-- =====================================================

-- -----------------------------------------------------
-- member_consents (Historique des consentements)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,

    -- Type et valeur du consentement
    consent_type consent_type NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT false,

    -- Source du consentement
    source TEXT NOT NULL DEFAULT 'web',  -- 'web', 'app', 'paper', 'verbal', 'import'
    ip_address INET,
    user_agent TEXT,

    -- Version du document accepte
    document_version TEXT,
    document_url TEXT,

    -- Dates
    consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,  -- Pour consentements a duree limitee

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_member_consents_org ON public.member_consents(org_id);
CREATE INDEX IF NOT EXISTS idx_member_consents_member ON public.member_consents(member_id);
CREATE INDEX IF NOT EXISTS idx_member_consents_type ON public.member_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_member_consents_granted ON public.member_consents(granted);

-- RLS
ALTER TABLE public.member_consents ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Staff can view consents" ON public.member_consents;
CREATE POLICY "Staff can view consents" ON public.member_consents
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can insert consents" ON public.member_consents;
CREATE POLICY "Staff can insert consents" ON public.member_consents
    FOR INSERT WITH CHECK (is_org_staff(org_id));

-- Members can view their own consents (for portal)
DROP POLICY IF EXISTS "Members can view own consents" ON public.member_consents;
CREATE POLICY "Members can view own consents" ON public.member_consents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = member_consents.member_id
            AND m.user_id = auth.uid()
        )
    );

-- Members can grant/revoke their own consents
DROP POLICY IF EXISTS "Members can manage own consents" ON public.member_consents;
CREATE POLICY "Members can manage own consents" ON public.member_consents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = member_consents.member_id
            AND m.user_id = auth.uid()
        )
    );

-- =====================================================
-- 3. TABLES DEMANDES RGPD
-- =====================================================

-- -----------------------------------------------------
-- rgpd_requests (Demandes d'export, suppression, etc.)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rgpd_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,

    -- Type et statut
    request_type rgpd_request_type NOT NULL,
    status rgpd_request_status NOT NULL DEFAULT 'pending',

    -- Demandeur
    requester_email TEXT NOT NULL,
    requester_name TEXT,

    -- Details
    reason TEXT,  -- Raison de la demande
    scope JSONB DEFAULT '[]'::jsonb,  -- Donnees concernees

    -- Traitement
    processed_by UUID REFERENCES public.profiles(id),
    processed_at TIMESTAMPTZ,
    rejection_reason TEXT,

    -- Resultat (pour export)
    export_file_url TEXT,  -- URL temporaire du fichier export
    export_file_expires_at TIMESTAMPTZ,

    -- Audit
    ip_address INET,
    user_agent TEXT,

    -- Dates legales (30 jours max pour repondre)
    due_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_rgpd_requests_org ON public.rgpd_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_rgpd_requests_member ON public.rgpd_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_rgpd_requests_status ON public.rgpd_requests(status);
CREATE INDEX IF NOT EXISTS idx_rgpd_requests_type ON public.rgpd_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_rgpd_requests_due ON public.rgpd_requests(due_date);

-- RLS
ALTER TABLE public.rgpd_requests ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Staff can view requests" ON public.rgpd_requests;
CREATE POLICY "Staff can view requests" ON public.rgpd_requests
    FOR SELECT USING (is_org_staff(org_id));

DROP POLICY IF EXISTS "Staff can manage requests" ON public.rgpd_requests;
CREATE POLICY "Staff can manage requests" ON public.rgpd_requests
    FOR ALL USING (is_org_staff(org_id));

-- Members can view their own requests
DROP POLICY IF EXISTS "Members can view own requests" ON public.rgpd_requests;
CREATE POLICY "Members can view own requests" ON public.rgpd_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = rgpd_requests.member_id
            AND m.user_id = auth.uid()
        )
    );

-- Members can create requests for themselves
DROP POLICY IF EXISTS "Members can create own requests" ON public.rgpd_requests;
CREATE POLICY "Members can create own requests" ON public.rgpd_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = rgpd_requests.member_id
            AND m.user_id = auth.uid()
        )
    );

-- Members can cancel their own pending requests
DROP POLICY IF EXISTS "Members can cancel own requests" ON public.rgpd_requests;
CREATE POLICY "Members can cancel own requests" ON public.rgpd_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = rgpd_requests.member_id
            AND m.user_id = auth.uid()
        )
        AND status = 'pending'
    );

-- =====================================================
-- 4. TABLES AUDIT RGPD
-- =====================================================

-- -----------------------------------------------------
-- rgpd_audit_log (Journal des acces aux donnees)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rgpd_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Qui
    user_id UUID REFERENCES public.profiles(id),
    member_id UUID REFERENCES public.members(id),

    -- Quoi
    action TEXT NOT NULL,  -- 'view', 'export', 'update', 'delete', 'consent_change'
    entity_type TEXT NOT NULL,  -- 'member', 'subscription', 'payment', etc.
    entity_id UUID,

    -- Details
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,

    -- Quand
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_rgpd_audit_org ON public.rgpd_audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_rgpd_audit_user ON public.rgpd_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_rgpd_audit_member ON public.rgpd_audit_log(member_id);
CREATE INDEX IF NOT EXISTS idx_rgpd_audit_action ON public.rgpd_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_rgpd_audit_date ON public.rgpd_audit_log(created_at);

-- RLS
ALTER TABLE public.rgpd_audit_log ENABLE ROW LEVEL SECURITY;

-- Only staff can view audit logs (via functions for security)
DROP POLICY IF EXISTS "Staff can view audit logs" ON public.rgpd_audit_log;
CREATE POLICY "Staff can view audit logs" ON public.rgpd_audit_log
    FOR SELECT USING (is_org_staff(org_id));

-- Insert via function only (security definer)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.rgpd_audit_log;
CREATE POLICY "System can insert audit logs" ON public.rgpd_audit_log
    FOR INSERT WITH CHECK (is_org_staff(org_id));

-- =====================================================
-- 5. FONCTIONS HELPER
-- =====================================================

-- Function pour obtenir les consentements actifs d'un membre
CREATE OR REPLACE FUNCTION public.get_member_active_consents(p_member_id UUID)
RETURNS TABLE (
    consent_type consent_type,
    granted BOOLEAN,
    consented_at TIMESTAMPTZ,
    document_version TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (mc.consent_type)
        mc.consent_type,
        mc.granted,
        mc.consented_at,
        mc.document_version
    FROM public.member_consents mc
    WHERE mc.member_id = p_member_id
    AND (mc.expires_at IS NULL OR mc.expires_at > NOW())
    ORDER BY mc.consent_type, mc.consented_at DESC;
END;
$$;

-- Function pour verifier un consentement specifique
CREATE OR REPLACE FUNCTION public.has_consent(
    p_member_id UUID,
    p_consent_type consent_type
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_granted BOOLEAN;
BEGIN
    SELECT granted INTO v_granted
    FROM public.member_consents
    WHERE member_id = p_member_id
    AND consent_type = p_consent_type
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY consented_at DESC
    LIMIT 1;

    RETURN COALESCE(v_granted, false);
END;
$$;

-- Function pour enregistrer un consentement
CREATE OR REPLACE FUNCTION public.record_consent(
    p_org_id UUID,
    p_member_id UUID,
    p_consent_type consent_type,
    p_granted BOOLEAN,
    p_source TEXT DEFAULT 'web',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_document_version TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_consent_id UUID;
BEGIN
    INSERT INTO public.member_consents (
        org_id, member_id, consent_type, granted,
        source, ip_address, user_agent, document_version
    )
    VALUES (
        p_org_id, p_member_id, p_consent_type, p_granted,
        p_source, p_ip_address, p_user_agent, p_document_version
    )
    RETURNING id INTO v_consent_id;

    -- Log l'action
    INSERT INTO public.rgpd_audit_log (
        org_id, member_id, action, entity_type, entity_id, details
    )
    VALUES (
        p_org_id,
        p_member_id,
        'consent_change',
        'member_consent',
        v_consent_id,
        jsonb_build_object(
            'consent_type', p_consent_type,
            'granted', p_granted,
            'source', p_source
        )
    );

    RETURN v_consent_id;
END;
$$;

-- Function pour anonymiser un membre (au lieu de supprimer)
CREATE OR REPLACE FUNCTION public.anonymize_member(
    p_member_id UUID,
    p_processed_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_anonymous_id TEXT;
BEGIN
    -- Recuperer l'org_id
    SELECT org_id INTO v_org_id FROM public.members WHERE id = p_member_id;

    IF v_org_id IS NULL THEN
        RETURN false;
    END IF;

    -- Generer un ID anonyme
    v_anonymous_id := 'ANON_' || substr(md5(random()::text), 1, 8);

    -- Anonymiser le membre
    UPDATE public.members
    SET
        first_name = 'Membre',
        last_name = 'Supprime',
        email = v_anonymous_id || '@anonymized.local',
        phone = NULL,
        birth_date = NULL,
        avatar_url = NULL,
        emergency_contact = '{}'::jsonb,
        medical_info = '{}'::jsonb,
        tags = ARRAY[]::TEXT[],
        status = 'archived',
        user_id = NULL,
        member_number = v_anonymous_id,
        updated_at = NOW()
    WHERE id = p_member_id;

    -- Log l'action
    INSERT INTO public.rgpd_audit_log (
        org_id, user_id, member_id, action, entity_type, entity_id, details
    )
    VALUES (
        v_org_id,
        p_processed_by,
        p_member_id,
        'delete',
        'member',
        p_member_id,
        jsonb_build_object(
            'type', 'anonymization',
            'reason', 'RGPD deletion request'
        )
    );

    RETURN true;
END;
$$;

-- Function pour logger un acces aux donnees
CREATE OR REPLACE FUNCTION public.log_data_access(
    p_org_id UUID,
    p_user_id UUID,
    p_member_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.rgpd_audit_log (
        org_id, user_id, member_id, action, entity_type, entity_id,
        details, ip_address, user_agent
    )
    VALUES (
        p_org_id, p_user_id, p_member_id, p_action, p_entity_type, p_entity_id,
        p_details, p_ip_address, p_user_agent
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- =====================================================
-- 6. UPDATED_AT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS update_rgpd_requests_updated_at ON public.rgpd_requests;
CREATE TRIGGER update_rgpd_requests_updated_at
    BEFORE UPDATE ON public.rgpd_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. AJOUT COLONNES RGPD AUX MEMBRES
-- =====================================================

-- Ajouter des champs RGPD a la table members (si pas deja presents)
DO $$
BEGIN
    -- Date de dernier export des donnees
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members' AND column_name = 'last_data_export_at'
    ) THEN
        ALTER TABLE public.members ADD COLUMN last_data_export_at TIMESTAMPTZ;
    END IF;

    -- Date demande de suppression
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members' AND column_name = 'deletion_requested_at'
    ) THEN
        ALTER TABLE public.members ADD COLUMN deletion_requested_at TIMESTAMPTZ;
    END IF;

    -- Date de derniere activite (pour retention)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members' AND column_name = 'last_activity_at'
    ) THEN
        ALTER TABLE public.members ADD COLUMN last_activity_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- =====================================================
-- 8. VUES POUR REPORTING RGPD
-- =====================================================

-- Vue des demandes RGPD en attente
CREATE OR REPLACE VIEW public.v_rgpd_pending_requests AS
SELECT
    r.id,
    r.org_id,
    o.name as org_name,
    r.member_id,
    m.first_name || ' ' || m.last_name as member_name,
    r.request_type,
    r.requester_email,
    r.status,
    r.due_date,
    r.created_at,
    (r.due_date - NOW()) as time_remaining,
    CASE
        WHEN r.due_date < NOW() THEN 'overdue'
        WHEN r.due_date < NOW() + INTERVAL '7 days' THEN 'urgent'
        ELSE 'normal'
    END as urgency
FROM public.rgpd_requests r
JOIN public.organizations o ON o.id = r.org_id
LEFT JOIN public.members m ON m.id = r.member_id
WHERE r.status IN ('pending', 'processing');

-- Vue des statistiques de consentement par org
CREATE OR REPLACE VIEW public.v_rgpd_consent_stats AS
SELECT
    c.org_id,
    c.consent_type,
    COUNT(DISTINCT c.member_id) FILTER (WHERE c.granted = true) as granted_count,
    COUNT(DISTINCT c.member_id) FILTER (WHERE c.granted = false) as revoked_count,
    COUNT(DISTINCT c.member_id) as total_members
FROM (
    SELECT DISTINCT ON (org_id, member_id, consent_type)
        org_id, member_id, consent_type, granted
    FROM public.member_consents
    ORDER BY org_id, member_id, consent_type, consented_at DESC
) c
GROUP BY c.org_id, c.consent_type;
