'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  GlobalMemberWithLinks,
  linkMemberToOrg,
  unlinkMemberFromOrg,
  transferMember,
} from '@/actions/global-members';
import { getAllOrganizations } from '@/actions/platform';

interface MemberActionsProps {
  member: GlobalMemberWithLinks;
}

export function MemberActions({ member }: MemberActionsProps) {
  const router = useRouter();
  useTransition(); // Keep the hook call but don't use the values at this level
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeLinks = member.links?.filter((l) => l.status === 'active') || [];

  return (
    <>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setShowLinkModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
        >
          Lier a une org
        </button>

        {activeLinks.length > 0 && (
          <>
            <button
              onClick={() => setShowTransferModal(true)}
              className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100"
            >
              Transferer
            </button>
            <button
              onClick={() => setShowUnlinkModal(true)}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
            >
              Delier
            </button>
          </>
        )}
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <LinkModal
          memberId={member.id}
          existingOrgIds={activeLinks.map((l) => l.org_id)}
          onClose={() => setShowLinkModal(false)}
          onSuccess={() => {
            setShowLinkModal(false);
            router.refresh();
          }}
        />
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <TransferModal
          memberId={member.id}
          activeLinks={activeLinks}
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            setShowTransferModal(false);
            router.refresh();
          }}
        />
      )}

      {/* Unlink Modal */}
      {showUnlinkModal && (
        <UnlinkModal
          memberId={member.id}
          activeLinks={activeLinks}
          onClose={() => setShowUnlinkModal(false)}
          onSuccess={() => {
            setShowUnlinkModal(false);
            router.refresh();
          }}
        />
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 text-red-700 px-4 py-2 rounded-lg shadow-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            x
          </button>
        </div>
      )}
    </>
  );
}

// Link Modal Component
function LinkModal({
  memberId,
  existingOrgIds,
  onClose,
  onSuccess,
}: {
  memberId: string;
  existingOrgIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [copyData, setCopyData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load organizations
  useState(() => {
    getAllOrganizations()
      .then((result) => {
        setLoading(false);
        const available = result.organizations.filter(
          (org: { id: string; name: string }) => !existingOrgIds.includes(org.id)
        );
        setOrgs(available);
      })
      .catch(() => {
        setLoading(false);
      });
  });

  const handleSubmit = () => {
    if (!selectedOrgId) return;

    startTransition(async () => {
      const result = await linkMemberToOrg(memberId, selectedOrgId, copyData);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Lier a une organisation</h3>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="text-center py-4 text-gray-500">Chargement...</div>
          ) : orgs.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              Aucune organisation disponible
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organisation
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Selectionner une organisation</option>
                  {orgs.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="copyData"
                  checked={copyData}
                  onChange={(e) => setCopyData(e.target.checked)}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <label htmlFor="copyData" className="text-sm text-gray-700">
                  Creer une copie locale du membre
                </label>
              </div>
            </>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !selectedOrgId}
            className="px-4 py-2 text-sm text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {isPending ? 'Liaison...' : 'Lier'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Transfer Modal Component
function TransferModal({
  memberId,
  activeLinks,
  onClose,
  onSuccess,
}: {
  memberId: string;
  activeLinks: GlobalMemberWithLinks['links'];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [fromOrgId, setFromOrgId] = useState('');
  const [toOrgId, setToOrgId] = useState('');
  const [reason, setReason] = useState('');
  const [copyHistory, setCopyHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load organizations
  useState(() => {
    getAllOrganizations()
      .then((result) => {
        setLoading(false);
        setOrgs(result.organizations);
      })
      .catch(() => {
        setLoading(false);
      });
  });

  const activeOrgIds = activeLinks.map((l) => l.org_id);
  const availableDestinations = orgs.filter(
    (org) => !activeOrgIds.includes(org.id)
  );

  const handleSubmit = () => {
    if (!fromOrgId || !toOrgId) return;

    startTransition(async () => {
      const result = await transferMember(memberId, fromOrgId, toOrgId, {
        copyHistory,
        reason: reason || undefined,
      });
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Transferer le membre</h3>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="text-center py-4 text-gray-500">Chargement...</div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organisation source
                </label>
                <select
                  value={fromOrgId}
                  onChange={(e) => setFromOrgId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Selectionner</option>
                  {activeLinks.map((link) => (
                    <option key={link.org_id} value={link.org_id}>
                      {link.organization?.name || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organisation destination
                </label>
                <select
                  value={toOrgId}
                  onChange={(e) => setToOrgId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Selectionner</option>
                  {availableDestinations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Raison du transfert (optionnel)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Demenagement, changement de salle..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="copyHistory"
                  checked={copyHistory}
                  onChange={(e) => setCopyHistory(e.target.checked)}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <label htmlFor="copyHistory" className="text-sm text-gray-700">
                  Copier l&apos;historique des donnees
                </label>
              </div>
            </>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !fromOrgId || !toOrgId}
            className="px-4 py-2 text-sm text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {isPending ? 'Transfert...' : 'Transferer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Unlink Modal Component
function UnlinkModal({
  memberId,
  activeLinks,
  onClose,
  onSuccess,
}: {
  memberId: string;
  activeLinks: GlobalMemberWithLinks['links'];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!selectedOrgId) return;

    startTransition(async () => {
      const result = await unlinkMemberFromOrg(memberId, selectedOrgId);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-red-600">
            Delier le membre
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Cette action va desactiver le lien entre ce membre et
            l&apos;organisation selectionnee. Le membre local sera marque comme
            inactif.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organisation a delier
            </label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="">Selectionner</option>
              {activeLinks.map((link) => (
                <option key={link.org_id} value={link.org_id}>
                  {link.organization?.name || 'Unknown'}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !selectedOrgId}
            className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            {isPending ? 'Deliaison...' : 'Delier'}
          </button>
        </div>
      </div>
    </div>
  );
}
