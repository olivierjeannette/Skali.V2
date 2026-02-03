import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Database,
  Mail,
  CreditCard,
  Globe,
  Shield,
  Bell,
  Code,
} from 'lucide-react';

export default function SettingsPage() {
  // These would typically come from environment or database config
  const configStatus = {
    supabase: {
      configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      label: 'Supabase',
      description: 'Base de donnees et authentification',
    },
    stripe: {
      configured: !!process.env.STRIPE_SECRET_KEY,
      label: 'Stripe',
      description: 'Paiements et abonnements',
    },
    resend: {
      configured: !!process.env.RESEND_API_KEY,
      label: 'Resend',
      description: 'Envoi d\'emails transactionnels',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parametres</h1>
        <p className="text-gray-500">Configuration de la plateforme</p>
      </div>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Integrations
          </CardTitle>
          <CardDescription>
            Statut des services externes connectes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(configStatus).map(([key, config]) => (
              <div
                key={key}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {key === 'supabase' && (
                    <Database className="h-5 w-5 text-green-500" />
                  )}
                  {key === 'stripe' && (
                    <CreditCard className="h-5 w-5 text-purple-500" />
                  )}
                  {key === 'resend' && (
                    <Mail className="h-5 w-5 text-blue-500" />
                  )}
                  <div>
                    <p className="font-medium">{config.label}</p>
                    <p className="text-sm text-gray-500">{config.description}</p>
                  </div>
                </div>
                <Badge
                  variant={config.configured ? 'default' : 'destructive'}
                  className={
                    config.configured ? 'bg-green-500' : 'bg-red-500'
                  }
                >
                  {config.configured ? 'Connecte' : 'Non configure'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Platform Settings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="font-medium">Nom de la plateforme</p>
                <p className="text-sm text-gray-500">Affiche dans les emails</p>
              </div>
              <span className="text-gray-700">Skali Prog</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="font-medium">URL de l&apos;application</p>
                <p className="text-sm text-gray-500">Domaine principal</p>
              </div>
              <span className="text-gray-700">
                {process.env.NEXT_PUBLIC_APP_URL || 'Non defini'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Environnement</p>
                <p className="text-sm text-gray-500">Mode d&apos;execution</p>
              </div>
              <Badge
                variant={
                  process.env.NODE_ENV === 'production'
                    ? 'default'
                    : 'secondary'
                }
              >
                {process.env.NODE_ENV || 'development'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Securite
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="font-medium">Authentification</p>
                <p className="text-sm text-gray-500">Provider d&apos;auth</p>
              </div>
              <Badge className="bg-green-500">Supabase Auth</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="font-medium">RLS (Row Level Security)</p>
                <p className="text-sm text-gray-500">Protection des donnees</p>
              </div>
              <Badge className="bg-green-500">Active</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">HTTPS</p>
                <p className="text-sm text-gray-500">Chiffrement SSL</p>
              </div>
              <Badge className="bg-green-500">Force</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Emails
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="font-medium">Provider</p>
                <p className="text-sm text-gray-500">Service d&apos;envoi</p>
              </div>
              <span className="text-gray-700">Resend</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="font-medium">Email expediteur</p>
                <p className="text-sm text-gray-500">Adresse from</p>
              </div>
              <span className="text-gray-700">noreply@skaliprog.com</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Templates</p>
                <p className="text-sm text-gray-500">Modeles d&apos;email</p>
              </div>
              <Badge variant="outline">5 actifs</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="font-medium">Push notifications</p>
                <p className="text-sm text-gray-500">PWA notifications</p>
              </div>
              <Badge className="bg-green-500">Active</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="font-medium">Discord webhooks</p>
                <p className="text-sm text-gray-500">Alertes Discord</p>
              </div>
              <Badge variant="outline">Optionnel</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Emails automatiques</p>
                <p className="text-sm text-gray-500">Workflows</p>
              </div>
              <Badge className="bg-green-500">Active</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-orange-500 mt-0.5" />
            <div>
              <p className="font-medium text-orange-800">
                Configuration avancee
              </p>
              <p className="text-sm text-orange-700">
                Pour modifier les parametres avances (variables d&apos;environnement,
                limites, etc.), modifiez le fichier <code>.env</code> et
                redemarrez l&apos;application.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
