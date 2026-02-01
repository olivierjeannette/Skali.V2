/* eslint-disable @next/next/no-img-element */
import { getPlatformStats, getAllOrganizations, getAuditLogs } from '@/actions/platform';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  formatPlanPrice,
  getSubscriptionStatusColor,
  getSubscriptionStatusLabel,
  getDaysUntilTrialEnds,
} from '@/types/platform.types';

export default async function AdminDashboard() {
  const [stats, { organizations }, { logs }] = await Promise.all([
    getPlatformStats(),
    getAllOrganizations({ limit: 5 }),
    getAuditLogs({ limit: 10 }),
  ]);

  const mrr = formatPlanPrice(stats.mrr_cents || 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Dashboard Super Admin
        </h1>
        <p className="text-gray-500 mt-1">
          Vue globale de la plateforme Skali Prog
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Organisations</CardDescription>
            <CardTitle className="text-4xl">{stats.total_orgs}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500">
              <span className="text-green-600 font-medium">
                {stats.active_subscriptions}
              </span>{' '}
              actives,{' '}
              <span className="text-yellow-600 font-medium">{stats.trials}</span>{' '}
              en essai
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Membres</CardDescription>
            <CardTitle className="text-4xl">{stats.total_members}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500">
              <span className="font-medium">{stats.global_members}</span> comptes
              globaux
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>MRR</CardDescription>
            <CardTitle className="text-4xl">{mrr}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500">
              Revenus mensuels recurrents
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ARR</CardDescription>
            <CardTitle className="text-4xl">
              {formatPlanPrice((stats.mrr_cents || 0) * 12)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500">
              Revenus annuels projetes
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Organizations */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Organisations recentes</CardTitle>
              <CardDescription>
                Dernieres salles inscrites sur la plateforme
              </CardDescription>
            </div>
            <Link
              href="/admin/organizations"
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              Voir tout
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {organizations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Aucune organisation pour le moment
                </p>
              ) : (
                organizations.map((org) => {
                  const daysLeft = getDaysUntilTrialEnds(org.trial_ends_at);
                  const statusColor = getSubscriptionStatusColor(
                    org.platform_subscription_status
                  );

                  return (
                    <Link
                      key={org.id}
                      href={`/admin/organizations/${org.id}`}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-4">
                        {org.logo_url ? (
                          <img
                            src={org.logo_url}
                            alt={org.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-gray-600 font-semibold">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {org.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {org.owner_email || 'Pas de proprietaire'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {org.member_count} membres
                          </div>
                          <div className="text-xs text-gray-500">
                            {org.plan_name || 'Pas de plan'}
                          </div>
                        </div>
                        <Badge
                          variant={statusColor === 'green' ? 'default' : 'secondary'}
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
                          {getSubscriptionStatusLabel(
                            org.platform_subscription_status
                          )}
                          {daysLeft !== null && daysLeft <= 7 && (
                            <span className="ml-1">({daysLeft}j)</span>
                          )}
                        </Badge>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Audit Logs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Activite recente</CardTitle>
              <CardDescription>Journal d&apos;audit</CardDescription>
            </div>
            <Link
              href="/admin/audit"
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              Voir tout
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Pas d&apos;activite recente
                </p>
              ) : (
                logs.slice(0, 8).map((log) => (
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
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {log.description || log.event_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/admin/organizations/new"
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              + Nouvelle organisation
            </Link>
            <Link
              href="/admin/plans"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Gerer les plans
            </Link>
            <Link
              href="/admin/members"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Membres globaux
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
