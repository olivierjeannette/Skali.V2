'use server';

/**
 * RGPD Server Actions
 *
 * Note: Using type assertions for RGPD tables because they are not yet
 * in the generated Supabase types. Run `supabase gen types typescript` after
 * applying migration 00012_rgpd_compliance.sql to remove these assertions.
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireOrganization, requireMember } from '@/lib/auth';
import type {
  ConsentType,
  MemberConsent,
  RgpdRequest,
  RgpdRequestType,
  RgpdRequestStatus,
  RgpdAuditLog,
  MemberDataExport,
} from '@/types/rgpd.types';
import { headers } from 'next/headers';

/**
 * Helper function to get Supabase client with RGPD table access
 * Uses type assertion because RGPD tables are not in generated types
 */
async function getSupabaseWithRgpd() {
  const client = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return client as any;
}

// =====================================================
// TYPES
// =====================================================

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function getClientInfo() {
  const headersList = await headers();
  return {
    ipAddress:
      headersList.get('x-forwarded-for')?.split(',')[0] ||
      headersList.get('x-real-ip') ||
      null,
    userAgent: headersList.get('user-agent') || null,
  };
}

// =====================================================
// CONSENT MANAGEMENT
// =====================================================

/**
 * Get all active consents for a member
 * Note: Using type assertion because RGPD tables are not in generated types yet
 */
export async function getMemberConsents(
  memberId: string
): Promise<ActionResult<Record<ConsentType, boolean>>> {
  try {
    const supabase = await getSupabaseWithRgpd();

    // Get all consents for member, ordered by date to get latest per type
    const { data, error } = await supabase
      .from('member_consents')
      .select('consent_type, granted, consented_at')
      .eq('member_id', memberId)
      .order('consented_at', { ascending: false });

    if (error) throw error;

    // Get latest consent per type
    const consents: Record<string, boolean> = {};
    const seen = new Set<string>();

    (data || []).forEach((consent: { consent_type: string; granted: boolean }) => {
      if (!seen.has(consent.consent_type)) {
        seen.add(consent.consent_type);
        consents[consent.consent_type] = consent.granted;
      }
    });

    return { success: true, data: consents as Record<ConsentType, boolean> };
  } catch (error) {
    console.error('Error fetching consents:', error);
    return { success: false, error: 'Erreur lors de la recuperation des consentements' };
  }
}

/**
 * Get consent history for a member
 */
export async function getMemberConsentHistory(
  memberId: string
): Promise<ActionResult<MemberConsent[]>> {
  try {
    const supabase = await getSupabaseWithRgpd();

    const { data, error } = await supabase
      .from('member_consents')
      .select('*')
      .eq('member_id', memberId)
      .order('consented_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data as MemberConsent[] };
  } catch (error) {
    console.error('Error fetching consent history:', error);
    return { success: false, error: 'Erreur lors de la recuperation de l\'historique' };
  }
}

/**
 * Update a single consent for a member
 */
export async function updateConsent(
  memberId: string,
  consentType: ConsentType,
  granted: boolean,
  documentVersion?: string
): Promise<ActionResult<string>> {
  try {
    const { orgId } = await requireOrganization();
    const supabase = await getSupabaseWithRgpd();
    const clientInfo = await getClientInfo();

    // Insert new consent record (maintains history)
    const { data, error } = await supabase
      .from('member_consents')
      .insert({
        org_id: orgId,
        member_id: memberId,
        consent_type: consentType,
        granted,
        source: 'web',
        ip_address: clientInfo.ipAddress,
        user_agent: clientInfo.userAgent,
        document_version: documentVersion,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/member/profile');
    revalidatePath('/dashboard/members');

    return { success: true, data: data.id };
  } catch (error) {
    console.error('Error updating consent:', error);
    return { success: false, error: 'Erreur lors de la mise a jour du consentement' };
  }
}

/**
 * Batch update multiple consents
 */
export async function updateConsents(
  memberId: string,
  consents: Array<{ type: ConsentType; granted: boolean }>
): Promise<ActionResult> {
  try {
    const { orgId } = await requireOrganization();
    const supabase = await getSupabaseWithRgpd();
    const clientInfo = await getClientInfo();

    // Insert all consent records
    const records = consents.map((c) => ({
      org_id: orgId,
      member_id: memberId,
      consent_type: c.type,
      granted: c.granted,
      source: 'web',
      ip_address: clientInfo.ipAddress,
      user_agent: clientInfo.userAgent,
    }));

    const { error } = await supabase.from('member_consents').insert(records);

    if (error) throw error;

    revalidatePath('/member/profile');
    return { success: true };
  } catch (error) {
    console.error('Error updating consents:', error);
    return { success: false, error: 'Erreur lors de la mise a jour des consentements' };
  }
}

/**
 * Update consents for member portal (member self-service)
 */
export async function updateMyConsents(
  consents: Array<{ type: ConsentType; granted: boolean }>
): Promise<ActionResult> {
  try {
    const { member, orgId } = await requireMember();
    const supabase = await getSupabaseWithRgpd();
    const clientInfo = await getClientInfo();

    // Insert all consent records
    const records = consents.map((c) => ({
      org_id: orgId,
      member_id: member.id,
      consent_type: c.type,
      granted: c.granted,
      source: 'web',
      ip_address: clientInfo.ipAddress,
      user_agent: clientInfo.userAgent,
    }));

    const { error } = await supabase.from('member_consents').insert(records);

    if (error) throw error;

    revalidatePath('/member/profile');
    return { success: true };
  } catch (error) {
    console.error('Error updating my consents:', error);
    return { success: false, error: 'Erreur lors de la mise a jour des consentements' };
  }
}

// =====================================================
// RGPD REQUESTS
// =====================================================

/**
 * Create a new RGPD request (member self-service)
 */
export async function createMyRgpdRequest(
  requestType: RgpdRequestType,
  reason?: string
): Promise<ActionResult<string>> {
  try {
    const { member, orgId } = await requireMember();
    const supabase = await getSupabaseWithRgpd();
    const clientInfo = await getClientInfo();

    // Check for existing pending request of same type
    const { data: existing } = await supabase
      .from('rgpd_requests')
      .select('id')
      .eq('member_id', member.id)
      .eq('request_type', requestType)
      .in('status', ['pending', 'processing'])
      .single();

    if (existing) {
      return {
        success: false,
        error: 'Une demande similaire est deja en cours de traitement',
      };
    }

    const { data, error } = await supabase
      .from('rgpd_requests')
      .insert({
        org_id: orgId,
        member_id: member.id,
        request_type: requestType,
        requester_email: member.email || '',
        requester_name: `${member.first_name} ${member.last_name}`,
        reason,
        ip_address: clientInfo.ipAddress,
        user_agent: clientInfo.userAgent,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/member/profile');
    return { success: true, data: data.id };
  } catch (error) {
    console.error('Error creating RGPD request:', error);
    return { success: false, error: 'Erreur lors de la creation de la demande' };
  }
}

/**
 * Get my RGPD requests (member self-service)
 */
export async function getMyRgpdRequests(): Promise<ActionResult<RgpdRequest[]>> {
  try {
    const { member } = await requireMember();
    const supabase = await getSupabaseWithRgpd();

    const { data, error } = await supabase
      .from('rgpd_requests')
      .select('*')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data as RgpdRequest[] };
  } catch (error) {
    console.error('Error fetching my RGPD requests:', error);
    return { success: false, error: 'Erreur lors de la recuperation des demandes' };
  }
}

/**
 * Cancel my pending RGPD request
 */
export async function cancelMyRgpdRequest(requestId: string): Promise<ActionResult> {
  try {
    const { member } = await requireMember();
    const supabase = await getSupabaseWithRgpd();

    const { error } = await supabase
      .from('rgpd_requests')
      .update({ status: 'cancelled' as RgpdRequestStatus })
      .eq('id', requestId)
      .eq('member_id', member.id)
      .eq('status', 'pending');

    if (error) throw error;

    revalidatePath('/member/profile');
    return { success: true };
  } catch (error) {
    console.error('Error cancelling request:', error);
    return { success: false, error: 'Erreur lors de l\'annulation de la demande' };
  }
}

// =====================================================
// ADMIN: RGPD REQUEST MANAGEMENT
// =====================================================

/**
 * Get all RGPD requests for organization
 */
export async function getRgpdRequests(options?: {
  status?: RgpdRequestStatus;
  type?: RgpdRequestType;
}): Promise<ActionResult<RgpdRequest[]>> {
  try {
    const { orgId } = await requireOrganization();
    const supabase = await getSupabaseWithRgpd();

    let query = supabase
      .from('rgpd_requests')
      .select(
        `
        *,
        member:members(first_name, last_name, email),
        processor:profiles(full_name, email)
      `
      )
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.type) {
      query = query.eq('request_type', options.type);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data as unknown as RgpdRequest[] };
  } catch (error) {
    console.error('Error fetching RGPD requests:', error);
    return { success: false, error: 'Erreur lors de la recuperation des demandes' };
  }
}

/**
 * Get pending RGPD requests count
 */
export async function getPendingRgpdRequestsCount(): Promise<
  ActionResult<{ pending: number; urgent: number; overdue: number }>
> {
  try {
    const { orgId } = await requireOrganization();
    const supabase = await getSupabaseWithRgpd();

    const { data, error } = await supabase
      .from('rgpd_requests')
      .select('id, due_date, status')
      .eq('org_id', orgId)
      .in('status', ['pending', 'processing']);

    if (error) throw error;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const counts = {
      pending: data.length,
      urgent: data.filter(
        (r: { due_date: string }) => new Date(r.due_date) <= sevenDaysFromNow && new Date(r.due_date) > now
      ).length,
      overdue: data.filter((r: { due_date: string }) => new Date(r.due_date) < now).length,
    };

    return { success: true, data: counts };
  } catch (error) {
    console.error('Error fetching request counts:', error);
    return { success: false, error: 'Erreur lors du comptage' };
  }
}

/**
 * Process a RGPD request (approve or reject)
 */
export async function processRgpdRequest(
  requestId: string,
  action: 'approve' | 'reject',
  rejectionReason?: string
): Promise<ActionResult> {
  try {
    const { orgId, userId } = await requireOrganization();
    const supabase = await getSupabaseWithRgpd();

    // Get the request
    const { data: request, error: fetchError } = await supabase
      .from('rgpd_requests')
      .select('*')
      .eq('id', requestId)
      .eq('org_id', orgId)
      .single();

    if (fetchError || !request) {
      return { success: false, error: 'Demande non trouvee' };
    }

    if (action === 'reject') {
      // Reject the request
      const { error } = await supabase
        .from('rgpd_requests')
        .update({
          status: 'rejected' as RgpdRequestStatus,
          rejection_reason: rejectionReason,
          processed_by: userId,
          processed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
    } else {
      // Mark as processing
      await supabase
        .from('rgpd_requests')
        .update({ status: 'processing' as RgpdRequestStatus })
        .eq('id', requestId);

      // Process based on type
      if (request.request_type === 'data_export') {
        // Generate export
        const exportResult = await generateMemberDataExport(request.member_id);

        if (!exportResult.success) {
          throw new Error(exportResult.error);
        }

        // Update with export URL (in real implementation, upload to storage)
        const { error } = await supabase
          .from('rgpd_requests')
          .update({
            status: 'completed' as RgpdRequestStatus,
            processed_by: userId,
            processed_at: new Date().toISOString(),
            export_file_url: `/api/rgpd/export/${requestId}`,
            export_file_expires_at: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
          })
          .eq('id', requestId);

        if (error) throw error;

        // Update member's last export date
        await supabase
          .from('members')
          .update({ last_data_export_at: new Date().toISOString() })
          .eq('id', request.member_id);
      } else if (request.request_type === 'data_deletion') {
        // Anonymize member
        const { error: anonError } = await supabase.rpc('anonymize_member', {
          p_member_id: request.member_id,
          p_processed_by: userId,
        });

        if (anonError) throw anonError;

        const { error } = await supabase
          .from('rgpd_requests')
          .update({
            status: 'completed' as RgpdRequestStatus,
            processed_by: userId,
            processed_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        if (error) throw error;
      } else {
        // Other request types - just mark as completed
        const { error } = await supabase
          .from('rgpd_requests')
          .update({
            status: 'completed' as RgpdRequestStatus,
            processed_by: userId,
            processed_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        if (error) throw error;
      }
    }

    revalidatePath('/dashboard/settings/rgpd');
    return { success: true };
  } catch (error) {
    console.error('Error processing RGPD request:', error);
    return { success: false, error: 'Erreur lors du traitement de la demande' };
  }
}

// =====================================================
// DATA EXPORT
// =====================================================

/**
 * Generate complete data export for a member
 */
export async function generateMemberDataExport(
  memberId: string
): Promise<ActionResult<MemberDataExport>> {
  try {
    const supabase = await getSupabaseWithRgpd();

    // Get member data
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return { success: false, error: 'Membre non trouve' };
    }

    // Get subscriptions
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*, plan:plans(name)')
      .eq('member_id', memberId);

    // Get payments
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('member_id', memberId);

    // Get class attendances
    const { data: attendances } = await supabase
      .from('class_participants')
      .select('*, class:classes(name, starts_at)')
      .eq('member_id', memberId);

    // Get workout scores
    const { data: scores } = await supabase
      .from('workout_scores')
      .select('*, workout:workouts(name)')
      .eq('member_id', memberId);

    // Get personal records
    const { data: records } = await supabase
      .from('personal_records')
      .select('*')
      .eq('member_id', memberId);

    // Get consents
    const { data: consents } = await supabase
      .from('member_consents')
      .select('*')
      .eq('member_id', memberId)
      .order('consented_at', { ascending: false });

    const exportData: MemberDataExport = {
      exportDate: new Date().toISOString(),
      member: {
        id: member.id,
        member_number: member.member_number,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        phone: member.phone,
        birth_date: member.birth_date,
        gender: member.gender,
        joined_at: member.joined_at,
        created_at: member.created_at,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subscriptions: (subscriptions || []).map((s: any) => ({
        id: s.id,
        plan_name: s.plan?.name || 'N/A',
        status: s.status,
        start_date: s.start_date,
        end_date: s.end_date,
        created_at: s.created_at,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payments: (payments || []).map((p: any) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency || 'EUR',
        status: p.status,
        description: p.description,
        created_at: p.created_at,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      classAttendances: (attendances || []).map((a: any) => ({
        class_name: a.class?.name || 'N/A',
        date: a.class?.starts_at || a.created_at,
        status: a.status,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      workoutScores: (scores || []).map((s: any) => ({
        workout_name: s.workout?.name || 'N/A',
        score: s.score,
        rx: s.rx || false,
        date: s.created_at,
        notes: s.notes,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      personalRecords: (records || []).map((r: any) => ({
        exercise: r.exercise_name,
        value: String(r.value),
        unit: r.unit || '',
        date: r.achieved_at,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      consents: (consents || []).map((c: any) => ({
        type: c.consent_type,
        granted: c.granted,
        date: c.consented_at,
      })),
    };

    return { success: true, data: exportData };
  } catch (error) {
    console.error('Error generating data export:', error);
    return { success: false, error: 'Erreur lors de la generation de l\'export' };
  }
}

/**
 * Request my data export (member self-service)
 */
export async function requestMyDataExport(): Promise<ActionResult<string>> {
  return createMyRgpdRequest('data_export', 'Export de mes donnees personnelles');
}

/**
 * Request account deletion (member self-service)
 */
export async function requestAccountDeletion(reason?: string): Promise<ActionResult<string>> {
  return createMyRgpdRequest('data_deletion', reason || 'Demande de suppression de compte');
}

// =====================================================
// AUDIT LOG
// =====================================================

/**
 * Get audit logs for a member
 */
export async function getMemberAuditLogs(
  memberId: string,
  limit: number = 50
): Promise<ActionResult<RgpdAuditLog[]>> {
  try {
    const { orgId } = await requireOrganization();
    const supabase = await getSupabaseWithRgpd();

    const { data, error } = await supabase
      .from('rgpd_audit_log')
      .select('*')
      .eq('org_id', orgId)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data: data as RgpdAuditLog[] };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return { success: false, error: 'Erreur lors de la recuperation des logs' };
  }
}

/**
 * Get recent audit logs for organization
 */
export async function getRecentAuditLogs(
  limit: number = 100
): Promise<ActionResult<RgpdAuditLog[]>> {
  try {
    const { orgId } = await requireOrganization();
    const supabase = await getSupabaseWithRgpd();

    const { data, error } = await supabase
      .from('rgpd_audit_log')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data: data as RgpdAuditLog[] };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return { success: false, error: 'Erreur lors de la recuperation des logs' };
  }
}

/**
 * Log a data access event
 */
export async function logDataAccess(
  memberId: string,
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, unknown>
): Promise<ActionResult> {
  try {
    const { orgId, userId } = await requireOrganization();
    const supabase = await getSupabaseWithRgpd();
    const clientInfo = await getClientInfo();

    const { error } = await supabase.from('rgpd_audit_log').insert({
      org_id: orgId,
      user_id: userId,
      member_id: memberId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: clientInfo.ipAddress,
      user_agent: clientInfo.userAgent,
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error logging data access:', error);
    return { success: false, error: 'Erreur lors du logging' };
  }
}

// =====================================================
// CONSENT STATISTICS
// =====================================================

/**
 * Get consent statistics for organization
 */
export async function getConsentStats(): Promise<
  ActionResult<
    Array<{
      consent_type: ConsentType;
      granted_count: number;
      revoked_count: number;
      total_members: number;
    }>
  >
> {
  try {
    const { orgId } = await requireOrganization();
    const supabase = await getSupabaseWithRgpd();

    const { data, error } = await supabase
      .from('v_rgpd_consent_stats')
      .select('*')
      .eq('org_id', orgId);

    if (error) throw error;

    return { success: true, data: data as unknown as Array<{
      consent_type: ConsentType;
      granted_count: number;
      revoked_count: number;
      total_members: number;
    }> };
  } catch (error) {
    console.error('Error fetching consent stats:', error);
    return { success: false, error: 'Erreur lors de la recuperation des statistiques' };
  }
}
