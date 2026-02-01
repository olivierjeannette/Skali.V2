'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getMember, updateMember } from '@/actions/members';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Member } from '@/types/database.types';

const memberSchema = z.object({
  firstName: z.string().min(1, 'Prenom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
  memberNumber: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRelationship: z.string().optional(),
  medicalNotes: z.string().optional(),
});

type MemberForm = z.infer<typeof memberSchema>;

export default function EditMemberPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MemberForm>({
    resolver: zodResolver(memberSchema),
  });

  useEffect(() => {
    async function fetchMember() {
      const data = await getMember(memberId);
      if (data) {
        setMember(data);
        const emergencyContact = data.emergency_contact as {
          name?: string;
          phone?: string;
          relationship?: string;
        } | null;
        const medicalInfo = data.medical_info as { notes?: string } | null;

        reset({
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email || '',
          phone: data.phone || '',
          birthDate: data.birth_date || '',
          gender: (data.gender || '') as '' | 'male' | 'female' | 'other',
          memberNumber: data.member_number || '',
          status: data.status as 'active' | 'inactive' | 'suspended',
          emergencyName: emergencyContact?.name || '',
          emergencyPhone: emergencyContact?.phone || '',
          emergencyRelationship: emergencyContact?.relationship || '',
          medicalNotes: medicalInfo?.notes || '',
        });
      }
      setIsFetching(false);
    }
    fetchMember();
  }, [memberId, reset]);

  const onSubmit = async (data: MemberForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('id', memberId);
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, value);
        }
      });

      const result = await updateMember(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(`/dashboard/members/${memberId}`);
      router.refresh();
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="mx-auto max-w-2xl text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Membre introuvable</h1>
        <Button asChild>
          <Link href="/dashboard/members">Retour a la liste</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/members/${memberId}`}>
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
          <h1 className="text-3xl font-bold tracking-tight">Modifier le membre</h1>
          <p className="text-muted-foreground">
            {member.first_name} {member.last_name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="emergency">Contact urgence</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
                <CardDescription>
                  Les informations de base du membre
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prenom *</Label>
                    <Input
                      id="firstName"
                      placeholder="Jean"
                      {...register('firstName')}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom *</Label>
                    <Input
                      id="lastName"
                      placeholder="Dupont"
                      {...register('lastName')}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jean@exemple.com"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telephone</Label>
                    <Input
                      id="phone"
                      placeholder="06 12 34 56 78"
                      {...register('phone')}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Date de naissance</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      {...register('birthDate')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Genre</Label>
                    <select
                      id="gender"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...register('gender')}
                    >
                      <option value="">Non specifie</option>
                      <option value="male">Homme</option>
                      <option value="female">Femme</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="memberNumber">Numero membre</Label>
                    <Input
                      id="memberNumber"
                      placeholder="001"
                      {...register('memberNumber')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Statut</Label>
                    <select
                      id="status"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...register('status')}
                    >
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                      <option value="suspended">Suspendu</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emergency">
            <Card>
              <CardHeader>
                <CardTitle>Contact d&apos;urgence</CardTitle>
                <CardDescription>
                  Personne a contacter en cas d&apos;urgence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyName">Nom du contact</Label>
                  <Input
                    id="emergencyName"
                    placeholder="Marie Dupont"
                    {...register('emergencyName')}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">Telephone</Label>
                    <Input
                      id="emergencyPhone"
                      placeholder="06 12 34 56 78"
                      {...register('emergencyPhone')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyRelationship">Relation</Label>
                    <Input
                      id="emergencyRelationship"
                      placeholder="Conjoint(e), Parent, etc."
                      {...register('emergencyRelationship')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medical">
            <Card>
              <CardHeader>
                <CardTitle>Informations medicales</CardTitle>
                <CardDescription>
                  Allergies, conditions ou notes medicales importantes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="medicalNotes">Notes medicales</Label>
                  <textarea
                    id="medicalNotes"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Allergies, conditions medicales, precautions particulieres..."
                    {...register('medicalNotes')}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" asChild>
            <Link href={`/dashboard/members/${memberId}`}>Annuler</Link>
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  );
}
