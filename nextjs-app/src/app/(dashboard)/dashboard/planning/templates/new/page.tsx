'use client';

import { useState, useTransition } from 'react';
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
import { createClassTemplate } from '@/actions/planning';

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

export default function NewTemplatePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [requiresSubscription, setRequiresSubscription] = useState(true);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.set('requiresSubscription', requiresSubscription.toString());

    startTransition(async () => {
      const result = await createClassTemplate(formData);
      if (result.success) {
        router.push('/dashboard/planning/templates');
      } else {
        setError(result.error);
      }
    });
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Nouveau modele</h1>
          <p className="text-muted-foreground">
            Creez un modele pour vos cours
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informations du modele</CardTitle>
          <CardDescription>
            Definissez les parametres par defaut pour ce type de cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
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
                  name="name"
                  placeholder="Ex: CrossFit WOD"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Description du cours..."
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="classType">Type de cours *</Label>
                <Select name="classType" defaultValue="group" disabled={isPending}>
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
                  name="durationMinutes"
                  type="number"
                  min="15"
                  max="480"
                  defaultValue="60"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Capacite maximale</Label>
                <Input
                  id="maxParticipants"
                  name="maxParticipants"
                  type="number"
                  min="1"
                  placeholder="Laisser vide pour illimite"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Couleur</Label>
                <Select name="color" defaultValue="#3b82f6" disabled={isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner une couleur" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
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
                  name="sessionCost"
                  type="number"
                  min="0"
                  defaultValue="1"
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
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creation...' : 'Creer le modele'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/planning/templates">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
