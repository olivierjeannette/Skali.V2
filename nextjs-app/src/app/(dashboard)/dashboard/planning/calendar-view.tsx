'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getClassesForCurrentOrg } from '@/actions/planning';
import { Button } from '@/components/ui/button';
import type { ClassWithRelations } from '@/actions/planning';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6h - 20h
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function getWeekDates(date: Date): Date[] {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDateRange(dates: Date[]): string {
  const start = dates[0];
  const end = dates[6];
  const startMonth = start.toLocaleDateString('fr-FR', { month: 'short' });
  const endMonth = end.toLocaleDateString('fr-FR', { month: 'short' });

  if (startMonth === endMonth) {
    return `${start.getDate()} - ${end.getDate()} ${startMonth} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${start.getFullYear()}`;
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [classes, setClasses] = useState<ClassWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const weekDates = getWeekDates(currentDate);
  const startDate = weekDates[0].toISOString().split('T')[0];
  const endDate = weekDates[6].toISOString().split('T')[0];

  useEffect(() => {
    async function loadClasses() {
      setIsLoading(true);
      try {
        const data = await getClassesForCurrentOrg({
          startDate,
          endDate: endDate + 'T23:59:59',
        });
        setClasses(data);
      } catch (err) {
        console.error('Error loading classes:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadClasses();
  }, [startDate, endDate]);

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Organiser les classes par jour et heure
  const getClassesForDayAndHour = (dayIndex: number, hour: number) => {
    const targetDate = weekDates[dayIndex];
    return classes.filter((cls) => {
      const classDate = new Date(cls.start_time);
      return (
        classDate.getDate() === targetDate.getDate() &&
        classDate.getMonth() === targetDate.getMonth() &&
        classDate.getHours() === hour
      );
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Aujourd&apos;hui
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
        <div className="font-medium">{formatDateRange(weekDates)}</div>
      </div>

      {isLoading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header */}
            <div className="grid grid-cols-8 border-b">
              <div className="p-2 text-center text-sm text-muted-foreground" />
              {weekDates.map((date, i) => (
                <div
                  key={i}
                  className={`p-2 text-center border-l ${
                    isToday(date) ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="text-sm text-muted-foreground">{DAYS[i]}</div>
                  <div
                    className={`text-lg font-medium ${
                      isToday(date)
                        ? 'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto'
                        : ''
                    }`}
                  >
                    {date.getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="relative">
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b min-h-[60px]">
                  <div className="p-2 text-xs text-muted-foreground text-right pr-4">
                    {hour}:00
                  </div>
                  {weekDates.map((_, dayIndex) => {
                    const dayClasses = getClassesForDayAndHour(dayIndex, hour);
                    return (
                      <div
                        key={dayIndex}
                        className={`border-l p-1 ${
                          isToday(weekDates[dayIndex]) ? 'bg-primary/5' : ''
                        }`}
                      >
                        {dayClasses.map((cls) => (
                          <Link
                            key={cls.id}
                            href={`/dashboard/planning/${cls.id}`}
                            className="block p-1 rounded text-xs mb-1 hover:opacity-80 transition-opacity"
                            style={{
                              backgroundColor: cls.color + '20',
                              borderLeft: `3px solid ${cls.color}`,
                            }}
                          >
                            <div className="font-medium truncate">{cls.name}</div>
                            <div className="text-muted-foreground">
                              {cls.current_participants}
                              {cls.max_participants && `/${cls.max_participants}`}
                            </div>
                          </Link>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
