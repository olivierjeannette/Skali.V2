'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { TVData } from '@/actions/tv';
import { getTVData } from '@/actions/tv';
import { TVWorkout } from './tv-workout';
import { TVTimer } from './tv-timer';
import { TVWaiting } from './tv-waiting';
import { TVLeaderboard } from './tv-leaderboard';
import { TVTeams } from './tv-teams';

interface TVDisplayProps {
  initialData: TVData;
  orgId: string;
}

export function TVDisplay({ initialData, orgId }: TVDisplayProps) {
  const [data, setData] = useState<TVData>(initialData);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Supabase client for realtime
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Refresh data periodically and on realtime updates
  const refreshData = useCallback(async () => {
    const newData = await getTVData(orgId);
    setData(newData);
  }, [orgId]);

  // Subscribe to realtime updates
  useEffect(() => {
    // Subscribe to tv_states changes
    const channel = supabase
      .channel(`tv-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tv_states',
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          refreshData();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds to check for current class changes
    const interval = setInterval(refreshData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [orgId, supabase, refreshData]);

  // Toggle fullscreen on double-click
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const mode = data.tvState?.mode || 'waiting';
  const primaryColor = data.org?.primary_color || '#3b82f6';
  const secondaryColor = data.org?.secondary_color || '#1e40af';

  return (
    <div
      className="min-h-screen bg-black text-white"
      style={{
        '--tv-primary': primaryColor,
        '--tv-secondary': secondaryColor,
      } as React.CSSProperties}
      onDoubleClick={toggleFullscreen}
    >
      {/* Header Bar */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-4">
          {data.org?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.org.logo_url}
              alt={data.org.name}
              className="h-12 w-auto"
            />
          ) : (
            <h1 className="text-2xl font-bold">{data.org?.name}</h1>
          )}
        </div>
        <div className="flex items-center gap-6 text-lg">
          <span className="font-semibold">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </span>
          <span className="text-3xl font-bold">
            {new Date().toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </header>

      {/* Current Class Info Bar */}
      {data.currentClass && (
        <div
          className="px-6 py-3 text-center text-xl"
          style={{ backgroundColor: secondaryColor }}
        >
          <span className="font-bold">{data.currentClass.name}</span>
          {data.currentClass.coach_name && (
            <span className="ml-4 opacity-80">
              Coach: {data.currentClass.coach_name}
            </span>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6">
        {mode === 'workout' && data.workout && (
          <TVWorkout workout={data.workout} />
        )}
        {mode === 'timer' && data.tvState?.timerState && (
          <TVTimer
            timerState={data.tvState.timerState}
            workoutName={data.workout?.name}
          />
        )}
        {mode === 'leaderboard' && data.workout && (
          <TVLeaderboard workoutId={data.workout.id} workoutName={data.workout.name} />
        )}
        {mode === 'waiting' && (
          <TVWaiting
            orgName={data.org?.name || 'Gym'}
            nextClass={data.nextClass}
            workout={data.workout}
          />
        )}
        {mode === 'teams' && data.tvState?.teamsData && (
          <TVTeams teams={data.tvState.teamsData} />
        )}
      </main>

      {/* Footer - Next Class Info */}
      {data.nextClass && mode !== 'timer' && (
        <footer className="px-6 py-4 bg-zinc-900 text-center">
          <span className="text-lg text-zinc-400">
            Prochain cours:{' '}
            <span className="font-bold text-white">{data.nextClass.name}</span>
            {' - '}
            {new Date(data.nextClass.start_time).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {data.nextClass.coach_name && (
              <span className="text-zinc-500"> ({data.nextClass.coach_name})</span>
            )}
          </span>
        </footer>
      )}

      {/* Fullscreen hint */}
      {!isFullscreen && (
        <div className="fixed bottom-4 right-4 text-xs text-zinc-600">
          Double-cliquez pour plein ecran
        </div>
      )}
    </div>
  );
}
