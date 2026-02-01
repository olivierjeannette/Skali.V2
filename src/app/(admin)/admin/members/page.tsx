import { Suspense } from 'react';
import Link from 'next/link';
import { getAllGlobalMembers } from '@/actions/global-members';

// Search params type
interface SearchParams {
  search?: string;
  page?: string;
}

// Loading skeleton
function MembersSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white p-4 rounded-lg animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Members list component
async function MembersList({
  search,
  page,
}: {
  search?: string;
  page: number;
}) {
  const limit = 20;
  const offset = (page - 1) * limit;

  const result = await getAllGlobalMembers({
    search,
    limit,
    offset,
  });

  if (!result.success) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        {result.error}
      </div>
    );
  }

  const { members, total } = result.data!;
  const totalPages = Math.ceil(total / limit);

  if (members.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-2">
          <svg
            className="w-12 h-12 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <p className="text-gray-500">
          {search ? 'Aucun membre trouvé pour cette recherche' : 'Aucun membre global'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {total} membre{total > 1 ? 's' : ''} global{total > 1 ? 'aux' : ''}
        </span>
        {totalPages > 1 && (
          <span>
            Page {page} sur {totalPages}
          </span>
        )}
      </div>

      {/* Members table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Membre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organisations
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Inscription
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.map((member) => {
              const activeLinks = member.links?.filter(
                (l) => l.status === 'active'
              );
              const hasUser = !!member.user_id;

              return (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {member.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="h-10 w-10 rounded-full"
                            src={member.avatar_url}
                            alt=""
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <span className="text-orange-600 font-medium text-sm">
                              {member.first_name[0]}
                              {member.last_name[0]}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.first_name} {member.last_name}
                        </div>
                        {member.phone && (
                          <div className="text-sm text-gray-500">
                            {member.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">
                        {member.email}
                      </span>
                      {member.email_verified && (
                        <svg
                          className="w-4 h-4 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {activeLinks && activeLinks.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {activeLinks.map((link) => (
                          <span
                            key={link.id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {link.organization?.name || 'Unknown'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">
                        Aucune organisation
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        hasUser
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {hasUser ? 'Compte actif' : 'Sans compte'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(member.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/admin/members/${member.id}`}
                      className="text-orange-600 hover:text-orange-900"
                    >
                      Voir
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/admin/members?page=${page - 1}${search ? `&search=${search}` : ''}`}
              className="px-3 py-1 rounded border hover:bg-gray-50"
            >
              Precedent
            </Link>
          )}
          <span className="px-3 py-1 text-gray-500">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/members?page=${page + 1}${search ? `&search=${search}` : ''}`}
              className="px-3 py-1 rounded border hover:bg-gray-50"
            >
              Suivant
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// Main page component
export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = params.search;
  const page = parseInt(params.page || '1', 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Membres Globaux</h1>
          <p className="text-gray-500">
            Tous les membres de la plateforme et leurs liaisons
          </p>
        </div>
        <Link
          href="/admin/members/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600"
        >
          <svg
            className="-ml-1 mr-2 h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Nouveau membre
        </Link>
      </div>

      {/* Search */}
      <form className="flex gap-2">
        <div className="flex-1">
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Rechercher par nom, email..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          Rechercher
        </button>
        {search && (
          <Link
            href="/admin/members"
            className="px-4 py-2 text-gray-500 hover:text-gray-700"
          >
            Effacer
          </Link>
        )}
      </form>

      {/* Members list */}
      <Suspense fallback={<MembersSkeleton />}>
        <MembersList search={search} page={page} />
      </Suspense>
    </div>
  );
}
