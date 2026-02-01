'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  suspendOrganization,
  activateOrganization,
  changePlan,
  inviteOwner,
} from '@/actions/platform';
import type { OrganizationWithPlatform, PlatformPlanTier } from '@/types/platform.types';

interface OrganizationActionsProps {
  org: OrganizationWithPlatform;
}

export function OrganizationActions({ org }: OrganizationActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<{
    type: 'suspend' | 'activate' | 'plan' | 'invite' | null;
  }>({ type: null });
  const [selectedPlan, setSelectedPlan] = useState<PlatformPlanTier>(
    org.plan?.tier || 'basic'
  );
  const [inviteEmail, setInviteEmail] = useState(org.billing_email || '');

  const handleSuspend = async () => {
    setLoading(true);
    const result = await suspendOrganization(org.id);
    setLoading(false);

    if (result.success) {
      setDialog({ type: null });
      router.refresh();
    }
  };

  const handleActivate = async () => {
    setLoading(true);
    const result = await activateOrganization(org.id);
    setLoading(false);

    if (result.success) {
      setDialog({ type: null });
      router.refresh();
    }
  };

  const handleChangePlan = async () => {
    setLoading(true);
    const result = await changePlan(org.id, selectedPlan);
    setLoading(false);

    if (result.success) {
      setDialog({ type: null });
      router.refresh();
    }
  };

  const handleInvite = async () => {
    setLoading(true);
    const result = await inviteOwner({
      org_id: org.id,
      email: inviteEmail,
    });
    setLoading(false);

    if (result.success) {
      setDialog({ type: null });
      router.refresh();
    }
  };

  return (
    <div className="space-y-3">
      {/* Change Plan */}
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => setDialog({ type: 'plan' })}
      >
        Changer de plan
      </Button>

      {/* Invite Owner */}
      {!org.owner_user_id && (
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => setDialog({ type: 'invite' })}
        >
          Inviter le proprietaire
        </Button>
      )}

      {/* Impersonate */}
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => {
          // Store in session and redirect
          window.location.href = `/dashboard?impersonate=${org.id}`;
        }}
      >
        Se connecter en tant que
      </Button>

      {/* Suspend / Activate */}
      {org.is_active ? (
        <Button
          variant="outline"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => setDialog({ type: 'suspend' })}
        >
          Suspendre l&apos;organisation
        </Button>
      ) : (
        <Button
          variant="outline"
          className="w-full justify-start text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={() => setDialog({ type: 'activate' })}
        >
          Reactiver l&apos;organisation
        </Button>
      )}

      {/* Suspend Dialog */}
      <Dialog
        open={dialog.type === 'suspend'}
        onOpenChange={(open) => !open && setDialog({ type: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspendre l&apos;organisation</DialogTitle>
            <DialogDescription>
              Cette action va desactiver l&apos;acces a la plateforme pour cette
              salle. Les donnees seront conservees.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog({ type: null })}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={loading}
            >
              {loading ? 'Suspension...' : 'Suspendre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Dialog */}
      <Dialog
        open={dialog.type === 'activate'}
        onOpenChange={(open) => !open && setDialog({ type: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactiver l&apos;organisation</DialogTitle>
            <DialogDescription>
              Cette action va redonner l&apos;acces a la plateforme pour cette
              salle.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog({ type: null })}
            >
              Annuler
            </Button>
            <Button onClick={handleActivate} disabled={loading}>
              {loading ? 'Reactivation...' : 'Reactiver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog
        open={dialog.type === 'plan'}
        onOpenChange={(open) => !open && setDialog({ type: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer de plan</DialogTitle>
            <DialogDescription>
              Selectionnez le nouveau plan pour cette organisation
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <select
              value={selectedPlan}
              onChange={(e) =>
                setSelectedPlan(e.target.value as PlatformPlanTier)
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="free_trial">Essai gratuit</option>
              <option value="basic">Basic (29 EUR/mois)</option>
              <option value="pro">Pro (79 EUR/mois)</option>
              <option value="enterprise">Enterprise (149 EUR/mois)</option>
            </select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog({ type: null })}
            >
              Annuler
            </Button>
            <Button onClick={handleChangePlan} disabled={loading}>
              {loading ? 'Changement...' : 'Changer le plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog
        open={dialog.type === 'invite'}
        onOpenChange={(open) => !open && setDialog({ type: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter le proprietaire</DialogTitle>
            <DialogDescription>
              Un email d&apos;invitation sera envoye a cette adresse
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog({ type: null })}
            >
              Annuler
            </Button>
            <Button
              onClick={handleInvite}
              disabled={loading || !inviteEmail}
            >
              {loading ? 'Envoi...' : 'Envoyer l\'invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
