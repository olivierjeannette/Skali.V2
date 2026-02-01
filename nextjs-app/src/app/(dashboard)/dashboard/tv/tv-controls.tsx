'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  setTVWorkout,
  setTVWaiting,
  startTVTimer,
  showTVLeaderboard,
  type TVState,
} from '@/actions/tv';
import type { Workout } from '@/actions/workouts';
import { Clock, Dumbbell, Trophy, Users, Tv, Play, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface TVControlsProps {
  orgId: string;
  currentState: TVState | null;
  workouts: Workout[];
}

export function TVControls({ orgId, currentState, workouts }: TVControlsProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>(currentState?.workoutId || '');
  const [timerType, setTimerType] = useState<'countdown' | 'countup' | 'emom' | 'tabata'>('countdown');
  const [timerMinutes, setTimerMinutes] = useState(12);
  const [emomRounds, setEmomRounds] = useState(10);
  const [tabataWork, setTabataWork] = useState(20);
  const [tabataRest, setTabataRest] = useState(10);
  const [tabataRounds, setTabataRounds] = useState(8);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSetWorkout = () => {
    if (!selectedWorkoutId) return;
    startTransition(async () => {
      const result = await setTVWorkout(orgId, selectedWorkoutId);
      if (result.success) {
        setMessage({ type: 'success', text: 'Workout affiche sur TV' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur' });
      }
    });
  };

  const handleSetWaiting = () => {
    startTransition(async () => {
      const result = await setTVWaiting(orgId);
      if (result.success) {
        setMessage({ type: 'success', text: 'TV en mode attente' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur' });
      }
    });
  };

  const handleStartTimer = () => {
    startTransition(async () => {
      let timerState: TVState['timerState'];

      switch (timerType) {
        case 'countdown':
          timerState = {
            type: 'countdown',
            duration: timerMinutes * 60,
            currentTime: timerMinutes * 60,
            isRunning: true,
          };
          break;
        case 'countup':
          timerState = {
            type: 'countup',
            duration: timerMinutes * 60,
            currentTime: 0,
            isRunning: true,
          };
          break;
        case 'emom':
          timerState = {
            type: 'emom',
            duration: emomRounds * 60,
            currentTime: 0,
            isRunning: true,
            round: 1,
            totalRounds: emomRounds,
          };
          break;
        case 'tabata':
          timerState = {
            type: 'tabata',
            duration: tabataRounds * (tabataWork + tabataRest),
            currentTime: 0,
            isRunning: true,
            round: 1,
            totalRounds: tabataRounds,
            workTime: tabataWork,
            restTime: tabataRest,
          };
          break;
      }

      const result = await startTVTimer(orgId, timerState);
      if (result.success) {
        setMessage({ type: 'success', text: 'Timer demarre' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur' });
      }
    });
  };

  const handleShowLeaderboard = () => {
    if (!selectedWorkoutId) return;
    startTransition(async () => {
      const result = await showTVLeaderboard(orgId, selectedWorkoutId);
      if (result.success) {
        setMessage({ type: 'success', text: 'Leaderboard affiche' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur' });
      }
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Message */}
      {message && (
        <div
          className={`md:col-span-2 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Mode Attente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv className="h-5 w-5" />
            Mode Attente
          </CardTitle>
          <CardDescription>
            Affiche l&apos;horloge et les infos du prochain cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSetWaiting}
            disabled={isPending}
            variant={currentState?.mode === 'waiting' ? 'default' : 'outline'}
            className="w-full"
          >
            Activer mode attente
          </Button>
        </CardContent>
      </Card>

      {/* Afficher Workout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Afficher un Workout
          </CardTitle>
          <CardDescription>
            Selectionnez un workout a afficher sur l&apos;ecran
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Workout</Label>
            <Select value={selectedWorkoutId} onValueChange={setSelectedWorkoutId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un workout" />
              </SelectTrigger>
              <SelectContent>
                {workouts.map((workout) => (
                  <SelectItem key={workout.id} value={workout.id}>
                    {workout.name}
                    {workout.date && (
                      <span className="text-muted-foreground ml-2">
                        ({new Date(workout.date).toLocaleDateString('fr-FR')})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleSetWorkout}
            disabled={isPending || !selectedWorkoutId}
            className="w-full"
          >
            Afficher ce workout
          </Button>
        </CardContent>
      </Card>

      {/* Timer */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timer
          </CardTitle>
          <CardDescription>
            Lancez un timer sur l&apos;ecran TV
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            {/* Timer Type */}
            <div className="space-y-2">
              <Label>Type de timer</Label>
              <Select value={timerType} onValueChange={(v) => setTimerType(v as typeof timerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="countdown">Decompte (Time Cap)</SelectItem>
                  <SelectItem value="countup">Chrono (For Time)</SelectItem>
                  <SelectItem value="emom">EMOM</SelectItem>
                  <SelectItem value="tabata">Tabata</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timer-specific options */}
            {(timerType === 'countdown' || timerType === 'countup') && (
              <div className="space-y-2">
                <Label>Duree (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 12)}
                />
              </div>
            )}

            {timerType === 'emom' && (
              <div className="space-y-2">
                <Label>Nombre de rounds (1 min chacun)</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={emomRounds}
                  onChange={(e) => setEmomRounds(parseInt(e.target.value) || 10)}
                />
              </div>
            )}

            {timerType === 'tabata' && (
              <>
                <div className="space-y-2">
                  <Label>Work (sec)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={120}
                    value={tabataWork}
                    onChange={(e) => setTabataWork(parseInt(e.target.value) || 20)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rest (sec)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={120}
                    value={tabataRest}
                    onChange={(e) => setTabataRest(parseInt(e.target.value) || 10)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rounds</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={tabataRounds}
                    onChange={(e) => setTabataRounds(parseInt(e.target.value) || 8)}
                  />
                </div>
              </>
            )}

            {/* Start Button */}
            <div className="flex items-end">
              <Button
                onClick={handleStartTimer}
                disabled={isPending}
                className="w-full"
              >
                <Play className="mr-2 h-4 w-4" />
                Demarrer le timer
              </Button>
            </div>
          </div>

          {/* Timer presets */}
          <div className="mt-4 pt-4 border-t">
            <Label className="text-xs text-muted-foreground">Presets rapides</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setTimerType('countdown'); setTimerMinutes(12); }}
              >
                12 min
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setTimerType('countdown'); setTimerMinutes(15); }}
              >
                15 min
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setTimerType('countdown'); setTimerMinutes(20); }}
              >
                20 min
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setTimerType('emom'); setEmomRounds(10); }}
              >
                EMOM 10
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setTimerType('emom'); setEmomRounds(12); }}
              >
                EMOM 12
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setTimerType('tabata'); setTabataWork(20); setTabataRest(10); setTabataRounds(8); }}
              >
                Tabata 20/10
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
          </CardTitle>
          <CardDescription>
            Affichez le classement d&apos;un workout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selectionnez un workout ci-dessus, puis cliquez sur ce bouton pour afficher son leaderboard.
          </p>
          <Button
            onClick={handleShowLeaderboard}
            disabled={isPending || !selectedWorkoutId}
            variant="outline"
            className="w-full"
          >
            <Trophy className="mr-2 h-4 w-4" />
            Afficher le leaderboard
          </Button>
        </CardContent>
      </Card>

      {/* Teams */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipes
          </CardTitle>
          <CardDescription>
            Affichez les equipes sur l&apos;ecran TV
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Creez des equipes via le tirage au sort, puis affichez-les sur l&apos;ecran TV.
          </p>
          <div className="flex gap-2">
            <Link href="/dashboard/teams" className="flex-1">
              <Button variant="outline" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Gerer les equipes
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Depuis la page des equipes, cliquez sur &quot;Afficher sur TV&quot; pour diffuser les equipes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
