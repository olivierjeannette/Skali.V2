'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Trophy,
  Dumbbell,
  Loader2,
  Flame,
  Target,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMemberAuth } from '@/hooks/useMemberAuth';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface PersonalRecord {
  id: string;
  exercise_name: string;
  exercise_category: string;
  record_type: string;
  record_value: number;
  record_unit: string;
  achieved_at: string;
  workout_title: string | null;
}

interface WorkoutScore {
  id: string;
  workout_title: string;
  score_value: number;
  score_type: string;
  is_rx: boolean;
  recorded_at: string;
}

interface Stats {
  total_workouts: number;
  total_prs: number;
  rx_rate: number;
  workouts_this_month: number;
}

export default function MemberPerformancesPage() {
  const { member } = useMemberAuth();
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [recentScores, setRecentScores] = useState<WorkoutScore[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_workouts: 0,
    total_prs: 0,
    rx_rate: 0,
    workouts_this_month: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('prs');

  useEffect(() => {
    if (!member) return;

    const loadPerformances = async () => {
      const supabase = createClient();

      try {
        // Fetch personal records with exercise info
        const { data: prsData } = await supabase
          .from('personal_records')
          .select(`
            id,
            record_type,
            record_value,
            record_unit,
            achieved_at,
            workout_id,
            exercise:exercises(name, category)
          `)
          .eq('member_id', member.id)
          .order('achieved_at', { ascending: false });

        const formattedPRs: PersonalRecord[] = (prsData || []).map((pr) => ({
          id: pr.id,
          exercise_name: (pr.exercise as { name: string })?.name || 'Exercice',
          exercise_category: (pr.exercise as { category: string })?.category || 'other',
          record_type: pr.record_type,
          record_value: pr.record_value,
          record_unit: pr.record_unit,
          achieved_at: pr.achieved_at,
          workout_title: null,
        }));

        setPersonalRecords(formattedPRs);

        // Fetch recent workout scores (last 30)
        const { data: scoresData } = await supabase
          .from('workout_scores')
          .select(`
            id,
            score_value,
            score_type,
            is_rx,
            recorded_at,
            workout:workouts(title)
          `)
          .eq('member_id', member.id)
          .order('recorded_at', { ascending: false })
          .limit(30);

        const formattedScores: WorkoutScore[] = (scoresData || []).map((score) => ({
          id: score.id,
          workout_title: (score.workout as { title: string })?.title || 'Workout',
          score_value: score.score_value,
          score_type: score.score_type,
          is_rx: score.is_rx,
          recorded_at: score.recorded_at,
        }));

        setRecentScores(formattedScores);

        // Calculate stats
        const { count: totalWorkouts } = await supabase
          .from('workout_scores')
          .select('*', { count: 'exact', head: true })
          .eq('member_id', member.id);

        const { count: totalPRs } = await supabase
          .from('personal_records')
          .select('*', { count: 'exact', head: true })
          .eq('member_id', member.id);

        const { count: rxCount } = await supabase
          .from('workout_scores')
          .select('*', { count: 'exact', head: true })
          .eq('member_id', member.id)
          .eq('is_rx', true);

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const { count: monthWorkouts } = await supabase
          .from('workout_scores')
          .select('*', { count: 'exact', head: true })
          .eq('member_id', member.id)
          .gte('recorded_at', monthStart.toISOString());

        setStats({
          total_workouts: totalWorkouts || 0,
          total_prs: totalPRs || 0,
          rx_rate: totalWorkouts ? Math.round((rxCount || 0) / totalWorkouts * 100) : 0,
          workouts_this_month: monthWorkouts || 0,
        });
      } catch (error) {
        console.error('Error loading performances:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPerformances();
  }, [member]);

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

  const categoryLabels: Record<string, { label: string; color: string }> = {
    weightlifting: { label: 'Haltero', color: 'bg-red-500' },
    gymnastics: { label: 'Gym', color: 'bg-blue-500' },
    cardio: { label: 'Cardio', color: 'bg-green-500' },
    strongman: { label: 'Strongman', color: 'bg-purple-500' },
    core: { label: 'Core', color: 'bg-orange-500' },
    mobility: { label: 'Mobilite', color: 'bg-teal-500' },
    other: { label: 'Autre', color: 'bg-gray-500' },
  };

  // Group PRs by exercise
  const prsByExercise = personalRecords.reduce((acc, pr) => {
    if (!acc[pr.exercise_name]) {
      acc[pr.exercise_name] = {
        exercise_name: pr.exercise_name,
        category: pr.exercise_category,
        records: [],
      };
    }
    acc[pr.exercise_name].records.push(pr);
    return acc;
  }, {} as Record<string, { exercise_name: string; category: string; records: PersonalRecord[] }>);

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
          <Trophy className="h-6 w-6 text-yellow-500" />
          Performances
        </h1>
        <p className="text-muted-foreground">
          Vos records personnels et historique
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_workouts}</p>
                <p className="text-xs text-muted-foreground">WODs enregistres</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_prs}</p>
                <p className="text-xs text-muted-foreground">Records personnels</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.rx_rate}%</p>
                <p className="text-xs text-muted-foreground">Taux RX</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.workouts_this_month}</p>
                <p className="text-xs text-muted-foreground">Ce mois-ci</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prs">
            Records ({stats.total_prs})
          </TabsTrigger>
          <TabsTrigger value="history">
            Historique ({recentScores.length})
          </TabsTrigger>
        </TabsList>

        {/* Personal Records */}
        <TabsContent value="prs" className="space-y-4">
          {Object.keys(prsByExercise).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Aucun PR enregistre</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Vos records personnels apparaitront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.values(prsByExercise).map((exerciseGroup) => {
              const categoryInfo = categoryLabels[exerciseGroup.category] || categoryLabels.other;

              return (
                <Card key={exerciseGroup.exercise_name}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', categoryInfo.color)} />
                        {exerciseGroup.exercise_name}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {categoryInfo.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {exerciseGroup.records.map((pr) => (
                        <div
                          key={pr.id}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div>
                            <p className="text-sm text-muted-foreground capitalize">
                              {pr.record_type.replace('_', ' ')}
                            </p>
                            {pr.workout_title && (
                              <p className="text-xs text-muted-foreground">
                                {pr.workout_title}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              {pr.record_value} {pr.record_unit}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(pr.achieved_at), 'd MMM yyyy', { locale: fr })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Workout History */}
        <TabsContent value="history" className="space-y-3">
          {recentScores.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Aucun score enregistre</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Enregistrez vos scores dans les WODs
                </p>
              </CardContent>
            </Card>
          ) : (
            recentScores.map((score) => (
              <Card key={score.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(score.recorded_at), 'd MMMM yyyy', { locale: fr })}
                      </p>
                      <h3 className="font-medium truncate">{score.workout_title}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-lg font-bold text-primary">
                        {formatScore(score.score_type, score.score_value)}
                      </p>
                      {score.is_rx && (
                        <Badge variant="outline" className="text-xs">RX</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
