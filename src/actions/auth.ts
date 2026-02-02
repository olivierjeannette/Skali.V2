'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { TablesInsert } from '@/types/database.types';

// Schemas
const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Types
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

type LoginResult = {
  isSuperAdmin: boolean;
  redirectTo: string;
};

// Helper to generate slug from org name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Register new user with organization
export async function register(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  // Parse and validate
  const rawData = {
    fullName: formData.get('fullName') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    orgName: formData.get('orgName') as string,
  };

  const parsed = registerSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: 'Donnees invalides' };
  }

  const { fullName, email, password, orgName } = parsed.data;

  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return { success: false, error: 'Cet email est deja utilise' };
      }
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Erreur lors de la creation du compte' };
    }

    const userId = authData.user.id;

    // 2. Create profile
    const profileData: TablesInsert<'profiles'> = {
      id: userId,
      email,
      full_name: fullName,
    };
    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Continue anyway - profile might be created by trigger
    }

    // 3. Create organization
    const baseSlug = generateSlug(orgName);
    let slug = baseSlug;
    let slugSuffix = 0;

    // Check slug uniqueness and add suffix if needed
    while (true) {
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!existingOrg) break;

      slugSuffix++;
      slug = `${baseSlug}-${slugSuffix}`;
    }

    const orgData: TablesInsert<'organizations'> = {
      name: orgName,
      slug,
      settings: {},
      features: {
        members: true,
        subscriptions: true,
        classes: true,
        bookings: true,
      },
    };
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert(orgData)
      .select('id')
      .single();

    if (orgError || !org) {
      console.error('Organization creation error:', orgError);
      return { success: false, error: 'Erreur lors de la creation de la salle' };
    }

    // 4. Link user to organization as owner
    const orgUserData: TablesInsert<'organization_users'> = {
      org_id: org.id,
      user_id: userId,
      role: 'owner',
      permissions: {},
      is_active: true,
    };
    const { error: linkError } = await supabase
      .from('organization_users')
      .insert(orgUserData);

    if (linkError) {
      console.error('Organization link error:', linkError);
      return { success: false, error: 'Erreur lors de la configuration du compte' };
    }

    return { success: true };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

// Login
export async function login(formData: FormData): Promise<ActionResult<LoginResult>> {
  const supabase = await createClient();

  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: 'Email ou mot de passe invalide' };
  }

  const { email, password } = parsed.data;

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { success: false, error: 'Email ou mot de passe incorrect' };
    }
    if (error.message.includes('Email not confirmed')) {
      return { success: false, error: 'Veuillez confirmer votre email avant de vous connecter' };
    }
    return { success: false, error: error.message };
  }

  // Check if user is super admin
  // Note: Using 'as any' because is_super_admin may not be in generated types yet
  let isSuperAdmin = false;
  if (authData.user) {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('is_super_admin')
      .eq('id', authData.user.id)
      .single();

    isSuperAdmin = profile?.is_super_admin === true;
  }

  return {
    success: true,
    data: {
      isSuperAdmin,
      redirectTo: isSuperAdmin ? '/admin' : '/dashboard'
    }
  };
}

// Logout
export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// Forgot password
export async function forgotPassword(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const email = formData.get('email') as string;

  if (!email || !z.string().email().safeParse(email).success) {
    return { success: false, error: 'Email invalide' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });

  if (error) {
    console.error('Forgot password error:', error);
    // Don't reveal if email exists or not
  }

  // Always return success to prevent email enumeration
  return { success: true };
}

// Reset password
export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const password = formData.get('password') as string;

  if (!password || password.length < 8) {
    return { success: false, error: 'Le mot de passe doit contenir au moins 8 caracteres' };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { success: false, error: 'Erreur lors de la reinitialisation du mot de passe' };
  }

  return { success: true };
}

// Get current user's organizations
export async function getUserOrganizations() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: orgUsers } = await supabase
    .from('organization_users')
    .select(`
      role,
      organizations (
        id,
        name,
        slug,
        logo_url
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true);

  return orgUsers || [];
}
