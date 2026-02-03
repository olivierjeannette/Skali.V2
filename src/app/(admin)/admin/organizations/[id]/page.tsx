/* eslint-disable @next/next/no-img-element */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getOrganizationById,
  checkOrgLimits,
  getAuditLogs,
} from '@/actions/platform';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getSubscriptionStatusColor,
  getSubscriptionStatusLabel,
  getDaysUntilTrialEnds,
  formatPlanPrice,
} from '@/types/platform.types';
import { OrganizationActions } from './org-actions';

export default async function OrganizationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [org, limits, { logs }] = await Promise.all([
    getOrganizationById(params.id),
    checkOrgLimits(params.id),
    getAuditLogs({ org_id: params.id, limit: 10 }),
  ]);

  if (!org) {
    notFound();
  }

  const daysLeft = getDaysUntilTrialEnds(org.trial_ends_at);
  const statusColor = getSubscriptionStatusColor(org.platform_subscription_status);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admin/organizations"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Retour aux organisations
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {org.logo_url ? (
            <img
              src={org.logo_url}
              alt={org.name}
              className="w-16 h-16 rounded-xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center text-2xl font-bold text-gray-600">
              {org.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
            <p className="text-gray-500">/{org.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className={
              statusColor === 'green'
                ? 'bg-green-100 text-green-800'
                : statusColor === 'yellow'
                ? 'bg-yellow-100 text-yellow-800'
                : statusColor === 'red'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }
          >
            {getSubscriptionStatusLabel(org.platform_subscription_status)}
          </Badge>
          {!org.is_active && (
            <Badge variant="destructive">Suspendu</Badge>
          )}
        </div>
      </div>

      {/* Trial Warning */}
      {org.platform_subscription_status === 'trialing' && daysLeft !== null && (
        <div
          className={`p-4 rounded-lg border ${
            daysLeft <= 3
              ? 'bg-red-50 border-red-200'
              : daysLeft <= 7
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <p
            className={`font-medium ${
              daysLeft <= 3
                ? 'text-red-700'
                : daysLeft <= 7
                ? 'text-yellow-700'
                : 'text-blue-700'
            }`}
          >
            Periode d&apos;essai : {daysLeft} jour{daysLeft > 1 ? 's' : ''} restant
            {daysLeft > 1 ? 's' : ''}
          </p>
          <p
            className={`text-sm mt-1 ${
              daysLeft <= 3
                ? 'text-red-600'
                : daysLeft <= 7
                ? 'text-yellow-600'
                : 'text-blue-600'
            }`}
          >
            Fin le{' '}
            {new Date(org.trial_ends_at!).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Informations</CardTitle>
            <Link
              href={`/admin/organizations/${params.id}/staff`}
              className="text-sm text-orange-500 hover:text-orange-600"
            >
              Gerer le staff →
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Proprietaire</p>
                <p className="font-medium">
                  {org.owner?.full_name || org.billing_email || 'Non assigne'}
                </p>
                {org.owner?.email && (
                  <p className="text-sm text-gray-500">{org.owner.email}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Plan</p>
                <p className="font-medium">{org.plan?.name || 'Aucun'}</p>
                {org.plan && (
                  <p className="text-sm text-gray-500">
                    {formatPlanPrice(org.plan.price_monthly)}/mois
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Pays</p>
                <p className="font-medium">{org.country_code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fuseau horaire</p>
                <p className="font-medium">{org.timezone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Cree le</p>
                <p className="font-medium">
                  {new Date(org.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Stripe Account</p>
                <p className="font-medium text-sm">
                  {org.stripe_account_id || 'Non configure'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limits Card */}
        <Card>
          <CardHeader>
            <CardTitle>Limites du plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {limits ? (
              <>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Membres</span>
                    <span>
                      {limits.current_members} /{' '}
                      {limits.max_members || '∞'}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        limits.within_member_limit
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }`}
                      style={{
                        width: limits.max_members
                          ? `${Math.min(
                              (limits.current_members / limits.max_members) *
                                100,
                              100
                            )}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Staff</span>
                    <span>
                      {limits.current_staff} / {limits.max_staff || '∞'}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        limits.within_staff_limit
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }`}
                      style={{
                        width: limits.max_staff
                          ? `${Math.min(
                              (limits.current_staff / limits.max_staff) * 100,
                              100
                            )}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm">
                Impossible de charger les limites
              </p>
            )}
          </CardContent>
        </Card>

        {/* Features Card */}
        <Card>
          <CardHeader>
            <CardTitle>Fonctionnalites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {org.plan &&
                Object.entries(org.plan.features).map(([key, enabled]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={
                        enabled ? 'text-green-600' : 'text-gray-400'
                      }
                    >
                      {enabled ? '✓' : '✗'}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizationActions org={org} />
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Activite recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-sm">Pas d&apos;activite</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 pb-3 border-b last:border-0"
                  >
                    <div
                      className={`w-2 h-2 mt-2 rounded-full ${
                        log.event_type.includes('created')
                          ? 'bg-green-500'
                          : log.event_type.includes('deleted') ||
                            log.event_type.includes('suspended')
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        {log.description ||
                          log.event_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {log.actor_email && ` par ${log.actor_email}`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
