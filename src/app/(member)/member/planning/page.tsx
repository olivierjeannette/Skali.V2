'use client';

import { useEffect, useState, useCallback } from 'react';
import { format, addDays, startOfWeek, isSameDay, parseISO, isPast, isBefore, addHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Loader2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMemberAuth } from '@/hooks/useMemberAuth';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ClassSlot {
  id: string;
  name: string;
  class_type: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  max_participants: number | null;
  current_participants: number;
  waitlist_count: number;
  coach_name: string | null;
  location: string | null;
  color: string;
  status: string;
  booking_id: string | null;
  booking_status: string | null;
  workout_id: string | null;
  workout_title: string | null;
}

export default function MemberPlanningPage() {
  const { member, hasActiveSubscription } = useMemberAuth();
  const { toast } = useToast();
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [classes, setClasses] = useState<ClassSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const loadClasses = useCallback(async () => {
    if (!member) return;

    setIsLoading(true);
    const supabase = createClient();

    try {
      const weekEnd = addDays(currentWeekStart, 7);

      // Fetch classes for the week
      const { data: classesData, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          class_type,
          start_time,
          end_time,
          duration_minutes,
          max_participants,
          current_participants,
          waitlist_count,
          location,
          color,
          status,
          coach_id
        `)
        .eq('org_id', member.org_id)
        .gte('start_time', currentWeekStart.toISOString())
        .lt('start_time', weekEnd.toISOString())
        .in('status', ['scheduled', 'in_progress'])
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Fetch member's bookings for these classes
      const classIds = classesData?.map((c) => c.id) || [];

      const bookingsMap: Record<string, { id: string; status: string }> = {};

      if (classIds.length > 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id, class_id, status')
          .eq('member_id', member.id)
          .in('class_id', classIds)
          .not('status', 'in', '("cancelled")');

        bookings?.forEach((b) => {
          bookingsMap[b.class_id] = { id: b.id, status: b.status };
        });
      }

      const formattedClasses: ClassSlot[] = (classesData || []).map((c) => ({
        id: c.id,
        name: c.name,
        class_type: c.class_type,
        start_time: c.start_time,
        end_time: c.end_time,
        duration_minutes: c.duration_minutes,
        max_participants: c.max_participants,
        current_participants: c.current_participants,
        waitlist_count: c.waitlist_count,
        coach_name: null,
        location: c.location,
        color: c.color,
        status: c.status,
        booking_id: bookingsMap[c.id]?.id || null,
        booking_status: bookingsMap[c.id]?.status || null,
        workout_id: null,
        workout_title: null,
      }));

      setClasses(formattedClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le planning.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [member, currentWeekStart, toast]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handlePreviousWeek = () => {
    setCurrentWeekStart((prev) => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => addDays(prev, 7));
  };

  const handleBookClass = async () => {
    if (!member || !selectedClass) return;

    setIsBooking(true);
    const supabase = createClient();

    try {
      // Check if class is full
      const isFull = selectedClass.max_participants !== null &&
        selectedClass.current_participants >= selectedClass.max_participants;

      const bookingStatus = isFull ? 'waitlist' : 'confirmed';
      const waitlistPosition = isFull ? selectedClass.waitlist_count + 1 : null;

      // Create booking
      const { error: bookingError } = await supabase.from('bookings').insert({
        org_id: member.org_id,
        class_id: selectedClass.id,
        member_id: member.id,
        status: bookingStatus,
        waitlist_position: waitlistPosition,
      });

      if (bookingError) throw bookingError;

      // Update class counts
      if (bookingStatus === 'confirmed') {
        await supabase
          .from('classes')
          .update({ current_participants: selectedClass.current_participants + 1 })
          .eq('id', selectedClass.id);
      } else {
        await supabase
          .from('classes')
          .update({ waitlist_count: selectedClass.waitlist_count + 1 })
          .eq('id', selectedClass.id);
      }

      toast({
        title: bookingStatus === 'confirmed' ? 'Reservation confirmee' : 'Liste d\'attente',
        description: bookingStatus === 'confirmed'
          ? 'Vous etes inscrit au cours.'
          : `Vous etes en position ${waitlistPosition} sur la liste d'attente.`,
      });

      setSelectedClass(null);
      await loadClasses();
    } catch (error) {
      console.error('Error booking class:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de reserver le cours.',
        variant: 'destructive',
      });
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!member || !selectedClass || !selectedClass.booking_id) return;

    setIsCancelling(true);
    const supabase = createClient();

    try {
      // Check cancellation deadline (e.g., 2 hours before)
      const classStart = parseISO(selectedClass.start_time);
      const deadline = addHours(classStart, -2);

      if (isBefore(new Date(), deadline)) {
        // Allowed to cancel
        const { error } = await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_reason: 'Annulation membre',
          })
          .eq('id', selectedClass.booking_id);

        if (error) throw error;

        // Update class counts
        if (selectedClass.booking_status === 'confirmed') {
          await supabase
            .from('classes')
            .update({ current_participants: Math.max(0, selectedClass.current_participants - 1) })
            .eq('id', selectedClass.id);
        } else if (selectedClass.booking_status === 'waitlist') {
          await supabase
            .from('classes')
            .update({ waitlist_count: Math.max(0, selectedClass.waitlist_count - 1) })
            .eq('id', selectedClass.id);
        }

        toast({
          title: 'Reservation annulee',
          description: 'Votre place a ete liberee.',
        });
      } else {
        toast({
          title: 'Annulation impossible',
          description: 'Vous ne pouvez plus annuler moins de 2h avant le cours.',
          variant: 'destructive',
        });
      }

      setSelectedClass(null);
      await loadClasses();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'annuler la reservation.',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const getClassesForDay = (day: Date) => {
    return classes.filter((c) => isSameDay(parseISO(c.start_time), day));
  };

  const getClassStatus = (cls: ClassSlot) => {
    if (cls.booking_status === 'confirmed') return 'booked';
    if (cls.booking_status === 'waitlist') return 'waitlist';
    if (cls.max_participants && cls.current_participants >= cls.max_participants) return 'full';
    if (isPast(parseISO(cls.start_time))) return 'past';
    return 'available';
  };

  const formatWeekRange = () => {
    const weekEnd = addDays(currentWeekStart, 6);
    const startMonth = format(currentWeekStart, 'MMMM', { locale: fr });
    const endMonth = format(weekEnd, 'MMMM', { locale: fr });

    if (startMonth === endMonth) {
      return `${format(currentWeekStart, 'd', { locale: fr })} - ${format(weekEnd, 'd MMMM yyyy', { locale: fr })}`;
    }
    return `${format(currentWeekStart, 'd MMM', { locale: fr })} - ${format(weekEnd, 'd MMM yyyy', { locale: fr })}`;
  };

  return (
    <div className="p-4 md:p-6 md:ml-64 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Planning</h1>
      </div>

      {/* No subscription warning */}
      {!hasActiveSubscription && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Vous n&apos;avez pas d&apos;abonnement actif. Contactez la salle pour vous inscrire aux cours.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Week navigation */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold capitalize">{formatWeekRange()}</h2>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Week view */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {weekDays.map((day) => {
            const dayClasses = getClassesForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <Card key={day.toISOString()} className={cn(isToday && 'border-primary')}>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className={cn('capitalize', isToday && 'text-primary')}>
                      {format(day, 'EEEE d MMMM', { locale: fr })}
                    </span>
                    {isToday && (
                      <Badge variant="default" className="ml-2">Aujourd&apos;hui</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  {dayClasses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun cours ce jour
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {dayClasses.map((cls) => {
                        const status = getClassStatus(cls);
                        const spotsLeft = cls.max_participants
                          ? cls.max_participants - cls.current_participants
                          : null;

                        return (
                          <li
                            key={cls.id}
                            className={cn(
                              'p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50',
                              status === 'booked' && 'border-green-500 bg-green-50 dark:bg-green-950',
                              status === 'waitlist' && 'border-orange-500 bg-orange-50 dark:bg-orange-950',
                              status === 'past' && 'opacity-50 cursor-default'
                            )}
                            onClick={() => status !== 'past' && setSelectedClass(cls)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: cls.color }}
                                  />
                                  <span className="font-medium">{cls.name}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(parseISO(cls.start_time), 'HH:mm')} - {format(parseISO(cls.end_time), 'HH:mm')}
                                  </span>
                                  {cls.coach_name && (
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {cls.coach_name}
                                    </span>
                                  )}
                                  {cls.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {cls.location}
                                    </span>
                                  )}
                                </div>
                                {cls.workout_title && (
                                  <p className="text-sm text-primary font-medium">
                                    WOD: {cls.workout_title}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {status === 'booked' && (
                                  <Badge variant="default" className="bg-green-600">
                                    <Check className="h-3 w-3 mr-1" />
                                    Inscrit
                                  </Badge>
                                )}
                                {status === 'waitlist' && (
                                  <Badge variant="secondary" className="bg-orange-200 text-orange-800">
                                    Liste d&apos;attente
                                  </Badge>
                                )}
                                {status === 'full' && (
                                  <Badge variant="secondary">Complet</Badge>
                                )}
                                {status === 'available' && spotsLeft !== null && spotsLeft <= 3 && (
                                  <Badge variant="outline" className="text-orange-600">
                                    {spotsLeft} place{spotsLeft > 1 ? 's' : ''}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {cls.current_participants}
                                  {cls.max_participants && `/${cls.max_participants}`}
                                </span>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Class detail dialog */}
      <Dialog open={!!selectedClass} onOpenChange={() => setSelectedClass(null)}>
        <DialogContent>
          {selectedClass && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedClass.color }}
                  />
                  {selectedClass.name}
                </DialogTitle>
                <DialogDescription>
                  {format(parseISO(selectedClass.start_time), 'EEEE d MMMM yyyy', { locale: fr })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Horaire</p>
                    <p className="font-medium">
                      {format(parseISO(selectedClass.start_time), 'HH:mm')} - {format(parseISO(selectedClass.end_time), 'HH:mm')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duree</p>
                    <p className="font-medium">{selectedClass.duration_minutes} min</p>
                  </div>
                </div>

                {selectedClass.coach_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Coach</p>
                    <p className="font-medium">{selectedClass.coach_name}</p>
                  </div>
                )}

                {selectedClass.location && (
                  <div>
                    <p className="text-sm text-muted-foreground">Lieu</p>
                    <p className="font-medium">{selectedClass.location}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Participants</p>
                  <p className="font-medium">
                    {selectedClass.current_participants}
                    {selectedClass.max_participants && ` / ${selectedClass.max_participants}`} inscrits
                    {selectedClass.waitlist_count > 0 && ` (+${selectedClass.waitlist_count} en attente)`}
                  </p>
                </div>

                {selectedClass.workout_title && (
                  <div>
                    <p className="text-sm text-muted-foreground">WOD</p>
                    <p className="font-medium text-primary">{selectedClass.workout_title}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                {selectedClass.booking_id ? (
                  <Button
                    variant="destructive"
                    onClick={handleCancelBooking}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Annuler ma reservation
                  </Button>
                ) : (
                  <Button
                    onClick={handleBookClass}
                    disabled={isBooking || !hasActiveSubscription}
                  >
                    {isBooking ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    {selectedClass.max_participants &&
                     selectedClass.current_participants >= selectedClass.max_participants
                      ? 'Rejoindre la liste d\'attente'
                      : 'Reserver'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
