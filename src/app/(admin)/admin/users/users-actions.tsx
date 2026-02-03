'use client';

import { useState } from 'react';
import { toggleSuperAdmin, type AdminUser } from '@/actions/admin';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Shield, ShieldOff, Eye, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UsersActionsProps {
  user: AdminUser;
}

export function UsersActions({ user }: UsersActionsProps) {
  const router = useRouter();
  const [showSuperAdminDialog, setShowSuperAdminDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleSuperAdmin = async () => {
    setIsLoading(true);
    const result = await toggleSuperAdmin(user.id, !user.is_super_admin);

    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || 'Erreur lors de la modification');
    }

    setIsLoading(false);
    setShowSuperAdminDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              window.open(`mailto:${user.email}`, '_blank')
            }
          >
            <Mail className="h-4 w-4 mr-2" />
            Envoyer un email
          </DropdownMenuItem>

          {user.organizations.length > 0 && (
            <DropdownMenuItem
              onClick={() =>
                router.push(`/admin/organizations/${user.organizations[0].id}`)
              }
            >
              <Eye className="h-4 w-4 mr-2" />
              Voir organisation
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowSuperAdminDialog(true)}
            className={user.is_super_admin ? 'text-red-600' : 'text-orange-600'}
          >
            {user.is_super_admin ? (
              <>
                <ShieldOff className="h-4 w-4 mr-2" />
                Retirer Super Admin
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Promouvoir Super Admin
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Super Admin Confirmation Dialog */}
      <AlertDialog
        open={showSuperAdminDialog}
        onOpenChange={setShowSuperAdminDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.is_super_admin
                ? 'Retirer les droits Super Admin ?'
                : 'Promouvoir en Super Admin ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user.is_super_admin
                ? `${user.email} n'aura plus acces au panel d'administration de la plateforme.`
                : `${user.email} aura un acces complet au panel d'administration de la plateforme.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleSuperAdmin}
              disabled={isLoading}
              className={
                user.is_super_admin
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-orange-500 hover:bg-orange-600'
              }
            >
              {isLoading ? 'En cours...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
