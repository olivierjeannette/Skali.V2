import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireOrganization } from '@/lib/auth';
import { getTeams, getCardioStations, getTeamTemplates } from '@/actions/teams';
import { getMembers } from '@/actions/members';
import { Users } from 'lucide-react';
import { TeamsManager } from './teams-manager';
import { CardioStationManager } from './cardio-stations';

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  const org = await requireOrganization();
  const [teams, members, stations, templates] = await Promise.all([
    getTeams(),
    getMembers(org.id, { status: 'active' }),
    getCardioStations(),
    getTeamTemplates(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Equipes & Tirage au sort
          </h1>
          <p className="text-muted-foreground">
            Creez des equipes et repartissez les membres aleatoirement
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Membres actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Equipes actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Postes cardio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Teams Manager - Takes 2/3 width */}
        <div className="lg:col-span-2">
          <Suspense fallback={<LoadingSkeleton />}>
            <TeamsManager
              orgId={org.id}
              teams={teams}
              members={members}
              templates={templates}
            />
          </Suspense>
        </div>

        {/* Cardio Stations - Takes 1/3 width */}
        <div>
          <Suspense fallback={<LoadingSkeleton />}>
            <CardioStationManager stations={stations} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardContent className="h-96 animate-pulse bg-muted" />
    </Card>
  );
}
