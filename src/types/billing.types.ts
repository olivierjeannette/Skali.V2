// =====================================================
// BILLING TYPES - Platform Subscriptions & Coupons
// =====================================================

// -----------------------------------------------------
// Platform Subscription Types
// -----------------------------------------------------

export type PlatformSubscriptionStatusType =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete';

export interface PlatformSubscription {
  id: string;
  org_id: string;
  plan_id: string | null;

  // Stripe
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_price_id: string | null;

  // Status
  status: PlatformSubscriptionStatusType;

  // Dates
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  canceled_at: string | null;
  ended_at: string | null;

  // Billing
  billing_cycle_anchor: string | null;
  cancel_at_period_end: boolean;

  // Coupon
  coupon_id: string | null;
  discount_percent: number | null;
  discount_amount_cents: number | null;

  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------
// Coupon Types
// -----------------------------------------------------

export type CouponDiscountType = 'percent' | 'fixed_amount';
export type CouponDuration = 'once' | 'repeating' | 'forever';

export interface PlatformCoupon {
  id: string;
  code: string;
  name: string;
  description: string | null;

  // Stripe
  stripe_coupon_id: string | null;
  stripe_promotion_code_id: string | null;

  // Discount
  discount_type: CouponDiscountType;
  discount_percent: number | null;
  discount_amount_cents: number | null;
  currency: string;

  // Duration
  duration: CouponDuration;
  duration_in_months: number | null;

  // Restrictions
  max_redemptions: number | null;
  redemption_count: number;
  applies_to_plans: string[] | null;
  first_time_only: boolean;
  minimum_amount_cents: number | null;

  // Validity
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;

  // Meta
  created_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  org_id: string;
  subscription_id: string | null;
  discount_applied_cents: number;
  redeemed_at: string;
}

export interface CouponValidationResult {
  is_valid: boolean;
  coupon_id: string | null;
  discount_type: CouponDiscountType | null;
  discount_percent: number | null;
  discount_amount_cents: number | null;
  error_message: string | null;
}

// -----------------------------------------------------
// Invoice Types
// -----------------------------------------------------

export type InvoiceStatus =
  | 'draft'
  | 'open'
  | 'paid'
  | 'void'
  | 'uncollectible';

export interface PlatformInvoice {
  id: string;
  org_id: string;
  subscription_id: string | null;

  // Stripe
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_hosted_invoice_url: string | null;
  stripe_invoice_pdf: string | null;

  // Status
  status: InvoiceStatus;

  // Amounts (cents)
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  amount_due_cents: number;
  currency: string;

  // Dates
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  paid_at: string | null;

  // Details
  description: string | null;
  invoice_number: string | null;

  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------
// Billing Contact Types
// -----------------------------------------------------

export interface BillingContact {
  id: string;
  org_id: string;
  email: string;
  name: string | null;
  phone: string | null;

  // Address
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;

  // VAT
  vat_number: string | null;
  company_name: string | null;

  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------
// Form Input Types
// -----------------------------------------------------

export interface CreateCouponInput {
  code: string;
  name: string;
  description?: string;
  discount_type: CouponDiscountType;
  discount_percent?: number;
  discount_amount_cents?: number;
  duration: CouponDuration;
  duration_in_months?: number;
  max_redemptions?: number;
  applies_to_plans?: string[];
  first_time_only?: boolean;
  minimum_amount_cents?: number;
  valid_from?: string;
  valid_until?: string;
}

export interface UpdateCouponInput {
  name?: string;
  description?: string;
  max_redemptions?: number;
  valid_until?: string;
  is_active?: boolean;
}

export interface UpdateBillingContactInput {
  email?: string;
  name?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  vat_number?: string;
  company_name?: string;
}

// -----------------------------------------------------
// Helper Functions
// -----------------------------------------------------

export function formatCouponDiscount(coupon: PlatformCoupon): string {
  if (coupon.discount_type === 'percent' && coupon.discount_percent) {
    return `${coupon.discount_percent}%`;
  }
  if (coupon.discount_type === 'fixed_amount' && coupon.discount_amount_cents) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: coupon.currency || 'EUR',
    }).format(coupon.discount_amount_cents / 100);
  }
  return '';
}

export function getCouponDurationLabel(
  duration: CouponDuration,
  months?: number | null
): string {
  switch (duration) {
    case 'once':
      return 'Premier paiement uniquement';
    case 'repeating':
      return months ? `${months} mois` : 'Plusieurs mois';
    case 'forever':
      return 'Toujours';
    default:
      return duration;
  }
}

export function isCouponValid(coupon: PlatformCoupon): boolean {
  if (!coupon.is_active) return false;

  const now = new Date();
  const validFrom = new Date(coupon.valid_from);
  if (validFrom > now) return false;

  if (coupon.valid_until) {
    const validUntil = new Date(coupon.valid_until);
    if (validUntil < now) return false;
  }

  if (
    coupon.max_redemptions !== null &&
    coupon.redemption_count >= coupon.max_redemptions
  ) {
    return false;
  }

  return true;
}

export function calculateDiscountedPrice(
  originalPriceCents: number,
  coupon: PlatformCoupon
): number {
  if (coupon.discount_type === 'percent' && coupon.discount_percent) {
    const discount = Math.round(
      (originalPriceCents * coupon.discount_percent) / 100
    );
    return Math.max(0, originalPriceCents - discount);
  }
  if (coupon.discount_type === 'fixed_amount' && coupon.discount_amount_cents) {
    return Math.max(0, originalPriceCents - coupon.discount_amount_cents);
  }
  return originalPriceCents;
}

export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case 'draft':
      return 'Brouillon';
    case 'open':
      return 'En attente';
    case 'paid':
      return 'Payee';
    case 'void':
      return 'Annulee';
    case 'uncollectible':
      return 'Irrecuperable';
    default:
      return status;
  }
}

export function getInvoiceStatusColor(
  status: InvoiceStatus
): 'gray' | 'yellow' | 'green' | 'red' {
  switch (status) {
    case 'draft':
      return 'gray';
    case 'open':
      return 'yellow';
    case 'paid':
      return 'green';
    case 'void':
    case 'uncollectible':
      return 'red';
    default:
      return 'gray';
  }
}
