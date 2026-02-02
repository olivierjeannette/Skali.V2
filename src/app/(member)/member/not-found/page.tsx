'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserX, LogOut, RefreshCw } from 'lucide-react';
import { logout } from '@/actions/auth';
import { useState } from 'react';

export default function MemberNotFoundPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleRetry = () => {
    setIsLoading(true);
    router.push('/member');
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await logout();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <UserX className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle>Profil membre introuvable</CardTitle>
          <CardDescription>
            Votre compte utilisateur n&apos;est pas associé à un profil membre.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Si vous êtes membre d&apos;une salle, contactez votre coach pour qu&apos;il
            associe votre compte à votre profil membre.
          </p>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleRetry}
              disabled={isLoading}
              className="w-full"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Réessayer
            </Button>

            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-4">
            Besoin d&apos;aide? Contactez{' '}
            <a href="mailto:support@skaliprog.com" className="text-primary hover:underline">
              support@skaliprog.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
