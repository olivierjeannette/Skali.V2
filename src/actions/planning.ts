'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { TablesInsert, TablesUpdate, ClassTemplate, Class, Booking, Profile } from '@/types/database.types';
import { requireOrganization } from '@/lib/auth';
import { sendBookingConfirmationEmail, sendClassCancelledEmail } from './notifications';

// Types
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// Extended types with relations
export interface ClassWithRelations extends Class {
  coach: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
  template: ClassTemplate | null;
}

export interface BookingWithRelations extends Booking {
  member: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
  class: Class | null;
}

// ============================================
// CLASS TEMPLATES
// ============================================

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  classType: z.enum(['group', 'private', 'open_gym', 'event', 'workshop']),
  durationMinutes: z.number().min(15).max(480),
  maxParticipants: z.number().optional(),
  color: z.string().optional(),
  requiresSubscription: z.boolean().optional(),
  sessionCost: z.number().optional(),
});

export async function getClassTemplates(orgId: string): Promise<ClassTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('class_templates')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching class templates:', error);
    return [];
  }

  return data || [];
}

export async function getClassTemplate(templateId: string): Promise<ClassTemplate | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('class_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Error fetching class template:', error);
    return null;
  }

  return data;
}

export async function createClassTemplate(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const org = await requireOrganization();

  const rawData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    classType: formData.get('classType') as string,
    durationMinutes: parseInt(formData.get('durationMinutes') as string),
    maxParticipants: formData.get('maxParticipants') ? parseInt(formData.get('maxParticipants') as string) : undefined,
    color: formData.get('color') as string,
    requiresSubscription: formData.get('requiresSubscription') === 'true',
    sessionCost: formData.get('sessionCost') ? parseInt(formData.get('sessionCost') as string) : undefined,
  };

  const parsed = createTemplateSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: 'Donnees invalides' };
  }

  const data = parsed.data;

  const templateData: TablesInsert<'class_templates'> = {
    org_id: org.id,
    name: data.name,
    description: data.description || null,
    class_type: data.classType,
    duration_minutes: data.durationMinutes,
    max_participants: data.maxParticipants || null,
    color: data.color || '#3b82f6',
    requires_subscription: data.requiresSubscription ?? true,
    session_cost: data.sessionCost ?? 1,
  };

  const { data: template, error } = await supabase
    .from('class_templates')
    .insert(templateData)
    .select('id')
    .single();

  if (error) {
    console.error('Error creating class template:', error);
    return { success: false, error: 'Erreur lors de la creation du modele' };
  }

  revalidatePath('/dashboard/planning');
  return { success: true, data: { id: template.id } };
}

export async function updateClassTemplate(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const templateId = formData.get('id') as string;

  const updateData: TablesUpdate<'class_templates'> = {};

  const name = formData.get('name') as string;
  if (name) updateData.name = name;

  const description = formData.get('description') as string;
  if (description !== undefined) updateData.description = description || null;

  const classType = formData.get('classType') as 'group' | 'private' | 'open_gym' | 'event' | 'workshop' | null;
  if (classType) updateData.class_type = classType;

  const durationMinutes = formData.get('durationMinutes');
  if (durationMinutes) updateData.duration_minutes = parseInt(durationMinutes as string);

  const maxParticipants = formData.get('maxParticipants');
  if (maxParticipants !== null) {
    updateData.max_participants = maxParticipants ? parseInt(maxParticipants as string) : null;
  }

  const color = formData.get('color') as string;
  if (color) updateData.color = color;

  const sessionCost = formData.get('sessionCost');
  if (sessionCost) updateData.session_cost = parseInt(sessionCost as string);

  const requiresSubscription = formData.get('requiresSubscription');
  if (requiresSubscription !== null) {
    updateData.requires_subscription = requiresSubscription === 'true';
  }

  const { error } = await supabase
    .from('class_templates')
    .update(updateData)
    .eq('id', templateId);

  if (error) {
    console.error('Error updating class template:', error);
    return { success: false, error: 'Erreur lors de la mise a jour du modele' };
  }

  revalidatePath('/dashboard/planning');
  revalidatePath('/dashboard/planning/templates');
  return { success: true };
}

export async function deleteClassTemplate(templateId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('class_templates')
    .update({ is_active: false })
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting class template:', error);
    return { success: false, error: 'Erreur lors de la suppression du modele' };
  }

  revalidatePath('/dashboard/planning');
  return { success: true };
}

// ============================================
// CLASSES
// ============================================

const createClassSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  templateId: z.string().uuid().optional(),
  classType: z.enum(['group', 'private', 'open_gym', 'event', 'workshop']),
  startTime: z.string(),
  durationMinutes: z.number().min(15).max(480),
  maxParticipants: z.number().optional(),
  coachId: z.string().uuid().optional(),
  location: z.string().optional(),
  color: z.string().optional(),
  requiresSubscription: z.boolean().optional(),
  dropInPrice: z.number().optional(),
});

export async function getClasses(
  orgId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    coachId?: string;
    status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  }
): Promise<ClassWithRelations[]> {
  const supabase = await createClient();

  let query = supabase
    .from('classes')
    .select('*, coach:profiles!classes_coach_id_fkey(id, full_name, avatar_url), template:class_templates(*)')
    .eq('org_id', orgId);

  if (options?.startDate) {
    query = query.gte('start_time', options.startDate);
  }

  if (options?.endDate) {
    query = query.lte('start_time', options.endDate);
  }

  if (options?.coachId) {
    query = query.eq('coach_id', options.coachId);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query.order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching classes:', error);
    return [];
  }

  return (data || []) as unknown as ClassWithRelations[];
}

export async function getClass(classId: string): Promise<ClassWithRelations | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('classes')
    .select('*, coach:profiles!classes_coach_id_fkey(id, full_name, avatar_url), template:class_templates(*)')
    .eq('id', classId)
    .single();

  if (error) {
    console.error('Error fetching class:', error);
    return null;
  }

  return data as unknown as ClassWithRelations;
}

export async function createClass(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const org = await requireOrganization();

  const rawData = {
    name: formData.get('name') as string,
    templateId: formData.get('templateId') as string || undefined,
    classType: (formData.get('classType') as string) || 'group',
    startTime: formData.get('startTime') as string,
    durationMinutes: parseInt(formData.get('durationMinutes') as string),
    maxParticipants: formData.get('maxParticipants') ? parseInt(formData.get('maxParticipants') as string) : undefined,
    coachId: formData.get('coachId') as string || undefined,
    location: formData.get('location') as string || undefined,
    color: formData.get('color') as string || undefined,
    requiresSubscription: formData.get('requiresSubscription') !== 'false',
    dropInPrice: formData.get('dropInPrice') ? parseFloat(formData.get('dropInPrice') as string) : undefined,
  };

  const parsed = createClassSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: 'Donnees invalides' };
  }

  const data = parsed.data;

  // Calculer end_time
  const startTime = new Date(data.startTime);
  const endTime = new Date(startTime.getTime() + data.durationMinutes * 60 * 1000);

  const classData: TablesInsert<'classes'> = {
    org_id: org.id,
    template_id: data.templateId || null,
    name: data.name,
    class_type: data.classType,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    duration_minutes: data.durationMinutes,
    max_participants: data.maxParticipants || null,
    coach_id: data.coachId || null,
    location: data.location || null,
    color: data.color || '#3b82f6',
    requires_subscription: data.requiresSubscription,
    drop_in_price: data.dropInPrice || null,
  };

  const { data: newClass, error } = await supabase
    .from('classes')
    .insert(classData)
    .select('id')
    .single();

  if (error) {
    console.error('Error creating class:', error);
    return { success: false, error: 'Erreur lors de la creation du cours' };
  }

  revalidatePath('/dashboard/planning');
  return { success: true, data: { id: newClass.id } };
}

export async function updateClass(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const classId = formData.get('id') as string;

  const updateData: TablesUpdate<'classes'> = {};

  const name = formData.get('name') as string;
  if (name) updateData.name = name;

  const startTime = formData.get('startTime') as string;
  const durationMinutes = formData.get('durationMinutes');

  if (startTime) {
    updateData.start_time = new Date(startTime).toISOString();
    if (durationMinutes) {
      const duration = parseInt(durationMinutes as string);
      updateData.duration_minutes = duration;
      const endTime = new Date(new Date(startTime).getTime() + duration * 60 * 1000);
      updateData.end_time = endTime.toISOString();
    }
  }

  const coachId = formData.get('coachId');
  if (coachId !== null) updateData.coach_id = coachId as string || null;

  const location = formData.get('location');
  if (location !== null) updateData.location = location as string || null;

  const { error } = await supabase
    .from('classes')
    .update(updateData)
    .eq('id', classId);

  if (error) {
    console.error('Error updating class:', error);
    return { success: false, error: 'Erreur lors de la mise a jour du cours' };
  }

  revalidatePath('/dashboard/planning');
  return { success: true };
}

export async function cancelClass(classId: string, reason?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const org = await requireOrganization();

  // Recuperer les infos du cours avant annulation
  const classInfo = await getClass(classId);
  if (!classInfo) {
    return { success: false, error: 'Cours introuvable' };
  }

  const { error } = await supabase
    .from('classes')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: reason || null,
    })
    .eq('id', classId);

  if (error) {
    console.error('Error cancelling class:', error);
    return { success: false, error: 'Erreur lors de l\'annulation du cours' };
  }

  // Recuperer les reservations avant de les annuler
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, member:members(id, first_name, last_name, email)')
    .eq('class_id', classId)
    .in('status', ['confirmed', 'waitlist']);

  // Annuler toutes les reservations
  await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: 'Cours annule',
    })
    .eq('class_id', classId)
    .in('status', ['confirmed', 'waitlist']);

  // Envoyer email d'annulation aux inscrits
  if (bookings && bookings.length > 0) {
    const startTime = new Date(classInfo.start_time);
    const classEmailData = {
      name: classInfo.name,
      date: startTime.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
      time: startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    for (const booking of bookings) {
      const member = booking.member as { id: string; first_name: string; last_name: string; email: string | null } | null;
      if (member?.email) {
        sendClassCancelledEmail(
          {
            email: member.email,
            firstName: member.first_name,
            lastName: member.last_name,
          },
          classEmailData,
          org.id,
          reason
        ).catch((err) => console.error('Error sending cancellation email:', err));
      }
    }
  }

  revalidatePath('/dashboard/planning');
  return { success: true };
}

// ============================================
// BOOKINGS
// ============================================

export async function getClassBookings(classId: string): Promise<BookingWithRelations[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('bookings')
    .select('*, member:members(id, first_name, last_name, email), class:classes(*)')
    .eq('class_id', classId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }

  return (data || []) as unknown as BookingWithRelations[];
}

export async function getMemberBookings(
  memberId: string,
  options?: {
    upcoming?: boolean;
    status?: 'confirmed' | 'waitlist' | 'cancelled' | 'no_show' | 'attended';
  }
): Promise<BookingWithRelations[]> {
  const supabase = await createClient();

  let query = supabase
    .from('bookings')
    .select('*, member:members(id, first_name, last_name, email), class:classes(*)')
    .eq('member_id', memberId);

  if (options?.upcoming) {
    query = query.gte('class.start_time', new Date().toISOString());
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching member bookings:', error);
    return [];
  }

  return (data || []) as unknown as BookingWithRelations[];
}

export async function createBooking(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const org = await requireOrganization();

  const classId = formData.get('classId') as string;
  const memberId = formData.get('memberId') as string;
  const subscriptionId = formData.get('subscriptionId') as string || null;
  const isDropIn = formData.get('isDropIn') === 'true';

  if (!classId || !memberId) {
    return { success: false, error: 'Donnees manquantes' };
  }

  // Verifier si le membre peut reserver
  const classInfo = await getClass(classId);
  if (!classInfo) {
    return { success: false, error: 'Cours introuvable' };
  }

  if (classInfo.status === 'cancelled') {
    return { success: false, error: 'Ce cours a ete annule' };
  }

  // Verifier si deja inscrit
  const { data: existingBooking } = await supabase
    .from('bookings')
    .select('id')
    .eq('class_id', classId)
    .eq('member_id', memberId)
    .not('status', 'in', '("cancelled","no_show")')
    .single();

  if (existingBooking) {
    return { success: false, error: 'Deja inscrit a ce cours' };
  }

  // Determiner le statut (confirmed ou waitlist)
  let status: 'confirmed' | 'waitlist' = 'confirmed';
  let waitlistPosition: number | null = null;

  if (classInfo.max_participants && classInfo.current_participants >= classInfo.max_participants) {
    status = 'waitlist';
    waitlistPosition = classInfo.waitlist_count + 1;
  }

  const bookingData: TablesInsert<'bookings'> = {
    org_id: org.id,
    class_id: classId,
    member_id: memberId,
    subscription_id: subscriptionId,
    status,
    waitlist_position: waitlistPosition,
    is_drop_in: isDropIn,
  };

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select('id')
    .single();

  if (error) {
    console.error('Error creating booking:', error);
    return { success: false, error: 'Erreur lors de la reservation' };
  }

  // Envoyer email de confirmation si le membre a un email
  if (status === 'confirmed') {
    const { data: member } = await supabase
      .from('members')
      .select('first_name, last_name, email')
      .eq('id', memberId)
      .single();

    if (member?.email) {
      const startTime = new Date(classInfo.start_time);
      sendBookingConfirmationEmail(
        {
          email: member.email,
          firstName: member.first_name,
          lastName: member.last_name,
        },
        {
          name: classInfo.name,
          date: startTime.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }),
          time: startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          coachName: classInfo.coach?.full_name || undefined,
        },
        org.id,
        classInfo.max_participants ? classInfo.max_participants - classInfo.current_participants - 1 : undefined
      ).catch((err) => console.error('Error sending booking confirmation:', err));
    }
  }

  revalidatePath('/dashboard/planning');
  return { success: true, data: { id: booking.id } };
}

export async function cancelBooking(bookingId: string, reason?: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: reason || null,
    })
    .eq('id', bookingId);

  if (error) {
    console.error('Error cancelling booking:', error);
    return { success: false, error: 'Erreur lors de l\'annulation' };
  }

  revalidatePath('/dashboard/planning');
  return { success: true };
}

export async function checkInMember(bookingId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'attended',
      checked_in_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (error) {
    console.error('Error checking in member:', error);
    return { success: false, error: 'Erreur lors du check-in' };
  }

  revalidatePath('/dashboard/planning');
  return { success: true };
}

export async function markNoShow(bookingId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'no_show',
      no_show_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (error) {
    console.error('Error marking no-show:', error);
    return { success: false, error: 'Erreur lors du marquage no-show' };
  }

  revalidatePath('/dashboard/planning');
  return { success: true };
}

// ============================================
// STATS
// ============================================

export async function getPlanningStats(orgId: string, startDate?: string, endDate?: string) {
  const supabase = await createClient();

  const start = startDate || new Date().toISOString().split('T')[0];
  const end = endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: classes } = await supabase
    .from('classes')
    .select('id, status, current_participants, max_participants')
    .eq('org_id', orgId)
    .gte('start_time', start)
    .lte('start_time', end);

  const stats = {
    totalClasses: classes?.length || 0,
    scheduledClasses: classes?.filter(c => c.status === 'scheduled').length || 0,
    cancelledClasses: classes?.filter(c => c.status === 'cancelled').length || 0,
    totalParticipants: classes?.reduce((sum, c) => sum + (c.current_participants || 0), 0) || 0,
    averageOccupancy: 0,
  };

  // Calculer le taux d'occupation moyen
  const classesWithCapacity = classes?.filter(c => c.max_participants && c.max_participants > 0) || [];
  if (classesWithCapacity.length > 0) {
    const totalOccupancy = classesWithCapacity.reduce((sum, c) => {
      return sum + ((c.current_participants || 0) / (c.max_participants || 1)) * 100;
    }, 0);
    stats.averageOccupancy = Math.round(totalOccupancy / classesWithCapacity.length);
  }

  return stats;
}

// Version pour composants client
export async function getClassesForCurrentOrg(options?: {
  startDate?: string;
  endDate?: string;
}): Promise<ClassWithRelations[]> {
  const org = await requireOrganization();
  return getClasses(org.id, options);
}

export async function getClassTemplatesForCurrentOrg(): Promise<ClassTemplate[]> {
  const org = await requireOrganization();
  return getClassTemplates(org.id);
}

// ============================================
// RECURRENCE
// ============================================

export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface RecurrenceConfig {
  pattern: RecurrencePattern;
  daysOfWeek?: number[]; // 0-6, 0=Sunday
  startDate: string;
  endDate: string;
  time: string; // HH:mm format
}

export async function generateRecurringClasses(
  templateId: string,
  recurrence: RecurrenceConfig,
  options?: {
    coachId?: string;
    location?: string;
    excludeDates?: string[]; // ISO dates to skip
  }
): Promise<ActionResult<{ count: number; classIds: string[] }>> {
  const supabase = await createClient();
  const org = await requireOrganization();

  // Get template
  const template = await getClassTemplate(templateId);
  if (!template) {
    return { success: false, error: 'Modele introuvable' };
  }

  const start = new Date(recurrence.startDate);
  const end = new Date(recurrence.endDate);
  const excludeSet = new Set(options?.excludeDates || []);

  // Generate dates based on pattern
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const dayOfWeek = current.getDay();

    let shouldInclude = false;

    switch (recurrence.pattern) {
      case 'daily':
        shouldInclude = true;
        break;
      case 'weekly':
      case 'biweekly':
        if (recurrence.daysOfWeek && recurrence.daysOfWeek.includes(dayOfWeek)) {
          shouldInclude = true;
        }
        break;
      case 'monthly':
        // Same day of month as start date
        if (current.getDate() === start.getDate()) {
          shouldInclude = true;
        }
        break;
    }

    if (shouldInclude && !excludeSet.has(dateStr)) {
      dates.push(new Date(current));
    }

    // Increment based on pattern
    if (recurrence.pattern === 'biweekly') {
      current.setDate(current.getDate() + 14);
    } else if (recurrence.pattern === 'monthly') {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
  }

  // Limit to prevent too many classes at once
  const MAX_CLASSES = 100;
  if (dates.length > MAX_CLASSES) {
    return {
      success: false,
      error: `Trop de cours a generer (${dates.length}). Maximum: ${MAX_CLASSES}`,
    };
  }

  if (dates.length === 0) {
    return { success: false, error: 'Aucune date correspondante trouvee' };
  }

  // Create classes
  const classIds: string[] = [];
  const [hours, minutes] = recurrence.time.split(':').map(Number);

  for (const date of dates) {
    date.setHours(hours, minutes, 0, 0);
    const endTime = new Date(date.getTime() + template.duration_minutes * 60 * 1000);

    const classData: TablesInsert<'classes'> = {
      org_id: org.id,
      template_id: templateId,
      name: template.name,
      class_type: template.class_type,
      start_time: date.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: template.duration_minutes,
      max_participants: template.max_participants,
      coach_id: options?.coachId || null,
      location: options?.location || null,
      color: template.color || '#3b82f6',
      requires_subscription: template.requires_subscription,
      session_cost: template.session_cost,
    };

    const { data: newClass, error } = await supabase
      .from('classes')
      .insert(classData)
      .select('id')
      .single();

    if (!error && newClass) {
      classIds.push(newClass.id);
    }
  }

  revalidatePath('/dashboard/planning');

  return {
    success: true,
    data: {
      count: classIds.length,
      classIds,
    },
  };
}

// ============================================
// WORKOUT LINK
// ============================================

export async function linkWorkoutToClass(
  classId: string,
  workoutId: string | null
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('classes')
    .update({ workout_id: workoutId })
    .eq('id', classId);

  if (error) {
    console.error('Error linking workout to class:', error);
    return { success: false, error: 'Erreur lors de la liaison du workout' };
  }

  revalidatePath('/dashboard/planning');
  revalidatePath(`/dashboard/planning/${classId}`);
  return { success: true };
}

export async function getAvailableWorkouts(orgId: string): Promise<{
  id: string;
  title: string;
  scheduled_date: string | null;
  wod_type: string | null;
}[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('workouts')
    .select('id, title, scheduled_date, wod_type')
    .eq('org_id', orgId)
    .eq('status', 'published')
    .order('scheduled_date', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching workouts:', error);
    return [];
  }

  return data || [];
}

export async function deleteRecurringClasses(
  classIds: string[]
): Promise<ActionResult<{ deletedCount: number }>> {
  const supabase = await createClient();

  if (classIds.length === 0) {
    return { success: true, data: { deletedCount: 0 } };
  }

  // Only delete classes that have no confirmed bookings
  const { data: classesWithBookings } = await supabase
    .from('classes')
    .select('id, bookings!inner(id)')
    .in('id', classIds)
    .eq('bookings.status', 'confirmed');

  const classesWithBookingsIds = new Set(classesWithBookings?.map((c) => c.id) || []);
  const deletableIds = classIds.filter((id) => !classesWithBookingsIds.has(id));

  if (deletableIds.length === 0) {
    return {
      success: false,
      error: 'Tous les cours selectionnes ont des reservations confirmees',
    };
  }

  const { error, count } = await supabase
    .from('classes')
    .delete()
    .in('id', deletableIds);

  if (error) {
    console.error('Error deleting recurring classes:', error);
    return { success: false, error: 'Erreur lors de la suppression' };
  }

  revalidatePath('/dashboard/planning');

  return {
    success: true,
    data: { deletedCount: count || deletableIds.length },
  };
}
