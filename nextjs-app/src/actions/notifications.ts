'use server';

import { getResendClient, emailConfig, isEmailConfigured } from '@/lib/resend/client';
import {
  WelcomeEmail,
  ClassReminderEmail,
  SubscriptionExpiringEmail,
  ClassCancelledEmail,
  BookingConfirmationEmail,
} from '@/lib/resend/templates';
import { createClient } from '@/lib/supabase/server';
import {
  createEmailLog,
  updateEmailLogStatus,
  type EmailTemplateType,
} from './email-logs';
import {
  memberWantsNotification,
  orgWantsToSendNotification,
} from './notification-settings';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Types
interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  logId?: string;
}

interface MemberEmailData {
  id?: string;
  email: string;
  firstName: string;
  lastName?: string;
}

interface ClassEmailData {
  name: string;
  date: string;
  time: string;
  coachName?: string;
}

interface SubscriptionEmailData {
  planName: string;
  expirationDate: string;
  daysRemaining: number;
}

// Get organization name
async function getOrganizationName(orgId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single();
  return data?.name || 'Skali Prog';
}

// Helper: log and send email
async function logAndSendEmail(
  orgId: string,
  memberId: string | undefined,
  recipientEmail: string,
  recipientName: string,
  templateType: EmailTemplateType,
  subject: string,
  sendFn: () => Promise<{ id?: string; error?: { message: string } }>,
  metadata?: Record<string, unknown>
): Promise<SendEmailResult> {
  // Create log entry
  const log = await createEmailLog({
    orgId,
    memberId,
    recipientEmail,
    recipientName,
    templateType,
    subject,
    metadata,
  });

  if (!log) {
    console.error('Failed to create email log');
    return { success: false, error: 'Failed to log email' };
  }

  try {
    const result = await sendFn();

    if (result.error) {
      await updateEmailLogStatus(log.id, 'failed', {
        errorMessage: result.error.message,
      });
      return { success: false, error: result.error.message, logId: log.id };
    }

    await updateEmailLogStatus(log.id, 'delivered', {
      resendMessageId: result.id,
    });

    return { success: true, messageId: result.id, logId: log.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to send email';
    await updateEmailLogStatus(log.id, 'failed', { errorMessage });
    return { success: false, error: errorMessage, logId: log.id };
  }
}

// Send Welcome Email
export async function sendWelcomeEmail(
  member: MemberEmailData,
  orgId: string
): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping welcome email');
    return { success: false, error: 'Email not configured' };
  }

  // Check org settings
  const shouldSend = await orgWantsToSendNotification(orgId, 'welcome');
  if (!shouldSend) {
    return { success: false, error: 'Welcome emails disabled for this organization' };
  }

  const resend = getResendClient();
  const organizationName = await getOrganizationName(orgId);
  const memberName = member.lastName
    ? `${member.firstName} ${member.lastName}`
    : member.firstName;
  const subject = `Bienvenue chez ${organizationName}`;

  return logAndSendEmail(
    orgId,
    member.id,
    member.email,
    memberName,
    'welcome',
    subject,
    async () => {
      const result = await resend.emails.send({
        from: emailConfig.from,
        to: member.email,
        subject,
        react: WelcomeEmail({
          memberName,
          organizationName,
          loginUrl: `${APP_URL}/login`,
        }),
      });
      return { id: result.data?.id, error: result.error || undefined };
    },
    { organizationName }
  );
}

// Send Booking Confirmation Email
export async function sendBookingConfirmationEmail(
  member: MemberEmailData,
  classData: ClassEmailData,
  orgId: string,
  spotsRemaining?: number
): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping booking confirmation email');
    return { success: false, error: 'Email not configured' };
  }

  // Check org settings
  const shouldSend = await orgWantsToSendNotification(orgId, 'booking_confirmation');
  if (!shouldSend) {
    return { success: false, error: 'Booking confirmations disabled' };
  }

  // Check member preferences
  if (member.id) {
    const wantsNotif = await memberWantsNotification(member.id, 'booking_confirmation');
    if (!wantsNotif) {
      return { success: false, error: 'Member opted out of booking confirmations' };
    }
  }

  const resend = getResendClient();
  const organizationName = await getOrganizationName(orgId);
  const memberName = member.lastName
    ? `${member.firstName} ${member.lastName}`
    : member.firstName;
  const subject = `Reservation confirmee : ${classData.name}`;

  return logAndSendEmail(
    orgId,
    member.id,
    member.email,
    memberName,
    'booking_confirmation',
    subject,
    async () => {
      const result = await resend.emails.send({
        from: emailConfig.from,
        to: member.email,
        subject,
        react: BookingConfirmationEmail({
          memberName,
          organizationName,
          className: classData.name,
          classDate: classData.date,
          classTime: classData.time,
          coachName: classData.coachName,
          spotsRemaining,
          cancelUrl: `${APP_URL}/dashboard/planning`,
        }),
      });
      return { id: result.data?.id, error: result.error || undefined };
    },
    { className: classData.name, classDate: classData.date, classTime: classData.time }
  );
}

// Send Class Reminder Email
export async function sendClassReminderEmail(
  member: MemberEmailData,
  classData: ClassEmailData,
  orgId: string
): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping class reminder email');
    return { success: false, error: 'Email not configured' };
  }

  // Check member preferences
  if (member.id) {
    const wantsNotif = await memberWantsNotification(member.id, 'class_reminder');
    if (!wantsNotif) {
      return { success: false, error: 'Member opted out of class reminders' };
    }
  }

  const resend = getResendClient();
  const organizationName = await getOrganizationName(orgId);
  const memberName = member.lastName
    ? `${member.firstName} ${member.lastName}`
    : member.firstName;
  const subject = `Rappel : ${classData.name} demain a ${classData.time}`;

  return logAndSendEmail(
    orgId,
    member.id,
    member.email,
    memberName,
    'class_reminder',
    subject,
    async () => {
      const result = await resend.emails.send({
        from: emailConfig.from,
        to: member.email,
        subject,
        react: ClassReminderEmail({
          memberName,
          organizationName,
          className: classData.name,
          classDate: classData.date,
          classTime: classData.time,
          coachName: classData.coachName,
          cancelUrl: `${APP_URL}/dashboard/planning`,
        }),
      });
      return { id: result.data?.id, error: result.error || undefined };
    },
    { className: classData.name, classDate: classData.date, classTime: classData.time }
  );
}

// Send Class Cancelled Email
export async function sendClassCancelledEmail(
  member: MemberEmailData,
  classData: ClassEmailData,
  orgId: string,
  reason?: string
): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping class cancelled email');
    return { success: false, error: 'Email not configured' };
  }

  // Check org settings
  const shouldSend = await orgWantsToSendNotification(orgId, 'class_cancelled');
  if (!shouldSend) {
    return { success: false, error: 'Class cancellation emails disabled' };
  }

  const resend = getResendClient();
  const organizationName = await getOrganizationName(orgId);
  const memberName = member.lastName
    ? `${member.firstName} ${member.lastName}`
    : member.firstName;
  const subject = `Cours annule : ${classData.name}`;

  return logAndSendEmail(
    orgId,
    member.id,
    member.email,
    memberName,
    'class_cancelled',
    subject,
    async () => {
      const result = await resend.emails.send({
        from: emailConfig.from,
        to: member.email,
        subject,
        react: ClassCancelledEmail({
          memberName,
          organizationName,
          className: classData.name,
          classDate: classData.date,
          classTime: classData.time,
          reason,
          planningUrl: `${APP_URL}/dashboard/planning`,
        }),
      });
      return { id: result.data?.id, error: result.error || undefined };
    },
    { className: classData.name, classDate: classData.date, reason }
  );
}

// Send Subscription Expiring Email
export async function sendSubscriptionExpiringEmail(
  member: MemberEmailData,
  subscription: SubscriptionEmailData,
  orgId: string
): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping subscription expiring email');
    return { success: false, error: 'Email not configured' };
  }

  // Check member preferences
  if (member.id) {
    const wantsNotif = await memberWantsNotification(member.id, 'subscription_alert');
    if (!wantsNotif) {
      return { success: false, error: 'Member opted out of subscription alerts' };
    }
  }

  const resend = getResendClient();
  const organizationName = await getOrganizationName(orgId);
  const memberName = member.lastName
    ? `${member.firstName} ${member.lastName}`
    : member.firstName;
  const subject = `Votre abonnement ${subscription.planName} expire bientot`;

  return logAndSendEmail(
    orgId,
    member.id,
    member.email,
    memberName,
    'subscription_expiring',
    subject,
    async () => {
      const result = await resend.emails.send({
        from: emailConfig.from,
        to: member.email,
        subject,
        react: SubscriptionExpiringEmail({
          memberName,
          organizationName,
          planName: subscription.planName,
          expirationDate: subscription.expirationDate,
          daysRemaining: subscription.daysRemaining,
          renewUrl: `${APP_URL}/dashboard/subscriptions`,
        }),
      });
      return { id: result.data?.id, error: result.error || undefined };
    },
    { planName: subscription.planName, daysRemaining: subscription.daysRemaining }
  );
}

// Batch: Send Subscription Expiration Reminders
export async function sendSubscriptionExpirationReminders(
  orgId: string,
  daysThreshold: number = 7
): Promise<{ sent: number; errors: number; skipped: number }> {
  const supabase = await createClient();

  // Check org settings first
  const notifType = daysThreshold > 14 ? 'subscription_expiring_30d' : 'subscription_expiring_7d';
  const shouldSend = await orgWantsToSendNotification(orgId, notifType);
  if (!shouldSend) {
    return { sent: 0, errors: 0, skipped: 0 };
  }

  // Get expiring subscriptions
  const today = new Date();
  const thresholdDate = new Date(today);
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('id, end_date, member_id, plan_id')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .gte('end_date', today.toISOString().split('T')[0])
    .lte('end_date', thresholdDate.toISOString().split('T')[0]);

  if (error || !subscriptions) {
    console.error('Error fetching expiring subscriptions:', error);
    return { sent: 0, errors: 1, skipped: 0 };
  }

  let sent = 0;
  let errors = 0;
  let skipped = 0;

  for (const sub of subscriptions) {
    if (!sub.plan_id) continue;

    // Fetch member separately
    const { data: member } = await supabase
      .from('members')
      .select('id, first_name, last_name, email')
      .eq('id', sub.member_id)
      .single();

    // Fetch plan separately
    const { data: plan } = await supabase
      .from('plans')
      .select('name')
      .eq('id', sub.plan_id)
      .single();

    if (!member?.email || !plan || !sub.end_date) continue;

    const endDate = new Date(sub.end_date);
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const result = await sendSubscriptionExpiringEmail(
      {
        id: member.id,
        email: member.email,
        firstName: member.first_name,
        lastName: member.last_name,
      },
      {
        planName: plan.name,
        expirationDate: endDate.toLocaleDateString('fr-FR'),
        daysRemaining,
      },
      orgId
    );

    if (result.success) {
      sent++;
    } else if (result.error?.includes('opted out')) {
      skipped++;
    } else {
      errors++;
    }
  }

  return { sent, errors, skipped };
}

// Batch: Send Class Reminders (for tomorrow's classes)
export async function sendTomorrowClassReminders(
  orgId: string
): Promise<{ sent: number; errors: number; skipped: number }> {
  const supabase = await createClient();

  // Check org settings
  const shouldSend = await orgWantsToSendNotification(orgId, 'class_reminder_24h');
  if (!shouldSend) {
    return { sent: 0, errors: 0, skipped: 0 };
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = new Date(tomorrow);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59, 999);

  // Get tomorrow's bookings
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, member_id, class_id')
    .eq('org_id', orgId)
    .eq('status', 'confirmed');

  if (error || !bookings) {
    console.error('Error fetching bookings:', error);
    return { sent: 0, errors: 1, skipped: 0 };
  }

  let sent = 0;
  let errors = 0;
  let skipped = 0;

  for (const booking of bookings) {
    // Get class info
    const { data: classInfo } = await supabase
      .from('classes')
      .select('id, name, start_time, coach_id')
      .eq('id', booking.class_id)
      .gte('start_time', tomorrowStart.toISOString())
      .lte('start_time', tomorrowEnd.toISOString())
      .single();

    if (!classInfo) continue; // Not tomorrow's class

    // Get member info
    const { data: member } = await supabase
      .from('members')
      .select('id, first_name, last_name, email')
      .eq('id', booking.member_id)
      .single();

    if (!member?.email) continue;

    // Get coach name if exists
    let coachName: string | undefined;
    if (classInfo.coach_id) {
      const { data: coach } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', classInfo.coach_id)
        .single();
      coachName = coach?.full_name || undefined;
    }

    const startTime = new Date(classInfo.start_time);
    const result = await sendClassReminderEmail(
      {
        id: member.id,
        email: member.email,
        firstName: member.first_name,
        lastName: member.last_name,
      },
      {
        name: classInfo.name,
        date: startTime.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        }),
        time: startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        coachName,
      },
      orgId
    );

    if (result.success) {
      sent++;
    } else if (result.error?.includes('opted out')) {
      skipped++;
    } else {
      errors++;
    }
  }

  return { sent, errors, skipped };
}

// Send custom email to a member
export async function sendCustomEmail(
  member: MemberEmailData,
  orgId: string,
  subject: string,
  content: string
): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    return { success: false, error: 'Email not configured' };
  }

  const resend = getResendClient();
  const organizationName = await getOrganizationName(orgId);
  const memberName = member.lastName
    ? `${member.firstName} ${member.lastName}`
    : member.firstName;

  return logAndSendEmail(
    orgId,
    member.id,
    member.email,
    memberName,
    'custom',
    subject,
    async () => {
      const result = await resend.emails.send({
        from: emailConfig.from,
        to: member.email,
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
              <h2 style="color: #0a0a0a; margin: 0 0 16px 0;">${organizationName}</h2>
              <p style="color: #4a4a4a;">Bonjour ${memberName},</p>
              <div style="color: #4a4a4a; white-space: pre-wrap;">${content}</div>
            </div>
          </div>
        `,
      });
      return { id: result.data?.id, error: result.error || undefined };
    },
    { customContent: true }
  );
}

// Send bulk email to multiple members
export async function sendBulkEmail(
  memberIds: string[],
  orgId: string,
  subject: string,
  content: string
): Promise<{ sent: number; errors: number }> {
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from('members')
    .select('id, first_name, last_name, email')
    .eq('org_id', orgId)
    .in('id', memberIds);

  if (error || !members) {
    return { sent: 0, errors: 1 };
  }

  let sent = 0;
  let errors = 0;

  for (const member of members) {
    if (!member.email) continue;

    const result = await sendCustomEmail(
      {
        id: member.id,
        email: member.email,
        firstName: member.first_name,
        lastName: member.last_name,
      },
      orgId,
      subject,
      content
    );

    if (result.success) {
      sent++;
    } else {
      errors++;
    }
  }

  return { sent, errors };
}
