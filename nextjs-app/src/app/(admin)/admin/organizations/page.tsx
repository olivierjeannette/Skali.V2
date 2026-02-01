/* eslint-disable @next/next/no-img-element */
import { getAllOrganizations } from '@/actions/platform';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import {
  getSubscriptionStatusColor,
  getSubscriptionStatusLabel,
  getDaysUntilTrialEnds,
  formatPlanPrice,
} from '@/types/platform.types';

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string; page?: string };
}) {
  const page = parseInt(searchParams.page || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  const { organizations, total } = await getAllOrganizations({
    search: searchParams.search,
    status: searchParams.status,
    limit,
    offset,
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organisations</h1>
          <p className="text-gray-500">{total} salles inscrites</p>
        </div>
        <Link
          href="/admin/organizations/new"
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
        >
          + Nouvelle organisation
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <form className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                name="search"
                placeholder="Rechercher par nom, slug ou email..."
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

      {/* Organizations Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organisation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proprietaire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Membres
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cree le
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Aucune organisation trouvee
                  </td>
                </tr>
              ) : (
                organizations.map((org) => {
                  const daysLeft = getDaysUntilTrialEnds(org.trial_ends_at);
                  const statusColor = getSubscriptionStatusColor(
                    org.platform_subscription_status
                  );

                  return (
                    <tr key={org.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
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
                              /{org.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {org.owner_email || (
                          <span className="text-yellow-600">Non assigne</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {org.plan_name ? (
                          <div>
                            <div className="text-sm font-medium">
                              {org.plan_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {org.plan_price
                                ? formatPlanPrice(org.plan_price)
                                : 'Gratuit'}
                              /mois
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <span className="font-medium">{org.member_count}</span>
                          <span className="text-gray-500"> membres</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {org.staff_count} staff
                        </div>
                      </td>
                      <td className="px-6 py-4">
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
                          {getSubscriptionStatusLabel(
                            org.platform_subscription_status
                          )}
                        </Badge>
                        {daysLeft !== null && daysLeft <= 7 && (
                          <div className="text-xs text-yellow-600 mt-1">
                            {daysLeft}j restants
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(org.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/organizations/${org.id}`}
                          className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                        >
                          Voir
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {page} sur {totalPages}
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/organizations?page=${page - 1}${
                  searchParams.search ? `&search=${searchParams.search}` : ''
                }${searchParams.status ? `&status=${searchParams.status}` : ''}`}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50"
              >
                Precedent
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/organizations?page=${page + 1}${
                  searchParams.search ? `&search=${searchParams.search}` : ''
                }${searchParams.status ? `&status=${searchParams.status}` : ''}`}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50"
              >
                Suivant
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
