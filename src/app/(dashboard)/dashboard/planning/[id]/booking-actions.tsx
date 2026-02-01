'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { checkInMember, markNoShow, cancelBooking } from '@/actions/planning';

interface BookingActionsProps {
  bookingId: string;
  status: string;
}

export function BookingActions({ bookingId, status }: BookingActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCheckIn = () => {
    startTransition(async () => {
      const result = await checkInMember(bookingId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  const handleNoShow = () => {
    startTransition(async () => {
      const result = await markNoShow(bookingId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelBooking(bookingId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  // Si deja traite (present, absent, annule), pas d'actions
  if (status === 'attended' || status === 'no_show' || status === 'cancelled') {
    return null;
  }

  // Pour les confirmes et en liste d'attente
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isPending}>
          {isPending ? '...' : 'Actions'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status === 'confirmed' && (
          <>
            <DropdownMenuItem onClick={handleCheckIn}>
              <span className="text-green-600">Check-in</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleNoShow}>
              <span className="text-red-600">Marquer absent</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {status === 'waitlist' && (
          <>
            <DropdownMenuItem onClick={handleCheckIn}>
              <span className="text-green-600">Confirmer et Check-in</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleCancel}>
          <span className="text-muted-foreground">Annuler inscription</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
