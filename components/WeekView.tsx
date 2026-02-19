'use client';

import { CalendarEvent, Shift } from '@/lib/types';
import { formatDate, getShift } from '@/lib/shiftStorage';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
}

export default function WeekView({ currentDate, events, onDateClick }: WeekViewProps) {
  const getWeekDates = (date: Date): Date[] => {
    const curr = new Date(date);
    let day = curr.getDay();
    day = day === 0 ? 6 : day - 1;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - day);

    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const weekDates = getWeekDates(currentDate);
  const hours = Array.from({ length: 24 }, (_, i) => i);

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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="grid grid-cols-8 bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="border-r border-slate-700 p-3"></div>
        {weekDates.map((date, index) => {
          const shift = getShiftForDate(date);
          const today = isToday(date);

          return (
            <div
              key={index}
              onClick={() => onDateClick(date)}
              className={`text-center p-3 border-r border-slate-700 last:border-r-0 cursor-pointer hover:bg-slate-700 transition-colors ${
                today ? 'bg-blue-900' : ''
              }`}
            >
              <div className={`text-lg font-bold ${today ? 'text-blue-300' : 'text-slate-300'}`}>
                {weekDays[index]}
              </div>
              <div className={`text-2xl font-bold ${today ? 'text-blue-300' : 'text-white'}`}>
                {date.getDate()}
              </div>
              {shift && (
                <div
                  className={`text-sm font-semibold mt-2 px-2 py-1 rounded ${
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
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-8">
          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-r border-b border-slate-700 p-2 text-right text-lg font-semibold text-slate-400 bg-slate-800 sticky left-0">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDates.map((date, dayIndex) => {
                const dayEvents = getEventsForDate(date).filter((event) => {
                  const eventHour = new Date(event.start).getHours();
                  return eventHour === hour;
                });

                return (
                  <div
                    key={dayIndex}
                    className="border-r border-b border-slate-700 p-2 min-h-[60px] bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="text-sm bg-blue-600 text-white px-2 py-1 rounded mb-1 truncate"
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
