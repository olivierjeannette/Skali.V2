'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Shield,
  Download,
  Trash2,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Clock,
  FileText,
  Bell,
  Cookie,
  Mail,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMemberAuth } from '@/hooks/useMemberAuth';
import {
  getMemberConsents,
  updateMyConsents,
  getMyRgpdRequests,
  requestMyDataExport,
  requestAccountDeletion,
  cancelMyRgpdRequest,
} from '@/actions/rgpd';
import {
  CONSENT_CONFIG,
  type ConsentType,
  type RgpdRequest,
} from '@/types/rgpd.types';

export default function MemberPrivacyPage() {
  const { toast } = useToast();
  const { member } = useMemberAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [consents, setConsents] = useState<Record<ConsentType, boolean>>({} as Record<ConsentType, boolean>);
  const [requests, setRequests] = useState<RgpdRequest[]>([]);
  const [deleteReason, setDeleteReason] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const loadData = useCallback(async () => {
    if (!member) return;

    setIsLoading(true);
    try {
      const [consentsResult, requestsResult] = await Promise.all([
        getMemberConsents(member.id),
        getMyRgpdRequests(),
      ]);

      if (consentsResult.success && consentsResult.data) {
        setConsents(consentsResult.data);
      }

      if (requestsResult.success && requestsResult.data) {
        setRequests(requestsResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [member]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConsentToggle = async (type: ConsentType, granted: boolean) => {
    setIsSaving(true);
    try {
      const result = await updateMyConsents([{ type, granted }]);

      if (result.success) {
        setConsents((prev) => ({ ...prev, [type]: granted }));
        toast({
          title: 'Preference mise a jour',
          description: granted ? 'Consentement accorde' : 'Consentement retire',
        });
      } else {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportRequest = async () => {
    setIsSaving(true);
    try {
      const result = await requestMyDataExport();

      if (result.success) {
        toast({
          title: 'Demande envoyee',
          description: 'Vous recevrez vos donnees sous 30 jours.',
        });
        setShowExportDialog(false);
        loadData();
      } else {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRequest = async () => {
    setIsSaving(true);
    try {
      const result = await requestAccountDeletion(deleteReason);

      if (result.success) {
        toast({
          title: 'Demande envoyee',
          description: 'Votre demande de suppression sera traitee sous 30 jours.',
        });
        setShowDeleteDialog(false);
        setDeleteReason('');
        loadData();
      } else {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    setIsSaving(true);
    try {
      const result = await cancelMyRgpdRequest(requestId);

      if (result.success) {
        toast({
          title: 'Demande annulee',
        });
        loadData();
      } else {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>;
      case 'processing':
        return <Badge variant="default"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> En cours</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><Check className="w-3 h-3 mr-1" /> Termine</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Refuse</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><X className="w-3 h-3 mr-1" /> Annule</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'data_export':
        return 'Export de donnees';
      case 'data_deletion':
        return 'Suppression de compte';
      case 'data_rectification':
        return 'Rectification';
      case 'processing_restriction':
        return 'Limitation du traitement';
      case 'objection':
        return 'Opposition';
      default:
        return type;
    }
  };

  // Group consents by category
  const marketingConsents = Object.values(CONSENT_CONFIG).filter((c) => c.category === 'marketing');
  const cookieConsents = Object.values(CONSENT_CONFIG).filter((c) => c.category === 'cookies');

  const pendingExportRequest = requests.find(
    (r) => r.request_type === 'data_export' && ['pending', 'processing'].includes(r.status)
  );
  const pendingDeleteRequest = requests.find(
    (r) => r.request_type === 'data_deletion' && ['pending', 'processing'].includes(r.status)
  );

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 md:ml-64 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Vie privee et donnees
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerez vos preferences de confidentialite et exercez vos droits RGPD
        </p>
      </div>

      {/* Marketing Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Preferences de communication
          </CardTitle>
          <CardDescription>
            Choisissez comment vous souhaitez etre contacte pour les offres et actualites
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {marketingConsents.map((config) => (
            <div key={config.type} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={config.type} className="flex items-center gap-2">
                  {config.type === 'marketing_email' && <Mail className="h-4 w-4" />}
                  {config.type === 'marketing_sms' && <MessageSquare className="h-4 w-4" />}
                  {config.type === 'marketing_push' && <Bell className="h-4 w-4" />}
                  {config.label}
                </Label>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
              <Switch
                id={config.type}
                checked={consents[config.type] || false}
                onCheckedChange={(checked) => handleConsentToggle(config.type, checked)}
                disabled={isSaving || config.required}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cookie Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cookie className="h-5 w-5" />
            Preferences de cookies
          </CardTitle>
          <CardDescription>
            Gerez vos preferences pour les cookies utilises sur le site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cookieConsents.map((config) => (
            <div key={config.type} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={config.type}>{config.label}</Label>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
              <Switch
                id={config.type}
                checked={config.required ? true : consents[config.type] || false}
                onCheckedChange={(checked) => handleConsentToggle(config.type, checked)}
                disabled={isSaving || config.required}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* RGPD Rights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Vos droits RGPD
          </CardTitle>
          <CardDescription>
            Conformement au RGPD, vous pouvez exercer vos droits sur vos donnees personnelles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Data */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exporter mes donnees
              </h4>
              <p className="text-sm text-muted-foreground">
                Recevez une copie de toutes vos donnees personnelles
              </p>
            </div>
            {pendingExportRequest ? (
              <div className="text-right">
                {getStatusBadge(pendingExportRequest.status)}
                {pendingExportRequest.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1"
                    onClick={() => handleCancelRequest(pendingExportRequest.id)}
                    disabled={isSaving}
                  >
                    Annuler
                  </Button>
                )}
              </div>
            ) : (
              <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Demander
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Exporter mes donnees</DialogTitle>
                    <DialogDescription>
                      Vous recevrez un fichier contenant toutes vos donnees personnelles
                      (profil, abonnements, reservations, scores, etc.) dans un delai
                      maximum de 30 jours.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                      Les donnees seront disponibles au format JSON, compatible avec
                      d&apos;autres services.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleExportRequest} disabled={isSaving}>
                      {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Confirmer la demande
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Delete Account */}
          <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
            <div>
              <h4 className="font-medium flex items-center gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                Supprimer mon compte
              </h4>
              <p className="text-sm text-muted-foreground">
                Demander la suppression definitive de vos donnees
              </p>
            </div>
            {pendingDeleteRequest ? (
              <div className="text-right">
                {getStatusBadge(pendingDeleteRequest.status)}
                {pendingDeleteRequest.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1"
                    onClick={() => handleCancelRequest(pendingDeleteRequest.id)}
                    disabled={isSaving}
                  >
                    Annuler
                  </Button>
                )}
              </div>
            ) : (
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Supprimer mon compte
                    </DialogTitle>
                    <DialogDescription>
                      Cette action est irreversible. Toutes vos donnees personnelles seront
                      supprimees ou anonymisees.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="p-3 bg-destructive/10 rounded-lg text-sm">
                      <p className="font-medium text-destructive">Attention :</p>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                        <li>Votre profil sera anonymise</li>
                        <li>Vos reservations et scores seront supprimes</li>
                        <li>Cette action prendra jusqu&apos;a 30 jours</li>
                        <li>Certaines donnees comptables seront conservees (obligation legale)</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delete-reason">Raison (optionnel)</Label>
                      <Textarea
                        id="delete-reason"
                        placeholder="Pourquoi souhaitez-vous supprimer votre compte ?"
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                      Annuler
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteRequest}
                      disabled={isSaving}
                    >
                      {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Confirmer la suppression
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request History */}
      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historique des demandes</CardTitle>
            <CardDescription>Suivi de vos demandes RGPD</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{getRequestTypeLabel(request.request_type)}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(request.created_at), "d MMMM yyyy 'a' HH:mm", {
                        locale: fr,
                      })}
                    </p>
                    {request.rejection_reason && (
                      <p className="text-sm text-destructive mt-1">
                        Motif: {request.rejection_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    {request.export_file_url && request.status === 'completed' && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={request.export_file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Telecharger
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legal Links */}
      <Card>
        <CardHeader>
          <CardTitle>Documents legaux</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="privacy">
              <AccordionTrigger>Politique de confidentialite</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Nous collectons et traitons vos donnees personnelles pour vous fournir
                  nos services de gestion de salle de sport. Vos donnees sont stockees
                  de maniere securisee et ne sont jamais vendues a des tiers.
                </p>
                <p>
                  Pour toute question concernant vos donnees, contactez-nous a l&apos;adresse
                  indiquee dans les conditions generales.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="terms">
              <AccordionTrigger>Conditions generales d&apos;utilisation</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                <p>
                  En utilisant ce service, vous acceptez nos conditions generales
                  d&apos;utilisation. Ces conditions regissent votre utilisation de la
                  plateforme et definissent vos droits et obligations.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="cookies">
              <AccordionTrigger>Politique de cookies</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Cookies essentiels :</strong> Necessaires au fonctionnement du
                  site (authentification, preferences).
                </p>
                <p>
                  <strong>Cookies analytiques :</strong> Nous aident a comprendre comment
                  vous utilisez le site pour l&apos;ameliorer.
                </p>
                <p>
                  <strong>Cookies marketing :</strong> Utilises pour personnaliser les
                  publicites (desactives par defaut).
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Separator />

      <p className="text-xs text-center text-muted-foreground">
        Conforme au Reglement General sur la Protection des Donnees (RGPD) - UE 2016/679
      </p>
    </div>
  );
}
