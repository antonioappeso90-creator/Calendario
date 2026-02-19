'use client';

import { useState, useEffect } from 'react';
import WeatherSidebar from '@/components/WeatherSidebar';
import SettingsModal from '@/components/SettingsModal';
import MonthView from '@/components/MonthView';
import WeekView from '@/components/WeekView';
import DayView from '@/components/DayView';
import { CalendarEvent } from '@/lib/types';

type ViewType = 'month' | 'week' | 'day';

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadCalendarEvents();
  }, []);

  const loadCalendarEvents = async () => {
    try {
      const storedUrls = localStorage.getItem('ical_urls');
      if (!storedUrls) return;

      const urls = JSON.parse(storedUrls);
      if (urls.length === 0) return;

      const response = await fetch('/api/proxy-ical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });

      if (response.ok) {
        const data = await response.json();
        const parsedEvents: CalendarEvent[] = data.events.map((e: {
          id: string;
          title: string;
          start: string;
          end: string;
          allDay?: boolean;
          source?: string;
        }) => ({
          ...e,
          start: new Date(e.start),
          end: new Date(e.end),
        }));
        setEvents(parsedEvents);
      }
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    }
  };

  const handleSettingsSave = (urls: string[]) => {
    loadCalendarEvents();
  };

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    setView('day');
  };

  const handleShiftUpdate = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const getHeaderText = () => {
    if (view === 'month') {
      return currentDate.toLocaleDateString('it-IT', { year: 'numeric', month: 'long' });
    } else if (view === 'week') {
      const curr = new Date(currentDate);
      let day = curr.getDay();
      day = day === 0 ? 6 : day - 1;
      const monday = new Date(curr);
      monday.setDate(curr.getDate() - day);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return `${monday.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
      })} - ${sunday.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}`;
    } else {
      return currentDate.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-bold text-white">Calendar Dashboard</h1>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg text-lg font-semibold transition-colors"
          >
            Settings
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleToday}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-semibold transition-colors"
          >
            Today
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              className="bg-slate-700 hover:bg-slate-600 text-white w-12 h-12 rounded-lg text-2xl font-bold transition-colors"
            >
              ‹
            </button>
            <div className="text-xl font-bold text-white min-w-[300px] text-center capitalize">
              {getHeaderText()}
            </div>
            <button
              onClick={handleNext}
              className="bg-slate-700 hover:bg-slate-600 text-white w-12 h-12 rounded-lg text-2xl font-bold transition-colors"
            >
              ›
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setView('month')}
              className={`px-6 py-3 rounded-lg text-lg font-semibold transition-colors ${
                view === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-6 py-3 rounded-lg text-lg font-semibold transition-colors ${
                view === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('day')}
              className={`px-6 py-3 rounded-lg text-lg font-semibold transition-colors ${
                view === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Day
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <WeatherSidebar />

        <main className="flex-1 overflow-hidden" key={refreshKey}>
          {view === 'month' && (
            <MonthView currentDate={currentDate} events={events} onDateClick={handleDateClick} />
          )}
          {view === 'week' && (
            <WeekView currentDate={currentDate} events={events} onDateClick={handleDateClick} />
          )}
          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              events={events}
              onShiftUpdate={handleShiftUpdate}
            />
          )}
        </main>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSettingsSave}
      />
    </div>
  );
}
