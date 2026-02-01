'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth';
import type { Organization, OrganizationUser } from '@/types/database.types';

interface OrgUserWithOrg {
  role: OrganizationUser['role'];
  organization: Organization;
}

export function useAuth() {
  const {
    user,
    profile,
    currentOrg,
    orgRole,
    organizations,
    isLoading,
    setUser,
    setProfile,
    setCurrentOrg,
    setOrgRole,
    setOrganizations,
    setIsLoading,
    reset,
  } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    const getInitialSession = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          // Fetch profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          setProfile(profile);

          // Fetch organizations
          const { data: orgUsers } = await supabase
            .from('organization_users')
            .select(`
              role,
              organization:organizations(*)
            `)
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (orgUsers && orgUsers.length > 0) {
            const typedOrgUsers = orgUsers as unknown as OrgUserWithOrg[];
            const orgs = typedOrgUsers.map((ou) => ou.organization);
            setOrganizations(orgs);

            // Set first org as current by default
            setCurrentOrg(orgs[0]);
            setOrgRole(typedOrgUsers[0].role);
          }
        }
      } catch (error) {
        console.error('Error getting session:', error);
        reset();
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          reset();
        } else if (session?.user) {
          setUser(session.user);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
  };

  const switchOrg = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      // TODO: Fetch role for this org
    }
  };

  return {
    user,
    profile,
    currentOrg,
    orgRole,
    organizations,
    isLoading,
    signOut,
    switchOrg,
    isAuthenticated: !!user,
    isOwner: orgRole === 'owner',
    isAdmin: orgRole === 'owner' || orgRole === 'admin',
    isCoach: orgRole === 'owner' || orgRole === 'admin' || orgRole === 'coach',
  };
}
