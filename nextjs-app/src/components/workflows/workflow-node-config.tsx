'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WorkflowNode, WorkflowNodeData } from '@/types/workflow.types';

// =====================================================
// TYPES
// =====================================================

interface WorkflowNodeConfigProps {
  node: WorkflowNode;
  onUpdate: (data: Partial<WorkflowNodeData>) => void;
  onClose: () => void;
}

// =====================================================
// TRIGGER CONFIGS
// =====================================================

function TriggerMemberCreatedConfig() {
  return (
    <div className="text-sm text-gray-500">
      Ce trigger se declenche automatiquement quand un nouveau membre est cree.
      Aucune configuration supplementaire requise.
    </div>
  );
}

function TriggerSubscriptionExpiringConfig({
  config,
  onChange,
}: {
  config: { days_before?: number };
  onChange: (config: { days_before: number }) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Jours avant expiration</Label>
        <Select
          value={String(config.days_before || 7)}
          onValueChange={(value) => onChange({ days_before: parseInt(value) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selectionnez" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 jours</SelectItem>
            <SelectItem value="7">7 jours</SelectItem>
            <SelectItem value="14">14 jours</SelectItem>
            <SelectItem value="30">30 jours</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function TriggerClassStartingConfig({
  config,
  onChange,
}: {
  config: { hours_before?: number };
  onChange: (config: { hours_before: number }) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Heures avant le cours</Label>
        <Select
          value={String(config.hours_before || 2)}
          onValueChange={(value) => onChange({ hours_before: parseInt(value) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selectionnez" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 heure</SelectItem>
            <SelectItem value="2">2 heures</SelectItem>
            <SelectItem value="4">4 heures</SelectItem>
            <SelectItem value="24">24 heures</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function TriggerPersonalRecordConfig() {
  return (
    <div className="text-sm text-gray-500">
      Ce trigger se declenche quand un membre bat son record personnel.
      Aucune configuration supplementaire requise.
    </div>
  );
}

function TriggerManualConfig() {
  return (
    <div className="text-sm text-gray-500">
      Ce trigger doit etre declenche manuellement depuis le dashboard.
      Vous pourrez fournir des donnees lors du declenchement.
    </div>
  );
}

// =====================================================
// ACTION CONFIGS
// =====================================================

function ActionSendEmailConfig({
  config,
  onChange,
}: {
  config: { template?: string; subject?: string };
  onChange: (config: { template?: string; subject?: string }) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Sujet de l&apos;email</Label>
        <Input
          value={config.subject || ''}
          onChange={(e) => onChange({ ...config, subject: e.target.value })}
          placeholder="Bienvenue chez {{org.name}}!"
        />
        <p className="text-xs text-gray-500">
          Utilisez {'{{variable}}'} pour inserer des donnees dynamiques
        </p>
      </div>
      <div className="space-y-2">
        <Label>Template</Label>
        <Select
          value={config.template || ''}
          onValueChange={(value) => onChange({ ...config, template: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selectionnez un template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="welcome">Bienvenue</SelectItem>
            <SelectItem value="renewal_reminder">Rappel renouvellement</SelectItem>
            <SelectItem value="class_reminder">Rappel cours</SelectItem>
            <SelectItem value="pr_celebration">Felicitations PR</SelectItem>
            <SelectItem value="custom">Personnalise</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ActionSendNotificationConfig({
  config,
  onChange,
}: {
  config: { title?: string; message?: string };
  onChange: (config: { title?: string; message?: string }) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Titre</Label>
        <Input
          value={config.title || ''}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          placeholder="Nouveau message"
        />
      </div>
      <div className="space-y-2">
        <Label>Message</Label>
        <Textarea
          value={config.message || ''}
          onChange={(e) => onChange({ ...config, message: e.target.value })}
          placeholder="Le contenu de votre notification..."
          rows={3}
        />
        <p className="text-xs text-gray-500">
          Utilisez {'{{variable}}'} pour inserer des donnees dynamiques
        </p>
      </div>
    </div>
  );
}

function ActionDelayConfig({
  config,
  onChange,
}: {
  config: { duration?: number; unit?: string };
  onChange: (config: { duration: number; unit: string }) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Duree</Label>
          <Input
            type="number"
            min={1}
            value={config.duration || 1}
            onChange={(e) =>
              onChange({
                duration: parseInt(e.target.value) || 1,
                unit: config.unit || 'hours',
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Unite</Label>
          <Select
            value={config.unit || 'hours'}
            onValueChange={(value) =>
              onChange({ duration: config.duration || 1, unit: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">Minutes</SelectItem>
              <SelectItem value="hours">Heures</SelectItem>
              <SelectItem value="days">Jours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function ActionConditionConfig({
  config,
  onChange,
}: {
  config: { expression?: string; true_label?: string; false_label?: string };
  onChange: (config: {
    expression?: string;
    true_label?: string;
    false_label?: string;
  }) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Expression</Label>
        <Textarea
          value={config.expression || ''}
          onChange={(e) => onChange({ ...config, expression: e.target.value })}
          placeholder="{{member.status}} == 'active'"
          rows={2}
        />
        <p className="text-xs text-gray-500">
          Exemples: {`{{member.status}} == 'active'`}, {`{{subscription.days_remaining}} < 7`}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Label &quot;Oui&quot;</Label>
          <Input
            value={config.true_label || ''}
            onChange={(e) => onChange({ ...config, true_label: e.target.value })}
            placeholder="Oui"
          />
        </div>
        <div className="space-y-2">
          <Label>Label &quot;Non&quot;</Label>
          <Input
            value={config.false_label || ''}
            onChange={(e) =>
              onChange({ ...config, false_label: e.target.value })
            }
            placeholder="Non"
          />
        </div>
      </div>
    </div>
  );
}

function ActionUpdateMemberConfig({
  config,
  onChange,
}: {
  config: { field?: string; value?: string; operation?: string };
  onChange: (config: { field?: string; value?: string; operation?: string }) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Champ a modifier</Label>
        <Select
          value={config.field || ''}
          onValueChange={(value) => onChange({ ...config, field: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selectionnez un champ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tags">Tags</SelectItem>
            <SelectItem value="status">Statut</SelectItem>
            <SelectItem value="notes">Notes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Operation</Label>
        <Select
          value={config.operation || 'set'}
          onValueChange={(value) => onChange({ ...config, operation: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="set">Remplacer</SelectItem>
            <SelectItem value="append">Ajouter</SelectItem>
            <SelectItem value="remove">Supprimer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Valeur</Label>
        <Input
          value={config.value || ''}
          onChange={(e) => onChange({ ...config, value: e.target.value })}
          placeholder="Nouvelle valeur"
        />
      </div>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function WorkflowNodeConfig({
  node,
  onUpdate,
  onClose,
}: WorkflowNodeConfigProps) {
  const { data } = node;
  const isTrigger = node.type === 'trigger';

  // Render the appropriate config component
  const renderConfig = () => {
    if (isTrigger && data.trigger_type) {
      const triggerConfig = (data.trigger_config || {}) as Record<string, unknown>;
      const updateTriggerConfig = (newConfig: Record<string, unknown>) => {
        onUpdate({ trigger_config: { ...triggerConfig, ...newConfig } });
      };

      switch (data.trigger_type) {
        case 'member_created':
          return <TriggerMemberCreatedConfig />;
        case 'subscription_expiring_soon':
          return (
            <TriggerSubscriptionExpiringConfig
              config={triggerConfig as { days_before?: number }}
              onChange={updateTriggerConfig}
            />
          );
        case 'class_starting_soon':
          return (
            <TriggerClassStartingConfig
              config={triggerConfig as { hours_before?: number }}
              onChange={updateTriggerConfig}
            />
          );
        case 'personal_record_achieved':
          return <TriggerPersonalRecordConfig />;
        case 'manual_trigger':
          return <TriggerManualConfig />;
        default:
          return <div className="text-sm text-gray-500">Configuration non disponible</div>;
      }
    }

    if (!isTrigger && data.action_type) {
      const actionConfig = (data.action_config || {}) as Record<string, unknown>;
      const updateActionConfig = (newConfig: Record<string, unknown>) => {
        onUpdate({ action_config: { ...actionConfig, ...newConfig } });
      };

      switch (data.action_type) {
        case 'send_email':
          return (
            <ActionSendEmailConfig
              config={actionConfig as { template?: string; subject?: string }}
              onChange={updateActionConfig}
            />
          );
        case 'send_in_app_notification':
          return (
            <ActionSendNotificationConfig
              config={actionConfig as { title?: string; message?: string }}
              onChange={updateActionConfig}
            />
          );
        case 'delay':
          return (
            <ActionDelayConfig
              config={actionConfig as { duration?: number; unit?: string }}
              onChange={updateActionConfig}
            />
          );
        case 'condition_branch':
          return (
            <ActionConditionConfig
              config={actionConfig as { expression?: string; true_label?: string; false_label?: string }}
              onChange={updateActionConfig}
            />
          );
        case 'update_member':
          return (
            <ActionUpdateMemberConfig
              config={actionConfig as { field?: string; value?: string; operation?: string }}
              onChange={updateActionConfig}
            />
          );
        default:
          return <div className="text-sm text-gray-500">Configuration non disponible</div>;
      }
    }

    return <div className="text-sm text-gray-500">Selectionnez un type</div>;
  };

  return (
    <div className="w-80 border-l bg-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-gray-900">Configuration</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Label */}
        <div className="space-y-2">
          <Label>Nom</Label>
          <Input
            value={data.label || ''}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Nom du noeud"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Description (optionnel)</Label>
          <Textarea
            value={data.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Description..."
            rows={2}
          />
        </div>

        {/* Type-specific config */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-4">
            {isTrigger ? 'Configuration du declencheur' : 'Configuration de l\'action'}
          </h4>
          {renderConfig()}
        </div>
      </div>
    </div>
  );
}
