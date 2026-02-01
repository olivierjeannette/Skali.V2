'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Types
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// Global member type
export interface GlobalMember {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  preferred_language: string;
  notification_preferences: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

// Member org link type
export interface MemberOrgLink {
  id: string;
  global_member_id: string;
  org_id: string;
  local_member_id: string | null;
  status: 'pending' | 'active' | 'inactive' | 'transferred';
  linked_at: string;
  unlinked_at: string | null;
  transferred_from_org_id: string | null;
  transferred_at: string | null;
  transfer_reason: string | null;
  initiated_by: 'member' | 'gym' | 'super_admin';
  receive_notifications: boolean;
  created_at: string;
  // Joined data
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
}

// Global member with links
export interface GlobalMemberWithLinks extends GlobalMember {
  links: MemberOrgLink[];
}

// ============================================
// SUPER ADMIN FUNCTIONS
// ============================================

/**
 * Check if current user is super admin
 */
async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Non authentifié');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_super_admin) {
    throw new Error('Accès refusé - Super Admin requis');
  }

  return user;
}

/**
 * Get all global members (super admin only)
 */
export async function getAllGlobalMembers(options?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ActionResult<{ members: GlobalMemberWithLinks[]; total: number }>> {
  try {
    await requireSuperAdmin();
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('global_members')
      .select(
        `
        *,
        links:member_org_links(
          id,
          org_id,
          local_member_id,
          status,
          linked_at,
          transferred_from_org_id,
          transferred_at,
          initiated_by,
          organization:organizations(id, name, slug)
        )
      `,
        { count: 'exact' }
      );

    if (options?.search) {
      query = query.or(
        `email.ilike.%${options.search}%,first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%`
      );
    }

    query = query.order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.range(
        options.offset || 0,
        (options.offset || 0) + options.limit - 1
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching global members:', error);
      return { success: false, error: 'Erreur lors de la récupération des membres' };
    }

    return {
      success: true,
      data: {
        members: data || [],
        total: count || 0,
      },
    };
  } catch (error) {
    console.error('Error in getAllGlobalMembers:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}

/**
 * Get a single global member with all their org links
 */
export async function getGlobalMember(
  globalMemberId: string
): Promise<ActionResult<GlobalMemberWithLinks>> {
  try {
    await requireSuperAdmin();
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('global_members')
      .select(
        `
        *,
        links:member_org_links(
          id,
          org_id,
          local_member_id,
          status,
          linked_at,
          unlinked_at,
          transferred_from_org_id,
          transferred_at,
          transfer_reason,
          initiated_by,
          receive_notifications,
          organization:organizations(id, name, slug)
        )
      `
      )
      .eq('id', globalMemberId)
      .single();

    if (error) {
      console.error('Error fetching global member:', error);
      return { success: false, error: 'Membre global introuvable' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getGlobalMember:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}

/**
 * Create a new global member account
 */
export async function createGlobalMember(data: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    await requireSuperAdmin();
    const supabase = await createClient();

    // Check if email already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('global_members')
      .select('id')
      .eq('email', data.email.toLowerCase())
      .single();

    if (existing) {
      return { success: false, error: 'Un membre avec cet email existe déjà' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member, error } = await (supabase as any)
      .from('global_members')
      .insert({
        email: data.email.toLowerCase(),
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone || null,
        birth_date: data.birthDate || null,
        gender: data.gender || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating global member:', error);
      return { success: false, error: 'Erreur lors de la création du membre' };
    }

    revalidatePath('/admin/members');
    return { success: true, data: { id: member.id } };
  } catch (error) {
    console.error('Error in createGlobalMember:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}

/**
 * Link a global member to an organization
 */
export async function linkMemberToOrg(
  globalMemberId: string,
  orgId: string,
  copyData: boolean = true
): Promise<ActionResult<{ linkId: string }>> {
  try {
    await requireSuperAdmin();
    const supabase = await createClient();

    // Call the database function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('link_member_to_org', {
      p_global_member_id: globalMemberId,
      p_org_id: orgId,
      p_copy_data: copyData,
    });

    if (error) {
      console.error('Error linking member:', error);
      if (error.message?.includes('already linked')) {
        return { success: false, error: 'Ce membre est déjà lié à cette organisation' };
      }
      return { success: false, error: 'Erreur lors de la liaison du membre' };
    }

    revalidatePath('/admin/members');
    revalidatePath(`/admin/members/${globalMemberId}`);
    return { success: true, data: { linkId: data } };
  } catch (error) {
    console.error('Error in linkMemberToOrg:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}

/**
 * Transfer a member from one organization to another
 */
export async function transferMember(
  globalMemberId: string,
  fromOrgId: string,
  toOrgId: string,
  options?: {
    copyHistory?: boolean;
    reason?: string;
  }
): Promise<ActionResult<{ newLinkId: string }>> {
  try {
    await requireSuperAdmin();
    const supabase = await createClient();

    // Call the database function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('transfer_member', {
      p_global_member_id: globalMemberId,
      p_from_org_id: fromOrgId,
      p_to_org_id: toOrgId,
      p_copy_history: options?.copyHistory ?? true,
      p_reason: options?.reason || null,
    });

    if (error) {
      console.error('Error transferring member:', error);
      if (error.message?.includes('not linked')) {
        return { success: false, error: "Ce membre n'est pas lié à l'organisation source" };
      }
      return { success: false, error: 'Erreur lors du transfert du membre' };
    }

    revalidatePath('/admin/members');
    revalidatePath(`/admin/members/${globalMemberId}`);
    return { success: true, data: { newLinkId: data } };
  } catch (error) {
    console.error('Error in transferMember:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}

/**
 * Unlink a member from an organization
 */
export async function unlinkMemberFromOrg(
  globalMemberId: string,
  orgId: string
): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    const supabase = await createClient();

    // Update link status to inactive
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('member_org_links')
      .update({
        status: 'inactive',
        unlinked_at: new Date().toISOString(),
      })
      .eq('global_member_id', globalMemberId)
      .eq('org_id', orgId)
      .eq('status', 'active');

    if (error) {
      console.error('Error unlinking member:', error);
      return { success: false, error: 'Erreur lors de la déliaison du membre' };
    }

    // Also deactivate the local member
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: link } = await (supabase as any)
      .from('member_org_links')
      .select('local_member_id')
      .eq('global_member_id', globalMemberId)
      .eq('org_id', orgId)
      .single();

    if (link?.local_member_id) {
      await supabase
        .from('members')
        .update({ status: 'inactive' })
        .eq('id', link.local_member_id);
    }

    // Log the action
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('platform_audit_log').insert({
      actor_type: 'user',
      event_type: 'member_unlinked',
      org_id: orgId,
      target_type: 'member',
      target_id: globalMemberId,
      description: 'Member unlinked from organization',
    });

    revalidatePath('/admin/members');
    revalidatePath(`/admin/members/${globalMemberId}`);
    return { success: true };
  } catch (error) {
    console.error('Error in unlinkMemberFromOrg:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}

/**
 * Search for global members by email
 */
export async function searchGlobalMembers(
  searchTerm: string
): Promise<ActionResult<GlobalMember[]>> {
  try {
    await requireSuperAdmin();
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('global_members')
      .select('*')
      .or(
        `email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`
      )
      .limit(20);

    if (error) {
      console.error('Error searching global members:', error);
      return { success: false, error: 'Erreur lors de la recherche' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in searchGlobalMembers:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}

/**
 * Get member history across all organizations
 */
export async function getMemberHistory(
  globalMemberId: string
): Promise<
  ActionResult<{
    links: MemberOrgLink[];
    subscriptions: Array<{
      org_name: string;
      plan_name: string;
      start_date: string;
      end_date: string | null;
      status: string;
    }>;
  }>
> {
  try {
    await requireSuperAdmin();
    const supabase = await createClient();

    // Get all links (active and transferred)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: links, error: linksError } = await (supabase as any)
      .from('member_org_links')
      .select(
        `
        *,
        organization:organizations(id, name, slug),
        transferred_from:organizations!transferred_from_org_id(id, name, slug)
      `
      )
      .eq('global_member_id', globalMemberId)
      .order('created_at', { ascending: false });

    if (linksError) {
      console.error('Error fetching member history:', linksError);
      return { success: false, error: "Erreur lors de la récupération de l'historique" };
    }

    // Get subscriptions from all local members
    const localMemberIds = (links || [])
      .map((l: MemberOrgLink) => l.local_member_id)
      .filter(Boolean);

    let subscriptions: Array<{
      org_name: string;
      plan_name: string;
      start_date: string;
      end_date: string | null;
      status: string;
    }> = [];

    if (localMemberIds.length > 0) {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select(
          `
          id,
          start_date,
          end_date,
          status,
          member:members!inner(
            id,
            org_id,
            organization:organizations(name)
          ),
          plan:plans(name)
        `
        )
        .in('member_id', localMemberIds)
        .order('start_date', { ascending: false });

      if (subs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subscriptions = subs.map((s: any) => ({
          org_name: s.member?.organization?.name || 'Unknown',
          plan_name: s.plan?.name || 'Unknown',
          start_date: s.start_date,
          end_date: s.end_date,
          status: s.status,
        }));
      }
    }

    return {
      success: true,
      data: {
        links: links || [],
        subscriptions,
      },
    };
  } catch (error) {
    console.error('Error in getMemberHistory:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}
