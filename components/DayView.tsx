'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    setIsModalOpen(false);
    onShiftUpdate();
  };

  const handleDeleteShift = () => {
    deleteShift(formatDate(currentDate));
    setShift(null);
    setSelectedType('');
    setStartTime('');
    setEndTime('');
    setIsModalOpen(false);
    onShiftUpdate();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    loadShiftData();
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
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
      <div className="bg-gradient-to-r from-slate-800/95 to-slate-900/95 border-b border-slate-700/50 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-4xl font-bold text-white capitalize tracking-tight">{dateStr}</h2>
          <div className="flex items-center gap-4">
            {isToday() && (
              <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-2xl text-xl font-bold shadow-lg">
                Today
              </span>
            )}
            <button
              onClick={handleOpenModal}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-8 py-3 rounded-2xl text-xl font-bold shadow-lg transition-all duration-200"
            >
              {shift ? 'Edit Shift' : 'Add Shift'}
            </button>
          </div>
        </div>

        {shift && (
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-6 shadow-xl border border-slate-700/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-white mb-2">Current Shift</div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-2xl font-bold px-6 py-3 rounded-xl ${
                      shift.type === 'Mattino'
                        ? 'bg-amber-600 text-white'
                        : shift.type === 'Pomeriggio'
                        ? 'bg-fuchsia-600 text-white'
                        : 'bg-green-600 text-white'
                    }`}
                  >
                    {shift.type}
                  </span>
                  {shift.type !== 'Riposo' && (
                    <span className="text-2xl font-bold text-slate-200">
                      {shift.startTime} - {shift.endTime}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-8">
          <div className="glass-effect rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700/30">
            <div className="sticky top-0 bg-gradient-to-r from-slate-800/95 to-slate-900/95 backdrop-blur-md p-8 border-b border-slate-700/50 flex items-center justify-between rounded-t-3xl">
              <h3 className="text-3xl font-bold text-white tracking-tight">Shift Assignment</h3>
              <button
                onClick={handleCloseModal}
                className="bg-slate-700/80 hover:bg-slate-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg hover:scale-105"
                aria-label="Close modal"
              >
                <X size={28} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-3 gap-6 mb-8">
                <button
                  onClick={() => handleShiftTypeChange('Mattino')}
                  className={`py-6 px-8 rounded-2xl text-2xl font-bold transition-all duration-200 shadow-lg hover:scale-105 ${
                    selectedType === 'Mattino'
                      ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-amber-600/50'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600/60'
                  }`}
                >
                  Mattino
                </button>
                <button
                  onClick={() => handleShiftTypeChange('Pomeriggio')}
                  className={`py-6 px-8 rounded-2xl text-2xl font-bold transition-all duration-200 shadow-lg hover:scale-105 ${
                    selectedType === 'Pomeriggio'
                      ? 'bg-gradient-to-br from-fuchsia-600 to-fuchsia-700 text-white shadow-fuchsia-600/50'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600/60'
                  }`}
                >
                  Pomeriggio
                </button>
                <button
                  onClick={() => handleShiftTypeChange('Riposo')}
                  className={`py-6 px-8 rounded-2xl text-2xl font-bold transition-all duration-200 shadow-lg hover:scale-105 ${
                    selectedType === 'Riposo'
                      ? 'bg-gradient-to-br from-green-600 to-green-700 text-white shadow-green-600/50'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600/60'
                  }`}
                >
                  Riposo
                </button>
              </div>

              {selectedType && selectedType !== 'Riposo' && (
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-xl font-bold text-slate-200 mb-3">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-slate-800/80 text-white text-2xl px-6 py-4 rounded-xl border-2 border-slate-700/50 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xl font-bold text-slate-200 mb-3">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-slate-800/80 text-white text-2xl px-6 py-4 rounded-xl border-2 border-slate-700/50 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-6">
                <button
                  onClick={handleSaveShift}
                  disabled={!selectedType}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white py-5 px-8 rounded-2xl text-2xl font-bold transition-all duration-200 shadow-xl disabled:shadow-none"
                >
                  Save Shift
                </button>
                {shift && (
                  <button
                    onClick={handleDeleteShift}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-5 px-8 rounded-2xl text-2xl font-bold transition-all duration-200 shadow-xl"
                  >
                    Delete Shift
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-slate-700/50">
          {hours.map((hour) => {
            const hourEvents = getEventsForHour(hour);

            return (
              <div key={hour} className="flex bg-slate-800/60 hover:bg-slate-700/60 transition-colors">
                <div className="w-40 p-5 text-right border-r border-slate-700/50 bg-slate-900/80">
                  <div className="text-2xl font-bold text-slate-300">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                </div>
                <div className="flex-1 p-5 min-h-[90px]">
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-2xl mb-3 shadow-lg"
                    >
                      <div className="text-xl font-bold">{event.title}</div>
                      <div className="text-lg mt-1 opacity-90">
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
