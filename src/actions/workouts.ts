'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Note: workouts tables are defined in supabase/migrations/00005_workouts.sql
// but not yet in database.types.ts. After applying migrations, regenerate types.

// =====================================================
// TYPES
// =====================================================

export type WorkoutBlockType =
  | 'warmup'
  | 'skill'
  | 'strength'
  | 'wod'
  | 'cooldown'
  | 'accessory'
  | 'custom';

export type WodType =
  | 'amrap'
  | 'emom'
  | 'for_time'
  | 'tabata'
  | 'rounds'
  | 'max_reps'
  | 'max_weight'
  | 'chipper'
  | 'ladder'
  | 'custom';

export type ExerciseCategory =
  | 'weightlifting'
  | 'gymnastics'
  | 'cardio'
  | 'strongman'
  | 'core'
  | 'mobility'
  | 'other';

export type ScoreType =
  | 'time'
  | 'reps'
  | 'rounds_reps'
  | 'weight'
  | 'calories'
  | 'distance'
  | 'points';

export interface Exercise {
  id: string;
  org_id: string | null;
  name: string;
  name_en: string | null;
  description: string | null;
  category: ExerciseCategory;
  video_url: string | null;
  image_url: string | null;
  equipment: string[];
  is_global: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlockExercise {
  id: string;
  block_id: string;
  exercise_id: string | null;
  custom_name: string | null;
  reps: number | null;
  reps_unit: string;
  weight_male: number | null;
  weight_female: number | null;
  weight_unit: string;
  distance: number | null;
  distance_unit: string;
  time_seconds: number | null;
  calories: number | null;
  scaled_reps: number | null;
  scaled_weight_male: number | null;
  scaled_weight_female: number | null;
  position: number;
  notes: string | null;
  exercise?: Exercise;
}

export interface WorkoutBlock {
  id: string;
  workout_id: string;
  name: string | null;
  block_type: WorkoutBlockType;
  wod_type: WodType | null;
  time_cap: number | null;
  rounds: number | null;
  work_time: number | null;
  rest_time: number | null;
  position: number;
  notes: string | null;
  exercises?: BlockExercise[];
}

export interface Workout {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  date: string | null;
  is_template: boolean;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  blocks?: WorkoutBlock[];
}

export interface WorkoutScore {
  id: string;
  workout_id: string;
  member_id: string;
  block_id: string | null;
  score_type: ScoreType;
  score_value: number;
  score_secondary: number | null;
  is_rx: boolean;
  notes: string | null;
  recorded_at: string;
  member?: {
    id: string;
    first_name: string;
    last_name: string | null;
  };
}

export interface PersonalRecord {
  id: string;
  member_id: string;
  exercise_id: string;
  record_type: string;
  record_value: number;
  record_unit: string;
  workout_id: string | null;
  notes: string | null;
  achieved_at: string;
  exercise?: Exercise;
}

// =====================================================
// EXERCISES ACTIONS
// =====================================================

export async function getExercises(
  orgId: string,
  options?: {
    category?: ExerciseCategory;
    search?: string;
    includeGlobal?: boolean;
  }
): Promise<Exercise[]> {
  const supabase = await createClient();
  const includeGlobal = options?.includeGlobal !== false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('exercises')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (includeGlobal) {
    query = query.or(`org_id.eq.${orgId},is_global.eq.true`);
  } else {
    query = query.eq('org_id', orgId);
  }

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching exercises:', error);
    return [];
  }

  return data as Exercise[];
}

export async function createExercise(
  orgId: string,
  exercise: {
    name: string;
    name_en?: string;
    description?: string;
    category: ExerciseCategory;
    equipment?: string[];
    video_url?: string;
    image_url?: string;
  }
): Promise<{ id: string } | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('exercises')
    .insert({
      org_id: orgId,
      name: exercise.name,
      name_en: exercise.name_en || null,
      description: exercise.description || null,
      category: exercise.category,
      equipment: exercise.equipment || [],
      video_url: exercise.video_url || null,
      image_url: exercise.image_url || null,
      is_global: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating exercise:', error);
    return null;
  }

  return { id: data.id };
}

// =====================================================
// WORKOUTS ACTIONS
// =====================================================

export async function getWorkouts(
  orgId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    isTemplate?: boolean;
    isPublished?: boolean;
    limit?: number;
  }
): Promise<Workout[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('workouts')
    .select('*')
    .eq('org_id', orgId)
    .order('date', { ascending: false, nullsFirst: false });

  if (options?.startDate) {
    query = query.gte('date', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('date', options.endDate);
  }
  if (options?.isTemplate !== undefined) {
    query = query.eq('is_template', options.isTemplate);
  }
  if (options?.isPublished !== undefined) {
    query = query.eq('is_published', options.isPublished);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching workouts:', error);
    return [];
  }

  return data as Workout[];
}

export async function getWorkoutById(workoutId: string): Promise<Workout | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workout, error: workoutError } = await (supabase as any)
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
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

export async function getWorkoutByDate(
  orgId: string,
  date: string
): Promise<Workout | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workouts')
    .select('*')
    .eq('org_id', orgId)
    .eq('date', date)
    .eq('is_template', false)
    .maybeSingle();

  if (error) {
    console.error('Error fetching workout by date:', error);
    return null;
  }

  if (!data) return null;

  return getWorkoutById(data.id);
}

export async function createWorkout(
  orgId: string,
  workout: {
    name: string;
    description?: string;
    date?: string;
    is_template?: boolean;
    is_published?: boolean;
    blocks?: Array<{
      name?: string;
      block_type: WorkoutBlockType;
      wod_type?: WodType;
      time_cap?: number;
      rounds?: number;
      work_time?: number;
      rest_time?: number;
      notes?: string;
      exercises?: Array<{
        exercise_id?: string;
        custom_name?: string;
        reps?: number;
        reps_unit?: string;
        weight_male?: number;
        weight_female?: number;
        weight_unit?: string;
        distance?: number;
        distance_unit?: string;
        time_seconds?: number;
        calories?: number;
        notes?: string;
      }>;
    }>;
  }
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Create workout
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workoutData, error: workoutError } = await (supabase as any)
    .from('workouts')
    .insert({
      org_id: orgId,
      name: workout.name,
      description: workout.description || null,
      date: workout.date || null,
      is_template: workout.is_template || false,
      is_published: workout.is_published || false,
      created_by: user?.id || null,
    })
    .select('id')
    .single();

  if (workoutError) {
    console.error('Error creating workout:', workoutError);
    return { error: workoutError.message };
  }

  const workoutId = workoutData.id;

  // Create blocks if provided
  if (workout.blocks && workout.blocks.length > 0) {
    for (let i = 0; i < workout.blocks.length; i++) {
      const block = workout.blocks[i];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: blockData, error: blockError } = await (supabase as any)
        .from('workout_blocks')
        .insert({
          workout_id: workoutId,
          name: block.name || null,
          block_type: block.block_type,
          wod_type: block.wod_type || null,
          time_cap: block.time_cap || null,
          rounds: block.rounds || null,
          work_time: block.work_time || null,
          rest_time: block.rest_time || null,
          notes: block.notes || null,
          position: i,
        })
        .select('id')
        .single();

      if (blockError) {
        console.error('Error creating workout block:', blockError);
        continue;
      }

      // Create exercises for block
      if (block.exercises && block.exercises.length > 0) {
        const exercisesData = block.exercises.map((ex, j) => ({
          block_id: blockData.id,
          exercise_id: ex.exercise_id || null,
          custom_name: ex.custom_name || null,
          reps: ex.reps || null,
          reps_unit: ex.reps_unit || 'reps',
          weight_male: ex.weight_male || null,
          weight_female: ex.weight_female || null,
          weight_unit: ex.weight_unit || 'kg',
          distance: ex.distance || null,
          distance_unit: ex.distance_unit || 'm',
          time_seconds: ex.time_seconds || null,
          calories: ex.calories || null,
          notes: ex.notes || null,
          position: j,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: exError } = await (supabase as any)
          .from('block_exercises')
          .insert(exercisesData);

        if (exError) {
          console.error('Error creating block exercises:', exError);
        }
      }
    }
  }

  revalidatePath('/dashboard/workouts');
  return { id: workoutId };
}

export async function updateWorkout(
  workoutId: string,
  updates: {
    name?: string;
    description?: string;
    date?: string;
    is_published?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('workouts')
    .update(updates)
    .eq('id', workoutId);

  if (error) {
    console.error('Error updating workout:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/workouts');
  revalidatePath(`/dashboard/workouts/${workoutId}`);
  return { success: true };
}

export async function deleteWorkout(workoutId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('workouts')
    .delete()
    .eq('id', workoutId);

  if (error) {
    console.error('Error deleting workout:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/workouts');
  return { success: true };
}

export async function duplicateWorkout(
  workoutId: string,
  newDate?: string
): Promise<{ id: string } | { error: string }> {
  const workout = await getWorkoutById(workoutId);
  if (!workout) {
    return { error: 'Workout not found' };
  }

  return createWorkout(workout.org_id, {
    name: `${workout.name} (copie)`,
    description: workout.description || undefined,
    date: newDate,
    is_template: false,
    is_published: false,
    blocks: workout.blocks?.map((block) => ({
      name: block.name || undefined,
      block_type: block.block_type,
      wod_type: block.wod_type || undefined,
      time_cap: block.time_cap || undefined,
      rounds: block.rounds || undefined,
      work_time: block.work_time || undefined,
      rest_time: block.rest_time || undefined,
      notes: block.notes || undefined,
      exercises: block.exercises?.map((ex) => ({
        exercise_id: ex.exercise_id || undefined,
        custom_name: ex.custom_name || undefined,
        reps: ex.reps || undefined,
        reps_unit: ex.reps_unit,
        weight_male: ex.weight_male || undefined,
        weight_female: ex.weight_female || undefined,
        weight_unit: ex.weight_unit,
        distance: ex.distance || undefined,
        distance_unit: ex.distance_unit,
        time_seconds: ex.time_seconds || undefined,
        calories: ex.calories || undefined,
        notes: ex.notes || undefined,
      })),
    })),
  });
}

// =====================================================
// WORKOUT BLOCKS ACTIONS
// =====================================================

export async function addWorkoutBlock(
  workoutId: string,
  block: {
    name?: string;
    block_type: WorkoutBlockType;
    wod_type?: WodType;
    time_cap?: number;
    rounds?: number;
    work_time?: number;
    rest_time?: number;
    notes?: string;
    position?: number;
  }
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  // Get current max position if not provided
  let position = block.position;
  if (position === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: maxPos } = await (supabase as any)
      .from('workout_blocks')
      .select('position')
      .eq('workout_id', workoutId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    position = (maxPos?.position ?? -1) + 1;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workout_blocks')
    .insert({
      workout_id: workoutId,
      name: block.name || null,
      block_type: block.block_type,
      wod_type: block.wod_type || null,
      time_cap: block.time_cap || null,
      rounds: block.rounds || null,
      work_time: block.work_time || null,
      rest_time: block.rest_time || null,
      notes: block.notes || null,
      position,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding workout block:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/workouts/${workoutId}`);
  return { id: data.id };
}

export async function updateWorkoutBlock(
  blockId: string,
  updates: Partial<Omit<WorkoutBlock, 'id' | 'workout_id' | 'exercises'>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('workout_blocks')
    .update(updates)
    .eq('id', blockId);

  if (error) {
    console.error('Error updating workout block:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteWorkoutBlock(blockId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('workout_blocks')
    .delete()
    .eq('id', blockId);

  if (error) {
    console.error('Error deleting workout block:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =====================================================
// BLOCK EXERCISES ACTIONS
// =====================================================

export async function addBlockExercise(
  blockId: string,
  exercise: {
    exercise_id?: string;
    custom_name?: string;
    reps?: number;
    reps_unit?: string;
    weight_male?: number;
    weight_female?: number;
    weight_unit?: string;
    distance?: number;
    distance_unit?: string;
    time_seconds?: number;
    calories?: number;
    notes?: string;
    position?: number;
  }
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  // Get current max position if not provided
  let position = exercise.position;
  if (position === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: maxPos } = await (supabase as any)
      .from('block_exercises')
      .select('position')
      .eq('block_id', blockId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    position = (maxPos?.position ?? -1) + 1;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('block_exercises')
    .insert({
      block_id: blockId,
      exercise_id: exercise.exercise_id || null,
      custom_name: exercise.custom_name || null,
      reps: exercise.reps || null,
      reps_unit: exercise.reps_unit || 'reps',
      weight_male: exercise.weight_male || null,
      weight_female: exercise.weight_female || null,
      weight_unit: exercise.weight_unit || 'kg',
      distance: exercise.distance || null,
      distance_unit: exercise.distance_unit || 'm',
      time_seconds: exercise.time_seconds || null,
      calories: exercise.calories || null,
      notes: exercise.notes || null,
      position,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding block exercise:', error);
    return { error: error.message };
  }

  return { id: data.id };
}

export async function deleteBlockExercise(exerciseId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('block_exercises')
    .delete()
    .eq('id', exerciseId);

  if (error) {
    console.error('Error deleting block exercise:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =====================================================
// SCORES ACTIONS
// =====================================================

export async function getWorkoutScores(
  workoutId: string,
  blockId?: string
): Promise<WorkoutScore[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('workout_scores')
    .select(`
      *,
      members (id, first_name, last_name)
    `)
    .eq('workout_id', workoutId);

  if (blockId) {
    query = query.eq('block_id', blockId);
  } else {
    query = query.is('block_id', null);
  }

  const { data, error } = await query.order('score_value', { ascending: true });

  if (error) {
    console.error('Error fetching workout scores:', error);
    return [];
  }

  return data.map((score: Record<string, unknown>) => ({
    ...score,
    member: score.members,
  })) as WorkoutScore[];
}

export async function recordScore(
  workoutId: string,
  memberId: string,
  score: {
    score_type: ScoreType;
    score_value: number;
    score_secondary?: number;
    is_rx?: boolean;
    notes?: string;
    block_id?: string;
  }
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workout_scores')
    .upsert({
      workout_id: workoutId,
      member_id: memberId,
      block_id: score.block_id || null,
      score_type: score.score_type,
      score_value: score.score_value,
      score_secondary: score.score_secondary || null,
      is_rx: score.is_rx ?? true,
      notes: score.notes || null,
      recorded_at: new Date().toISOString(),
    }, {
      onConflict: 'workout_id,member_id,block_id',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error recording score:', error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/workouts/${workoutId}`);
  return { id: data.id };
}

export async function deleteScore(scoreId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('workout_scores')
    .delete()
    .eq('id', scoreId);

  if (error) {
    console.error('Error deleting score:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =====================================================
// PERSONAL RECORDS ACTIONS
// =====================================================

export async function getMemberPRs(memberId: string): Promise<PersonalRecord[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('personal_records')
    .select(`
      *,
      exercises (*)
    `)
    .eq('member_id', memberId)
    .order('achieved_at', { ascending: false });

  if (error) {
    console.error('Error fetching member PRs:', error);
    return [];
  }

  return data.map((pr: Record<string, unknown>) => ({
    ...pr,
    exercise: pr.exercises,
  })) as PersonalRecord[];
}

export async function recordPR(
  memberId: string,
  exerciseId: string,
  record: {
    record_type: string;
    record_value: number;
    record_unit: string;
    workout_id?: string;
    notes?: string;
    achieved_at?: string;
  }
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('personal_records')
    .upsert({
      member_id: memberId,
      exercise_id: exerciseId,
      record_type: record.record_type,
      record_value: record.record_value,
      record_unit: record.record_unit,
      workout_id: record.workout_id || null,
      notes: record.notes || null,
      achieved_at: record.achieved_at || new Date().toISOString().split('T')[0],
    }, {
      onConflict: 'member_id,exercise_id,record_type',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error recording PR:', error);
    return { error: error.message };
  }

  return { id: data.id };
}

// =====================================================
// MEMBER WORKOUT HISTORY
// =====================================================

export async function getMemberWorkoutHistory(
  memberId: string,
  limit: number = 20
): Promise<Array<{
  workout: Workout;
  score: WorkoutScore | null;
}>> {
  const supabase = await createClient();

  // Get member's org first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: member } = await (supabase as any)
    .from('members')
    .select('org_id')
    .eq('id', memberId)
    .single();

  if (!member) return [];

  // Get recent workouts for the org
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workouts, error } = await (supabase as any)
    .from('workouts')
    .select('*')
    .eq('org_id', member.org_id)
    .eq('is_template', false)
    .not('date', 'is', null)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching workout history:', error);
    return [];
  }

  // Get scores for these workouts
  const workoutIds = workouts.map((w: { id: string }) => w.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: scores } = await (supabase as any)
    .from('workout_scores')
    .select('*')
    .eq('member_id', memberId)
    .in('workout_id', workoutIds)
    .is('block_id', null);

  const scoreMap = new Map(
    (scores || []).map((s: WorkoutScore) => [s.workout_id, s])
  );

  return workouts.map((workout: Workout) => ({
    workout,
    score: scoreMap.get(workout.id) || null,
  }));
}

// =====================================================
// CLASS-WORKOUT LINK
// =====================================================

export async function linkWorkoutToClass(
  classId: string,
  workoutId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('class_workouts')
    .upsert({
      class_id: classId,
      workout_id: workoutId,
    }, {
      onConflict: 'class_id,workout_id',
    });

  if (error) {
    console.error('Error linking workout to class:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/planning/${classId}`);
  return { success: true };
}

export async function getClassWorkout(classId: string): Promise<Workout | null> {
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

  return getWorkoutById(data.workout_id);
}
