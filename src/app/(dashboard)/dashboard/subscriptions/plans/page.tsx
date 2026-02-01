import { Suspense } from 'react';
import Link from 'next/link';
import { requireOrganization } from '@/lib/auth';
import { getPlans } from '@/actions/subscriptions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

async function PlansTable({ orgId }: { orgId: string }) {
  const plans = await getPlans(orgId);

  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 rounded-full bg-muted p-4">
            <svg
              className="h-8 w-8 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">Aucun plan</h3>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Creez votre premier plan d&apos;abonnement
          </p>
          <Button asChild>
            <Link href="/dashboard/subscriptions/plans/new">Creer un plan</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plans d&apos;abonnement</CardTitle>
        <CardDescription>
          {plans.length} plan{plans.length > 1 ? 's' : ''} configure{plans.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Duree</TableHead>
              <TableHead>Seances</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{plan.name}</div>
                    {plan.description && (
                      <div className="text-sm text-muted-foreground">
                        {plan.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getPlanTypeLabel(plan.plan_type)}</TableCell>
                <TableCell>{formatCurrency(plan.price, plan.currency)}</TableCell>
                <TableCell>
                  {plan.duration_days ? `${plan.duration_days} jours` : '-'}
                </TableCell>
                <TableCell>
                  {plan.session_count ? `${plan.session_count} seances` : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                    {plan.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/subscriptions/plans/${plan.id}/edit`}>
                        Modifier
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
                <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function PlansPage() {
  const org = await requireOrganization();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plans d&apos;abonnement</h1>
          <p className="text-muted-foreground">
            Configurez les plans proposes a vos membres
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/subscriptions">Retour</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/subscriptions/plans/new">Nouveau plan</Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <PlansTable orgId={org.id} />
      </Suspense>
    </div>
  );
}
