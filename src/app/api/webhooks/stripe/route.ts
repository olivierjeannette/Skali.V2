import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Force dynamic rendering (this route uses headers for webhook signature)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Lazy initialization to avoid build-time errors
let supabase: SupabaseClient | null = null;
let stripe: Stripe | null = null;

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabase;
}

function getStripeClient() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-01-28.clover',
    });
  }
  return stripe;
}

function getWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET!;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(body, signature, getWebhookSecret());
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Check for duplicate events (idempotency)
  const { data: existingEvent } = await getSupabase()
    .from('stripe_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existingEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Log event
  await getSupabase().from('stripe_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    processed: false,
    payload: event.data.object as unknown,
  });

  try {
    // Handle different event types
    switch (event.type) {
      // ================================
      // CONNECT ACCOUNT EVENTS
      // ================================
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;
      }

      // ================================
      // CHECKOUT SESSION EVENTS
      // ================================
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session);
        break;
      }

      // ================================
      // SUBSCRIPTION EVENTS (Platform)
      // ================================
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      // ================================
      // INVOICE EVENTS
      // ================================
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      // ================================
      // PAYMENT INTENT EVENTS (Connected)
      // ================================
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await getSupabase()
      .from('stripe_events')
      .update({ processed: true })
      .eq('stripe_event_id', event.id);

  } catch (error) {
    console.error('Error processing webhook:', error);

    // Log error
    await getSupabase()
      .from('stripe_events')
      .update({ error: String(error) })
      .eq('stripe_event_id', event.id);

    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ============================================
// HANDLER FUNCTIONS
// ============================================

async function handleAccountUpdated(account: Stripe.Account) {
  const orgId = account.metadata?.org_id;
  if (!orgId) return;

  await getSupabase()
    .from('organizations')
    .update({
      stripe_charges_enabled: account.charges_enabled,
      stripe_payouts_enabled: account.payouts_enabled,
      stripe_details_submitted: account.details_submitted,
      stripe_onboarding_complete: account.charges_enabled && account.details_submitted,
    })
    .eq('id', orgId);

  console.log(`Updated Connect account status for org ${orgId}`);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const orgId = metadata.org_id;
  const memberId = metadata.member_id;
  const planId = metadata.plan_id;
  const type = metadata.type;

  // Update checkout session status
  await getSupabase()
    .from('checkout_sessions')
    .update({
      status: 'complete',
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_customer_id: session.customer as string,
      completed_at: new Date().toISOString(),
    })
    .eq('stripe_session_id', session.id);

  // Handle platform subscription
  if (type === 'platform_subscription') {
    const planName = metadata.plan_name || 'starter';

    await getSupabase()
      .from('organizations')
      .update({
        platform_subscription_status: 'active',
        platform_subscription_id: session.subscription as string,
      })
      .eq('id', orgId);

    // Create platform subscription record
    await getSupabase().from('platform_subscriptions').upsert({
      org_id: orgId,
      plan_name: planName,
      price_monthly: planName === 'starter' ? 29 : planName === 'pro' ? 79 : 199,
      stripe_subscription_id: session.subscription as string,
      stripe_customer_id: session.customer as string,
      status: 'active',
      current_period_start: new Date().toISOString(),
    }, { onConflict: 'org_id' });

    console.log(`Platform subscription created for org ${orgId}`);
    return;
  }

  // Handle member subscription/payment
  if (memberId && planId && orgId) {
    // Get plan details
    const { data: plan } = await getSupabase()
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan) return;

    // Calculate end date
    let endDate: string | null = null;
    if (plan.duration_days) {
      const end = new Date();
      end.setDate(end.getDate() + plan.duration_days);
      endDate = end.toISOString().split('T')[0];
    }

    // Create subscription
    const { data: subscription } = await getSupabase()
      .from('subscriptions')
      .insert({
        org_id: orgId,
        member_id: memberId,
        plan_id: planId,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        end_date: endDate,
        sessions_total: plan.session_count,
        sessions_used: 0,
        price_paid: (session.amount_total || 0) / 100,
        stripe_subscription_id: session.subscription as string || null,
        auto_renew: session.mode === 'subscription',
      })
      .select('id')
      .single();

    if (subscription) {
      // Create payment record
      await getSupabase().from('payments').insert({
        org_id: orgId,
        member_id: memberId,
        subscription_id: subscription.id,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency || 'eur',
        status: 'paid',
        payment_method: 'card',
        stripe_payment_intent_id: session.payment_intent as string,
        paid_at: new Date().toISOString(),
        description: `Abonnement ${plan.name}`,
      });
    }

    console.log(`Subscription created for member ${memberId} in org ${orgId}`);
  }
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  await getSupabase()
    .from('checkout_sessions')
    .update({ status: 'expired' })
    .eq('stripe_session_id', session.id);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata || {};
  const orgId = metadata.org_id;
  const planName = metadata.plan_name;

  // Platform subscription
  if (planName && orgId) {
    const statusMap: Record<string, string> = {
      active: 'active',
      trialing: 'trialing',
      past_due: 'past_due',
      canceled: 'cancelled',
      incomplete: 'past_due',
      incomplete_expired: 'cancelled',
      unpaid: 'past_due',
      paused: 'paused',
    };

    await getSupabase()
      .from('organizations')
      .update({
        platform_subscription_status: statusMap[subscription.status] || 'active',
      })
      .eq('id', orgId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = subscription as any;
    await getSupabase()
      .from('platform_subscriptions')
      .update({
        status: statusMap[subscription.status] || 'active',
        current_period_start: sub.current_period_start
          ? new Date(sub.current_period_start * 1000).toISOString()
          : null,
        current_period_end: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        cancelled_at: sub.canceled_at
          ? new Date(sub.canceled_at * 1000).toISOString()
          : null,
      })
      .eq('stripe_subscription_id', subscription.id);

    console.log(`Platform subscription updated for org ${orgId}: ${subscription.status}`);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata || {};
  const orgId = metadata.org_id;

  if (orgId) {
    await getSupabase()
      .from('organizations')
      .update({ platform_subscription_status: 'cancelled' })
      .eq('id', orgId);

    await getSupabase()
      .from('platform_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    console.log(`Platform subscription cancelled for org ${orgId}`);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any;
  const subscriptionId = inv.subscription as string;
  if (!subscriptionId) return;

  // Update subscription status if needed
  const { data: platformSub } = await getSupabase()
    .from('platform_subscriptions')
    .select('org_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (platformSub) {
    await getSupabase()
      .from('organizations')
      .update({ platform_subscription_status: 'active' })
      .eq('id', platformSub.org_id);

    console.log(`Invoice paid for platform subscription ${subscriptionId}`);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any;
  const subscriptionId = inv.subscription as string;
  if (!subscriptionId) return;

  const { data: platformSub } = await getSupabase()
    .from('platform_subscriptions')
    .select('org_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (platformSub) {
    await getSupabase()
      .from('organizations')
      .update({ platform_subscription_status: 'past_due' })
      .eq('id', platformSub.org_id);

    console.log(`Invoice payment failed for platform subscription ${subscriptionId}`);
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata || {};
  const orgId = metadata.org_id;
  const memberId = metadata.member_id;

  if (orgId && memberId) {
    // Update payment record
    await getSupabase()
      .from('payments')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    console.log(`Payment succeeded for member ${memberId} in org ${orgId}`);
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata || {};
  const orgId = metadata.org_id;
  const memberId = metadata.member_id;

  if (orgId && memberId) {
    await getSupabase()
      .from('payments')
      .update({ status: 'failed' })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    console.log(`Payment failed for member ${memberId} in org ${orgId}`);
  }
}
