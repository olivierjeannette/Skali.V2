'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CalendarPlus, Loader2, Info } from 'lucide-react';
import {
  getClassTemplatesForCurrentOrg,
  generateRecurringClasses,
  type RecurrencePattern,
} from '@/actions/planning';
import type { ClassTemplate } from '@/types/database.types';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dimanche' },
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];

const RECURRENCE_PATTERNS: { value: RecurrencePattern; label: string; description: string }[] = [
  { value: 'daily', label: 'Quotidien', description: 'Tous les jours' },
  { value: 'weekly', label: 'Hebdomadaire', description: 'Chaque semaine aux jours selectionnes' },
  { value: 'biweekly', label: 'Bi-hebdomadaire', description: 'Une semaine sur deux' },
  { value: 'monthly', label: 'Mensuel', description: 'Le meme jour chaque mois' },
];

export default function RecurringClassesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [templateId, setTemplateId] = useState('');
  const [pattern, setPattern] = useState<RecurrencePattern>('weekly');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [location, setLocation] = useState('');

  // Preview
  const [previewCount, setPreviewCount] = useState(0);

  useEffect(() => {
    async function loadTemplates() {
      const data = await getClassTemplatesForCurrentOrg();
      setTemplates(data);
      if (data.length > 0) {
        setTemplateId(data[0].id);
      }
      setIsLoading(false);
    }
    loadTemplates();

    // Set default dates
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(nextMonth.toISOString().split('T')[0]);
  }, []);

  // Calculate preview when form changes
  useEffect(() => {
    if (!startDate || !endDate) {
      setPreviewCount(0);
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    const current = new Date(start);

    while (current <= end && count < 200) {
      const dayOfWeek = current.getDay();
      let shouldCount = false;

      switch (pattern) {
        case 'daily':
          shouldCount = true;
          break;
        case 'weekly':
        case 'biweekly':
          if (daysOfWeek.includes(dayOfWeek)) {
            shouldCount = true;
          }
          break;
        case 'monthly':
          if (current.getDate() === start.getDate()) {
            shouldCount = true;
          }
          break;
      }

      if (shouldCount) count++;

      if (pattern === 'biweekly') {
        current.setDate(current.getDate() + 14);
      } else if (pattern === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      } else {
        current.setDate(current.getDate() + 1);
      }
    }

    setPreviewCount(count);
  }, [pattern, daysOfWeek, startDate, endDate]);

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async () => {
    if (!templateId) {
      setError('Selectionnez un modele de cours');
      return;
    }

    if (!startDate || !endDate) {
      setError('Les dates de debut et fin sont requises');
      return;
    }

    if ((pattern === 'weekly' || pattern === 'biweekly') && daysOfWeek.length === 0) {
      setError('Selectionnez au moins un jour de la semaine');
      return;
    }

    setIsGenerating(true);
    setError('');
    setSuccess('');

    try {
      const result = await generateRecurringClasses(
        templateId,
        {
          pattern,
          daysOfWeek: pattern === 'weekly' || pattern === 'biweekly' ? daysOfWeek : undefined,
          startDate,
          endDate,
          time,
        },
        {
          location: location || undefined,
        }
      );

      if (result.success && result.data) {
        setSuccess(`${result.data.count} cours generes avec succes!`);
        setTimeout(() => {
          router.push('/dashboard/planning');
        }, 1500);
      } else if (!result.success) {
        setError(result.error || 'Erreur lors de la generation');
      }
    } catch {
      setError('Erreur lors de la generation');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedTemplate = templates.find((t) => t.id === templateId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/planning">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cours recurrents</h1>
          <p className="text-muted-foreground">
            Generez plusieurs cours automatiquement selon un calendrier
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-600">{success}</div>
      )}

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Info className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Aucun modele de cours</h3>
            <p className="text-muted-foreground mt-2 text-center">
              Creez d&apos;abord un modele de cours pour generer des cours recurrents
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/planning/templates/new">Creer un modele</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="space-y-6 lg:col-span-2">
            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Modele de cours</CardTitle>
                <CardDescription>
                  Selectionnez le modele a utiliser pour les cours generes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un modele" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: template.color || '#3b82f6' }}
                          />
                          {template.name} ({template.duration_minutes} min)
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedTemplate && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline">{selectedTemplate.class_type}</Badge>
                    <Badge variant="outline">{selectedTemplate.duration_minutes} min</Badge>
                    {selectedTemplate.max_participants && (
                      <Badge variant="outline">
                        Max {selectedTemplate.max_participants} personnes
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recurrence Pattern */}
            <Card>
              <CardHeader>
                <CardTitle>Recurrence</CardTitle>
                <CardDescription>
                  Definissez la frequence de repetition des cours
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Type de recurrence</Label>
                  <Select
                    value={pattern}
                    onValueChange={(v) => setPattern(v as RecurrencePattern)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_PATTERNS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <div>
                            <div>{p.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {p.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(pattern === 'weekly' || pattern === 'biweekly') && (
                  <div className="space-y-2">
                    <Label>Jours de la semaine</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`day-${day.value}`}
                            checked={daysOfWeek.includes(day.value)}
                            onCheckedChange={() => toggleDay(day.value)}
                          />
                          <label
                            htmlFor={`day-${day.value}`}
                            className="text-sm cursor-pointer"
                          >
                            {day.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card>
              <CardHeader>
                <CardTitle>Periode et horaire</CardTitle>
                <CardDescription>
                  Definissez la periode et l&apos;heure des cours
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Date de debut</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Date de fin</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="time">Heure du cours</Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Lieu (optionnel)</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Ex: Salle principale"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Preview & Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Apercu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold">{previewCount}</div>
                  <div className="text-sm text-muted-foreground">
                    cours a generer
                  </div>
                </div>

                {previewCount > 100 && (
                  <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
                    Maximum 100 cours par generation. Reduisez la periode ou la frequence.
                  </div>
                )}

                {selectedTemplate && (
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Modele:</span>
                      <span>{selectedTemplate.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duree:</span>
                      <span>{selectedTemplate.duration_minutes} min</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Horaire:</span>
                      <span>{time}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recurrence:</span>
                      <span>
                        {RECURRENCE_PATTERNS.find((p) => p.value === pattern)?.label}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleSubmit}
                  disabled={isGenerating || previewCount === 0 || previewCount > 100}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generation...
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      Generer {previewCount} cours
                    </>
                  )}
                </Button>

                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/planning">Annuler</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
