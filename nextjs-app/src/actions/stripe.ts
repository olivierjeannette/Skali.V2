'use server';

import { createClient } from '@/lib/supabase/server';
import { getStripe, PLATFORM_CONFIG, eurosToCents, calculatePlatformFeeByCountry, getPlatformFeeForCountry } from '@/lib/stripe';
import { revalidatePath } from 'next/cache';

// Types
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// Extended org type with Stripe fields
interface OrgWithStripe {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown> | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean | null;
  stripe_charges_enabled: boolean | null;
  stripe_payouts_enabled: boolean | null;
  stripe_customer_id: string | null;
  platform_subscription_status: string | null;
  platform_fee_percent: number | null;
  country_code: string | null;
}

// Extended plan type with Stripe fields
export interface PlanWithStripe {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  plan_type: string;
  price: number;
  duration_days: number | null;
  session_count: number | null;
  max_classes_per_week: number | null;
  max_bookings_per_day: number | null;
  is_active: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  stripe_price_type: string | null;
}

// Helper to get org with Stripe fields
async function getOrgWithStripe(): Promise<OrgWithStripe | null> {
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

  const { data: org } = await supabase
    .from('organizations')
    .select(`
      id, name, slug, settings,
      stripe_account_id, stripe_onboarding_complete,
      stripe_charges_enabled, stripe_payouts_enabled,
      stripe_customer_id, platform_subscription_status,
      platform_fee_percent, country_code
    `)
    .eq('id', orgUser.org_id)
    .single();

  return org as OrgWithStripe | null;
}

async function requireOrgWithStripe(): Promise<OrgWithStripe> {
  const org = await getOrgWithStripe();
  if (!org) {
    throw new Error('Organization not found');
  }
  return org;
}

// Helper to get plan with Stripe fields
async function getPlanWithStripe(planId: string, orgId: string): Promise<PlanWithStripe | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('plans')
    .select('id, org_id, name, description, plan_type, price, duration_days, session_count, max_classes_per_week, max_bookings_per_day, is_active, stripe_product_id, stripe_price_id, stripe_price_type')
    .eq('id', planId)
    .eq('org_id', orgId)
    .single();

  return data as unknown as PlanWithStripe | null;
}

// ============================================
// STRIPE CONNECT ONBOARDING
// ============================================

/**
 * Create a Stripe Connect account for a gym and start onboarding
 */
export async function createConnectAccount(): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient();
  const org = await requireOrgWithStripe();
  const stripe = getStripe();

  try {
    // Check if already has a Stripe account
    if (org.stripe_account_id) {
      // Return to onboarding if not complete
      const accountLink = await stripe.accountLinks.create({
        account: org.stripe_account_id,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?success=true`,
        type: 'account_onboarding',
      });
      return { success: true, data: { url: accountLink.url } };
    }

    // Create new Express account with org's country
    const contactEmail = org.settings && typeof org.settings === 'object' && 'contact_email' in org.settings
      ? String(org.settings.contact_email)
      : undefined;

    const account = await stripe.accounts.create({
      type: 'express',
      country: org.country_code || 'FR',
      email: contactEmail,
      business_type: 'company',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: org.name,
        mcc: '7941', // Sports Clubs/Fields
        url: `${process.env.NEXT_PUBLIC_APP_URL}`,
      },
      metadata: {
        org_id: org.id,
        org_slug: org.slug,
      },
    });

    // Save account ID to database
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        stripe_account_id: account.id,
        stripe_onboarding_complete: false,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
      } as Record<string, unknown>)
      .eq('id', org.id);

    if (updateError) {
      console.error('Error saving Stripe account:', updateError);
      // Try to delete the account since we couldn't save it
      await stripe.accounts.del(account.id);
      return { success: false, error: 'Erreur lors de la sauvegarde du compte Stripe' };
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?success=true`,
      type: 'account_onboarding',
    });

    revalidatePath('/dashboard/settings/billing');
    return { success: true, data: { url: accountLink.url } };
  } catch (error) {
    console.error('Error creating Connect account:', error);
    return { success: false, error: 'Erreur lors de la creation du compte Stripe' };
  }
}

/**
 * Get Stripe Connect dashboard login link for a gym
 */
export async function getConnectDashboardLink(): Promise<ActionResult<{ url: string }>> {
  const org = await requireOrgWithStripe();
  const stripe = getStripe();

  if (!org.stripe_account_id) {
    return { success: false, error: 'Compte Stripe non configure' };
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(org.stripe_account_id);
    return { success: true, data: { url: loginLink.url } };
  } catch (error) {
    console.error('Error creating login link:', error);
    return { success: false, error: 'Erreur lors de la creation du lien' };
  }
}

/**
 * Check and update Connect account status
 */
export async function refreshConnectAccountStatus(): Promise<ActionResult<{
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}>> {
  const supabase = await createClient();
  const org = await requireOrgWithStripe();
  const stripe = getStripe();

  if (!org.stripe_account_id) {
    return { success: false, error: 'Compte Stripe non configure' };
  }

  try {
    const account = await stripe.accounts.retrieve(org.stripe_account_id);

    const status = {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };

    // Update database (cast to any to bypass type checking for new columns)
    await supabase
      .from('organizations')
      .update({
        stripe_charges_enabled: status.chargesEnabled,
        stripe_payouts_enabled: status.payoutsEnabled,
        stripe_details_submitted: status.detailsSubmitted,
        stripe_onboarding_complete: status.chargesEnabled && status.detailsSubmitted,
      } as Record<string, unknown>)
      .eq('id', org.id);

    revalidatePath('/dashboard/settings/billing');
    return { success: true, data: status };
  } catch (error) {
    console.error('Error refreshing account status:', error);
    return { success: false, error: 'Erreur lors de la verification du statut' };
  }
}

// ============================================
// MEMBER CHECKOUT (via Connected Account)
// ============================================

/**
 * Create a checkout session for a member to purchase a plan
 */
export async function createCheckoutSession(
  memberId: string,
  planId: string
): Promise<ActionResult<{ url: string; sessionId: string }>> {
  const supabase = await createClient();
  const org = await requireOrgWithStripe();
  const stripe = getStripe();

  // Verify gym can accept payments
  if (!org.stripe_account_id || !org.stripe_charges_enabled) {
    return { success: false, error: 'Les paiements ne sont pas configures pour cette salle' };
  }

  try {
    // Get plan details with Stripe fields
    const plan = await getPlanWithStripe(planId, org.id);
    if (!plan) {
      return { success: false, error: 'Plan introuvable' };
    }

    // Get member details
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .eq('org_id', org.id)
      .single();

    if (memberError || !member) {
      return { success: false, error: 'Membre introuvable' };
    }

    // Calculate amounts with country-based platform fee
    const amountCents = eurosToCents(plan.price);
    const countryCode = org.country_code || 'FR';
    const platformFeeCents = calculatePlatformFeeByCountry(amountCents, countryCode);

    // Create or get Stripe Price
    let priceId = plan.stripe_price_id;
    if (!priceId) {
      // Create product and price
      const product = await stripe.products.create(
        {
          name: plan.name,
          description: plan.description || undefined,
          metadata: {
            plan_id: plan.id,
            org_id: org.id,
          },
        },
        { stripeAccount: org.stripe_account_id }
      );

      const price = await stripe.prices.create(
        {
          product: product.id,
          unit_amount: amountCents,
          currency: PLATFORM_CONFIG.CURRENCY,
          metadata: {
            plan_id: plan.id,
          },
        },
        { stripeAccount: org.stripe_account_id }
      );

      priceId = price.id;

      // Save price ID to plan
      await supabase
        .from('plans')
        .update({
          stripe_product_id: product.id,
          stripe_price_id: price.id,
        } as Record<string, unknown>)
        .eq('id', planId);
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        customer_email: member.email || undefined,
        payment_intent_data: {
          application_fee_amount: platformFeeCents,
          metadata: {
            org_id: org.id,
            member_id: memberId,
            plan_id: planId,
          },
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscriptions?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscriptions?cancelled=true`,
        metadata: {
          org_id: org.id,
          member_id: memberId,
          plan_id: planId,
        },
      },
      { stripeAccount: org.stripe_account_id }
    );

    // Save checkout session to database (table may not exist yet before migration)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('checkout_sessions').insert({
        org_id: org.id,
        member_id: memberId,
        plan_id: planId,
        stripe_session_id: session.id,
        status: 'pending',
        amount_subtotal: session.amount_subtotal,
        amount_total: session.amount_total,
        currency: session.currency,
        application_fee_amount: platformFeeCents,
        success_url: session.success_url,
        cancel_url: session.cancel_url,
        expires_at: new Date(session.expires_at * 1000).toISOString(),
        metadata: { plan_name: plan.name },
      });
    } catch (e) {
      console.warn('Could not save checkout session:', e);
    }

    return {
      success: true,
      data: { url: session.url!, sessionId: session.id },
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return { success: false, error: 'Erreur lors de la creation de la session de paiement' };
  }
}

/**
 * Create a checkout session for member subscription (recurring)
 */
export async function createSubscriptionCheckout(
  memberId: string,
  planId: string
): Promise<ActionResult<{ url: string; sessionId: string }>> {
  const supabase = await createClient();
  const org = await requireOrgWithStripe();
  const stripe = getStripe();

  if (!org.stripe_account_id || !org.stripe_charges_enabled) {
    return { success: false, error: 'Les paiements ne sont pas configures pour cette salle' };
  }

  try {
    // Get plan details with Stripe fields
    const plan = await getPlanWithStripe(planId, org.id);
    if (!plan) {
      return { success: false, error: 'Plan introuvable' };
    }

    // Get member details
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .eq('org_id', org.id)
      .single();

    if (memberError || !member) {
      return { success: false, error: 'Membre introuvable' };
    }

    // Calculate amounts with country-based platform fee
    const amountCents = eurosToCents(plan.price);
    const countryCode = org.country_code || 'FR';
    const platformFeeCents = calculatePlatformFeeByCountry(amountCents, countryCode);

    // Map plan type to Stripe interval
    const intervalMap: Record<string, { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number }> = {
      monthly: { interval: 'month', interval_count: 1 },
      quarterly: { interval: 'month', interval_count: 3 },
      biannual: { interval: 'month', interval_count: 6 },
      annual: { interval: 'year', interval_count: 1 },
    };

    const recurrence = intervalMap[plan.plan_type];
    if (!recurrence) {
      return { success: false, error: 'Ce plan ne supporte pas les paiements recurrents' };
    }

    // Create or get recurring price
    let priceId = plan.stripe_price_id;
    const needsNewPrice = !priceId || plan.stripe_price_type !== 'recurring';

    if (needsNewPrice) {
      let productId = plan.stripe_product_id;

      if (!productId) {
        const product = await stripe.products.create(
          {
            name: plan.name,
            description: plan.description || undefined,
            metadata: { plan_id: plan.id, org_id: org.id },
          },
          { stripeAccount: org.stripe_account_id }
        );
        productId = product.id;
      }

      const price = await stripe.prices.create(
        {
          product: productId,
          unit_amount: amountCents,
          currency: PLATFORM_CONFIG.CURRENCY,
          recurring: recurrence,
          metadata: { plan_id: plan.id },
        },
        { stripeAccount: org.stripe_account_id }
      );

      priceId = price.id;

      await supabase
        .from('plans')
        .update({
          stripe_product_id: productId,
          stripe_price_id: price.id,
          stripe_price_type: 'recurring',
        } as Record<string, unknown>)
        .eq('id', planId);
    }

    // Create Checkout Session for subscription with country-based fee
    const feePercent = getPlatformFeeForCountry(countryCode);
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        line_items: [{ price: priceId!, quantity: 1 }],
        customer_email: member.email || undefined,
        subscription_data: {
          application_fee_percent: feePercent,
          metadata: {
            org_id: org.id,
            member_id: memberId,
            plan_id: planId,
            country_code: countryCode,
          },
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscriptions?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscriptions?cancelled=true`,
        metadata: {
          org_id: org.id,
          member_id: memberId,
          plan_id: planId,
        },
      },
      { stripeAccount: org.stripe_account_id }
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('checkout_sessions').insert({
        org_id: org.id,
        member_id: memberId,
        plan_id: planId,
        stripe_session_id: session.id,
        status: 'pending',
        amount_total: amountCents,
        currency: PLATFORM_CONFIG.CURRENCY,
        application_fee_amount: platformFeeCents,
        success_url: session.success_url,
        cancel_url: session.cancel_url,
        expires_at: new Date(session.expires_at * 1000).toISOString(),
        metadata: { plan_name: plan.name, type: 'subscription' },
      });
    } catch (e) {
      console.warn('Could not save checkout session:', e);
    }

    return {
      success: true,
      data: { url: session.url!, sessionId: session.id },
    };
  } catch (error) {
    console.error('Error creating subscription checkout:', error);
    return { success: false, error: 'Erreur lors de la creation de la session' };
  }
}

// ============================================
// PLATFORM SUBSCRIPTION (Gym pays Skali Prog)
// ============================================

/**
 * Create platform subscription checkout for a gym
 */
export async function createPlatformSubscriptionCheckout(
  planName: 'starter' | 'pro' | 'enterprise'
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient();
  const org = await requireOrgWithStripe();
  const stripe = getStripe();

  const plan = PLATFORM_CONFIG.PLATFORM_PLANS[planName];
  if (!plan) {
    return { success: false, error: 'Plan invalide' };
  }

  try {
    // Get or create Stripe customer for the organization
    let customerId = org.stripe_customer_id;

    if (!customerId) {
      const contactEmail = org.settings && typeof org.settings === 'object' && 'contact_email' in org.settings
        ? String(org.settings.contact_email)
        : undefined;

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
        .update({ stripe_customer_id: customerId } as Record<string, unknown>)
        .eq('id', org.id);
    }

    // Create checkout session for platform subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: PLATFORM_CONFIG.CURRENCY,
            product_data: {
              name: `Skali Prog ${plan.name}`,
              description: `Abonnement ${plan.name} - Gestion de salle de sport`,
            },
            unit_amount: eurosToCents(plan.priceMonthly),
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: PLATFORM_CONFIG.TRIAL_DAYS,
        metadata: {
          org_id: org.id,
          plan_name: planName,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?platform_success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?platform_cancelled=true`,
      metadata: {
        org_id: org.id,
        type: 'platform_subscription',
        plan_name: planName,
      },
    });

    return { success: true, data: { url: session.url! } };
  } catch (error) {
    console.error('Error creating platform subscription checkout:', error);
    return { success: false, error: 'Erreur lors de la creation de l\'abonnement' };
  }
}

/**
 * Get billing portal URL for managing platform subscription
 */
export async function getPlatformBillingPortal(): Promise<ActionResult<{ url: string }>> {
  const org = await requireOrgWithStripe();
  const stripe = getStripe();

  if (!org.stripe_customer_id) {
    return { success: false, error: 'Aucun abonnement platform actif' };
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
    });

    return { success: true, data: { url: session.url } };
  } catch (error) {
    console.error('Error creating billing portal:', error);
    return { success: false, error: 'Erreur lors de l\'acces au portail' };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get checkout session status
 */
export async function getCheckoutSessionStatus(sessionId: string): Promise<ActionResult<{
  status: string;
  paymentStatus: string | null;
}>> {
  const supabase = await createClient();
  const org = await requireOrgWithStripe();
  const stripe = getStripe();

  if (!org.stripe_account_id) {
    return { success: false, error: 'Compte Stripe non configure' };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      { stripeAccount: org.stripe_account_id }
    );

    // Update local record (table may not exist before migration)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('checkout_sessions')
        .update({
          status: session.status === 'complete' ? 'complete' : session.status || 'pending',
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_customer_id: session.customer as string,
          completed_at: session.status === 'complete' ? new Date().toISOString() : null,
        })
        .eq('stripe_session_id', sessionId);
    } catch (e) {
      console.warn('Could not update checkout session:', e);
    }

    return {
      success: true,
      data: {
        status: session.status || 'unknown',
        paymentStatus: session.payment_status,
      },
    };
  } catch (error) {
    console.error('Error getting checkout session:', error);
    return { success: false, error: 'Erreur lors de la verification de la session' };
  }
}

/**
 * Get organization Stripe status summary
 */
export async function getStripeStatus(): Promise<ActionResult<{
  hasAccount: boolean;
  accountId: string | null;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  platformSubscription: string | null;
}>> {
  const org = await requireOrgWithStripe();

  return {
    success: true,
    data: {
      hasAccount: !!org.stripe_account_id,
      accountId: org.stripe_account_id,
      onboardingComplete: org.stripe_onboarding_complete || false,
      chargesEnabled: org.stripe_charges_enabled || false,
      payoutsEnabled: org.stripe_payouts_enabled || false,
      platformSubscription: org.platform_subscription_status || null,
    },
  };
}

// ============================================
// PLAN SYNC WITH STRIPE
// ============================================

/**
 * Create or update Stripe Product for a plan
 */
export async function syncPlanToStripe(planId: string): Promise<ActionResult<{
  productId: string;
  priceId: string;
}>> {
  const supabase = await createClient();
  const org = await requireOrgWithStripe();
  const stripe = getStripe();

  if (!org.stripe_account_id) {
    return { success: false, error: 'Compte Stripe Connect non configure' };
  }

  try {
    const plan = await getPlanWithStripe(planId, org.id);
    if (!plan) {
      return { success: false, error: 'Plan introuvable' };
    }

    const amountCents = eurosToCents(plan.price);
    let productId: string = plan.stripe_product_id || '';
    let priceId: string = plan.stripe_price_id || '';

    // Determine if recurring
    const isRecurring = ['monthly', 'quarterly', 'biannual', 'annual'].includes(plan.plan_type);
    const intervalMap: Record<string, { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number }> = {
      monthly: { interval: 'month', interval_count: 1 },
      quarterly: { interval: 'month', interval_count: 3 },
      biannual: { interval: 'month', interval_count: 6 },
      annual: { interval: 'year', interval_count: 1 },
    };

    // Create or update Product
    if (plan.stripe_product_id) {
      productId = plan.stripe_product_id;
      // Update existing product
      await stripe.products.update(
        productId,
        {
          name: plan.name,
          description: plan.description || undefined,
          active: true,
          metadata: {
            plan_id: plan.id,
            org_id: org.id,
            plan_type: plan.plan_type,
          },
        },
        { stripeAccount: org.stripe_account_id }
      );
    } else {
      // Create new product
      const product = await stripe.products.create(
        {
          name: plan.name,
          description: plan.description || undefined,
          metadata: {
            plan_id: plan.id,
            org_id: org.id,
            plan_type: plan.plan_type,
          },
        },
        { stripeAccount: org.stripe_account_id }
      );
      productId = product.id;
    }

    // Check if price needs to be recreated (price changed or type changed)
    const currentPriceType = plan.stripe_price_type;
    const newPriceType = isRecurring ? 'recurring' : 'one_time';
    const needsNewPrice = !plan.stripe_price_id || currentPriceType !== newPriceType;

    if (needsNewPrice) {
      // Archive old price if exists
      if (plan.stripe_price_id) {
        priceId = plan.stripe_price_id;
        try {
          await stripe.prices.update(
            priceId,
            { active: false },
            { stripeAccount: org.stripe_account_id }
          );
        } catch (e) {
          console.warn('Could not archive old price:', e);
        }
      }

      // Create new price
      const priceData: Parameters<typeof stripe.prices.create>[0] = {
        product: productId,
        unit_amount: amountCents,
        currency: PLATFORM_CONFIG.CURRENCY,
        metadata: {
          plan_id: plan.id,
        },
      };

      if (isRecurring) {
        const recurrence = intervalMap[plan.plan_type];
        priceData.recurring = recurrence;
      }

      const price = await stripe.prices.create(
        priceData,
        { stripeAccount: org.stripe_account_id }
      );
      priceId = price.id;
    }

    // Update plan in database
    await supabase
      .from('plans')
      .update({
        stripe_product_id: productId,
        stripe_price_id: priceId,
        stripe_price_type: newPriceType,
      })
      .eq('id', planId);

    revalidatePath('/dashboard/subscriptions/plans');
    return { success: true, data: { productId, priceId } };
  } catch (error) {
    console.error('Error syncing plan to Stripe:', error);
    return { success: false, error: 'Erreur lors de la synchronisation Stripe' };
  }
}

// Valid plan types
type PlanType = 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'session_card' | 'unlimited';

/**
 * Create Stripe Product and Price when creating a new plan
 */
export async function createPlanWithStripe(data: {
  name: string;
  description?: string;
  planType: string;
  price: number;
  durationDays?: number;
  sessionCount?: number;
  maxClassesPerWeek?: number;
  maxBookingsPerDay?: number;
  isActive?: boolean;
}): Promise<ActionResult<{ planId: string; stripeProductId?: string; stripePriceId?: string }>> {
  const supabase = await createClient();
  const org = await requireOrgWithStripe();
  const stripe = getStripe();

  // Validate plan type
  const validPlanTypes: PlanType[] = ['monthly', 'quarterly', 'biannual', 'annual', 'session_card', 'unlimited'];
  if (!validPlanTypes.includes(data.planType as PlanType)) {
    return { success: false, error: 'Type de plan invalide' };
  }
  const planType = data.planType as PlanType;

  try {
    const amountCents = eurosToCents(data.price);
    let productId: string | undefined;
    let priceId: string | undefined;
    let priceType: 'one_time' | 'recurring' | undefined;

    // Only create Stripe product if org has Stripe Connect configured
    if (org.stripe_account_id && org.stripe_charges_enabled) {
      const isRecurring = ['monthly', 'quarterly', 'biannual', 'annual'].includes(planType);
      const intervalMap: Record<string, { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number }> = {
        monthly: { interval: 'month', interval_count: 1 },
        quarterly: { interval: 'month', interval_count: 3 },
        biannual: { interval: 'month', interval_count: 6 },
        annual: { interval: 'year', interval_count: 1 },
      };

      // Create product
      const product = await stripe.products.create(
        {
          name: data.name,
          description: data.description || undefined,
          metadata: {
            org_id: org.id,
            plan_type: planType,
          },
        },
        { stripeAccount: org.stripe_account_id }
      );
      productId = product.id;

      // Create price
      const priceData: Parameters<typeof stripe.prices.create>[0] = {
        product: productId,
        unit_amount: amountCents,
        currency: PLATFORM_CONFIG.CURRENCY,
      };

      if (isRecurring) {
        priceData.recurring = intervalMap[planType];
        priceType = 'recurring';
      } else {
        priceType = 'one_time';
      }

      const price = await stripe.prices.create(
        priceData,
        { stripeAccount: org.stripe_account_id }
      );
      priceId = price.id;
    }

    // Create plan in database
    const { data: plan, error } = await supabase
      .from('plans')
      .insert({
        org_id: org.id,
        name: data.name,
        description: data.description || null,
        plan_type: planType,
        price: data.price,
        duration_days: data.durationDays || null,
        session_count: data.sessionCount || null,
        max_classes_per_week: data.maxClassesPerWeek || null,
        max_bookings_per_day: data.maxBookingsPerDay || null,
        is_active: data.isActive ?? true,
        stripe_product_id: productId || null,
        stripe_price_id: priceId || null,
        stripe_price_type: priceType || null,
      })
      .select('id')
      .single();

    if (error) {
      // Rollback Stripe product if DB insert failed
      if (productId && org.stripe_account_id) {
        try {
          await stripe.products.update(
            productId,
            { active: false },
            { stripeAccount: org.stripe_account_id }
          );
        } catch (e) {
          console.warn('Could not deactivate Stripe product:', e);
        }
      }
      console.error('Error creating plan:', error);
      return { success: false, error: 'Erreur lors de la creation du plan' };
    }

    revalidatePath('/dashboard/subscriptions/plans');
    return {
      success: true,
      data: {
        planId: plan.id,
        stripeProductId: productId || undefined,
        stripePriceId: priceId || undefined,
      },
    };
  } catch (error) {
    console.error('Error creating plan with Stripe:', error);
    return { success: false, error: 'Erreur lors de la creation du plan' };
  }
}

/**
 * Update plan and sync with Stripe
 */
export async function updatePlanWithStripe(
  planId: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    isActive?: boolean;
    durationDays?: number;
    sessionCount?: number;
    maxClassesPerWeek?: number;
    maxBookingsPerDay?: number;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const org = await requireOrgWithStripe();
  const stripe = getStripe();

  try {
    const plan = await getPlanWithStripe(planId, org.id);
    if (!plan) {
      return { success: false, error: 'Plan introuvable' };
    }

    // Update in database first
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.durationDays !== undefined) updateData.duration_days = data.durationDays || null;
    if (data.sessionCount !== undefined) updateData.session_count = data.sessionCount || null;
    if (data.maxClassesPerWeek !== undefined) updateData.max_classes_per_week = data.maxClassesPerWeek || null;
    if (data.maxBookingsPerDay !== undefined) updateData.max_bookings_per_day = data.maxBookingsPerDay || null;

    const { error } = await supabase
      .from('plans')
      .update(updateData)
      .eq('id', planId);

    if (error) {
      console.error('Error updating plan:', error);
      return { success: false, error: 'Erreur lors de la mise a jour du plan' };
    }

    // Sync with Stripe if configured and product exists
    if (org.stripe_account_id && plan.stripe_product_id) {
      // Update product name/description
      if (data.name || data.description !== undefined) {
        await stripe.products.update(
          plan.stripe_product_id,
          {
            name: data.name || plan.name,
            description: (data.description !== undefined ? data.description : plan.description) || undefined,
            active: data.isActive ?? plan.is_active,
          },
          { stripeAccount: org.stripe_account_id }
        );
      }

      // If price changed, create new price and archive old
      if (data.price !== undefined && data.price !== plan.price) {
        const amountCents = eurosToCents(data.price);
        const isRecurring = plan.stripe_price_type === 'recurring';

        const priceData: Parameters<typeof stripe.prices.create>[0] = {
          product: plan.stripe_product_id,
          unit_amount: amountCents,
          currency: PLATFORM_CONFIG.CURRENCY,
        };

        if (isRecurring) {
          const intervalMap: Record<string, { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number }> = {
            monthly: { interval: 'month', interval_count: 1 },
            quarterly: { interval: 'month', interval_count: 3 },
            biannual: { interval: 'month', interval_count: 6 },
            annual: { interval: 'year', interval_count: 1 },
          };
          priceData.recurring = intervalMap[plan.plan_type];
        }

        // Create new price
        const newPrice = await stripe.prices.create(
          priceData,
          { stripeAccount: org.stripe_account_id }
        );

        // Archive old price
        if (plan.stripe_price_id) {
          try {
            await stripe.prices.update(
              plan.stripe_price_id,
              { active: false },
              { stripeAccount: org.stripe_account_id }
            );
          } catch (e) {
            console.warn('Could not archive old price:', e);
          }
        }

        // Update plan with new price ID
        await supabase
          .from('plans')
          .update({ stripe_price_id: newPrice.id })
          .eq('id', planId);
      }

      // Handle activation/deactivation
      if (data.isActive !== undefined && plan.stripe_product_id) {
        await stripe.products.update(
          plan.stripe_product_id,
          { active: data.isActive },
          { stripeAccount: org.stripe_account_id }
        );
      }
    }

    revalidatePath('/dashboard/subscriptions/plans');
    revalidatePath(`/dashboard/subscriptions/plans/${planId}/edit`);
    return { success: true };
  } catch (error) {
    console.error('Error updating plan with Stripe:', error);
    return { success: false, error: 'Erreur lors de la mise a jour' };
  }
}

/**
 * Get a plan with its Stripe sync status
 */
export async function getPlanWithStripeStatus(planId: string): Promise<ActionResult<{
  plan: PlanWithStripe;
  stripeStatus: {
    hasProduct: boolean;
    hasPrice: boolean;
    priceType: string | null;
    canSync: boolean;
  };
}>> {
  const org = await requireOrgWithStripe();
  const plan = await getPlanWithStripe(planId, org.id);

  if (!plan) {
    return { success: false, error: 'Plan introuvable' };
  }

  return {
    success: true,
    data: {
      plan,
      stripeStatus: {
        hasProduct: !!plan.stripe_product_id,
        hasPrice: !!plan.stripe_price_id,
        priceType: plan.stripe_price_type,
        canSync: !!org.stripe_account_id && !!org.stripe_charges_enabled,
      },
    },
  };
}
