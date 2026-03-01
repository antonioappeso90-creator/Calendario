"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signInWithCustomToken,
  User,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc,
  Firestore
} from 'firebase/firestore';

/**
 * CALENDARIO APPESO - ARCHITETTURA TITANIO V20.1 (STABILIZZATA)
 * MENTORE DOCET: 
 * - Preset aggiornati: Mattino (09-14), Pomeriggio (14.30-19.30), Riposo.
 * - Sincronizzazione multi-dispositivo tramite Firestore.
 * - Gestione Multi-Sorgente iCal con indicatori di stato.
 */

const Icons = {
  Logo: () => (
    <svg viewBox="0 0 100 100" width="32" height="32">
      <rect x="15" y="20" width="70" height="65" rx="15" fill="white" stroke="#3b82f6" strokeWidth="6" />
      <circle cx="35" cy="55" r="5" fill="#3b82f6" /><circle cx="50" cy="55" r="5" fill="#f59e0b" /><circle cx="65" cy="55" r="5" fill="#10b981" />
      <path d="M30 20 V10 M70 20 V10" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" />
    </svg>
  ),
  Check: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  Error: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6"/></svg>,
  Loading: () => <svg className="animate-spin text-blue-400" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
  Sun: () => <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m14.14-14.14l-1.41 1.41"/></svg>,
  X: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
};

const Utils = {
  fmtDate: (d: Date) => { try { return d.toISOString().split('T')[0]; } catch { return ""; } },
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [appId, setAppId] = useState('calendario-appeso-v20');
  
  const [events, setEvents] = useState<any[]>([]);
  const [icalSources, setIcalSources] = useState<any[]>([]);
  const [icalEvents, setIcalEvents] = useState<any[]>([]);
  const [icalStatuses, setIcalStatuses] = useState<Record<string, 'loading' | 'success' | 'error'>>({});
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(Utils.fmtDate(new Date()));
  const [initializing, setInitializing] = useState(true);

  // 1. Firebase Auth (Regola 3)
  useEffect(() => {
    const initAuth = async () => {
      if (typeof window === 'undefined') return;
      try {
        const configRaw = (window as any).__firebase_config;
        if (!configRaw) {
          console.warn("Configurazione Firebase non trovata.");
          setInitializing(false);
          return;
        }

        const firebaseConfig = JSON.parse(configRaw);
        const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        const firebaseAuth = getAuth(app);
        const firestore = getFirestore(app);
        
        // Sanificazione dell'appId per evitare errori di segmentazione nel path di Firestore (Regola 1)
        const aid = ((window as any).__app_id || 'family-calendar').replace(/\//g, '_');
        const token = (window as any).__initial_auth_token;

        if (token) {
          await signInWithCustomToken(firebaseAuth, token);
        } else {
          await signInAnonymously(firebaseAuth);
        }
        
        setDb(firestore);
        setAuth(firebaseAuth);
        setAppId(aid);

        const unsubscribe = onAuthStateChanged(firebaseAuth, (u) => {
          setUser(u);
          setInitializing(false);
        });

        return () => unsubscribe();
      } catch (e) { 
        console.error("Errore Inizializzazione Firebase:", e); 
        setInitializing(false);
      }
    };
    initAuth();
  }, []);

  // 2. Fetch Dati dal Cloud (Regola 1)
  useEffect(() => {
    if (!user || !db || !appId) return;
    
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'config');
      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setEvents(data.events || []);
          setIcalSources(data.icalSources || []);
        }
      }, (err) => {
        console.error("Errore Firestore onSnapshot:", err);
      });
      return () => unsub();
    } catch (err) {
      console.error("Errore setup listener Firestore:", err);
    }
  }, [user, db, appId]);

  // 3. Logica Sync iCal
  useEffect(() => {
    const sources = icalSources.filter(s => s?.url && s.url.startsWith('http'));
    if (sources.length === 0) {
      setIcalEvents([]);
      return;
    }

    const fetchAll = async () => {
      let combined: any[] = [];
      for (const s of sources) {
        setIcalStatuses(p => ({ ...p, [s.url]: 'loading' }));
        try {
          const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(s.url)}&_=${Date.now()}`);
          if (!res.ok) throw new Error();
          const json = await res.json();
          const text = json.contents;
          
          if (text && text.includes("BEGIN:VCALENDAR")) {
            const unfolded = text.replace(/\r\n /g, '').replace(/\n /g, '');
            const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
            blocks.forEach((block: string) => {
              const summary = block.match(/SUMMARY:(.*)/)?.[1]?.trim() || "Evento iCal";
              const st = block.match(/DTSTART[:;](?:.*:)?([0-9T]+Z?)/)?.[1];
              if (st) {
                const y = parseInt(st.substr(0,4));
                const m = parseInt(st.substr(4,2))-1;
                const d = parseInt(st.substr(6,2));
                const h = parseInt(st.substr(9,2)) || 0;
                const min = parseInt(st.substr(11,2)) || 0;
                const dateObj = new Date(y, m, d, h, min);
                if (!isNaN(dateObj.getTime())) {
                  combined.push({ 
                    id: `ical-${Math.random()}`, 
                    date: Utils.fmtDate(dateObj), 
                    title: summary, 
                    startTime: `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`, 
                    color: 'bg-slate-200 text-slate-600', 
                    isReadOnly: true 
                  });
                }
              }
            });
            setIcalStatuses(p => ({ ...p, [s.url]: 'success' }));
          }
        } catch (err) { 
          setIcalStatuses(p => ({ ...p, [s.url]: 'error' })); 
        }
      }
      setIcalEvents(combined);
    };
    fetchAll();
  }, [icalSources]);

  const saveToCloud = async (newEvents: any[], newSources: any[]) => {
    if (!user || !db) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'config'), {
        events: newEvents,
        icalSources: newSources,
        updatedAt: Date.now()
      });
    } catch (e) { 
      console.error("Errore salvataggio Cloud:", e); 
    }
  };

  const addShift = (preset: {title: string, start: string, end: string, color: string}) => {
    const next = [...events, { id: Math.random().toString(36).substr(2,9), date: selectedDate, ...preset }];
    setEvents(next);
    saveToCloud(next, icalSources);
    setIsModalOpen(false);
  };

  const allEvents = useMemo(() => [...events, ...icalEvents], [events, icalEvents]);

  if (initializing) return (
    <div className="h-screen flex items-center justify-center bg-slate-950 text-white font-black text-[10px] tracking-widest animate-pulse uppercase">
      Inizializzazione Sistema...
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      <div className="absolute top-2 left-2 z-[100] bg-black text-white text-[8px] px-2 py-1 rounded font-black opacity-30 pointer-events-none uppercase tracking-widest">
        V20.1 - TITANIO
      </div>

      {/* SIDEBAR */}
      <aside className="w-85 bg-slate-950 text-white p-8 flex flex-col hidden lg:flex shadow-2xl z-20 border-r border-white/5 no-scrollbar overflow-y-auto">
        <div className="flex items-center gap-3 mb-10">
          <Icons.Logo />
          <h2 className="text-xl font-black uppercase tracking-tighter leading-none">
            Calendario<br/><span className="text-blue-500">Appeso</span>
          </h2>
        </div>

        {/* METEO PREMIUM GLASSMORPISHM */}
        <div className="bg-slate-900/40 backdrop-blur-2xl rounded-[2.5rem] p-8 mb-10 border border-white/10 shadow-2xl relative overflow-hidden group">
           <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <div className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em] mb-1">Ghedi, IT</div>
                    <div className="text-sm font-bold text-slate-400">Parzialmente Sereno</div>
                 </div>
                 <div className="animate-bounce"><Icons.Sun /></div>
              </div>
              <div className="text-6xl font-black tracking-tighter mb-8 text-white">18<span className="text-blue-500">°</span></div>
              <div className="grid grid-cols-3 gap-2 pt-6 border-t border-white/5 text-center">
                 <div><div className="text-[9px] font-black text-slate-600 mb-1 uppercase tracking-tighter">DOM</div><div className="text-xs font-bold text-white">16°</div></div>
                 <div><div className="text-[9px] font-black text-slate-600 mb-1 uppercase tracking-tighter">LUN</div><div className="text-xs font-bold text-white">14°</div></div>
                 <div><div className="text-[9px] font-black text-slate-600 mb-1 uppercase tracking-tighter">MAR</div><div className="text-xs font-bold text-white">19°</div></div>
              </div>
           </div>
        </div>

        {/* LISTA SORGENTI ICAL */}
        <div className="flex-1">
           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 text-center">Sync iCal</h3>
           <div className="space-y-4">
              {icalSources.map((s, i) => (
                <div key={i} className="bg-white/5 p-5 rounded-[1.5rem] border border-white/5 flex items-center justify-between hover:bg-white/10 transition-all group relative">
                  <div className="flex flex-col truncate pr-4">
                    <span className="text-[11px] font-black text-white truncate">{s.name || 'Sorgente'}</span>
                    <span className="text-[8px] text-slate-600 truncate">{s.url}</span>
                  </div>
                  <div className="shrink-0">
                    {icalStatuses[s.url] === 'loading' ? <Icons.Loading /> : 
                     icalStatuses[s.url] === 'success' ? <Icons.Check /> : <Icons.Error />}
                  </div>
                  <button onClick={() => { const next = icalSources.filter((_, idx) => idx !== i); setIcalSources(next); saveToCloud(events, next); }} className="absolute -right-2 -top-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition shadow-xl scale-75">
                    <Icons.X />
                  </button>
                </div>
              ))}
              <button onClick={() => setIsSettingsOpen(true)} className="w-full py-5 rounded-[1.5rem] border-2 border-dashed border-white/10 text-slate-600 text-[10px] font-black uppercase hover:border-blue-500 hover:text-blue-400 transition-all">+ Sorgente</button>
           </div>
        </div>
      </aside>

      {/* MAIN VIEW */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
        <header className="bg-white border-b border-slate-200 px-10 py-10 flex justify-between items-center z-10 shadow-sm">
          <div className="flex flex-col">
             <h1 className="text-4xl font-black tracking-tighter uppercase leading-none mb-1 text-slate-900">
                {currentDate.toLocaleString('it-IT', { month: 'long' })}
             </h1>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em]">{currentDate.getFullYear()}</span>
          </div>
          <button onClick={() => { setSelectedDate(Utils.fmtDate(new Date())); setIsModalOpen(true); }} className="bg-blue-600 text-white px-10 py-5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2">
            <Icons.Plus /> Aggiungi Turno
          </button>
        </header>

        <div className="flex-1 overflow-auto no-scrollbar">
           <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-[1px] min-h-full">
             {Array.from({ length: 42 }).map((_, i) => {
               const startMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
               const firstDay = startMonth.getDay() === 0 ? 6 : startMonth.getDay() - 1;
               const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i - firstDay + 1);
               const ds = Utils.fmtDate(d);
               const dayEvs = allEvents.filter(e => e.date === ds);
               const isToday = ds === Utils.fmtDate(new Date());
               const isCurMonth = d.getMonth() === currentDate.getMonth();

               return (
                 <div key={i} onClick={() => { setSelectedDate(ds); setIsModalOpen(true); }} className={`bg-white p-6 min-h-[160px] cursor-pointer hover:bg-slate-50 transition-all ${!isCurMonth ? 'opacity-20' : ''} ${isToday ? 'ring-4 ring-inset ring-blue-500/20' : ''}`}>
                    <span className={`text-sm font-black w-10 h-10 flex items-center justify-center rounded-2xl mb-4 ${isToday ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-300'}`}>{d.getDate()}</span>
                    <div className="space-y-2">
                      {dayEvs.map(e => (
                        <div key={e.id} className={`${e.color} text-[9px] p-3 rounded-[1.2rem] font-black truncate shadow-sm border border-black/5 uppercase tracking-tighter group flex items-center justify-between`}>
                          <span>{e.startTime} • {e.title}</span>
                          {!e.isReadOnly && (
                            <button onClick={(ev) => { ev.stopPropagation(); const next = events.filter(evnt => evnt.id !== e.id); setEvents(next); saveToCloud(next, icalSources); }} className="opacity-0 group-hover:opacity-100 hover:scale-125 transition">
                              <Icons.X />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                 </div>
               );
             })}
           </div>
        </div>
      </main>

      {/* MODALE PRESETS RAPIDI AGGIORNATI */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-sm shadow-2xl animate-modal overflow-hidden">
             <h3 className="text-3xl font-black uppercase mb-10 tracking-tighter leading-tight text-center text-slate-900">
                Pianifica<br/><span className="text-blue-600 text-xl">{selectedDate}</span>
             </h3>
             
             <div className="space-y-4">
                <button onClick={() => addShift({title: 'Mattino', start: '09:00', end: '14:00', color: 'bg-orange-500 text-white'})} className="w-full bg-slate-50 hover:bg-orange-50 p-6 rounded-[2rem] flex items-center justify-between group transition-all border border-slate-100 hover:border-orange-200 shadow-sm">
                  <span className="text-xs font-black uppercase text-slate-700">🌅 Mattino</span>
                  <span className="text-[9px] font-bold text-slate-400">09 - 14</span>
                </button>
                <button onClick={() => addShift({title: 'Pomeriggio', start: '14:30', end: '19:30', color: 'bg-blue-600 text-white'})} className="w-full bg-slate-50 hover:bg-blue-50 p-6 rounded-[2rem] flex items-center justify-between group transition-all border border-slate-100 hover:border-blue-200 shadow-sm">
                  <span className="text-xs font-black uppercase text-slate-700">☀️ Pomeriggio</span>
                  <span className="text-[9px] font-bold text-slate-400">14:30 - 19:30</span>
                </button>
                <button onClick={() => addShift({title: 'Riposo', start: '00:00', end: '23:59', color: 'bg-emerald-500 text-white'})} className="w-full bg-slate-50 hover:bg-emerald-50 p-6 rounded-[2rem] flex items-center justify-between group transition-all border border-slate-100 hover:border-emerald-200 shadow-sm">
                  <span className="text-xs font-black uppercase text-slate-700">🌴 Riposo</span>
                  <span className="text-[9px] font-bold text-slate-400">Giorno Libero</span>
                </button>
                
                <div className="pt-8 mt-4 border-t border-slate-100 text-center">
                    <button onClick={() => setIsModalOpen(false)} className="text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-900 transition">Annulla</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MODALE SETTINGS ICAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-md shadow-2xl animate-modal">
            <h3 className="text-3xl font-black uppercase mb-10 tracking-tighter text-slate-900">Sync <span className="text-blue-600 text-xl">Cloud</span></h3>
            <div className="space-y-6 text-slate-900">
               <input id="ical-name" placeholder="Nome (es. Turni Lavoro)" className="w-full bg-slate-50 p-6 rounded-[1.5rem] font-black text-xs outline-none border border-slate-100 focus:border-blue-500 transition-all shadow-inner" />
               <input id="ical-url-in" placeholder="https://calendar.google.com/..." className="w-full bg-slate-50 p-6 rounded-[1.5rem] font-black text-xs outline-none border border-slate-100 focus:border-blue-500 transition-all shadow-inner" />
               <button onClick={() => {
                 const nameInput = document.getElementById('ical-name') as HTMLInputElement;
                 const urlInput = document.getElementById('ical-url-in') as HTMLInputElement;
                 if (!urlInput.value) return;
                 const next = [...icalSources, { name: nameInput.value, url: urlInput.value }];
                 setIcalSources(next);
                 saveToCloud(events, next);
                 setIsSettingsOpen(false);
               }} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-[10px] active:scale-95 hover:bg-black transition-all shadow-2xl">Connetti</button>
               <button onClick={() => setIsSettingsOpen(false)} className="w-full text-[10px] font-black uppercase text-slate-400 tracking-widest mt-4">Chiudi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
