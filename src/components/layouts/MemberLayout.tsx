'use client';

import { type FC, type ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Calendar,
  Dumbbell,
  Trophy,
  User,
  Menu,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemberAuth } from '@/hooks/useMemberAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface Props {
  children: ReactNode;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { title: 'Accueil', href: '/member', icon: Home },
  { title: 'Planning', href: '/member/planning', icon: Calendar },
  { title: 'WOD', href: '/member/wod', icon: Dumbbell },
  { title: 'Performances', href: '/member/performances', icon: Trophy },
  { title: 'Profil', href: '/member/profile', icon: User },
];

export const MemberLayout: FC<Props> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { member, organization, signOut, isLoading } = useMemberAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const initials = member
    ? `${member.first_name[0]}${member.last_name[0]}`.toUpperCase()
    : '?';

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header mobile */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Logo / Org name */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              {organization?.name?.[0] || 'S'}
            </div>
            <span className="font-semibold text-sm truncate max-w-[150px]">
              {organization?.name || 'Skali Prog'}
            </span>
          </div>

          {/* User avatar & menu mobile */}
          <div className="flex items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <div className="flex flex-col h-full">
                  {/* User info */}
                  <div className="border-b p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {member?.first_name} {member?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {member?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation mobile */}
                  <nav className="flex-1 p-4">
                    <ul className="space-y-1">
                      {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                                isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              <Icon className="h-5 w-5" />
                              {item.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>

                  {/* Logout */}
                  <div className="border-t p-4">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4" />
                      Deconnexion
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Avatar desktop */}
            <Avatar className="h-8 w-8 hidden md:flex">
              <AvatarImage src={member?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-6">
        {children}
      </main>

      {/* Bottom navigation mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
        <ul className="flex justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2 text-xs transition-colors',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                  <span className={cn(isActive && 'font-medium')}>{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop sidebar - hidden on mobile */}
      <aside className="fixed left-0 top-14 hidden h-[calc(100vh-3.5rem)] w-64 border-r bg-background md:block">
        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
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
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info & logout desktop */}
        <div className="absolute bottom-0 left-0 right-0 border-t p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={member?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {member?.first_name} {member?.last_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {member?.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Deconnexion
          </Button>
        </div>
      </aside>

      {/* Spacer for desktop sidebar */}
      <div className="hidden md:block md:w-64 md:flex-shrink-0" />
    </div>
  );
};
