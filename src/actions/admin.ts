/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from './platform';

// =====================================================
// USERS / PROFILES MANAGEMENT
// =====================================================

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  organizations: { id: string; name: string; role: string }[];
}

export async function getAllUsers(options?: {
  search?: string;
  is_super_admin?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ users: AdminUser[]; total: number }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  // Get profiles with their organizations
  // Note: is_super_admin may not be in generated types yet
  let query = (supabase as any)
    .from('profiles')
    .select('*', { count: 'exact' });

  if (options?.search) {
    query = query.or(
      `email.ilike.%${options.search}%,full_name.ilike.%${options.search}%`
    );
  }

  if (options?.is_super_admin !== undefined) {
    query = query.eq('is_super_admin', options.is_super_admin);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(
      options?.offset || 0,
      (options?.offset || 0) + (options?.limit || 50) - 1
    );

  const { data: profiles, count, error } = await query;

  if (error) {
    console.error('Error fetching users:', error);
    return { users: [], total: 0 };
  }

  // Get organization links for each user
  const userIds = (profiles || []).map((p: any) => p.id);

  const { data: orgLinks } = await supabase
    .from('organization_users')
    .select(`
      user_id,
      role,
      org_id,
      organizations(id, name)
    `)
    .in('user_id', userIds)
    .eq('is_active', true);

  // Map users with their organizations
  const users: AdminUser[] = (profiles || []).map((profile: any) => {
    const userOrgLinks = (orgLinks || []).filter((ol: any) => ol.user_id === profile.id);
    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      is_super_admin: profile.is_super_admin || false,
      created_at: profile.created_at,
      last_sign_in_at: null, // Would need auth.users access
      organizations: userOrgLinks.map((ol: any) => ({
        id: ol.organizations?.id || ol.org_id,
        name: ol.organizations?.name || 'Unknown',
        role: ol.role,
      })),
    };
  });

  return { users, total: count || 0 };
}

export async function toggleSuperAdmin(
  userId: string,
  isSuperAdmin: boolean
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // Prevent removing own super admin status
  if (currentUser?.id === userId && !isSuperAdmin) {
    return { success: false, error: 'Vous ne pouvez pas retirer vos propres droits super admin' };
  }

  const { error } = await (supabase as any)
    .from('profiles')
    .update({ is_super_admin: isSuperAdmin })
    .eq('id', userId);

  if (error) {
    console.error('Error toggling super admin:', error);
    return { success: false, error: error.message };
  }

  // Log the action
  const { data: targetUser } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  await (supabase as any)
    .from('platform_audit_log')
    .insert({
      actor_id: currentUser?.id,
      actor_email: currentUser?.email,
      event_type: isSuperAdmin ? 'super_admin_granted' : 'super_admin_revoked',
      target_type: 'user',
      target_id: userId,
      description: `Super admin ${isSuperAdmin ? 'granted to' : 'revoked from'} ${targetUser?.email}`,
    });

  revalidatePath('/admin/users');
  return { success: true };
}

// =====================================================
// ORGANIZATION STAFF MANAGEMENT
// =====================================================

export interface OrgStaffMember {
  id: string;
  user_id: string;
  org_id: string;
  role: 'owner' | 'admin' | 'coach' | 'staff';
  is_active: boolean;
  created_at: string;
  permissions: Record<string, boolean>;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export async function getOrganizationStaff(
  orgId: string
): Promise<OrgStaffMember[]> {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization_users')
    .select(`
      *,
      user:profiles(id, email, full_name, avatar_url)
    `)
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching organization staff:', error);
    return [];
  }

  return (data || []) as unknown as OrgStaffMember[];
}

export async function updateStaffRole(
  orgUserId: string,
  role: 'owner' | 'admin' | 'coach' | 'staff'
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('organization_users')
    .update({ role })
    .eq('id', orgUserId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/organizations');
  return { success: true };
}

export async function toggleStaffActive(
  orgUserId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('organization_users')
    .update({ is_active: isActive })
    .eq('id', orgUserId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/organizations');
  return { success: true };
}

export async function addStaffToOrganization(
  orgId: string,
  email: string,
  role: 'admin' | 'coach' | 'staff'
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  // Find user by email
  const { data: user } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (!user) {
    return { success: false, error: 'Utilisateur non trouve avec cet email' };
  }

  // Check if already linked
  const { data: existing } = await supabase
    .from('organization_users')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    return { success: false, error: 'Cet utilisateur est deja lie a cette organisation' };
  }

  // Add link
  const { error } = await supabase
    .from('organization_users')
    .insert({
      org_id: orgId,
      user_id: user.id,
      role,
      is_active: true,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/organizations');
  return { success: true };
}

export async function removeStaffFromOrganization(
  orgUserId: string
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('organization_users')
    .delete()
    .eq('id', orgUserId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/organizations');
  return { success: true };
}

// =====================================================
// BILLING / SUBSCRIPTIONS
// =====================================================

export interface BillingOverview {
  total_revenue: number;
  mrr: number;
  arr: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  past_due_subscriptions: number;
  canceled_subscriptions: number;
}

export interface SubscriptionRecord {
  id: string;
  org_id: string;
  org_name: string;
  status: string;
  plan_tier: string;
  plan_name: string;
  price_monthly: number;
  price_yearly: number;
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  created_at: string;
}

export async function getBillingOverview(): Promise<BillingOverview> {
  await requireSuperAdmin();
  const supabase = await createClient();

  // Get stats from platform view or calculate
  const { data, error } = await (supabase as any)
    .from('v_platform_stats')
    .select('*')
    .single();

  if (error || !data) {
    // Fallback: calculate from organizations
    const { data: orgs } = await supabase
      .from('organizations')
      .select('*');

    const activeOrgs = (orgs || []).filter((o) => o.is_active);

    return {
      total_revenue: 0,
      mrr: 0,
      arr: 0,
      active_subscriptions: activeOrgs.length,
      trial_subscriptions: 0,
      past_due_subscriptions: 0,
      canceled_subscriptions: 0,
    };
  }

  return {
    total_revenue: 0,
    mrr: data.mrr_cents ? data.mrr_cents / 100 : 0,
    arr: data.mrr_cents ? (data.mrr_cents * 12) / 100 : 0,
    active_subscriptions: data.active_subscriptions || 0,
    trial_subscriptions: data.trials || 0,
    past_due_subscriptions: 0,
    canceled_subscriptions: 0,
  };
}

export async function getAllSubscriptions(options?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ subscriptions: SubscriptionRecord[]; total: number }> {
  await requireSuperAdmin();
  const supabase = await createClient();

  // Query organizations with their platform plan info
  let query = (supabase as any)
    .from('v_platform_organizations')
    .select('*', { count: 'exact' });

  if (options?.status) {
    query = query.eq('platform_subscription_status', options.status);
  }

  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,owner_email.ilike.%${options.search}%`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(
      options?.offset || 0,
      (options?.offset || 0) + (options?.limit || 50) - 1
    );

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return { subscriptions: [], total: 0 };
  }

  const subscriptions: SubscriptionRecord[] = (data || []).map((org: any) => ({
    id: org.id,
    org_id: org.id,
    org_name: org.name,
    status: org.platform_subscription_status || 'unknown',
    plan_tier: org.plan_tier || 'free_trial',
    plan_name: org.plan_name || 'Essai gratuit',
    price_monthly: org.price_monthly || 0,
    price_yearly: org.price_yearly || 0,
    billing_cycle: 'monthly',
    current_period_start: org.created_at,
    current_period_end: org.trial_ends_at || '',
    trial_ends_at: org.trial_ends_at || null,
    created_at: org.created_at,
  }));

  return { subscriptions, total: count || 0 };
}

// =====================================================
// ANALYTICS
// =====================================================

export interface PlatformAnalytics {
  total_organizations: number;
  total_members: number;
  total_users: number;
  total_classes: number;
  total_bookings: number;
  growth: {
    orgs_this_month: number;
    orgs_last_month: number;
    members_this_month: number;
    members_last_month: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    total_collected: number;
  };
  top_organizations: {
    id: string;
    name: string;
    member_count: number;
    revenue: number;
  }[];
}

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  await requireSuperAdmin();
  const supabase = await createClient();

  // Get basic counts
  const [
    { count: orgCount },
    { count: memberCount },
    { count: userCount },
    { count: classCount },
    { count: bookingCount },
  ] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('members').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('classes').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
  ]);

  // Get growth data (this month vs last month)
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const { count: orgsThisMonth } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstOfThisMonth.toISOString());

  const { count: orgsLastMonth } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstOfLastMonth.toISOString())
    .lt('created_at', firstOfThisMonth.toISOString());

  const { count: membersThisMonth } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstOfThisMonth.toISOString());

  const { count: membersLastMonth } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstOfLastMonth.toISOString())
    .lt('created_at', firstOfThisMonth.toISOString());

  // Get top organizations by member count
  const { data: topOrgs } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      members(count)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    total_organizations: orgCount || 0,
    total_members: memberCount || 0,
    total_users: userCount || 0,
    total_classes: classCount || 0,
    total_bookings: bookingCount || 0,
    growth: {
      orgs_this_month: orgsThisMonth || 0,
      orgs_last_month: orgsLastMonth || 0,
      members_this_month: membersThisMonth || 0,
      members_last_month: membersLastMonth || 0,
    },
    revenue: {
      mrr: 0,
      arr: 0,
      total_collected: 0,
    },
    top_organizations: (topOrgs || []).map((org: any) => ({
      id: org.id,
      name: org.name,
      member_count: org.members?.[0]?.count || 0,
      revenue: 0,
    })),
  };
}
