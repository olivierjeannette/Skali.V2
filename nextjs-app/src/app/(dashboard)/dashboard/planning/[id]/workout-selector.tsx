'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, X, Check, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { linkWorkoutToClass, getAvailableWorkouts } from '@/actions/planning';

interface WorkoutSelectorProps {
  classId: string;
  orgId: string;
  currentWorkoutId: string | null;
  currentWorkoutTitle: string | null;
}

interface Workout {
  id: string;
  title: string;
  scheduled_date: string | null;
  wod_type: string | null;
}

const wodTypeLabels: Record<string, string> = {
  amrap: 'AMRAP',
  emom: 'EMOM',
  for_time: 'For Time',
  tabata: 'Tabata',
  rounds: 'Rounds',
  max_reps: 'Max Reps',
  max_weight: 'Max Weight',
  chipper: 'Chipper',
  ladder: 'Ladder',
  custom: 'Custom',
};

export function WorkoutSelector({
  classId,
  orgId,
  currentWorkoutId,
  currentWorkoutTitle,
}: WorkoutSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getAvailableWorkouts(orgId)
        .then(setWorkouts)
        .finally(() => setIsLoading(false));
    }
  }, [open, orgId]);

  const handleSelect = (workoutId: string | null) => {
    startTransition(async () => {
      const result = await linkWorkoutToClass(classId, workoutId);
      if (result.success) {
        setOpen(false);
        router.refresh();
      }
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="space-y-3">
      {currentWorkoutId ? (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            <span className="font-medium">{currentWorkoutTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/workouts/${currentWorkoutId}`}>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSelect(null)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucun workout associe a ce cours.
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Dumbbell className="h-4 w-4 mr-2" />
            {currentWorkoutId ? 'Changer le workout' : 'Associer un workout'}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selectionner un workout</DialogTitle>
            <DialogDescription>
              Choisissez le workout a associer a ce cours.
            </DialogDescription>
          </DialogHeader>
          <Command className="rounded-lg border shadow-md">
            <CommandInput placeholder="Rechercher un workout..." />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <CommandEmpty>Aucun workout trouve.</CommandEmpty>
                  <CommandGroup heading="Workouts publies">
                    {workouts.map((workout) => (
                      <CommandItem
                        key={workout.id}
                        value={workout.title}
                        onSelect={() => handleSelect(workout.id)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {currentWorkoutId === workout.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                          <span>{workout.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {workout.wod_type && (
                            <Badge variant="secondary" className="text-xs">
                              {wodTypeLabels[workout.wod_type] || workout.wod_type}
                            </Badge>
                          )}
                          {workout.scheduled_date && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(workout.scheduled_date)}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}
