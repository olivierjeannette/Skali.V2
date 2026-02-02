import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

type AuditLog = {
  id: string;
  actor_id: string | null;
  org_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor?: { email: string; full_name: string | null } | null;
  organization?: { name: string; slug: string } | null;
};

const eventTypeColors: Record<string, string> = {
  org_created: 'bg-green-100 text-green-800',
  org_updated: 'bg-blue-100 text-blue-800',
  org_suspended: 'bg-red-100 text-red-800',
  org_reactivated: 'bg-green-100 text-green-800',
  plan_created: 'bg-purple-100 text-purple-800',
  plan_updated: 'bg-purple-100 text-purple-800',
  subscription_created: 'bg-orange-100 text-orange-800',
  subscription_changed: 'bg-orange-100 text-orange-800',
  subscription_cancelled: 'bg-red-100 text-red-800',
  payment_received: 'bg-green-100 text-green-800',
  payment_failed: 'bg-red-100 text-red-800',
  coupon_created: 'bg-yellow-100 text-yellow-800',
  coupon_used: 'bg-yellow-100 text-yellow-800',
  super_admin_login: 'bg-gray-100 text-gray-800',
  settings_changed: 'bg-blue-100 text-blue-800',
};

const eventTypeLabels: Record<string, string> = {
  org_created: 'Organisation creee',
  org_updated: 'Organisation modifiee',
  org_suspended: 'Organisation suspendue',
  org_reactivated: 'Organisation reactivee',
  plan_created: 'Plan cree',
  plan_updated: 'Plan modifie',
  subscription_created: 'Abonnement cree',
  subscription_changed: 'Abonnement modifie',
  subscription_cancelled: 'Abonnement annule',
  payment_received: 'Paiement recu',
  payment_failed: 'Paiement echoue',
  coupon_created: 'Coupon cree',
  coupon_used: 'Coupon utilise',
  super_admin_login: 'Connexion admin',
  settings_changed: 'Parametres modifies',
};

export default async function AuditPage() {
  const supabase = await createClient();

  // Fetch audit logs with related data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: logs, error } = await (supabase as any)
    .from('platform_audit_log')
    .select(`
      *,
      actor:profiles!platform_audit_log_actor_id_fkey(email, full_name),
      organization:organizations!platform_audit_log_org_id_fkey(name, slug)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching audit logs:', error);
  }

  const auditLogs = (logs || []) as AuditLog[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Journal d&apos;audit</h1>
        <p className="text-muted-foreground">
          Historique des actions sur la plateforme
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activite recente</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune activite enregistree
            </p>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="secondary"
                        className={eventTypeColors[log.event_type] || 'bg-gray-100 text-gray-800'}
                      >
                        {eventTypeLabels[log.event_type] || log.event_type}
                      </Badge>
                      {log.organization && (
                        <span className="text-sm text-muted-foreground">
                          {log.organization.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm">
                      {log.actor?.full_name || log.actor?.email || 'Systeme'}
                      {log.entity_type && (
                        <span className="text-muted-foreground">
                          {' '}sur {log.entity_type}
                          {log.entity_id && ` #${log.entity_id.slice(0, 8)}`}
                        </span>
                      )}
                    </p>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(log.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                    {log.ip_address && (
                      <p className="text-xs">{log.ip_address}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
