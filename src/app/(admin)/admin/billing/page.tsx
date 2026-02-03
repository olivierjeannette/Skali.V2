import { getBillingOverview, getAllSubscriptions } from '@/actions/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Building2,
  Calendar,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  trialing: { label: 'Essai', color: 'bg-blue-500' },
  active: { label: 'Actif', color: 'bg-green-500' },
  past_due: { label: 'En retard', color: 'bg-orange-500' },
  canceled: { label: 'Annule', color: 'bg-red-500' },
  unknown: { label: 'Inconnu', color: 'bg-gray-500' },
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string; page?: string };
}) {
  const page = parseInt(searchParams.page || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  const [overview, { subscriptions, total }] = await Promise.all([
    getBillingOverview(),
    getAllSubscriptions({
      search: searchParams.search,
      status: searchParams.status,
      limit,
      offset,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facturation</h1>
        <p className="text-gray-500">Vue d&apos;ensemble des abonnements</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              MRR
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.mrr.toLocaleString('fr-FR')} €
            </div>
            <p className="text-xs text-gray-500">Revenu mensuel recurrent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              ARR
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.arr.toLocaleString('fr-FR')} €
            </div>
            <p className="text-xs text-gray-500">Revenu annuel projete</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Abonnements actifs
            </CardTitle>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.active_subscriptions}
            </div>
            <p className="text-xs text-gray-500">
              + {overview.trial_subscriptions} en essai
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              En retard
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {overview.past_due_subscriptions}
            </div>
            <p className="text-xs text-gray-500">Paiements en attente</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <form className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                name="search"
                placeholder="Rechercher par organisation..."
                defaultValue={searchParams.search}
              />
            </div>
            <select
              name="status"
              defaultValue={searchParams.status || ''}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Tous les statuts</option>
              <option value="trialing">En essai</option>
              <option value="active">Actif</option>
              <option value="past_due">En retard</option>
              <option value="canceled">Annule</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Filtrer
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Organisation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Prix
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fin essai / Periode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date creation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subscriptions.map((sub) => {
                  const status = statusConfig[sub.status] || statusConfig.unknown;
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/organizations/${sub.org_id}`}
                          className="flex items-center gap-3 hover:text-orange-600"
                        >
                          <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-gray-500" />
                          </div>
                          <span className="font-medium">{sub.org_name}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline">{sub.plan_name}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium">
                          {sub.price_monthly > 0
                            ? `${sub.price_monthly} €/mois`
                            : 'Gratuit'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={`${status.color} text-white`}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sub.trial_ends_at ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {new Date(sub.trial_ends_at).toLocaleDateString(
                              'fr-FR'
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(sub.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  );
                })}

                {subscriptions.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      Aucun abonnement trouve
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`?page=${page - 1}${
                  searchParams.search ? `&search=${searchParams.search}` : ''
                }${searchParams.status ? `&status=${searchParams.status}` : ''}`}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Precedent
              </a>
            )}
            {page < totalPages && (
              <a
                href={`?page=${page + 1}${
                  searchParams.search ? `&search=${searchParams.search}` : ''
                }${searchParams.status ? `&status=${searchParams.status}` : ''}`}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Suivant
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
