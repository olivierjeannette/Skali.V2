import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSubscription, getPayments } from '@/actions/subscriptions';
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
import { SubscriptionActions } from './actions';

function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
}

function formatDate(dateString: string | null) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
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

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'paid':
      return 'Paye';
    case 'failed':
      return 'Echoue';
    case 'refunded':
      return 'Rembourse';
    case 'cancelled':
      return 'Annule';
    default:
      return status;
  }
}

function getPaymentStatusVariant(status: string) {
  switch (status) {
    case 'paid':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'failed':
    case 'cancelled':
      return 'destructive';
    case 'refunded':
      return 'outline';
    default:
      return 'outline';
  }
}

export default async function SubscriptionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const subscription = await getSubscription(params.id);

  if (!subscription) {
    notFound();
  }

  const payments = await getPayments(subscription.org_id, {
    subscriptionId: subscription.id,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Abonnement
          </h1>
          <p className="text-muted-foreground">
            {subscription.member
              ? `${subscription.member.first_name} ${subscription.member.last_name}`
              : 'Membre inconnu'}
            {subscription.plan && ` - ${subscription.plan.name}`}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/subscriptions">Retour</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
            <CardDescription>Details de l&apos;abonnement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Statut</span>
              <Badge variant={getStatusBadgeVariant(subscription.status)}>
                {getStatusLabel(subscription.status)}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{subscription.plan?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date de debut</span>
              <span>{formatDate(subscription.start_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date de fin</span>
              <span>{formatDate(subscription.end_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prix paye</span>
              <span className="font-medium">
                {formatCurrency(subscription.price_paid || 0)}
              </span>
            </div>
            {subscription.discount_percent && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reduction</span>
                <span>{subscription.discount_percent}%</span>
              </div>
            )}
            {subscription.discount_reason && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Raison reduction</span>
                <span>{subscription.discount_reason}</span>
              </div>
            )}
            {subscription.sessions_total && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seances totales</span>
                  <span>{subscription.sessions_total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seances utilisees</span>
                  <span>{subscription.sessions_used}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seances restantes</span>
                  <span className="font-medium">
                    {subscription.sessions_total - subscription.sessions_used}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Renouvellement auto</span>
              <span>{subscription.auto_renew ? 'Oui' : 'Non'}</span>
            </div>
            {subscription.notes && (
              <div className="pt-4 border-t">
                <span className="text-muted-foreground block mb-2">Notes</span>
                <p className="text-sm">{subscription.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membre</CardTitle>
            <CardDescription>Informations du membre</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription.member ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nom</span>
                  <Link
                    href={`/dashboard/members/${subscription.member.id}`}
                    className="font-medium hover:underline"
                  >
                    {subscription.member.first_name} {subscription.member.last_name}
                  </Link>
                </div>
                {subscription.member.email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span>{subscription.member.email}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Membre introuvable</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Gerer cet abonnement</CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionActions
              subscriptionId={subscription.id}
              status={subscription.status}
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Paiements</CardTitle>
            <CardDescription>
              Historique des paiements pour cet abonnement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Aucun paiement enregistre
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Methode</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {formatDate(payment.paid_at || payment.created_at)}
                      </TableCell>
                      <TableCell>{payment.description || '-'}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="capitalize">
                        {payment.payment_method}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPaymentStatusVariant(payment.status)}>
                          {getPaymentStatusLabel(payment.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
