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
      <div className="grid grid-cols-8 bg-gradient-to-r from-slate-800/95 to-slate-900/95 border-b border-slate-700/50 sticky top-0 z-10">
        <div className="border-r border-slate-700/50 p-4"></div>
        {weekDates.map((date, index) => {
          const shift = getShiftForDate(date);
          const today = isToday(date);

          return (
            <div
              key={index}
              onClick={() => onDateClick(date)}
              className={`text-center p-4 border-r border-slate-700/50 last:border-r-0 cursor-pointer hover:bg-slate-700/60 transition-all duration-200 ${
                today ? 'bg-blue-900/80' : ''
              }`}
            >
              <div className={`text-xl font-bold mb-1 ${today ? 'text-blue-300' : 'text-slate-300'}`}>
                {weekDays[index]}
              </div>
              <div className={`text-3xl font-bold mb-2 ${today ? 'text-blue-300' : 'text-white'}`}>
                {date.getDate()}
              </div>
              {shift && (
                <div className="mt-3">
                  <div
                    className={`text-base font-bold px-3 py-2 rounded-xl shadow-lg ${
                      shift.type === 'Mattino'
                        ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
                        : shift.type === 'Pomeriggio'
                        ? 'bg-gradient-to-br from-fuchsia-600 to-fuchsia-700 text-white'
                        : 'bg-gradient-to-br from-green-600 to-green-700 text-white'
                    }`}
                  >
                    {shift.type}
                  </div>
                  {shift.type !== 'Riposo' && (
                    <div className="text-base font-bold text-slate-200 mt-2 leading-tight">
                      {shift.startTime}
                      <br />
                      {shift.endTime}
                    </div>
                  )}
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
              <div className="border-r border-b border-slate-700/50 p-3 text-right text-xl font-bold text-slate-300 bg-slate-900/80 sticky left-0">
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
                    className="border-r border-b border-slate-700/50 p-3 min-h-[70px] bg-slate-800/60 hover:bg-slate-700/60 transition-colors"
                  >
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="text-base bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-xl mb-2 truncate shadow-md font-semibold"
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
