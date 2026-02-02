import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function getCurrentOrganization() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get the first organization the user belongs to
  const { data: orgUser } = await supabase
    .from('organization_users')
    .select(`
      role,
      org_id,
      organizations (
        id,
        name,
        slug,
        logo_url,
        settings,
        features
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!orgUser || !orgUser.organizations) {
    return null;
  }

  return {
    ...orgUser.organizations,
    role: orgUser.role,
  };
}

export async function requireOrganization() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const org = await getCurrentOrganization();
  if (!org) {
    // Redirect to onboarding instead of login to avoid redirect loop
    // User is authenticated but has no organization
    redirect('/onboarding');
  }

  return {
    ...org,
    orgId: org.id,
    userId: user.id,
  };
}

/**
 * Require a logged-in member (for portal pages)
 * Returns the member record and org info
 */
export async function requireMember() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Find member linked to this user
  const { data: member, error } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !member) {
    // User is authenticated but not linked to a member
    // Redirect to a safe page instead of login to avoid redirect loop
    redirect('/member/not-found');
  }

  return {
    member,
    orgId: member.org_id,
    userId: user.id,
  };
}
