'use server';

import { createClient } from '@/lib/supabase/server';

// Note: email_logs, notification_settings, etc. tables are defined in
// supabase/migrations/00004_notifications.sql but not yet in database.types.ts
// After applying migrations, regenerate types with: npm run db:gen

// Types
export type EmailStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
export type EmailTemplateType =
  | 'welcome'
  | 'booking_confirmation'
  | 'class_reminder'
  | 'class_cancelled'
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'payment_confirmation'
  | 'password_reset'
  | 'custom';

export interface EmailLog {
  id: string;
  org_id: string;
  member_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  template_type: EmailTemplateType;
  subject: string;
  metadata: Record<string, unknown>;
  status: EmailStatus;
  resend_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface CreateEmailLogInput {
  orgId: string;
  memberId?: string;
  recipientEmail: string;
  recipientName?: string;
  templateType: EmailTemplateType;
  subject: string;
  metadata?: Record<string, unknown>;
}

export interface EmailLogFilters {
  status?: EmailStatus;
  templateType?: EmailTemplateType;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// Create email log
export async function createEmailLog(input: CreateEmailLogInput): Promise<{ id: string } | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('email_logs')
    .insert({
      org_id: input.orgId,
      member_id: input.memberId || null,
      recipient_email: input.recipientEmail,
      recipient_name: input.recipientName || null,
      template_type: input.templateType,
      subject: input.subject,
      metadata: input.metadata || {},
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating email log:', error);
    return null;
  }

  return data;
}

// Update email log status
export async function updateEmailLogStatus(
  logId: string,
  status: EmailStatus,
  options?: {
    resendMessageId?: string;
    errorMessage?: string;
  }
): Promise<boolean> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = { status };

  if (status === 'sent' || status === 'delivered') {
    updates.sent_at = new Date().toISOString();
  }
  if (status === 'delivered') {
    updates.delivered_at = new Date().toISOString();
  }
  if (options?.resendMessageId) {
    updates.resend_message_id = options.resendMessageId;
  }
  if (options?.errorMessage) {
    updates.error_message = options.errorMessage;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('email_logs')
    .update(updates)
    .eq('id', logId);

  if (error) {
    console.error('Error updating email log:', error);
    return false;
  }

  return true;
}

// Get email logs for organization
export async function getEmailLogs(
  orgId: string,
  filters?: EmailLogFilters,
  options?: { limit?: number; offset?: number }
): Promise<{ logs: EmailLog[]; total: number }> {
  const supabase = await createClient();
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('email_logs')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.templateType) {
    query = query.eq('template_type', filters.templateType);
  }
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  if (filters?.search) {
    query = query.or(
      `recipient_email.ilike.%${filters.search}%,recipient_name.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`
    );
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching email logs:', error);
    return { logs: [], total: 0 };
  }

  return {
    logs: (data || []) as EmailLog[],
    total: count || 0,
  };
}

// Get email log by ID
export async function getEmailLogById(logId: string): Promise<EmailLog | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('email_logs')
    .select('*')
    .eq('id', logId)
    .single();

  if (error) {
    console.error('Error fetching email log:', error);
    return null;
  }

  return data as EmailLog;
}

// Get email stats for organization
export async function getEmailStats(orgId: string): Promise<{
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  byTemplate: Record<string, number>;
}> {
  const supabase = await createClient();

  // Get counts by status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: statusCounts, error: statusError } = await (supabase as any)
    .from('email_logs')
    .select('status')
    .eq('org_id', orgId);

  if (statusError) {
    console.error('Error fetching email stats:', statusError);
    return { total: 0, delivered: 0, failed: 0, pending: 0, byTemplate: {} };
  }

  const stats = {
    total: statusCounts?.length || 0,
    delivered: statusCounts?.filter((e: { status: string }) => e.status === 'delivered').length || 0,
    failed: statusCounts?.filter((e: { status: string }) => e.status === 'failed' || e.status === 'bounced').length || 0,
    pending: statusCounts?.filter((e: { status: string }) => e.status === 'pending' || e.status === 'sent').length || 0,
    byTemplate: {} as Record<string, number>,
  };

  // Get counts by template
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: templateCounts } = await (supabase as any)
    .from('email_logs')
    .select('template_type')
    .eq('org_id', orgId);

  if (templateCounts) {
    for (const log of templateCounts) {
      const template = log.template_type;
      stats.byTemplate[template] = (stats.byTemplate[template] || 0) + 1;
    }
  }

  return stats;
}

// Get recent email logs for member
export async function getMemberEmailLogs(
  memberId: string,
  limit: number = 10
): Promise<EmailLog[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('email_logs')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching member email logs:', error);
    return [];
  }

  return (data || []) as EmailLog[];
}
