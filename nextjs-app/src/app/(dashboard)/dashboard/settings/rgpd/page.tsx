'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
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
  Users,
  RefreshCw,
  BarChart3,
  History,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  getRgpdRequests,
  getPendingRgpdRequestsCount,
  processRgpdRequest,
  getConsentStats,
  getRecentAuditLogs,
} from '@/actions/rgpd';
import {
  CONSENT_CONFIG,
  type RgpdRequest,
  type RgpdRequestStatus,
  type RgpdRequestType,
  type ConsentType,
  type RgpdAuditLog,
} from '@/types/rgpd.types';

export default function RgpdAdminPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [requests, setRequests] = useState<RgpdRequest[]>([]);
  const [counts, setCounts] = useState({ pending: 0, urgent: 0, overdue: 0 });
  const [consentStats, setConsentStats] = useState<
    Array<{
      consent_type: ConsentType;
      granted_count: number;
      revoked_count: number;
      total_members: number;
    }>
  >([]);
  const [auditLogs, setAuditLogs] = useState<RgpdAuditLog[]>([]);
  const [statusFilter, setStatusFilter] = useState<RgpdRequestStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<RgpdRequestType | 'all'>('all');
  const [selectedRequest, setSelectedRequest] = useState<RgpdRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [requestsResult, countsResult, statsResult, logsResult] = await Promise.all([
        getRgpdRequests({
          status: statusFilter === 'all' ? undefined : statusFilter,
          type: typeFilter === 'all' ? undefined : typeFilter,
        }),
        getPendingRgpdRequestsCount(),
        getConsentStats(),
        getRecentAuditLogs(50),
      ]);

      if (requestsResult.success && requestsResult.data) {
        setRequests(requestsResult.data);
      }

      if (countsResult.success && countsResult.data) {
        setCounts(countsResult.data);
      }

      if (statsResult.success && statsResult.data) {
        setConsentStats(statsResult.data);
      }

      if (logsResult.success && logsResult.data) {
        setAuditLogs(logsResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    try {
      const result = await processRgpdRequest(selectedRequest.id, 'approve');

      if (result.success) {
        toast({ title: 'Demande approuvee', description: 'La demande a ete traitee.' });
        setShowApproveDialog(false);
        setSelectedRequest(null);
        loadData();
      } else {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) return;

    setIsProcessing(true);
    try {
      const result = await processRgpdRequest(selectedRequest.id, 'reject', rejectionReason);

      if (result.success) {
        toast({ title: 'Demande rejetee' });
        setShowRejectDialog(false);
        setSelectedRequest(null);
        setRejectionReason('');
        loadData();
      } else {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: RgpdRequestStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" /> En attente
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="default">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> En cours
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-600">
            <Check className="w-3 h-3 mr-1" /> Termine
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <X className="w-3 h-3 mr-1" /> Refuse
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline">
            <X className="w-3 h-3 mr-1" /> Annule
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRequestTypeIcon = (type: RgpdRequestType) => {
    switch (type) {
      case 'data_export':
        return <Download className="h-4 w-4" />;
      case 'data_deletion':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getRequestTypeLabel = (type: RgpdRequestType) => {
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

  const getUrgencyBadge = (dueDate: string) => {
    const daysRemaining = differenceInDays(parseISO(dueDate), new Date());

    if (daysRemaining < 0) {
      return (
        <Badge variant="destructive" className="ml-2">
          En retard ({Math.abs(daysRemaining)}j)
        </Badge>
      );
    }
    if (daysRemaining <= 7) {
      return (
        <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
          Urgent ({daysRemaining}j)
        </Badge>
      );
    }
    return null;
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'view':
        return 'Consultation';
      case 'export':
        return 'Export';
      case 'update':
        return 'Modification';
      case 'delete':
        return 'Suppression';
      case 'consent_change':
        return 'Changement consentement';
      default:
        return action;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Conformite RGPD
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerez les demandes de vos membres et assurez la conformite RGPD
          </p>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Demandes en attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.pending}</div>
            <p className="text-xs text-muted-foreground">A traiter sous 30 jours</p>
          </CardContent>
        </Card>

        <Card className={counts.urgent > 0 ? 'border-orange-200' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Urgentes (&lt; 7j)</CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${counts.urgent > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}
            />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${counts.urgent > 0 ? 'text-orange-600' : ''}`}>
              {counts.urgent}
            </div>
            <p className="text-xs text-muted-foreground">Moins de 7 jours restants</p>
          </CardContent>
        </Card>

        <Card className={counts.overdue > 0 ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En retard</CardTitle>
            <XCircle
              className={`h-4 w-4 ${counts.overdue > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
            />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${counts.overdue > 0 ? 'text-destructive' : ''}`}>
              {counts.overdue}
            </div>
            <p className="text-xs text-muted-foreground">Delai depasse</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests" className="gap-2">
            <FileText className="h-4 w-4" />
            Demandes ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="consents" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Consentements
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <History className="h-4 w-4" />
            Journal d&apos;audit
          </TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="w-48">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as RgpdRequestStatus | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="processing">En cours</SelectItem>
                  <SelectItem value="completed">Termine</SelectItem>
                  <SelectItem value="rejected">Refuse</SelectItem>
                  <SelectItem value="cancelled">Annule</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as RgpdRequestType | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="data_export">Export de donnees</SelectItem>
                  <SelectItem value="data_deletion">Suppression</SelectItem>
                  <SelectItem value="data_rectification">Rectification</SelectItem>
                  <SelectItem value="objection">Opposition</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Requests Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Echeance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucune demande
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRequestTypeIcon(request.request_type)}
                          <span>{getRequestTypeLabel(request.request_type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {request.member
                              ? `${request.member.first_name} ${request.member.last_name}`
                              : request.requester_name || 'Inconnu'}
                          </p>
                          <p className="text-sm text-muted-foreground">{request.requester_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {format(parseISO(request.created_at), 'd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {format(parseISO(request.due_date), 'd MMM yyyy', { locale: fr })}
                          {['pending', 'processing'].includes(request.status) &&
                            getUrgencyBadge(request.due_date)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {['pending', 'processing'].includes(request.status) && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowApproveDialog(true);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approuver
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowRejectDialog(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeter
                            </Button>
                          </div>
                        )}
                        {request.status === 'completed' && request.export_file_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={request.export_file_url}>
                              <Download className="h-4 w-4 mr-1" />
                              Fichier
                            </a>
                          </Button>
                        )}
                        {request.status === 'rejected' && request.rejection_reason && (
                          <span className="text-sm text-muted-foreground">
                            Motif: {request.rejection_reason}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Consents Tab */}
        <TabsContent value="consents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Statistiques des consentements
              </CardTitle>
              <CardDescription>Vue d&apos;ensemble des consentements de vos membres</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {consentStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune donnee de consentement
                </p>
              ) : (
                consentStats.map((stat) => {
                  const config = CONSENT_CONFIG[stat.consent_type];
                  const percentage =
                    stat.total_members > 0
                      ? Math.round((stat.granted_count / stat.total_members) * 100)
                      : 0;

                  return (
                    <div key={stat.consent_type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{config?.label || stat.consent_type}</p>
                          <p className="text-sm text-muted-foreground">
                            {config?.description || ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{percentage}%</p>
                          <p className="text-sm text-muted-foreground">
                            {stat.granted_count} / {stat.total_members} membres
                          </p>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Journal d&apos;audit RGPD
              </CardTitle>
              <CardDescription>
                Historique des acces et modifications des donnees personnelles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Aucun log d&apos;audit
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(parseISO(log.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getActionLabel(log.action)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{log.entity_type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {log.details ? JSON.stringify(log.details) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Approuver la demande
            </DialogTitle>
            <DialogDescription>
              Vous allez traiter cette demande{' '}
              {selectedRequest?.request_type === 'data_export'
                ? "d'export de donnees"
                : selectedRequest?.request_type === 'data_deletion'
                  ? 'de suppression de compte'
                  : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedRequest?.request_type === 'data_export' && (
              <p className="text-sm text-muted-foreground">
                Un fichier contenant toutes les donnees du membre sera genere et un lien de
                telechargement sera mis a disposition.
              </p>
            )}
            {selectedRequest?.request_type === 'data_deletion' && (
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm font-medium text-destructive">Attention :</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Le compte du membre sera anonymise. Cette action est irreversible. Les donnees
                  comptables seront conservees conformement aux obligations legales.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Rejeter la demande
            </DialogTitle>
            <DialogDescription>
              Indiquez le motif du rejet. Ce motif sera visible par le membre.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Motif du rejet *</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Ex: Demande incomplete, verification d'identite echouee..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing || !rejectionReason}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Separator />

      <p className="text-xs text-center text-muted-foreground">
        Conforme au Reglement General sur la Protection des Donnees (RGPD) - UE 2016/679
        <br />
        Delai de reponse legal: 30 jours maximum
      </p>
    </div>
  );
}
