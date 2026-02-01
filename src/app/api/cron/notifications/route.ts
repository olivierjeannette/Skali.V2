import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  sendSubscriptionExpirationReminders,
  sendTomorrowClassReminders,
} from '@/actions/notifications';

// Secret key for cron job authentication
const CRON_SECRET = process.env.CRON_SECRET;

// This endpoint is designed to be called by a cron job service (e.g., Vercel Cron, GitHub Actions)
// It processes all organizations and sends pending notifications

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'all';

  try {
    const supabase = await createClient();

    // Get all active organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('is_active', true);

    if (orgsError || !orgs) {
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      );
    }

    const results: {
      orgId: string;
      orgName: string;
      classReminders?: { sent: number; errors: number; skipped: number };
      subscription7d?: { sent: number; errors: number; skipped: number };
      subscription30d?: { sent: number; errors: number; skipped: number };
    }[] = [];

    for (const org of orgs) {
      const orgResult: typeof results[0] = {
        orgId: org.id,
        orgName: org.name,
      };

      // Send class reminders (for tomorrow's classes)
      if (type === 'all' || type === 'class_reminders') {
        try {
          orgResult.classReminders = await sendTomorrowClassReminders(org.id);
        } catch (err) {
          console.error(`Error sending class reminders for org ${org.id}:`, err);
          orgResult.classReminders = { sent: 0, errors: 1, skipped: 0 };
        }
      }

      // Send subscription expiration reminders (7 days)
      if (type === 'all' || type === 'subscription_7d') {
        try {
          orgResult.subscription7d = await sendSubscriptionExpirationReminders(org.id, 7);
        } catch (err) {
          console.error(`Error sending 7d subscription reminders for org ${org.id}:`, err);
          orgResult.subscription7d = { sent: 0, errors: 1, skipped: 0 };
        }
      }

      // Send subscription expiration reminders (30 days)
      if (type === 'all' || type === 'subscription_30d') {
        try {
          orgResult.subscription30d = await sendSubscriptionExpirationReminders(org.id, 30);
        } catch (err) {
          console.error(`Error sending 30d subscription reminders for org ${org.id}:`, err);
          orgResult.subscription30d = { sent: 0, errors: 1, skipped: 0 };
        }
      }

      results.push(orgResult);
    }

    // Calculate totals
    const totals = {
      organizations: orgs.length,
      classReminders: {
        sent: results.reduce((sum, r) => sum + (r.classReminders?.sent || 0), 0),
        errors: results.reduce((sum, r) => sum + (r.classReminders?.errors || 0), 0),
        skipped: results.reduce((sum, r) => sum + (r.classReminders?.skipped || 0), 0),
      },
      subscription7d: {
        sent: results.reduce((sum, r) => sum + (r.subscription7d?.sent || 0), 0),
        errors: results.reduce((sum, r) => sum + (r.subscription7d?.errors || 0), 0),
        skipped: results.reduce((sum, r) => sum + (r.subscription7d?.skipped || 0), 0),
      },
      subscription30d: {
        sent: results.reduce((sum, r) => sum + (r.subscription30d?.sent || 0), 0),
        errors: results.reduce((sum, r) => sum + (r.subscription30d?.errors || 0), 0),
        skipped: results.reduce((sum, r) => sum + (r.subscription30d?.skipped || 0), 0),
      },
    };

    return NextResponse.json({
      success: true,
      type,
      timestamp: new Date().toISOString(),
      totals,
      details: results,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST method for more control
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orgId, type } = body;

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId is required' },
        { status: 400 }
      );
    }

    const result: {
      classReminders?: { sent: number; errors: number; skipped: number };
      subscription7d?: { sent: number; errors: number; skipped: number };
      subscription30d?: { sent: number; errors: number; skipped: number };
    } = {};

    if (type === 'class_reminders' || type === 'all') {
      result.classReminders = await sendTomorrowClassReminders(orgId);
    }

    if (type === 'subscription_7d' || type === 'all') {
      result.subscription7d = await sendSubscriptionExpirationReminders(orgId, 7);
    }

    if (type === 'subscription_30d' || type === 'all') {
      result.subscription30d = await sendSubscriptionExpirationReminders(orgId, 30);
    }

    return NextResponse.json({
      success: true,
      orgId,
      type,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
