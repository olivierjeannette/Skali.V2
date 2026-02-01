'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  sendWebhookMessage,
  testWebhook,
  buildWodEmbed,
  buildWelcomeMemberEmbed,
  buildClassReminderEmbed,
  buildAchievementEmbed,
  buildAnnouncementEmbed,
  isValidWebhookUrl,
  type DiscordEmbed,
  type WorkoutForEmbed,
  type MemberForEmbed,
} from '@/lib/discord';

// =====================================================
// TYPES
// =====================================================

export interface DiscordConfig {
  id: string;
  org_id: string;
  webhook_url: string | null;
  wod_channel_webhook: string | null;
  guild_id: string | null;
  bot_channel_id: string | null;
  auto_post_wod: boolean;
  post_wod_time: string;
  post_wod_days: string[];
  notification_types: {
    welcome: boolean;
    class_reminder: boolean;
    subscription_alert: boolean;
    achievement: boolean;
    announcement: boolean;
  };
  is_active: boolean;
  last_wod_posted_at: string | null;
  last_wod_workout_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscordLog {
  id: string;
  org_id: string;
  member_id: string | null;
  workout_id: string | null;
  class_id: string | null;
  message_type: 'wod' | 'welcome' | 'class_reminder' | 'subscription_alert' | 'achievement' | 'announcement' | 'custom';
  webhook_url: string;
  content: string | null;
  embed_data: DiscordEmbed | null;
  status: 'pending' | 'sent' | 'failed';
  discord_message_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  sent_at: string | null;
}

export type DiscordMessageType = DiscordLog['message_type'];

// Default configuration
const defaultConfig: Omit<DiscordConfig, 'id' | 'org_id' | 'created_at' | 'updated_at'> = {
  webhook_url: null,
  wod_channel_webhook: null,
  guild_id: null,
  bot_channel_id: null,
  auto_post_wod: false,
  post_wod_time: '06:00:00',
  post_wod_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  notification_types: {
    welcome: true,
    class_reminder: false,
    subscription_alert: false,
    achievement: true,
    announcement: true,
  },
  is_active: true,
  last_wod_posted_at: null,
  last_wod_workout_id: null,
};

// =====================================================
// CONFIG ACTIONS
// =====================================================

/**
 * Get Discord configuration for an organization
 */
export async function getDiscordConfig(orgId: string): Promise<DiscordConfig> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('discord_config')
    .select('*')
    .eq('org_id', orgId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching discord config:', error);
  }

  // Return data or defaults
  if (!data) {
    return {
      id: '',
      org_id: orgId,
      ...defaultConfig,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return data as DiscordConfig;
}

/**
 * Update Discord configuration
 */
export async function updateDiscordConfig(
  orgId: string,
  config: Partial<Omit<DiscordConfig, 'id' | 'org_id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Validate webhook URLs if provided
  if (config.webhook_url && !isValidWebhookUrl(config.webhook_url)) {
    return { success: false, error: 'Invalid webhook URL format' };
  }
  if (config.wod_channel_webhook && !isValidWebhookUrl(config.wod_channel_webhook)) {
    return { success: false, error: 'Invalid WOD channel webhook URL format' };
  }

  // Check if config exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('discord_config')
    .select('id')
    .eq('org_id', orgId)
    .single();

  let result;
  if (existing) {
    // Update existing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = await (supabase as any)
      .from('discord_config')
      .update(config)
      .eq('org_id', orgId);
  } else {
    // Insert new
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = await (supabase as any)
      .from('discord_config')
      .insert({
        org_id: orgId,
        ...defaultConfig,
        ...config,
      });
  }

  if (result.error) {
    console.error('Error updating discord config:', result.error);
    return { success: false, error: result.error.message };
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/settings/discord');

  return { success: true };
}

/**
 * Test Discord webhook connection
 */
export async function testDiscordWebhook(
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!isValidWebhookUrl(webhookUrl)) {
    return { success: false, error: 'Invalid webhook URL format' };
  }

  const result = await testWebhook(webhookUrl);

  return {
    success: result.success,
    error: result.error,
  };
}

// =====================================================
// MESSAGE ACTIONS
// =====================================================

/**
 * Send a WOD message to Discord
 */
export async function sendDiscordWodMessage(
  orgId: string,
  workoutId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const supabase = await createClient();

  // Get Discord config
  const config = await getDiscordConfig(orgId);

  if (!config.is_active) {
    return { success: false, error: 'Discord integration is not active' };
  }

  const webhookUrl = config.wod_channel_webhook || config.webhook_url;
  if (!webhookUrl) {
    return { success: false, error: 'No Discord webhook configured' };
  }

  // Get workout with blocks and exercises
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workout, error: workoutError } = await (supabase as any)
    .from('workouts')
    .select(`
      *,
      blocks:workout_blocks(
        *,
        exercises:block_exercises(
          *,
          exercise:exercises(*)
        )
      )
    `)
    .eq('id', workoutId)
    .single();

  if (workoutError || !workout) {
    console.error('Error fetching workout:', workoutError);
    return { success: false, error: 'Workout not found' };
  }

  // Get org name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (supabase as any)
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single();

  // Build and send embed
  const embed = buildWodEmbed(workout as WorkoutForEmbed, org?.name);

  // Create log entry first
  const logId = crypto.randomUUID();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('discord_logs')
    .insert({
      id: logId,
      org_id: orgId,
      workout_id: workoutId,
      message_type: 'wod',
      webhook_url: webhookUrl,
      embed_data: embed,
      status: 'pending',
    });

  // Send message
  const result = await sendWebhookMessage(webhookUrl, {
    embeds: [embed],
  });

  // Update log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('discord_logs')
    .update({
      status: result.success ? 'sent' : 'failed',
      discord_message_id: result.messageId,
      error_message: result.error,
      sent_at: result.success ? new Date().toISOString() : null,
    })
    .eq('id', logId);

  // Update last WOD posted
  if (result.success) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('discord_config')
      .update({
        last_wod_posted_at: new Date().toISOString(),
        last_wod_workout_id: workoutId,
      })
      .eq('org_id', orgId);
  }

  revalidatePath('/dashboard/settings/discord');

  return result;
}

/**
 * Send welcome message for new member
 */
export async function sendDiscordWelcomeMessage(
  orgId: string,
  member: MemberForEmbed
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const supabase = await createClient();

  // Get Discord config
  const config = await getDiscordConfig(orgId);

  if (!config.is_active || !config.notification_types.welcome) {
    return { success: false, error: 'Welcome notifications disabled' };
  }

  const webhookUrl = config.webhook_url;
  if (!webhookUrl) {
    return { success: false, error: 'No Discord webhook configured' };
  }

  // Get org name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (supabase as any)
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single();

  // Build embed
  const embed = buildWelcomeMemberEmbed(member, org?.name || 'la salle');

  // Create log
  const logId = crypto.randomUUID();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('discord_logs')
    .insert({
      id: logId,
      org_id: orgId,
      member_id: member.id,
      message_type: 'welcome',
      webhook_url: webhookUrl,
      embed_data: embed,
      status: 'pending',
    });

  // Send message
  const result = await sendWebhookMessage(webhookUrl, {
    embeds: [embed],
  });

  // Update log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('discord_logs')
    .update({
      status: result.success ? 'sent' : 'failed',
      discord_message_id: result.messageId,
      error_message: result.error,
      sent_at: result.success ? new Date().toISOString() : null,
    })
    .eq('id', logId);

  return result;
}

/**
 * Send class reminder to Discord
 */
export async function sendDiscordClassReminder(
  orgId: string,
  classId: string,
  className: string,
  startsAt: Date,
  coachName?: string,
  spotsLeft?: number
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const supabase = await createClient();

  // Get Discord config
  const config = await getDiscordConfig(orgId);

  if (!config.is_active || !config.notification_types.class_reminder) {
    return { success: false, error: 'Class reminder notifications disabled' };
  }

  const webhookUrl = config.webhook_url;
  if (!webhookUrl) {
    return { success: false, error: 'No Discord webhook configured' };
  }

  // Build embed
  const embed = buildClassReminderEmbed(className, startsAt, coachName, spotsLeft);

  // Create log
  const logId = crypto.randomUUID();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('discord_logs')
    .insert({
      id: logId,
      org_id: orgId,
      class_id: classId,
      message_type: 'class_reminder',
      webhook_url: webhookUrl,
      embed_data: embed,
      status: 'pending',
    });

  // Send message
  const result = await sendWebhookMessage(webhookUrl, {
    embeds: [embed],
  });

  // Update log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('discord_logs')
    .update({
      status: result.success ? 'sent' : 'failed',
      discord_message_id: result.messageId,
      error_message: result.error,
      sent_at: result.success ? new Date().toISOString() : null,
    })
    .eq('id', logId);

  return result;
}

/**
 * Send achievement message
 */
export async function sendDiscordAchievement(
  orgId: string,
  memberId: string,
  memberName: string,
  achievementType: string,
  details: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const supabase = await createClient();

  // Get Discord config
  const config = await getDiscordConfig(orgId);

  if (!config.is_active || !config.notification_types.achievement) {
    return { success: false, error: 'Achievement notifications disabled' };
  }

  const webhookUrl = config.webhook_url;
  if (!webhookUrl) {
    return { success: false, error: 'No Discord webhook configured' };
  }

  // Build embed
  const embed = buildAchievementEmbed(memberName, achievementType, details);

  // Create log
  const logId = crypto.randomUUID();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('discord_logs')
    .insert({
      id: logId,
      org_id: orgId,
      member_id: memberId,
      message_type: 'achievement',
      webhook_url: webhookUrl,
      embed_data: embed,
      status: 'pending',
    });

  // Send message
  const result = await sendWebhookMessage(webhookUrl, {
    embeds: [embed],
  });

  // Update log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('discord_logs')
    .update({
      status: result.success ? 'sent' : 'failed',
      discord_message_id: result.messageId,
      error_message: result.error,
      sent_at: result.success ? new Date().toISOString() : null,
    })
    .eq('id', logId);

  return result;
}

/**
 * Send custom announcement
 */
export async function sendDiscordAnnouncement(
  orgId: string,
  title: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const supabase = await createClient();

  // Get Discord config
  const config = await getDiscordConfig(orgId);

  if (!config.is_active || !config.notification_types.announcement) {
    return { success: false, error: 'Announcement notifications disabled' };
  }

  const webhookUrl = config.webhook_url;
  if (!webhookUrl) {
    return { success: false, error: 'No Discord webhook configured' };
  }

  // Get org name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (supabase as any)
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single();

  // Build embed
  const embed = buildAnnouncementEmbed(title, message, org?.name);

  // Create log
  const logId = crypto.randomUUID();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('discord_logs')
    .insert({
      id: logId,
      org_id: orgId,
      message_type: 'announcement',
      webhook_url: webhookUrl,
      content: message,
      embed_data: embed,
      status: 'pending',
    });

  // Send message
  const result = await sendWebhookMessage(webhookUrl, {
    embeds: [embed],
  });

  // Update log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('discord_logs')
    .update({
      status: result.success ? 'sent' : 'failed',
      discord_message_id: result.messageId,
      error_message: result.error,
      sent_at: result.success ? new Date().toISOString() : null,
    })
    .eq('id', logId);

  return result;
}

/**
 * Send custom Discord message (for workflows)
 */
export async function sendDiscordCustomMessage(
  orgId: string,
  webhookUrl: string,
  content?: string,
  embed?: DiscordEmbed,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const supabase = await createClient();

  if (!isValidWebhookUrl(webhookUrl)) {
    return { success: false, error: 'Invalid webhook URL' };
  }

  // Create log
  const logId = crypto.randomUUID();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('discord_logs')
    .insert({
      id: logId,
      org_id: orgId,
      message_type: 'custom',
      webhook_url: webhookUrl,
      content: content,
      embed_data: embed,
      status: 'pending',
      metadata: metadata || {},
    });

  // Send message
  const result = await sendWebhookMessage(webhookUrl, {
    content,
    embeds: embed ? [embed] : undefined,
  });

  // Update log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('discord_logs')
    .update({
      status: result.success ? 'sent' : 'failed',
      discord_message_id: result.messageId,
      error_message: result.error,
      sent_at: result.success ? new Date().toISOString() : null,
    })
    .eq('id', logId);

  return result;
}

// =====================================================
// LOG ACTIONS
// =====================================================

/**
 * Get Discord logs for an organization
 */
export async function getDiscordLogs(
  orgId: string,
  options?: {
    messageType?: DiscordMessageType;
    status?: 'pending' | 'sent' | 'failed';
    limit?: number;
    offset?: number;
  }
): Promise<{ data: DiscordLog[]; count: number }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('discord_logs')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (options?.messageType) {
    query = query.eq('message_type', options.messageType);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching discord logs:', error);
    return { data: [], count: 0 };
  }

  return {
    data: (data || []) as DiscordLog[],
    count: count || 0,
  };
}

/**
 * Get Discord log stats
 */
export async function getDiscordLogStats(
  orgId: string
): Promise<{
  total: number;
  sent: number;
  failed: number;
  byType: Record<DiscordMessageType, number>;
}> {
  const supabase = await createClient();

  // Get total count by status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('discord_logs')
    .select('status, message_type')
    .eq('org_id', orgId);

  if (error || !data) {
    return {
      total: 0,
      sent: 0,
      failed: 0,
      byType: {} as Record<DiscordMessageType, number>,
    };
  }

  const logs = data as Array<{ status: string; message_type: DiscordMessageType }>;

  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
    byType: {} as Record<DiscordMessageType, number>,
  };

  // Count by type
  for (const log of logs) {
    if (!stats.byType[log.message_type]) {
      stats.byType[log.message_type] = 0;
    }
    stats.byType[log.message_type]++;
  }

  return stats;
}

// =====================================================
// CRON HELPER - Get orgs for WOD posting
// =====================================================

/**
 * Get organizations that need WOD posted today
 */
export async function getOrgsForWodPost(): Promise<
  Array<{
    orgId: string;
    orgName: string;
    webhookUrl: string;
  }>
> {
  const supabase = await createClient();

  // Get current day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('discord_config')
    .select(`
      org_id,
      wod_channel_webhook,
      webhook_url,
      organizations!inner(name)
    `)
    .eq('is_active', true)
    .eq('auto_post_wod', true)
    .contains('post_wod_days', [today]);

  if (error || !data) {
    console.error('Error fetching orgs for WOD post:', error);
    return [];
  }

  return data.map((d: { org_id: string; wod_channel_webhook: string | null; webhook_url: string | null; organizations: { name: string } }) => ({
    orgId: d.org_id,
    orgName: d.organizations.name,
    webhookUrl: d.wod_channel_webhook || d.webhook_url || '',
  })).filter((d: { webhookUrl: string }) => d.webhookUrl);
}

/**
 * Get today's workout for an organization
 */
export async function getTodaysWorkout(
  orgId: string
): Promise<WorkoutForEmbed | null> {
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workouts')
    .select(`
      *,
      blocks:workout_blocks(
        *,
        exercises:block_exercises(
          *,
          exercise:exercises(*)
        )
      )
    `)
    .eq('org_id', orgId)
    .eq('date', today)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching today workout:', error);
    }
    return null;
  }

  return data as WorkoutForEmbed;
}
