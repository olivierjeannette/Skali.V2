'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { pauseSubscription, resumeSubscription, cancelSubscription } from '@/actions/subscriptions';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SubscriptionActionsProps {
  subscriptionId: string;
  status: string;
}

export function SubscriptionActions({ subscriptionId, status }: SubscriptionActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePause() {
    setIsLoading(true);
    setError(null);
    const result = await pauseSubscription(subscriptionId);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  }

  async function handleResume() {
    setIsLoading(true);
    setError(null);
    const result = await resumeSubscription(subscriptionId);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  }

  async function handleCancel() {
    setIsLoading(true);
    setError(null);
    const result = await cancelSubscription(subscriptionId);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  }

  const canPause = status === 'active';
  const canResume = status === 'paused';
  const canCancel = status === 'active' || status === 'paused';

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        {canPause && (
          <Button
            variant="secondary"
            onClick={handlePause}
            disabled={isLoading}
          >
            {isLoading ? 'Chargement...' : 'Mettre en pause'}
          </Button>
        )}

        {canResume && (
          <Button
            variant="default"
            onClick={handleResume}
            disabled={isLoading}
          >
            {isLoading ? 'Chargement...' : 'Reprendre'}
          </Button>
        )}

        {canCancel && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isLoading}>
                Annuler l&apos;abonnement
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Annuler l&apos;abonnement ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irreversible. L&apos;abonnement sera definitivement annule
                  et le membre perdra l&apos;acces aux services associes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Retour</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCancel}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirmer l&apos;annulation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {status === 'cancelled' && (
          <p className="text-muted-foreground">
            Cet abonnement a ete annule et ne peut plus etre modifie.
          </p>
        )}

        {status === 'expired' && (
          <p className="text-muted-foreground">
            Cet abonnement a expire. Vous pouvez creer un nouvel abonnement pour ce membre.
          </p>
        )}
      </div>
    </div>
  );
}
