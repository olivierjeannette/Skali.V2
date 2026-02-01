'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Settings,
  History,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { WorkflowEditor } from '@/components/workflows/workflow-editor';
import {
  updateWorkflow,
  toggleWorkflowActive,
  triggerWorkflow,
  getWorkflowRuns,
} from '@/actions/workflows';
import type { Workflow, WorkflowCanvasData, WorkflowRun } from '@/types/workflow.types';
import { cn } from '@/lib/utils';

// =====================================================
// TYPES
// =====================================================

interface WorkflowEditorPageProps {
  workflow: Workflow;
}

// =====================================================
// HISTORY PANEL
// =====================================================

interface HistoryPanelProps {
  workflowId: string;
}

function HistoryPanel({ workflowId }: HistoryPanelProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  // Load runs on mount
  useState(() => {
    getWorkflowRuns(workflowId, 20).then((data) => {
      setRuns(data);
      setLoading(false);
    });
  });

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Chargement...</div>;
  }

  if (runs.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Aucune execution pour le moment
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {runs.map((run) => (
        <div
          key={run.id}
          className={cn(
            'p-3 rounded-lg border',
            run.status === 'completed' && 'border-green-200 bg-green-50',
            run.status === 'failed' && 'border-red-200 bg-red-50',
            run.status === 'running' && 'border-blue-200 bg-blue-50',
            run.status === 'pending' && 'border-gray-200 bg-gray-50'
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <Badge
              variant={
                run.status === 'completed'
                  ? 'default'
                  : run.status === 'failed'
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {run.status}
            </Badge>
            <span className="text-xs text-gray-500">
              {new Date(run.created_at).toLocaleString('fr-FR')}
            </span>
          </div>
          <div className="text-xs text-gray-600">
            Declenche par: {run.triggered_by}
          </div>
          {run.error_message && (
            <div className="text-xs text-red-600 mt-1 line-clamp-2">
              {run.error_message}
            </div>
          )}
          {run.duration_ms && (
            <div className="text-xs text-gray-500 mt-1">
              Duree: {run.duration_ms}ms
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function WorkflowEditorPage({ workflow }: WorkflowEditorPageProps) {
  const [name, setName] = useState(workflow.name);
  const [isActive, setIsActive] = useState(workflow.is_active);
  const [, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  // Save canvas data
  const handleSave = useCallback(
    async (canvasData: WorkflowCanvasData) => {
      setIsSaving(true);
      try {
        await updateWorkflow(workflow.id, {
          name,
          canvas_data: canvasData,
        });
      } finally {
        setIsSaving(false);
      }
    },
    [workflow.id, name]
  );

  // Toggle active status
  const handleToggleActive = useCallback(async () => {
    setIsToggling(true);
    try {
      const result = await toggleWorkflowActive(workflow.id, !isActive);
      if (result.success) {
        setIsActive(!isActive);
      }
    } finally {
      setIsToggling(false);
    }
  }, [workflow.id, isActive]);

  // Manual trigger
  const handleTrigger = useCallback(async () => {
    if (!isActive) {
      alert('Activez le workflow avant de le tester');
      return;
    }

    setIsTriggering(true);
    try {
      const result = await triggerWorkflow(workflow.id);
      if (result.success) {
        alert('Workflow declenche! Verifiez l\'historique pour voir le resultat.');
      } else {
        alert(`Erreur: ${result.error}`);
      }
    } finally {
      setIsTriggering(false);
    }
  }, [workflow.id, isActive]);

  // Save name on blur
  const handleNameBlur = useCallback(async () => {
    if (name !== workflow.name) {
      await updateWorkflow(workflow.id, { name });
    }
  }, [workflow.id, name, workflow.name]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/workflows">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Retour
            </Button>
          </Link>
          <div className="w-px h-6 bg-gray-200" />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            className="font-semibold border-none shadow-none h-auto py-1 px-2 text-lg focus-visible:ring-1 max-w-xs"
          />
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Actif' : 'Inactif'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle active */}
          <div className="flex items-center gap-2 mr-4">
            <Label htmlFor="active-switch" className="text-sm text-gray-600">
              {isActive ? 'Actif' : 'Inactif'}
            </Label>
            <Switch
              id="active-switch"
              checked={isActive}
              onCheckedChange={handleToggleActive}
              disabled={isToggling}
            />
          </div>

          {/* Manual trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTrigger}
            disabled={isTriggering || !isActive}
          >
            <Play className="w-4 h-4 mr-1" />
            {isTriggering ? 'En cours...' : 'Tester'}
          </Button>

          {/* History */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="w-4 h-4 mr-1" />
                Historique
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Historique des executions</SheetTitle>
                <SheetDescription>
                  Les 20 dernieres executions de ce workflow
                </SheetDescription>
              </SheetHeader>
              <HistoryPanel workflowId={workflow.id} />
            </SheetContent>
          </Sheet>

          {/* Settings */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Parametres du workflow</SheetTitle>
                <SheetDescription>
                  Configurez les options avancees
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <Label>Fuseau horaire</Label>
                  <Input value="Europe/Paris" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Executions max par jour</Label>
                  <Input
                    type="number"
                    defaultValue={workflow.settings.max_executions_per_day}
                    disabled
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Reessayer en cas d&apos;echec</Label>
                    <p className="text-xs text-gray-500">
                      Retente automatiquement les actions echouees
                    </p>
                  </div>
                  <Switch checked={workflow.settings.retry_failed} disabled />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifier en cas d&apos;echec</Label>
                    <p className="text-xs text-gray-500">
                      Recevez un email si le workflow echoue
                    </p>
                  </div>
                  <Switch
                    checked={workflow.settings.notifications.on_failure}
                    disabled
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1">
        <WorkflowEditor
          workflowId={workflow.id}
          initialData={workflow.canvas_data}
          onSave={handleSave}
          onTest={handleTrigger}
          isActive={isActive}
        />
      </div>
    </div>
  );
}
