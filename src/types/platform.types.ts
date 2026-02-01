// =====================================================
// PLATFORM TYPES - Super Admin & Multi-tenant System
// =====================================================

// -----------------------------------------------------
// Platform Plan Types
// -----------------------------------------------------

export type PlatformPlanTier = 'free_trial' | 'basic' | 'pro' | 'enterprise';

export type PlatformSubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid';

export interface PlatformPlanFeatures {
  members: boolean;
  subscriptions: boolean;
  planning: boolean;
  workouts: boolean;
  tv_display: boolean;
  teams: boolean;
  discord: boolean;
  workflows: boolean;
  api_access: boolean;
  white_label: boolean;
  priority_support: boolean;
}

export interface PlatformPlan {
  id: string;
  name: string;
  tier: PlatformPlanTier;
  description: string | null;
  price_monthly: number; // in cents
  price_yearly: number | null;
  currency: string;
  max_members: number | null; // null = unlimited
  max_staff: number | null;
  max_classes_per_month: number | null;
  features: PlatformPlanFeatures;
  stripe_product_id: string | null;
  stripe_price_monthly_id: string | null;
  stripe_price_yearly_id: string | null;
  platform_fee_percent: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------
// Organization Extended Types
// -----------------------------------------------------

export interface OrganizationWithPlatform {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: Record<string, unknown>;
  features: PlatformPlanFeatures;
  stripe_account_id: string | null;
  stripe_customer_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Platform fields
  platform_plan_id: string | null;
  platform_subscription_status: PlatformSubscriptionStatus;
  platform_subscription_id: string | null;
  trial_ends_at: string | null;
  platform_subscription_ends_at: string | null;
  created_by: string | null;
  owner_user_id: string | null;
  billing_email: string | null;
  country_code: string;
  timezone: string;

  // Joined data
  plan?: PlatformPlan;
  owner?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

// -----------------------------------------------------
// Global Member Types
// -----------------------------------------------------

export type GenderType = 'male' | 'female' | 'other';

export interface GlobalMemberNotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface GlobalMember {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  birth_date: string | null;
  gender: GenderType | null;
  avatar_url: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  preferred_language: string;
  notification_preferences: GlobalMemberNotificationPreferences;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------
// Member-Org Link Types
// -----------------------------------------------------

export type MemberLinkStatus = 'pending' | 'active' | 'inactive' | 'transferred';

export interface MemberOrgLink {
  id: string;
  global_member_id: string;
  org_id: string;
  local_member_id: string | null;
  status: MemberLinkStatus;
  linked_at: string;
  unlinked_at: string | null;
  transferred_from_org_id: string | null;
  transferred_at: string | null;
  transfer_reason: string | null;
  initiated_by: 'member' | 'gym' | 'super_admin';
  receive_notifications: boolean;
  created_at: string;
  updated_at: string;

  // Joined data
  global_member?: GlobalMember;
  organization?: OrganizationWithPlatform;
}

// -----------------------------------------------------
// Platform Audit Types
// -----------------------------------------------------

export type PlatformAuditEvent =
  | 'org_created'
  | 'org_updated'
  | 'org_deleted'
  | 'org_suspended'
  | 'org_activated'
  | 'owner_invited'
  | 'owner_changed'
  | 'staff_added'
  | 'staff_removed'
  | 'plan_changed'
  | 'subscription_created'
  | 'subscription_canceled'
  | 'payment_received'
  | 'payment_failed'
  | 'member_linked'
  | 'member_unlinked'
  | 'member_transferred'
  | 'super_admin_login'
  | 'super_admin_impersonate'
  | 'settings_changed'
  | 'feature_toggled';

export interface PlatformAuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_type: 'user' | 'system' | 'webhook';
  event_type: PlatformAuditEvent;
  org_id: string | null;
  target_type: string | null;
  target_id: string | null;
  description: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// -----------------------------------------------------
// Invitation Types
// -----------------------------------------------------

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export type OrgRole = 'owner' | 'admin' | 'coach' | 'staff';

export interface OrganizationInvitation {
  id: string;
  org_id: string | null;
  email: string;
  role: OrgRole;
  token: string;
  status: InvitationStatus;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;

  // Joined data
  organization?: OrganizationWithPlatform;
  inviter?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

// -----------------------------------------------------
// Platform Stats Types
// -----------------------------------------------------

export interface PlatformStats {
  total_orgs: number;
  active_subscriptions: number;
  trials: number;
  total_members: number;
  global_members: number;
  mrr_cents: number;
}

export interface OrganizationOverview {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  platform_subscription_status: PlatformSubscriptionStatus;
  trial_ends_at: string | null;
  country_code: string;
  timezone: string;
  created_at: string;
  plan_name: string | null;
  plan_tier: PlatformPlanTier | null;
  plan_price: number | null;
  member_count: number;
  staff_count: number;
  owner_email: string | null;
}

// -----------------------------------------------------
// Form Types
// -----------------------------------------------------

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  owner_email: string;
  plan_tier?: PlatformPlanTier;
  country_code?: string;
  timezone?: string;
}

export interface InviteOwnerInput {
  org_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface TransferMemberInput {
  global_member_id: string;
  from_org_id: string;
  to_org_id: string;
  copy_history?: boolean;
  reason?: string;
}

// -----------------------------------------------------
// Permission Helpers
// -----------------------------------------------------

export interface PlanLimits {
  within_member_limit: boolean;
  current_members: number;
  max_members: number | null;
  within_staff_limit: boolean;
  current_staff: number;
  max_staff: number | null;
}

export function isPlanFeatureEnabled(
  plan: PlatformPlan | undefined | null,
  feature: keyof PlatformPlanFeatures
): boolean {
  if (!plan) return false;
  return plan.features[feature] === true;
}

export function formatPlanPrice(priceInCents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(priceInCents / 100);
}

export function getDaysUntilTrialEnds(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const now = new Date();
  const trialEnd = new Date(trialEndsAt);
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export function getSubscriptionStatusColor(
  status: PlatformSubscriptionStatus
): 'green' | 'yellow' | 'red' | 'gray' {
  switch (status) {
    case 'active':
      return 'green';
    case 'trialing':
      return 'yellow';
    case 'past_due':
    case 'unpaid':
      return 'red';
    case 'canceled':
    default:
      return 'gray';
  }
}

export function getSubscriptionStatusLabel(status: PlatformSubscriptionStatus): string {
  switch (status) {
    case 'active':
      return 'Actif';
    case 'trialing':
      return 'Essai';
    case 'past_due':
      return 'En retard';
    case 'unpaid':
      return 'Impaye';
    case 'canceled':
      return 'Annule';
    default:
      return status;
  }
}
