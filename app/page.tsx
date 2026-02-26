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
      <header className="bg-gradient-to-r from-slate-900/95 to-slate-800/95 border-b border-slate-700/50 p-6 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">Calendar Dashboard</h1>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white px-8 py-4 rounded-2xl text-xl font-bold transition-all duration-200 shadow-lg"
          >
            Settings
          </button>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={handleToday}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-2xl text-xl font-bold transition-all duration-200 shadow-lg"
          >
            Today
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevious}
              className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white w-14 h-14 rounded-2xl text-3xl font-bold transition-all duration-200 shadow-lg flex items-center justify-center"
            >
              ‹
            </button>
            <div className="text-2xl font-bold text-white min-w-[350px] text-center capitalize tracking-tight">
              {getHeaderText()}
            </div>
            <button
              onClick={handleNext}
              className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white w-14 h-14 rounded-2xl text-3xl font-bold transition-all duration-200 shadow-lg flex items-center justify-center"
            >
              ›
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setView('month')}
              className={`px-8 py-4 rounded-2xl text-xl font-bold transition-all duration-200 shadow-lg ${
                view === 'month'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                  : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600/60'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-8 py-4 rounded-2xl text-xl font-bold transition-all duration-200 shadow-lg ${
                view === 'week'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                  : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600/60'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('day')}
              className={`px-8 py-4 rounded-2xl text-xl font-bold transition-all duration-200 shadow-lg ${
                view === 'day'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                  : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600/60'
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
