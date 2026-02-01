'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPlanWithStripeStatus, updatePlanWithStripe, syncPlanToStripe, type PlanWithStripe } from '@/actions/stripe';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';

function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
}

function getPlanTypeLabel(planType: string) {
  switch (planType) {
    case 'monthly':
      return 'Mensuel';
    case 'quarterly':
      return 'Trimestriel';
    case 'biannual':
      return 'Semestriel';
    case 'annual':
      return 'Annuel';
    case 'session_card':
      return 'Carte seances';
    case 'unlimited':
      return 'Illimite';
    default:
      return planType;
  }
}

interface StripeStatus {
  hasProduct: boolean;
  hasPrice: boolean;
  priceType: string | null;
  canSync: boolean;
}

export default function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: planId } = use(params);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanWithStripe | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [sessionCount, setSessionCount] = useState('');
  const [maxClassesPerWeek, setMaxClassesPerWeek] = useState('');
  const [maxBookingsPerDay, setMaxBookingsPerDay] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    async function loadPlan() {
      const result = await getPlanWithStripeStatus(planId);
      if (result.success && result.data) {
        const { plan, stripeStatus } = result.data;
        setPlan(plan);
        setStripeStatus(stripeStatus);
        setName(plan.name);
        setDescription(plan.description || '');
        setPrice(plan.price.toString());
        setDurationDays(plan.duration_days?.toString() || '');
        setSessionCount(plan.session_count?.toString() || '');
        setMaxClassesPerWeek(plan.max_classes_per_week?.toString() || '');
        setMaxBookingsPerDay(plan.max_bookings_per_day?.toString() || '');
        setIsActive(plan.is_active);
      } else if (!result.success) {
        setError(result.error);
      }
      setIsLoading(false);
    }
    loadPlan();
  }, [planId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const result = await updatePlanWithStripe(planId, {
      name,
      description,
      price: parseFloat(price),
      isActive,
      durationDays: durationDays ? parseInt(durationDays) : undefined,
      sessionCount: sessionCount ? parseInt(sessionCount) : undefined,
      maxClassesPerWeek: maxClassesPerWeek ? parseInt(maxClassesPerWeek) : undefined,
      maxBookingsPerDay: maxBookingsPerDay ? parseInt(maxBookingsPerDay) : undefined,
    });

    if (result.success) {
      setSuccess('Plan mis a jour avec succes');
      // Refresh data
      const refreshResult = await getPlanWithStripeStatus(planId);
      if (refreshResult.success && refreshResult.data) {
        setPlan(refreshResult.data.plan);
        setStripeStatus(refreshResult.data.stripeStatus);
      }
    } else {
      setError(result.error);
    }
    setIsSubmitting(false);
  }

  async function handleSyncStripe() {
    setIsSyncing(true);
    setError(null);
    setSuccess(null);

    const result = await syncPlanToStripe(planId);

    if (result.success) {
      setSuccess('Plan synchronise avec Stripe');
      // Refresh data
      const refreshResult = await getPlanWithStripeStatus(planId);
      if (refreshResult.success && refreshResult.data) {
        setPlan(refreshResult.data.plan);
        setStripeStatus(refreshResult.data.stripeStatus);
      }
    } else {
      setError(result.error);
    }
    setIsSyncing(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Plan introuvable'}</AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/dashboard/subscriptions/plans">Retour aux plans</Link>
        </Button>
      </div>
    );
  }

  const showDurationField = ['monthly', 'quarterly', 'biannual', 'annual'].includes(plan.plan_type);
  const showSessionField = plan.plan_type === 'session_card';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modifier le plan</h1>
          <p className="text-muted-foreground">
            {plan.name} - {getPlanTypeLabel(plan.plan_type)}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/subscriptions/plans">Retour</Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Informations du plan</CardTitle>
                <CardDescription>
                  Modifiez les details de votre plan d&apos;abonnement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du plan *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Abonnement mensuel"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Type de plan</Label>
                    <div className="flex h-10 items-center">
                      <Badge variant="secondary">{getPlanTypeLabel(plan.plan_type)}</Badge>
                      <span className="ml-2 text-sm text-muted-foreground">
                        (non modifiable)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Decrivez les avantages de ce plan..."
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix (EUR) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                    {plan.stripe_price_id && parseFloat(price) !== plan.price && (
                      <p className="text-xs text-amber-600">
                        Un nouveau prix Stripe sera cree
                      </p>
                    )}
                  </div>

                  {showDurationField && (
                    <div className="space-y-2">
                      <Label htmlFor="durationDays">Duree (jours)</Label>
                      <Input
                        id="durationDays"
                        type="number"
                        min="1"
                        value={durationDays}
                        onChange={(e) => setDurationDays(e.target.value)}
                        placeholder="30"
                      />
                    </div>
                  )}

                  {showSessionField && (
                    <div className="space-y-2">
                      <Label htmlFor="sessionCount">Nombre de seances</Label>
                      <Input
                        id="sessionCount"
                        type="number"
                        min="1"
                        value={sessionCount}
                        onChange={(e) => setSessionCount(e.target.value)}
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
                      type="number"
                      min="1"
                      value={maxClassesPerWeek}
                      onChange={(e) => setMaxClassesPerWeek(e.target.value)}
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
                      type="number"
                      min="1"
                      value={maxBookingsPerDay}
                      onChange={(e) => setMaxBookingsPerDay(e.target.value)}
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
                  <Switch
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/dashboard/subscriptions/plans">Annuler</Link>
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      'Enregistrer les modifications'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Synchronisation Stripe
              </CardTitle>
              <CardDescription>
                Statut de la synchronisation avec Stripe Connect
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stripeStatus?.canSync ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Produit Stripe</span>
                      {stripeStatus.hasProduct ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Synchronise
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Non cree</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Prix Stripe</span>
                      {stripeStatus.hasPrice ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {stripeStatus.priceType === 'recurring' ? 'Recurrent' : 'Unique'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Non cree</Badge>
                      )}
                    </div>
                  </div>

                  {plan.stripe_product_id && (
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-xs text-muted-foreground">
                        Product ID: {plan.stripe_product_id.substring(0, 20)}...
                      </p>
                      {plan.stripe_price_id && (
                        <p className="text-xs text-muted-foreground">
                          Price ID: {plan.stripe_price_id.substring(0, 20)}...
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={handleSyncStripe}
                    disabled={isSyncing}
                    className="w-full"
                    variant={stripeStatus.hasProduct ? 'outline' : 'default'}
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Synchronisation...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {stripeStatus.hasProduct ? 'Resynchroniser' : 'Synchroniser avec Stripe'}
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Configurez Stripe Connect dans les parametres de facturation pour activer les paiements en ligne.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix actuel</span>
                <span className="font-medium">{formatCurrency(plan.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span>{getPlanTypeLabel(plan.plan_type)}</span>
              </div>
              {plan.duration_days && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duree</span>
                  <span>{plan.duration_days} jours</span>
                </div>
              )}
              {plan.session_count && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seances</span>
                  <span>{plan.session_count}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
