'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cancelClass } from '@/actions/planning';

interface ClassActionsProps {
  classId: string;
  status: string;
  isPast: boolean;
  isInProgress: boolean;
}

export function ClassActions({ classId, status, isPast, isInProgress }: ClassActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const isCancelled = status === 'cancelled';
  const isCompleted = status === 'completed';

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelClass(classId, cancelReason || undefined);
      if (result.success) {
        setShowCancelDialog(false);
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  if (isCancelled) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Ce cours a ete annule
      </div>
    );
  }

  if (isCompleted || isPast) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Ce cours est termine
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isInProgress && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          Ce cours est en cours
        </div>
      )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            Annuler le cours
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce cours ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action annulera le cours et toutes les reservations associees.
              Les membres inscrits seront notifies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="cancelReason">Raison de l&apos;annulation (optionnel)</Label>
            <Textarea
              id="cancelReason"
              placeholder="Ex: Coach malade, conditions meteo..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Annulation...' : 'Confirmer l\'annulation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="text-xs text-muted-foreground text-center">
        L&apos;annulation enverra une notification aux participants
      </p>
    </div>
  );
}
