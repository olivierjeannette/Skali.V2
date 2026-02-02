// =====================================================
// API ROUTE: WORKFLOW CRON JOBS
// GET /api/workflows/cron
// Called by Vercel Cron or external scheduler
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

// Force dynamic rendering (this route uses headers for auth)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import {
  triggerSubscriptionExpiring,
  triggerClassStartingSoon,
  triggerScheduleDaily,
} from '@/lib/workflows/triggers';
import {
  getOrgsForWodPost,
  getTodaysWorkout,
  sendDiscordWodMessage,
} from '@/actions/discord';

// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const headersList = await headers();
    const authHeader = headersList.get('authorization');

    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const job = searchParams.get('job') || 'all';

    const results: Record<string, unknown> = {};

    // Get all active organizations
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orgs } = await (supabase as any)
      .from('organizations')
      .select('id')
      .eq('is_active', true);

    if (!orgs || orgs.length === 0) {
      return NextResponse.json({ message: 'No active organizations', results: {} });
    }

    // Run requested jobs
    for (const org of orgs) {
      const orgResults: Record<string, unknown> = {};

      // Job: Check expiring subscriptions
      if (job === 'all' || job === 'subscriptions') {
        orgResults.subscriptions = await checkExpiringSubscriptions(org.id);
      }

      // Job: Check upcoming classes
      if (job === 'all' || job === 'classes') {
        orgResults.classes = await checkUpcomingClasses(org.id);
      }

      // Job: Daily schedule trigger
      if (job === 'all' || job === 'daily') {
        orgResults.daily = await triggerScheduleDaily(org.id);
      }

      // Job: Process scheduled workflow runs
      if (job === 'all' || job === 'scheduled') {
        orgResults.scheduled = await processScheduledRuns(org.id);
      }

      results[org.id] = orgResults;
    }

    // Job: Post daily WODs to Discord (runs separately from org loop)
    if (job === 'all' || job === 'discord_wod') {
      results.discord_wod = await postDailyWods();
    }

    return NextResponse.json({
      success: true,
      job,
      organizations: orgs.length,
      results,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check for expiring subscriptions and trigger workflows
 */
async function checkExpiringSubscriptions(orgId: string) {
  const supabase = await createClient();
  const today = new Date();
  const results = {
    '7_days': 0,
    '30_days': 0,
    errors: 0,
  };

  // Check subscriptions expiring in 7 days
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: expiring7 } = await (supabase as any)
    .from('subscriptions')
    .select('id, member_id')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .eq('end_date', in7Days.toISOString().split('T')[0]);

  if (expiring7) {
    for (const sub of expiring7) {
      try {
        await triggerSubscriptionExpiring(orgId, sub.member_id, sub.id, 7);
        results['7_days']++;
      } catch {
        results.errors++;
      }
    }
  }

  // Check subscriptions expiring in 30 days
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: expiring30 } = await (supabase as any)
    .from('subscriptions')
    .select('id, member_id')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .eq('end_date', in30Days.toISOString().split('T')[0]);

  if (expiring30) {
    for (const sub of expiring30) {
      try {
        await triggerSubscriptionExpiring(orgId, sub.member_id, sub.id, 30);
        results['30_days']++;
      } catch {
        results.errors++;
      }
    }
  }

  return results;
}

/**
 * Check for upcoming classes and trigger reminders
 */
async function checkUpcomingClasses(orgId: string) {
  const supabase = await createClient();
  const now = new Date();
  const results = {
    '2_hours': 0,
    '24_hours': 0,
    errors: 0,
  };

  // Classes starting in 2 hours
  const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const in2HoursEnd = new Date(now.getTime() + 2.25 * 60 * 60 * 1000); // 15 min window

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: classes2h } = await (supabase as any)
    .from('classes')
    .select('id')
    .eq('org_id', orgId)
    .gte('start_time', in2Hours.toISOString())
    .lt('start_time', in2HoursEnd.toISOString());

  if (classes2h) {
    for (const cls of classes2h) {
      // Get confirmed bookings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: bookings } = await (supabase as any)
        .from('bookings')
        .select('member_id')
        .eq('class_id', cls.id)
        .eq('status', 'confirmed');

      if (bookings) {
        for (const booking of bookings) {
          try {
            await triggerClassStartingSoon(orgId, cls.id, booking.member_id, 2);
            results['2_hours']++;
          } catch {
            results.errors++;
          }
        }
      }
    }
  }

  // Classes starting in 24 hours
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in24HoursEnd = new Date(now.getTime() + 24.25 * 60 * 60 * 1000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: classes24h } = await (supabase as any)
    .from('classes')
    .select('id')
    .eq('org_id', orgId)
    .gte('start_time', in24Hours.toISOString())
    .lt('start_time', in24HoursEnd.toISOString());

  if (classes24h) {
    for (const cls of classes24h) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: bookings } = await (supabase as any)
        .from('bookings')
        .select('member_id')
        .eq('class_id', cls.id)
        .eq('status', 'confirmed');

      if (bookings) {
        for (const booking of bookings) {
          try {
            await triggerClassStartingSoon(orgId, cls.id, booking.member_id, 24);
            results['24_hours']++;
          } catch {
            results.errors++;
          }
        }
      }
    }
  }

  return results;
}

/**
 * Process scheduled workflow runs (delayed executions)
 */
async function processScheduledRuns(orgId: string) {
  const supabase = await createClient();
  const now = new Date();
  let processed = 0;
  let errors = 0;

  // Get pending scheduled runs that are due
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: scheduledRuns } = await (supabase as any)
    .from('workflow_scheduled_runs')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .lte('execute_at', now.toISOString());

  if (!scheduledRuns || scheduledRuns.length === 0) {
    return { processed: 0, errors: 0 };
  }

  for (const scheduled of scheduledRuns) {
    try {
      // Get the workflow
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: workflow } = await (supabase as any)
        .from('workflows')
        .select('*')
        .eq('id', scheduled.workflow_id)
        .single();

      if (!workflow) {
        // Mark as failed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('workflow_scheduled_runs')
          .update({ status: 'failed', error: 'Workflow not found' })
          .eq('id', scheduled.id);
        errors++;
        continue;
      }

      // Resume workflow execution from the next nodes
      // For simplicity, we'll mark the scheduled run as completed
      // The actual continuation would need more complex logic
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('workflow_scheduled_runs')
        .update({ status: 'completed', completed_at: now.toISOString() })
        .eq('id', scheduled.id);

      // Update the original run status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('workflow_runs')
        .update({ status: 'completed', completed_at: now.toISOString() })
        .eq('id', scheduled.run_id);

      processed++;
    } catch {
      errors++;
    }
  }

  return { processed, errors };
}

/**
 * Post daily WODs to Discord for all organizations with auto-post enabled
 */
async function postDailyWods() {
  const results = {
    posted: 0,
    skipped: 0,
    errors: 0,
    details: [] as Array<{ orgId: string; orgName: string; status: string; error?: string }>,
  };

  try {
    // Get all organizations that need WOD posted today
    const orgsForWod = await getOrgsForWodPost();

    if (orgsForWod.length === 0) {
      return { ...results, message: 'No organizations configured for Discord WOD posting today' };
    }

    for (const org of orgsForWod) {
      try {
        // Get today's workout
        const workout = await getTodaysWorkout(org.orgId);

        if (!workout) {
          results.skipped++;
          results.details.push({
            orgId: org.orgId,
            orgName: org.orgName,
            status: 'skipped',
            error: 'No published workout for today',
          });
          continue;
        }

        // Post to Discord
        const sendResult = await sendDiscordWodMessage(org.orgId, workout.id);

        if (sendResult.success) {
          results.posted++;
          results.details.push({
            orgId: org.orgId,
            orgName: org.orgName,
            status: 'posted',
          });
        } else {
          results.errors++;
          results.details.push({
            orgId: org.orgId,
            orgName: org.orgName,
            status: 'error',
            error: sendResult.error,
          });
        }
      } catch (err) {
        results.errors++;
        results.details.push({
          orgId: org.orgId,
          orgName: org.orgName,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  } catch (err) {
    console.error('Error posting daily WODs:', err);
    results.errors++;
  }

  return results;
}
