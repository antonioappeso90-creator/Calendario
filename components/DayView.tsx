'use client';

import { useState, useEffect } from 'react';
import { CalendarEvent, Shift, ShiftType } from '@/lib/types';
import { formatDate, getShift, saveShift, deleteShift, shiftDefaults } from '@/lib/shiftStorage';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onShiftUpdate: () => void;
}

export default function DayView({ currentDate, events, onShiftUpdate }: DayViewProps) {
  const [shift, setShift] = useState<Shift | null>(null);
  const [selectedType, setSelectedType] = useState<ShiftType | ''>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    loadShiftData();
  }, [currentDate]);

  const loadShiftData = () => {
    const dateStr = formatDate(currentDate);
    const existingShift = getShift(dateStr);

    if (existingShift) {
      setShift(existingShift);
      setSelectedType(existingShift.type);
      setStartTime(existingShift.startTime);
      setEndTime(existingShift.endTime);
    } else {
      setShift(null);
      setSelectedType('');
      setStartTime('');
      setEndTime('');
    }
  };

  const handleShiftTypeChange = (type: ShiftType) => {
    setSelectedType(type);
    const defaults = shiftDefaults[type];
    setStartTime(defaults.startTime);
    setEndTime(defaults.endTime);
  };

  const handleSaveShift = () => {
    if (!selectedType) return;

    const newShift: Shift = {
      date: formatDate(currentDate),
      type: selectedType,
      startTime,
      endTime,
    };

    saveShift(newShift);
    setShift(newShift);
    onShiftUpdate();
  };

  const handleDeleteShift = () => {
    deleteShift(formatDate(currentDate));
    setShift(null);
    setSelectedType('');
    setStartTime('');
    setEndTime('');
    onShiftUpdate();
  };

  const dayEvents = events.filter((event) => {
    const eventDate = new Date(event.start);
    return (
      eventDate.getFullYear() === currentDate.getFullYear() &&
      eventDate.getMonth() === currentDate.getMonth() &&
      eventDate.getDate() === currentDate.getDate()
    );
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForHour = (hour: number) => {
    return dayEvents.filter((event) => {
      const eventHour = new Date(event.start).getHours();
      return eventHour === hour;
    });
  };

  const isToday = () => {
    const today = new Date();
    return (
      currentDate.getFullYear() === today.getFullYear() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getDate() === today.getDate()
    );
  };

  const dateStr = currentDate.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col h-full">
      <div className="bg-slate-800 border-b border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-white capitalize">{dateStr}</h2>
          {isToday() && (
            <span className="bg-blue-600 text-white px-4 py-2 rounded-lg text-lg font-semibold">
              Today
            </span>
          )}
        </div>

        <div className="bg-slate-900 rounded-lg p-6">
          <h3 className="text-2xl font-bold text-white mb-4">Shift Management</h3>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => handleShiftTypeChange('Mattino')}
              className={`py-4 px-6 rounded-lg text-xl font-semibold transition-colors ${
                selectedType === 'Mattino'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Mattino
            </button>
            <button
              onClick={() => handleShiftTypeChange('Pomeriggio')}
              className={`py-4 px-6 rounded-lg text-xl font-semibold transition-colors ${
                selectedType === 'Pomeriggio'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Pomeriggio
            </button>
            <button
              onClick={() => handleShiftTypeChange('Riposo')}
              className={`py-4 px-6 rounded-lg text-xl font-semibold transition-colors ${
                selectedType === 'Riposo'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Riposo
            </button>
          </div>

          {selectedType && selectedType !== 'Riposo' && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-lg font-semibold text-slate-300 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-800 text-white text-xl px-4 py-3 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-lg font-semibold text-slate-300 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-800 text-white text-xl px-4 py-3 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleSaveShift}
              disabled={!selectedType}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg text-xl font-semibold transition-colors"
            >
              Save Shift
            </button>
            {shift && (
              <button
                onClick={handleDeleteShift}
                className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg text-xl font-semibold transition-colors"
              >
                Delete Shift
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-slate-700">
          {hours.map((hour) => {
            const hourEvents = getEventsForHour(hour);

            return (
              <div key={hour} className="flex bg-slate-800 hover:bg-slate-700 transition-colors">
                <div className="w-32 p-4 text-right border-r border-slate-700 bg-slate-900">
                  <div className="text-xl font-semibold text-slate-400">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                </div>
                <div className="flex-1 p-4 min-h-[80px]">
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-2"
                    >
                      <div className="text-lg font-semibold">{event.title}</div>
                      <div className="text-sm">
                        {new Date(event.start).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        -{' '}
                        {new Date(event.end).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
