'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  UserPlus, CreditCard, Calendar, Trophy, Play,
  Mail, Bell, Clock, GitBranch, UserCog, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TriggerType, ActionType } from '@/types/workflow.types';

// =====================================================
// TYPES
// =====================================================

interface NodeData {
  label?: string;
  description?: string;
  icon?: string;
  color?: string;
  trigger_type?: TriggerType;
  trigger_config?: Record<string, unknown>;
  action_type?: ActionType;
  action_config?: Record<string, unknown>;
}

interface CustomNodeProps {
  data: NodeData;
  selected?: boolean;
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
// TRIGGER NODE
// =====================================================

function TriggerNode({ data, selected }: CustomNodeProps) {
  const Icon = data.trigger_type ? TRIGGER_ICONS[data.trigger_type] : Play;

  return (
    <div
      className={cn(
        'px-4 py-3 shadow-md rounded-lg border-2 bg-white min-w-[200px]',
        'transition-all duration-200',
        selected ? 'border-green-500 shadow-lg ring-2 ring-green-200' : 'border-green-300',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-green-600 uppercase tracking-wide">
            Trigger
          </div>
          <div className="text-sm font-semibold text-gray-900 truncate">
            {data.label || 'Nouveau trigger'}
          </div>
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500 border-2 border-white"
      />
    </div>
  );
}

// =====================================================
// ACTION NODE
// =====================================================

function ActionNode({ data, selected }: CustomNodeProps) {
  const Icon = data.action_type ? ACTION_ICONS[data.action_type] : Bell;
  const isCondition = data.action_type === 'condition_branch';

  return (
    <div
      className={cn(
        'px-4 py-3 shadow-md rounded-lg border-2 bg-white min-w-[200px]',
        'transition-all duration-200',
        selected ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-blue-300',
        isCondition && 'border-amber-300',
        isCondition && selected && 'border-amber-500 ring-amber-200',
      )}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          'w-3 h-3 border-2 border-white',
          isCondition ? 'bg-amber-500' : 'bg-blue-500'
        )}
      />

      <div className="flex items-center gap-3">
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          isCondition ? 'bg-amber-100' : 'bg-blue-100'
        )}>
          <Icon className={cn(
            'w-5 h-5',
            isCondition ? 'text-amber-600' : 'text-blue-600'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn(
            'text-xs font-medium uppercase tracking-wide',
            isCondition ? 'text-amber-600' : 'text-blue-600'
          )}>
            {isCondition ? 'Condition' : 'Action'}
          </div>
          <div className="text-sm font-semibold text-gray-900 truncate">
            {data.label || 'Nouvelle action'}
          </div>
        </div>
      </div>

      {/* Output handle(s) */}
      {isCondition ? (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            style={{ top: '30%' }}
            className="w-3 h-3 bg-green-500 border-2 border-white"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            style={{ top: '70%' }}
            className="w-3 h-3 bg-red-500 border-2 border-white"
          />
          <div className="absolute right-[-25px] top-[25%] text-xs text-green-600 font-medium">
            Oui
          </div>
          <div className="absolute right-[-25px] top-[65%] text-xs text-red-600 font-medium">
            Non
          </div>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-blue-500 border-2 border-white"
        />
      )}
    </div>
  );
}

// =====================================================
// EXPORTS
// =====================================================

export const TriggerNodeComponent = memo(TriggerNode);
export const ActionNodeComponent = memo(ActionNode);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const nodeTypes: Record<string, any> = {
  trigger: TriggerNodeComponent,
  action: ActionNodeComponent,
  condition: ActionNodeComponent,
};
