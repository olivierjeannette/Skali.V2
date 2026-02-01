'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getPlatformPlans,
  updatePlatformPlan,
} from '@/actions/platform';
import type { PlatformPlan, PlatformPlanTier } from '@/types/platform.types';
import {
  Edit,
  Check,
  X,
  Users,
  CreditCard,
  Zap,
  Crown,
  Rocket,
  Building2,
} from 'lucide-react';

const TIER_ICONS: Record<PlatformPlanTier, React.ReactNode> = {
  free_trial: <Zap className="h-6 w-6 text-blue-500" />,
  basic: <Building2 className="h-6 w-6 text-gray-500" />,
  pro: <Crown className="h-6 w-6 text-orange-500" />,
  enterprise: <Rocket className="h-6 w-6 text-purple-500" />,
};

const TIER_COLORS: Record<PlatformPlanTier, string> = {
  free_trial: 'bg-blue-100 text-blue-800',
  basic: 'bg-gray-100 text-gray-800',
  pro: 'bg-orange-100 text-orange-800',
  enterprise: 'bg-purple-100 text-purple-800',
};

export default function PlansPage() {
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    price_monthly: number;
    price_yearly: number | null;
    max_members: number | null;
    max_staff: number | null;
    platform_fee_percent: number;
  } | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    const data = await getPlatformPlans();
    setPlans(data);
    setLoading(false);
  };

  const handleStartEdit = (plan: PlatformPlan) => {
    setEditingPlan(plan.id);
    setEditForm({
      price_monthly: plan.price_monthly / 100, // Convert cents to euros
      price_yearly: plan.price_yearly ? plan.price_yearly / 100 : null,
      max_members: plan.max_members,
      max_staff: plan.max_staff,
      platform_fee_percent: plan.platform_fee_percent,
    });
  };

  const handleCancelEdit = () => {
    setEditingPlan(null);
    setEditForm(null);
  };

  const handleSaveEdit = async (planId: string) => {
    if (!editForm) return;

    startTransition(async () => {
      const result = await updatePlatformPlan(planId, {
        price_monthly: Math.round(editForm.price_monthly * 100), // Convert euros to cents
        price_yearly: editForm.price_yearly
          ? Math.round(editForm.price_yearly * 100)
          : null,
        max_members: editForm.max_members,
        max_staff: editForm.max_staff,
        platform_fee_percent: editForm.platform_fee_percent,
      });

      if (result.success) {
        setEditingPlan(null);
        setEditForm(null);
        loadPlans();
      }
    });
  };

  const handleToggleActive = async (plan: PlatformPlan) => {
    startTransition(async () => {
      await updatePlatformPlan(plan.id, {
        is_active: !plan.is_active,
      });
      loadPlans();
    });
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plans Platform</h1>
          <p className="text-gray-500">
            Gerez les plans d&apos;abonnement pour les organisations
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800">
                <strong>Stripe Billing:</strong> Les modifications de prix
                s&apos;appliquent aux nouveaux abonnements. Les abonnements
                existants conservent leur prix actuel jusqu&apos;au
                renouvellement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isEditing = editingPlan === plan.id;

          return (
            <Card
              key={plan.id}
              className={`relative ${
                !plan.is_active ? 'opacity-60' : ''
              } ${plan.tier === 'pro' ? 'ring-2 ring-orange-500' : ''}`}
            >
              {plan.tier === 'pro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-orange-500 text-white">Recommande</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-2">
                  {TIER_ICONS[plan.tier]}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <Badge className={TIER_COLORS[plan.tier]}>
                  {plan.tier}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Price */}
                <div className="text-center">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-500">
                          Prix mensuel (EUR)
                        </label>
                        <input
                          type="number"
                          value={editForm?.price_monthly || 0}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    price_monthly: parseFloat(e.target.value),
                                  }
                                : null
                            )
                          }
                          className="w-full px-2 py-1 text-center border rounded"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">
                          Prix annuel (EUR, optionnel)
                        </label>
                        <input
                          type="number"
                          value={editForm?.price_yearly || ''}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    price_yearly: e.target.value
                                      ? parseFloat(e.target.value)
                                      : null,
                                  }
                                : null
                            )
                          }
                          placeholder="Optionnel"
                          className="w-full px-2 py-1 text-center border rounded"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold">
                        {plan.price_monthly === 0
                          ? 'Gratuit'
                          : formatPrice(plan.price_monthly)}
                      </div>
                      {plan.price_monthly > 0 && (
                        <div className="text-sm text-gray-500">/mois</div>
                      )}
                      {plan.price_yearly && (
                        <div className="text-xs text-green-600">
                          ou {formatPrice(plan.price_yearly)}/an (-
                          {Math.round(
                            (1 -
                              plan.price_yearly / (plan.price_monthly * 12)) *
                              100
                          )}
                          %)
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Limits */}
                <div className="space-y-2 pt-2 border-t">
                  {isEditing ? (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" /> Max membres
                        </span>
                        <input
                          type="number"
                          value={editForm?.max_members || ''}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    max_members: e.target.value
                                      ? parseInt(e.target.value)
                                      : null,
                                  }
                                : null
                            )
                          }
                          placeholder="Illimite"
                          className="w-20 px-2 py-1 text-right border rounded text-sm"
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Max staff</span>
                        <input
                          type="number"
                          value={editForm?.max_staff || ''}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    max_staff: e.target.value
                                      ? parseInt(e.target.value)
                                      : null,
                                  }
                                : null
                            )
                          }
                          placeholder="Illimite"
                          className="w-20 px-2 py-1 text-right border rounded text-sm"
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Fee platform (%)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={editForm?.platform_fee_percent || 0}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    platform_fee_percent: parseFloat(
                                      e.target.value
                                    ),
                                  }
                                : null
                            )
                          }
                          className="w-20 px-2 py-1 text-right border rounded text-sm"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-gray-600">
                          <Users className="h-4 w-4" /> Membres
                        </span>
                        <span className="font-medium">
                          {plan.max_members || 'Illimite'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Staff</span>
                        <span className="font-medium">
                          {plan.max_staff || 'Illimite'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Fee platform</span>
                        <span className="font-medium">
                          {plan.platform_fee_percent}%
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Features */}
                {plan.features && (
                  <div className="space-y-1 pt-2 border-t">
                    <div className="text-xs font-medium text-gray-500 mb-2">
                      Fonctionnalites
                    </div>
                    {Object.entries(plan.features).map(([key, enabled]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="capitalize text-gray-600">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={
                            enabled ? 'text-green-600' : 'text-gray-400'
                          }
                        >
                          {enabled ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 border-t space-y-2">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={handleCancelEdit}
                        disabled={isPending}
                      >
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSaveEdit(plan.id)}
                        disabled={isPending}
                      >
                        {isPending ? 'Sauvegarde...' : 'Sauver'}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleStartEdit(plan)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </Button>
                      {plan.tier !== 'free_trial' && (
                        <Button
                          size="sm"
                          variant={plan.is_active ? 'destructive' : 'default'}
                          className="w-full"
                          onClick={() => handleToggleActive(plan)}
                          disabled={isPending}
                        >
                          {plan.is_active ? 'Desactiver' : 'Activer'}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {plans.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun plan configure
            </h3>
            <p className="text-gray-500 mb-4">
              Les plans platform seront disponibles apres l&apos;application de
              la migration SQL.
            </p>
            <p className="text-sm text-gray-400">
              Executez la migration{' '}
              <code className="bg-gray-100 px-1 rounded">
                00013_super_admin_platform.sql
              </code>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Help */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">Configuration des plans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-600">
          <div>
            <strong>Prix:</strong> Les prix sont en centimes dans la base de
            donnees (ex: 2900 = 29.00 EUR). L&apos;interface affiche et accepte
            les euros.
          </div>
          <div>
            <strong>Limites:</strong> Laissez vide pour &quot;illimite&quot;.
            Les limites sont verifiees lors de la creation de membres/staff.
          </div>
          <div>
            <strong>Fee platform:</strong> Pourcentage preleve sur chaque
            transaction Stripe Connect de l&apos;organisation.
          </div>
          <div>
            <strong>Fonctionnalites:</strong> Definies dans la migration SQL.
            Pour modifier, editez directement la base de donnees ou ajoutez une
            page d&apos;edition des features.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
