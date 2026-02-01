'use client';

import { useEffect, useState } from 'react';
import type { Workout } from '@/actions/workouts';
import { Clock, Dumbbell, Calendar } from 'lucide-react';

interface TVWaitingProps {
  orgName: string;
  nextClass: {
    id: string;
    name: string;
    start_time: string;
    coach_name: string | null;
  } | null;
  workout: Workout | null;
}

export function TVWaiting({ orgName, nextClass, workout }: TVWaitingProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [countdown, setCountdown] = useState<string | null>(null);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate countdown to next class
  useEffect(() => {
    if (!nextClass) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const classTime = new Date(nextClass.start_time);
      const diff = classTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdown(`${hours}h ${minutes.toString().padStart(2, '0')}min`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextClass]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      {/* Logo/Name */}
      <div className="mb-12">
        <h1 className="text-6xl font-bold text-center bg-gradient-to-r from-[var(--tv-primary)] to-[var(--tv-secondary)] bg-clip-text text-transparent">
          {orgName}
        </h1>
      </div>

      {/* Big Clock */}
      <div className="mb-12">
        <div className="text-8xl font-bold tracking-wider">
          {currentTime.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </div>
        <div className="text-center text-2xl text-zinc-400 mt-2">
          {currentTime.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </div>
      </div>

      {/* Next Class Card */}
      {nextClass && (
        <div className="bg-zinc-900 rounded-2xl p-8 max-w-lg w-full">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-6 w-6 text-[var(--tv-primary)]" />
            <span className="text-xl text-zinc-400">Prochain cours</span>
          </div>
          <h2 className="text-3xl font-bold mb-2">{nextClass.name}</h2>
          <div className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-zinc-500" />
              <span>
                {new Date(nextClass.start_time).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {nextClass.coach_name && (
                <span className="text-zinc-500 ml-2">({nextClass.coach_name})</span>
              )}
            </div>
            {countdown && (
              <span className="text-[var(--tv-primary)] font-bold">
                dans {countdown}
              </span>
            )}
          </div>
        </div>
      )}

      {/* WOD Preview if available */}
      {workout && (
        <div className="mt-8 bg-zinc-900 rounded-2xl p-8 max-w-2xl w-full">
          <div className="flex items-center gap-3 mb-4">
            <Dumbbell className="h-6 w-6 text-red-500" />
            <span className="text-xl text-zinc-400">WOD du jour</span>
          </div>
          <h2 className="text-2xl font-bold mb-4">{workout.name}</h2>
          {workout.description && (
            <p className="text-zinc-400 mb-4">{workout.description}</p>
          )}
          {/* Show first WOD block summary */}
          {workout.blocks?.find(b => b.block_type === 'wod') && (
            <div className="text-zinc-300">
              {(() => {
                const wodBlock = workout.blocks?.find(b => b.block_type === 'wod');
                if (!wodBlock) return null;
                return (
                  <div className="space-y-2">
                    {wodBlock.wod_type && (
                      <span className="inline-block bg-red-600 px-3 py-1 rounded-full text-sm font-bold">
                        {wodBlock.wod_type.toUpperCase().replace('_', ' ')}
                        {wodBlock.time_cap && ` - ${wodBlock.time_cap} min`}
                        {wodBlock.rounds && ` - ${wodBlock.rounds} rounds`}
                      </span>
                    )}
                    <div className="text-lg">
                      {wodBlock.exercises?.slice(0, 4).map((ex, i) => (
                        <span key={ex.id}>
                          {i > 0 && ' / '}
                          {ex.exercise?.name || ex.custom_name}
                        </span>
                      ))}
                      {wodBlock.exercises && wodBlock.exercises.length > 4 && (
                        <span className="text-zinc-500"> +{wodBlock.exercises.length - 4} autres</span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* No upcoming content */}
      {!nextClass && !workout && (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 mx-auto text-zinc-600" />
          <p className="text-2xl text-zinc-500 mt-4">Aucun cours programme</p>
        </div>
      )}
    </div>
  );
}
