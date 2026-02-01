import { Suspense } from 'react';
import Link from 'next/link';
import { requireOrganization } from '@/lib/auth';
import { getMembersPaginated, getMembersCount } from '@/actions/members';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MembersSearch } from '@/components/members/MembersSearch';
import { ExportButton } from '@/components/members/ExportButton';
import { MembersPagination } from '@/components/members/MembersPagination';

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: 'active' | 'inactive' | 'suspended';
    page?: string;
  }>;
}

function MembersTableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
            <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
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

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

async function MembersStats({ orgId }: { orgId: string }) {
  const stats = await getMembersCount(orgId);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Membres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Actifs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inactifs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">{stats.inactive}</div>
        </CardContent>
      </Card>
    </div>
  );
}

async function MembersTable({
  orgId,
  query,
  status,
  page,
}: {
  orgId: string;
  query?: string;
  status?: 'active' | 'inactive' | 'suspended';
  page: number;
}) {
  const { members, total, totalPages } = await getMembersPaginated(orgId, {
    query,
    status,
    page,
    pageSize: PAGE_SIZE,
  });

  if (members.length === 0 && page === 1) {
    const hasFilters = query || status;

    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 rounded-full bg-muted p-4">
            <svg
              className="h-8 w-8 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">
            {hasFilters ? 'Aucun resultat' : 'Aucun membre'}
          </h3>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            {hasFilters
              ? 'Essayez de modifier vos criteres de recherche'
              : 'Commencez par ajouter votre premier membre'}
          </p>
          {!hasFilters && (
            <Button asChild>
              <Link href="/dashboard/members/new">Ajouter un membre</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liste des membres</CardTitle>
        <CardDescription>
          {total} membre{total > 1 ? 's' : ''}{' '}
          {(query || status) && 'correspondant a vos criteres'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telephone</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(member.first_name, member.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {member.first_name} {member.last_name}
                      </div>
                      {member.member_number && (
                        <div className="text-sm text-muted-foreground">
                          #{member.member_number}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{member.email || '-'}</TableCell>
                <TableCell>{member.phone || '-'}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(member.status)}>
                    {getStatusLabel(member.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/members/${member.id}`}>Voir</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <MembersPagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
        />
      </CardContent>
    </Card>
  );
}

export default async function MembersPage({ searchParams }: PageProps) {
  const org = await requireOrganization();
  const params = await searchParams;
  const query = params.q;
  const status = params.status;
  const page = parseInt(params.page || '1', 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Membres</h1>
          <p className="text-muted-foreground">
            Gerez les membres de votre salle
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton />
          <Button variant="outline" asChild>
            <Link href="/dashboard/members/import">Import CSV</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/members/new">Ajouter un membre</Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<div className="h-24 animate-pulse bg-muted rounded-lg" />}>
        <MembersStats orgId={org.id} />
      </Suspense>

      <Suspense fallback={<div className="h-12 animate-pulse bg-muted rounded-lg" />}>
        <MembersSearch />
      </Suspense>

      <Suspense fallback={<MembersTableSkeleton />}>
        <MembersTable orgId={org.id} query={query} status={status} page={page} />
      </Suspense>
    </div>
  );
}
