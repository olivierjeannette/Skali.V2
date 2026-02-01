import { Suspense } from 'react';
import Link from 'next/link';
import { requireOrganization } from '@/lib/auth';
import { getSubscriptions, getSubscriptionStats, getActivePlans } from '@/actions/subscriptions';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
}

function formatDate(dateString: string | null) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR');
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active':
      return 'default';
    case 'paused':
      return 'secondary';
    case 'expired':
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'active':
      return 'Actif';
    case 'paused':
      return 'En pause';
    case 'expired':
      return 'Expire';
    case 'cancelled':
      return 'Annule';
    default:
      return status;
  }
}

async function SubscriptionStats({ orgId }: { orgId: string }) {
  const stats = await getSubscriptionStats(orgId);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Abonnements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalSubscriptions}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Actifs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenus Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paiements en attente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.pendingPayments)}</div>
        </CardContent>
      </Card>
    </div>
  );
}

async function SubscriptionsTable({ orgId }: { orgId: string }) {
  const subscriptions = await getSubscriptions(orgId);

  if (subscriptions.length === 0) {
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
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">Aucun abonnement</h3>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Commencez par creer des plans d&apos;abonnement
          </p>
          <Button asChild>
            <Link href="/dashboard/subscriptions/plans">Gerer les plans</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abonnements</CardTitle>
        <CardDescription>
          {subscriptions.length} abonnement{subscriptions.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membre</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Debut</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((sub) => {
              return (
                <TableRow key={sub.id}>
                  <TableCell>
                    {sub.member ? (
                      <Link
                        href={`/dashboard/members/${sub.member.id}`}
                        className="font-medium hover:underline"
                      >
                        {sub.member.first_name} {sub.member.last_name}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{sub.plan?.name || '-'}</TableCell>
                  <TableCell>{formatDate(sub.start_date)}</TableCell>
                  <TableCell>{formatDate(sub.end_date)}</TableCell>
                  <TableCell>{formatCurrency(sub.price_paid || 0)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(sub.status)}>
                      {getStatusLabel(sub.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/subscriptions/${sub.id}`}>Voir</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

async function PlansPreview({ orgId }: { orgId: string }) {
  const plans = await getActivePlans(orgId);

  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <h3 className="mb-2 text-lg font-semibold">Aucun plan actif</h3>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Creez vos plans d&apos;abonnement pour commencer
          </p>
          <Button asChild>
            <Link href="/dashboard/subscriptions/plans/new">Creer un plan</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.slice(0, 3).map((plan) => (
        <Card key={plan.id}>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(plan.price)}
              <span className="text-sm font-normal text-muted-foreground">
                /{plan.plan_type === 'monthly' ? 'mois' : plan.plan_type === 'annual' ? 'an' : ''}
              </span>
            </div>
            {plan.duration_days && (
              <p className="mt-2 text-sm text-muted-foreground">
                Duree: {plan.duration_days} jours
              </p>
            )}
            {plan.session_count && (
              <p className="mt-2 text-sm text-muted-foreground">
                {plan.session_count} seances
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
            <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function SubscriptionsPage() {
  const org = await requireOrganization();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Abonnements</h1>
          <p className="text-muted-foreground">
            Gerez les abonnements de vos membres
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/subscriptions/plans">Gerer les plans</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/subscriptions/new">Nouvel abonnement</Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<div className="h-24 animate-pulse bg-muted rounded-lg" />}>
        <SubscriptionStats orgId={org.id} />
      </Suspense>

      <Tabs defaultValue="subscriptions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subscriptions">Abonnements</TabsTrigger>
          <TabsTrigger value="plans">Apercu des plans</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          <Suspense fallback={<TableSkeleton />}>
            <SubscriptionsTable orgId={org.id} />
          </Suspense>
        </TabsContent>

        <TabsContent value="plans">
          <Suspense fallback={<div className="h-48 animate-pulse bg-muted rounded-lg" />}>
            <PlansPreview orgId={org.id} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
