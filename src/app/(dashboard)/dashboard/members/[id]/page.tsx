import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMember, deleteMember } from '@/actions/members';
import { requireOrganization } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface PageProps {
  params: Promise<{ id: string }>;
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active':
      return 'default';
    case 'inactive':
      return 'secondary';
    case 'suspended':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'active':
      return 'Actif';
    case 'inactive':
      return 'Inactif';
    case 'suspended':
      return 'Suspendu';
    default:
      return status;
  }
}

function getGenderLabel(gender: string | null) {
  switch (gender) {
    case 'male':
      return 'Homme';
    case 'female':
      return 'Femme';
    case 'other':
      return 'Autre';
    default:
      return '-';
  }
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatDate(dateString: string | null) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function MemberDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  await requireOrganization();
  const member = await getMember(resolvedParams.id);

  if (!member) {
    notFound();
  }

  const emergencyContact = member.emergency_contact as {
    name?: string;
    phone?: string;
    relationship?: string;
  } | null;

  const medicalInfo = member.medical_info as {
    notes?: string;
    allergies?: string[];
    conditions?: string[];
  } | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/members">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {member.first_name} {member.last_name}
            </h1>
            {member.member_number && (
              <p className="text-muted-foreground">#{member.member_number}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/members/${member.id}/edit`}>Modifier</Link>
          </Button>
          <form
            action={async () => {
              'use server';
              await deleteMember(member.id);
            }}
          >
            <Button variant="destructive" type="submit">
              Supprimer
            </Button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardContent className="flex flex-col items-center pt-6">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {getInitials(member.first_name, member.last_name)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-semibold">
              {member.first_name} {member.last_name}
            </h2>
            <Badge
              variant={getStatusBadgeVariant(member.status)}
              className="mt-2"
            >
              {getStatusLabel(member.status)}
            </Badge>
            <Separator className="my-4" />
            <dl className="w-full space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Membre depuis</dt>
                <dd>{formatDate(member.joined_at)}</dd>
              </div>
              {member.tags && member.tags.length > 0 && (
                <div>
                  <dt className="text-muted-foreground mb-2">Tags</dt>
                  <dd className="flex flex-wrap gap-1">
                    {member.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Details */}
        <div className="space-y-6 md:col-span-2">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 md:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Email</dt>
                  <dd className="font-medium">{member.email || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Telephone</dt>
                  <dd className="font-medium">{member.phone || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Date de naissance</dt>
                  <dd className="font-medium">{formatDate(member.birth_date)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Genre</dt>
                  <dd className="font-medium">{getGenderLabel(member.gender)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contact d&apos;urgence</CardTitle>
              <CardDescription>
                Personne a contacter en cas d&apos;urgence
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emergencyContact && (emergencyContact.name || emergencyContact.phone) ? (
                <dl className="grid gap-4 md:grid-cols-3">
                  <div>
                    <dt className="text-sm text-muted-foreground">Nom</dt>
                    <dd className="font-medium">{emergencyContact.name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Telephone</dt>
                    <dd className="font-medium">{emergencyContact.phone || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Relation</dt>
                    <dd className="font-medium">{emergencyContact.relationship || '-'}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun contact d&apos;urgence renseigne
                </p>
              )}
            </CardContent>
          </Card>

          {/* Medical Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informations medicales</CardTitle>
            </CardHeader>
            <CardContent>
              {medicalInfo && medicalInfo.notes ? (
                <p className="text-sm whitespace-pre-wrap">{medicalInfo.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune information medicale renseignee
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
