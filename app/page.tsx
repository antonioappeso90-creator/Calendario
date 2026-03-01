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
 * CALENDARIO APPESO - ARCHITETTURA TITANIO V12 (STABILITÀ ASSOLUTA)
 * - Supporto LocalStorage fallback (se Firebase manca).
 * - Parser iCal completo con Line Unfolding (per Google/GitHub).
 * - Vista Mese/Settimana reattiva.
 */

// --- ICONE ---
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

// --- UTILITY ---
const Utils = {
  fmtDate: (d: Date) => { try { return d.toISOString().split('T')[0]; } catch { return ""; } },
  getSafeTimeParts: (t: string): [number, number] => {
    if (!t || !t.includes(':')) return [0, 0];
    const p = t.split(':');
    return [parseInt(p[0]) || 0, parseInt(p[1]) || 0];
  },
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
  const [view, setView] = useState<'month' | 'week'>('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(Utils.fmtDate(new Date()));
  const [initializing, setInitializing] = useState(true);

  const [title, setTitle] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('14:00');
  const [color, setColor] = useState('bg-blue-600 text-white');

  const lastUrlsRef = useRef("");

  // 1. Inizializzazione (Firebase + LocalStorage Fallback)
  useEffect(() => {
    const init = async () => {
      if (typeof window === 'undefined') return;
      
      // Caricamento LocalStorage immediato (per non mostrare vuoto)
      const savedEvts = localStorage.getItem('backup_events');
      if (savedEvts) setEvents(JSON.parse(savedEvts));
      const savedSrcs = localStorage.getItem('backup_sources');
      if (savedSrcs) setIcalSources(JSON.parse(savedSrcs));

      try {
        const configStr = (window as any).__firebase_config;
        if (!configStr) { setInitializing(false); return; }

        const app: FirebaseApp = getApps().length === 0 ? initializeApp(JSON.parse(configStr)) : getApps()[0];
        const auth = getAuth(app);
        const db = getFirestore(app);
        const aid = ((window as any).__app_id || 'family-calendar').replace(/\//g, '_');
        const token = (window as any).__initial_auth_token;

        if (token) await signInWithCustomToken(auth, token);
        else await signInAnonymously(auth);

        setFb({ auth, db, appId: aid });
        onAuthStateChanged(auth, setUser);
      } catch (e) { console.warn("Firebase non disponibile, uso LocalStorage."); } 
      finally { setInitializing(false); }
    };
    init();
  }, []);

  // 2. Sync Cloud
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

  const save = useCallback(async (evs: any[], srcs: any[]) => {
    // Salva sempre localmente
    localStorage.setItem('backup_events', JSON.stringify(evs));
    localStorage.setItem('backup_sources', JSON.stringify(srcs));
    
    if (!user || !fb) return;
    try {
      await setDoc(doc(fb.db, 'artifacts', fb.appId, 'users', user.uid, 'data', 'config'), {
        events: evs, icalSources: srcs, updated: Date.now()
      });
    } catch (e) { console.error(e); }
  }, [user, fb]);

  // 3. iCal Parser (Line Unfolding)
  useEffect(() => {
    const sources = (icalSources || []).filter(s => s?.url?.startsWith('http'));
    const hash = sources.map(s => s.url).sort().join('|');
    if (!hash || hash === lastUrlsRef.current) return;

    let isMounted = true;
    const fetchAll = async () => {
      const allResults: any[] = [];
      for (const s of sources) {
        if (!isMounted) break;
        setIcalStatuses(p => ({ ...p, [s.url]: 'loading' }));
        try {
          const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(s.url)}&_=${Date.now()}`);
          const json = await res.json();
          const text = json.contents;
          if (text?.includes("BEGIN:VCALENDAR")) {
            const unfolded = text.replace(/\r\n /g, '').replace(/\n /g, '');
            const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
            blocks.forEach((block: string) => {
              const summary = block.match(/SUMMARY:(.*)/)?.[1]?.trim() || "Evento iCal";
              const st = block.match(/DTSTART[:;](?:.*:)?([0-9T]+Z?)/)?.[1];
              if (st) {
                const d = new Date(parseInt(st.substr(0,4)), parseInt(st.substr(4,2))-1, parseInt(st.substr(6,2)), parseInt(st.substr(9,2))||0, parseInt(st.substr(11,2))||0);
                if (!isNaN(d.getTime())) {
                  allResults.push({ id: `ical-${Math.random()}`, date: Utils.fmtDate(d), title: summary, startTime: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`, endTime: `${String(d.getHours()+1).padStart(2,'0')}:00`, color: 'bg-slate-200 text-slate-500', isReadOnly: true });
                }
              }
            });
            if (isMounted) setIcalStatuses(p => ({ ...p, [s.url]: 'success' }));
          } else throw new Error();
        } catch { if (isMounted) setIcalStatuses(p => ({ ...p, [s.url]: 'error' })); }
      }
      if (isMounted) { setIcalEvents(allResults); lastUrlsRef.current = hash; }
    };
    fetchAll();
    return () => { isMounted = false; };
  }, [icalSources]);

  const allEvents = useMemo(() => [...events, ...icalEvents].filter(e => e?.date), [events, icalEvents]);

  const addShift = () => {
    if (!title || !selectedDate) return;
    const next = [...events, { id: Date.now().toString(), date: selectedDate, title, startTime: start, endTime: end, color }];
    setEvents(next);
    save(next, icalSources);
    setIsModalOpen(false);
    setTitle('');
  };

  if (initializing) return (
    <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
      Sincronizzazione...
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans text-slate-900 overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `.no-scrollbar::-webkit-scrollbar { display: none; } .grid-row { height: 75px; border-bottom: 1px solid #f1f5f9; }` }} />
      
      {/* SIDEBAR */}
      <aside className="w-80 bg-slate-900 text-white p-10 flex flex-col hidden lg:flex shadow-2xl z-20">
        <div className="flex items-center gap-4 mb-12">
          <Icons.Logo /><h2 className="text-xl font-black uppercase tracking-tighter leading-none">Calendario<br/><span className="text-blue-500">Appeso</span></h2>
        </div>
        <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 mb-10">
           <div className="text-4xl font-black text-blue-400 mb-2">18°</div>
           <div className="text-[10px] font-black uppercase text-slate-500">Ghedi, Lombardia</div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Sync iCal</h3>
           <div className="space-y-4">
              {icalSources.map((s, i) => (
                <div key={i} className="group relative bg-white/5 p-5 rounded-[1.5rem] border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black truncate w-40">{s.name}</span>
                    {icalStatuses[s.url] === 'loading' ? <Icons.Loading /> : icalStatuses[s.url] === 'success' ? <Icons.Check /> : <Icons.Error />}
                  </div>
                  <button onClick={() => { const n = icalSources.filter((_, idx) => idx !== i); setIcalSources(n); save(events, n); }} className="absolute -right-2 -top-2 bg-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition shadow-xl"><Icons.X /></button>
                </div>
              ))}
              <button onClick={() => setIsSettingsOpen(true)} className="w-full py-4 rounded-[1.5rem] border-2 border-dashed border-white/10 text-slate-600 text-[10px] font-black uppercase hover:border-blue-500 transition-all">+ Sorgente</button>
           </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-black tracking-tighter uppercase">{currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}</h1>
            <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner">
              <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth()-1); setCurrentDate(d); }} className="p-2"><Icons.ChevronLeft /></button>
              <button onClick={() => setCurrentDate(new Date())} className="px-4 text-[10px] font-black uppercase text-slate-400">Oggi</button>
              <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth()+1); setCurrentDate(d); }} className="p-2"><Icons.ChevronRight /></button>
            </div>
          </div>
          <div className="flex gap-4">
             <div className="bg-slate-100 p-1 rounded-lg flex">
                <button onClick={() => setView('month')} className={`px-4 py-2 rounded-md text-[10px] font-black ${view === 'month' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>MESE</button>
                <button onClick={() => setView('week')} className={`px-4 py-2 rounded-md text-[10px] font-black ${view === 'week' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>WEEK</button>
             </div>
             <button onClick={() => { setSelectedDate(Utils.fmtDate(new Date())); setIsModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">Nuovo Turno</button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-white no-scrollbar">
           {view === 'month' ? (
             <div className="grid grid-cols-7 auto-rows-fr bg-slate-100 gap-[1px]">
               {Array.from({ length: 42 }).map((_, i) => {
                 const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                 const firstDay = start.getDay() === 0 ? 6 : start.getDay() - 1;
                 const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i - firstDay + 1);
                 const ds = Utils.fmtDate(d);
                 const dayEvs = allEvents.filter(e => e.date === ds);
                 const isToday = ds === Utils.fmtDate(new Date());
                 return (
                   <div key={i} onClick={() => { setSelectedDate(ds); setIsModalOpen(true); }} className={`bg-white p-4 min-h-[140px] cursor-pointer ${isToday ? 'ring-2 ring-inset ring-blue-500 z-10' : 'hover:bg-slate-50'}`}>
                      <span className={`text-xs font-black w-8 h-8 flex items-center justify-center rounded-xl mb-3 ${isToday ? 'bg-blue-600 text-white' : 'text-slate-300'}`}>{d.getDate()}</span>
                      <div className="space-y-1">
                        {dayEvs.map(e => (
                          <div key={e.id} className={`${e.color} text-[9px] p-2 rounded-xl font-black truncate border border-black/5`}>{e.startTime} {e.title}</div>
                        ))}
                      </div>
                   </div>
                 );
               })}
             </div>
           ) : (
             <div className="p-10 text-center font-black uppercase text-slate-300 text-[10px] tracking-widest">Vista settimanale in arrivo...</div>
           )}
        </div>
      </main>

      {/* MODALE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
             <h3 className="text-2xl font-black uppercase mb-8">Pianifica <span className="text-blue-600">{selectedDate}</span></h3>
             <div className="space-y-6">
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Esempio: Mattino..." className="w-full bg-slate-50 p-5 rounded-2xl font-black text-sm outline-none" />
                <div className="flex gap-4">
                   <input type="time" value={start} onChange={e => setStart(e.target.value)} className="flex-1 bg-slate-50 p-4 rounded-xl font-black text-center" />
                   <input type="time" value={end} onChange={e => setEnd(e.target.value)} className="flex-1 bg-slate-50 p-4 rounded-xl font-black text-center" />
                </div>
                <button onClick={addShift} className="w-full bg-blue-600 py-6 rounded-[2rem] text-white font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Salva</button>
                <button onClick={() => setIsModalOpen(false)} className="w-full text-[10px] font-black uppercase text-slate-400">Annulla</button>
             </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-12 w-full max-w-md shadow-2xl">
            <h3 className="text-3xl font-black uppercase mb-10 tracking-tighter">Sincronizza iCal</h3>
            <input id="ical-url" placeholder="https://link-calendario.ics" className="w-full bg-slate-50 p-6 rounded-[1.5rem] font-bold text-xs mb-6 outline-none" />
            <button onClick={() => {
              const url = (document.getElementById('ical-url') as HTMLInputElement).value;
              if (!url) return;
              const next = [...icalSources, { url, name: 'Google Sync' }];
              setIcalSources(next); save(events, next); setIsSettingsOpen(false);
            }} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl">Attiva</button>
            <button onClick={() => setIsSettingsOpen(false)} className="w-full mt-4 text-[10px] font-black uppercase text-slate-400">Chiudi</button>
          </div>
        </div>
      )}
    </div>
  );
}
