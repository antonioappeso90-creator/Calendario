'use client';

import { useState, useEffect } from 'react';
import { WeatherData } from '@/lib/types';

export default function WeatherSidebar() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const API_KEY = '5iLVfHmdXhGler0R';

          try {
            const [currentRes, forecastRes] = await Promise.all([
              fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`
              ),
              fetch(
                `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`
              ),
            ]);

            if (currentRes.status === 401 || forecastRes.status === 401) {
              setError('Waiting for activation');
              setLoading(false);
              return;
            }

            if (!currentRes.ok || !forecastRes.ok) {
              throw new Error('Failed to fetch weather data');
            }

            const currentData = await currentRes.json();
            const forecastData = await forecastRes.json();

            const dailyForecasts = forecastData.list
              .filter((_: unknown, index: number) => index % 8 === 0)
              .slice(0, 5)
              .map((item: {
                dt_txt: string;
                main: { temp_max: number; temp_min: number };
                weather: Array<{ description: string; icon: string }>;
              }) => ({
                date: new Date(item.dt_txt).toLocaleDateString('it-IT', {
                  weekday: 'short',
                  day: 'numeric',
                }),
                temp_max: Math.round(item.main.temp_max),
                temp_min: Math.round(item.main.temp_min),
                description: item.weather[0].description,
                icon: item.weather[0].icon,
              }));

            setWeather({
              current: {
                temp: Math.round(currentData.main.temp),
                feels_like: Math.round(currentData.main.feels_like),
                humidity: currentData.main.humidity,
                description: currentData.weather[0].description,
                icon: currentData.weather[0].icon,
              },
              forecast: dailyForecasts,
            });
            setLoading(false);
          } catch (err) {
            if (err instanceof Error && err.message.includes('401')) {
              setError('Waiting for activation');
            } else {
              setError('Failed to load weather');
            }
            setLoading(false);
          }
        },
        () => {
          setError('Location access denied');
          setLoading(false);
        }
      );
    } catch {
      setError('Unable to fetch weather');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-96 glass-effect border-r border-slate-700/50 p-8 flex items-center justify-center">
        <div className="text-slate-300 text-xl font-medium">Loading weather...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-96 glass-effect border-r border-slate-700/50 p-8">
        <div className="text-amber-400 text-xl text-center font-medium">{error}</div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="w-96 glass-effect border-r border-slate-700/50 p-8 flex flex-col gap-6 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 shadow-2xl border border-slate-700/30">
        <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Current Weather</h2>
        <div className="flex items-center gap-6 mb-6">
          <img
            src={`https://openweathermap.org/img/wn/${weather.current.icon}@2x.png`}
            alt={weather.current.description}
            className="w-24 h-24 drop-shadow-lg"
          />
          <div>
            <div className="text-6xl font-bold text-white tracking-tight">
              {weather.current.temp}°C
            </div>
            <div className="text-xl text-slate-300 capitalize mt-1">
              {weather.current.description}
            </div>
          </div>
        </div>
        <div className="space-y-3 text-lg">
          <div className="flex justify-between text-slate-200 bg-slate-800/50 rounded-xl px-4 py-3">
            <span>Feels like:</span>
            <span className="font-semibold">{weather.current.feels_like}°C</span>
          </div>
          <div className="flex justify-between text-slate-200 bg-slate-800/50 rounded-xl px-4 py-3">
            <span>Humidity:</span>
            <span className="font-semibold">{weather.current.humidity}%</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 shadow-2xl border border-slate-700/30">
        <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">5-Day Forecast</h2>
        <div className="space-y-4">
          {weather.forecast.map((day, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-slate-800/60 rounded-xl hover:bg-slate-700/60 transition-all duration-200 border border-slate-700/20"
            >
              <div className="text-xl font-semibold text-white w-24">
                {day.date}
              </div>
              <img
                src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                alt={day.description}
                className="w-14 h-14 drop-shadow-lg"
              />
              <div className="flex gap-3 text-xl">
                <span className="text-red-400 font-bold">{day.temp_max}°</span>
                <span className="text-blue-400 font-bold">{day.temp_min}°</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
