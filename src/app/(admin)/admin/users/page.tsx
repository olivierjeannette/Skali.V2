import { getAllUsers } from '@/actions/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UsersActions } from './users-actions';
import { Shield, User, Building2 } from 'lucide-react';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { search?: string; super_admin?: string; page?: string };
}) {
  const page = parseInt(searchParams.page || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  const isSuperAdminFilter =
    searchParams.super_admin === 'true'
      ? true
      : searchParams.super_admin === 'false'
      ? false
      : undefined;

  const { users, total } = await getAllUsers({
    search: searchParams.search,
    is_super_admin: isSuperAdminFilter,
    limit,
    offset,
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-500">{total} utilisateurs inscrits</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <form className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                name="search"
                placeholder="Rechercher par email ou nom..."
                defaultValue={searchParams.search}
              />
            </div>
            <select
              name="super_admin"
              defaultValue={searchParams.super_admin || ''}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Tous les utilisateurs</option>
              <option value="true">Super admins</option>
              <option value="false">Utilisateurs normaux</option>
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

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Organisations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Inscription
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.full_name || 'Sans nom'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {user.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{user.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.organizations.length > 0 ? (
                          user.organizations.slice(0, 3).map((org) => (
                            <Badge
                              key={org.id}
                              variant="outline"
                              className="text-xs"
                            >
                              <Building2 className="h-3 w-3 mr-1" />
                              {org.name} ({org.role})
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">
                            Aucune organisation
                          </span>
                        )}
                        {user.organizations.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.organizations.length - 3}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_super_admin ? (
                        <Badge className="bg-orange-500 text-white">
                          <Shield className="h-3 w-3 mr-1" />
                          Super Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Utilisateur</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <UsersActions user={user} />
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      Aucun utilisateur trouve
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
                }${
                  searchParams.super_admin
                    ? `&super_admin=${searchParams.super_admin}`
                    : ''
                }`}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Precedent
              </a>
            )}
            {page < totalPages && (
              <a
                href={`?page=${page + 1}${
                  searchParams.search ? `&search=${searchParams.search}` : ''
                }${
                  searchParams.super_admin
                    ? `&super_admin=${searchParams.super_admin}`
                    : ''
                }`}
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
