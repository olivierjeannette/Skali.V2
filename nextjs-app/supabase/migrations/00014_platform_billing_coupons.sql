-- =====================================================
-- 00014 - Platform Billing & Coupons
-- Session 20
-- =====================================================

-- -----------------------------------------------------
-- Platform Subscriptions Table (salles)
-- Historique des abonnements platform pour chaque org
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS platform_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES platform_plans(id),

  -- Stripe data
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')),

  -- Dates
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  -- Billing
  billing_cycle_anchor TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,

  -- Coupon applied
  coupon_id UUID REFERENCES platform_coupons(id),
  discount_percent NUMERIC(5,2),
  discount_amount_cents INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_org ON platform_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_stripe ON platform_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_status ON platform_subscriptions(status);

-- -----------------------------------------------------
-- Platform Coupons Table
-- Codes promo pour les abonnements platform
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS platform_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Code & Name
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,

  -- Stripe data
  stripe_coupon_id TEXT UNIQUE,
  stripe_promotion_code_id TEXT,

  -- Discount type
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed_amount')),
  discount_percent NUMERIC(5,2), -- For percent type (0-100)
  discount_amount_cents INTEGER, -- For fixed_amount type
  currency TEXT DEFAULT 'eur',

  -- Duration
  duration TEXT NOT NULL DEFAULT 'once' CHECK (duration IN ('once', 'repeating', 'forever')),
  duration_in_months INTEGER, -- For repeating duration

  -- Restrictions
  max_redemptions INTEGER, -- NULL = unlimited
  redemption_count INTEGER DEFAULT 0,
  applies_to_plans UUID[], -- NULL = all plans
  first_time_only BOOLEAN DEFAULT false,
  minimum_amount_cents INTEGER, -- Minimum order amount

  -- Validity
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_platform_coupons_code ON platform_coupons(code);
CREATE INDEX IF NOT EXISTS idx_platform_coupons_active ON platform_coupons(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_platform_coupons_stripe ON platform_coupons(stripe_coupon_id);

-- -----------------------------------------------------
-- Coupon Redemptions Table
-- Track which orgs used which coupons
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES platform_coupons(id),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES platform_subscriptions(id),

  -- Discount applied
  discount_applied_cents INTEGER NOT NULL,

  -- Timestamps
  redeemed_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(coupon_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_org ON coupon_redemptions(org_id);

-- -----------------------------------------------------
-- Platform Invoices Table
-- Historique des factures platform
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS platform_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES platform_subscriptions(id),

  -- Stripe data
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_hosted_invoice_url TEXT,
  stripe_invoice_pdf TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),

  -- Amounts (in cents)
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents INTEGER DEFAULT 0,
  amount_due_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'eur',

  -- Dates
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Details
  description TEXT,
  invoice_number TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_invoices_org ON platform_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_stripe ON platform_invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_status ON platform_invoices(status);

-- -----------------------------------------------------
-- Billing Contacts (if different from owner)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS billing_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,

  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,

  -- Address (for invoicing)
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'FR',

  -- VAT
  vat_number TEXT,
  company_name TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------------
-- Functions
-- -----------------------------------------------------

-- Function to validate and apply a coupon
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code TEXT,
  p_org_id UUID,
  p_plan_id UUID DEFAULT NULL
) RETURNS TABLE (
  is_valid BOOLEAN,
  coupon_id UUID,
  discount_type TEXT,
  discount_percent NUMERIC,
  discount_amount_cents INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_coupon RECORD;
  v_already_used BOOLEAN;
BEGIN
  -- Get coupon
  SELECT * INTO v_coupon
  FROM platform_coupons
  WHERE code = UPPER(p_code)
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER, 'Code promo invalide';
    RETURN;
  END IF;

  -- Check validity dates
  IF v_coupon.valid_from > now() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER, 'Code promo pas encore actif';
    RETURN;
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER, 'Code promo expire';
    RETURN;
  END IF;

  -- Check max redemptions
  IF v_coupon.max_redemptions IS NOT NULL AND v_coupon.redemption_count >= v_coupon.max_redemptions THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER, 'Code promo epuise';
    RETURN;
  END IF;

  -- Check if already used by this org
  SELECT EXISTS(
    SELECT 1 FROM coupon_redemptions WHERE coupon_id = v_coupon.id AND org_id = p_org_id
  ) INTO v_already_used;

  IF v_already_used THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER, 'Code deja utilise';
    RETURN;
  END IF;

  -- Check first_time_only
  IF v_coupon.first_time_only THEN
    IF EXISTS(SELECT 1 FROM platform_subscriptions WHERE org_id = p_org_id AND status != 'trialing') THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER, 'Code reserve aux nouveaux abonnes';
      RETURN;
    END IF;
  END IF;

  -- Check applies_to_plans
  IF v_coupon.applies_to_plans IS NOT NULL AND p_plan_id IS NOT NULL THEN
    IF NOT (p_plan_id = ANY(v_coupon.applies_to_plans)) THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER, 'Code non applicable a ce plan';
      RETURN;
    END IF;
  END IF;

  -- Valid!
  RETURN QUERY SELECT
    true,
    v_coupon.id,
    v_coupon.discount_type,
    v_coupon.discount_percent,
    v_coupon.discount_amount_cents,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to redeem a coupon
CREATE OR REPLACE FUNCTION redeem_coupon(
  p_coupon_id UUID,
  p_org_id UUID,
  p_subscription_id UUID,
  p_discount_applied_cents INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  -- Insert redemption
  INSERT INTO coupon_redemptions (coupon_id, org_id, subscription_id, discount_applied_cents)
  VALUES (p_coupon_id, p_org_id, p_subscription_id, p_discount_applied_cents);

  -- Increment redemption count
  UPDATE platform_coupons
  SET redemption_count = redemption_count + 1, updated_at = now()
  WHERE id = p_coupon_id;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- RLS Policies
-- -----------------------------------------------------

ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_contacts ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything
CREATE POLICY "Super admin full access subscriptions"
  ON platform_subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Super admin full access coupons"
  ON platform_coupons FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Super admin full access redemptions"
  ON coupon_redemptions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Super admin full access invoices"
  ON platform_invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Super admin full access billing contacts"
  ON billing_contacts FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Org owners can view their own data
CREATE POLICY "Org owners view subscriptions"
  ON platform_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.org_id = platform_subscriptions.org_id
        AND ou.user_id = auth.uid()
        AND ou.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Org owners view invoices"
  ON platform_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.org_id = platform_invoices.org_id
        AND ou.user_id = auth.uid()
        AND ou.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Org owners manage billing contacts"
  ON billing_contacts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.org_id = billing_contacts.org_id
        AND ou.user_id = auth.uid()
        AND ou.role = 'owner'
    )
  );

-- Anyone can validate coupons (needed for checkout)
CREATE POLICY "Anyone can read active coupons"
  ON platform_coupons FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Update trigger
CREATE TRIGGER update_platform_subscriptions_timestamp
  BEFORE UPDATE ON platform_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_coupons_timestamp
  BEFORE UPDATE ON platform_coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_invoices_timestamp
  BEFORE UPDATE ON platform_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_contacts_timestamp
  BEFORE UPDATE ON billing_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- Default Coupons (optionnel)
-- -----------------------------------------------------

-- INSERT INTO platform_coupons (code, name, description, discount_type, discount_percent, duration, valid_until)
-- VALUES
--   ('LAUNCH50', '50% de reduction lancement', 'Offre de lancement - 50% sur le premier mois', 'percent', 50, 'once', now() + interval '3 months'),
--   ('ANNUAL20', '20% annuel', '20% de reduction pour abonnement annuel', 'percent', 20, 'once', NULL);
