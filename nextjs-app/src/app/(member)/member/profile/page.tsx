'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  User,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Save,
  Loader2,
  Shield,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMemberAuth } from '@/hooks/useMemberAuth';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

const profileSchema = z.object({
  first_name: z.string().min(1, 'Prenom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const emergencySchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  relationship: z.string().optional(),
});

type EmergencyFormData = z.infer<typeof emergencySchema>;

export default function MemberProfilePage() {
  useRouter();
  const { toast } = useToast();
  const { member, subscriptions, refreshData } = useMemberAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  const emergencyContact = member?.emergency_contact as {
    name?: string;
    phone?: string;
    relationship?: string;
  } | null;

  const medicalInfo = member?.medical_info as {
    certificate_expiry?: string;
    notes?: string;
  } | null;

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: member?.first_name || '',
      last_name: member?.last_name || '',
      email: member?.email || '',
      phone: member?.phone || '',
      birth_date: member?.birth_date || '',
    },
  });

  const emergencyForm = useForm<EmergencyFormData>({
    resolver: zodResolver(emergencySchema),
    defaultValues: {
      name: emergencyContact?.name || '',
      phone: emergencyContact?.phone || '',
      relationship: emergencyContact?.relationship || '',
    },
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!member) return;

    setIsSaving(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('members')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email || null,
          phone: data.phone || null,
          birth_date: data.birth_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: 'Profil mis a jour',
        description: 'Vos informations ont ete enregistrees.',
      });

      await refreshData();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre a jour le profil.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onEmergencySubmit = async (data: EmergencyFormData) => {
    if (!member) return;

    setIsSaving(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('members')
        .update({
          emergency_contact: {
            name: data.name || null,
            phone: data.phone || null,
            relationship: data.relationship || null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: 'Contact d\'urgence mis a jour',
        description: 'Les informations ont ete enregistrees.',
      });

      await refreshData();
    } catch (error) {
      console.error('Error updating emergency contact:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre a jour le contact.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const initials = member
    ? `${member.first_name[0]}${member.last_name[0]}`.toUpperCase()
    : '?';

  const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    active: { label: 'Actif', variant: 'default' },
    inactive: { label: 'Inactif', variant: 'secondary' },
    suspended: { label: 'Suspendu', variant: 'destructive' },
    archived: { label: 'Archive', variant: 'outline' },
  };

  const memberStatus = statusLabels[member?.status || 'inactive'];

  // Check if medical certificate is expiring
  const certExpiry = medicalInfo?.certificate_expiry
    ? parseISO(medicalInfo.certificate_expiry)
    : null;
  const isCertExpired = certExpiry && certExpiry < new Date();
  const isCertExpiringSoon = certExpiry && !isCertExpired &&
    certExpiry < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-6">
      {/* Header with avatar */}
      <div className="flex items-start gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={member?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {member?.first_name} {member?.last_name}
          </h1>
          <p className="text-muted-foreground">{member?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={memberStatus.variant}>{memberStatus.label}</Badge>
            {member?.member_number && (
              <Badge variant="outline">#{member.member_number}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Medical certificate alert */}
      {(isCertExpired || isCertExpiringSoon) && (
        <Card className={isCertExpired ? 'border-destructive bg-destructive/5' : 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950'}>
          <CardContent className="flex items-center gap-4 p-4">
            <AlertCircle className={`h-5 w-5 ${isCertExpired ? 'text-destructive' : 'text-orange-600'}`} />
            <div className="flex-1">
              <p className={`font-medium ${isCertExpired ? 'text-destructive' : 'text-orange-800 dark:text-orange-200'}`}>
                {isCertExpired ? 'Certificat medical expire' : 'Certificat medical bientot expire'}
              </p>
              <p className={`text-sm ${isCertExpired ? 'text-destructive/80' : 'text-orange-600 dark:text-orange-300'}`}>
                {isCertExpired
                  ? 'Veuillez fournir un nouveau certificat medical a la salle.'
                  : `Expire le ${format(certExpiry!, 'd MMMM yyyy', { locale: fr })}`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="emergency">Urgence</TabsTrigger>
          <TabsTrigger value="subscriptions">Abonnements</TabsTrigger>
        </TabsList>

        {/* Personal info tab */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations personnelles
              </CardTitle>
              <CardDescription>
                Modifiez vos informations de profil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Prenom *</Label>
                    <Input
                      id="first_name"
                      {...profileForm.register('first_name')}
                      placeholder="Votre prenom"
                    />
                    {profileForm.formState.errors.first_name && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.first_name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_name">Nom *</Label>
                    <Input
                      id="last_name"
                      {...profileForm.register('last_name')}
                      placeholder="Votre nom"
                    />
                    {profileForm.formState.errors.last_name && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.last_name.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      {...profileForm.register('email')}
                      placeholder="votre@email.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telephone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        {...profileForm.register('phone')}
                        placeholder="06 12 34 56 78"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Date de naissance</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="birth_date"
                        type="date"
                        {...profileForm.register('birth_date')}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Enregistrer
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Medical info (read-only) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations medicales
              </CardTitle>
              <CardDescription>
                Geree par la salle - contactez-les pour toute modification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Certificat medical</Label>
                  {certExpiry ? (
                    <p className={`font-medium ${isCertExpired ? 'text-destructive' : isCertExpiringSoon ? 'text-orange-600' : ''}`}>
                      Expire le {format(certExpiry, 'd MMMM yyyy', { locale: fr })}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">Non renseigne</p>
                  )}
                </div>
                {medicalInfo?.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes medicales</Label>
                    <p>{medicalInfo.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency contact tab */}
        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Contact d&apos;urgence
              </CardTitle>
              <CardDescription>
                Personne a contacter en cas d&apos;urgence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={emergencyForm.handleSubmit(onEmergencySubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_name">Nom complet</Label>
                  <Input
                    id="emergency_name"
                    {...emergencyForm.register('name')}
                    placeholder="Nom de la personne a contacter"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">Telephone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="emergency_phone"
                      {...emergencyForm.register('phone')}
                      placeholder="06 12 34 56 78"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_relationship">Lien</Label>
                  <Input
                    id="emergency_relationship"
                    {...emergencyForm.register('relationship')}
                    placeholder="Conjoint, parent, ami..."
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Enregistrer
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions tab */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Mes abonnements</CardTitle>
              <CardDescription>
                Historique et statut de vos abonnements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucun abonnement</p>
                  <p className="text-sm">Contactez la salle pour souscrire.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {subscriptions.map((sub) => (
                    <li
                      key={sub.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{sub.plan_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Du {format(parseISO(sub.start_date), 'd MMM yyyy', { locale: fr })}
                          {sub.end_date && ` au ${format(parseISO(sub.end_date), 'd MMM yyyy', { locale: fr })}`}
                        </p>
                      </div>
                      <div className="text-right">
                        {sub.sessions_total !== null && (
                          <p className="text-sm mb-1">
                            <span className="font-bold text-primary">
                              {sub.sessions_total - sub.sessions_used}
                            </span>
                            <span className="text-muted-foreground">
                              /{sub.sessions_total} seances
                            </span>
                          </p>
                        )}
                        <Badge
                          variant={sub.status === 'active' ? 'default' : 'secondary'}
                        >
                          {sub.status === 'active' ? 'Actif' : 'En pause'}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
