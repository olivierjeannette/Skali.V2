'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
} from 'lucide-react';
import {
  getWorkoutById,
  updateWorkout,
  addWorkoutBlock,
  updateWorkoutBlock,
  deleteWorkoutBlock,
  addBlockExercise,
  deleteBlockExercise,
  type WorkoutBlockType,
  type WodType,
  type Workout,
} from '@/actions/workouts';
import { use } from 'react';

const blockTypeOptions: { value: WorkoutBlockType; label: string; color: string }[] = [
  { value: 'warmup', label: 'Warm-up', color: 'bg-orange-100 text-orange-700' },
  { value: 'skill', label: 'Skill', color: 'bg-blue-100 text-blue-700' },
  { value: 'strength', label: 'Force', color: 'bg-purple-100 text-purple-700' },
  { value: 'wod', label: 'WOD', color: 'bg-red-100 text-red-700' },
  { value: 'cooldown', label: 'Cool-down', color: 'bg-green-100 text-green-700' },
  { value: 'accessory', label: 'Accessoire', color: 'bg-gray-100 text-gray-700' },
  { value: 'custom', label: 'Custom', color: 'bg-slate-100 text-slate-700' },
];

const wodTypeOptions: { value: WodType; label: string; description: string }[] = [
  { value: 'amrap', label: 'AMRAP', description: 'As Many Rounds As Possible' },
  { value: 'emom', label: 'EMOM', description: 'Every Minute On the Minute' },
  { value: 'for_time', label: 'For Time', description: 'Terminer le plus vite possible' },
  { value: 'tabata', label: 'Tabata', description: '20s travail / 10s repos' },
  { value: 'rounds', label: 'Rounds', description: 'Nombre de rounds fixes' },
  { value: 'max_reps', label: 'Max Reps', description: 'Maximum de repetitions' },
  { value: 'max_weight', label: 'Max Weight', description: 'Charge maximale' },
  { value: 'chipper', label: 'Chipper', description: "Liste d'exercices a completer" },
  { value: 'ladder', label: 'Ladder', description: 'Progression croissante/decroissante' },
  { value: 'custom', label: 'Custom', description: 'Format personnalise' },
];

interface LocalBlockExercise {
  id: string;
  isNew?: boolean;
  custom_name: string;
  reps?: number;
  reps_unit: string;
  weight_male?: number;
  weight_female?: number;
  weight_unit: string;
  distance?: number;
  distance_unit: string;
  time_seconds?: number;
  calories?: number;
  notes?: string;
}

interface LocalBlock {
  id: string;
  isNew?: boolean;
  name: string;
  block_type: WorkoutBlockType;
  wod_type?: WodType;
  time_cap?: number;
  rounds?: number;
  work_time?: number;
  rest_time?: number;
  notes?: string;
  exercises: LocalBlockExercise[];
  isExpanded: boolean;
}

export default function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [blocks, setBlocks] = useState<LocalBlock[]>([]);
  const [originalWorkout, setOriginalWorkout] = useState<Workout | null>(null);

  // Load workout data
  useEffect(() => {
    async function loadWorkout() {
      setIsLoading(true);
      const workout = await getWorkoutById(id);
      if (!workout) {
        router.push('/dashboard/workouts');
        return;
      }

      setOriginalWorkout(workout);
      setName(workout.name);
      setDescription(workout.description || '');
      setDate(workout.date || '');
      setIsTemplate(workout.is_template);
      setIsPublished(workout.is_published);

      // Transform blocks for local state
      const localBlocks: LocalBlock[] = (workout.blocks || []).map((block) => ({
        id: block.id,
        name: block.name || '',
        block_type: block.block_type,
        wod_type: block.wod_type || undefined,
        time_cap: block.time_cap || undefined,
        rounds: block.rounds || undefined,
        work_time: block.work_time || undefined,
        rest_time: block.rest_time || undefined,
        notes: block.notes || undefined,
        isExpanded: true,
        exercises: (block.exercises || []).map((ex) => ({
          id: ex.id,
          custom_name: ex.custom_name || ex.exercise?.name || '',
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
      }));

      setBlocks(localBlocks);
      setIsLoading(false);
    }

    loadWorkout();
  }, [id, router]);

  const addBlock = async (type: WorkoutBlockType) => {
    const tempId = `temp-${crypto.randomUUID()}`;
    const newBlock: LocalBlock = {
      id: tempId,
      isNew: true,
      name: blockTypeOptions.find((b) => b.value === type)?.label || '',
      block_type: type,
      wod_type: type === 'wod' ? 'for_time' : undefined,
      exercises: [],
      isExpanded: true,
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlockLocal = (blockId: string, updates: Partial<LocalBlock>) => {
    setBlocks(
      blocks.map((block) =>
        block.id === blockId ? { ...block, ...updates } : block
      )
    );
  };

  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter((block) => block.id !== blockId));
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex((b) => b.id === blockId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[swapIndex]] = [
      newBlocks[swapIndex],
      newBlocks[index],
    ];
    setBlocks(newBlocks);
  };

  const addExerciseToBlock = (blockId: string) => {
    const tempId = `temp-${crypto.randomUUID()}`;
    const newExercise: LocalBlockExercise = {
      id: tempId,
      isNew: true,
      custom_name: '',
      reps_unit: 'reps',
      weight_unit: 'kg',
      distance_unit: 'm',
    };

    setBlocks(
      blocks.map((block) =>
        block.id === blockId
          ? { ...block, exercises: [...block.exercises, newExercise] }
          : block
      )
    );
  };

  const updateExerciseLocal = (
    blockId: string,
    exerciseId: string,
    updates: Partial<LocalBlockExercise>
  ) => {
    setBlocks(
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              exercises: block.exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, ...updates } : ex
              ),
            }
          : block
      )
    );
  };

  const removeExercise = (blockId: string, exerciseId: string) => {
    setBlocks(
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              exercises: block.exercises.filter((ex) => ex.id !== exerciseId),
            }
          : block
      )
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Le nom est requis');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // 1. Update basic workout info
      const updateResult = await updateWorkout(id, {
        name,
        description: description || undefined,
        date: date || undefined,
        is_published: isPublished,
      });

      if (!updateResult.success) {
        setError(updateResult.error || 'Erreur lors de la mise a jour');
        setIsSaving(false);
        return;
      }

      // 2. Process blocks - find what to add, update, delete
      const currentBlockIds = new Set(blocks.filter((b) => !b.isNew).map((b) => b.id));

      // Delete removed blocks
      for (const originalBlock of originalWorkout?.blocks || []) {
        if (!currentBlockIds.has(originalBlock.id)) {
          await deleteWorkoutBlock(originalBlock.id);
        }
      }

      // Process each current block
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];

        if (block.isNew) {
          // Add new block
          const blockResult = await addWorkoutBlock(id, {
            name: block.name || undefined,
            block_type: block.block_type,
            wod_type: block.wod_type,
            time_cap: block.time_cap,
            rounds: block.rounds,
            work_time: block.work_time,
            rest_time: block.rest_time,
            notes: block.notes,
            position: i,
          });

          if ('id' in blockResult) {
            // Add exercises for new block
            for (const exercise of block.exercises) {
              await addBlockExercise(blockResult.id, {
                custom_name: exercise.custom_name || undefined,
                reps: exercise.reps,
                reps_unit: exercise.reps_unit,
                weight_male: exercise.weight_male,
                weight_female: exercise.weight_female,
                weight_unit: exercise.weight_unit,
                distance: exercise.distance,
                distance_unit: exercise.distance_unit,
                time_seconds: exercise.time_seconds,
                calories: exercise.calories,
                notes: exercise.notes,
              });
            }
          }
        } else {
          // Update existing block
          await updateWorkoutBlock(block.id, {
            name: block.name || null,
            block_type: block.block_type,
            wod_type: block.wod_type || null,
            time_cap: block.time_cap || null,
            rounds: block.rounds || null,
            work_time: block.work_time || null,
            rest_time: block.rest_time || null,
            notes: block.notes || null,
            position: i,
          });

          // Find original block for exercise comparison
          const origBlock = originalWorkout?.blocks?.find((b) => b.id === block.id);
          const currExerciseIds = new Set(
            block.exercises.filter((e) => !e.isNew).map((e) => e.id)
          );

          // Delete removed exercises
          for (const origExercise of origBlock?.exercises || []) {
            if (!currExerciseIds.has(origExercise.id)) {
              await deleteBlockExercise(origExercise.id);
            }
          }

          // Add new exercises
          for (const exercise of block.exercises) {
            if (exercise.isNew) {
              await addBlockExercise(block.id, {
                custom_name: exercise.custom_name || undefined,
                reps: exercise.reps,
                reps_unit: exercise.reps_unit,
                weight_male: exercise.weight_male,
                weight_female: exercise.weight_female,
                weight_unit: exercise.weight_unit,
                distance: exercise.distance,
                distance_unit: exercise.distance_unit,
                time_seconds: exercise.time_seconds,
                calories: exercise.calories,
                notes: exercise.notes,
              });
            }
          }
        }
      }

      router.push(`/dashboard/workouts/${id}`);
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/workouts/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modifier la seance</h1>
          <p className="text-muted-foreground">
            Modifiez les blocs et exercices de votre WOD
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la seance *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: WOD du jour, Murph, Fran..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description optionnelle..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="space-y-4 pt-6">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="template">Template</Label>
                    <Switch
                      id="template"
                      checked={isTemplate}
                      onCheckedChange={setIsTemplate}
                      disabled
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="published">Publier (visible membres)</Label>
                    <Switch
                      id="published"
                      checked={isPublished}
                      onCheckedChange={setIsPublished}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blocks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Blocs de la seance</h2>
              <div className="flex flex-wrap gap-2">
                {blockTypeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    size="sm"
                    onClick={() => addBlock(option.value)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {blocks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">
                    Ajoutez des blocs pour construire votre seance
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    index={index}
                    totalBlocks={blocks.length}
                    onUpdate={(updates) => updateBlockLocal(block.id, updates)}
                    onDelete={() => removeBlock(block.id)}
                    onMove={(dir) => moveBlock(block.id, dir)}
                    onAddExercise={() => addExerciseToBlock(block.id)}
                    onUpdateExercise={(exId, updates) =>
                      updateExerciseLocal(block.id, exId, updates)
                    }
                    onDeleteExercise={(exId) => removeExercise(block.id, exId)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>

              <Button variant="outline" className="w-full" asChild>
                <Link href={`/dashboard/workouts/${id}`}>Annuler</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resume</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Blocs:</span>{' '}
                {blocks.length}
              </p>
              <p>
                <span className="text-muted-foreground">Exercices:</span>{' '}
                {blocks.reduce((sum, b) => sum + b.exercises.length, 0)}
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span>{' '}
                {isPublished ? 'Publie' : 'Brouillon'}
              </p>
              {isTemplate && (
                <Badge variant="secondary" className="mt-2">
                  Template
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BlockEditor({
  block,
  index,
  totalBlocks,
  onUpdate,
  onDelete,
  onMove,
  onAddExercise,
  onUpdateExercise,
  onDeleteExercise,
}: {
  block: LocalBlock;
  index: number;
  totalBlocks: number;
  onUpdate: (updates: Partial<LocalBlock>) => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onAddExercise: () => void;
  onUpdateExercise: (exerciseId: string, updates: Partial<LocalBlockExercise>) => void;
  onDeleteExercise: (exerciseId: string) => void;
}) {
  const blockOption = blockTypeOptions.find((b) => b.value === block.block_type);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />

          <Badge className={blockOption?.color}>{blockOption?.label}</Badge>

          <Input
            value={block.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Nom du bloc"
            className="flex-1"
          />

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMove('up')}
              disabled={index === 0}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMove('down')}
              disabled={index === totalBlocks - 1}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onUpdate({ isExpanded: !block.isExpanded })}
            >
              {block.isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {block.isExpanded && (
        <CardContent className="space-y-4">
          {/* Block settings for WOD */}
          {block.block_type === 'wod' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Type de WOD</Label>
                <Select
                  value={block.wod_type || 'for_time'}
                  onValueChange={(v) => onUpdate({ wod_type: v as WodType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {wodTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(block.wod_type === 'amrap' || block.wod_type === 'for_time') && (
                <div className="space-y-2">
                  <Label>Time Cap (min)</Label>
                  <Input
                    type="number"
                    value={block.time_cap || ''}
                    onChange={(e) =>
                      onUpdate({ time_cap: parseInt(e.target.value) || undefined })
                    }
                    placeholder="Ex: 20"
                  />
                </div>
              )}

              {(block.wod_type === 'rounds' || block.wod_type === 'emom') && (
                <div className="space-y-2">
                  <Label>Rounds</Label>
                  <Input
                    type="number"
                    value={block.rounds || ''}
                    onChange={(e) =>
                      onUpdate({ rounds: parseInt(e.target.value) || undefined })
                    }
                    placeholder="Ex: 5"
                  />
                </div>
              )}

              {block.wod_type === 'emom' && (
                <div className="space-y-2">
                  <Label>Travail (sec)</Label>
                  <Input
                    type="number"
                    value={block.work_time || ''}
                    onChange={(e) =>
                      onUpdate({ work_time: parseInt(e.target.value) || undefined })
                    }
                    placeholder="60"
                  />
                </div>
              )}

              {block.wod_type === 'tabata' && (
                <>
                  <div className="space-y-2">
                    <Label>Travail (sec)</Label>
                    <Input
                      type="number"
                      value={block.work_time || 20}
                      onChange={(e) =>
                        onUpdate({ work_time: parseInt(e.target.value) || 20 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Repos (sec)</Label>
                    <Input
                      type="number"
                      value={block.rest_time || 10}
                      onChange={(e) =>
                        onUpdate({ rest_time: parseInt(e.target.value) || 10 })
                      }
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={block.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              placeholder="Instructions, scaling options..."
              rows={2}
            />
          </div>

          {/* Exercises */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Exercices</Label>
              <Button variant="outline" size="sm" onClick={onAddExercise}>
                <Plus className="mr-1 h-3 w-3" />
                Ajouter
              </Button>
            </div>

            {block.exercises.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucun exercice
              </p>
            ) : (
              <div className="space-y-2">
                {block.exercises.map((exercise) => (
                  <ExerciseRow
                    key={exercise.id}
                    exercise={exercise}
                    onUpdate={(updates) => onUpdateExercise(exercise.id, updates)}
                    onDelete={() => onDeleteExercise(exercise.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function ExerciseRow({
  exercise,
  onUpdate,
  onDelete,
}: {
  exercise: LocalBlockExercise;
  onUpdate: (updates: Partial<LocalBlockExercise>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border p-2">
      <Input
        value={exercise.custom_name}
        onChange={(e) => onUpdate({ custom_name: e.target.value })}
        placeholder="Nom de l'exercice"
        className="flex-1"
      />

      <Input
        type="number"
        value={exercise.reps || ''}
        onChange={(e) => onUpdate({ reps: parseInt(e.target.value) || undefined })}
        placeholder="Reps"
        className="w-20"
      />

      <Select
        value={exercise.reps_unit}
        onValueChange={(v) => onUpdate({ reps_unit: v })}
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="reps">reps</SelectItem>
          <SelectItem value="cal">cal</SelectItem>
          <SelectItem value="m">m</SelectItem>
          <SelectItem value="sec">sec</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="number"
        value={exercise.weight_male || ''}
        onChange={(e) =>
          onUpdate({ weight_male: parseFloat(e.target.value) || undefined })
        }
        placeholder="H"
        className="w-16"
        title="Poids homme"
      />

      <Input
        type="number"
        value={exercise.weight_female || ''}
        onChange={(e) =>
          onUpdate({ weight_female: parseFloat(e.target.value) || undefined })
        }
        placeholder="F"
        className="w-16"
        title="Poids femme"
      />

      <Select
        value={exercise.weight_unit}
        onValueChange={(v) => onUpdate({ weight_unit: v })}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="kg">kg</SelectItem>
          <SelectItem value="lb">lb</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="text-red-500 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
