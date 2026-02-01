'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClass, getClassTemplatesForCurrentOrg } from '@/actions/planning';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import type { ClassTemplate } from '@/types/database.types';

const CLASS_TYPES = [
  { value: 'group', label: 'Cours collectif' },
  { value: 'private', label: 'Cours prive' },
  { value: 'open_gym', label: 'Open Gym' },
  { value: 'event', label: 'Evenement' },
  { value: 'workshop', label: 'Workshop' },
];

const COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export default function NewClassPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [, setIsLoadingTemplates] = useState(true);

  const [selectedTemplate, setSelectedTemplate] = useState<ClassTemplate | null>(null);
  const [classType, setClassType] = useState('group');
  const [color, setColor] = useState('#3b82f6');
  const [requiresSubscription, setRequiresSubscription] = useState(true);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const data = await getClassTemplatesForCurrentOrg();
        setTemplates(data);
      } catch (err) {
        console.error('Error loading templates:', err);
      } finally {
        setIsLoadingTemplates(false);
      }
    }
    loadTemplates();
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'none') {
      setSelectedTemplate(null);
      return;
    }
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setClassType(template.class_type);
      setColor(template.color);
      setRequiresSubscription(template.requires_subscription);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set('classType', classType);
    formData.set('color', color);
    formData.set('requiresSubscription', requiresSubscription.toString());
    if (selectedTemplate) {
      formData.set('templateId', selectedTemplate.id);
    }

    const result = await createClass(formData);

    if (result.success) {
      router.push('/dashboard/planning');
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  // Date/heure par defaut (prochaine heure ronde)
  const now = new Date();
  now.setMinutes(0);
  now.setHours(now.getHours() + 1);
  const defaultDateTime = now.toISOString().slice(0, 16);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nouveau cours</h1>
          <p className="text-muted-foreground">
            Creez un nouveau cours dans le planning
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/planning">Annuler</Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
              <CardDescription>
                Details du cours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {templates.length > 0 && (
                <div className="space-y-2">
                  <Label>Utiliser un modele</Label>
                  <Select onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un modele (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun modele</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nom du cours *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: WOD du jour"
                  defaultValue={selectedTemplate?.name || ''}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="classType">Type de cours</Label>
                <Select value={classType} onValueChange={setClassType}>
                  <SelectTrigger>
                    <SelectValue />
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
                <Label>Couleur</Label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        color === c
                          ? 'border-foreground scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Description du cours..."
                  rows={3}
                  defaultValue={selectedTemplate?.description || ''}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Horaires et capacite</CardTitle>
              <CardDescription>
                Quand et combien de participants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Date et heure *</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="datetime-local"
                  defaultValue={defaultDateTime}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duree (minutes) *</Label>
                <Input
                  id="durationMinutes"
                  name="durationMinutes"
                  type="number"
                  min="15"
                  max="480"
                  step="15"
                  defaultValue={selectedTemplate?.duration_minutes || 60}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Capacite max</Label>
                <Input
                  id="maxParticipants"
                  name="maxParticipants"
                  type="number"
                  min="1"
                  placeholder="Illimite"
                  defaultValue={selectedTemplate?.max_participants || ''}
                />
                <p className="text-xs text-muted-foreground">
                  Laissez vide pour illimite
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Lieu</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="Ex: Salle principale"
                  defaultValue={selectedTemplate?.default_location || ''}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Options</CardTitle>
              <CardDescription>
                Configuration avancee
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Abonnement requis</Label>
                  <p className="text-sm text-muted-foreground">
                    Les membres doivent avoir un abonnement actif
                  </p>
                </div>
                <Switch
                  checked={requiresSubscription}
                  onCheckedChange={setRequiresSubscription}
                />
              </div>

              {!requiresSubscription && (
                <div className="space-y-2">
                  <Label htmlFor="dropInPrice">Prix drop-in (EUR)</Label>
                  <Input
                    id="dropInPrice"
                    name="dropInPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Prix pour les membres sans abonnement
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/planning">Annuler</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creation...' : 'Creer le cours'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
