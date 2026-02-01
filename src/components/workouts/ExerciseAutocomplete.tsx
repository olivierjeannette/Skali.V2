'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getExercises, type Exercise, type ExerciseCategory } from '@/actions/workouts';
import { Search, Loader2 } from 'lucide-react';

interface ExerciseAutocompleteProps {
  value: string;
  onChange: (value: string, exercise?: Exercise) => void;
  orgId: string;
  placeholder?: string;
  className?: string;
}

const categoryLabels: Record<ExerciseCategory, string> = {
  weightlifting: 'Halterophilie',
  gymnastics: 'Gymnastique',
  cardio: 'Cardio',
  strongman: 'Strongman',
  core: 'Core',
  mobility: 'Mobilite',
  other: 'Autre',
};

const categoryColors: Record<ExerciseCategory, string> = {
  weightlifting: 'bg-red-100 text-red-700',
  gymnastics: 'bg-blue-100 text-blue-700',
  cardio: 'bg-green-100 text-green-700',
  strongman: 'bg-purple-100 text-purple-700',
  core: 'bg-orange-100 text-orange-700',
  mobility: 'bg-cyan-100 text-cyan-700',
  other: 'bg-gray-100 text-gray-700',
};

export function ExerciseAutocomplete({
  value,
  onChange,
  orgId,
  placeholder = "Nom de l'exercice",
  className = '',
}: ExerciseAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load all exercises on mount
  useEffect(() => {
    async function loadExercises() {
      setIsLoading(true);
      const data = await getExercises(orgId, { includeGlobal: true });
      setExercises(data);
      setIsLoading(false);
    }
    loadExercises();
  }, [orgId]);

  // Filter exercises based on input
  useEffect(() => {
    if (!value.trim()) {
      setFilteredExercises([]);
      return;
    }

    const searchTerm = value.toLowerCase();
    const filtered = exercises
      .filter(
        (ex) =>
          ex.name.toLowerCase().includes(searchTerm) ||
          (ex.name_en && ex.name_en.toLowerCase().includes(searchTerm))
      )
      .slice(0, 10);

    setFilteredExercises(filtered);
    setHighlightedIndex(-1);
  }, [value, exercises]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleSelectExercise = (exercise: Exercise) => {
    onChange(exercise.name, exercise);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredExercises.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredExercises.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredExercises.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelectExercise(filteredExercises[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const showDropdown = isOpen && value.trim().length > 0 && filteredExercises.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-8"
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul className="max-h-60 overflow-auto py-1">
            {filteredExercises.map((exercise, index) => (
              <li
                key={exercise.id}
                onClick={() => handleSelectExercise(exercise)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer ${
                  index === highlightedIndex ? 'bg-accent' : ''
                }`}
              >
                <div>
                  <div className="font-medium">{exercise.name}</div>
                  {exercise.name_en && exercise.name_en !== exercise.name && (
                    <div className="text-xs text-muted-foreground">
                      {exercise.name_en}
                    </div>
                  )}
                </div>
                <Badge className={categoryColors[exercise.category]} variant="secondary">
                  {categoryLabels[exercise.category]}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOpen && value.trim().length > 1 && filteredExercises.length === 0 && !isLoading && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 shadow-md text-center text-sm text-muted-foreground">
          Aucun exercice trouve. Le nom sera utilise tel quel.
        </div>
      )}
    </div>
  );
}
