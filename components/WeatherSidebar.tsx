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
          const API_KEY = 'ff3b05a064a28614d6532fc36b8cfc50';

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
      <div className="w-80 bg-slate-800 border-r border-slate-700 p-6 flex items-center justify-center">
        <div className="text-slate-400 text-xl">Loading weather...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-80 bg-slate-800 border-r border-slate-700 p-6">
        <div className="text-amber-400 text-xl text-center">{error}</div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="w-80 bg-slate-800 border-r border-slate-700 p-6 flex flex-col gap-6 overflow-y-auto">
      <div className="bg-slate-900 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Current Weather</h2>
        <div className="flex items-center gap-4 mb-4">
          <img
            src={`https://openweathermap.org/img/wn/${weather.current.icon}@2x.png`}
            alt={weather.current.description}
            className="w-20 h-20"
          />
          <div>
            <div className="text-5xl font-bold text-white">
              {weather.current.temp}°C
            </div>
            <div className="text-lg text-slate-400 capitalize">
              {weather.current.description}
            </div>
          </div>
        </div>
        <div className="space-y-2 text-lg">
          <div className="flex justify-between text-slate-300">
            <span>Feels like:</span>
            <span className="font-semibold">{weather.current.feels_like}°C</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Humidity:</span>
            <span className="font-semibold">{weather.current.humidity}%</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">5-Day Forecast</h2>
        <div className="space-y-3">
          {weather.forecast.map((day, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
            >
              <div className="text-lg font-semibold text-white w-20">
                {day.date}
              </div>
              <img
                src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                alt={day.description}
                className="w-12 h-12"
              />
              <div className="flex gap-2 text-lg">
                <span className="text-red-400 font-semibold">{day.temp_max}°</span>
                <span className="text-blue-400 font-semibold">{day.temp_min}°</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
