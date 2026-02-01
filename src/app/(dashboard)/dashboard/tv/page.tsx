import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { requireOrganization } from '@/lib/auth';
import { getTVState } from '@/actions/tv';
import { getWorkouts } from '@/actions/workouts';
import { Tv, ExternalLink, Copy, Clock, Dumbbell, Trophy, Users } from 'lucide-react';
import { TVControls } from './tv-controls';

export const dynamic = 'force-dynamic';

export default async function TVControlPage() {
  const org = await requireOrganization();
  const tvState = await getTVState(org.id);
  const workouts = await getWorkouts(org.id, { isTemplate: false, isPublished: true, limit: 20 });

  // Build TV URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const tvUrl = `${baseUrl}/tv/${org.id}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Tv className="h-6 w-6" />
            Affichage TV
          </h1>
          <p className="text-muted-foreground">
            Controlez l&apos;affichage sur les ecrans de la salle
          </p>
        </div>
        <div className="flex gap-2">
          <a href={tvUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Ouvrir la TV
            </Button>
          </a>
        </div>
      </div>

      {/* TV URL Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">URL de l&apos;ecran TV</CardTitle>
          <CardDescription>
            Ouvrez cette URL sur votre TV ou ecran pour afficher le contenu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted rounded-md px-4 py-2 text-sm font-mono overflow-x-auto">
              {tvUrl}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigator?.clipboard?.writeText(tvUrl)}
              title="Copier l'URL"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Double-cliquez sur l&apos;ecran TV pour passer en plein ecran
          </p>
        </CardContent>
      </Card>

      {/* Current State */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Etat actuel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Mode:</span>
              <ModeIndicator mode={tvState?.mode || 'waiting'} />
            </div>
            {tvState?.workoutId && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Workout:</span>
                <span className="font-medium">
                  {workouts.find(w => w.id === tvState.workoutId)?.name || 'Inconnu'}
                </span>
              </div>
            )}
            {tvState?.timerState && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Timer:</span>
                <span className="font-medium">
                  {tvState.timerState.isRunning ? 'En cours' : 'En pause'}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Suspense fallback={<LoadingSkeleton />}>
        <TVControls orgId={org.id} currentState={tvState} workouts={workouts} />
      </Suspense>
    </div>
  );
}

function ModeIndicator({ mode }: { mode: string }) {
  const config: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    waiting: { label: 'Attente', icon: <Clock className="h-4 w-4" />, color: 'bg-zinc-500' },
    workout: { label: 'Workout', icon: <Dumbbell className="h-4 w-4" />, color: 'bg-blue-500' },
    timer: { label: 'Timer', icon: <Clock className="h-4 w-4" />, color: 'bg-red-500' },
    leaderboard: { label: 'Leaderboard', icon: <Trophy className="h-4 w-4" />, color: 'bg-yellow-500' },
    teams: { label: 'Equipes', icon: <Users className="h-4 w-4" />, color: 'bg-green-500' },
  };

  const { label, icon, color } = config[mode] || config.waiting;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium text-white ${color}`}>
      {icon}
      {label}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="h-48 animate-pulse bg-muted" />
        </Card>
      ))}
    </div>
  );
}
