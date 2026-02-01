'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getClass, createBooking } from '@/actions/planning';
import { getActiveMembersForCurrentOrg } from '@/actions/members';
import type { Member } from '@/types/database.types';
import type { ClassWithRelations } from '@/actions/planning';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface PageProps {
  params: Promise<{ id: string }>;
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function AddParticipantPage({ params }: PageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [classInfo, setClassInfo] = useState<ClassWithRelations | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isDropIn, setIsDropIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [classId, setClassId] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      const resolvedParams = await params;
      setClassId(resolvedParams.id);

      const [classData, membersData] = await Promise.all([
        getClass(resolvedParams.id),
        getActiveMembersForCurrentOrg(),
      ]);

      setClassInfo(classData);
      setMembers(membersData);
      setFilteredMembers(membersData);
      setLoading(false);
    }
    loadData();
  }, [params]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMembers(members);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredMembers(
        members.filter(
          (m) =>
            m.first_name.toLowerCase().includes(query) ||
            m.last_name.toLowerCase().includes(query) ||
            (m.email && m.email.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, members]);

  function handleSubmit() {
    if (!selectedMember || !classId) {
      setError('Veuillez selectionner un membre');
      return;
    }

    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set('classId', classId);
      formData.set('memberId', selectedMember.id);
      formData.set('isDropIn', isDropIn.toString());

      const result = await createBooking(formData);

      if (result.success) {
        router.push(`/dashboard/planning/${classId}`);
      } else {
        setError(result.error);
      }
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded w-1/3" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-2">Cours introuvable</h1>
        <Button asChild>
          <Link href="/dashboard/planning">Retour au planning</Link>
        </Button>
      </div>
    );
  }

  const isFull = classInfo.max_participants && classInfo.current_participants >= classInfo.max_participants;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/planning/${classId}`}>
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
          <h1 className="text-3xl font-bold tracking-tight">Ajouter un participant</h1>
          <p className="text-muted-foreground mt-1">
            {classInfo.name} - {new Date(classInfo.start_time).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
      </div>

      {isFull && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800">
            Ce cours est complet. Le participant sera place en liste d&apos;attente.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Selection du membre */}
        <Card>
          <CardHeader>
            <CardTitle>Selectionner un membre</CardTitle>
            <CardDescription>
              Recherchez et selectionnez le membre a inscrire
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                placeholder="Rechercher par nom ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Aucun membre trouve
                </div>
              ) : (
                filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedMember?.id === member.id
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                    onClick={() => setSelectedMember(member)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(member.first_name, member.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {member.first_name} {member.last_name}
                      </div>
                      {member.email && (
                        <div className="text-sm text-muted-foreground truncate">
                          {member.email}
                        </div>
                      )}
                    </div>
                    {member.status !== 'active' && (
                      <Badge variant="outline">{member.status}</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Options et confirmation */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Options</CardTitle>
              <CardDescription>
                Configurez les options de reservation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dropIn">Drop-in</Label>
                  <p className="text-sm text-muted-foreground">
                    Inscription sans abonnement
                  </p>
                </div>
                <Switch
                  id="dropIn"
                  checked={isDropIn}
                  onCheckedChange={setIsDropIn}
                />
              </div>

              {isDropIn && classInfo.drop_in_price !== null && classInfo.drop_in_price > 0 && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-sm text-muted-foreground">Prix drop-in</div>
                  <div className="text-lg font-semibold">{classInfo.drop_in_price} €</div>
                </div>
              )}

              {classInfo.requires_subscription && !isDropIn && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    Ce cours necessite un abonnement actif. Une seance sera debitee.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Membre selectionne */}
          {selectedMember && (
            <Card>
              <CardHeader>
                <CardTitle>Confirmation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {getInitials(selectedMember.first_name, selectedMember.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {selectedMember.first_name} {selectedMember.last_name}
                    </div>
                    {selectedMember.email && (
                      <div className="text-sm text-muted-foreground">
                        {selectedMember.email}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cours</span>
                    <span>{classInfo.name}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Type</span>
                    <span>{isDropIn ? 'Drop-in' : 'Abonnement'}</span>
                  </div>
                  {isFull && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Statut</span>
                      <Badge variant="secondary">Liste d&apos;attente</Badge>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                    {error}
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isPending}
                >
                  {isPending ? 'Inscription...' : isFull ? 'Ajouter a la liste d\'attente' : 'Inscrire le membre'}
                </Button>
              </CardContent>
            </Card>
          )}

          {!selectedMember && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                Selectionnez un membre pour continuer
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
