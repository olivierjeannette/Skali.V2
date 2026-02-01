import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Profile, Organization, OrganizationUser } from '@/types/database.types';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  currentOrg: Organization | null;
  orgRole: OrganizationUser['role'] | null;
  organizations: Organization[];
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setCurrentOrg: (org: Organization | null) => void;
  setOrgRole: (role: OrganizationUser['role'] | null) => void;
  setOrganizations: (orgs: Organization[]) => void;
  setIsLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  currentOrg: null,
  orgRole: null,
  organizations: [],
  isLoading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setCurrentOrg: (org) => set({ currentOrg: org }),
  setOrgRole: (role) => set({ orgRole: role }),
  setOrganizations: (orgs) => set({ organizations: orgs }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({
    user: null,
    profile: null,
    currentOrg: null,
    orgRole: null,
    organizations: [],
    isLoading: false,
  }),
}));
