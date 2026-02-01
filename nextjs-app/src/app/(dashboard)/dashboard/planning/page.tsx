import { Suspense } from 'react';
import Link from 'next/link';
import { requireOrganization } from '@/lib/auth';
import { getClasses, getPlanningStats } from '@/actions/planning';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarView } from './calendar-view';

async function PlanningStats({ orgId }: { orgId: string }) {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const stats = await getPlanningStats(orgId, today, nextWeek);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cours cette semaine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalClasses}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Programmes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.scheduledClasses}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalParticipants}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taux remplissage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.averageOccupancy}%</div>
        </CardContent>
      </Card>
    </div>
  );
}

async function UpcomingClasses({ orgId }: { orgId: string }) {
  const today = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const classes = await getClasses(orgId, {
    startDate: today,
    endDate: tomorrow,
    status: 'scheduled',
  });

  if (classes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prochains cours</CardTitle>
          <CardDescription>Aucun cours programme aujourd&apos;hui</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground mb-4">
            Creez votre premier cours pour commencer
          </p>
          <Button asChild>
            <Link href="/dashboard/planning/new">Creer un cours</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prochains cours</CardTitle>
        <CardDescription>
          {classes.length} cours aujourd&apos;hui et demain
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {classes.slice(0, 5).map((cls) => {
            const startTime = new Date(cls.start_time);
            const endTime = new Date(cls.end_time);

            return (
              <div
                key={cls.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-1 h-12 rounded-full"
                    style={{ backgroundColor: cls.color }}
                  />
                  <div>
                    <div className="font-medium">{cls.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {startTime.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' - '}
                      {endTime.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {cls.coach && ` • ${cls.coach.full_name}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">
                      {cls.current_participants}
                      {cls.max_participants && `/${cls.max_participants}`}
                    </div>
                    <div className="text-sm text-muted-foreground">inscrits</div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/planning/${cls.id}`}>Voir</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        {classes.length > 5 && (
          <div className="mt-4 text-center">
            <Button variant="link" asChild>
              <Link href="/dashboard/planning?view=list">
                Voir tous les cours ({classes.length})
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ClassesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function PlanningPage() {
  const org = await requireOrganization();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planning</h1>
          <p className="text-muted-foreground">
            Gerez vos cours et reservations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/planning/templates">Modeles</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/planning/recurring">Recurrence</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/planning/new">Nouveau cours</Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <PlanningStats orgId={org.id} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Calendrier</CardTitle>
              <CardDescription>
                Vue semaine du planning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
                <CalendarView />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        <div>
          <Suspense fallback={<ClassesSkeleton />}>
            <UpcomingClasses orgId={org.id} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
