'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Types
export interface NotificationSettings {
  id: string;
  org_id: string;
  from_name: string | null;
  from_email: string | null;
  reply_to_email: string | null;
  send_welcome_email: boolean;
  send_booking_confirmation: boolean;
  send_class_reminder_24h: boolean;
  send_class_reminder_2h: boolean;
  send_class_cancelled: boolean;
  send_subscription_expiring_30d: boolean;
  send_subscription_expiring_7d: boolean;
  send_subscription_expired: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MemberNotificationPreferences {
  id: string;
  member_id: string;
  org_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  receive_class_reminders: boolean;
  receive_subscription_alerts: boolean;
  receive_booking_confirmations: boolean;
  receive_marketing: boolean;
  created_at: string;
  updated_at: string;
}

// Default settings
const defaultSettings: Omit<NotificationSettings, 'id' | 'org_id' | 'created_at' | 'updated_at'> = {
  from_name: 'Skali Prog',
  from_email: null,
  reply_to_email: null,
  send_welcome_email: true,
  send_booking_confirmation: true,
  send_class_reminder_24h: true,
  send_class_reminder_2h: false,
  send_class_cancelled: true,
  send_subscription_expiring_30d: true,
  send_subscription_expiring_7d: true,
  send_subscription_expired: false,
  settings: {},
};

// Get notification settings for organization
export async function getNotificationSettings(orgId: string): Promise<NotificationSettings> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('notification_settings')
    .select('*')
    .eq('org_id', orgId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching notification settings:', error);
  }

  // Return data or defaults
  if (!data) {
    return {
      id: '',
      org_id: orgId,
      ...defaultSettings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return data as NotificationSettings;
}

// Update notification settings
export async function updateNotificationSettings(
  orgId: string,
  settings: Partial<Omit<NotificationSettings, 'id' | 'org_id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Check if settings exist
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('notification_settings')
    .select('id')
    .eq('org_id', orgId)
    .single();

  let result;
  if (existing) {
    // Update existing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = await (supabase as any)
      .from('notification_settings')
      .update(settings)
      .eq('org_id', orgId);
  } else {
    // Insert new
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = await (supabase as any)
      .from('notification_settings')
      .insert({
        org_id: orgId,
        ...defaultSettings,
        ...settings,
      });
  }

  if (result.error) {
    console.error('Error updating notification settings:', result.error);
    return { success: false, error: result.error.message };
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/communications');

  return { success: true };
}

// Get member notification preferences
export async function getMemberNotificationPreferences(
  memberId: string
): Promise<MemberNotificationPreferences | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('member_notification_preferences')
    .select('*')
    .eq('member_id', memberId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching member notification preferences:', error);
  }

  return data as MemberNotificationPreferences | null;
}

// Update member notification preferences
export async function updateMemberNotificationPreferences(
  memberId: string,
  orgId: string,
  preferences: Partial<
    Omit<MemberNotificationPreferences, 'id' | 'member_id' | 'org_id' | 'created_at' | 'updated_at'>
  >
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Check if preferences exist
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('member_notification_preferences')
    .select('id')
    .eq('member_id', memberId)
    .single();

  let result;
  if (existing) {
    // Update existing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = await (supabase as any)
      .from('member_notification_preferences')
      .update(preferences)
      .eq('member_id', memberId);
  } else {
    // Insert new with defaults
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = await (supabase as any).from('member_notification_preferences').insert({
      member_id: memberId,
      org_id: orgId,
      email_enabled: true,
      push_enabled: true,
      receive_class_reminders: true,
      receive_subscription_alerts: true,
      receive_booking_confirmations: true,
      receive_marketing: false,
      ...preferences,
    });
  }

  if (result.error) {
    console.error('Error updating member notification preferences:', result.error);
    return { success: false, error: result.error.message };
  }

  revalidatePath(`/dashboard/members/${memberId}`);

  return { success: true };
}

// Check if member wants a specific notification type
export async function memberWantsNotification(
  memberId: string,
  notificationType: 'class_reminder' | 'subscription_alert' | 'booking_confirmation' | 'marketing'
): Promise<boolean> {
  const prefs = await getMemberNotificationPreferences(memberId);

  // Default to true if no preferences (opt-out model)
  if (!prefs) {
    return notificationType !== 'marketing';
  }

  // Check email enabled first
  if (!prefs.email_enabled) {
    return false;
  }

  // Check specific type
  switch (notificationType) {
    case 'class_reminder':
      return prefs.receive_class_reminders;
    case 'subscription_alert':
      return prefs.receive_subscription_alerts;
    case 'booking_confirmation':
      return prefs.receive_booking_confirmations;
    case 'marketing':
      return prefs.receive_marketing;
    default:
      return true;
  }
}

// Check if organization wants to send a specific notification type
export async function orgWantsToSendNotification(
  orgId: string,
  notificationType:
    | 'welcome'
    | 'booking_confirmation'
    | 'class_reminder_24h'
    | 'class_reminder_2h'
    | 'class_cancelled'
    | 'subscription_expiring_30d'
    | 'subscription_expiring_7d'
    | 'subscription_expired'
): Promise<boolean> {
  const settings = await getNotificationSettings(orgId);

  switch (notificationType) {
    case 'welcome':
      return settings.send_welcome_email;
    case 'booking_confirmation':
      return settings.send_booking_confirmation;
    case 'class_reminder_24h':
      return settings.send_class_reminder_24h;
    case 'class_reminder_2h':
      return settings.send_class_reminder_2h;
    case 'class_cancelled':
      return settings.send_class_cancelled;
    case 'subscription_expiring_30d':
      return settings.send_subscription_expiring_30d;
    case 'subscription_expiring_7d':
      return settings.send_subscription_expiring_7d;
    case 'subscription_expired':
      return settings.send_subscription_expired;
    default:
      return true;
  }
}
