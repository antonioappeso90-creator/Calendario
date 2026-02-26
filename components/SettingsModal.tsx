'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (urls: string[]) => void;
}

export default function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [urls, setUrls] = useState<string[]>(['']);

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const stored = localStorage.getItem('ical_urls');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUrls(parsed.length > 0 ? parsed : ['']);
        } catch {
          setUrls(['']);
        }
      }
    }
  }, [isOpen]);

  const addUrlField = () => {
    setUrls([...urls, '']);
  };

  const removeUrlField = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls.length > 0 ? newUrls : ['']);
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleSave = () => {
    const filteredUrls = urls.filter((url) => url.trim() !== '');
    localStorage.setItem('ical_urls', JSON.stringify(filteredUrls));
    onSave(filteredUrls);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-8">
      <div className="glass-effect rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-700/30">
        <div className="sticky top-0 bg-gradient-to-r from-slate-800/95 to-slate-900/95 backdrop-blur-md p-8 border-b border-slate-700/50 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Calendar Settings</h2>
            <p className="text-slate-300 text-xl mt-2">
              Add your Google Calendar iCal URLs
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-700/80 hover:bg-slate-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg hover:scale-105"
            aria-label="Close modal"
          >
            <X size={28} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1">
          <div className="space-y-5">
            {urls.map((url, index) => (
              <div key={index} className="flex gap-4">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updateUrl(index, e.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  className="flex-1 bg-slate-800/80 text-white text-xl px-6 py-4 rounded-2xl border-2 border-slate-700/50 focus:border-blue-500 focus:outline-none transition-colors shadow-md"
                />
                {urls.length > 1 && (
                  <button
                    onClick={() => removeUrlField(index)}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-4 rounded-2xl text-xl font-bold transition-all duration-200 shadow-lg"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addUrlField}
            className="mt-6 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white px-8 py-4 rounded-2xl text-xl font-bold transition-all duration-200 shadow-lg"
          >
            + Add Another URL
          </button>
        </div>

        <div className="p-8 border-t border-slate-700/50 flex gap-6 justify-end bg-gradient-to-r from-slate-800/95 to-slate-900/95 rounded-b-3xl">
          <button
            onClick={onClose}
            className="bg-slate-700/80 hover:bg-slate-600 text-white px-10 py-4 rounded-2xl text-2xl font-bold transition-all duration-200 shadow-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-10 py-4 rounded-2xl text-2xl font-bold transition-all duration-200 shadow-xl"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
