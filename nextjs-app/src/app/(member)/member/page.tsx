'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  Dumbbell,
  Trophy,
  ChevronRight,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMemberAuth } from '@/hooks/useMemberAuth';
import { createClient } from '@/lib/supabase/client';

interface UpcomingClass {
  id: string;
  name: string;
  start_time: string;
  coach_name: string | null;
  location: string | null;
  booking_status: string;
}

interface TodayWod {
  id: string;
  title: string;
  wod_type: string | null;
  has_scored: boolean;
}

interface RecentPR {
  exercise_name: string;
  value: number;
  unit: string;
  achieved_at: string;
}

export default function MemberHomePage() {
  const { member, organization, subscriptions, hasActiveSubscription } = useMemberAuth();
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [todayWod, setTodayWod] = useState<TodayWod | null>(null);
  const [recentPRs, setRecentPRs] = useState<RecentPR[]>([]);
  const [stats, setStats] = useState({
    classesThisMonth: 0,
    totalWorkouts: 0,
    currentStreak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!member) return;

    const loadDashboardData = async () => {
      const supabase = createClient();

      try {
        // Upcoming classes (next 7 days)
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const { data: bookings } = await supabase
          .from('bookings')
          .select(`
            id,
            status,
            class:classes(
              id,
              name,
              start_time,
              location,
              coach:profiles(full_name)
            )
          `)
          .eq('member_id', member.id)
          .in('status', ['confirmed', 'waitlist'])
          .gte('class.start_time', now.toISOString())
          .lte('class.start_time', nextWeek.toISOString())
          .order('class(start_time)', { ascending: true })
          .limit(5);

        const upcoming: UpcomingClass[] = (bookings || [])
          .filter((b) => b.class)
          .map((b) => {
            const cls = b.class as {
              id: string;
              name: string;
              start_time: string;
              location: string | null;
              coach: { full_name: string | null } | null;
            };
            return {
              id: cls.id,
              name: cls.name,
              start_time: cls.start_time,
              coach_name: cls.coach?.full_name || null,
              location: cls.location,
              booking_status: b.status,
            };
          });

        setUpcomingClasses(upcoming);

        // Today's WOD
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const { data: workouts } = await supabase
          .from('workouts')
          .select('id, title, wod_type')
          .eq('org_id', member.org_id)
          .gte('scheduled_date', todayStart.toISOString().split('T')[0])
          .lte('scheduled_date', todayEnd.toISOString().split('T')[0])
          .eq('status', 'published')
          .limit(1)
          .single();

        if (workouts) {
          // Check if member has scored
          const { data: score } = await supabase
            .from('workout_scores')
            .select('id')
            .eq('workout_id', workouts.id)
            .eq('member_id', member.id)
            .single();

          setTodayWod({
            id: workouts.id,
            title: workouts.title,
            wod_type: workouts.wod_type,
            has_scored: !!score,
          });
        }

        // Recent PRs (last 30 days)
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const { data: prs } = await supabase
          .from('personal_records')
          .select('record_value, record_unit, achieved_at, exercise:exercises(name)')
          .eq('member_id', member.id)
          .gte('achieved_at', thirtyDaysAgo.toISOString())
          .order('achieved_at', { ascending: false })
          .limit(3);

        const formattedPRs: RecentPR[] = (prs || []).map((pr) => ({
          exercise_name: (pr.exercise as { name: string } | null)?.name || 'Exercice',
          value: pr.record_value,
          unit: pr.record_unit,
          achieved_at: pr.achieved_at,
        }));

        setRecentPRs(formattedPRs);

        // Stats
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const { count: classesCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('member_id', member.id)
          .eq('status', 'attended')
          .gte('checked_in_at', monthStart.toISOString());

        const { count: workoutsCount } = await supabase
          .from('workout_scores')
          .select('*', { count: 'exact', head: true })
          .eq('member_id', member.id);

        setStats({
          classesThisMonth: classesCount || 0,
          totalWorkouts: workoutsCount || 0,
          currentStreak: 0, // TODO: Calculate streak
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [member]);

  const formatClassDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return 'Demain';
    return format(date, 'EEEE d MMMM', { locale: fr });
  };

  const formatClassTime = (dateStr: string) => {
    return format(parseISO(dateStr), 'HH:mm');
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 md:ml-64">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold">
          Salut {member?.first_name} !
        </h1>
        <p className="text-muted-foreground">
          Bienvenue sur ton espace {organization?.name}
        </p>
      </div>

      {/* Subscription alert if needed */}
      {!hasActiveSubscription && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <div className="flex-1">
              <p className="font-medium text-orange-800 dark:text-orange-200">
                Pas d&apos;abonnement actif
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-300">
                Contacte la salle pour renouveler ton abonnement.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick stats */}
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {stats.classesThisMonth}
            </div>
            <p className="text-xs text-muted-foreground">Cours ce mois</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {stats.totalWorkouts}
            </div>
            <p className="text-xs text-muted-foreground">WODs faits</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {recentPRs.length}
            </div>
            <p className="text-xs text-muted-foreground">PRs ce mois</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's WOD */}
      {todayWod && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">WOD du jour</CardTitle>
              </div>
              {todayWod.wod_type && (
                <Badge variant="secondary">{todayWod.wod_type}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-medium mb-3">{todayWod.title}</p>
            <div className="flex items-center justify-between">
              {todayWod.has_scored ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Score enregistre</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Pas encore de score
                </span>
              )}
              <Button asChild size="sm">
                <Link href={`/member/wod/${todayWod.id}`}>
                  {todayWod.has_scored ? 'Voir' : 'Enregistrer score'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming classes */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Mes prochains cours</CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/member/planning">
                Voir tout
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingClasses.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucun cours reserve</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/member/planning">Reserver un cours</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {upcomingClasses.map((cls) => (
                <li
                  key={cls.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-muted">
                      <span className="text-xs text-muted-foreground">
                        {formatClassDate(cls.start_time).slice(0, 3)}
                      </span>
                      <span className="font-bold">
                        {formatClassTime(cls.start_time)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{cls.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {cls.coach_name && `${cls.coach_name} • `}
                        {formatClassDate(cls.start_time)}
                      </p>
                    </div>
                  </div>
                  {cls.booking_status === 'waitlist' && (
                    <Badge variant="outline" className="text-orange-600">
                      Liste d&apos;attente
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Recent PRs */}
      {recentPRs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-lg">PRs recents</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/member/performances">
                  Tous mes PRs
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recentPRs.map((pr, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">{pr.exercise_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-primary">
                      {pr.value} {pr.unit}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(pr.achieved_at), 'd MMM', { locale: fr })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Subscription info */}
      {subscriptions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Mon abonnement</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="font-medium">{sub.plan_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {sub.end_date
                      ? `Jusqu'au ${format(parseISO(sub.end_date), 'd MMMM yyyy', { locale: fr })}`
                      : 'Illimite'}
                  </p>
                </div>
                <div className="text-right">
                  {sub.sessions_total !== null && (
                    <p className="text-sm">
                      <span className="font-bold text-primary">
                        {sub.sessions_total - sub.sessions_used}
                      </span>
                      <span className="text-muted-foreground">
                        /{sub.sessions_total} seances
                      </span>
                    </p>
                  )}
                  <Badge
                    variant={sub.status === 'active' ? 'default' : 'secondary'}
                  >
                    {sub.status === 'active' ? 'Actif' : 'En pause'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
