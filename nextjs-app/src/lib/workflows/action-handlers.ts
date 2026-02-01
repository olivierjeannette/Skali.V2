// =====================================================
// WORKFLOW ACTION HANDLERS
// Handlers pour chaque type d'action de workflow
// =====================================================

import { createClient } from '@/lib/supabase/server';
import type { ActionType, WorkflowContext } from '@/types/workflow.types';
import {
  sendWelcomeEmail,
  sendClassReminderEmail,
  sendSubscriptionExpiringEmail,
  sendCustomEmail,
} from '@/actions/notifications';
import {
  sendDiscordCustomMessage,
  getDiscordConfig,
} from '@/actions/discord';
import { DISCORD_COLORS } from '@/lib/discord';

// =====================================================
// TYPES
// =====================================================

export interface ActionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

type ActionHandler = (
  config: Record<string, unknown>,
  context: WorkflowContext,
  orgId: string
) => Promise<ActionResult>;

// =====================================================
// ACTION HANDLERS
// =====================================================

/**
 * Send Email Action
 */
const sendEmailHandler: ActionHandler = async (config, context, orgId) => {
  const template = config.template as string;
  const subject = interpolateString(config.subject as string || '', context);
  const toField = config.to_field as string | undefined;

  // Get recipient email
  let email = context.member?.email;
  if (toField) {
    email = getValueFromPath(toField, context) as string;
  }

  if (!email) {
    return { success: false, error: 'No recipient email found' };
  }

  const memberName = context.member
    ? `${context.member.first_name} ${context.member.last_name || ''}`.trim()
    : 'Membre';

  try {
    // Use appropriate email template based on config
    switch (template) {
      case 'welcome':
        if (!context.member) {
          return { success: false, error: 'Member context required for welcome email' };
        }
        const welcomeResult = await sendWelcomeEmail(
          {
            id: context.member.id,
            email,
            firstName: context.member.first_name,
            lastName: context.member.last_name,
          },
          orgId
        );
        return {
          success: welcomeResult.success,
          data: { messageId: welcomeResult.messageId },
          error: welcomeResult.error,
        };

      case 'class_reminder':
        if (!context.member || !context.class) {
          return { success: false, error: 'Member and class context required' };
        }
        const reminderResult = await sendClassReminderEmail(
          {
            id: context.member.id,
            email,
            firstName: context.member.first_name,
            lastName: context.member.last_name,
          },
          {
            name: context.class.name,
            date: new Date(context.class.starts_at).toLocaleDateString('fr-FR'),
            time: new Date(context.class.starts_at).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            coachName: context.class.coach_name,
          },
          orgId
        );
        return {
          success: reminderResult.success,
          data: { messageId: reminderResult.messageId },
          error: reminderResult.error,
        };

      case 'subscription_expiring':
      case 'renewal_reminder':
        if (!context.member || !context.subscription) {
          return { success: false, error: 'Member and subscription context required' };
        }
        const endDate = new Date(context.subscription.end_date);
        const today = new Date();
        const daysRemaining = Math.ceil(
          (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        const expiringResult = await sendSubscriptionExpiringEmail(
          {
            id: context.member.id,
            email,
            firstName: context.member.first_name,
            lastName: context.member.last_name,
          },
          {
            planName: context.subscription.plan_name,
            expirationDate: endDate.toLocaleDateString('fr-FR'),
            daysRemaining,
          },
          orgId
        );
        return {
          success: expiringResult.success,
          data: { messageId: expiringResult.messageId },
          error: expiringResult.error,
        };

      case 'custom':
      default:
        // Custom email with provided content
        const content = interpolateString(config.content as string || '', context);
        const customResult = await sendCustomEmail(
          {
            id: context.member?.id,
            email,
            firstName: memberName,
          },
          orgId,
          subject,
          content
        );
        return {
          success: customResult.success,
          data: { messageId: customResult.messageId },
          error: customResult.error,
        };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send email',
    };
  }
};

/**
 * Send In-App Notification Action
 */
const sendInAppNotificationHandler: ActionHandler = async (config, context, orgId) => {
  const title = interpolateString(config.title as string || '', context);
  const message = interpolateString(config.message as string || '', context);
  const link = config.link as string | undefined;
  const icon = config.icon as string | undefined;

  if (!context.member?.id) {
    return { success: false, error: 'Member context required for in-app notification' };
  }

  try {
    const supabase = await createClient();

    // Create notification in database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('notifications')
      .insert({
        org_id: orgId,
        member_id: context.member.id,
        title,
        message,
        link: link ? interpolateString(link, context) : null,
        icon,
        type: 'workflow',
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { notification_id: data.id },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create notification',
    };
  }
};

/**
 * Update Member Action
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const updateMemberHandler: ActionHandler = async (config, context, _orgId) => {
  const field = config.field as string;
  const value = interpolateString(config.value as string || '', context);
  const operation = (config.operation as string) || 'set';

  if (!context.member?.id) {
    return { success: false, error: 'Member context required' };
  }

  try {
    const supabase = await createClient();

    // Get current member data if needed for append/remove
    if (operation === 'append' || operation === 'remove') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: member } = await (supabase as any)
        .from('members')
        .select(field)
        .eq('id', context.member.id)
        .single();

      if (!member) {
        return { success: false, error: 'Member not found' };
      }

      const currentValue = member[field];

      if (operation === 'append' && Array.isArray(currentValue)) {
        // Append to array
        const newValue = [...currentValue, value];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('members')
          .update({ [field]: newValue })
          .eq('id', context.member.id);
      } else if (operation === 'remove' && Array.isArray(currentValue)) {
        // Remove from array
        const newValue = currentValue.filter((v: string) => v !== value);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('members')
          .update({ [field]: newValue })
          .eq('id', context.member.id);
      } else {
        return { success: false, error: `Cannot ${operation} on non-array field` };
      }
    } else {
      // Simple set operation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('members')
        .update({ [field]: value })
        .eq('id', context.member.id);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return {
      success: true,
      data: { field, value, operation },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update member',
    };
  }
};

/**
 * Delay Action (handled by engine, but returns config for documentation)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const delayHandler: ActionHandler = async (config, _context, _orgId) => {
  const duration = config.duration as number || 60;
  const unit = config.unit as string || 'seconds';

  return {
    success: true,
    data: { duration, unit, type: 'delay' },
  };
};

/**
 * Condition Branch Action (logic handled by engine)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const conditionBranchHandler: ActionHandler = async (config, _context, _orgId) => {
  const expression = config.expression as string || 'true';

  // The actual evaluation is done by the engine
  // This handler just returns the config for documentation
  return {
    success: true,
    data: {
      expression,
      evaluated: true,
    },
  };
};

/**
 * Send Push Notification Action
 */
const sendPushNotificationHandler: ActionHandler = async (config, context, orgId) => {
  const title = interpolateString(config.title as string || '', context);
  const body = interpolateString(config.body as string || '', context);
  const url = config.url as string | undefined;

  if (!context.member?.id) {
    return { success: false, error: 'Member context required for push notification' };
  }

  try {
    const supabase = await createClient();

    // Get member's push subscription
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subscription } = await (supabase as any)
      .from('push_subscriptions')
      .select('*')
      .eq('member_id', context.member.id)
      .eq('is_active', true)
      .single();

    if (!subscription) {
      return { success: false, error: 'No active push subscription for member' };
    }

    // Send push notification via web-push
    // Note: This requires web-push to be configured
    // For now, we'll store it as a pending notification
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('push_notification_queue')
      .insert({
        org_id: orgId,
        member_id: context.member.id,
        subscription_id: subscription.id,
        title,
        body,
        url: url ? interpolateString(url, context) : null,
        status: 'pending',
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { queued: true },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to queue push notification',
    };
  }
};

/**
 * Add Member Tag Action
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const addMemberTagHandler: ActionHandler = async (config, context, _orgId) => {
  const tag = interpolateString(config.tag as string || '', context);

  if (!context.member?.id || !tag) {
    return { success: false, error: 'Member context and tag required' };
  }

  try {
    const supabase = await createClient();

    // Get current tags
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member } = await (supabase as any)
      .from('members')
      .select('tags')
      .eq('id', context.member.id)
      .single();

    if (!member) {
      return { success: false, error: 'Member not found' };
    }

    const currentTags = member.tags || [];
    if (currentTags.includes(tag)) {
      return { success: true, data: { tag, action: 'already_exists' } };
    }

    // Add tag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('members')
      .update({ tags: [...currentTags, tag] })
      .eq('id', context.member.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { tag, action: 'added' },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to add tag',
    };
  }
};

/**
 * Remove Member Tag Action
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const removeMemberTagHandler: ActionHandler = async (config, context, _orgId) => {
  const tag = interpolateString(config.tag as string || '', context);

  if (!context.member?.id || !tag) {
    return { success: false, error: 'Member context and tag required' };
  }

  try {
    const supabase = await createClient();

    // Get current tags
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member } = await (supabase as any)
      .from('members')
      .select('tags')
      .eq('id', context.member.id)
      .single();

    if (!member) {
      return { success: false, error: 'Member not found' };
    }

    const currentTags = member.tags || [];
    if (!currentTags.includes(tag)) {
      return { success: true, data: { tag, action: 'not_found' } };
    }

    // Remove tag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('members')
      .update({ tags: currentTags.filter((t: string) => t !== tag) })
      .eq('id', context.member.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { tag, action: 'removed' },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to remove tag',
    };
  }
};

/**
 * HTTP Request Action (webhook)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const httpRequestHandler: ActionHandler = async (config, context, _orgId) => {
  const url = interpolateString(config.url as string || '', context);
  const method = (config.method as string || 'POST').toUpperCase();
  const headers = config.headers as Record<string, string> || {};
  const body = config.body as Record<string, unknown> || {};

  if (!url) {
    return { success: false, error: 'URL is required' };
  }

  try {
    // Interpolate body values
    const interpolatedBody: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        interpolatedBody[key] = interpolateString(value, context);
      } else {
        interpolatedBody[key] = value;
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: method !== 'GET' ? JSON.stringify(interpolatedBody) : undefined,
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        data: { response: responseData },
      };
    }

    return {
      success: true,
      data: { response: responseData, status: response.status },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'HTTP request failed',
    };
  }
};

/**
 * Log Event Action (for debugging/audit)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const logEventHandler: ActionHandler = async (config, context, _orgId) => {
  const message = interpolateString(config.message as string || '', context);
  const level = (config.level as string) || 'info';
  const data = config.data as Record<string, unknown> || {};

  // Interpolate data values
  const interpolatedData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      interpolatedData[key] = interpolateString(value, context);
    } else {
      interpolatedData[key] = value;
    }
  }

  console.log(`[Workflow ${level.toUpperCase()}] ${message}`, interpolatedData);

  return {
    success: true,
    data: { message, level, logged_data: interpolatedData },
  };
};

/**
 * Send Discord Message Action
 */
const sendDiscordMessageHandler: ActionHandler = async (config, context, orgId) => {
  const message = interpolateString(config.message as string || '', context);
  const embedTitle = interpolateString(config.embed_title as string || '', context);
  const embedDescription = interpolateString(config.embed_description as string || '', context);
  const embedColorHex = config.embed_color as string || '#5865f2';
  const useOrgWebhook = config.use_org_webhook as boolean ?? true;
  let webhookUrl = config.webhook_url as string | undefined;

  // If using org webhook, get from config
  if (useOrgWebhook || !webhookUrl) {
    const discordConfig = await getDiscordConfig(orgId);
    if (!discordConfig.is_active) {
      return { success: false, error: 'Discord integration is not active for this organization' };
    }
    webhookUrl = discordConfig.webhook_url || undefined;
  }

  if (!webhookUrl) {
    return { success: false, error: 'No Discord webhook URL configured' };
  }

  // Parse color from hex to decimal
  let embedColor: number = DISCORD_COLORS.discord;
  if (embedColorHex) {
    const hex = embedColorHex.replace('#', '');
    embedColor = parseInt(hex, 16) || DISCORD_COLORS.discord;
  }

  // Build embed if title or description provided
  const embed = (embedTitle || embedDescription) ? {
    title: embedTitle || undefined,
    description: embedDescription || undefined,
    color: embedColor,
    footer: {
      text: 'Skali Prog',
    },
    timestamp: new Date().toISOString(),
  } : undefined;

  try {
    const result = await sendDiscordCustomMessage(
      orgId,
      webhookUrl,
      message || undefined,
      embed,
      {
        workflow_context: {
          member_id: context.member?.id,
          member_name: context.member ? `${context.member.first_name} ${context.member.last_name || ''}`.trim() : undefined,
        },
      }
    );

    return {
      success: result.success,
      data: { messageId: result.messageId },
      error: result.error,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send Discord message',
    };
  }
};

// =====================================================
// ACTION REGISTRY
// =====================================================

const actionHandlers: Partial<Record<ActionType, ActionHandler>> = {
  send_email: sendEmailHandler,
  send_in_app_notification: sendInAppNotificationHandler,
  send_discord_message: sendDiscordMessageHandler,
  delay: delayHandler,
  condition_branch: conditionBranchHandler,
  update_member: updateMemberHandler,
};

// Extended handlers (Phase 2)
const extendedHandlers: Record<string, ActionHandler> = {
  send_push_notification: sendPushNotificationHandler,
  add_member_tag: addMemberTagHandler,
  remove_member_tag: removeMemberTagHandler,
  http_request: httpRequestHandler,
  call_webhook: httpRequestHandler, // Alias
  log_event: logEventHandler,
};

// =====================================================
// MAIN EXECUTE FUNCTION
// =====================================================

export async function executeAction(
  actionType: ActionType,
  config: Record<string, unknown>,
  context: WorkflowContext,
  orgId: string
): Promise<ActionResult> {
  const handler = actionHandlers[actionType] || extendedHandlers[actionType as string];

  if (!handler) {
    return {
      success: false,
      error: `Unknown action type: ${actionType}`,
    };
  }

  try {
    return await handler(config, context, orgId);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Action execution failed',
    };
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Interpolate template variables in a string
 */
function interpolateString(template: string, context: WorkflowContext): string {
  if (!template) return '';

  return template.replace(/\{\{(.+?)\}\}/g, (_, path) => {
    const value = getValueFromPath(path.trim(), context);
    return value !== undefined ? String(value) : '';
  });
}

/**
 * Get a value from context using dot notation path
 */
function getValueFromPath(path: string, context: WorkflowContext): unknown {
  const parts = path.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = context;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}
