'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, Play, Clock, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { triggerWorkflow, getWorkflowLogs } from '@/actions/workflows';
import type { Workflow, WorkflowRun, WorkflowLog } from '@/types/workflow.types';
import { useRouter } from 'next/navigation';

interface WorkflowRunsPageProps {
  workflow: Workflow;
  runs: WorkflowRun[];
}

const statusConfig = {
  pending: { icon: Clock, label: 'En attente', variant: 'secondary' as const },
  running: { icon: Loader2, label: 'En cours', variant: 'default' as const },
  completed: { icon: CheckCircle, label: 'Termine', variant: 'default' as const },
  failed: { icon: XCircle, label: 'Echoue', variant: 'destructive' as const },
  cancelled: { icon: XCircle, label: 'Annule', variant: 'secondary' as const },
  paused: { icon: AlertCircle, label: 'En pause', variant: 'outline' as const },
  waiting: { icon: Clock, label: 'En attente', variant: 'outline' as const },
};

export function WorkflowRunsPage({ workflow, runs }: WorkflowRunsPageProps) {
  const router = useRouter();
  const [isTriggering, setIsTriggering] = useState(false);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const handleTrigger = async () => {
    setIsTriggering(true);
    try {
      const result = await triggerWorkflow(workflow.id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || 'Erreur lors du declenchement');
      }
    } catch (error) {
      console.error('Error triggering workflow:', error);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleViewLogs = async (run: WorkflowRun) => {
    setSelectedRun(run);
    setIsLoadingLogs(true);
    try {
      const runLogs = await getWorkflowLogs(run.id);
      setLogs(runLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  // Stats
  const totalRuns = runs.length;
  const successfulRuns = runs.filter((r) => r.status === 'completed').length;
  const failedRuns = runs.filter((r) => r.status === 'failed').length;
  const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/workflows/${workflow.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{workflow.name}</h1>
            <p className="text-muted-foreground">Historique des executions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.refresh()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={handleTrigger} disabled={isTriggering || !workflow.is_active}>
            {isTriggering ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Executer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRuns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reussies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successfulRuns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Echouees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedRuns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux de succes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Executions recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucune execution pour le moment
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Declencheur</TableHead>
                  <TableHead>Debut</TableHead>
                  <TableHead>Duree</TableHead>
                  <TableHead>Erreur</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => {
                  const StatusIcon = statusConfig[run.status]?.icon || Clock;
                  const statusLabel = statusConfig[run.status]?.label || run.status;
                  const variant = statusConfig[run.status]?.variant || 'secondary';

                  return (
                    <TableRow key={run.id}>
                      <TableCell>
                        <Badge variant={variant} className="gap-1">
                          <StatusIcon className={`h-3 w-3 ${run.status === 'running' ? 'animate-spin' : ''}`} />
                          {statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{run.triggered_by}</span>
                      </TableCell>
                      <TableCell>
                        {run.started_at ? (
                          <div>
                            <div className="text-sm">
                              {format(new Date(run.started_at), 'dd/MM/yyyy HH:mm:ss', {
                                locale: fr,
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(run.started_at), {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{formatDuration(run.duration_ms)}</TableCell>
                      <TableCell>
                        {run.error_message ? (
                          <span className="text-red-600 text-sm truncate max-w-[200px] block">
                            {run.error_message}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewLogs(run)}
                        >
                          Voir logs
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Logs Dialog */}
      <Dialog open={!!selectedRun} onOpenChange={() => setSelectedRun(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Logs d&apos;execution</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {isLoadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun log disponible
              </div>
            ) : (
              <div className="space-y-2 font-mono text-sm">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2 rounded ${
                      log.level === 'error'
                        ? 'bg-red-50 text-red-900'
                        : log.level === 'warn'
                        ? 'bg-yellow-50 text-yellow-900'
                        : log.level === 'debug'
                        ? 'bg-gray-50 text-gray-600'
                        : 'bg-blue-50 text-blue-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-60">
                        {format(new Date(log.created_at), 'HH:mm:ss.SSS')}
                      </span>
                      <Badge
                        variant={
                          log.level === 'error'
                            ? 'destructive'
                            : log.level === 'warn'
                            ? 'outline'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {log.level}
                      </Badge>
                      {log.node_id && (
                        <span className="text-xs opacity-60">[{log.node_id}]</span>
                      )}
                    </div>
                    <div className="mt-1">{log.message}</div>
                    {Object.keys(log.data || {}).length > 0 && (
                      <pre className="mt-1 text-xs opacity-75 overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
