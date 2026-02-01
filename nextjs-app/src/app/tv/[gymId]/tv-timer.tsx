'use client';

import { useEffect, useState, useCallback } from 'react';
import { Pause, Clock } from 'lucide-react';

interface TimerState {
  type: 'countdown' | 'countup' | 'emom' | 'tabata';
  duration: number; // seconds
  currentTime: number; // seconds
  isRunning: boolean;
  round?: number;
  totalRounds?: number;
  workTime?: number;
  restTime?: number;
}

interface TVTimerProps {
  timerState: TimerState;
  workoutName?: string;
}

export function TVTimer({ timerState: initialState, workoutName }: TVTimerProps) {
  const [timer, setTimer] = useState(initialState);
  const [isInRestPeriod, setIsInRestPeriod] = useState(false);

  // Format time as MM:SS or HH:MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const abs = Math.abs(seconds);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const s = Math.floor(abs % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Timer tick logic
  useEffect(() => {
    if (!timer.isRunning) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev.type === 'countdown') {
          // Countdown timer
          if (prev.currentTime <= 0) {
            return { ...prev, isRunning: false, currentTime: 0 };
          }
          return { ...prev, currentTime: prev.currentTime - 1 };
        }

        if (prev.type === 'countup') {
          // Count up timer (for time)
          return { ...prev, currentTime: prev.currentTime + 1 };
        }

        if (prev.type === 'emom') {
          // EMOM timer
          const newTime = prev.currentTime + 1;
          const roundDuration = prev.duration / (prev.totalRounds || 1);
          const currentRound = Math.floor(newTime / roundDuration) + 1;

          if (currentRound > (prev.totalRounds || 1)) {
            return { ...prev, isRunning: false };
          }

          return {
            ...prev,
            currentTime: newTime,
            round: currentRound,
          };
        }

        if (prev.type === 'tabata') {
          // Tabata timer (work/rest intervals)
          const workTime = prev.workTime || 20;
          const restTime = prev.restTime || 10;
          const intervalDuration = workTime + restTime;
          const newTime = prev.currentTime + 1;
          const currentInterval = Math.floor(newTime / intervalDuration);
          const timeInInterval = newTime % intervalDuration;
          const inRest = timeInInterval >= workTime;
          const currentRound = currentInterval + 1;

          if (currentRound > (prev.totalRounds || 8)) {
            return { ...prev, isRunning: false };
          }

          setIsInRestPeriod(inRest);

          return {
            ...prev,
            currentTime: newTime,
            round: currentRound,
          };
        }

        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.type]);

  // Calculate display time based on timer type
  const getDisplayTime = (): string => {
    if (timer.type === 'countdown') {
      return formatTime(timer.currentTime);
    }
    if (timer.type === 'countup') {
      return formatTime(timer.currentTime);
    }
    if (timer.type === 'emom') {
      const roundDuration = timer.duration / (timer.totalRounds || 1);
      const timeInRound = timer.currentTime % roundDuration;
      return formatTime(roundDuration - timeInRound);
    }
    if (timer.type === 'tabata') {
      const workTime = timer.workTime || 20;
      const restTime = timer.restTime || 10;
      const intervalDuration = workTime + restTime;
      const timeInInterval = timer.currentTime % intervalDuration;

      if (timeInInterval < workTime) {
        // Work phase
        return formatTime(workTime - timeInInterval);
      } else {
        // Rest phase
        return formatTime(intervalDuration - timeInInterval);
      }
    }
    return formatTime(timer.currentTime);
  };

  // Get timer label
  const getTimerLabel = (): string => {
    switch (timer.type) {
      case 'countdown':
        return 'TIME CAP';
      case 'countup':
        return 'FOR TIME';
      case 'emom':
        return 'EMOM';
      case 'tabata':
        return isInRestPeriod ? 'REST' : 'WORK';
      default:
        return 'TIMER';
    }
  };

  // Get background color based on state
  const getBackgroundClass = (): string => {
    if (!timer.isRunning) return 'bg-zinc-900';
    if (timer.type === 'tabata' && isInRestPeriod) return 'bg-green-900';
    if (timer.currentTime <= 10 && timer.type === 'countdown') return 'bg-red-900 animate-pulse';
    return 'bg-zinc-900';
  };

  // Progress percentage
  const getProgress = (): number => {
    if (timer.type === 'countdown') {
      return ((timer.duration - timer.currentTime) / timer.duration) * 100;
    }
    if (timer.type === 'countup') {
      return timer.duration > 0 ? (timer.currentTime / timer.duration) * 100 : 0;
    }
    return (timer.currentTime / timer.duration) * 100;
  };

  const displayTime = getDisplayTime();
  const label = getTimerLabel();
  const progress = getProgress();

  return (
    <div className={`min-h-[60vh] flex flex-col items-center justify-center transition-colors duration-500 ${getBackgroundClass()} rounded-3xl`}>
      {/* Workout Name */}
      {workoutName && (
        <div className="text-2xl text-zinc-400 mb-4">{workoutName}</div>
      )}

      {/* Timer Type Label */}
      <div className="text-4xl font-bold text-[var(--tv-primary)] mb-4">
        {label}
      </div>

      {/* Main Timer Display */}
      <div className="relative">
        <div className="text-[12rem] font-mono font-bold leading-none tracking-tighter">
          {displayTime}
        </div>

        {/* Visual alert for low time */}
        {timer.isRunning && timer.type === 'countdown' && timer.currentTime <= 10 && timer.currentTime > 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-red-500 text-9xl animate-ping opacity-30">
            {timer.currentTime}
          </div>
        )}
      </div>

      {/* Round/Interval Info */}
      {(timer.type === 'emom' || timer.type === 'tabata') && (
        <div className="mt-8 text-4xl">
          <span className="text-[var(--tv-primary)] font-bold">
            Round {timer.round || 1}
          </span>
          <span className="text-zinc-500"> / {timer.totalRounds || 1}</span>
        </div>
      )}

      {/* Tabata Work/Rest Indicator */}
      {timer.type === 'tabata' && (
        <div className="mt-4 flex gap-4 text-2xl">
          <span className={`px-4 py-2 rounded-lg ${!isInRestPeriod ? 'bg-red-600' : 'bg-zinc-700'}`}>
            WORK {timer.workTime}s
          </span>
          <span className={`px-4 py-2 rounded-lg ${isInRestPeriod ? 'bg-green-600' : 'bg-zinc-700'}`}>
            REST {timer.restTime}s
          </span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full max-w-4xl mt-12 h-4 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--tv-primary)] transition-all duration-1000"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Timer Status */}
      <div className="mt-8 flex items-center gap-4 text-2xl">
        {timer.isRunning ? (
          <span className="text-green-500 flex items-center gap-2">
            <Clock className="h-6 w-6 animate-spin" style={{ animationDuration: '2s' }} />
            EN COURS
          </span>
        ) : timer.currentTime === 0 && timer.type === 'countdown' ? (
          <span className="text-red-500 font-bold text-4xl">TIME!</span>
        ) : (
          <span className="text-zinc-500 flex items-center gap-2">
            <Pause className="h-6 w-6" />
            EN PAUSE
          </span>
        )}
      </div>

      {/* Total Duration Info */}
      {timer.type === 'emom' && (
        <div className="mt-4 text-xl text-zinc-500">
          Duree totale: {formatTime(timer.duration)}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 text-zinc-600 text-lg">
        Le timer est controle depuis le tableau de bord coach
      </div>
    </div>
  );
}
