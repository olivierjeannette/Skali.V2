// =====================================================
// WORKFLOW TRIGGERS
// Functions to trigger workflows from application events
// =====================================================

import { triggerWorkflowsByEvent, type TriggerPayload } from './engine';

// =====================================================
// MEMBER TRIGGERS
// =====================================================

/**
 * Trigger workflows when a new member is created
 */
export async function triggerMemberCreated(
  orgId: string,
  memberId: string,
  memberData?: Record<string, unknown>
) {
  const payload: TriggerPayload = {
    trigger_type: 'member_created',
    member_id: memberId,
    data: {
      event: 'member_created',
      member_id: memberId,
      ...memberData,
    },
  };

  return triggerWorkflowsByEvent(orgId, payload);
}

/**
 * Trigger workflows when a member is updated
 */
export async function triggerMemberUpdated(
  orgId: string,
  memberId: string,
  changes: Record<string, unknown>
) {
  const payload: TriggerPayload = {
    trigger_type: 'member_updated' as TriggerPayload['trigger_type'],
    member_id: memberId,
    data: {
      event: 'member_updated',
      member_id: memberId,
      changes,
    },
  };

  return triggerWorkflowsByEvent(orgId, payload);
}

// =====================================================
// SUBSCRIPTION TRIGGERS
// =====================================================

/**
 * Trigger workflows when subscription is expiring soon
 */
export async function triggerSubscriptionExpiring(
  orgId: string,
  memberId: string,
  subscriptionId: string,
  daysRemaining: number
) {
  const payload: TriggerPayload = {
    trigger_type: 'subscription_expiring_soon',
    member_id: memberId,
    subscription_id: subscriptionId,
    data: {
      event: 'subscription_expiring_soon',
      member_id: memberId,
      subscription_id: subscriptionId,
      days_remaining: daysRemaining,
    },
  };

  return triggerWorkflowsByEvent(orgId, payload);
}

/**
 * Trigger workflows when subscription is created
 */
export async function triggerSubscriptionCreated(
  orgId: string,
  memberId: string,
  subscriptionId: string,
  planName: string
) {
  const payload: TriggerPayload = {
    trigger_type: 'subscription_created' as TriggerPayload['trigger_type'],
    member_id: memberId,
    subscription_id: subscriptionId,
    data: {
      event: 'subscription_created',
      member_id: memberId,
      subscription_id: subscriptionId,
      plan_name: planName,
    },
  };

  return triggerWorkflowsByEvent(orgId, payload);
}

/**
 * Trigger workflows when subscription expires
 */
export async function triggerSubscriptionExpired(
  orgId: string,
  memberId: string,
  subscriptionId: string
) {
  const payload: TriggerPayload = {
    trigger_type: 'subscription_expired' as TriggerPayload['trigger_type'],
    member_id: memberId,
    subscription_id: subscriptionId,
    data: {
      event: 'subscription_expired',
      member_id: memberId,
      subscription_id: subscriptionId,
    },
  };

  return triggerWorkflowsByEvent(orgId, payload);
}

// =====================================================
// CLASS/PLANNING TRIGGERS
// =====================================================

/**
 * Trigger workflows when a class is starting soon
 */
export async function triggerClassStartingSoon(
  orgId: string,
  classId: string,
  memberId: string,
  hoursUntilStart: number
) {
  const payload: TriggerPayload = {
    trigger_type: 'class_starting_soon',
    member_id: memberId,
    class_id: classId,
    data: {
      event: 'class_starting_soon',
      class_id: classId,
      member_id: memberId,
      hours_until_start: hoursUntilStart,
    },
  };

  return triggerWorkflowsByEvent(orgId, payload);
}

/**
 * Trigger workflows when a reservation is created
 */
export async function triggerReservationCreated(
  orgId: string,
  classId: string,
  memberId: string,
  bookingId: string
) {
  const payload: TriggerPayload = {
    trigger_type: 'reservation_created' as TriggerPayload['trigger_type'],
    member_id: memberId,
    class_id: classId,
    data: {
      event: 'reservation_created',
      class_id: classId,
      member_id: memberId,
      booking_id: bookingId,
    },
  };

  return triggerWorkflowsByEvent(orgId, payload);
}

/**
 * Trigger workflows when a class is cancelled
 */
export async function triggerClassCancelled(
  orgId: string,
  classId: string,
  reason?: string
) {
  const payload: TriggerPayload = {
    trigger_type: 'class_cancelled' as TriggerPayload['trigger_type'],
    class_id: classId,
    data: {
      event: 'class_cancelled',
      class_id: classId,
      reason,
    },
  };

  return triggerWorkflowsByEvent(orgId, payload);
}

// =====================================================
// PERFORMANCE TRIGGERS
// =====================================================

/**
 * Trigger workflows when a personal record is achieved
 */
export async function triggerPersonalRecord(
  orgId: string,
  memberId: string,
  exerciseName: string,
  newRecord: {
    value: number | string;
    unit: string;
    previous_value?: number | string;
  }
) {
  const payload: TriggerPayload = {
    trigger_type: 'personal_record_achieved',
    member_id: memberId,
    data: {
      event: 'personal_record_achieved',
      member_id: memberId,
      exercise_name: exerciseName,
      new_value: newRecord.value,
      unit: newRecord.unit,
      previous_value: newRecord.previous_value,
      improvement: newRecord.previous_value
        ? `${newRecord.value} (was ${newRecord.previous_value})`
        : `${newRecord.value}`,
    },
  };

  return triggerWorkflowsByEvent(orgId, payload);
}

/**
 * Trigger workflows when a score is submitted
 */
export async function triggerScoreSubmitted(
  orgId: string,
  memberId: string,
  workoutId: string,
  score: {
    value: number | string;
    type: string;
  }
) {
  const payload: TriggerPayload = {
    trigger_type: 'score_submitted' as TriggerPayload['trigger_type'],
    member_id: memberId,
    workout_id: workoutId,
    data: {
      event: 'score_submitted',
      member_id: memberId,
      workout_id: workoutId,
      score_value: score.value,
      score_type: score.type,
    },
  };

  return triggerWorkflowsByEvent(orgId, payload);
}

// =====================================================
// PAYMENT TRIGGERS
// =====================================================

/**
 * Trigger workflows when a payment is received
 */
export async function triggerPaymentReceived(
  orgId: string,
  memberId: string,
  paymentData: {
    amount: number;
    currency: string;
    payment_id?: string;
    subscription_id?: string;
  }
) {
  const payload: TriggerPayload = {
    trigger_type: 'payment_received' as TriggerPayload['trigger_type'],
    member_id: memberId,
    subscription_id: paymentData.subscription_id,
    data: {
      event: 'payment_received',
      member_id: memberId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      payment_id: paymentData.payment_id,
      subscription_id: paymentData.subscription_id,
    },
  };

  return triggerWorkflowsByEvent(orgId, payload);
}

/**
 * Trigger workflows when a payment fails
 */
export async function triggerPaymentFailed(
  orgId: string,
  memberId: string,
  failureData: {
    amount: number;
    currency: string;
    error_message?: string;
    subscription_id?: string;
  }
) {
  const payload: TriggerPayload = {
    trigger_type: 'payment_failed' as TriggerPayload['trigger_type'],
    member_id: memberId,
    subscription_id: failureData.subscription_id,
    data: {
      event: 'payment_failed',
      member_id: memberId,
      amount: failureData.amount,
      currency: failureData.currency,
      error_message: failureData.error_message,
      subscription_id: failureData.subscription_id,
    },
  };

  return triggerWorkflowsByEvent(orgId, payload);
}

// =====================================================
// SCHEDULED TRIGGERS (for cron jobs)
// =====================================================

/**
 * Trigger daily scheduled workflows
 */
export async function triggerScheduleDaily(orgId: string) {
  const today = new Date();
  const payload: TriggerPayload = {
    trigger_type: 'schedule_daily' as TriggerPayload['trigger_type'],
    data: {
      event: 'schedule_daily',
      date: today.toISOString().split('T')[0],
      day_of_week: today.getDay(),
      day_name: today.toLocaleDateString('fr-FR', { weekday: 'long' }),
    },
  };

  return triggerWorkflowsByEvent(orgId, payload);
}

/**
 * Trigger weekly scheduled workflows
 */
export async function triggerScheduleWeekly(orgId: string) {
  const today = new Date();
  const payload: TriggerPayload = {
    trigger_type: 'schedule_weekly' as TriggerPayload['trigger_type'],
    data: {
      event: 'schedule_weekly',
      date: today.toISOString().split('T')[0],
      week_number: getWeekNumber(today),
    },
  };

  return triggerWorkflowsByEvent(orgId, payload);
}

// Helper to get week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
