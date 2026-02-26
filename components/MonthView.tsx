'use client';

import { CalendarEvent, Shift } from '@/lib/types';
import { formatDate, getShift } from '@/lib/shiftStorage';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
}

export default function MonthView({ currentDate, events, onDateClick }: MonthViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  let dayOfWeek = firstDayOfMonth.getDay();
  dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const daysInMonth = lastDayOfMonth.getDate();

  const weeks: Array<Array<Date | null>> = [];
  let currentWeek: Array<Date | null> = new Array(7).fill(null);

  for (let i = 0; i < dayOfWeek; i++) {
    currentWeek[i] = null;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    currentWeek[dayOfWeek] = date;
    dayOfWeek++;

    if (dayOfWeek === 7) {
      weeks.push(currentWeek);
      currentWeek = new Array(7).fill(null);
      dayOfWeek = 0;
    }
  }

  if (dayOfWeek > 0) {
    weeks.push(currentWeek);
  }

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  };

  const getShiftForDate = (date: Date): Shift | null => {
    return getShift(formatDate(date));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-7 bg-gradient-to-r from-slate-800/95 to-slate-900/95 border-b border-slate-700/50">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center py-5 text-2xl font-bold text-slate-200 border-r border-slate-700/50 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-rows-[repeat(auto-fit,minmax(0,1fr))]">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-slate-700/50 last:border-b-0">
            {week.map((date, dayIndex) => {
              if (!date) {
                return (
                  <div
                    key={dayIndex}
                    className="bg-slate-900/60 border-r border-slate-700/50 last:border-r-0"
                  />
                );
              }

              const dayEvents = getEventsForDate(date);
              const shift = getShiftForDate(date);
              const today = isToday(date);

              return (
                <div
                  key={dayIndex}
                  onClick={() => onDateClick(date)}
                  className={`relative border-r border-slate-700/50 last:border-r-0 p-3 cursor-pointer hover:bg-slate-700/60 transition-all duration-200 ${
                    today ? 'bg-gradient-to-br from-blue-900/80 to-blue-800/80' : 'bg-slate-800/60'
                  }`}
                >
                  <div
                    className={`text-2xl font-bold mb-2 ${
                      today ? 'text-blue-200' : 'text-slate-200'
                    }`}
                  >
                    {date.getDate()}
                  </div>

                  {shift && (
                    <div
                      className={`text-sm font-bold px-3 py-1.5 rounded-xl mb-2 shadow-md ${
                        shift.type === 'Mattino'
                          ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
                          : shift.type === 'Pomeriggio'
                          ? 'bg-gradient-to-br from-fuchsia-600 to-fuchsia-700 text-white'
                          : 'bg-gradient-to-br from-green-600 to-green-700 text-white'
                      }`}
                    >
                      {shift.type}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white px-2 py-1 rounded-lg truncate font-semibold shadow-sm"
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-sm text-slate-300 font-semibold">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
