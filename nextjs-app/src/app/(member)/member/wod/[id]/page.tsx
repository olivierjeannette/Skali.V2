'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowLeft,
  Dumbbell,
  Clock,
  RotateCcw,
  Flame,
  Target,
  Trophy,
  Save,
  Loader2,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMemberAuth } from '@/hooks/useMemberAuth';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WorkoutBlock {
  id: string;
  name: string | null;
  block_type: string;
  wod_type: string | null;
  time_cap: number | null;
  rounds: number | null;
  work_time: number | null;
  rest_time: number | null;
  notes: string | null;
  exercises: BlockExercise[];
}

interface BlockExercise {
  id: string;
  exercise_name: string;
  reps: number | null;
  reps_unit: string | null;
  weight_male: number | null;
  weight_female: number | null;
  weight_unit: string | null;
  distance: number | null;
  distance_unit: string | null;
  time_seconds: number | null;
  calories: number | null;
  notes: string | null;
}

interface Workout {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  wod_type: string | null;
  blocks: WorkoutBlock[];
}

interface LeaderboardEntry {
  rank: number;
  member_name: string;
  score_value: number;
  score_type: string;
  is_rx: boolean;
}

interface MemberScore {
  id: string;
  score_value: number;
  score_type: string;
  is_rx: boolean;
  notes: string | null;
}

const scoreSchema = z.object({
  score_type: z.string(),
  score_value: z.string().min(1, 'Score requis'),
  score_minutes: z.string().optional(),
  score_seconds: z.string().optional(),
  score_rounds: z.string().optional(),
  score_reps: z.string().optional(),
  is_rx: z.boolean(),
  notes: z.string().optional(),
});

type ScoreFormData = z.infer<typeof scoreSchema>;

export default function MemberWodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { member } = useMemberAuth();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [memberScore, setMemberScore] = useState<MemberScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('workout');

  const form = useForm<ScoreFormData>({
    resolver: zodResolver(scoreSchema),
    defaultValues: {
      score_type: 'time',
      score_value: '',
      score_minutes: '',
      score_seconds: '',
      score_rounds: '',
      score_reps: '',
      is_rx: true,
      notes: '',
    },
  });

  const scoreType = form.watch('score_type');

  useEffect(() => {
    if (!member || !params.id) return;

    const loadWorkout = async () => {
      const supabase = createClient();
      const workoutId = params.id as string;

      try {
        // Fetch workout with blocks and exercises
        const { data: workoutData, error: workoutError } = await supabase
          .from('workouts')
          .select(`
            id,
            title,
            description,
            scheduled_date,
            wod_type,
            blocks:workout_blocks(
              id,
              name,
              block_type,
              wod_type,
              time_cap,
              rounds,
              work_time,
              rest_time,
              notes,
              position,
              exercises:block_exercises(
                id,
                custom_name,
                reps,
                reps_unit,
                weight_male,
                weight_female,
                weight_unit,
                distance,
                distance_unit,
                time_seconds,
                calories,
                notes,
                position,
                exercise:exercises(name)
              )
            )
          `)
          .eq('id', workoutId)
          .eq('status', 'published')
          .single();

        if (workoutError) throw workoutError;

        // Sort blocks and exercises by position
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawBlocks = workoutData.blocks as any[] || [];
        const formattedWorkout: Workout = {
          id: workoutData.id,
          title: workoutData.title,
          description: workoutData.description,
          scheduled_date: workoutData.scheduled_date,
          wod_type: workoutData.wod_type,
          blocks: rawBlocks
            .sort((a, b) => a.position - b.position)
            .map((block) => ({
              id: block.id,
              name: block.name,
              block_type: block.block_type,
              wod_type: block.wod_type,
              time_cap: block.time_cap,
              rounds: block.rounds,
              work_time: block.work_time,
              rest_time: block.rest_time,
              notes: block.notes,
              exercises: (block.exercises || [])
                .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((ex: any) => ({
                  id: ex.id,
                  exercise_name: ex.exercise?.name || ex.custom_name || 'Exercice',
                  reps: ex.reps,
                  reps_unit: ex.reps_unit,
                  weight_male: ex.weight_male,
                  weight_female: ex.weight_female,
                  weight_unit: ex.weight_unit,
                  distance: ex.distance,
                  distance_unit: ex.distance_unit,
                  time_seconds: ex.time_seconds,
                  calories: ex.calories,
                  notes: ex.notes,
                })),
            })),
        };

        setWorkout(formattedWorkout);

        // Determine default score type from WOD type
        const wodType = formattedWorkout.blocks.find((b) => b.block_type === 'wod')?.wod_type ||
          formattedWorkout.wod_type;
        if (wodType) {
          const typeMap: Record<string, string> = {
            amrap: 'rounds_reps',
            emom: 'reps',
            for_time: 'time',
            tabata: 'reps',
            max_reps: 'reps',
            max_weight: 'weight',
          };
          form.setValue('score_type', typeMap[wodType] || 'reps');
        }

        // Fetch member's existing score
        const { data: existingScore } = await supabase
          .from('workout_scores')
          .select('id, score_value, score_type, is_rx, notes')
          .eq('workout_id', workoutId)
          .eq('member_id', member.id)
          .single();

        if (existingScore) {
          setMemberScore(existingScore);
          form.setValue('score_type', existingScore.score_type);
          form.setValue('is_rx', existingScore.is_rx);
          form.setValue('notes', existingScore.notes || '');

          // Set score value based on type
          if (existingScore.score_type === 'time') {
            const minutes = Math.floor(existingScore.score_value / 60);
            const seconds = Math.round(existingScore.score_value % 60);
            form.setValue('score_minutes', minutes.toString());
            form.setValue('score_seconds', seconds.toString());
          } else if (existingScore.score_type === 'rounds_reps') {
            const rounds = Math.floor(existingScore.score_value);
            const reps = Math.round((existingScore.score_value - rounds) * 100);
            form.setValue('score_rounds', rounds.toString());
            form.setValue('score_reps', reps.toString());
          } else {
            form.setValue('score_value', existingScore.score_value.toString());
          }
        }

        // Fetch leaderboard via direct query
        const { data: scoresData } = await supabase
          .from('workout_scores')
          .select('id, score_value, score_type, is_rx, recorded_at, member:members(first_name, last_name)')
          .eq('workout_id', workoutId)
          .order('is_rx', { ascending: false })
          .order('score_value', { ascending: true })
          .limit(20);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedLeaderboard: LeaderboardEntry[] = (scoresData || []).map((s: any, idx: number) => ({
          rank: idx + 1,
          member_name: `${s.member?.first_name || ''} ${s.member?.last_name || ''}`.trim() || 'Membre',
          score_value: s.score_value,
          score_type: s.score_type,
          is_rx: s.is_rx,
        }));

        setLeaderboard(formattedLeaderboard);
      } catch (error) {
        console.error('Error loading workout:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger le workout.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkout();
  }, [member, params.id, form, toast]);

  const onSubmit = async (data: ScoreFormData) => {
    if (!member || !workout) return;

    setIsSaving(true);
    const supabase = createClient();

    try {
      // Calculate score value based on type
      let scoreValue: number;

      if (data.score_type === 'time') {
        const minutes = parseInt(data.score_minutes || '0', 10);
        const seconds = parseInt(data.score_seconds || '0', 10);
        scoreValue = minutes * 60 + seconds;
      } else if (data.score_type === 'rounds_reps') {
        const rounds = parseInt(data.score_rounds || '0', 10);
        const reps = parseInt(data.score_reps || '0', 10);
        scoreValue = rounds + reps / 100;
      } else {
        scoreValue = parseFloat(data.score_value);
      }

      if (isNaN(scoreValue) || scoreValue <= 0) {
        toast({
          title: 'Erreur',
          description: 'Veuillez entrer un score valide.',
          variant: 'destructive',
        });
        return;
      }

      const scoreData = {
        workout_id: workout.id,
        member_id: member.id,
        score_type: data.score_type,
        score_value: scoreValue,
        is_rx: data.is_rx,
        notes: data.notes || null,
        recorded_at: new Date().toISOString(),
      };

      if (memberScore) {
        // Update existing score
        const { error } = await supabase
          .from('workout_scores')
          .update(scoreData)
          .eq('id', memberScore.id);

        if (error) throw error;
      } else {
        // Insert new score
        const { error } = await supabase.from('workout_scores').insert(scoreData);

        if (error) throw error;
      }

      toast({
        title: 'Score enregistre',
        description: memberScore ? 'Votre score a ete mis a jour.' : 'Votre score a ete enregistre.',
      });

      // Refresh leaderboard
      const { data: scoresData } = await supabase
        .from('workout_scores')
        .select('id, score_value, score_type, is_rx, recorded_at, member:members(first_name, last_name)')
        .eq('workout_id', workout.id)
        .order('is_rx', { ascending: false })
        .order('score_value', { ascending: true })
        .limit(20);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedLeaderboard: LeaderboardEntry[] = (scoresData || []).map((s: any, idx: number) => ({
        rank: idx + 1,
        member_name: `${s.member?.first_name || ''} ${s.member?.last_name || ''}`.trim() || 'Membre',
        score_value: s.score_value,
        score_type: s.score_type,
        is_rx: s.is_rx,
      }));
      setLeaderboard(formattedLeaderboard);

      setMemberScore({
        ...scoreData,
        id: memberScore?.id || 'new',
      });
    } catch (error) {
      console.error('Error saving score:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer le score.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatScore = (type: string, value: number) => {
    switch (type) {
      case 'time':
        const minutes = Math.floor(value / 60);
        const seconds = Math.round(value % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
        return `${value} reps`;
    }
  };

  const blockTypeLabels: Record<string, { label: string; icon: React.ElementType }> = {
    warmup: { label: 'Echauffement', icon: Flame },
    skill: { label: 'Skill', icon: Target },
    strength: { label: 'Force', icon: Dumbbell },
    wod: { label: 'WOD', icon: Clock },
    cooldown: { label: 'Retour au calme', icon: RotateCcw },
    accessory: { label: 'Accessoire', icon: Target },
    custom: { label: 'Custom', icon: Dumbbell },
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

  if (!workout) {
    return (
      <div className="p-4 md:p-6 md:ml-64">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Workout non trouve</p>
            <Button variant="link" onClick={() => router.back()}>
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground capitalize">
            {workout.scheduled_date ? format(parseISO(workout.scheduled_date), 'EEEE d MMMM yyyy', { locale: fr }) : 'Date non definie'}
          </p>
          <h1 className="text-xl font-bold">{workout.title}</h1>
        </div>
        {memberScore && (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Score enregistre
          </Badge>
        )}
      </div>

      {workout.description && (
        <p className="text-muted-foreground">{workout.description}</p>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workout">Seance</TabsTrigger>
          <TabsTrigger value="score">Mon Score</TabsTrigger>
          <TabsTrigger value="leaderboard">
            Classement
            {leaderboard.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {leaderboard.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Workout content */}
        <TabsContent value="workout" className="space-y-4">
          {workout.blocks.map((block) => {
            const blockInfo = blockTypeLabels[block.block_type] || blockTypeLabels.custom;
            const Icon = blockInfo.icon;

            return (
              <Card key={block.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-4 w-4" />
                      {block.name || blockInfo.label}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {block.wod_type && (
                        <Badge variant="secondary">
                          {wodTypeLabels[block.wod_type] || block.wod_type}
                        </Badge>
                      )}
                      {block.time_cap && (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {block.time_cap} min
                        </Badge>
                      )}
                      {block.rounds && (
                        <Badge variant="outline">{block.rounds} rounds</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {block.exercises.map((ex, idx) => (
                    <div
                      key={ex.id}
                      className="flex items-start gap-2 py-1"
                    >
                      <span className="text-muted-foreground text-sm w-4">
                        {idx + 1}.
                      </span>
                      <div className="flex-1">
                        <span className="font-medium">{ex.exercise_name}</span>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          {ex.reps && (
                            <span>{ex.reps} {ex.reps_unit || 'reps'}</span>
                          )}
                          {ex.weight_male && (
                            <span>H: {ex.weight_male}{ex.weight_unit || 'kg'}</span>
                          )}
                          {ex.weight_female && (
                            <span>F: {ex.weight_female}{ex.weight_unit || 'kg'}</span>
                          )}
                          {ex.distance && (
                            <span>{ex.distance}{ex.distance_unit || 'm'}</span>
                          )}
                          {ex.time_seconds && (
                            <span>{ex.time_seconds}s</span>
                          )}
                          {ex.calories && (
                            <span>{ex.calories} cal</span>
                          )}
                        </div>
                        {ex.notes && (
                          <p className="text-xs text-muted-foreground italic mt-1">
                            {ex.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {block.notes && (
                    <p className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                      {block.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Score form */}
        <TabsContent value="score">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {memberScore ? 'Modifier mon score' : 'Enregistrer mon score'}
              </CardTitle>
              <CardDescription>
                Entrez votre performance pour ce WOD
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Type de score</Label>
                  <Select
                    value={scoreType}
                    onValueChange={(v) => form.setValue('score_type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time">Temps</SelectItem>
                      <SelectItem value="reps">Repetitions</SelectItem>
                      <SelectItem value="rounds_reps">Rounds + Reps</SelectItem>
                      <SelectItem value="weight">Charge (kg)</SelectItem>
                      <SelectItem value="calories">Calories</SelectItem>
                      <SelectItem value="distance">Distance (m)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scoreType === 'time' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Minutes</Label>
                      <Input
                        type="number"
                        min="0"
                        {...form.register('score_minutes')}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Secondes</Label>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        {...form.register('score_seconds')}
                        placeholder="00"
                      />
                    </div>
                  </div>
                )}

                {scoreType === 'rounds_reps' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rounds completes</Label>
                      <Input
                        type="number"
                        min="0"
                        {...form.register('score_rounds')}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>+ Reps</Label>
                      <Input
                        type="number"
                        min="0"
                        {...form.register('score_reps')}
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}

                {!['time', 'rounds_reps'].includes(scoreType) && (
                  <div className="space-y-2">
                    <Label>
                      {scoreType === 'weight' && 'Charge (kg)'}
                      {scoreType === 'calories' && 'Calories'}
                      {scoreType === 'distance' && 'Distance (m)'}
                      {scoreType === 'reps' && 'Repetitions'}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step={scoreType === 'weight' ? '0.5' : '1'}
                      {...form.register('score_value')}
                      placeholder="0"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label htmlFor="is_rx">Mode RX</Label>
                    <p className="text-sm text-muted-foreground">
                      WOD realise tel que prescrit
                    </p>
                  </div>
                  <Switch
                    id="is_rx"
                    checked={form.watch('is_rx')}
                    onCheckedChange={(v) => form.setValue('is_rx', v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes (optionnel)</Label>
                  <Textarea
                    {...form.register('notes')}
                    placeholder="Adaptation, ressenti, charge utilisee..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {memberScore ? 'Mettre a jour' : 'Enregistrer'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Classement
              </CardTitle>
              <CardDescription>
                {leaderboard.length} participant{leaderboard.length > 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun score enregistre</p>
                  <p className="text-sm">Soyez le premier !</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {leaderboard.map((entry) => {
                    const isMember = entry.member_name.includes(member?.first_name || '');

                    return (
                      <li
                        key={entry.rank}
                        className={cn(
                          'flex items-center justify-between py-2 px-3 rounded-lg',
                          isMember && 'bg-primary/5 border border-primary/20',
                          entry.rank === 1 && 'bg-yellow-50 dark:bg-yellow-950',
                          entry.rank === 2 && 'bg-gray-50 dark:bg-gray-900',
                          entry.rank === 3 && 'bg-orange-50 dark:bg-orange-950'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm',
                            entry.rank === 1 && 'bg-yellow-500 text-white',
                            entry.rank === 2 && 'bg-gray-400 text-white',
                            entry.rank === 3 && 'bg-orange-500 text-white',
                            entry.rank > 3 && 'bg-muted'
                          )}>
                            {entry.rank}
                          </span>
                          <span className={cn('font-medium', isMember && 'text-primary')}>
                            {entry.member_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.is_rx && (
                            <Badge variant="outline" className="text-xs">RX</Badge>
                          )}
                          <span className="font-bold">
                            {formatScore(entry.score_type, entry.score_value)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
