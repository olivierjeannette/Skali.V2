'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createOrganization, inviteOwner } from '@/actions/platform';
import type { PlatformPlanTier } from '@/types/platform.types';
import Link from 'next/link';

const timezones = [
  { value: 'Europe/Paris', label: 'France (Paris)' },
  { value: 'America/Montreal', label: 'Canada (Montreal)' },
  { value: 'America/Toronto', label: 'Canada (Toronto)' },
  { value: 'America/Vancouver', label: 'Canada (Vancouver)' },
  { value: 'Europe/Brussels', label: 'Belgique (Bruxelles)' },
  { value: 'Europe/Zurich', label: 'Suisse (Zurich)' },
  { value: 'Europe/London', label: 'UK (Londres)' },
];

const countries = [
  { value: 'FR', label: 'France' },
  { value: 'CA', label: 'Canada' },
  { value: 'BE', label: 'Belgique' },
  { value: 'CH', label: 'Suisse' },
  { value: 'GB', label: 'Royaume-Uni' },
];

export default function NewOrganizationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    owner_email: '',
    plan_tier: 'free_trial' as PlatformPlanTier,
    country_code: 'FR',
    timezone: 'Europe/Paris',
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  const handleSubmitOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createOrganization(form);

      if (!result.success) {
        setError(result.error || 'Erreur lors de la creation');
        return;
      }

      setCreatedOrgId(result.orgId!);
      setStep(2);
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!createdOrgId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await inviteOwner({
        org_id: createdOrgId,
        email: form.owner_email,
      });

      if (!result.success) {
        setError(result.error || 'Erreur lors de l\'envoi');
        return;
      }

      setStep(3);
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipInvitation = () => {
    router.push(`/admin/organizations/${createdOrgId}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/admin/organizations"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Retour aux organisations
        </Link>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className={`flex items-center gap-2 ${
            step >= 1 ? 'text-orange-600' : 'text-gray-400'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1
                ? 'bg-orange-100 text-orange-600'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            1
          </div>
          <span className="font-medium">Organisation</span>
        </div>
        <div className="flex-1 h-px bg-gray-200" />
        <div
          className={`flex items-center gap-2 ${
            step >= 2 ? 'text-orange-600' : 'text-gray-400'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2
                ? 'bg-orange-100 text-orange-600'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            2
          </div>
          <span className="font-medium">Invitation</span>
        </div>
        <div className="flex-1 h-px bg-gray-200" />
        <div
          className={`flex items-center gap-2 ${
            step >= 3 ? 'text-orange-600' : 'text-gray-400'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 3
                ? 'bg-orange-100 text-orange-600'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            3
          </div>
          <span className="font-medium">Termine</span>
        </div>
      </div>

      {/* Step 1: Create Organization */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle organisation</CardTitle>
            <CardDescription>
              Creez une nouvelle salle de sport sur la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitOrg} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom de la salle *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="CrossFit Montreal"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="slug">Slug (URL) *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">app.skaliprog.com/</span>
                    <Input
                      id="slug"
                      value={form.slug}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, slug: e.target.value }))
                      }
                      placeholder="crossfit-montreal"
                      required
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="owner_email">Email du proprietaire *</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    value={form.owner_email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, owner_email: e.target.value }))
                    }
                    placeholder="bob@crossfitmontreal.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Un email d&apos;invitation sera envoye a cette adresse
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Pays</Label>
                    <select
                      id="country"
                      value={form.country_code}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          country_code: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {countries.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="timezone">Fuseau horaire</Label>
                    <select
                      id="timezone"
                      value={form.timezone}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, timezone: e.target.value }))
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {timezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="plan">Plan</Label>
                  <select
                    id="plan"
                    value={form.plan_tier}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        plan_tier: e.target.value as PlatformPlanTier,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="free_trial">Essai gratuit (14 jours)</option>
                    <option value="basic">Basic (29 EUR/mois)</option>
                    <option value="pro">Pro (79 EUR/mois)</option>
                    <option value="enterprise">Enterprise (149 EUR/mois)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Link href="/admin/organizations">
                  <Button type="button" variant="outline">
                    Annuler
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creation...' : 'Creer l\'organisation'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Send Invitation */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Organisation creee !</CardTitle>
            <CardDescription>
              L&apos;organisation &quot;{form.name}&quot; a ete creee avec succes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700">
                Voulez-vous envoyer une invitation au proprietaire ?
              </p>
              <p className="text-sm text-green-600 mt-1">
                Email: <strong>{form.owner_email}</strong>
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={handleSkipInvitation}>
                Passer
              </Button>
              <Button onClick={handleSendInvitation} disabled={loading}>
                {loading ? 'Envoi...' : 'Envoyer l\'invitation'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Tout est pret !</CardTitle>
            <CardDescription>
              L&apos;organisation a ete creee et l&apos;invitation envoyee
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-medium">
                Un email a ete envoye a {form.owner_email}
              </p>
              <p className="text-sm text-green-600 mt-1">
                Le proprietaire pourra creer son compte et acceder à sa salle
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/admin/organizations">
                <Button variant="outline">Retour a la liste</Button>
              </Link>
              <Link href={`/admin/organizations/${createdOrgId}`}>
                <Button>Voir l&apos;organisation</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
