-- Migration: Add workout_id to classes table
-- This allows linking a workout (WOD) to a class session

-- Add workout_id column to classes table
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_classes_workout_id ON public.classes(workout_id);

-- Comment
COMMENT ON COLUMN public.classes.workout_id IS 'Optional workout (WOD) associated with this class session';
