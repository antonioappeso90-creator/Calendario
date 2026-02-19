import { Shift, ShiftData } from './types';

const STORAGE_KEY = 'app_dashboard_shifts';

export const shiftDefaults = {
  Mattino: { startTime: '09:00', endTime: '14:00' },
  Pomeriggio: { startTime: '14:30', endTime: '20:00' },
  Riposo: { startTime: '', endTime: '' },
};

export const saveShifts = (shifts: ShiftData): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts));
  }
};

export const loadShifts = (): ShiftData => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
  }
  return {};
};

export const saveShift = (shift: Shift): void => {
  const shifts = loadShifts();
  shifts[shift.date] = shift;
  saveShifts(shifts);
};

export const getShift = (date: string): Shift | null => {
  const shifts = loadShifts();
  return shifts[date] || null;
};

export const deleteShift = (date: string): void => {
  const shifts = loadShifts();
  delete shifts[date];
  saveShifts(shifts);
};

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
