'use client';

import type { Workout, WorkoutBlock, BlockExercise } from '@/actions/workouts';
import { Clock, Dumbbell, Repeat, Flame } from 'lucide-react';

interface TVWorkoutProps {
  workout: Workout;
}

const blockTypeConfig: Record<string, { label: string; bgColor: string; icon: React.ReactNode }> = {
  warmup: { label: 'WARM-UP', bgColor: 'bg-orange-600', icon: <Flame className="h-6 w-6" /> },
  skill: { label: 'SKILL', bgColor: 'bg-blue-600', icon: <Dumbbell className="h-6 w-6" /> },
  strength: { label: 'FORCE', bgColor: 'bg-purple-600', icon: <Dumbbell className="h-6 w-6" /> },
  wod: { label: 'WOD', bgColor: 'bg-red-600', icon: <Flame className="h-6 w-6" /> },
  cooldown: { label: 'COOL-DOWN', bgColor: 'bg-green-600', icon: <Flame className="h-6 w-6" /> },
  accessory: { label: 'ACCESSOIRE', bgColor: 'bg-gray-600', icon: <Dumbbell className="h-6 w-6" /> },
  custom: { label: 'CUSTOM', bgColor: 'bg-slate-600', icon: <Dumbbell className="h-6 w-6" /> },
};

const wodTypeLabels: Record<string, string> = {
  amrap: 'AMRAP',
  emom: 'EMOM',
  for_time: 'FOR TIME',
  tabata: 'TABATA',
  rounds: 'ROUNDS',
  max_reps: 'MAX REPS',
  max_weight: 'MAX WEIGHT',
  chipper: 'CHIPPER',
  ladder: 'LADDER',
  custom: 'CUSTOM',
};

export function TVWorkout({ workout }: TVWorkoutProps) {
  const blocks = workout.blocks || [];

  return (
    <div className="space-y-6">
      {/* Workout Title */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold">{workout.name}</h1>
        {workout.description && (
          <p className="text-xl text-zinc-400 mt-2">{workout.description}</p>
        )}
      </div>

      {/* Blocks Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {blocks.map((block) => (
          <TVBlock key={block.id} block={block} />
        ))}
      </div>

      {blocks.length === 0 && (
        <div className="text-center py-20">
          <Dumbbell className="h-16 w-16 mx-auto text-zinc-600" />
          <p className="text-2xl text-zinc-500 mt-4">Aucun contenu</p>
        </div>
      )}
    </div>
  );
}

function TVBlock({ block }: { block: WorkoutBlock }) {
  const config = blockTypeConfig[block.block_type] || blockTypeConfig.custom;

  return (
    <div className="rounded-xl overflow-hidden bg-zinc-900">
      {/* Block Header */}
      <div className={`${config.bgColor} px-6 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          {config.icon}
          <span className="text-xl font-bold">{config.label}</span>
          {block.name && (
            <span className="text-lg opacity-80">- {block.name}</span>
          )}
        </div>
        {block.wod_type && (
          <span className="text-lg font-bold bg-black/20 px-4 py-1 rounded-full">
            {wodTypeLabels[block.wod_type] || block.wod_type.toUpperCase()}
          </span>
        )}
      </div>

      {/* Block Content */}
      <div className="p-6">
        {/* Time/Rounds Info */}
        {(block.time_cap || block.rounds || block.work_time) && (
          <div className="flex flex-wrap gap-6 mb-4 text-lg">
            {block.time_cap && (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-zinc-400" />
                <span className="font-bold">{block.time_cap} min</span>
              </div>
            )}
            {block.rounds && (
              <div className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-zinc-400" />
                <span className="font-bold">{block.rounds} rounds</span>
              </div>
            )}
            {block.work_time && (
              <span className="font-bold">
                {block.work_time}s ON
                {block.rest_time && ` / ${block.rest_time}s OFF`}
              </span>
            )}
          </div>
        )}

        {/* Exercises List */}
        {block.exercises && block.exercises.length > 0 && (
          <div className="space-y-3">
            {block.exercises.map((exercise) => (
              <TVExercise key={exercise.id} exercise={exercise} />
            ))}
          </div>
        )}

        {/* Notes */}
        {block.notes && (
          <div className="mt-4 p-4 bg-zinc-800 rounded-lg text-zinc-300">
            {block.notes}
          </div>
        )}
      </div>
    </div>
  );
}

function TVExercise({ exercise }: { exercise: BlockExercise }) {
  const name = exercise.exercise?.name || exercise.custom_name || 'Exercice';

  // Build the description parts
  const parts: string[] = [];

  if (exercise.reps) {
    parts.push(`${exercise.reps} ${exercise.reps_unit === 'reps' ? '' : exercise.reps_unit}`);
  }
  if (exercise.distance) {
    parts.push(`${exercise.distance}${exercise.distance_unit}`);
  }
  if (exercise.calories) {
    parts.push(`${exercise.calories} cal`);
  }
  if (exercise.time_seconds) {
    if (exercise.time_seconds >= 60) {
      const mins = Math.floor(exercise.time_seconds / 60);
      const secs = exercise.time_seconds % 60;
      parts.push(secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins} min`);
    } else {
      parts.push(`${exercise.time_seconds}s`);
    }
  }

  // Weight info
  const hasWeights = exercise.weight_male || exercise.weight_female;

  return (
    <div className="flex items-center justify-between bg-zinc-800 rounded-lg px-4 py-3">
      <div className="flex items-center gap-4">
        {parts.length > 0 && (
          <span className="text-2xl font-bold text-[var(--tv-primary)]">
            {parts.join(' ')}
          </span>
        )}
        <span className="text-xl">{name}</span>
      </div>
      {hasWeights && (
        <div className="text-lg text-zinc-400">
          {exercise.weight_male && (
            <span className="mr-4">
              <span className="text-blue-400">H</span> {exercise.weight_male}{exercise.weight_unit}
            </span>
          )}
          {exercise.weight_female && (
            <span>
              <span className="text-pink-400">F</span> {exercise.weight_female}{exercise.weight_unit}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
