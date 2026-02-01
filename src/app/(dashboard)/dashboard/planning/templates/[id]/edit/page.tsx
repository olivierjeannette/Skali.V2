'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getClassTemplate, updateClassTemplate } from '@/actions/planning';
import type { ClassTemplate } from '@/types/database.types';

interface PageProps {
  params: Promise<{ id: string }>;
}

const CLASS_TYPES = [
  { value: 'group', label: 'Cours collectif' },
  { value: 'private', label: 'Cours prive' },
  { value: 'open_gym', label: 'Open Gym' },
  { value: 'event', label: 'Evenement' },
  { value: 'workshop', label: 'Atelier' },
];

const COLORS = [
  { value: '#3b82f6', label: 'Bleu' },
  { value: '#22c55e', label: 'Vert' },
  { value: '#ef4444', label: 'Rouge' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Rose' },
  { value: '#14b8a6', label: 'Turquoise' },
  { value: '#64748b', label: 'Gris' },
];

export default function EditTemplatePage({ params }: PageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<ClassTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [templateId, setTemplateId] = useState<string>('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [classType, setClassType] = useState('group');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [sessionCost, setSessionCost] = useState('1');
  const [requiresSubscription, setRequiresSubscription] = useState(true);

  useEffect(() => {
    async function loadTemplate() {
      const resolvedParams = await params;
      setTemplateId(resolvedParams.id);

      const data = await getClassTemplate(resolvedParams.id);
      if (data) {
        setTemplate(data);
        setName(data.name);
        setDescription(data.description || '');
        setClassType(data.class_type);
        setDurationMinutes(data.duration_minutes.toString());
        setMaxParticipants(data.max_participants?.toString() || '');
        setColor(data.color || '#3b82f6');
        setSessionCost(data.session_cost?.toString() || '1');
        setRequiresSubscription(data.requires_subscription ?? true);
      }
      setLoading(false);
    }
    loadTemplate();
  }, [params]);

  const handleSubmit = () => {
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set('id', templateId);
      formData.set('name', name);
      formData.set('description', description);
      formData.set('classType', classType);
      formData.set('durationMinutes', durationMinutes);
      if (maxParticipants) formData.set('maxParticipants', maxParticipants);
      formData.set('color', color);
      formData.set('sessionCost', sessionCost);
      formData.set('requiresSubscription', requiresSubscription.toString());

      const result = await updateClassTemplate(formData);
      if (result.success) {
        router.push('/dashboard/planning/templates');
      } else {
        setError(result.error);
      }
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded w-1/3" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-2">Modele introuvable</h1>
        <Button asChild>
          <Link href="/dashboard/planning/templates">Retour aux modeles</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/planning/templates">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modifier le modele</h1>
          <p className="text-muted-foreground">
            {template.name}
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informations du modele</CardTitle>
          <CardDescription>
            Modifiez les parametres de ce modele de cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Nom du modele *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: CrossFit WOD"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description du cours..."
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="classType">Type de cours *</Label>
                <Select
                  value={classType}
                  onValueChange={setClassType}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASS_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duree (minutes) *</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min="15"
                  max="480"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Capacite maximale</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min="1"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  placeholder="Laisser vide pour illimite"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Couleur</Label>
                <Select
                  value={color}
                  onValueChange={setColor}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner une couleur" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: c.value }}
                          />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionCost">Cout en seances</Label>
                <Input
                  id="sessionCost"
                  type="number"
                  min="0"
                  value={sessionCost}
                  onChange={(e) => setSessionCost(e.target.value)}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Nombre de seances deduites de l&apos;abonnement
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
                <div className="space-y-0.5">
                  <Label htmlFor="requiresSubscription">Abonnement requis</Label>
                  <p className="text-sm text-muted-foreground">
                    Les membres doivent avoir un abonnement actif
                  </p>
                </div>
                <Switch
                  id="requiresSubscription"
                  checked={requiresSubscription}
                  onCheckedChange={setRequiresSubscription}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/planning/templates">Annuler</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
