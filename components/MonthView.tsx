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
      <div className="grid grid-cols-7 bg-slate-800 border-b border-slate-700">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center py-4 text-xl font-bold text-slate-300 border-r border-slate-700 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-rows-[repeat(auto-fit,minmax(0,1fr))]">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-slate-700 last:border-b-0">
            {week.map((date, dayIndex) => {
              if (!date) {
                return (
                  <div
                    key={dayIndex}
                    className="bg-slate-900 border-r border-slate-700 last:border-r-0"
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
                  className={`relative border-r border-slate-700 last:border-r-0 p-2 cursor-pointer hover:bg-slate-700 transition-colors ${
                    today ? 'bg-blue-900' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`text-xl font-semibold mb-1 ${
                      today ? 'text-blue-300' : 'text-slate-300'
                    }`}
                  >
                    {date.getDate()}
                  </div>

                  {shift && (
                    <div
                      className={`text-sm font-semibold px-2 py-1 rounded mb-1 ${
                        shift.type === 'Mattino'
                          ? 'bg-amber-600 text-white'
                          : shift.type === 'Pomeriggio'
                          ? 'bg-purple-600 text-white'
                          : 'bg-green-600 text-white'
                      }`}
                    >
                      {shift.type}
                    </div>
                  )}

                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="text-xs bg-blue-600 text-white px-1 py-0.5 rounded truncate"
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-slate-400">
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
