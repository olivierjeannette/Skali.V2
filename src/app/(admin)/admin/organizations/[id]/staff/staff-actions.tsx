'use client';

import { useState } from 'react';
import {
  updateStaffRole,
  toggleStaffActive,
  removeStaffFromOrganization,
  addStaffToOrganization,
  type OrgStaffMember,
} from '@/actions/admin';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  MoreHorizontal,
  UserMinus,
  UserCheck,
  UserX,
  Crown,
  Shield,
  Users,
  Briefcase,
  Plus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StaffActionsProps {
  member: OrgStaffMember;
  orgId: string;
}

export function StaffActions({ member, orgId }: StaffActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = async (newRole: 'owner' | 'admin' | 'coach' | 'staff') => {
    setIsLoading(true);
    const result = await updateStaffRole(member.id, newRole);
    if (!result.success) {
      alert(result.error || 'Erreur');
    }
    router.refresh();
    setIsLoading(false);
  };

  const handleToggleActive = async () => {
    setIsLoading(true);
    const result = await toggleStaffActive(member.id, !member.is_active);
    if (!result.success) {
      alert(result.error || 'Erreur');
    }
    router.refresh();
    setIsLoading(false);
  };

  const handleRemove = async () => {
    setIsLoading(true);
    const result = await removeStaffFromOrganization(member.id);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || 'Erreur');
    }
    setIsLoading(false);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isLoading}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Change Role */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Shield className="h-4 w-4 mr-2" />
              Changer le role
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => handleRoleChange('owner')}
                disabled={member.role === 'owner'}
              >
                <Crown className="h-4 w-4 mr-2 text-orange-500" />
                Proprietaire
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleRoleChange('admin')}
                disabled={member.role === 'admin'}
              >
                <Shield className="h-4 w-4 mr-2 text-blue-500" />
                Admin
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleRoleChange('coach')}
                disabled={member.role === 'coach'}
              >
                <Users className="h-4 w-4 mr-2 text-green-500" />
                Coach
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleRoleChange('staff')}
                disabled={member.role === 'staff'}
              >
                <Briefcase className="h-4 w-4 mr-2 text-gray-500" />
                Staff
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Toggle Active */}
          <DropdownMenuItem onClick={handleToggleActive}>
            {member.is_active ? (
              <>
                <UserX className="h-4 w-4 mr-2 text-red-500" />
                Desactiver
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2 text-green-500" />
                Reactiver
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Remove */}
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600"
          >
            <UserMinus className="h-4 w-4 mr-2" />
            Retirer de l&apos;organisation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Remove Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Retirer {member.user?.full_name || member.user?.email} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette personne n&apos;aura plus acces a cette organisation. Vous
              pourrez l&apos;ajouter a nouveau plus tard si necessaire.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'En cours...' : 'Retirer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Add Staff Dialog
interface AddStaffDialogProps {
  orgId: string;
}

export function AddStaffDialog({ orgId }: AddStaffDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'coach' | 'staff'>('coach');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await addStaffToOrganization(orgId, email, role);

    if (result.success) {
      setOpen(false);
      setEmail('');
      setRole('coach');
      router.refresh();
    } else {
      setError(result.error || 'Erreur lors de l\'ajout');
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un membre
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un membre du staff</DialogTitle>
          <DialogDescription>
            L&apos;utilisateur doit deja avoir un compte sur la plateforme.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email de l&apos;utilisateur</Label>
            <Input
              id="email"
              type="email"
              placeholder="coach@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'coach' | 'staff')}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="admin">Admin</option>
              <option value="coach">Coach</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isLoading ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
