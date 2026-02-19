export interface WeatherData {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    description: string;
    icon: string;
  };
  forecast: Array<{
    date: string;
    temp_max: number;
    temp_min: number;
    description: string;
    icon: string;
  }>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  source?: string;
}

export type ShiftType = 'Mattino' | 'Pomeriggio' | 'Riposo';

export interface Shift {
  date: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
}

export interface ShiftData {
  [date: string]: Shift;
}
