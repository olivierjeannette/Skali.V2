import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getGlobalMember, getMemberHistory } from '@/actions/global-members';
import { MemberActions } from './member-actions';

export default async function GlobalMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [memberResult, historyResult] = await Promise.all([
    getGlobalMember(id),
    getMemberHistory(id),
  ]);

  if (!memberResult.success || !memberResult.data) {
    notFound();
  }

  const member = memberResult.data;
  const history = historyResult.success ? historyResult.data : null;
  const activeLinks = member.links?.filter((l) => l.status === 'active') || [];
  const transferredLinks =
    member.links?.filter((l) => l.status === 'transferred') || [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/members" className="hover:text-gray-700">
          Membres Globaux
        </Link>
        <span>/</span>
        <span className="text-gray-900">
          {member.first_name} {member.last_name}
        </span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          {member.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatar_url}
              alt=""
              className="w-24 h-24 rounded-full"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-orange-600 font-bold text-2xl">
                {member.first_name[0]}
                {member.last_name[0]}
              </span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {member.first_name} {member.last_name}
              </h1>
              {member.user_id ? (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  Compte actif
                </span>
              ) : (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                  Sans compte
                </span>
              )}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Email:</span>{' '}
                <span className="text-gray-900 flex items-center gap-1">
                  {member.email}
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
                </span>
              </div>
              {member.phone && (
                <div>
                  <span className="text-gray-500">Telephone:</span>{' '}
                  <span className="text-gray-900">{member.phone}</span>
                </div>
              )}
              {member.birth_date && (
                <div>
                  <span className="text-gray-500">Date de naissance:</span>{' '}
                  <span className="text-gray-900">
                    {new Date(member.birth_date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
              {member.gender && (
                <div>
                  <span className="text-gray-500">Genre:</span>{' '}
                  <span className="text-gray-900">
                    {member.gender === 'male'
                      ? 'Homme'
                      : member.gender === 'female'
                        ? 'Femme'
                        : 'Autre'}
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Langue:</span>{' '}
                <span className="text-gray-900">
                  {member.preferred_language === 'fr' ? 'Francais' : 'English'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Cree le:</span>{' '}
                <span className="text-gray-900">
                  {new Date(member.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <MemberActions member={member} />
        </div>
      </div>

      {/* Active Organizations */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Organisations actives ({activeLinks.length})
          </h2>
        </div>

        {activeLinks.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {activeLinks.map((link) => (
              <div
                key={link.id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <span className="text-orange-600 font-medium text-sm">
                      {link.organization?.name?.[0] || '?'}
                    </span>
                  </div>
                  <div>
                    <Link
                      href={`/admin/organizations/${link.org_id}`}
                      className="font-medium text-gray-900 hover:text-orange-600"
                    >
                      {link.organization?.name || 'Unknown'}
                    </Link>
                    <div className="text-sm text-gray-500">
                      Lie le{' '}
                      {new Date(link.linked_at).toLocaleDateString('fr-FR')} par{' '}
                      {link.initiated_by === 'super_admin'
                        ? 'Super Admin'
                        : link.initiated_by === 'gym'
                          ? 'la salle'
                          : 'le membre'}
                    </div>
                  </div>
                </div>

                {link.transferred_from_org_id && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Transfere
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            Ce membre n&apos;est lie a aucune organisation
          </div>
        )}
      </div>

      {/* Transfer History */}
      {transferredLinks.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Historique des transferts
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {transferredLinks.map((link) => (
              <div key={link.id} className="px-6 py-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Quitte</span>
                  <span className="font-medium text-gray-900">
                    {link.organization?.name}
                  </span>
                  <span>le</span>
                  <span>
                    {link.unlinked_at
                      ? new Date(link.unlinked_at).toLocaleDateString('fr-FR')
                      : 'N/A'}
                  </span>
                  {link.transfer_reason && (
                    <>
                      <span>-</span>
                      <span className="italic">{link.transfer_reason}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscription History */}
      {history?.subscriptions && history.subscriptions.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Historique des abonnements
            </h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organisation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Periode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.subscriptions.map((sub, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sub.org_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sub.plan_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sub.start_date).toLocaleDateString('fr-FR')}
                    {sub.end_date && (
                      <>
                        {' '}
                        - {new Date(sub.end_date).toLocaleDateString('fr-FR')}
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        sub.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : sub.status === 'expired'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
