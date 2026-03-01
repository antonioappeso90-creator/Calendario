"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signInWithCustomToken,
  User,
  Auth,
  Unsubscribe
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc,
  Firestore
} from 'firebase/firestore';

/**
 * CALENDARIO APPESO - ARCHITETTURA TITANIO V12.2 (DEFINITIVA)
 * MENTORE DOCET: 
 * Se vedi ancora il vecchio layout, hai ignorato l'ordine di cancellare index.html!
 * Questa versione ha la label "V12.2 - LIVE" in alto a sinistra.
 */

const Icons = {
  Logo: () => (
    <svg viewBox="0 0 100 100" width="40" height="40">
      <rect x="15" y="20" width="70" height="65" rx="15" fill="white" stroke="#1e293b" strokeWidth="4" />
      <path d="M15 38 L85 38" stroke="#1e293b" strokeWidth="3" />
      <circle cx="35" cy="55" r="5" fill="#3b82f6" /><circle cx="50" cy="55" r="5" fill="#f59e0b" /><circle cx="65" cy="55" r="5" fill="#10b981" />
      <path d="M30 20 V10 M70 20 V10" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
    </svg>
  ),
  X: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  Loading: () => <svg className="animate-spin text-blue-500" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
  Error: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6"/></svg>,
  ChevronLeft: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
  ChevronRight: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
};

const Utils = {
  fmtDate: (d: Date) => { try { return d.toISOString().split('T')[0]; } catch { return ""; } },
  startOfWeek: (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [fb, setFb] = useState<{ auth: Auth; db: Firestore; appId: string } | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [icalSources, setIcalSources] = useState<any[]>([]);
  const [icalEvents, setIcalEvents] = useState<any[]>([]);
  const [icalStatuses, setIcalStatuses] = useState<Record<string, 'loading' | 'success' | 'error'>>({});
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(Utils.fmtDate(new Date()));
  const [initializing, setInitializing] = useState(true);

  const [title, setTitle] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('14:00');

  useEffect(() => {
    const init = async () => {
      if (typeof window === 'undefined') return;
      try {
        const configStr = (window as any).__firebase_config;
        if (!configStr) throw new Error();
        const app = getApps().length === 0 ? initializeApp(JSON.parse(configStr)) : getApps()[0];
        const auth = getAuth(app);
        const db = getFirestore(app);
        const aid = ((window as any).__app_id || 'family-calendar').replace(/\//g, '_');
        await signInAnonymously(auth);
        setFb({ auth, db, appId: aid });
        onAuthStateChanged(auth, setUser);
      } catch (e) { console.warn("Offline Mode"); } 
      finally { setInitializing(false); }
    };
    init();
  }, []);

  useEffect(() => {
    if (!user || !fb) return;
    const docRef = doc(fb.db, 'artifacts', fb.appId, 'users', user.uid, 'data', 'config');
    return onSnapshot(docRef, snap => {
      if (snap.exists()) {
        const data = snap.data();
        setEvents(data.events || []);
        setIcalSources(data.icalSources || []);
      }
    });
  }, [user, fb]);

  const addShift = async () => {
    if (!title || !selectedDate || !user || !fb) return;
    const next = [...events, { id: Date.now().toString(), date: selectedDate, title, startTime: start, endTime: end, color: 'bg-blue-600 text-white' }];
    setEvents(next);
    await setDoc(doc(fb.db, 'artifacts', fb.appId, 'users', user.uid, 'data', 'config'), { events: next, icalSources });
    setIsModalOpen(false);
    setTitle('');
  };

  if (initializing) return (
    <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">
      Sincronizzazione...
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans text-slate-900 overflow-hidden relative">
      <div className="absolute top-2 left-2 z-[100] bg-black text-white text-[8px] px-2 py-1 rounded font-black opacity-30 pointer-events-none">
        V12.2 - LIVE
      </div>

      <aside className="w-80 bg-slate-900 text-white p-10 flex flex-col hidden lg:flex shadow-2xl z-20">
        <div className="flex items-center gap-4 mb-12">
          <Icons.Logo /><h2 className="text-xl font-black uppercase tracking-tighter leading-none">Calendario<br/><span className="text-blue-500">Appeso</span></h2>
        </div>
        <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 mb-10 text-center">
           <div className="text-4xl font-black text-blue-400">18°</div>
           <div className="text-[10px] font-black uppercase text-slate-500">Ghedi, IT</div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center z-10 shadow-sm">
          <h1 className="text-2xl font-black tracking-tighter uppercase">{currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}</h1>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 transition-all">Nuovo Turno</button>
        </header>

        <div className="flex-1 overflow-auto bg-white">
           <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-[1px] min-h-full">
             {Array.from({ length: 42 }).map((_, i) => {
               const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
               const firstDay = start.getDay() === 0 ? 6 : start.getDay() - 1;
               const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i - firstDay + 1);
               const ds = Utils.fmtDate(d);
               const dayEvs = events.filter(e => e.date === ds);
               const isToday = ds === Utils.fmtDate(new Date());

               return (
                 <div key={i} onClick={() => { setSelectedDate(ds); setIsModalOpen(true); }} className={`bg-white p-4 min-h-[140px] cursor-pointer hover:bg-slate-50 transition-all ${isToday ? 'ring-2 ring-inset ring-blue-500 z-10' : ''}`}>
                    <span className={`text-xs font-black w-8 h-8 flex items-center justify-center rounded-xl mb-3 ${isToday ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300'}`}>{d.getDate()}</span>
                    <div className="space-y-1">
                      {dayEvs.map(e => (
                        <div key={e.id} className="bg-blue-600 text-white text-[9px] p-2 rounded-xl font-black truncate shadow-sm">{e.startTime} {e.title}</div>
                      ))}
                    </div>
                 </div>
               );
             })}
           </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl">
             <h3 className="text-2xl font-black uppercase mb-8">Turno del <span className="text-blue-600">{selectedDate}</span></h3>
             <div className="space-y-6">
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Esempio: Mattino..." className="w-full bg-slate-50 p-5 rounded-2xl font-black text-sm outline-none border border-slate-100" />
                <div className="flex gap-4">
                   <input type="time" value={start} onChange={e => setStart(e.target.value)} className="flex-1 bg-slate-50 p-4 rounded-xl font-black text-center" />
                   <input type="time" value={end} onChange={e => setEnd(e.target.value)} className="flex-1 bg-slate-50 p-4 rounded-xl font-black text-center" />
                </div>
                <button onClick={addShift} className="w-full bg-blue-600 py-6 rounded-[2rem] text-white font-black uppercase tracking-widest text-xs shadow-xl hover:bg-blue-700 transition-all">Salva</button>
                <button onClick={() => setIsModalOpen(false)} className="w-full text-[10px] font-black uppercase text-slate-400">Annulla</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
