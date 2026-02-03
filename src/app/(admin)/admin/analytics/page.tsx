import { getPlatformAnalytics } from '@/actions/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Building2,
  Users,
  UserCircle,
  Calendar,
  BookOpen,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from 'lucide-react';

export default async function AnalyticsPage() {
  const analytics = await getPlatformAnalytics();

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const orgGrowth = calculateGrowth(
    analytics.growth.orgs_this_month,
    analytics.growth.orgs_last_month
  );
  const memberGrowth = calculateGrowth(
    analytics.growth.members_this_month,
    analytics.growth.members_last_month
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500">Vue d&apos;ensemble de la plateforme</p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Organisations
            </CardTitle>
            <Building2 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.total_organizations}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {orgGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span
                className={orgGrowth >= 0 ? 'text-green-600' : 'text-red-600'}
              >
                {orgGrowth >= 0 ? '+' : ''}
                {orgGrowth}% ce mois
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Membres
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_members}</div>
            <div className="flex items-center gap-1 text-xs">
              {memberGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span
                className={memberGrowth >= 0 ? 'text-green-600' : 'text-red-600'}
              >
                {memberGrowth >= 0 ? '+' : ''}
                {memberGrowth}% ce mois
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Utilisateurs
            </CardTitle>
            <UserCircle className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_users}</div>
            <p className="text-xs text-gray-500">Comptes actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Cours
            </CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_classes}</div>
            <p className="text-xs text-gray-500">Cours crees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Reservations
            </CardTitle>
            <BookOpen className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_bookings}</div>
            <p className="text-xs text-gray-500">Inscriptions</p>
          </CardContent>
        </Card>
      </div>

      {/* Growth & Revenue Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Croissance mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Nouvelles organisations
                  </p>
                  <p className="text-xl font-bold">
                    {analytics.growth.orgs_this_month}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Mois precedent</p>
                  <p className="text-xl font-bold text-gray-400">
                    {analytics.growth.orgs_last_month}
                  </p>
                </div>
              </div>

              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (analytics.growth.orgs_this_month /
                        Math.max(analytics.growth.orgs_last_month, 1)) *
                        100
                    )}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500">Nouveaux membres</p>
                  <p className="text-xl font-bold">
                    {analytics.growth.members_this_month}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Mois precedent</p>
                  <p className="text-xl font-bold text-gray-400">
                    {analytics.growth.members_last_month}
                  </p>
                </div>
              </div>

              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (analytics.growth.members_this_month /
                        Math.max(analytics.growth.members_last_month, 1)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Organizations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Top organisations</CardTitle>
            <Link
              href="/admin/organizations"
              className="text-sm text-orange-500 hover:underline flex items-center"
            >
              Voir tout <ArrowUpRight className="h-3 w-3 ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.top_organizations.length > 0 ? (
                analytics.top_organizations.slice(0, 5).map((org, index) => (
                  <Link
                    key={org.id}
                    href={`/admin/organizations/${org.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium">{org.name}</span>
                    </div>
                    <Badge variant="outline">
                      {org.member_count} membres
                    </Badge>
                  </Link>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Aucune organisation
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/admin/organizations/new"
              className="p-4 border rounded-lg hover:bg-gray-50 transition text-center"
            >
              <Building2 className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <p className="font-medium">Nouvelle organisation</p>
              <p className="text-sm text-gray-500">
                Creer une salle manuellement
              </p>
            </Link>

            <Link
              href="/admin/users"
              className="p-4 border rounded-lg hover:bg-gray-50 transition text-center"
            >
              <UserCircle className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="font-medium">Gerer utilisateurs</p>
              <p className="text-sm text-gray-500">
                Voir tous les utilisateurs
              </p>
            </Link>

            <Link
              href="/admin/audit"
              className="p-4 border rounded-lg hover:bg-gray-50 transition text-center"
            >
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="font-medium">Logs d&apos;audit</p>
              <p className="text-sm text-gray-500">
                Historique des actions
              </p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
