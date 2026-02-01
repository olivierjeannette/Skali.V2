'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, parseISO, isToday, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dumbbell,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Target,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMemberAuth } from '@/hooks/useMemberAuth';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface WorkoutSummary {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  wod_type: string | null;
  has_scored: boolean;
  score_value: number | null;
  score_type: string | null;
  is_rx: boolean | null;
}

export default function MemberWodListPage() {
  const { member } = useMemberAuth();
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!member) return;

    const loadWorkouts = async () => {
      const supabase = createClient();

      try {
        // Get last 14 days of published workouts
        const startDate = subDays(new Date(), 14);

        const { data: workoutsData, error } = await supabase
          .from('workouts')
          .select('id, title, description, scheduled_date, wod_type')
          .eq('org_id', member.org_id)
          .eq('status', 'published')
          .gte('scheduled_date', startDate.toISOString().split('T')[0])
          .lte('scheduled_date', new Date().toISOString().split('T')[0])
          .order('scheduled_date', { ascending: false });

        if (error) throw error;

        // Get member's scores for these workouts
        const workoutIds = workoutsData?.map((w) => w.id) || [];
        const scoresMap: Record<string, { value: number; type: string; is_rx: boolean }> = {};

        if (workoutIds.length > 0) {
          const { data: scores } = await supabase
            .from('workout_scores')
            .select('workout_id, score_value, score_type, is_rx')
            .eq('member_id', member.id)
            .in('workout_id', workoutIds);

          scores?.forEach((s) => {
            scoresMap[s.workout_id] = {
              value: s.score_value,
              type: s.score_type,
              is_rx: s.is_rx,
            };
          });
        }

        const formattedWorkouts: WorkoutSummary[] = (workoutsData || []).map((w) => ({
          id: w.id,
          title: w.title,
          description: w.description,
          scheduled_date: w.scheduled_date,
          wod_type: w.wod_type,
          has_scored: !!scoresMap[w.id],
          score_value: scoresMap[w.id]?.value || null,
          score_type: scoresMap[w.id]?.type || null,
          is_rx: scoresMap[w.id]?.is_rx || null,
        }));

        setWorkouts(formattedWorkouts);
      } catch (error) {
        console.error('Error loading workouts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkouts();
  }, [member]);

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Aujourd'hui";
    return format(date, 'EEEE d MMMM', { locale: fr });
  };

  const formatScore = (type: string | null, value: number | null) => {
    if (!type || value === null) return '-';

    switch (type) {
      case 'time':
        const minutes = Math.floor(value / 60);
        const seconds = Math.round(value % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      case 'reps':
        return `${value} reps`;
      case 'rounds_reps':
        const rounds = Math.floor(value);
        const reps = Math.round((value - rounds) * 100);
        return `${rounds} + ${reps}`;
      case 'weight':
        return `${value} kg`;
      case 'calories':
        return `${value} cal`;
      case 'distance':
        return `${value} m`;
      default:
        return `${value}`;
    }
  };

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

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 md:ml-64">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Dumbbell className="h-6 w-6" />
          WODs
        </h1>
        <p className="text-muted-foreground">
          Les seances des 14 derniers jours
        </p>
      </div>

      {/* Workouts list */}
      {workouts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Aucun WOD publie recemment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workouts.map((workout) => {
            const isWorkoutToday = workout.scheduled_date ? isToday(parseISO(workout.scheduled_date)) : false;

            return (
              <Link key={workout.id} href={`/member/wod/${workout.id}`}>
                <Card className={cn(
                  'transition-colors hover:bg-muted/50 cursor-pointer',
                  isWorkoutToday && 'border-primary'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-muted-foreground capitalize">
                            {workout.scheduled_date ? formatDate(workout.scheduled_date) : 'Date non définie'}
                          </span>
                          {isWorkoutToday && (
                            <Badge variant="default" className="text-xs">
                              Aujourd&apos;hui
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold truncate">{workout.title}</h3>
                        {workout.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {workout.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {workout.wod_type && (
                            <Badge variant="secondary" className="text-xs">
                              {wodTypeLabels[workout.wod_type] || workout.wod_type}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {workout.has_scored ? (
                          <>
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-sm font-medium">Score</span>
                            </div>
                            <p className="text-lg font-bold text-primary">
                              {formatScore(workout.score_type, workout.score_value)}
                            </p>
                            {workout.is_rx && (
                              <Badge variant="outline" className="text-xs">
                                RX
                              </Badge>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Target className="h-4 w-4" />
                            <span className="text-sm">Pas de score</span>
                          </div>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground mt-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
