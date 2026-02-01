'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  Clock,
  Dumbbell,
  Trophy,
  Bell,
  Megaphone,
} from 'lucide-react';
import Link from 'next/link';
import {
  getDiscordConfig,
  updateDiscordConfig,
  testDiscordWebhook,
  getDiscordLogs,
  getDiscordLogStats,
  type DiscordLog,
} from '@/actions/discord';
import { useAuth } from '@/hooks/useAuth';

const DAYS_OPTIONS = [
  { value: 'monday', label: 'Lundi' },
  { value: 'tuesday', label: 'Mardi' },
  { value: 'wednesday', label: 'Mercredi' },
  { value: 'thursday', label: 'Jeudi' },
  { value: 'friday', label: 'Vendredi' },
  { value: 'saturday', label: 'Samedi' },
  { value: 'sunday', label: 'Dimanche' },
];

const discordConfigSchema = z.object({
  webhook_url: z.string().url('URL invalide').optional().or(z.literal('')),
  wod_channel_webhook: z.string().url('URL invalide').optional().or(z.literal('')),
  auto_post_wod: z.boolean(),
  post_wod_time: z.string(),
  post_wod_days: z.array(z.string()),
  notification_types: z.object({
    welcome: z.boolean(),
    class_reminder: z.boolean(),
    subscription_alert: z.boolean(),
    achievement: z.boolean(),
    announcement: z.boolean(),
  }),
  is_active: z.boolean(),
});

type DiscordConfigFormData = z.infer<typeof discordConfigSchema>;

const DEMO_ORG_ID = 'demo-org-id';

export default function DiscordSettingsPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || DEMO_ORG_ID;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [logs, setLogs] = useState<DiscordLog[]>([]);
  const [stats, setStats] = useState<{ total: number; sent: number; failed: number }>({ total: 0, sent: 0, failed: 0 });

  const form = useForm<DiscordConfigFormData>({
    resolver: zodResolver(discordConfigSchema),
    defaultValues: {
      webhook_url: '',
      wod_channel_webhook: '',
      auto_post_wod: false,
      post_wod_time: '06:00',
      post_wod_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      notification_types: {
        welcome: true,
        class_reminder: false,
        subscription_alert: false,
        achievement: true,
        announcement: true,
      },
      is_active: true,
    },
  });

  // Load config and logs
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [config, logsData, statsData] = await Promise.all([
          getDiscordConfig(orgId),
          getDiscordLogs(orgId, { limit: 10 }),
          getDiscordLogStats(orgId),
        ]);

        form.reset({
          webhook_url: config.webhook_url || '',
          wod_channel_webhook: config.wod_channel_webhook || '',
          auto_post_wod: config.auto_post_wod,
          post_wod_time: config.post_wod_time?.slice(0, 5) || '06:00',
          post_wod_days: config.post_wod_days,
          notification_types: config.notification_types,
          is_active: config.is_active,
        });

        setLogs(logsData.data);
        setStats(statsData);
      } catch (error) {
        console.error('Error loading Discord config:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const handleSave = async (data: DiscordConfigFormData) => {
    setIsSaving(true);
    setSaveResult(null);

    try {
      const result = await updateDiscordConfig(orgId, {
        webhook_url: data.webhook_url || null,
        wod_channel_webhook: data.wod_channel_webhook || null,
        auto_post_wod: data.auto_post_wod,
        post_wod_time: data.post_wod_time + ':00',
        post_wod_days: data.post_wod_days,
        notification_types: data.notification_types,
        is_active: data.is_active,
      });

      if (result.success) {
        setSaveResult({ type: 'success', message: 'Configuration Discord enregistree' });
      } else {
        setSaveResult({ type: 'error', message: result.error || 'Erreur lors de l\'enregistrement' });
      }
    } catch {
      setSaveResult({ type: 'error', message: 'Erreur lors de l\'enregistrement' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    const webhookUrl = form.getValues('webhook_url');
    if (!webhookUrl) {
      setTestResult({ type: 'error', message: 'Entrez une URL de webhook' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testDiscordWebhook(webhookUrl);
      if (result.success) {
        setTestResult({ type: 'success', message: 'Test envoye avec succes ! Verifiez votre channel Discord.' });
      } else {
        setTestResult({ type: 'error', message: result.error || 'Erreur lors du test' });
      }
    } catch {
      setTestResult({ type: 'error', message: 'Erreur lors du test' });
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-500">Envoye</Badge>;
      case 'failed':
        return <Badge variant="destructive">Echec</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'wod':
        return <Dumbbell className="h-4 w-4" />;
      case 'welcome':
        return <Bell className="h-4 w-4" />;
      case 'achievement':
        return <Trophy className="h-4 w-4" />;
      case 'announcement':
        return <Megaphone className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-[#5865f2]" />
            Integration Discord
          </h1>
          <p className="text-muted-foreground">
            Publiez automatiquement vos WODs et notifications sur Discord
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Messages total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            <p className="text-sm text-muted-foreground">Envoyes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-sm text-muted-foreground">Echecs</p>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
        {/* Main Toggle */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Activer Discord</CardTitle>
                <CardDescription>
                  Activez ou desactivez l&apos;integration Discord
                </CardDescription>
              </div>
              <Switch
                checked={form.watch('is_active')}
                onCheckedChange={(checked) => form.setValue('is_active', checked)}
              />
            </div>
          </CardHeader>
        </Card>

        {/* Webhook Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Webhook</CardTitle>
            <CardDescription>
              Configurez les webhooks Discord pour recevoir les messages.{' '}
              <a
                href="https://support.discord.com/hc/fr/articles/228383668-Utiliser-les-Webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Comment creer un webhook
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook_url">Webhook principal</Label>
              <div className="flex gap-2">
                <Input
                  id="webhook_url"
                  {...form.register('webhook_url')}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestWebhook}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="ml-2">Tester</span>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Utilisez ce webhook pour les notifications generales
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wod_channel_webhook">Webhook WOD (optionnel)</Label>
              <Input
                id="wod_channel_webhook"
                {...form.register('wod_channel_webhook')}
                placeholder="https://discord.com/api/webhooks/..."
              />
              <p className="text-sm text-muted-foreground">
                Si defini, les WODs seront publies sur ce channel separe
              </p>
            </div>

            {testResult && (
              <div
                className={`rounded-lg p-3 text-sm flex items-center gap-2 ${
                  testResult.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {testResult.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {testResult.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auto-post WOD */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  Publication automatique des WODs
                </CardTitle>
                <CardDescription>
                  Publiez automatiquement le WOD du jour sur Discord
                </CardDescription>
              </div>
              <Switch
                checked={form.watch('auto_post_wod')}
                onCheckedChange={(checked) => form.setValue('auto_post_wod', checked)}
              />
            </div>
          </CardHeader>
          {form.watch('auto_post_wod') && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="post_wod_time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Heure de publication
                </Label>
                <Input
                  id="post_wod_time"
                  type="time"
                  {...form.register('post_wod_time')}
                  className="w-32"
                />
              </div>

              <div className="space-y-2">
                <Label>Jours de publication</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OPTIONS.map((day) => (
                    <label
                      key={day.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={form.watch('post_wod_days').includes(day.value)}
                        onCheckedChange={(checked) => {
                          const current = form.getValues('post_wod_days');
                          if (checked) {
                            form.setValue('post_wod_days', [...current, day.value]);
                          } else {
                            form.setValue('post_wod_days', current.filter((d) => d !== day.value));
                          }
                        }}
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Notification Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Types de notifications
            </CardTitle>
            <CardDescription>
              Choisissez quelles notifications envoyer sur Discord
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Nouveau membre</Label>
                <p className="text-sm text-muted-foreground">
                  Annonce quand un nouveau membre rejoint la salle
                </p>
              </div>
              <Switch
                checked={form.watch('notification_types.welcome')}
                onCheckedChange={(checked) =>
                  form.setValue('notification_types.welcome', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Rappels de cours</Label>
                <p className="text-sm text-muted-foreground">
                  Annonce les cours qui commencent bientot
                </p>
              </div>
              <Switch
                checked={form.watch('notification_types.class_reminder')}
                onCheckedChange={(checked) =>
                  form.setValue('notification_types.class_reminder', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Achievements</Label>
                <p className="text-sm text-muted-foreground">
                  Celebre les PRs et accomplissements des membres
                </p>
              </div>
              <Switch
                checked={form.watch('notification_types.achievement')}
                onCheckedChange={(checked) =>
                  form.setValue('notification_types.achievement', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Annonces</Label>
                <p className="text-sm text-muted-foreground">
                  Permet d&apos;envoyer des annonces manuelles
                </p>
              </div>
              <Switch
                checked={form.watch('notification_types.announcement')}
                onCheckedChange={(checked) =>
                  form.setValue('notification_types.announcement', checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
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

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Messages recents</CardTitle>
          <CardDescription>
            Les 10 derniers messages envoyes sur Discord
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun message envoye pour le moment
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMessageTypeIcon(log.message_type)}
                        <span className="capitalize">{log.message_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>
                      {new Date(log.created_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {log.error_message || (log.discord_message_id ? `ID: ${log.discord_message_id.slice(0, 8)}...` : '-')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
