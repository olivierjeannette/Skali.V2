'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { TablesInsert, TablesUpdate, Plan, Subscription, Payment } from '@/types/database.types';
import { requireOrganization } from '@/lib/auth';

// Types
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// Extended types with relations
export interface SubscriptionWithRelations extends Subscription {
  plan: Plan | null;
  member: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
}

export interface PaymentWithRelations extends Payment {
  member: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
}

// ============================================
// PLANS
// ============================================

const createPlanSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  planType: z.enum(['monthly', 'quarterly', 'biannual', 'annual', 'session_card', 'unlimited']),
  price: z.number().min(0, 'Prix invalide'),
  durationDays: z.number().optional(),
  sessionCount: z.number().optional(),
  maxClassesPerWeek: z.number().optional(),
  maxBookingsPerDay: z.number().optional(),
  isActive: z.boolean().optional(),
});

export async function getPlans(orgId: string): Promise<Plan[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('org_id', orgId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching plans:', error);
    return [];
  }

  return data || [];
}

export async function getActivePlans(orgId: string): Promise<Plan[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching active plans:', error);
    return [];
  }

  return data || [];
}

// Version with auto org context for client components
export async function getActivePlansForCurrentOrg(): Promise<Plan[]> {
  const org = await requireOrganization();
  return getActivePlans(org.id);
}

export async function getPlan(planId: string): Promise<Plan | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) {
    console.error('Error fetching plan:', error);
    return null;
  }

  return data;
}

export async function createPlan(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const org = await requireOrganization();

  const rawData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    planType: formData.get('planType') as string,
    price: parseFloat(formData.get('price') as string),
    durationDays: formData.get('durationDays') ? parseInt(formData.get('durationDays') as string) : undefined,
    sessionCount: formData.get('sessionCount') ? parseInt(formData.get('sessionCount') as string) : undefined,
    maxClassesPerWeek: formData.get('maxClassesPerWeek') ? parseInt(formData.get('maxClassesPerWeek') as string) : undefined,
    maxBookingsPerDay: formData.get('maxBookingsPerDay') ? parseInt(formData.get('maxBookingsPerDay') as string) : undefined,
    isActive: formData.get('isActive') === 'true',
  };

  const parsed = createPlanSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: 'Donnees invalides' };
  }

  const data = parsed.data;

  const planData: TablesInsert<'plans'> = {
    org_id: org.id,
    name: data.name,
    description: data.description || null,
    plan_type: data.planType,
    price: data.price,
    duration_days: data.durationDays || null,
    session_count: data.sessionCount || null,
    max_classes_per_week: data.maxClassesPerWeek || null,
    max_bookings_per_day: data.maxBookingsPerDay || null,
    is_active: data.isActive ?? true,
  };

  const { data: plan, error } = await supabase
    .from('plans')
    .insert(planData)
    .select('id')
    .single();

  if (error) {
    console.error('Error creating plan:', error);
    return { success: false, error: 'Erreur lors de la creation du plan' };
  }

  revalidatePath('/dashboard/subscriptions');
  return { success: true, data: { id: plan.id } };
}

export async function updatePlan(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const planId = formData.get('id') as string;

  const updateData: TablesUpdate<'plans'> = {};

  const name = formData.get('name') as string;
  if (name) updateData.name = name;

  const description = formData.get('description') as string;
  if (description !== undefined) updateData.description = description || null;

  const price = formData.get('price');
  if (price) updateData.price = parseFloat(price as string);

  const isActive = formData.get('isActive');
  if (isActive !== null) updateData.is_active = isActive === 'true';

  const { error } = await supabase
    .from('plans')
    .update(updateData)
    .eq('id', planId);

  if (error) {
    console.error('Error updating plan:', error);
    return { success: false, error: 'Erreur lors de la mise a jour du plan' };
  }

  revalidatePath('/dashboard/subscriptions');
  return { success: true };
}

export async function deletePlan(planId: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Soft delete - just deactivate
  const { error } = await supabase
    .from('plans')
    .update({ is_active: false })
    .eq('id', planId);

  if (error) {
    console.error('Error deleting plan:', error);
    return { success: false, error: 'Erreur lors de la suppression du plan' };
  }

  revalidatePath('/dashboard/subscriptions');
  return { success: true };
}

// ============================================
// SUBSCRIPTIONS
// ============================================

export async function getSubscriptions(
  orgId: string,
  options?: {
    memberId?: string;
    status?: 'active' | 'paused' | 'expired' | 'cancelled';
  }
): Promise<SubscriptionWithRelations[]> {
  const supabase = await createClient();

  let query = supabase
    .from('subscriptions')
    .select('*, plan:plans(*), member:members(id, first_name, last_name, email)')
    .eq('org_id', orgId);

  if (options?.memberId) {
    query = query.eq('member_id', options.memberId);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }

  return (data || []) as unknown as SubscriptionWithRelations[];
}

export async function getSubscription(subscriptionId: string): Promise<SubscriptionWithRelations | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, plan:plans(*), member:members(id, first_name, last_name, email, phone)')
    .eq('id', subscriptionId)
    .single();

  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }

  return data as unknown as SubscriptionWithRelations;
}

export async function getMemberActiveSubscription(memberId: string): Promise<Subscription | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, plan:plans(*)')
    .eq('member_id', memberId)
    .eq('status', 'active')
    .or('end_date.is.null,end_date.gte.' + new Date().toISOString().split('T')[0])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is OK
      console.error('Error fetching active subscription:', error);
    }
    return null;
  }

  return data;
}

export async function createSubscription(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const org = await requireOrganization();

  const memberId = formData.get('memberId') as string;
  const planId = formData.get('planId') as string;
  const startDate = formData.get('startDate') as string;
  const pricePaid = formData.get('pricePaid') ? parseFloat(formData.get('pricePaid') as string) : null;
  const discountPercent = formData.get('discountPercent') ? parseFloat(formData.get('discountPercent') as string) : null;
  const discountReason = formData.get('discountReason') as string;
  const notes = formData.get('notes') as string;

  if (!memberId || !planId || !startDate) {
    return { success: false, error: 'Donnees manquantes' };
  }

  // Get plan to calculate end date
  const plan = await getPlan(planId);
  if (!plan) {
    return { success: false, error: 'Plan introuvable' };
  }

  let endDate: string | null = null;
  if (plan.duration_days) {
    const end = new Date(startDate);
    end.setDate(end.getDate() + plan.duration_days);
    endDate = end.toISOString().split('T')[0];
  }

  const subscriptionData: TablesInsert<'subscriptions'> = {
    org_id: org.id,
    member_id: memberId,
    plan_id: planId,
    status: 'active',
    start_date: startDate,
    end_date: endDate,
    sessions_total: plan.session_count || null,
    sessions_used: 0,
    price_paid: pricePaid ?? plan.price,
    discount_percent: discountPercent,
    discount_reason: discountReason || null,
    auto_renew: true,
    notes: notes || null,
  };

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .insert(subscriptionData)
    .select('id')
    .single();

  if (error) {
    console.error('Error creating subscription:', error);
    return { success: false, error: 'Erreur lors de la creation de l\'abonnement' };
  }

  // Create initial payment record
  const paymentData: TablesInsert<'payments'> = {
    org_id: org.id,
    member_id: memberId,
    subscription_id: subscription.id,
    amount: pricePaid ?? plan.price,
    status: 'pending',
    payment_method: 'card',
    description: `Abonnement ${plan.name}`,
  };

  await supabase.from('payments').insert(paymentData);

  revalidatePath('/dashboard/subscriptions');
  revalidatePath(`/dashboard/members/${memberId}`);
  return { success: true, data: { id: subscription.id } };
}

export async function cancelSubscription(subscriptionId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      auto_renew: false,
    })
    .eq('id', subscriptionId);

  if (error) {
    console.error('Error cancelling subscription:', error);
    return { success: false, error: 'Erreur lors de l\'annulation' };
  }

  revalidatePath('/dashboard/subscriptions');
  return { success: true };
}

export async function pauseSubscription(subscriptionId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'paused',
      paused_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  if (error) {
    console.error('Error pausing subscription:', error);
    return { success: false, error: 'Erreur lors de la mise en pause' };
  }

  revalidatePath('/dashboard/subscriptions');
  return { success: true };
}

export async function resumeSubscription(subscriptionId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      paused_at: null,
    })
    .eq('id', subscriptionId);

  if (error) {
    console.error('Error resuming subscription:', error);
    return { success: false, error: 'Erreur lors de la reprise' };
  }

  revalidatePath('/dashboard/subscriptions');
  return { success: true };
}

// ============================================
// PAYMENTS
// ============================================

export async function getPayments(
  orgId: string,
  options?: {
    memberId?: string;
    subscriptionId?: string;
    status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  }
): Promise<Payment[]> {
  const supabase = await createClient();

  let query = supabase
    .from('payments')
    .select('*, member:members(id, first_name, last_name, email)')
    .eq('org_id', orgId);

  if (options?.memberId) {
    query = query.eq('member_id', options.memberId);
  }

  if (options?.subscriptionId) {
    query = query.eq('subscription_id', options.subscriptionId);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }

  return data || [];
}

export async function markPaymentAsPaid(paymentId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  if (error) {
    console.error('Error marking payment as paid:', error);
    return { success: false, error: 'Erreur lors du marquage du paiement' };
  }

  revalidatePath('/dashboard/subscriptions');
  return { success: true };
}

export async function getSubscriptionStats(orgId: string) {
  const supabase = await createClient();

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('org_id', orgId);

  const { data: payments } = await supabase
    .from('payments')
    .select('amount, status')
    .eq('org_id', orgId)
    .eq('status', 'paid');

  const stats = {
    totalSubscriptions: subscriptions?.length || 0,
    activeSubscriptions: subscriptions?.filter(s => s.status === 'active').length || 0,
    totalRevenue: payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
    pendingPayments: 0,
  };

  const { data: pendingPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('org_id', orgId)
    .eq('status', 'pending');

  stats.pendingPayments = pendingPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  return stats;
}
