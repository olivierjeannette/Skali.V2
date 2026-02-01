'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, MoreVertical, Play, Pause, Copy, Trash2,
  Workflow, Zap, CheckCircle, XCircle, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
  toggleWorkflowActive,
  createWorkflowFromTemplate,
} from '@/actions/workflows';
import type { WorkflowWithStats, WorkflowTemplate } from '@/types/workflow.types';
import { cn } from '@/lib/utils';

// =====================================================
// TYPES
// =====================================================

interface WorkflowsManagerProps {
  initialWorkflows: WorkflowWithStats[];
  templates: WorkflowTemplate[];
  stats: {
    total_workflows: number;
    active_workflows: number;
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
  };
}

// =====================================================
// STATS CARDS
// =====================================================

function StatsCards({ stats }: { stats: WorkflowsManagerProps['stats'] }) {
  const successRate = stats.total_executions > 0
    ? Math.round((stats.successful_executions / stats.total_executions) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Workflows</CardDescription>
          <CardTitle className="text-3xl">{stats.total_workflows}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">
            {stats.active_workflows} actifs
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Executions totales</CardDescription>
          <CardTitle className="text-3xl">{stats.total_executions}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">
            Depuis le debut
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Taux de succes</CardDescription>
          <CardTitle className="text-3xl">{successRate}%</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-xs">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span className="text-green-600">{stats.successful_executions}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <XCircle className="w-3 h-3 text-red-500" />
            <span className="text-red-600">{stats.failed_executions}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Workflows actifs</CardDescription>
          <CardTitle className="text-3xl">{stats.active_workflows}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">
            Sur {stats.total_workflows} total
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================
// WORKFLOW CARD
// =====================================================

interface WorkflowCardProps {
  workflow: WorkflowWithStats;
  onEdit: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

function WorkflowCard({
  workflow,
  onEdit,
  onToggle,
  onDuplicate,
  onDelete,
}: WorkflowCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        !workflow.is_active && 'opacity-60'
      )}
      onClick={() => onEdit(workflow.id)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${workflow.color}20` }}
            >
              <Workflow className="w-5 h-5" style={{ color: workflow.color }} />
            </div>
            <div>
              <CardTitle className="text-base">{workflow.name}</CardTitle>
              {workflow.description && (
                <CardDescription className="text-xs line-clamp-1">
                  {workflow.description}
                </CardDescription>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(workflow.id, !workflow.is_active);
                }}
              >
                {workflow.is_active ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Desactiver
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Activer
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(workflow.id);
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Dupliquer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(workflow.id);
                }}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
              {workflow.is_active ? 'Actif' : 'Inactif'}
            </Badge>
            {workflow.tags.length > 0 && (
              <Badge variant="outline">{workflow.tags[0]}</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {workflow.total_executions} exec. | {workflow.success_rate}% succes
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// TEMPLATE PICKER
// =====================================================

interface TemplatePickerProps {
  templates: WorkflowTemplate[];
  onSelect: (template: WorkflowTemplate) => void;
  onClose: () => void;
}

function TemplatePicker({ templates, onSelect, onClose }: TemplatePickerProps) {
  const officialTemplates = templates.filter((t) => t.is_official);
  const customTemplates = templates.filter((t) => !t.is_official);

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Choisir un template</DialogTitle>
        <DialogDescription>
          Commencez avec un template pre-configure ou creez un workflow vide
        </DialogDescription>
      </DialogHeader>

      {/* Official templates */}
      {officialTemplates.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Templates officiels
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {officialTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => onSelect(template)}
              >
                <CardHeader className="p-4">
                  <CardTitle className="text-sm">{template.name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2">
                    {template.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Custom templates */}
      {customTemplates.length > 0 && (
        <div className="space-y-3 mt-4">
          <h4 className="text-sm font-medium">Vos templates</h4>
          <div className="grid grid-cols-2 gap-3">
            {customTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => onSelect(template)}
              >
                <CardHeader className="p-4">
                  <CardTitle className="text-sm">{template.name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2">
                    {template.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button
          onClick={() =>
            onSelect({
              id: 'blank',
              name: 'Workflow vide',
              description: '',
              category: '',
              icon: 'workflow',
              nodes_config: [],
              edges_config: [],
              settings: {},
              is_official: false,
              usage_count: 0,
              created_at: '',
              updated_at: '',
            })
          }
        >
          <Plus className="w-4 h-4 mr-2" />
          Workflow vide
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function WorkflowsManager({
  initialWorkflows,
  templates,
  stats,
}: WorkflowsManagerProps) {
  const router = useRouter();
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Filter workflows by search
  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handlers
  const handleEdit = useCallback((id: string) => {
    router.push(`/dashboard/workflows/${id}`);
  }, [router]);

  const handleToggle = useCallback(async (id: string, isActive: boolean) => {
    const result = await toggleWorkflowActive(id, isActive);
    if (result.success) {
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, is_active: isActive } : w
        )
      );
    }
  }, []);

  const handleDuplicate = useCallback(async (id: string) => {
    const workflow = workflows.find((w) => w.id === id);
    if (!workflow) return;

    const result = await duplicateWorkflow(id, `${workflow.name} (copie)`);
    if (result.success && result.data) {
      setWorkflows((prev) => [
        { ...result.data!, success_rate: 0 },
        ...prev,
      ]);
    }
  }, [workflows]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Supprimer ce workflow ?')) return;

    const result = await deleteWorkflow(id);
    if (result.success) {
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    }
  }, []);

  const handleTemplateSelect = useCallback((template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setNewWorkflowName(template.id === 'blank' ? '' : template.name);
    setNewWorkflowDescription(template.description || '');
    setShowTemplateDialog(false);
    setShowNewDialog(true);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!newWorkflowName.trim()) return;

    setIsCreating(true);
    try {
      let result;

      if (selectedTemplate && selectedTemplate.id !== 'blank') {
        result = await createWorkflowFromTemplate(
          selectedTemplate.id,
          newWorkflowName
        );
      } else {
        result = await createWorkflow({
          name: newWorkflowName,
          description: newWorkflowDescription || undefined,
        });
      }

      if (result.success && result.data) {
        router.push(`/dashboard/workflows/${result.data.id}`);
      }
    } finally {
      setIsCreating(false);
      setShowNewDialog(false);
      setSelectedTemplate(null);
      setNewWorkflowName('');
      setNewWorkflowDescription('');
    }
  }, [newWorkflowName, newWorkflowDescription, selectedTemplate, router]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-sm text-gray-500">
            Automatisez vos taches repetitives
          </p>
        </div>
        <Button onClick={() => setShowTemplateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau workflow
        </Button>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher un workflow..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Workflows grid */}
      {filteredWorkflows.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Zap className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'Aucun resultat' : 'Aucun workflow'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchQuery
                ? 'Essayez une autre recherche'
                : 'Creez votre premier workflow pour automatiser vos taches'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowTemplateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Creer un workflow
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onEdit={handleEdit}
              onToggle={handleToggle}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Template picker dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <TemplatePicker
          templates={templates}
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateDialog(false)}
        />
      </Dialog>

      {/* New workflow dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau workflow</DialogTitle>
            <DialogDescription>
              {selectedTemplate && selectedTemplate.id !== 'blank'
                ? `Base sur: ${selectedTemplate.name}`
                : 'Creez un workflow vide'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du workflow</Label>
              <Input
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="Mon workflow"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optionnel)</Label>
              <Textarea
                value={newWorkflowDescription}
                onChange={(e) => setNewWorkflowDescription(e.target.value)}
                placeholder="Decrivez ce que fait ce workflow..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newWorkflowName.trim() || isCreating}
            >
              {isCreating ? 'Creation...' : 'Creer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
