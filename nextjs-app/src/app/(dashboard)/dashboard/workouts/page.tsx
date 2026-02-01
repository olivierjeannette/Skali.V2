'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Calendar,
  Dumbbell,
  Clock,
  MoreHorizontal,
  Copy,
  Trash2,
  Eye,
  Edit,
  FileText,
} from 'lucide-react';
import { getWorkouts, deleteWorkout, duplicateWorkout, type Workout } from '@/actions/workouts';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

// Block type labels - kept for future use
// const blockTypeLabels: Record<string, string> = {
//   warmup: 'Warm-up', skill: 'Skill', strength: 'Force',
//   wod: 'WOD', cooldown: 'Cool-down', accessory: 'Accessoire', custom: 'Custom',
// };

// WOD type labels - kept for future use
// const wodTypeLabels: Record<string, string> = {
//   amrap: 'AMRAP', emom: 'EMOM', for_time: 'For Time', tabata: 'Tabata',
//   rounds: 'Rounds', max_reps: 'Max Reps', max_weight: 'Max Weight',
//   chipper: 'Chipper', ladder: 'Ladder', custom: 'Custom',
// };

// TODO: Replace with actual org ID from auth context
const DEMO_ORG_ID = 'demo-org-id';

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'templates'>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const loadWorkouts = useCallback(async () => {
    setIsLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      const data = await getWorkouts(DEMO_ORG_ID, {
        startDate: viewMode === 'all' ? startDate : undefined,
        endDate: viewMode === 'all' ? endDate : undefined,
        isTemplate: viewMode === 'templates' ? true : undefined,
      });

      setWorkouts(data);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, viewMode]);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  const handleDelete = async (workoutId: string) => {
    if (!confirm('Supprimer cette seance ?')) return;

    const result = await deleteWorkout(workoutId);
    if (result.success) {
      loadWorkouts();
    }
  };

  const handleDuplicate = async (workoutId: string) => {
    const result = await duplicateWorkout(workoutId);
    if ('id' in result) {
      loadWorkouts();
    }
  };

  const filteredWorkouts = workouts.filter((workout) => {
    if (searchQuery) {
      return workout.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Group by date for calendar view
  const workoutsByDate = filteredWorkouts.reduce((acc, workout) => {
    if (workout.date) {
      if (!acc[workout.date]) {
        acc[workout.date] = [];
      }
      acc[workout.date].push(workout);
    }
    return acc;
  }, {} as Record<string, Workout[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Seances</h1>
          <p className="text-muted-foreground">
            Creez et gerez vos WODs et seances d&apos;entrainement
          </p>
        </div>
        <Link href="/dashboard/workouts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle seance
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une seance..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'all' | 'templates')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les seances</SelectItem>
            <SelectItem value="templates">Templates</SelectItem>
          </SelectContent>
        </Select>

        {viewMode === 'all' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              &lt;
            </Button>
            <span className="w-32 text-center font-medium">
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              &gt;
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workouts.length}</div>
            <p className="text-xs text-muted-foreground">
              {viewMode === 'templates' ? 'templates' : 'seances ce mois'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publiees</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workouts.filter((w) => w.is_published).length}
            </div>
            <p className="text-xs text-muted-foreground">visibles par les membres</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workouts.filter((w) => w.is_template).length}
            </div>
            <p className="text-xs text-muted-foreground">reutilisables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aujourd&apos;hui</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workouts.filter((w) => w.date === format(new Date(), 'yyyy-MM-dd')).length}
            </div>
            <p className="text-xs text-muted-foreground">seances programmees</p>
          </CardContent>
        </Card>
      </div>

      {/* Workouts List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredWorkouts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Dumbbell className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucune seance</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery
                ? 'Aucune seance ne correspond a votre recherche'
                : 'Commencez par creer votre premiere seance'}
            </p>
            {!searchQuery && (
              <Link href="/dashboard/workouts/new" className="mt-4">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Creer une seance
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'templates' ? (
        // Templates list view
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredWorkouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      ) : (
        // Calendar-style view grouped by date
        <div className="space-y-6">
          {Object.entries(workoutsByDate)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, dateWorkouts]) => (
              <div key={date}>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                  {format(new Date(date), 'EEEE d MMMM', { locale: fr })}
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {dateWorkouts.map((workout) => (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                    />
                  ))}
                </div>
              </div>
            ))}

          {/* Workouts without date */}
          {filteredWorkouts.filter((w) => !w.date).length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                Non programmees
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredWorkouts
                  .filter((w) => !w.date)
                  .map((workout) => (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WorkoutCard({
  workout,
  onDelete,
  onDuplicate,
}: {
  workout: Workout;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">
              <Link
                href={`/dashboard/workouts/${workout.id}`}
                className="hover:underline"
              >
                {workout.name}
              </Link>
            </CardTitle>
            {workout.date && (
              <CardDescription className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(workout.date), 'd MMM yyyy', { locale: fr })}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/workouts/${workout.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Voir
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/workouts/${workout.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(workout.id)}>
                <Copy className="mr-2 h-4 w-4" />
                Dupliquer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(workout.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {workout.description && (
          <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
            {workout.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {workout.is_template && (
            <Badge variant="secondary">
              <FileText className="mr-1 h-3 w-3" />
              Template
            </Badge>
          )}
          {workout.is_published ? (
            <Badge variant="default" className="bg-green-500">
              <Eye className="mr-1 h-3 w-3" />
              Publie
            </Badge>
          ) : (
            <Badge variant="outline">
              <Clock className="mr-1 h-3 w-3" />
              Brouillon
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
