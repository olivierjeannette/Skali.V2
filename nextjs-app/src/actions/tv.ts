'use server';

import { createClient } from '@/lib/supabase/server';
import type { Workout } from './workouts';

// =====================================================
// TYPES
// =====================================================

export interface TVState {
  mode: 'waiting' | 'workout' | 'timer' | 'leaderboard' | 'teams';
  workoutId: string | null;
  timerState: {
    type: 'countdown' | 'countup' | 'emom' | 'tabata';
    duration: number; // seconds
    currentTime: number; // seconds
    isRunning: boolean;
    round?: number;
    totalRounds?: number;
    workTime?: number;
    restTime?: number;
  } | null;
  teamsData: Array<{
    name: string;
    color: string;
    members: Array<{ id: string; name: string; station?: string }>;
  }> | null;
}

export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export interface TVData {
  org: Organization | null;
  currentClass: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    coach_name: string | null;
  } | null;
  workout: Workout | null;
  nextClass: {
    id: string;
    name: string;
    start_time: string;
    coach_name: string | null;
  } | null;
  tvState: TVState | null;
}

// =====================================================
// PUBLIC ACTIONS (no auth required for TV display)
// =====================================================

/**
 * Get organization info by ID (public)
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, logo_url, settings')
    .eq('id', orgId)
    .single();

  if (error) {
    console.error('Error fetching organization:', error);
    return null;
  }

  // Extract colors from settings JSON
  const settings = data.settings as Record<string, unknown> | null;

  return {
    id: data.id,
    name: data.name,
    logo_url: data.logo_url,
    primary_color: (settings?.primary_color as string) || null,
    secondary_color: (settings?.secondary_color as string) || null,
  };
}

/**
 * Get current class for organization (the class happening now)
 */
export async function getCurrentClass(orgId: string): Promise<TVData['currentClass']> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      start_time,
      end_time,
      coach:profiles!classes_coach_id_fkey(full_name)
    `)
    .eq('org_id', orgId)
    .eq('status', 'scheduled')
    .lte('start_time', now)
    .gte('end_time', now)
    .order('start_time', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    start_time: data.start_time,
    end_time: data.end_time,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coach_name: (data.coach as any)?.full_name || null,
  };
}

/**
 * Get next upcoming class for organization
 */
export async function getNextClass(orgId: string): Promise<TVData['nextClass']> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      start_time,
      coach:profiles!classes_coach_id_fkey(full_name)
    `)
    .eq('org_id', orgId)
    .eq('status', 'scheduled')
    .gt('start_time', now)
    .order('start_time', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    start_time: data.start_time,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coach_name: (data.coach as any)?.full_name || null,
  };
}

/**
 * Get workout for a class
 */
export async function getWorkoutForClass(classId: string): Promise<Workout | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('class_workouts')
    .select('workout_id')
    .eq('class_id', classId)
    .single();

  if (error || !data) {
    return null;
  }

  return getWorkoutByIdPublic(data.workout_id);
}

/**
 * Get workout by ID (public version without auth check)
 */
export async function getWorkoutByIdPublic(workoutId: string): Promise<Workout | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workout, error: workoutError } = await (supabase as any)
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .eq('is_published', true)
    .single();

  if (workoutError) {
    console.error('Error fetching workout:', workoutError);
    return null;
  }

  // Fetch blocks with exercises
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: blocks, error: blocksError } = await (supabase as any)
    .from('workout_blocks')
    .select(`
      *,
      block_exercises (
        *,
        exercises (*)
      )
    `)
    .eq('workout_id', workoutId)
    .order('position');

  if (blocksError) {
    console.error('Error fetching workout blocks:', blocksError);
    return workout;
  }

  // Transform the data
  const transformedBlocks = blocks.map((block: Record<string, unknown>) => {
    const blockExercises = block.block_exercises as Array<Record<string, unknown>> | undefined;
    const mappedExercises = blockExercises?.map((be) => ({
      ...be,
      exercise: be.exercises,
    })) || [];
    // Sort by position
    mappedExercises.sort((a, b) => {
      const posA = (a as { position?: number }).position ?? 0;
      const posB = (b as { position?: number }).position ?? 0;
      return posA - posB;
    });
    return {
      ...block,
      exercises: mappedExercises,
    };
  });

  return {
    ...workout,
    blocks: transformedBlocks,
  } as Workout;
}

/**
 * Get workout of the day for organization (by date)
 */
export async function getWorkoutOfTheDay(orgId: string): Promise<Workout | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workouts')
    .select('id')
    .eq('org_id', orgId)
    .eq('date', today)
    .eq('is_template', false)
    .eq('is_published', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return getWorkoutByIdPublic(data.id);
}

/**
 * Get TV state from database
 */
export async function getTVState(orgId: string): Promise<TVState | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tv_states')
    .select('*')
    .eq('org_id', orgId)
    .single();

  if (error) {
    // No TV state exists yet, return default
    return {
      mode: 'waiting',
      workoutId: null,
      timerState: null,
      teamsData: null,
    };
  }

  return {
    mode: data.mode || 'waiting',
    workoutId: data.workout_id || null,
    timerState: data.timer_state || null,
    teamsData: data.teams_data || null,
  };
}

/**
 * Get all TV data in one call (for initial load)
 */
export async function getTVData(orgId: string): Promise<TVData> {
  const [org, currentClass, nextClass, tvState] = await Promise.all([
    getOrganization(orgId),
    getCurrentClass(orgId),
    getNextClass(orgId),
    getTVState(orgId),
  ]);

  let workout: Workout | null = null;

  // Priority: TV state workout > current class workout > workout of the day
  if (tvState?.workoutId) {
    workout = await getWorkoutByIdPublic(tvState.workoutId);
  } else if (currentClass) {
    workout = await getWorkoutForClass(currentClass.id);
  }

  if (!workout) {
    workout = await getWorkoutOfTheDay(orgId);
  }

  return {
    org,
    currentClass,
    workout,
    nextClass,
    tvState,
  };
}

// =====================================================
// COACH ACTIONS (requires auth - for TV control)
// =====================================================

/**
 * Update TV state (coach control)
 */
export async function updateTVState(
  orgId: string,
  updates: Partial<TVState>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Upsert TV state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('tv_states')
    .upsert({
      org_id: orgId,
      mode: updates.mode,
      workout_id: updates.workoutId,
      timer_state: updates.timerState,
      teams_data: updates.teamsData,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'org_id',
    });

  if (error) {
    console.error('Error updating TV state:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Set TV to show a specific workout
 */
export async function setTVWorkout(
  orgId: string,
  workoutId: string
): Promise<{ success: boolean; error?: string }> {
  return updateTVState(orgId, {
    mode: 'workout',
    workoutId,
    timerState: null,
    teamsData: null,
  });
}

/**
 * Set TV to waiting mode
 */
export async function setTVWaiting(
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  return updateTVState(orgId, {
    mode: 'waiting',
    workoutId: null,
    timerState: null,
    teamsData: null,
  });
}

/**
 * Start timer on TV
 */
export async function startTVTimer(
  orgId: string,
  timerConfig: TVState['timerState']
): Promise<{ success: boolean; error?: string }> {
  return updateTVState(orgId, {
    mode: 'timer',
    timerState: timerConfig,
  });
}

/**
 * Update timer state (pause, resume, reset)
 */
export async function updateTVTimer(
  orgId: string,
  timerState: TVState['timerState']
): Promise<{ success: boolean; error?: string }> {
  const currentState = await getTVState(orgId);
  if (!currentState || currentState.mode !== 'timer') {
    return { success: false, error: 'Timer not active' };
  }

  return updateTVState(orgId, {
    ...currentState,
    timerState,
  });
}

/**
 * Show leaderboard on TV
 */
export async function showTVLeaderboard(
  orgId: string,
  workoutId: string
): Promise<{ success: boolean; error?: string }> {
  return updateTVState(orgId, {
    mode: 'leaderboard',
    workoutId,
    timerState: null,
    teamsData: null,
  });
}

/**
 * Show teams on TV
 */
export async function showTVTeams(
  orgId: string,
  teamsData: TVState['teamsData']
): Promise<{ success: boolean; error?: string }> {
  return updateTVState(orgId, {
    mode: 'teams',
    workoutId: null,
    timerState: null,
    teamsData,
  });
}
