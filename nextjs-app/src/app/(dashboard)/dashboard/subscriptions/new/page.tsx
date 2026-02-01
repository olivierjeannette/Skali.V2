'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSubscription, getActivePlansForCurrentOrg } from '@/actions/subscriptions';
import { searchMembersForCurrentOrg } from '@/actions/members';
import { createCheckoutSession, createSubscriptionCheckout, getStripeStatus } from '@/actions/stripe';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, FileEdit, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import type { Plan, Member } from '@/types/database.types';

function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
}

export default function NewSubscriptionPage() {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const [memberSearch, setMemberSearch] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [pricePaid, setPricePaid] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');

  // Stripe status
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  // Load plans and Stripe status on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [plansData, stripeResult] = await Promise.all([
          getActivePlansForCurrentOrg(),
          getStripeStatus(),
        ]);
        setPlans(plansData);
        if (stripeResult.success && stripeResult.data) {
          setStripeEnabled(stripeResult.data.chargesEnabled);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoadingPlans(false);
      }
    }
    loadData();
  }, []);

  // Search members with debounce
  const searchForMembers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setMembers([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchMembersForCurrentOrg(query);
      setMembers(results);
    } catch (err) {
      console.error('Error searching members:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchForMembers(memberSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearch, searchForMembers]);

  // Calculate price with discount
  useEffect(() => {
    if (selectedPlan && discountPercent) {
      const discount = parseFloat(discountPercent) || 0;
      const discountedPrice = selectedPlan.price * (1 - discount / 100);
      setPricePaid(discountedPrice.toFixed(2));
    } else if (selectedPlan) {
      setPricePaid(selectedPlan.price.toString());
    }
  }, [selectedPlan, discountPercent]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    if (!selectedMember) {
      setError('Veuillez selectionner un membre');
      setIsSubmitting(false);
      return;
    }

    if (!selectedPlan) {
      setError('Veuillez selectionner un plan');
      setIsSubmitting(false);
      return;
    }

    formData.set('memberId', selectedMember.id);
    formData.set('planId', selectedPlan.id);
    if (pricePaid) formData.set('pricePaid', pricePaid);
    if (discountPercent) formData.set('discountPercent', discountPercent);

    const result = await createSubscription(formData);

    if (result.success) {
      router.push('/dashboard/subscriptions');
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  // Handle Stripe checkout
  async function handleStripeCheckout(isRecurring: boolean = false) {
    if (!selectedMember || !selectedPlan) {
      setError('Veuillez selectionner un membre et un plan');
      return;
    }

    setIsCreatingCheckout(true);
    setError(null);

    try {
      const result = isRecurring
        ? await createSubscriptionCheckout(selectedMember.id, selectedPlan.id)
        : await createCheckoutSession(selectedMember.id, selectedPlan.id);

      if (result.success && result.data) {
        window.location.href = result.data.url;
      } else if (!result.success) {
        setError(result.error || 'Erreur lors de la creation du paiement');
        setIsCreatingCheckout(false);
      }
    } catch {
      setError('Erreur lors de la creation du paiement');
      setIsCreatingCheckout(false);
    }
  }

  // Check if plan supports recurring payments
  const supportsRecurring = selectedPlan?.plan_type && ['monthly', 'quarterly', 'biannual', 'annual'].includes(selectedPlan.plan_type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nouvel abonnement</h1>
          <p className="text-muted-foreground">
            Assignez un abonnement a un membre
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/subscriptions">Annuler</Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Membre</CardTitle>
              <CardDescription>
                Selectionnez le membre pour cet abonnement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="memberSearch">Rechercher un membre</Label>
                <Input
                  id="memberSearch"
                  placeholder="Nom, prenom ou email..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
                {isSearching && (
                  <p className="text-sm text-muted-foreground">Recherche...</p>
                )}
              </div>

              {members.length > 0 && !selectedMember && (
                <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                  {members.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className="w-full px-4 py-2 text-left hover:bg-muted transition-colors"
                      onClick={() => {
                        setSelectedMember(member);
                        setMembers([]);
                        setMemberSearch('');
                      }}
                    >
                      <div className="font-medium">
                        {member.first_name} {member.last_name}
                      </div>
                      {member.email && (
                        <div className="text-sm text-muted-foreground">
                          {member.email}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {selectedMember && (
                <div className="rounded-lg border p-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {selectedMember.first_name} {selectedMember.last_name}
                      </div>
                      {selectedMember.email && (
                        <div className="text-sm text-muted-foreground">
                          {selectedMember.email}
                        </div>
                      )}
                      {selectedMember.phone && (
                        <div className="text-sm text-muted-foreground">
                          {selectedMember.phone}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMember(null)}
                    >
                      Changer
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plan</CardTitle>
              <CardDescription>
                Choisissez le plan d&apos;abonnement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingPlans ? (
                <div className="h-10 bg-muted animate-pulse rounded" />
              ) : plans.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-2">Aucun plan actif</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/subscriptions/plans/new">
                      Creer un plan
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan d&apos;abonnement</Label>
                  <Select
                    onValueChange={(value) => {
                      const plan = plans.find((p) => p.id === value);
                      setSelectedPlan(plan || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner un plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - {formatCurrency(plan.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedPlan && (
                <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                  <div className="font-medium">{selectedPlan.name}</div>
                  {selectedPlan.description && (
                    <div className="text-sm text-muted-foreground">
                      {selectedPlan.description}
                    </div>
                  )}
                  <div className="text-2xl font-bold">
                    {formatCurrency(selectedPlan.price)}
                  </div>
                  {selectedPlan.duration_days && (
                    <div className="text-sm">
                      Duree: {selectedPlan.duration_days} jours
                    </div>
                  )}
                  {selectedPlan.session_count && (
                    <div className="text-sm">
                      {selectedPlan.session_count} seances
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Methode de creation</CardTitle>
              <CardDescription>
                Choisissez comment creer cet abonnement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue={stripeEnabled ? 'online' : 'manual'} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="online" disabled={!stripeEnabled}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Paiement en ligne
                  </TabsTrigger>
                  <TabsTrigger value="manual">
                    <FileEdit className="mr-2 h-4 w-4" />
                    Saisie manuelle
                  </TabsTrigger>
                </TabsList>

                {/* Online Payment Tab */}
                <TabsContent value="online" className="space-y-4 pt-4">
                  {!stripeEnabled ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Les paiements en ligne ne sont pas configures.{' '}
                        <Link href="/dashboard/settings/billing" className="underline">
                          Configurer Stripe Connect
                        </Link>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Le membre recevra un lien de paiement securise. L&apos;abonnement sera active automatiquement apres le paiement.
                      </p>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                          type="button"
                          onClick={() => handleStripeCheckout(false)}
                          disabled={!selectedMember || !selectedPlan || isCreatingCheckout}
                          className="flex-1"
                        >
                          {isCreatingCheckout ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="mr-2 h-4 w-4" />
                          )}
                          Paiement unique
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>

                        {supportsRecurring && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleStripeCheckout(true)}
                            disabled={!selectedMember || !selectedPlan || isCreatingCheckout}
                            className="flex-1"
                          >
                            {isCreatingCheckout ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CreditCard className="mr-2 h-4 w-4" />
                            )}
                            Abonnement recurrent
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Frais de paiement: ~2.9% + 0.25EUR (Stripe) + 2.5% (Skali Prog)
                      </p>
                    </>
                  )}
                </TabsContent>

                {/* Manual Entry Tab */}
                <TabsContent value="manual" className="space-y-4 pt-4">

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Date de debut *</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={today}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discountPercent">Reduction (%)</Label>
                  <Input
                    id="discountPercent"
                    name="discountPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePaid">Prix final (EUR)</Label>
                  <Input
                    id="pricePaid"
                    name="pricePaid"
                    type="number"
                    step="0.01"
                    min="0"
                    value={pricePaid}
                    onChange={(e) => setPricePaid(e.target.value)}
                    placeholder={selectedPlan ? selectedPlan.price.toString() : '0.00'}
                  />
                </div>
              </div>

              {discountPercent && parseFloat(discountPercent) > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="discountReason">Raison de la reduction</Label>
                  <Input
                    id="discountReason"
                    name="discountReason"
                    placeholder="Ex: Offre de bienvenue, parrainage..."
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Notes supplementaires..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/subscriptions">Annuler</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting || !selectedMember || !selectedPlan}>
                  {isSubmitting ? 'Creation...' : 'Creer l\'abonnement'}
                </Button>
              </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
