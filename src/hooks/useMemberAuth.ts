'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Member, Organization } from '@/types/database.types';

interface MemberAuthState {
  user: User | null;
  member: Member | null;
  organization: Organization | null;
  subscriptions: MemberSubscription[];
  isLoading: boolean;
}

interface MemberSubscription {
  id: string;
  plan_name: string;
  status: string;
  start_date: string;
  end_date: string | null;
  sessions_total: number | null;
  sessions_used: number;
}

export function useMemberAuth() {
  const [state, setState] = useState<MemberAuthState>({
    user: null,
    member: null,
    organization: null,
    subscriptions: [],
    isLoading: true,
  });

  const loadMemberData = useCallback(async (user: User) => {
    const supabase = createClient();

    try {
      // Find member record linked to this user
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        console.error('No member found for user:', memberError);
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      // Fetch organization
      const { data: organization } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', member.org_id)
        .single();

      // Fetch active subscriptions with plan names
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select(`
          id,
          status,
          start_date,
          end_date,
          sessions_total,
          sessions_used,
          plan:plans(name)
        `)
        .eq('member_id', member.id)
        .in('status', ['active', 'paused'])
        .order('start_date', { ascending: false });

      const formattedSubs: MemberSubscription[] = (subscriptions || []).map((sub) => ({
        id: sub.id,
        plan_name: (sub.plan as { name: string } | null)?.name || 'Abonnement',
        status: sub.status,
        start_date: sub.start_date,
        end_date: sub.end_date,
        sessions_total: sub.sessions_total,
        sessions_used: sub.sessions_used,
      }));

      setState({
        user,
        member,
        organization,
        subscriptions: formattedSubs,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading member data:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    const getInitialSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await loadMemberData(user);
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            member: null,
            organization: null,
            subscriptions: [],
            isLoading: false,
          });
        } else if (session?.user) {
          await loadMemberData(session.user);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadMemberData]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setState({
      user: null,
      member: null,
      organization: null,
      subscriptions: [],
      isLoading: false,
    });
  };

  const refreshData = async () => {
    if (state.user) {
      setState((prev) => ({ ...prev, isLoading: true }));
      await loadMemberData(state.user);
    }
  };

  return {
    ...state,
    signOut,
    refreshData,
    isAuthenticated: !!state.user && !!state.member,
    hasActiveSubscription: state.subscriptions.some((s) => s.status === 'active'),
  };
}
