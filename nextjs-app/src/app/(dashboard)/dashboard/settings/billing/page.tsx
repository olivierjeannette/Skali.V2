'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CreditCard,
  Building2,
  Check,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Zap,
  Crown,
  Rocket,
} from 'lucide-react';
import {
  createConnectAccount,
  getConnectDashboardLink,
  refreshConnectAccountStatus,
  createPlatformSubscriptionCheckout,
  getPlatformBillingPortal,
  getStripeStatus,
} from '@/actions/stripe';

type PlanName = 'starter' | 'pro' | 'enterprise';

const PLATFORM_PLANS: Record<PlanName, {
  name: string;
  price: number;
  features: string[];
  icon: React.ReactNode;
  recommended?: boolean;
}> = {
  starter: {
    name: 'Starter',
    price: 29,
    icon: <Zap className="h-6 w-6" />,
    features: [
      'Jusqu\'a 50 membres',
      '2 utilisateurs staff',
      '1 ecran TV',
      'Support email',
    ],
  },
  pro: {
    name: 'Pro',
    price: 79,
    icon: <Crown className="h-6 w-6" />,
    recommended: true,
    features: [
      'Jusqu\'a 200 membres',
      '5 utilisateurs staff',
      '3 ecrans TV',
      'API access',
      'Support prioritaire',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    icon: <Rocket className="h-6 w-6" />,
    features: [
      'Membres illimites',
      'Staff illimite',
      'Ecrans TV illimites',
      'API access',
      'Domaine personnalise',
      'Support dedie',
    ],
  },
};

function BillingContent() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [stripeStatus, setStripeStatus] = useState<{
    hasAccount: boolean;
    accountId: string | null;
    onboardingComplete: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    platformSubscription: string | null;
  } | null>(null);

  // Check for URL params (after Stripe redirect)
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccess('Configuration Stripe terminee avec succes!');
    }
    if (searchParams.get('platform_success') === 'true') {
      setSuccess('Abonnement platform active avec succes!');
    }
    if (searchParams.get('refresh') === 'true') {
      refreshStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Load Stripe status
  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getStripeStatus();
      if (result.success && result.data) {
        setStripeStatus(result.data);
      }
    } catch (err) {
      console.error('Error loading Stripe status:', err);
      setError('Erreur lors du chargement du statut');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Refresh Connect account status
  const refreshStatus = async () => {
    setIsActionLoading(true);
    try {
      await refreshConnectAccountStatus();
      await loadStatus();
      setSuccess('Statut mis a jour');
    } catch {
      setError('Erreur lors de la mise a jour');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Start Connect onboarding
  const handleStartOnboarding = async () => {
    setIsActionLoading(true);
    setError(null);
    try {
      const result = await createConnectAccount();
      if (result.success && result.data) {
        window.location.href = result.data.url;
      } else if (!result.success) {
        setError(result.error || 'Erreur lors de la creation du compte');
      }
    } catch {
      setError('Erreur lors de la configuration Stripe');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open Stripe dashboard
  const handleOpenDashboard = async () => {
    setIsActionLoading(true);
    try {
      const result = await getConnectDashboardLink();
      if (result.success && result.data) {
        window.open(result.data.url, '_blank');
      } else if (!result.success) {
        setError(result.error || 'Erreur lors de l\'acces au dashboard');
      }
    } catch {
      setError('Erreur lors de l\'acces au dashboard Stripe');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Subscribe to platform plan
  const handleSubscribePlatform = async (plan: PlanName) => {
    setIsActionLoading(true);
    setError(null);
    try {
      const result = await createPlatformSubscriptionCheckout(plan);
      if (result.success && result.data) {
        window.location.href = result.data.url;
      } else if (!result.success) {
        setError(result.error || 'Erreur lors de la creation de l\'abonnement');
      }
    } catch {
      setError('Erreur lors de l\'abonnement');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open billing portal
  const handleOpenBillingPortal = async () => {
    setIsActionLoading(true);
    try {
      const result = await getPlatformBillingPortal();
      if (result.success && result.data) {
        window.location.href = result.data.url;
      } else if (!result.success) {
        setError(result.error || 'Erreur lors de l\'acces au portail');
      }
    } catch {
      setError('Erreur lors de l\'acces au portail');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const platformStatus = stripeStatus?.platformSubscription;
  const isPlatformActive = platformStatus === 'active' || platformStatus === 'trialing';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Facturation</h1>
        <p className="text-muted-foreground">
          Gerez vos paiements et votre abonnement Skali Prog
        </p>
      </div>

      {/* Status alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Succes</AlertTitle>
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Stripe Connect Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Paiements adherents (Stripe Connect)
          </CardTitle>
          <CardDescription>
            Connectez votre compte Stripe pour recevoir les paiements de vos adherents directement sur votre compte bancaire
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status indicators */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={stripeStatus?.hasAccount ? 'default' : 'secondary'}>
              {stripeStatus?.hasAccount ? (
                <><Check className="mr-1 h-3 w-3" /> Compte connecte</>
              ) : (
                'Compte non connecte'
              )}
            </Badge>
            {stripeStatus?.hasAccount && (
              <>
                <Badge variant={stripeStatus.chargesEnabled ? 'default' : 'destructive'}>
                  {stripeStatus.chargesEnabled ? (
                    <><Check className="mr-1 h-3 w-3" /> Paiements actifs</>
                  ) : (
                    'Paiements desactives'
                  )}
                </Badge>
                <Badge variant={stripeStatus.payoutsEnabled ? 'default' : 'secondary'}>
                  {stripeStatus.payoutsEnabled ? (
                    <><Check className="mr-1 h-3 w-3" /> Virements actifs</>
                  ) : (
                    'Virements en attente'
                  )}
                </Badge>
              </>
            )}
          </div>

          {/* Onboarding alert */}
          {stripeStatus?.hasAccount && !stripeStatus.onboardingComplete && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Configuration incomplete</AlertTitle>
              <AlertDescription>
                Veuillez terminer la configuration de votre compte Stripe pour commencer a recevoir des paiements.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          {!stripeStatus?.hasAccount ? (
            <Button onClick={handleStartOnboarding} disabled={isActionLoading}>
              {isActionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Configurer Stripe Connect
            </Button>
          ) : !stripeStatus.onboardingComplete ? (
            <Button onClick={handleStartOnboarding} disabled={isActionLoading}>
              {isActionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Terminer la configuration
            </Button>
          ) : (
            <Button variant="outline" onClick={handleOpenDashboard} disabled={isActionLoading}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Ouvrir le dashboard Stripe
            </Button>
          )}
          {stripeStatus?.hasAccount && (
            <Button variant="ghost" onClick={refreshStatus} disabled={isActionLoading}>
              Actualiser le statut
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Platform Subscription Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Abonnement Skali Prog
          </CardTitle>
          <CardDescription>
            Votre abonnement a la plateforme Skali Prog
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPlatformActive ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-sm">
                  <Check className="mr-1 h-3 w-3" />
                  {platformStatus === 'trialing' ? 'Periode d\'essai' : 'Actif'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {platformStatus === 'trialing'
                  ? 'Vous etes actuellement en periode d\'essai gratuite de 14 jours.'
                  : 'Votre abonnement est actif.'}
              </p>
              <Button variant="outline" onClick={handleOpenBillingPortal} disabled={isActionLoading}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Gerer mon abonnement
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Choisissez le plan adapte a votre salle. Tous les plans incluent 14 jours d&apos;essai gratuit.
              </p>

              {/* Pricing cards */}
              <div className="grid gap-4 md:grid-cols-3">
                {(Object.entries(PLATFORM_PLANS) as [PlanName, typeof PLATFORM_PLANS[PlanName]][]).map(([key, plan]) => (
                  <Card
                    key={key}
                    className={`relative ${plan.recommended ? 'border-primary shadow-md' : ''}`}
                  >
                    {plan.recommended && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary">Recommande</Badge>
                      </div>
                    )}
                    <CardHeader className="text-center pb-2">
                      <div className="mx-auto mb-2 rounded-full bg-muted p-3 w-fit">
                        {plan.icon}
                      </div>
                      <CardTitle>{plan.name}</CardTitle>
                      <div className="text-3xl font-bold">
                        {plan.price}EUR
                        <span className="text-sm font-normal text-muted-foreground">/mois</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2 text-sm">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full"
                        variant={plan.recommended ? 'default' : 'outline'}
                        onClick={() => handleSubscribePlatform(key)}
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Commencer l&apos;essai
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                En plus de l&apos;abonnement, une commission de 2.5% est prelevee sur chaque paiement adherent.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Comment ca marche?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <span className="text-primary font-bold">1</span>
            </div>
            <div>
              <p className="font-medium text-foreground">Connectez votre compte Stripe</p>
              <p>Configuration securisee en quelques minutes</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <span className="text-primary font-bold">2</span>
            </div>
            <div>
              <p className="font-medium text-foreground">Vos adherents paient en ligne</p>
              <p>Checkout securise, carte bancaire, Apple Pay, Google Pay</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <span className="text-primary font-bold">3</span>
            </div>
            <div>
              <p className="font-medium text-foreground">Recevez vos fonds directement</p>
              <p>Virements automatiques sur votre compte bancaire (moins frais Stripe et commission Skali)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
