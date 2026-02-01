/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: Les types Supabase pour platform_plans, global_members, etc. ne sont pas generes
// car les migrations n'ont pas encore ete appliquees. On utilise 'any' temporairement.
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  PlatformPlan,
  PlatformStats,
  OrganizationOverview,
  OrganizationWithPlatform,
  PlatformAuditLog,
  OrganizationInvitation,
  CreateOrganizationInput,
  InviteOwnerInput,
  PlanLimits,
  PlatformPlanTier,
  GlobalMember,
  MemberOrgLink,
} from '@/types/platform.types';

// Note: Ces tables/colonnes n'existent pas encore dans Supabase
// La migration 00013_super_admin_platform.sql doit etre appliquee
// En attendant, on utilise 'as any' pour les tables non typees

// =====================================================
// SUPER ADMIN CHECK
// =====================================================

export async function isSuperAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Note: is_super_admin n'existe pas encore - utiliser RPC ou raw query
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single();

  return profile?.is_super_admin === true;
}

export async function requireSuperAdmin() {
  const isAdmin = await isSuperAdmin();
  if (!isAdmin) {
    throw new Error('Access denied. Super admin privileges required.');
  }
}

// =====================================================
// PLATFORM STATS
// =====================================================

export async function getPlatformStats(): Promise<PlatformStats> {
  await requireSuperAdmin();
  const supabase = await createClient();

  // Vue v_platform_stats n'existe pas encore
  const { data, error } = await (supabase as any)
    .from('v_platform_stats')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching platform stats:', error);
    return {
      total_orgs: 0,
      active_subscriptions: 0,
      trials: 0,
      total_members: 0,
      global_members: 0,
      mrr_cents: 0,
    };
  }

  return data as PlatformStats;
}

// =====================================================
// PLATFORM PLANS
// =====================================================

export async function getPlatformPlans(): Promise<PlatformPlan[]> {
  const supabase = await createClient();

  // Table platform_plans n'existe pas encore
  const { data, error } = await (supabase as any)
    .from('platform_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching platform plans:', error);
    return [];
  }

  return data as PlatformPlan[];
}

export async function updatePlatformPlan(
  planId: string,
  updates: Partial<PlatformPlan>
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from('platform_plans')
    .update(updates)
    .eq('id', planId);

  if (error) {
    console.error('Error updating platform plan:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/plans');
  return { success: true };
}

// =====================================================
// ORGANIZATIONS
// =====================================================

export async function getAllOrganizations(options?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ organizations: OrganizationOverview[]; total: number }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  // Vue v_platform_organizations n'existe pas encore
  let query = (supabase as any)
    .from('v_platform_organizations')
    .select('*', { count: 'exact' });

  if (options?.status) {
    query = query.eq('platform_subscription_status', options.status);
  }

  if (options?.search) {
    query = query.or(
      `name.ilike.%${options.search}%,slug.ilike.%${options.search}%,owner_email.ilike.%${options.search}%`
    );
  }

  query = query
    .order('created_at', { ascending: false })
    .range(
      options?.offset || 0,
      (options?.offset || 0) + (options?.limit || 50) - 1
    );

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching organizations:', error);
    return { organizations: [], total: 0 };
  }

  return {
    organizations: (data || []) as OrganizationOverview[],
    total: count || 0,
  };
}

export async function getOrganizationById(
  orgId: string
): Promise<OrganizationWithPlatform | null> {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('organizations')
    .select(
      `
      *,
      plan:platform_plans(*),
      owner:profiles!owner_user_id(id, email, full_name)
    `
    )
    .eq('id', orgId)
    .single();

  if (error) {
    console.error('Error fetching organization:', error);
    return null;
  }

  return data as OrganizationWithPlatform;
}

export async function createOrganization(
  input: CreateOrganizationInput
): Promise<{ success: boolean; orgId?: string; error?: string }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  // Check if slug already exists
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', input.slug)
    .single();

  if (existing) {
    return { success: false, error: 'Ce slug est deja utilise' };
  }

  // Get plan ID
  const { data: plan } = await (supabase as any)
    .from('platform_plans')
    .select('id')
    .eq('tier', input.plan_tier || 'free_trial')
    .single();

  if (!plan) {
    return { success: false, error: 'Plan non trouve' };
  }

  // Get current user (super admin)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Create organization (with new platform fields)
  const { data: org, error: orgError } = await (supabase as any)
    .from('organizations')
    .insert({
      name: input.name,
      slug: input.slug,
      platform_plan_id: plan.id,
      platform_subscription_status: 'trialing',
      trial_ends_at: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000
      ).toISOString(),
      created_by: user?.id,
      billing_email: input.owner_email,
      country_code: input.country_code || 'FR',
      timezone: input.timezone || 'Europe/Paris',
    })
    .select()
    .single();

  if (orgError) {
    console.error('Error creating organization:', orgError);
    return { success: false, error: orgError.message };
  }

  // Log the creation
  await (supabase as any).from('platform_audit_log').insert({
    actor_id: user?.id,
    actor_email: user?.email,
    actor_type: 'user',
    event_type: 'org_created',
    org_id: org.id,
    target_type: 'organization',
    target_id: org.id,
    description: `Organization "${input.name}" created`,
    new_values: {
      name: input.name,
      slug: input.slug,
      owner_email: input.owner_email,
      plan_tier: input.plan_tier,
    },
  });

  revalidatePath('/admin/organizations');
  return { success: true, orgId: org.id };
}

export async function updateOrganization(
  orgId: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  // Get current values for audit
  const { data: oldOrg } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  const { error } = await (supabase as any)
    .from('organizations')
    .update(updates)
    .eq('id', orgId);

  if (error) {
    console.error('Error updating organization:', error);
    return { success: false, error: error.message };
  }

  // Log the update
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await (supabase as any).from('platform_audit_log').insert({
    actor_id: user?.id,
    actor_email: user?.email,
    event_type: 'org_updated',
    org_id: orgId,
    target_type: 'organization',
    target_id: orgId,
    description: 'Organization updated',
    old_values: oldOrg,
    new_values: updates,
  });

  revalidatePath('/admin/organizations');
  revalidatePath(`/admin/organizations/${orgId}`);
  return { success: true };
}

export async function suspendOrganization(
  orgId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('organizations')
    .update({ is_active: false })
    .eq('id', orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await (supabase as any).from('platform_audit_log').insert({
    actor_id: user?.id,
    actor_email: user?.email,
    event_type: 'org_suspended',
    org_id: orgId,
    target_type: 'organization',
    target_id: orgId,
    description: reason || 'Organization suspended',
  });

  revalidatePath('/admin/organizations');
  return { success: true };
}

export async function activateOrganization(
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('organizations')
    .update({ is_active: true })
    .eq('id', orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await (supabase as any).from('platform_audit_log').insert({
    actor_id: user?.id,
    actor_email: user?.email,
    event_type: 'org_activated',
    org_id: orgId,
    target_type: 'organization',
    target_id: orgId,
    description: 'Organization activated',
  });

  revalidatePath('/admin/organizations');
  return { success: true };
}

export async function changePlan(
  orgId: string,
  newPlanTier: PlatformPlanTier
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  // Get new plan
  const { data: plan } = await (supabase as any)
    .from('platform_plans')
    .select('id, name')
    .eq('tier', newPlanTier)
    .single();

  if (!plan) {
    return { success: false, error: 'Plan non trouve' };
  }

  // Get old plan for audit
  const { data: oldOrg } = await (supabase as any)
    .from('organizations')
    .select('platform_plan_id, plan:platform_plans(name, tier)')
    .eq('id', orgId)
    .single();

  // Update org
  const { error } = await (supabase as any)
    .from('organizations')
    .update({ platform_plan_id: plan.id })
    .eq('id', orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await (supabase as any).from('platform_audit_log').insert({
    actor_id: user?.id,
    actor_email: user?.email,
    event_type: 'plan_changed',
    org_id: orgId,
    target_type: 'organization',
    target_id: orgId,
    description: `Plan changed to ${plan.name}`,
    old_values: { plan: oldOrg?.plan },
    new_values: { plan: { name: plan.name, tier: newPlanTier } },
  });

  revalidatePath('/admin/organizations');
  revalidatePath(`/admin/organizations/${orgId}`);
  return { success: true };
}

// =====================================================
// OWNER INVITATIONS
// =====================================================

export async function inviteOwner(
  input: InviteOwnerInput
): Promise<{ success: boolean; invitationId?: string; error?: string }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  // Check if invitation already exists
  const { data: existing } = await (supabase as any)
    .from('organization_invitations')
    .select('id')
    .eq('org_id', input.org_id)
    .eq('email', input.email)
    .eq('status', 'pending')
    .single();

  if (existing) {
    return { success: false, error: 'Une invitation est deja en cours' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Create invitation
  const { data: invitation, error } = await (supabase as any)
    .from('organization_invitations')
    .insert({
      org_id: input.org_id,
      email: input.email,
      role: 'owner',
      invited_by: user?.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating invitation:', error);
    return { success: false, error: error.message };
  }

  // Update org with owner email
  await (supabase as any)
    .from('organizations')
    .update({ billing_email: input.email })
    .eq('id', input.org_id);

  // Log
  await (supabase as any).from('platform_audit_log').insert({
    actor_id: user?.id,
    actor_email: user?.email,
    event_type: 'owner_invited',
    org_id: input.org_id,
    target_type: 'invitation',
    target_id: invitation.id,
    description: `Owner invitation sent to ${input.email}`,
    new_values: { email: input.email },
  });

  // Get org details for email (use 'as any' for fields not yet in schema)
  const { data: orgDetails } = await (supabase as any)
    .from('organizations')
    .select('name, platform_plan_id')
    .eq('id', input.org_id)
    .single();

  // Get inviter profile
  const { data: inviterProfile } = user?.id
    ? await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single()
    : { data: null };

  // Get plan name if available
  const { data: plan } = orgDetails?.platform_plan_id
    ? await (supabase as any)
        .from('platform_plans')
        .select('name')
        .eq('id', orgDetails.platform_plan_id)
        .single()
    : { data: null };

  // Send invitation email via Resend
  const { sendOwnerInvitationEmail } = await import('./billing');
  await sendOwnerInvitationEmail(
    invitation.token,
    input.email,
    orgDetails?.name || 'Votre salle',
    inviterProfile?.full_name || 'Skali Prog',
    inviterProfile?.email || 'support@skaliprog.com',
    invitation.expires_at,
    plan?.name
  );

  revalidatePath(`/admin/organizations/${input.org_id}`);
  return { success: true, invitationId: invitation.id };
}

export async function getInvitationByToken(
  token: string
): Promise<OrganizationInvitation | null> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('organization_invitations')
    .select(
      `
      *,
      organization:organizations(id, name, slug, logo_url),
      inviter:profiles!invited_by(id, email, full_name)
    `
    )
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (error || !data) {
    return null;
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    await (supabase as any)
      .from('organization_invitations')
      .update({ status: 'expired' })
      .eq('id', data.id);
    return null;
  }

  return data as OrganizationInvitation;
}

export async function acceptInvitation(
  token: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get invitation
  const invitation = await getInvitationByToken(token);
  if (!invitation) {
    return { success: false, error: 'Invitation invalide ou expiree' };
  }

  // Create user account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: invitation.email,
    password,
  });

  if (authError) {
    console.error('Error creating user:', authError);
    return { success: false, error: authError.message };
  }

  if (!authData.user) {
    return { success: false, error: 'Erreur lors de la creation du compte' };
  }

  // Create profile
  await supabase.from('profiles').insert({
    id: authData.user.id,
    email: invitation.email,
  });

  // Link user to organization
  await (supabase as any).from('organization_users').insert({
    org_id: invitation.org_id,
    user_id: authData.user.id,
    role: invitation.role,
    is_active: true,
  });

  // Update organization with owner
  await (supabase as any)
    .from('organizations')
    .update({ owner_user_id: authData.user.id })
    .eq('id', invitation.org_id);

  // Mark invitation as accepted
  await (supabase as any)
    .from('organization_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invitation.id);

  return { success: true };
}

export async function revokeInvitation(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from('organization_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =====================================================
// PLAN LIMITS
// =====================================================

export async function checkOrgLimits(orgId: string): Promise<PlanLimits | null> {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any).rpc('check_org_limits', {
    p_org_id: orgId,
  });

  if (error) {
    console.error('Error checking org limits:', error);
    return null;
  }

  return data?.[0] as PlanLimits;
}

// =====================================================
// GLOBAL MEMBERS
// =====================================================

export async function getAllGlobalMembers(options?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ members: GlobalMember[]; total: number }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  let query = (supabase as any)
    .from('global_members')
    .select('*', { count: 'exact' });

  if (options?.search) {
    query = query.or(
      `email.ilike.%${options.search}%,first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%`
    );
  }

  query = query
    .order('created_at', { ascending: false })
    .range(
      options?.offset || 0,
      (options?.offset || 0) + (options?.limit || 50) - 1
    );

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching global members:', error);
    return { members: [], total: 0 };
  }

  return { members: (data || []) as GlobalMember[], total: count || 0 };
}

export async function getMemberOrgLinks(
  globalMemberId: string
): Promise<MemberOrgLink[]> {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('member_org_links')
    .select(
      `
      *,
      organization:organizations(id, name, slug, logo_url)
    `
    )
    .eq('global_member_id', globalMemberId)
    .order('linked_at', { ascending: false });

  if (error) {
    console.error('Error fetching member links:', error);
    return [];
  }

  return (data || []) as MemberOrgLink[];
}

// =====================================================
// AUDIT LOG
// =====================================================

export async function getAuditLogs(options?: {
  org_id?: string;
  event_type?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: PlatformAuditLog[]; total: number }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  let query = (supabase as any)
    .from('platform_audit_log')
    .select('*', { count: 'exact' });

  if (options?.org_id) {
    query = query.eq('org_id', options.org_id);
  }

  if (options?.event_type) {
    query = query.eq('event_type', options.event_type);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(
      options?.offset || 0,
      (options?.offset || 0) + (options?.limit || 100) - 1
    );

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching audit logs:', error);
    return { logs: [], total: 0 };
  }

  return { logs: (data || []) as PlatformAuditLog[], total: count || 0 };
}

// =====================================================
// IMPERSONATION
// =====================================================

export async function impersonateOrganization(
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  // Log the impersonation
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await (supabase as any).from('platform_audit_log').insert({
    actor_id: user?.id,
    actor_email: user?.email,
    event_type: 'super_admin_impersonate',
    org_id: orgId,
    target_type: 'organization',
    target_id: orgId,
    description: 'Super admin started impersonating organization',
  });

  // Store impersonation state in session/cookie
  // This would be handled by middleware
  // For now, we'll use a simple approach via query params or cookies

  return { success: true };
}
