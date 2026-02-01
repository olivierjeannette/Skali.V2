import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { getClass, getClassBookings } from '@/actions/planning';
import { requireOrganization } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClassActions } from './class-actions';
import { BookingActions } from './booking-actions';
import { WorkoutSelector } from './workout-selector';

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'scheduled':
      return 'default';
    case 'in_progress':
      return 'secondary';
    case 'completed':
      return 'outline';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'scheduled':
      return 'Planifie';
    case 'in_progress':
      return 'En cours';
    case 'completed':
      return 'Termine';
    case 'cancelled':
      return 'Annule';
    default:
      return status;
  }
}

function getClassTypeLabel(classType: string) {
  switch (classType) {
    case 'group':
      return 'Cours collectif';
    case 'private':
      return 'Cours prive';
    case 'open_gym':
      return 'Open Gym';
    case 'event':
      return 'Evenement';
    case 'workshop':
      return 'Atelier';
    default:
      return classType;
  }
}

function getBookingStatusBadgeVariant(status: string) {
  switch (status) {
    case 'confirmed':
      return 'default';
    case 'waitlist':
      return 'secondary';
    case 'attended':
      return 'outline';
    case 'no_show':
      return 'destructive';
    case 'cancelled':
      return 'outline';
    default:
      return 'outline';
  }
}

function getBookingStatusLabel(status: string) {
  switch (status) {
    case 'confirmed':
      return 'Confirme';
    case 'waitlist':
      return 'Liste d\'attente';
    case 'attended':
      return 'Present';
    case 'no_show':
      return 'Absent';
    case 'cancelled':
      return 'Annule';
    default:
      return status;
  }
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

async function ParticipantsList({ classId }: { classId: string }) {
  const bookings = await getClassBookings(classId);

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const waitlistBookings = bookings.filter(b => b.status === 'waitlist');
  const attendedBookings = bookings.filter(b => b.status === 'attended');
  const noShowBookings = bookings.filter(b => b.status === 'no_show');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

  const activeBookings = [...confirmedBookings, ...attendedBookings];
  const allDisplayedBookings = [...activeBookings, ...waitlistBookings, ...noShowBookings];

  if (allDisplayedBookings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun participant inscrit
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats rapides */}
      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-green-600">{attendedBookings.length}</div>
          <div className="text-sm text-muted-foreground">Presents</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{confirmedBookings.length}</div>
          <div className="text-sm text-muted-foreground">Confirmes</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-amber-600">{waitlistBookings.length}</div>
          <div className="text-sm text-muted-foreground">En attente</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-600">{noShowBookings.length}</div>
          <div className="text-sm text-muted-foreground">Absents</div>
        </div>
      </div>

      {/* Liste des participants */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Participant</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allDisplayedBookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {booking.member
                        ? getInitials(booking.member.first_name, booking.member.last_name)
                        : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    {booking.member ? (
                      <Link
                        href={`/dashboard/members/${booking.member.id}`}
                        className="font-medium hover:underline"
                      >
                        {booking.member.first_name} {booking.member.last_name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Membre inconnu</span>
                    )}
                    {booking.member?.email && (
                      <div className="text-sm text-muted-foreground">
                        {booking.member.email}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getBookingStatusBadgeVariant(booking.status)}>
                  {getBookingStatusLabel(booking.status)}
                </Badge>
                {booking.waitlist_position && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    #{booking.waitlist_position}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {booking.is_drop_in ? (
                  <Badge variant="outline">Drop-in</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Abonnement</span>
                )}
              </TableCell>
              <TableCell>
                {booking.checked_in_at ? (
                  <span className="text-sm text-green-600">
                    {formatTime(booking.checked_in_at)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <BookingActions
                  bookingId={booking.id}
                  status={booking.status}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Annulations */}
      {cancelledBookings.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Annulations ({cancelledBookings.length})
          </h4>
          <div className="text-sm text-muted-foreground space-y-1">
            {cancelledBookings.map((booking) => (
              <div key={booking.id}>
                {booking.member
                  ? `${booking.member.first_name} ${booking.member.last_name}`
                  : 'Membre inconnu'}
                {booking.cancelled_reason && ` - ${booking.cancelled_reason}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ParticipantsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
      ))}
    </div>
  );
}

export default async function ClassDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const org = await requireOrganization();
  const classInfo = await getClass(resolvedParams.id);

  if (!classInfo) {
    notFound();
  }

  // Get linked workout info if any
  let linkedWorkout: { id: string; title: string } | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const classWithWorkout = classInfo as any;
  if (classWithWorkout.workout_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('workouts')
      .select('id, title')
      .eq('id', classWithWorkout.workout_id)
      .single();
    if (data) {
      linkedWorkout = data;
    }
  }

  const isPast = new Date(classInfo.end_time) < new Date();
  const isInProgress = new Date(classInfo.start_time) <= new Date() && new Date(classInfo.end_time) >= new Date();
  const isCancelled = classInfo.status === 'cancelled';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/planning">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: classInfo.color }}
              />
              <h1 className="text-3xl font-bold tracking-tight">{classInfo.name}</h1>
              <Badge variant={getStatusBadgeVariant(classInfo.status)}>
                {getStatusLabel(classInfo.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {formatDate(classInfo.start_time)} • {formatTime(classInfo.start_time)} - {formatTime(classInfo.end_time)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isCancelled && !isPast && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/planning/${classInfo.id}/edit`}>Modifier</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Informations du cours */}
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
            <CardDescription>Details du cours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{getClassTypeLabel(classInfo.class_type)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duree</span>
              <span>{classInfo.duration_minutes} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capacite</span>
              <span>
                {classInfo.current_participants}
                {classInfo.max_participants && ` / ${classInfo.max_participants}`}
              </span>
            </div>
            {classInfo.waitlist_count > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Liste d&apos;attente</span>
                <span className="text-amber-600">{classInfo.waitlist_count}</span>
              </div>
            )}
            {classInfo.coach && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coach</span>
                <span className="font-medium">{classInfo.coach.full_name}</span>
              </div>
            )}
            {classInfo.location && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lieu</span>
                <span>{classInfo.location}</span>
              </div>
            )}
            {classInfo.room && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Salle</span>
                <span>{classInfo.room}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Abonnement requis</span>
              <span>{classInfo.requires_subscription ? 'Oui' : 'Non'}</span>
            </div>
            {classInfo.drop_in_price !== null && classInfo.drop_in_price > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix drop-in</span>
                <span>{classInfo.drop_in_price} €</span>
              </div>
            )}
            {classInfo.description && (
              <div className="pt-4 border-t">
                <span className="text-muted-foreground block mb-2">Description</span>
                <p className="text-sm">{classInfo.description}</p>
              </div>
            )}
            {classInfo.notes && (
              <div className="pt-4 border-t">
                <span className="text-muted-foreground block mb-2">Notes</span>
                <p className="text-sm">{classInfo.notes}</p>
              </div>
            )}
            {isCancelled && classInfo.cancelled_reason && (
              <div className="pt-4 border-t">
                <span className="text-muted-foreground block mb-2">Raison annulation</span>
                <p className="text-sm text-red-600">{classInfo.cancelled_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Gerer ce cours</CardDescription>
          </CardHeader>
          <CardContent>
            <ClassActions
              classId={classInfo.id}
              status={classInfo.status}
              isPast={isPast}
              isInProgress={isInProgress}
            />
          </CardContent>
        </Card>

        {/* Workout associe */}
        <Card>
          <CardHeader>
            <CardTitle>Workout du jour</CardTitle>
            <CardDescription>
              Associer un workout a ce cours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkoutSelector
              classId={classInfo.id}
              orgId={org.id}
              currentWorkoutId={linkedWorkout?.id || null}
              currentWorkoutTitle={linkedWorkout?.title || null}
            />
          </CardContent>
        </Card>

        {/* Ajouter un participant */}
        {!isCancelled && !isPast && (
          <Card>
            <CardHeader>
              <CardTitle>Ajouter un participant</CardTitle>
              <CardDescription>
                Inscrire un membre a ce cours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href={`/dashboard/planning/${classInfo.id}/add-participant`}>
                  Ajouter un membre
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Liste des participants */}
      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
          <CardDescription>
            Liste des membres inscrits a ce cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ParticipantsSkeleton />}>
            <ParticipantsList classId={classInfo.id} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
