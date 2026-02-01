'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPlanWithStripe, getStripeStatus } from '@/actions/stripe';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, CreditCard, Loader2 } from 'lucide-react';

export default function NewPlanPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planType, setPlanType] = useState('monthly');
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkStripe() {
      const result = await getStripeStatus();
      if (result.success && result.data) {
        setStripeConfigured(result.data.chargesEnabled);
      } else {
        setStripeConfigured(false);
      }
    }
    checkStripe();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const result = await createPlanWithStripe({
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      planType: formData.get('planType') as string,
      price: parseFloat(formData.get('price') as string),
      durationDays: formData.get('durationDays') ? parseInt(formData.get('durationDays') as string) : undefined,
      sessionCount: formData.get('sessionCount') ? parseInt(formData.get('sessionCount') as string) : undefined,
      maxClassesPerWeek: formData.get('maxClassesPerWeek') ? parseInt(formData.get('maxClassesPerWeek') as string) : undefined,
      maxBookingsPerDay: formData.get('maxBookingsPerDay') ? parseInt(formData.get('maxBookingsPerDay') as string) : undefined,
      isActive: formData.get('isActive') === 'on',
    });

    if (result.success) {
      router.push('/dashboard/subscriptions/plans');
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  const showDurationField = ['monthly', 'quarterly', 'biannual', 'annual'].includes(planType);
  const showSessionField = planType === 'session_card';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nouveau plan</h1>
          <p className="text-muted-foreground">
            Creez un nouveau plan d&apos;abonnement
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/subscriptions/plans">Annuler</Link>
        </Button>
      </div>

      {stripeConfigured !== null && (
        <Card className={stripeConfigured ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}>
          <CardContent className="flex items-center gap-3 py-4">
            {stripeConfigured ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Stripe Connect configure</p>
                  <p className="text-sm text-green-700">Le plan sera automatiquement synchronise avec Stripe</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Stripe Connect non configure</p>
                  <p className="text-sm text-amber-700">Le plan sera cree sans synchronisation Stripe. Vous pourrez le synchroniser plus tard.</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informations du plan</CardTitle>
            <CardDescription>
              Definissez les details de votre plan d&apos;abonnement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du plan *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: Abonnement mensuel"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="planType">Type de plan *</Label>
                <Select
                  name="planType"
                  value={planType}
                  onValueChange={setPlanType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionnez un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="quarterly">Trimestriel</SelectItem>
                    <SelectItem value="biannual">Semestriel</SelectItem>
                    <SelectItem value="annual">Annuel</SelectItem>
                    <SelectItem value="session_card">Carte de seances</SelectItem>
                    <SelectItem value="unlimited">Illimite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Decrivez les avantages de ce plan..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Prix (EUR) *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                />
              </div>

              {showDurationField && (
                <div className="space-y-2">
                  <Label htmlFor="durationDays">Duree (jours)</Label>
                  <Input
                    id="durationDays"
                    name="durationDays"
                    type="number"
                    min="1"
                    placeholder={
                      planType === 'monthly' ? '30' :
                      planType === 'quarterly' ? '90' :
                      planType === 'biannual' ? '180' :
                      planType === 'annual' ? '365' : ''
                    }
                    defaultValue={
                      planType === 'monthly' ? '30' :
                      planType === 'quarterly' ? '90' :
                      planType === 'biannual' ? '180' :
                      planType === 'annual' ? '365' : ''
                    }
                  />
                </div>
              )}

              {showSessionField && (
                <div className="space-y-2">
                  <Label htmlFor="sessionCount">Nombre de seances</Label>
                  <Input
                    id="sessionCount"
                    name="sessionCount"
                    type="number"
                    min="1"
                    placeholder="10"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxClassesPerWeek">Cours max par semaine</Label>
                <Input
                  id="maxClassesPerWeek"
                  name="maxClassesPerWeek"
                  type="number"
                  min="1"
                  placeholder="Illimite"
                />
                <p className="text-xs text-muted-foreground">
                  Laissez vide pour illimite
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxBookingsPerDay">Reservations max par jour</Label>
                <Input
                  id="maxBookingsPerDay"
                  name="maxBookingsPerDay"
                  type="number"
                  min="1"
                  placeholder="Illimite"
                />
                <p className="text-xs text-muted-foreground">
                  Laissez vide pour illimite
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Plan actif</Label>
                <p className="text-sm text-muted-foreground">
                  Le plan sera visible et disponible pour les membres
                </p>
              </div>
              <Switch id="isActive" name="isActive" defaultChecked />
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/subscriptions/plans">Annuler</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creation...
                  </>
                ) : (
                  <>
                    {stripeConfigured && <CreditCard className="mr-2 h-4 w-4" />}
                    Creer le plan
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
