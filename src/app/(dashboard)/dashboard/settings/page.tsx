'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  Mail,
  Building2,
  Users,
  Shield,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  CreditCard,
  ArrowRight,
  MessageSquare,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { sendSubscriptionExpirationReminders, sendTomorrowClassReminders } from '@/actions/notifications';
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '@/actions/notification-settings';
import { useAuth } from '@/hooks/useAuth';

const organizationSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caracteres'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url('URL invalide').optional().or(z.literal('')),
});

const notificationSchema = z.object({
  send_welcome_email: z.boolean(),
  send_booking_confirmation: z.boolean(),
  send_class_reminder_24h: z.boolean(),
  send_class_reminder_2h: z.boolean(),
  send_class_cancelled: z.boolean(),
  send_subscription_expiring_30d: z.boolean(),
  send_subscription_expiring_7d: z.boolean(),
  send_subscription_expired: z.boolean(),
  from_name: z.string().optional(),
  reply_to_email: z.string().email('Email invalide').optional().or(z.literal('')),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;
type NotificationFormData = z.infer<typeof notificationSchema>;

// TODO: Replace with actual org ID from auth context
const DEMO_ORG_ID = 'demo-org-id';

export default function SettingsPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || DEMO_ORG_ID;

  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [saveResult, setSaveResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [reminderResult, setReminderResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const orgForm = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: currentOrg?.name || '',
      email: '',
      phone: '',
      address: '',
      website: '',
    },
  });

  const notifForm = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      send_welcome_email: true,
      send_booking_confirmation: true,
      send_class_reminder_24h: true,
      send_class_reminder_2h: false,
      send_class_cancelled: true,
      send_subscription_expiring_30d: true,
      send_subscription_expiring_7d: true,
      send_subscription_expired: false,
      from_name: 'Skali Prog',
      reply_to_email: '',
    },
  });

  // Load notification settings
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoadingSettings(true);
      try {
        const settings = await getNotificationSettings(orgId);
        notifForm.reset({
          send_welcome_email: settings.send_welcome_email,
          send_booking_confirmation: settings.send_booking_confirmation,
          send_class_reminder_24h: settings.send_class_reminder_24h,
          send_class_reminder_2h: settings.send_class_reminder_2h,
          send_class_cancelled: settings.send_class_cancelled,
          send_subscription_expiring_30d: settings.send_subscription_expiring_30d,
          send_subscription_expiring_7d: settings.send_subscription_expiring_7d,
          send_subscription_expired: settings.send_subscription_expired,
          from_name: settings.from_name || 'Skali Prog',
          reply_to_email: settings.reply_to_email || '',
        });
      } catch (error) {
        console.error('Error loading notification settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const handleSaveOrganization = async (data: OrganizationFormData) => {
    setIsSaving(true);
    setSaveResult(null);
    // TODO: Implement save organization
    console.log('Save organization:', data);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaveResult({ type: 'success', message: 'Organisation enregistree' });
    setIsSaving(false);
  };

  const handleSaveNotifications = async (data: NotificationFormData) => {
    setIsSaving(true);
    setSaveResult(null);

    try {
      const result = await updateNotificationSettings(orgId, {
        send_welcome_email: data.send_welcome_email,
        send_booking_confirmation: data.send_booking_confirmation,
        send_class_reminder_24h: data.send_class_reminder_24h,
        send_class_reminder_2h: data.send_class_reminder_2h,
        send_class_cancelled: data.send_class_cancelled,
        send_subscription_expiring_30d: data.send_subscription_expiring_30d,
        send_subscription_expiring_7d: data.send_subscription_expiring_7d,
        send_subscription_expired: data.send_subscription_expired,
        from_name: data.from_name || null,
        reply_to_email: data.reply_to_email || null,
      });

      if (result.success) {
        setSaveResult({ type: 'success', message: 'Parametres de notifications enregistres' });
      } else {
        setSaveResult({ type: 'error', message: result.error || 'Erreur lors de l\'enregistrement' });
      }
    } catch {
      setSaveResult({ type: 'error', message: 'Erreur lors de l\'enregistrement' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendSubscriptionReminders = async (days: number) => {
    setIsSendingReminders(true);
    setReminderResult(null);

    try {
      const result = await sendSubscriptionExpirationReminders(orgId, days);
      setReminderResult({
        type: 'success',
        message: `${result.sent} email(s) envoye(s), ${result.skipped} ignore(s), ${result.errors} erreur(s)`,
      });
    } catch {
      setReminderResult({
        type: 'error',
        message: 'Erreur lors de l\'envoi des rappels',
      });
    }

    setIsSendingReminders(false);
  };

  const handleSendClassReminders = async () => {
    setIsSendingReminders(true);
    setReminderResult(null);

    try {
      const result = await sendTomorrowClassReminders(orgId);
      setReminderResult({
        type: 'success',
        message: `${result.sent} rappel(s) envoye(s), ${result.skipped} ignore(s), ${result.errors} erreur(s)`,
      });
    } catch {
      setReminderResult({
        type: 'error',
        message: 'Erreur lors de l\'envoi des rappels',
      });
    }

    setIsSendingReminders(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Parametres</h1>
        <p className="text-muted-foreground">
          Configurez votre organisation et vos preferences
        </p>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="h-4 w-4" />
            Organisation
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Facturation
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="discord" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Discord
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Securite
          </TabsTrigger>
          <TabsTrigger value="rgpd" className="gap-2">
            <FileText className="h-4 w-4" />
            RGPD
          </TabsTrigger>
        </TabsList>

        {/* Organization Tab */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informations de l&apos;organisation
              </CardTitle>
              <CardDescription>
                Les informations generales de votre salle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={orgForm.handleSubmit(handleSaveOrganization)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de la salle *</Label>
                    <Input
                      id="name"
                      {...orgForm.register('name')}
                      placeholder="Ma salle CrossFit"
                    />
                    {orgForm.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {orgForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email de contact</Label>
                    <Input
                      id="email"
                      type="email"
                      {...orgForm.register('email')}
                      placeholder="contact@masalle.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telephone</Label>
                    <Input
                      id="phone"
                      {...orgForm.register('phone')}
                      placeholder="01 23 45 67 89"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Site web</Label>
                    <Input
                      id="website"
                      {...orgForm.register('website')}
                      placeholder="https://masalle.com"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      {...orgForm.register('address')}
                      placeholder="123 rue du Sport, 75001 Paris"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Facturation & Paiements
              </CardTitle>
              <CardDescription>
                Gerez votre abonnement Skali Prog et configurez les paiements adherents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Configurez Stripe Connect pour recevoir les paiements de vos adherents et gerez votre abonnement platform.
              </p>
              <Link href="/dashboard/settings/billing">
                <Button>
                  Acceder a la facturation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configuration email
              </CardTitle>
              <CardDescription>
                Personnalisez l&apos;expediteur des emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSettings ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="from_name">Nom de l&apos;expediteur</Label>
                    <Input
                      id="from_name"
                      {...notifForm.register('from_name')}
                      placeholder="Ma Salle CrossFit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reply_to_email">Email de reponse</Label>
                    <Input
                      id="reply_to_email"
                      type="email"
                      {...notifForm.register('reply_to_email')}
                      placeholder="contact@masalle.com"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Auto Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Emails automatiques
              </CardTitle>
              <CardDescription>
                Configurez les emails envoyes automatiquement a vos membres
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSettings ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <form onSubmit={notifForm.handleSubmit(handleSaveNotifications)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email de bienvenue</Label>
                        <p className="text-sm text-muted-foreground">
                          Envoye lors de la creation d&apos;un nouveau membre
                        </p>
                      </div>
                      <Switch
                        checked={notifForm.watch('send_welcome_email')}
                        onCheckedChange={(checked) => notifForm.setValue('send_welcome_email', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Confirmation de reservation</Label>
                        <p className="text-sm text-muted-foreground">
                          Envoye lorsqu&apos;un membre s&apos;inscrit a un cours
                        </p>
                      </div>
                      <Switch
                        checked={notifForm.watch('send_booking_confirmation')}
                        onCheckedChange={(checked) => notifForm.setValue('send_booking_confirmation', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Rappel de cours (J-1)</Label>
                        <p className="text-sm text-muted-foreground">
                          Rappel envoye 24h avant le cours
                        </p>
                      </div>
                      <Switch
                        checked={notifForm.watch('send_class_reminder_24h')}
                        onCheckedChange={(checked) => notifForm.setValue('send_class_reminder_24h', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Rappel de cours (H-2)</Label>
                        <p className="text-sm text-muted-foreground">
                          Rappel envoye 2h avant le cours
                        </p>
                      </div>
                      <Switch
                        checked={notifForm.watch('send_class_reminder_2h')}
                        onCheckedChange={(checked) => notifForm.setValue('send_class_reminder_2h', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Annulation de cours</Label>
                        <p className="text-sm text-muted-foreground">
                          Notifie les inscrits si un cours est annule
                        </p>
                      </div>
                      <Switch
                        checked={notifForm.watch('send_class_cancelled')}
                        onCheckedChange={(checked) => notifForm.setValue('send_class_cancelled', checked)}
                      />
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-4">Alertes abonnement</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Alerte 30 jours avant expiration</Label>
                            <p className="text-sm text-muted-foreground">
                              Premier rappel pour renouvellement
                            </p>
                          </div>
                          <Switch
                            checked={notifForm.watch('send_subscription_expiring_30d')}
                            onCheckedChange={(checked) => notifForm.setValue('send_subscription_expiring_30d', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Alerte 7 jours avant expiration</Label>
                            <p className="text-sm text-muted-foreground">
                              Rappel urgent avant expiration
                            </p>
                          </div>
                          <Switch
                            checked={notifForm.watch('send_subscription_expiring_7d')}
                            onCheckedChange={(checked) => notifForm.setValue('send_subscription_expiring_7d', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Notification expiration</Label>
                            <p className="text-sm text-muted-foreground">
                              Email le jour de l&apos;expiration
                            </p>
                          </div>
                          <Switch
                            checked={notifForm.watch('send_subscription_expired')}
                            onCheckedChange={(checked) => notifForm.setValue('send_subscription_expired', checked)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {saveResult && (
                    <div
                      className={`rounded-lg p-3 text-sm flex items-center gap-2 ${
                        saveResult.type === 'success'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {saveResult.type === 'success' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {saveResult.message}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Manual Send Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Envoi manuel
              </CardTitle>
              <CardDescription>
                Declenchez manuellement l&apos;envoi de notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reminderResult && (
                <div
                  className={`rounded-lg p-3 text-sm flex items-center gap-2 ${
                    reminderResult.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {reminderResult.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {reminderResult.message}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-dashed">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <h4 className="font-medium">Rappels abonnements</h4>
                      <p className="text-sm text-muted-foreground">
                        Envoyer les alertes d&apos;expiration aux membres concernes
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendSubscriptionReminders(30)}
                          disabled={isSendingReminders}
                        >
                          30 jours
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendSubscriptionReminders(7)}
                          disabled={isSendingReminders}
                        >
                          7 jours
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <h4 className="font-medium">Rappels cours</h4>
                      <p className="text-sm text-muted-foreground">
                        Envoyer les rappels pour les cours de demain
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSendClassReminders}
                        disabled={isSendingReminders}
                      >
                        <Bell className="mr-2 h-4 w-4" />
                        Envoyer rappels demain
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discord Tab */}
        <TabsContent value="discord">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#5865f2]" />
                Integration Discord
              </CardTitle>
              <CardDescription>
                Publiez automatiquement vos WODs et notifications sur Discord
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Configurez les webhooks Discord pour publier automatiquement vos WODs,
                celebrer les achievements des membres, et envoyer des annonces.
              </p>
              <Link href="/dashboard/settings/discord">
                <Button>
                  Configurer Discord
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestion de l&apos;equipe
              </CardTitle>
              <CardDescription>
                Gerez les membres de votre staff et leurs permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Fonctionnalite a venir...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Securite
              </CardTitle>
              <CardDescription>
                Parametres de securite et authentification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Fonctionnalite a venir...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RGPD Tab */}
        <TabsContent value="rgpd">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Conformite RGPD
              </CardTitle>
              <CardDescription>
                Gerez les demandes d&apos;export et de suppression de donnees de vos membres
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Traitez les demandes RGPD de vos membres (export de donnees, suppression de compte),
                consultez les statistiques de consentement et le journal d&apos;audit.
              </p>
              <Link href="/dashboard/settings/rgpd">
                <Button>
                  Gerer la conformite RGPD
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
