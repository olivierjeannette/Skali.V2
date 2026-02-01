// =====================================================
// WORKFLOW TYPES
// Types pour le systeme d'automatisation React Flow
// =====================================================

import { Edge, Viewport } from '@xyflow/react';

// =====================================================
// ENUMS (mirroring DB enums)
// =====================================================

export const TRIGGER_TYPES = {
  // MVP Triggers
  member_created: 'member_created',
  subscription_expiring_soon: 'subscription_expiring_soon',
  class_starting_soon: 'class_starting_soon',
  personal_record_achieved: 'personal_record_achieved',
  manual_trigger: 'manual_trigger',
} as const;

export const ACTION_TYPES = {
  // MVP Actions
  send_email: 'send_email',
  send_in_app_notification: 'send_in_app_notification',
  send_discord_message: 'send_discord_message',
  delay: 'delay',
  condition_branch: 'condition_branch',
  update_member: 'update_member',
} as const;

export type TriggerType = keyof typeof TRIGGER_TYPES;
export type ActionType = keyof typeof ACTION_TYPES;

export type WorkflowExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused'
  | 'waiting';

export type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'waiting';

// =====================================================
// TRIGGER CONFIGS
// =====================================================

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TriggerConfigMemberCreated {
  // No additional config needed
}

export interface TriggerConfigSubscriptionExpiring {
  days_before: number; // 7, 14, 30
}

export interface TriggerConfigClassStarting {
  hours_before: number; // 1, 2, 24
}

export interface TriggerConfigPersonalRecord {
  exercise_filter?: string[]; // Optional: filter specific exercises
}

export interface TriggerConfigManual {
  input_fields?: {
    name: string;
    type: 'text' | 'number' | 'select' | 'member';
    required?: boolean;
    options?: string[];
  }[];
}

export type TriggerConfig =
  | TriggerConfigMemberCreated
  | TriggerConfigSubscriptionExpiring
  | TriggerConfigClassStarting
  | TriggerConfigPersonalRecord
  | TriggerConfigManual;

// =====================================================
// ACTION CONFIGS
// =====================================================

export interface ActionConfigSendEmail {
  template: string;
  subject: string;
  to_field?: string; // Default: member.email
  cc?: string[];
  bcc?: string[];
}

export interface ActionConfigSendNotification {
  title: string;
  message: string;
  link?: string;
  icon?: string;
}

export interface ActionConfigDelay {
  duration: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
}

export interface ActionConfigCondition {
  expression: string; // e.g., "{{member.status}} == 'active'"
  true_label?: string;
  false_label?: string;
}

export interface ActionConfigUpdateMember {
  field: string;
  value: string;
  operation?: 'set' | 'append' | 'remove';
}

export interface ActionConfigSendDiscord {
  webhook_url?: string; // If empty, uses org's default webhook
  message?: string;
  embed_title?: string;
  embed_description?: string;
  embed_color?: string; // Hex color
  use_org_webhook?: boolean;
}

export type ActionConfig =
  | ActionConfigSendEmail
  | ActionConfigSendNotification
  | ActionConfigSendDiscord
  | ActionConfigDelay
  | ActionConfigCondition
  | ActionConfigUpdateMember;

// =====================================================
// NODE TYPES (React Flow)
// =====================================================

export interface WorkflowNodeData {
  label: string;
  description?: string;
  icon?: string;
  color?: string;

  // Trigger specific
  trigger_type?: TriggerType;
  trigger_config?: TriggerConfig | Record<string, unknown>;

  // Action specific
  action_type?: ActionType;
  action_config?: ActionConfig | Record<string, unknown>;
}

export type WorkflowNodeType = 'trigger' | 'action' | 'condition';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
  selected?: boolean;
  width?: number;
  height?: number;
}

export interface WorkflowEdge extends Edge {
  data?: {
    condition_expression?: string;
    condition_label?: string;
  };
}

// =====================================================
// CANVAS DATA (stored in DB)
// =====================================================

export interface WorkflowCanvasData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: Viewport;
}

// =====================================================
// DATABASE TYPES
// =====================================================

export interface Workflow {
  id: string;
  org_id: string;
  name: string;
  description?: string | null;
  icon: string;
  color: string;
  folder_id?: string | null;
  tags: string[];
  is_active: boolean;
  is_template: boolean;
  version: number;
  canvas_data: WorkflowCanvasData;
  settings: WorkflowSettings;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  last_executed_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowSettings {
  timezone: string;
  max_executions_per_day: number;
  retry_failed: boolean;
  retry_count: number;
  retry_delay_seconds: number;
  log_level: 'debug' | 'info' | 'warn' | 'error';
  notifications: {
    on_failure: boolean;
    on_success: boolean;
    notify_emails: string[];
  };
}

export interface WorkflowFolder {
  id: string;
  org_id: string;
  parent_id?: string | null;
  name: string;
  color: string;
  created_at: string;
}

export interface WorkflowDbNode {
  id: string;
  workflow_id: string;
  node_id: string;
  node_type: WorkflowNodeType;
  trigger_type?: TriggerType | null;
  trigger_config: TriggerConfig;
  action_type?: ActionType | null;
  action_config: ActionConfig;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  label?: string | null;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  timeout_seconds: number;
  retry_on_fail: boolean;
  continue_on_fail: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowDbEdge {
  id: string;
  workflow_id: string;
  edge_id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle: string;
  target_handle: string;
  condition_expression?: string | null;
  condition_label?: string | null;
  edge_type: string;
  animated: boolean;
  created_at: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  org_id: string;
  status: WorkflowExecutionStatus;
  triggered_by: 'trigger' | 'manual' | 'api' | 'schedule';
  trigger_node_id?: string | null;
  trigger_data: Record<string, unknown>;
  variables: Record<string, unknown>;
  context: WorkflowContext;
  output_data: Record<string, unknown>;
  error_message?: string | null;
  error_stack?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms?: number | null;
  executed_by?: string | null;
  created_at: string;
}

export interface WorkflowNodeRun {
  id: string;
  run_id: string;
  node_id: string;
  status: NodeExecutionStatus;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  error_message?: string | null;
  error_stack?: string | null;
  retry_count: number;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms?: number | null;
  created_at: string;
}

export interface WorkflowTemplate {
  id: string;
  org_id?: string | null;
  name: string;
  description?: string | null;
  category: string;
  icon: string;
  nodes_config: WorkflowNode[];
  edges_config: WorkflowEdge[];
  settings: Partial<WorkflowSettings>;
  is_official: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowLog {
  id: string;
  run_id: string;
  node_id?: string | null;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data: Record<string, unknown>;
  created_at: string;
}

// =====================================================
// CONTEXT TYPES (available in expressions)
// =====================================================

export interface WorkflowContext {
  org: {
    id: string;
    name: string;
    settings: Record<string, unknown>;
  };
  member?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    status: string;
    tags: string[];
  };
  subscription?: {
    id: string;
    plan_name: string;
    start_date: string;
    end_date: string;
    status: string;
  };
  class?: {
    id: string;
    name: string;
    starts_at: string;
    ends_at: string;
    coach_name?: string;
  };
  workout?: {
    id: string;
    name: string;
    type: string;
  };
  trigger_data: Record<string, unknown>;
  variables: Record<string, unknown>;
  now: string;
}

// =====================================================
// UI METADATA
// =====================================================

export interface TriggerMeta {
  type: TriggerType;
  label: string;
  description: string;
  icon: string;
  color: string;
  category: string;
}

export interface ActionMeta {
  type: ActionType;
  label: string;
  description: string;
  icon: string;
  color: string;
  category: string;
}

// MVP Trigger definitions
export const TRIGGER_META: Record<TriggerType, TriggerMeta> = {
  member_created: {
    type: 'member_created',
    label: 'Nouveau membre',
    description: 'Se declenche quand un membre est cree',
    icon: 'user-plus',
    color: '#22c55e',
    category: 'Membres',
  },
  subscription_expiring_soon: {
    type: 'subscription_expiring_soon',
    label: 'Abonnement expire bientot',
    description: 'Se declenche X jours avant expiration',
    icon: 'credit-card',
    color: '#f59e0b',
    category: 'Abonnements',
  },
  class_starting_soon: {
    type: 'class_starting_soon',
    label: 'Cours bientot',
    description: 'Se declenche X heures avant un cours',
    icon: 'calendar',
    color: '#3b82f6',
    category: 'Planning',
  },
  personal_record_achieved: {
    type: 'personal_record_achieved',
    label: 'Nouveau PR',
    description: 'Se declenche quand un membre bat son record',
    icon: 'trophy',
    color: '#eab308',
    category: 'Performance',
  },
  manual_trigger: {
    type: 'manual_trigger',
    label: 'Declenchement manuel',
    description: 'Execute manuellement via le dashboard',
    icon: 'play',
    color: '#8b5cf6',
    category: 'Autre',
  },
};

// MVP Action definitions
export const ACTION_META: Record<ActionType, ActionMeta> = {
  send_email: {
    type: 'send_email',
    label: 'Envoyer email',
    description: 'Envoie un email personnalise',
    icon: 'mail',
    color: '#3b82f6',
    category: 'Communication',
  },
  send_in_app_notification: {
    type: 'send_in_app_notification',
    label: 'Notification in-app',
    description: 'Envoie une notification dans l\'app',
    icon: 'bell',
    color: '#8b5cf6',
    category: 'Communication',
  },
  send_discord_message: {
    type: 'send_discord_message',
    label: 'Message Discord',
    description: 'Envoie un message sur Discord via webhook',
    icon: 'message-square',
    color: '#5865f2',
    category: 'Communication',
  },
  delay: {
    type: 'delay',
    label: 'Delai',
    description: 'Attend un certain temps avant de continuer',
    icon: 'clock',
    color: '#6b7280',
    category: 'Controle',
  },
  condition_branch: {
    type: 'condition_branch',
    label: 'Condition',
    description: 'Branche selon une condition',
    icon: 'git-branch',
    color: '#f59e0b',
    category: 'Controle',
  },
  update_member: {
    type: 'update_member',
    label: 'Modifier membre',
    description: 'Met a jour les donnees du membre',
    icon: 'user-cog',
    color: '#22c55e',
    category: 'Donnees',
  },
};

// =====================================================
// FORM TYPES
// =====================================================

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  folder_id?: string;
  tags?: string[];
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  folder_id?: string;
  tags?: string[];
  is_active?: boolean;
  canvas_data?: WorkflowCanvasData;
  settings?: Partial<WorkflowSettings>;
}

export interface WorkflowWithStats extends Workflow {
  success_rate: number;
}
