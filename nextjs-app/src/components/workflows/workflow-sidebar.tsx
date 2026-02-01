'use client';

import { useState } from 'react';
import {
  UserPlus, CreditCard, Calendar, Trophy, Play,
  Mail, Bell, Clock, GitBranch, UserCog, MessageSquare,
  ChevronDown, GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRIGGER_META, ACTION_META, type TriggerType, type ActionType } from '@/types/workflow.types';

// =====================================================
// TYPES
// =====================================================

interface DraggableNodeProps {
  type: 'trigger' | 'action';
  subType: TriggerType | ActionType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

// =====================================================
// DRAGGABLE NODE
// =====================================================

function DraggableNode({ type, subType, label, description, icon: Icon, color }: DraggableNodeProps) {
  const onDragStart = (event: React.DragEvent) => {
    const nodeData = {
      type,
      subType,
      label,
    };
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-white cursor-grab',
        'hover:shadow-md hover:border-gray-300 transition-all',
        'active:cursor-grabbing active:shadow-lg',
      )}
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{label}</div>
        <div className="text-xs text-gray-500 truncate">{description}</div>
      </div>
      <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </div>
  );
}

// =====================================================
// COLLAPSIBLE SECTION
// =====================================================

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left text-sm font-semibold text-gray-700 hover:text-gray-900"
      >
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform',
            !isOpen && '-rotate-90'
          )}
        />
        {title}
      </button>
      {isOpen && (
        <div className="space-y-2 pl-1">
          {children}
        </div>
      )}
    </div>
  );
}

// =====================================================
// ICON MAPPING
// =====================================================

const TRIGGER_ICONS: Record<TriggerType, React.ElementType> = {
  member_created: UserPlus,
  subscription_expiring_soon: CreditCard,
  class_starting_soon: Calendar,
  personal_record_achieved: Trophy,
  manual_trigger: Play,
};

const ACTION_ICONS: Record<ActionType, React.ElementType> = {
  send_email: Mail,
  send_in_app_notification: Bell,
  send_discord_message: MessageSquare,
  delay: Clock,
  condition_branch: GitBranch,
  update_member: UserCog,
};

// =====================================================
// WORKFLOW SIDEBAR
// =====================================================

export function WorkflowSidebar() {
  return (
    <div className="w-64 border-r bg-gray-50 overflow-y-auto p-4 space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Glissez-deposez
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Glissez un element sur le canvas pour l&apos;ajouter au workflow
        </p>
      </div>

      {/* Triggers Section */}
      <CollapsibleSection title="Declencheurs">
        {Object.values(TRIGGER_META).map((trigger) => (
          <DraggableNode
            key={trigger.type}
            type="trigger"
            subType={trigger.type}
            label={trigger.label}
            description={trigger.description}
            icon={TRIGGER_ICONS[trigger.type]}
            color={trigger.color}
          />
        ))}
      </CollapsibleSection>

      {/* Actions Section */}
      <CollapsibleSection title="Actions">
        {Object.values(ACTION_META).map((action) => (
          <DraggableNode
            key={action.type}
            type="action"
            subType={action.type}
            label={action.label}
            description={action.description}
            icon={ACTION_ICONS[action.type]}
            color={action.color}
          />
        ))}
      </CollapsibleSection>
    </div>
  );
}
