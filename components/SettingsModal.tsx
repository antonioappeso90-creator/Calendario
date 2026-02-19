'use client';

import { useState, useEffect } from 'react';

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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-3xl font-bold text-white">Calendar Settings</h2>
          <p className="text-slate-400 text-lg mt-2">
            Add your Google Calendar iCal URLs
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            {urls.map((url, index) => (
              <div key={index} className="flex gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updateUrl(index, e.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  className="flex-1 bg-slate-900 text-white text-lg px-4 py-3 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
                />
                {urls.length > 1 && (
                  <button
                    onClick={() => removeUrlField(index)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg text-lg font-semibold transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addUrlField}
            className="mt-4 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg text-lg font-semibold transition-colors"
          >
            + Add Another URL
          </button>
        </div>

        <div className="p-6 border-t border-slate-700 flex gap-4 justify-end">
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-lg text-xl font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-xl font-semibold transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
