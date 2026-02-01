import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Edit,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Dumbbell,
  Trophy,
  Users,
} from 'lucide-react';
import { getWorkoutById, getWorkoutScores } from '@/actions/workouts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScoreForm } from './score-form';

const blockTypeLabels: Record<string, { label: string; color: string }> = {
  warmup: { label: 'Warm-up', color: 'bg-orange-100 text-orange-700' },
  skill: { label: 'Skill', color: 'bg-blue-100 text-blue-700' },
  strength: { label: 'Force', color: 'bg-purple-100 text-purple-700' },
  wod: { label: 'WOD', color: 'bg-red-100 text-red-700' },
  cooldown: { label: 'Cool-down', color: 'bg-green-100 text-green-700' },
  accessory: { label: 'Accessoire', color: 'bg-gray-100 text-gray-700' },
  custom: { label: 'Custom', color: 'bg-slate-100 text-slate-700' },
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

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workout = await getWorkoutById(id);

  if (!workout) {
    notFound();
  }

  const scores = await getWorkoutScores(id);

  // Sort scores for leaderboard
  const sortedScores = [...scores].sort((a, b) => {
    // RX first
    if (a.is_rx !== b.is_rx) return b.is_rx ? 1 : -1;
    // Then by score (depends on type)
    if (a.score_type === 'time') {
      return a.score_value - b.score_value;
    }
    return b.score_value - a.score_value;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/workouts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{workout.name}</h1>
              {workout.is_published ? (
                <Badge className="bg-green-500">
                  <Eye className="mr-1 h-3 w-3" />
                  Publie
                </Badge>
              ) : (
                <Badge variant="outline">
                  <EyeOff className="mr-1 h-3 w-3" />
                  Brouillon
                </Badge>
              )}
              {workout.is_template && (
                <Badge variant="secondary">Template</Badge>
              )}
            </div>
            {workout.date && (
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(workout.date), 'EEEE d MMMM yyyy', {
                  locale: fr,
                })}
              </p>
            )}
            {workout.description && (
              <p className="text-muted-foreground mt-2">{workout.description}</p>
            )}
          </div>
        </div>
        <Link href={`/dashboard/workouts/${id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Workout Blocks */}
        <div className="space-y-4 lg:col-span-2">
          {workout.blocks && workout.blocks.length > 0 ? (
            workout.blocks.map((block) => {
              const blockType = blockTypeLabels[block.block_type] || {
                label: block.block_type,
                color: 'bg-gray-100 text-gray-700',
              };

              return (
                <Card key={block.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={blockType.color}>{blockType.label}</Badge>
                        {block.name && (
                          <span className="font-medium">{block.name}</span>
                        )}
                      </div>
                      {block.wod_type && (
                        <Badge variant="outline">
                          {wodTypeLabels[block.wod_type] || block.wod_type}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Time/Rounds info */}
                    {(block.time_cap || block.rounds || block.work_time) && (
                      <div className="flex flex-wrap gap-4 text-sm">
                        {block.time_cap && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{block.time_cap} min</span>
                          </div>
                        )}
                        {block.rounds && (
                          <div className="flex items-center gap-1">
                            <Dumbbell className="h-4 w-4 text-muted-foreground" />
                            <span>{block.rounds} rounds</span>
                          </div>
                        )}
                        {block.work_time && (
                          <span>
                            {block.work_time}s work
                            {block.rest_time && ` / ${block.rest_time}s rest`}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Exercises */}
                    {block.exercises && block.exercises.length > 0 && (
                      <div className="space-y-2">
                        {block.exercises.map((exercise) => {
                          const exerciseName =
                            exercise.exercise?.name || exercise.custom_name || 'Exercice';

                          return (
                            <div
                              key={exercise.id}
                              className="flex items-center justify-between rounded-md border p-3"
                            >
                              <div className="flex-1">
                                <span className="font-medium">{exerciseName}</span>
                                <div className="text-sm text-muted-foreground">
                                  {exercise.reps && (
                                    <span>
                                      {exercise.reps} {exercise.reps_unit}
                                    </span>
                                  )}
                                  {exercise.distance && (
                                    <span>
                                      {exercise.distance}
                                      {exercise.distance_unit}
                                    </span>
                                  )}
                                  {exercise.calories && (
                                    <span>{exercise.calories} cal</span>
                                  )}
                                  {exercise.time_seconds && (
                                    <span>{exercise.time_seconds}s</span>
                                  )}
                                </div>
                              </div>
                              {(exercise.weight_male || exercise.weight_female) && (
                                <div className="text-sm text-muted-foreground">
                                  {exercise.weight_male && (
                                    <span className="mr-2">
                                      H: {exercise.weight_male}
                                      {exercise.weight_unit}
                                    </span>
                                  )}
                                  {exercise.weight_female && (
                                    <span>
                                      F: {exercise.weight_female}
                                      {exercise.weight_unit}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Notes */}
                    {block.notes && (
                      <div className="rounded-md bg-muted p-3 text-sm">
                        {block.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Dumbbell className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Aucun bloc</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Cette seance n&apos;a pas encore de contenu
                </p>
                <Link href={`/dashboard/workouts/${id}/edit`} className="mt-4">
                  <Button>
                    <Edit className="mr-2 h-4 w-4" />
                    Ajouter du contenu
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Scores & Leaderboard */}
        <div className="space-y-6">
          {/* Add Score Form */}
          <ScoreForm workoutId={id} />

          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedScores.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Aucun score enregistre
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedScores.slice(0, 10).map((score, index) => (
                    <div
                      key={score.id}
                      className="flex items-center gap-3 rounded-md border p-3"
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          index === 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : index === 1
                              ? 'bg-gray-100 text-gray-700'
                              : index === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {score.member?.first_name} {score.member?.last_name}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>
                            {formatScore(score.score_type, score.score_value, score.score_secondary)}
                          </span>
                          {score.is_rx ? (
                            <Badge variant="default" className="text-xs">
                              RX
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Scaled
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatScore(
  type: string,
  value: number,
  secondary?: number | null
): string {
  switch (type) {
    case 'time':
      const minutes = Math.floor(value / 60);
      const seconds = Math.round(value % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    case 'rounds_reps':
      return `${Math.floor(value)} rounds${secondary ? ` + ${secondary} reps` : ''}`;
    case 'reps':
      return `${value} reps`;
    case 'weight':
      return `${value} kg`;
    case 'calories':
      return `${value} cal`;
    case 'distance':
      return `${value} m`;
    default:
      return `${value}`;
  }
}
