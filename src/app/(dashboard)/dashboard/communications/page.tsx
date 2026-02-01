'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  MessageSquare,
  Mail,
  Search,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { getEmailLogs, getEmailStats, type EmailLog, type EmailStatus, type EmailTemplateType } from '@/actions/email-logs';
import { sendCustomEmail } from '@/actions/notifications';
import { getMembers } from '@/actions/members';

const templateLabels: Record<string, string> = {
  welcome: 'Bienvenue',
  booking_confirmation: 'Confirmation resa',
  class_reminder: 'Rappel cours',
  class_cancelled: 'Cours annule',
  subscription_expiring: 'Expiration abo',
  subscription_expired: 'Abo expire',
  payment_confirmation: 'Paiement',
  password_reset: 'Reset mdp',
  custom: 'Email manuel',
};

const statusConfig: Record<EmailStatus, { label: string; color: string; icon: React.ElementType }> = {
  delivered: { label: 'Envoye', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  sent: { label: 'Envoye', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  failed: { label: 'Echec', color: 'bg-red-100 text-red-700', icon: XCircle },
  bounced: { label: 'Rejete', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
};

// TODO: Replace with actual org ID from auth context
const DEMO_ORG_ID = 'demo-org-id';

export default function CommunicationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
    byTemplate: {} as Record<string, number>,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Send email dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [members, setMembers] = useState<Array<{ id: string; email: string; first_name: string; last_name: string }>>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [logsResult, statsResult] = await Promise.all([
        getEmailLogs(DEMO_ORG_ID, {
          status: statusFilter !== 'all' ? statusFilter as EmailStatus : undefined,
          templateType: templateFilter !== 'all' ? templateFilter as EmailTemplateType : undefined,
          search: searchQuery || undefined,
        }),
        getEmailStats(DEMO_ORG_ID),
      ]);
      setLogs(logsResult.logs);
      setStats(statsResult);
    } catch (error) {
      console.error('Error loading communications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, templateFilter, searchQuery]);

  // Load members for send dialog
  const loadMembers = useCallback(async () => {
    try {
      const result = await getMembers(DEMO_ORG_ID);
      const membersWithEmail = result
        .filter((m): m is typeof m & { email: string } => !!m.email)
        .map(m => ({
          id: m.id,
          email: m.email,
          first_name: m.first_name,
          last_name: m.last_name || '',
        }));
      setMembers(membersWithEmail);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (isDialogOpen && members.length === 0) {
      loadMembers();
    }
  }, [isDialogOpen, members.length, loadMembers]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== '') {
        loadData();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, loadData]);

  const handleSendEmail = async () => {
    if (!selectedMemberId || !emailSubject || !emailContent) {
      setSendError('Veuillez remplir tous les champs');
      return;
    }

    const member = members.find(m => m.id === selectedMemberId);
    if (!member) {
      setSendError('Membre non trouve');
      return;
    }

    setIsSending(true);
    setSendError('');

    try {
      const result = await sendCustomEmail(
        {
          id: member.id,
          email: member.email,
          firstName: member.first_name,
          lastName: member.last_name,
        },
        DEMO_ORG_ID,
        emailSubject,
        emailContent
      );

      if (result.success) {
        setIsDialogOpen(false);
        setSelectedMemberId('');
        setEmailSubject('');
        setEmailContent('');
        loadData(); // Refresh list
      } else {
        setSendError(result.error || 'Erreur lors de l\'envoi');
      }
    } catch {
      setSendError('Erreur lors de l\'envoi');
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communications</h1>
          <p className="text-muted-foreground">
            Historique des emails envoyes a vos membres
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="mr-2 h-4 w-4" />
                Nouvel email
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Envoyer un email</DialogTitle>
                <DialogDescription>
                  Envoyez un email personnalise a un membre
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="member">Destinataire</Label>
                  <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionnez un membre" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.first_name} {member.last_name} ({member.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subject">Sujet</Label>
                  <Input
                    id="subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Sujet de l'email"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Message</Label>
                  <Textarea
                    id="content"
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder="Contenu de l'email..."
                    rows={6}
                  />
                </div>
                {sendError && (
                  <p className="text-sm text-red-500">{sendError}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSendEmail} disabled={isSending}>
                  {isSending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Envoyer
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total envoyes</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivres</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Echecs</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email ou sujet..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="delivered">Delivres</SelectItem>
                <SelectItem value="sent">Envoyes</SelectItem>
                <SelectItem value="failed">Echecs</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="bounced">Rejetes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type d'email" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="welcome">Bienvenue</SelectItem>
                <SelectItem value="booking_confirmation">Confirmation resa</SelectItem>
                <SelectItem value="class_reminder">Rappel cours</SelectItem>
                <SelectItem value="class_cancelled">Cours annule</SelectItem>
                <SelectItem value="subscription_expiring">Expiration abo</SelectItem>
                <SelectItem value="custom">Email manuel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Communications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Historique
          </CardTitle>
          <CardDescription>
            {logs.length} communication(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Aucune communication trouvee
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const status = statusConfig[log.status] || statusConfig.pending;
                    const StatusIcon = status.icon;

                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{log.recipient_name || 'Inconnu'}</p>
                            <p className="text-sm text-muted-foreground">{log.recipient_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {log.subject}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {templateLabels[log.template_type] || log.template_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status.color} gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(log.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
