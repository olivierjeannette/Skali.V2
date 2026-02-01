'use client';

import { type FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Users,
  Calendar,
  Dumbbell,
  CreditCard,
  Target,
  Settings,
  BarChart3,
  MessageSquare,
  FileText,
  Tv,
  Workflow,
  Home,
  Shuffle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
  requiredRole?: 'owner' | 'admin' | 'coach' | 'staff';
}

const navItems: NavItem[] = [
  { titleKey: 'dashboard', href: '/dashboard', icon: Home },
  { titleKey: 'analytics', href: '/dashboard/analytics', icon: BarChart3, requiredRole: 'admin' },
  { titleKey: 'members', href: '/dashboard/members', icon: Users },
  { titleKey: 'planning', href: '/dashboard/planning', icon: Calendar },
  { titleKey: 'workouts', href: '/dashboard/workouts', icon: Dumbbell },
  { titleKey: 'subscriptions', href: '/dashboard/subscriptions', icon: CreditCard, requiredRole: 'admin' },
  { titleKey: 'crm', href: '/dashboard/crm', icon: Target, requiredRole: 'admin' },
  { titleKey: 'teams', href: '/dashboard/teams', icon: Shuffle },
  { titleKey: 'communications', href: '/dashboard/communications', icon: MessageSquare, requiredRole: 'admin' },
  { titleKey: 'documents', href: '/dashboard/documents', icon: FileText, requiredRole: 'admin' },
  { titleKey: 'tvDisplay', href: '/dashboard/tv', icon: Tv },
  { titleKey: 'workflows', href: '/dashboard/workflows', icon: Workflow, requiredRole: 'admin' },
  { titleKey: 'settings', href: '/dashboard/settings', icon: Settings, requiredRole: 'admin' },
];

const roleHierarchy: Record<string, number> = {
  owner: 4,
  admin: 3,
  coach: 2,
  staff: 1,
};

export const Sidebar: FC = () => {
  const pathname = usePathname();
  const { currentOrg, orgRole } = useAuth();
  const t = useTranslations('nav');

  const userRoleLevel = orgRole ? roleHierarchy[orgRole] : 0;

  const filteredNavItems = navItems.filter((item) => {
    if (!item.requiredRole) return true;
    return userRoleLevel >= roleHierarchy[item.requiredRole];
  });

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            S
          </div>
          <span className="text-lg font-semibold">
            {currentOrg?.name || 'Skali Prog'}
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(item.titleKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          Skali Prog v3.0
        </p>
      </div>
    </aside>
  );
};
