'use server';

import { createClient } from '@/lib/supabase/server';
import { requireOrganization } from '@/lib/auth';

export interface DashboardStats {
  members: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  subscriptions: {
    active: number;
    expiringSoon: number;
    revenue: number;
  };
  planning: {
    classesToday: number;
    classesThisWeek: number;
    averageAttendance: number;
    upcomingClasses: Array<{
      id: string;
      name: string;
      start_time: string;
      current_participants: number;
      max_participants: number | null;
    }>;
  };
  activity: Array<{
    id: string;
    type: 'member_joined' | 'subscription_created' | 'class_booked' | 'payment_received';
    description: string;
    created_at: string;
  }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const org = await requireOrganization();
  const orgId = org.id;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1).toISOString();
  const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 8).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all data in parallel
  const [
    membersResult,
    newMembersResult,
    activeSubscriptionsResult,
    expiringSubscriptionsResult,
    classesTodayResult,
    classesThisWeekResult,
    upcomingClassesResult,
    recentBookingsResult,
  ] = await Promise.all([
    // Total members
    supabase
      .from('members')
      .select('status')
      .eq('org_id', orgId)
      .neq('status', 'archived'),

    // New members this month
    supabase
      .from('members')
      .select('id')
      .eq('org_id', orgId)
      .gte('created_at', startOfMonth),

    // Active subscriptions
    supabase
      .from('subscriptions')
      .select('id, price_paid')
      .eq('org_id', orgId)
      .eq('status', 'active'),

    // Expiring soon subscriptions (within 30 days)
    supabase
      .from('subscriptions')
      .select('id')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .lte('end_date', in30Days),

    // Classes today
    supabase
      .from('classes')
      .select('id')
      .eq('org_id', orgId)
      .gte('start_time', startOfDay)
      .lt('start_time', endOfDay)
      .neq('status', 'cancelled'),

    // Classes this week
    supabase
      .from('classes')
      .select('id, current_participants')
      .eq('org_id', orgId)
      .gte('start_time', startOfWeek)
      .lt('start_time', endOfWeek)
      .neq('status', 'cancelled'),

    // Upcoming classes (next 5)
    supabase
      .from('classes')
      .select('id, name, start_time, current_participants, max_participants')
      .eq('org_id', orgId)
      .gte('start_time', now.toISOString())
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true })
      .limit(5),

    // Recent bookings for activity
    supabase
      .from('bookings')
      .select('id, created_at, member:members(first_name, last_name), class:classes(name)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  // Process members stats
  const members = membersResult.data || [];
  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === 'active').length;
  const newMembersThisMonth = newMembersResult.data?.length || 0;

  // Process subscriptions stats
  const activeSubscriptions = activeSubscriptionsResult.data || [];
  const totalActiveSubscriptions = activeSubscriptions.length;
  const expiringSoon = expiringSubscriptionsResult.data?.length || 0;
  const totalRevenue = activeSubscriptions.reduce((sum, s) => sum + (s.price_paid || 0), 0);

  // Process planning stats
  const classesToday = classesTodayResult.data?.length || 0;
  const classesThisWeek = classesThisWeekResult.data || [];
  const totalAttendance = classesThisWeek.reduce((sum, c) => sum + (c.current_participants || 0), 0);
  const averageAttendance = classesThisWeek.length > 0
    ? Math.round(totalAttendance / classesThisWeek.length)
    : 0;

  // Process upcoming classes
  const upcomingClasses = (upcomingClassesResult.data || []).map(c => ({
    id: c.id,
    name: c.name,
    start_time: c.start_time,
    current_participants: c.current_participants || 0,
    max_participants: c.max_participants,
  }));

  // Process recent activity
  const recentBookings = recentBookingsResult.data || [];
  const activity = recentBookings.slice(0, 5).map(booking => {
    const member = booking.member as { first_name: string; last_name: string } | null;
    const classInfo = booking.class as { name: string } | null;
    return {
      id: booking.id,
      type: 'class_booked' as const,
      description: member && classInfo
        ? `${member.first_name} ${member.last_name} s'est inscrit a ${classInfo.name}`
        : 'Nouvelle inscription',
      created_at: booking.created_at,
    };
  });

  return {
    members: {
      total: totalMembers,
      active: activeMembers,
      newThisMonth: newMembersThisMonth,
    },
    subscriptions: {
      active: totalActiveSubscriptions,
      expiringSoon,
      revenue: totalRevenue,
    },
    planning: {
      classesToday,
      classesThisWeek: classesThisWeek.length,
      averageAttendance,
      upcomingClasses,
    },
    activity,
  };
}

export async function getRevenueByMonth(months: number = 6): Promise<Array<{ month: string; revenue: number }>> {
  const supabase = await createClient();
  const org = await requireOrganization();

  const results: Array<{ month: string; revenue: number }> = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    const { data } = await supabase
      .from('payments')
      .select('amount')
      .eq('org_id', org.id)
      .eq('status', 'paid')
      .gte('paid_at', startDate.toISOString())
      .lt('paid_at', endDate.toISOString());

    const revenue = (data || []).reduce((sum, p) => sum + (p.amount || 0), 0);

    results.push({
      month: startDate.toLocaleDateString('fr-FR', { month: 'short' }),
      revenue,
    });
  }

  return results;
}

export async function getAttendanceByDay(days: number = 7): Promise<Array<{ day: string; attendance: number }>> {
  const supabase = await createClient();
  const org = await requireOrganization();

  const results: Array<{ day: string; attendance: number }> = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
    const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();

    const { data } = await supabase
      .from('bookings')
      .select('id')
      .eq('org_id', org.id)
      .eq('status', 'attended')
      .gte('checked_in_at', startDate)
      .lt('checked_in_at', endDate);

    results.push({
      day: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
      attendance: data?.length || 0,
    });
  }

  return results;
}
