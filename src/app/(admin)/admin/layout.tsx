/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

async function checkSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Note: is_super_admin n'existe pas encore - utiliser 'as any'
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('is_super_admin, email, full_name')
    .eq('id', user.id)
    .single();

  if (!profile?.is_super_admin) {
    redirect('/dashboard');
  }

  return { user, profile: profile as { is_super_admin: boolean; email: string; full_name: string | null } };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await checkSuperAdmin();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Link href="/admin" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-bold">
                  SP
                </div>
                <span className="font-semibold">Skali Prog Admin</span>
              </Link>
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                Super Admin
              </span>
            </div>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link
                href="/admin"
                className="text-gray-300 hover:text-white transition"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/organizations"
                className="text-gray-300 hover:text-white transition"
              >
                Organisations
              </Link>
              <Link
                href="/admin/users"
                className="text-gray-300 hover:text-white transition"
              >
                Utilisateurs
              </Link>
              <Link
                href="/admin/billing"
                className="text-gray-300 hover:text-white transition"
              >
                Facturation
              </Link>
              <Link
                href="/admin/analytics"
                className="text-gray-300 hover:text-white transition"
              >
                Analytics
              </Link>
              <Link
                href="/admin/plans"
                className="text-gray-300 hover:text-white transition"
              >
                Plans
              </Link>
              <Link
                href="/admin/coupons"
                className="text-gray-300 hover:text-white transition"
              >
                Coupons
              </Link>
              <Link
                href="/admin/audit"
                className="text-gray-300 hover:text-white transition"
              >
                Audit
              </Link>
              <Link
                href="/admin/settings"
                className="text-gray-300 hover:text-white transition"
              >
                Config
              </Link>
            </nav>

            {/* User */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                {profile.full_name || profile.email}
              </span>
              <Link
                href="/dashboard"
                className="text-sm text-orange-400 hover:text-orange-300"
              >
                Retour Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
