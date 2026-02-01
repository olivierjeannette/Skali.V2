/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { createClient } from '@/lib/supabase/server';
import { getStripe, PLATFORM_CONFIG } from '@/lib/stripe';
import { revalidatePath } from 'next/cache';
import { getResendClient, emailConfig, isEmailConfigured } from '@/lib/resend/client';
import {
  OwnerInvitationEmail,
  OwnerWelcomeEmail,
} from '@/lib/resend/templates';
import type {
  PlatformSubscription,
  PlatformCoupon,
  PlatformInvoice,
  BillingContact,
  CreateCouponInput,
  UpdateCouponInput,
  CouponValidationResult,
  UpdateBillingContactInput,
} from '@/types/billing.types';
import { requireSuperAdmin } from './platform';

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// =====================================================
// HELPER: Get current org
// =====================================================

// Extended org type for billing (includes fields from migrations not yet applied)
interface OrgForBilling {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown> | null;
  stripe_customer_id: string | null;
  billing_email?: string | null;
  platform_plan_id?: string | null;
  platform_subscription_status?: string | null;
}

async function getCurrentOrg(): Promise<OrgForBilling | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: orgUser } = await supabase
    .from('organization_users')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!orgUser) return null;

  // Use 'as any' because some columns may not exist yet before migration
  const { data: org } = await (supabase as any)
    .from('organizations')
    .select('*')
    .eq('id', orgUser.org_id)
    .single();

  return org as OrgForBilling | null;
}

// =====================================================
// PLATFORM SUBSCRIPTION MANAGEMENT
// =====================================================

/**
 * Create a platform subscription checkout for an organization
 * Uses Stripe Checkout with predefined platform products
 */
export async function createPlatformBillingCheckout(
  planTier: 'basic' | 'pro' | 'enterprise',
  billingInterval: 'month' | 'year' = 'month',
  couponCode?: string
): Promise<ActionResult<{ url: string; sessionId: string }>> {
  const supabase = await createClient();
  const org = await getCurrentOrg();
  const stripe = getStripe();

  if (!org) {
    return { success: false, error: 'Organisation non trouvee' };
  }

  try {
    // Get platform plan from DB
    const { data: plan } = await (supabase as any)
      .from('platform_plans')
      .select('*')
      .eq('tier', planTier)
      .eq('is_active', true)
      .single();

    if (!plan) {
      return { success: false, error: 'Plan non trouve' };
    }

    // Get or create Stripe customer
    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const contactEmail = org.billing_email
        || (org.settings && typeof org.settings === 'object' && 'contact_email' in org.settings
          ? String(org.settings.contact_email)
          : undefined);

      const customer = await stripe.customers.create({
        email: contactEmail,
        name: org.name,
        metadata: {
          org_id: org.id,
          org_slug: org.slug,
        },
      });
      customerId = customer.id;

      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', org.id);
    }

    // Get or create Stripe price
    const priceAmount = billingInterval === 'year'
      ? plan.price_yearly || plan.price_monthly * 10 // 2 mois gratuits
      : plan.price_monthly;

    let priceId = billingInterval === 'year'
      ? plan.stripe_price_yearly_id
      : plan.stripe_price_monthly_id;

    if (!priceId) {
      // Create product if needed
      let productId = plan.stripe_product_id;
      if (!productId) {
        const product = await stripe.products.create({
          name: `Skali Prog ${plan.name}`,
          description: plan.description || `Abonnement ${plan.name}`,
          metadata: { plan_id: plan.id, tier: plan.tier },
        });
        productId = product.id;

        await (supabase as any)
          .from('platform_plans')
          .update({ stripe_product_id: productId })
          .eq('id', plan.id);
      }

      // Create price
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: priceAmount,
        currency: PLATFORM_CONFIG.CURRENCY,
        recurring: { interval: billingInterval },
        metadata: { plan_id: plan.id, tier: plan.tier },
      });
      priceId = price.id;

      const priceField = billingInterval === 'year'
        ? 'stripe_price_yearly_id'
        : 'stripe_price_monthly_id';
      await (supabase as any)
        .from('platform_plans')
        .update({ [priceField]: priceId })
        .eq('id', plan.id);
    }

    // Validate coupon if provided
    let discounts: { coupon?: string; promotion_code?: string }[] | undefined;
    if (couponCode) {
      const validation = await validateCoupon(couponCode, plan.id);
      if (validation.success && validation.data?.is_valid && validation.data.coupon_id) {
        const { data: coupon } = await (supabase as any)
          .from('platform_coupons')
          .select('stripe_coupon_id, stripe_promotion_code_id')
          .eq('id', validation.data.coupon_id)
          .single();

        if (coupon?.stripe_promotion_code_id) {
          discounts = [{ promotion_code: coupon.stripe_promotion_code_id }];
        } else if (coupon?.stripe_coupon_id) {
          discounts = [{ coupon: coupon.stripe_coupon_id }];
        }
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      discounts,
      subscription_data: {
        trial_period_days: org.platform_subscription_status === 'trialing'
          ? undefined
          : PLATFORM_CONFIG.TRIAL_DAYS,
        metadata: {
          org_id: org.id,
          plan_id: plan.id,
          plan_tier: planTier,
        },
      },
      success_url: `${APP_URL}/dashboard/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/dashboard/settings/billing?canceled=true`,
      metadata: {
        type: 'platform_subscription',
        org_id: org.id,
        plan_id: plan.id,
      },
    });

    return {
      success: true,
      data: { url: session.url!, sessionId: session.id },
    };
  } catch (error) {
    console.error('Error creating billing checkout:', error);
    return { success: false, error: 'Erreur lors de la creation du checkout' };
  }
}

/**
 * Get organization's current platform subscription
 */
export async function getCurrentSubscription(): Promise<
  ActionResult<PlatformSubscription | null>
> {
  const supabase = await createClient();
  const org = await getCurrentOrg();

  if (!org) {
    return { success: false, error: 'Organisation non trouvee' };
  }

  const { data, error } = await (supabase as any)
    .from('platform_subscriptions')
    .select('*')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching subscription:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as PlatformSubscription | null };
}

/**
 * Cancel platform subscription
 */
export async function cancelPlatformSubscription(
  cancelAtPeriodEnd: boolean = true
): Promise<ActionResult> {
  const supabase = await createClient();
  const org = await getCurrentOrg();
  const stripe = getStripe();

  if (!org) {
    return { success: false, error: 'Organisation non trouvee' };
  }

  const { data: subscription } = await (supabase as any)
    .from('platform_subscriptions')
    .select('stripe_subscription_id')
    .eq('org_id', org.id)
    .eq('status', 'active')
    .single();

  if (!subscription?.stripe_subscription_id) {
    return { success: false, error: 'Aucun abonnement actif' };
  }

  try {
    if (cancelAtPeriodEnd) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    } else {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
    }

    revalidatePath('/dashboard/settings/billing');
    return { success: true };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return { success: false, error: 'Erreur lors de l\'annulation' };
  }
}

/**
 * Reactivate a canceled subscription (before period end)
 */
export async function reactivateSubscription(): Promise<ActionResult> {
  const supabase = await createClient();
  const org = await getCurrentOrg();
  const stripe = getStripe();

  if (!org) {
    return { success: false, error: 'Organisation non trouvee' };
  }

  const { data: subscription } = await (supabase as any)
    .from('platform_subscriptions')
    .select('stripe_subscription_id')
    .eq('org_id', org.id)
    .single();

  if (!subscription?.stripe_subscription_id) {
    return { success: false, error: 'Aucun abonnement trouve' };
  }

  try {
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    revalidatePath('/dashboard/settings/billing');
    return { success: true };
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return { success: false, error: 'Erreur lors de la reactivation' };
  }
}

/**
 * Get customer billing portal URL
 */
export async function getBillingPortalUrl(): Promise<ActionResult<{ url: string }>> {
  const org = await getCurrentOrg();
  const stripe = getStripe();

  if (!org?.stripe_customer_id) {
    return { success: false, error: 'Aucun compte de facturation' };
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${APP_URL}/dashboard/settings/billing`,
    });

    return { success: true, data: { url: session.url } };
  } catch (error) {
    console.error('Error creating portal session:', error);
    return { success: false, error: 'Erreur lors de l\'acces au portail' };
  }
}

// =====================================================
// COUPON MANAGEMENT (Super Admin)
// =====================================================

/**
 * Create a new coupon (Super Admin only)
 */
export async function createCoupon(
  input: CreateCouponInput
): Promise<ActionResult<{ couponId: string; stripeCouponId?: string }>> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const stripe = getStripe();

  const { data: { user } } = await supabase.auth.getUser();

  try {
    // Create coupon in Stripe first
    // Build params manually due to Stripe SDK type strictness
    const stripeCouponParams: Record<string, unknown> = {
      name: input.name,
      duration: input.duration,
      currency: PLATFORM_CONFIG.CURRENCY,
      metadata: { source: 'skali_prog' },
    };

    if (input.duration === 'repeating' && input.duration_in_months) {
      stripeCouponParams.duration_in_months = input.duration_in_months;
    }

    if (input.discount_type === 'percent' && input.discount_percent) {
      stripeCouponParams.percent_off = input.discount_percent;
    } else if (input.discount_type === 'fixed_amount' && input.discount_amount_cents) {
      stripeCouponParams.amount_off = input.discount_amount_cents;
    }

    if (input.max_redemptions) {
      stripeCouponParams.max_redemptions = input.max_redemptions;
    }

    if (input.valid_until) {
      stripeCouponParams.redeem_by = Math.floor(new Date(input.valid_until).getTime() / 1000);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripeCoupon = await stripe.coupons.create(stripeCouponParams as any);

    // Create promotion code for the coupon
    const promotionCodeParams: Record<string, unknown> = {
      coupon: stripeCoupon.id,
      code: input.code.toUpperCase(),
      active: true,
    };

    if (input.first_time_only || input.minimum_amount_cents) {
      promotionCodeParams.restrictions = {
        first_time_transaction: input.first_time_only || false,
        minimum_amount: input.minimum_amount_cents || undefined,
        minimum_amount_currency: input.minimum_amount_cents
          ? PLATFORM_CONFIG.CURRENCY
          : undefined,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promotionCode = await stripe.promotionCodes.create(promotionCodeParams as any);

    // Save to database
    const { data: coupon, error } = await (supabase as any)
      .from('platform_coupons')
      .insert({
        code: input.code.toUpperCase(),
        name: input.name,
        description: input.description,
        stripe_coupon_id: stripeCoupon.id,
        stripe_promotion_code_id: promotionCode.id,
        discount_type: input.discount_type,
        discount_percent: input.discount_percent,
        discount_amount_cents: input.discount_amount_cents,
        currency: PLATFORM_CONFIG.CURRENCY,
        duration: input.duration,
        duration_in_months: input.duration_in_months,
        max_redemptions: input.max_redemptions,
        applies_to_plans: input.applies_to_plans,
        first_time_only: input.first_time_only || false,
        minimum_amount_cents: input.minimum_amount_cents,
        valid_from: input.valid_from || new Date().toISOString(),
        valid_until: input.valid_until,
        created_by: user?.id,
      })
      .select('id')
      .single();

    if (error) {
      // Rollback Stripe
      await stripe.coupons.del(stripeCoupon.id);
      console.error('Error creating coupon:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/coupons');
    return {
      success: true,
      data: { couponId: coupon.id, stripeCouponId: stripeCoupon.id },
    };
  } catch (error) {
    console.error('Error creating coupon:', error);
    return { success: false, error: 'Erreur lors de la creation du coupon' };
  }
}

/**
 * Get all coupons (Super Admin only)
 */
export async function getAllCoupons(options?: {
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ActionResult<{ coupons: PlatformCoupon[]; total: number }>> {
  await requireSuperAdmin();
  const supabase = await createClient();

  let query = (supabase as any)
    .from('platform_coupons')
    .select('*', { count: 'exact' });

  if (!options?.includeInactive) {
    query = query.eq('is_active', true);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(
      options?.offset || 0,
      (options?.offset || 0) + (options?.limit || 50) - 1
    );

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching coupons:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: { coupons: (data || []) as PlatformCoupon[], total: count || 0 },
  };
}

/**
 * Update a coupon (Super Admin only)
 */
export async function updateCoupon(
  couponId: string,
  updates: UpdateCouponInput
): Promise<ActionResult> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const stripe = getStripe();

  // Get current coupon
  const { data: coupon } = await (supabase as any)
    .from('platform_coupons')
    .select('stripe_coupon_id, stripe_promotion_code_id')
    .eq('id', couponId)
    .single();

  if (!coupon) {
    return { success: false, error: 'Coupon non trouve' };
  }

  try {
    // Update Stripe if needed
    if (coupon.stripe_coupon_id && updates.name) {
      await stripe.coupons.update(coupon.stripe_coupon_id, {
        name: updates.name,
      });
    }

    if (coupon.stripe_promotion_code_id && updates.is_active !== undefined) {
      await stripe.promotionCodes.update(coupon.stripe_promotion_code_id, {
        active: updates.is_active,
      });
    }

    // Update database
    const { error } = await (supabase as any)
      .from('platform_coupons')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', couponId);

    if (error) {
      console.error('Error updating coupon:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/coupons');
    return { success: true };
  } catch (error) {
    console.error('Error updating coupon:', error);
    return { success: false, error: 'Erreur lors de la mise a jour' };
  }
}

/**
 * Delete/deactivate a coupon (Super Admin only)
 */
export async function deleteCoupon(couponId: string): Promise<ActionResult> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const stripe = getStripe();

  const { data: coupon } = await (supabase as any)
    .from('platform_coupons')
    .select('stripe_coupon_id, stripe_promotion_code_id, redemption_count')
    .eq('id', couponId)
    .single();

  if (!coupon) {
    return { success: false, error: 'Coupon non trouve' };
  }

  try {
    // If already redeemed, just deactivate
    if (coupon.redemption_count > 0) {
      if (coupon.stripe_promotion_code_id) {
        await stripe.promotionCodes.update(coupon.stripe_promotion_code_id, {
          active: false,
        });
      }

      await (supabase as any)
        .from('platform_coupons')
        .update({ is_active: false })
        .eq('id', couponId);
    } else {
      // No redemptions, can delete
      if (coupon.stripe_coupon_id) {
        await stripe.coupons.del(coupon.stripe_coupon_id);
      }

      await (supabase as any)
        .from('platform_coupons')
        .delete()
        .eq('id', couponId);
    }

    revalidatePath('/admin/coupons');
    return { success: true };
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return { success: false, error: 'Erreur lors de la suppression' };
  }
}

/**
 * Validate a coupon code (public)
 */
export async function validateCoupon(
  code: string,
  planId?: string
): Promise<ActionResult<CouponValidationResult>> {
  const supabase = await createClient();
  const org = await getCurrentOrg();

  if (!org) {
    return { success: false, error: 'Organisation non trouvee' };
  }

  const { data, error } = await (supabase as any).rpc('validate_coupon', {
    p_code: code.toUpperCase(),
    p_org_id: org.id,
    p_plan_id: planId || null,
  });

  if (error) {
    console.error('Error validating coupon:', error);
    return { success: false, error: error.message };
  }

  const result = data?.[0] as CouponValidationResult;
  return { success: true, data: result };
}

// =====================================================
// INVOICE MANAGEMENT
// =====================================================

/**
 * Get organization invoices
 */
export async function getInvoices(options?: {
  limit?: number;
  offset?: number;
}): Promise<ActionResult<{ invoices: PlatformInvoice[]; total: number }>> {
  const supabase = await createClient();
  const org = await getCurrentOrg();

  if (!org) {
    return { success: false, error: 'Organisation non trouvee' };
  }

  const { data, count, error } = await (supabase as any)
    .from('platform_invoices')
    .select('*', { count: 'exact' })
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    .range(
      options?.offset || 0,
      (options?.offset || 0) + (options?.limit || 20) - 1
    );

  if (error) {
    console.error('Error fetching invoices:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: { invoices: (data || []) as PlatformInvoice[], total: count || 0 },
  };
}

// =====================================================
// BILLING CONTACT
// =====================================================

/**
 * Get billing contact
 */
export async function getBillingContact(): Promise<
  ActionResult<BillingContact | null>
> {
  const supabase = await createClient();
  const org = await getCurrentOrg();

  if (!org) {
    return { success: false, error: 'Organisation non trouvee' };
  }

  const { data, error } = await (supabase as any)
    .from('billing_contacts')
    .select('*')
    .eq('org_id', org.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching billing contact:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as BillingContact | null };
}

/**
 * Update billing contact
 */
export async function updateBillingContact(
  input: UpdateBillingContactInput
): Promise<ActionResult> {
  const supabase = await createClient();
  const org = await getCurrentOrg();
  const stripe = getStripe();

  if (!org) {
    return { success: false, error: 'Organisation non trouvee' };
  }

  try {
    // Upsert in database
    const { error } = await (supabase as any)
      .from('billing_contacts')
      .upsert(
        { org_id: org.id, ...input, updated_at: new Date().toISOString() },
        { onConflict: 'org_id' }
      );

    if (error) {
      console.error('Error updating billing contact:', error);
      return { success: false, error: error.message };
    }

    // Update Stripe customer if exists
    if (org.stripe_customer_id) {
      const updateData: Parameters<typeof stripe.customers.update>[1] = {};

      if (input.email) updateData.email = input.email;
      if (input.name) updateData.name = input.name;
      if (input.phone) updateData.phone = input.phone;

      if (input.address_line1 || input.city || input.postal_code || input.country) {
        updateData.address = {
          line1: input.address_line1 || undefined,
          line2: input.address_line2 || undefined,
          city: input.city || undefined,
          postal_code: input.postal_code || undefined,
          country: input.country || undefined,
        };
      }

      if (input.vat_number) {
        // Note: VAT requires special handling in Stripe
        updateData.metadata = { vat_number: input.vat_number };
      }

      await stripe.customers.update(org.stripe_customer_id, updateData);
    }

    revalidatePath('/dashboard/settings/billing');
    return { success: true };
  } catch (error) {
    console.error('Error updating billing contact:', error);
    return { success: false, error: 'Erreur lors de la mise a jour' };
  }
}

// =====================================================
// OWNER INVITATION EMAILS
// =====================================================

/**
 * Send owner invitation email
 */
export async function sendOwnerInvitationEmail(
  invitationToken: string,
  recipientEmail: string,
  organizationName: string,
  inviterName: string,
  inviterEmail: string,
  expiresAt: string,
  planName?: string
): Promise<ActionResult<{ messageId: string }>> {
  if (!isEmailConfigured()) {
    console.warn('Email not configured, skipping invitation email');
    return { success: true, data: { messageId: 'skipped' } };
  }

  const resend = getResendClient();
  const acceptUrl = `${APP_URL}/invite/accept?token=${invitationToken}`;

  try {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from,
      to: recipientEmail,
      subject: `Invitation a gerer ${organizationName} sur Skali Prog`,
      react: OwnerInvitationEmail({
        organizationName,
        inviterName,
        inviterEmail,
        acceptUrl,
        expiresAt,
        planName,
        trialDays: PLATFORM_CONFIG.TRIAL_DAYS,
      }),
    });

    if (error) {
      console.error('Error sending invitation email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: { messageId: data?.id || '' } };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return { success: false, error: 'Erreur lors de l\'envoi de l\'email' };
  }
}

/**
 * Send owner welcome email after accepting invitation
 */
export async function sendOwnerWelcomeEmail(
  recipientEmail: string,
  ownerName: string,
  organizationName: string
): Promise<ActionResult<{ messageId: string }>> {
  if (!isEmailConfigured()) {
    console.warn('Email not configured, skipping welcome email');
    return { success: true, data: { messageId: 'skipped' } };
  }

  const resend = getResendClient();
  const dashboardUrl = `${APP_URL}/dashboard`;
  const setupGuideUrl = `${APP_URL}/docs/getting-started`;

  try {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from,
      to: recipientEmail,
      subject: `Bienvenue sur Skali Prog - ${organizationName} est pret!`,
      react: OwnerWelcomeEmail({
        ownerName,
        organizationName,
        dashboardUrl,
        setupGuideUrl,
      }),
    });

    if (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: { messageId: data?.id || '' } };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: 'Erreur lors de l\'envoi de l\'email' };
  }
}
