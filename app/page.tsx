"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signInWithCustomToken,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc,
  Firestore
} from 'firebase/firestore';

/**
 * CALENDARIO TITANIO V55 - PROTOCOLLO EXECUTIVE
 * 1. ZERO EVAL: Compatibile al 100% con Safari e CSP.
 * 2. PROXY INTERNO: Chiama /api/proxy-ical per bypassare i blocchi di Google.
 * 3. SIDEBAR FIXED: Larghezza 320px, link invisibili, solo nomi.
 * 4. CRUD TOTALE: Modifica ed elimina turni esistenti.
 * 5. MULTI-VISTA: Mese, Settimana e Giorno integrate.
 */

const Icons = {
  Logo: () => (
    <svg viewBox="0 0 100 100" width="32" height="32">
      <rect x="15" y="20" width="70" height="65" rx="12" fill="#0f172a" />
      <path d="M30 20 V10 M70 20 V10" stroke="#3b82f6" strokeWidth="10" strokeLinecap="round" />
      <rect x="35" y="45" width="30" height="5" rx="2" fill="#3b82f6" />
    </svg>
  ),
  Cloud: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>,
  Edit: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>,
  Sun: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41M2 12h2"/></svg>,
  Chevron: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  X: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  Refresh: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
};

const Utils = {
  isValidDate: (d: any) => d instanceof Date && !isNaN(d.getTime()),
  fmtDate: (d: any) => { 
    try { if (!Utils.isValidDate(d)) return ""; return d.toISOString().split('T')[0]; } catch { return ""; } 
  },
  getGlobal: (key: string) => { try { return typeof window !== 'undefined' ? (window as any)[key] : undefined; } catch { return undefined; } }
};

export default function App() {
  const isMounted = useRef(true);
  
  // --- DATABASE & AUTH ---
  const [user, setUser] = useState<User | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [appId, setAppId] = useState('');
  
  // --- DATA ---
  const [events, setEvents] = useState<any[]>([]);
  const [icalSources, setIcalSources] = useState<any[]>([]);
  const [icalEvents, setIcalEvents] = useState<any[]>([]);
  const [icalStatuses, setIcalStatuses] = useState<Record<string, string>>({});
  
  // --- UI ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'sync' | 'settings' | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(Utils.fmtDate(new Date()));
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [syncStatus, setSyncStatus] = useState<{type: 'success'|'error'|'loading', msg: string} | null>(null);

  const [newIcalName, setNewIcalName] = useState('');
  const [newIcalUrl, setNewIcalUrl] = useState('');

  // 1. BOOTSTRAP
  useEffect(() => {
    isMounted.current = true;
    try {
      const savedEvs = localStorage.getItem('titanio_v55_events');
      if (savedEvs) setEvents(JSON.parse(savedEvs));
      const savedIcal = localStorage.getItem('titanio_v55_ical');
      if (savedIcal) setIcalSources(JSON.parse(savedIcal));
    } catch (e) { console.warn("Storage Reset"); }

    const initFirebase = async () => {
      try {
        const configRaw = Utils.getGlobal('__firebase_config');
        const aid = Utils.getGlobal('__app_id') || 'titanio-v55';
        const token = Utils.getGlobal('__initial_auth_token');
        if (!configRaw) { setInitializing(false); return; }
        const config = typeof configRaw === 'object' ? configRaw : JSON.parse(configRaw);
        const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
        const auth = getAuth(app);
        const firestore = getFirestore(app);
        setAppId(aid);
        setDb(firestore);
        onAuthStateChanged(auth, (u) => { if (isMounted.current) { setUser(u); setInitializing(false); } });
        if (token) await signInWithCustomToken(auth, token).catch(() => signInAnonymously(auth));
        else await signInAnonymously(auth);
      } catch (e) { setInitializing(false); }
    };
    initFirebase();
    return () => { isMounted.current = false; };
  }, []);

  // 2. AUTO-SAVE
  useEffect(() => {
    if (!initializing) {
      localStorage.setItem('titanio_v55_events', JSON.stringify(events || []));
      localStorage.setItem('titanio_v55_ical', JSON.stringify(icalSources || []));
    }
  }, [events, icalSources, initializing]);

  // 3. iCAL CORE (Chiama il Proxy Interno)
  const fetchIcal = async () => {
    const active = (icalSources || []).filter(s => s?.url?.startsWith('http'));
    if (active.length === 0) { setIcalEvents([]); return; }

    let combined: any[] = [];
    for (const s of active) {
      setIcalStatuses(p => ({ ...p, [s.url]: 'Sincronizzazione...' }));
      try {
        const res = await fetch(`/api/proxy-ical?url=${encodeURIComponent(s.url)}&t=${Date.now()}`);
        if (!res.ok) throw new Error("Errore Google");
        const text = await res.text();

        if (text && text.includes("BEGIN:VCALENDAR")) {
          const unfolded = text.replace(/\r\n /g, '').replace(/\n /g, '');
          const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
          blocks.forEach((block: string) => {
            try {
              const summary = (block.match(/SUMMARY:(.*)/)?.[1] || "Turno").trim();
              const stMatch = block.match(/DTSTART[;:][^:]*:?([0-9T]+Z?)/);
              if (stMatch && stMatch[1]) {
                const st = stMatch[1];
                const d = new Date(parseInt(st.substr(0,4)), parseInt(st.substr(4,2))-1, parseInt(st.substr(6,2)));
                if (Utils.isValidDate(d)) {
                  combined.push({ 
                    id: `ical-${Math.random().toString(36).substr(2,9)}`, 
                    date: Utils.fmtDate(d), title: summary, startTime: "Google", 
                    color: 'bg-zinc-100 text-zinc-500 border-l-4 border-zinc-200 shadow-sm', isReadOnly: true 
                  });
                }
              }
            } catch (e) {}
          });
          setIcalStatuses(p => ({ ...p, [s.url]: 'Sincronizzato' }));
        } else { throw new Error("Formato Errato"); }
      } catch (err: any) {
        setIcalStatuses(p => ({ ...p, [s.url]: err.message || 'Errore' }));
      }
    }
    if (isMounted.current) setIcalEvents(combined);
  };

  useEffect(() => {
    fetchIcal();
  }, [icalSources]);

  // 4. ACTIONS
  const saveShift = (data: any) => {
    if (modalMode === 'edit' && editingEvent) {
      setEvents(events.map(e => e.id === editingEvent.id ? { ...e, ...data } : e));
    } else {
      setEvents([...events, { id: Math.random().toString(36).substr(2,9), ...data }]);
    }
    closeModal();
  };

  const deleteShift = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
    closeModal();
  };

  const closeModal = () => { setModalMode(null); setEditingEvent(null); };

  const navigateDate = (dir: number) => {
    const next = new Date(currentDate);
    if (view === 'month') next.setMonth(next.getMonth() + dir);
    else if (view === 'week') next.setDate(next.getDate() + (dir * 7));
    else next.setDate(next.getDate() + dir);
    setCurrentDate(next);
  };

  const allEvents = useMemo(() => [...events, ...icalEvents], [events, icalEvents]);

  if (initializing) return (
    <div className="h-screen flex items-center justify-center bg-slate-950 text-white font-black uppercase text-[10px] tracking-widest animate-pulse italic">
      Titanio Protocol V55: Booting...
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden relative text-left">
      <div className="absolute top-2 left-2 z-[100] bg-black text-white text-[8px] px-2 py-1 rounded font-black opacity-30 uppercase tracking-widest pointer-events-none italic">V55.0 - EXECUTIVE</div>

      {/* SIDEBAR LOCKED (w-80 = 320px) */}
      <aside className="w-80 shrink-0 bg-slate-950 text-white p-8 flex flex-col hidden lg:flex shadow-2xl border-r border-white/5 overflow-hidden">
        <div className="flex items-center gap-3 mb-12">
          <Icons.Logo />
          <h2 className="text-xl font-black uppercase tracking-tight italic text-left leading-none">Titanio<br/><span className="text-blue-500 text-sm">V55 Protocol</span></h2>
        </div>

        {/* METEO */}
        <div className="bg-white/5 rounded-2xl p-6 mb-10 border border-white/10 shadow-inner text-left">
           <div className="flex justify-between items-start mb-6">
              <div className="text-left">
                 <div className="text-[9px] font-black uppercase text-blue-400 tracking-widest mb-1 text-left">Ghedi, IT</div>
                 <div className="text-xs font-bold text-slate-400 italic text-left">Live Forecast</div>
              </div>
              <Icons.Sun />
           </div>
           <div className="text-5xl font-black tracking-tighter mb-4 text-white text-left">18<span className="text-blue-500">°</span></div>
           <div className="flex justify-between text-[10px] font-bold text-slate-600 border-t border-white/5 pt-4 text-left">
              <span>DOM <b className="text-white ml-1">16°</b></span>
              <span>LUN <b className="text-white ml-1">14°</b></span>
           </div>
        </div>

        {/* GOOGLE SOURCES */}
        <div className="flex-1 overflow-hidden flex flex-col text-left">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincro Google</h3>
              <div className="flex gap-3">
                 <button onClick={fetchIcal} className="text-slate-500 hover:text-white transition"><Icons.Refresh /></button>
                 <button onClick={() => setModalMode('settings')} className="text-blue-500 text-[10px] font-black uppercase hover:text-white transition">Gestisci</button>
              </div>
           </div>
           <div className="space-y-3 overflow-y-auto no-scrollbar">
              {(icalSources || []).map((s, i) => (
                <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between group overflow-hidden transition hover:bg-white/10">
                   <div className="flex flex-col truncate w-full pr-4 text-left">
                      <span className="text-[10px] font-black text-white truncate uppercase tracking-tighter text-left">{s?.name || 'Sorgente'}</span>
                      <span className={`text-[8px] font-bold uppercase tracking-widest mt-1 text-left ${icalStatuses[s?.url]?.includes('Errore') ? 'text-red-400' : 'text-slate-500'}`}>
                         {icalStatuses[s?.url] || 'Pronto'}
                      </span>
                   </div>
                   <button onClick={() => setIcalSources(icalSources.filter((_, idx) => idx !== i))} className="text-red-500 opacity-0 group-hover:opacity-100 transition p-1"><Icons.X /></button>
                </div>
              ))}
              {icalSources.length === 0 && <p className="text-[9px] text-slate-600 font-bold italic text-center py-6 opacity-30 uppercase tracking-widest">Nessun calendario</p>}
        </div>
        </div>
      </aside>

      {/* DASHBOARD PRINCIPALE */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white text-left">
        <header className="bg-white px-10 py-6 flex justify-between items-center z-10 border-b border-slate-200 text-left">
          <div className="flex items-center gap-8 text-left">
             <div className="flex flex-col min-w-[150px] text-left">
                <h1 className="text-3xl font-black tracking-tighter uppercase leading-none text-slate-900 italic text-left">
                  {currentDate.toLocaleString('it-IT', { month: 'long' })}
                </h1>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-left">{currentDate.getFullYear()}</span>
             </div>
             <div className="flex bg-slate-100 rounded-xl p-1">
                <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-white rounded-lg transition text-slate-500"><Icons.Chevron /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-5 py-1 font-black text-[10px] uppercase hover:bg-white rounded-lg transition text-slate-800">Oggi</button>
                <button onClick={() => navigateDate(1)} className="p-2 hover:bg-white rounded-lg transition text-slate-500 rotate-180"><Icons.Chevron /></button>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="bg-slate-100 p-1 rounded-xl flex shadow-inner">
                {['month', 'week', 'day'].map((v: any) => (
                  <button key={v} onClick={() => setView(v)} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{v}</button>
                ))}
             </div>
             <button onClick={() => setModalMode('sync')} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center hover:bg-slate-950 hover:text-white transition-all border border-slate-200 text-slate-500"><Icons.Cloud /></button>
             <button onClick={() => { setSelectedDate(Utils.fmtDate(new Date())); setModalMode('create'); }} className="bg-blue-600 text-white h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/10 hover:bg-blue-700 transition-all flex items-center gap-2"><Icons.Plus /> Turno</button>
          </div>
        </header>

        {/* CONTENUTO GRID DINAMICO */}
        <div className="flex-1 overflow-auto no-scrollbar p-6 bg-slate-50/50">
           {view === 'month' && (
             <div className="grid grid-cols-7 auto-rows-fr gap-2 min-h-full">
               {Array.from({ length: 42 }).map((_, i) => {
                 const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                 const first = start.getDay() === 0 ? 6 : start.getDay() - 1;
                 const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i - first + 1);
                 const ds = Utils.fmtDate(d);
                 const isToday = ds === Utils.fmtDate(new Date());
                 const isCurMonth = d.getMonth() === currentDate.getMonth();
                 const dayEvents = allEvents.filter(e => e.date === ds);

                 return (
                   <div key={i} onClick={() => { setSelectedDate(ds); setModalMode('create'); }} className={`bg-white rounded-2xl p-4 min-h-[120px] cursor-pointer hover:shadow-2xl border border-slate-200 flex flex-col transition-all ${!isCurMonth ? 'opacity-30 grayscale' : ''} ${isToday ? 'border-blue-500 border-2 shadow-lg shadow-blue-50' : ''}`}>
                      <span className={`text-[10px] font-black w-7 h-7 flex items-center justify-center rounded-lg mb-2 ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300'}`}>{d.getDate()}</span>
                      <div className="space-y-1 overflow-hidden">
                        {dayEvents.map(e => (
                          <div key={e.id} onClick={(ev) => { ev.stopPropagation(); if(!e.isReadOnly) { setEditingEvent(e); setModalMode('edit'); setSelectedDate(e.date); } }} className={`${e.color || 'bg-slate-50'} text-[8.5px] p-2.5 rounded-lg font-black border border-black/5 uppercase tracking-tighter truncate transition-all hover:scale-[1.03] shadow-sm text-left`}>
                            {e.startTime === 'Google' ? 'G • ' : e.startTime + ' • '}{e.title}
                          </div>
                        ))}
                      </div>
                   </div>
                 );
               })}
             </div>
           )}

           {view === 'week' && (
             <div className="grid grid-cols-7 gap-4 h-full">
               {Array.from({ length: 7 }).map((_, i) => {
                 const curr = new Date(currentDate);
                 const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1);
                 const d = new Date(curr.setDate(first + i));
                 const ds = Utils.fmtDate(d);
                 const isToday = ds === Utils.fmtDate(new Date());
                 const dayEvents = allEvents.filter(e => e.date === ds);

                 return (
                   <div key={i} className={`bg-white rounded-3xl p-6 flex flex-col border border-slate-200 h-full ${isToday ? 'border-blue-500 border-2 shadow-lg shadow-blue-50' : ''}`}>
                      <div className="text-center mb-10 text-slate-900">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">{d.toLocaleString('it-IT', { weekday: 'short' })}</div>
                        <div className={`text-4xl font-black text-center ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>{d.getDate()}</div>
                      </div>
                      <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar pr-1">
                         {dayEvents.map(e => (
                           <div key={e.id} onClick={() => { if(!e.isReadOnly) { setEditingEvent(e); setModalMode('edit'); setSelectedDate(e.date); } }} className={`${e.color || 'bg-slate-50'} p-4 rounded-xl border border-black/5 flex flex-col cursor-pointer transition-all hover:shadow-md text-left`}>
                              <span className="text-[10px] font-black uppercase mb-1 truncate text-left">{e.title}</span>
                              <span className="text-[8px] font-bold opacity-60 uppercase text-left">{e.startTime}</span>
                           </div>
                         ))}
                      </div>
                      <button onClick={() => { setSelectedDate(ds); setModalMode('create'); }} className="mt-4 w-full py-2 bg-slate-100 rounded-lg text-[10px] text-slate-400 hover:bg-blue-600 hover:text-white transition-all">+</button>
                   </div>
                 );
               })}
             </div>
           )}

           {view === 'day' && (
             <div className="max-w-2xl mx-auto h-full flex flex-col">
                <div className="bg-white rounded-[3rem] p-12 border border-slate-200 shadow-xl flex-1 flex flex-col text-center">
                   <div className="mb-10 pb-10 border-b border-slate-100 text-center">
                      <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2 italic text-center">{currentDate.toLocaleString('it-IT', { weekday: 'long' })}</h2>
                      <p className="text-blue-600 font-bold uppercase tracking-[0.3em] text-[12px] text-center">{currentDate.getDate()} {currentDate.toLocaleString('it-IT', { month: 'long' })}</p>
                   </div>
                   <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pr-2">
                      {allEvents.filter(e => e.date === Utils.fmtDate(currentDate)).map(e => (
                        <div key={e.id} onClick={() => { if(!e.isReadOnly) { setEditingEvent(e); setModalMode('edit'); setSelectedDate(e.date); } }} className={`${e.color || 'bg-slate-50'} p-6 rounded-2xl border border-black/5 flex justify-between items-center cursor-pointer transition-all hover:scale-[1.01] shadow-sm text-left`}>
                           <div className="text-left">
                              <div className="text-sm font-black uppercase tracking-tight text-left">{e.title}</div>
                              <div className="text-[10px] font-bold opacity-60 uppercase tracking-widest text-left">{e.startTime}</div>
                           </div>
                           {!e.isReadOnly && <Icons.Edit />}
                        </div>
                      ))}
                      <button onClick={() => { setSelectedDate(Utils.fmtDate(currentDate)); setModalMode('create'); }} className="w-full py-8 rounded-2xl border-2 border-dashed border-slate-200 text-slate-300 font-black uppercase text-[10px] tracking-[0.5em] hover:border-blue-500 hover:text-blue-500 transition-all">+ Aggiungi Turno</button>
                   </div>
                </div>
             </div>
           )}
        </div>
      </main>

      {/* MODALI (Tutti CSP-Safe) */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300 text-slate-900">
          <div className="bg-white rounded-[3rem] p-12 w-full max-sm shadow-2xl text-center border border-white/10">
             <div className="flex justify-between items-start mb-10 text-left">
                <div className="text-left">
                   <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 italic text-left">{modalMode === 'edit' ? 'Modifica' : 'Pianifica'}</h3>
                   <p className="text-blue-600 text-[10px] font-bold uppercase tracking-widest mt-2 italic text-left">{selectedDate}</p>
                </div>
                {modalMode === 'edit' && <button onClick={() => deleteShift(editingEvent.id)} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><Icons.Trash /></button>}
             </div>
             <div className="grid grid-cols-2 gap-4 mb-8">
                <button onClick={() => saveShift({date: selectedDate, title: 'Mattino', color: 'bg-orange-50 text-orange-700 border-orange-100', startTime: '09:00'})} className="bg-slate-50 p-8 rounded-3xl border-2 border-transparent hover:border-orange-200 transition-all flex flex-col items-center gap-1 shadow-sm">
                   <span className="text-3xl mb-1">🌅</span><span className="text-[10px] font-black uppercase">Mattino</span><span className="text-[9px] font-bold text-slate-400">09-14</span>
                </button>
                <button onClick={() => saveShift({date: selectedDate, title: 'Pomeriggio', color: 'bg-blue-50 text-blue-700 border-blue-100', startTime: '14:30'})} className="bg-slate-50 p-8 rounded-3xl border-2 border-transparent hover:border-blue-200 transition-all flex flex-col items-center gap-1 shadow-sm">
                   <span className="text-3xl mb-1">☀️</span><span className="text-[10px] font-black uppercase">Pomeriggio</span><span className="text-[9px] font-bold text-slate-400">14:30-19:30</span>
                </button>
             </div>
             <button onClick={() => saveShift({date: selectedDate, title: 'Riposo', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', startTime: 'Libero'})} className="w-full bg-slate-50 py-6 rounded-3xl border border-slate-100 mb-8 uppercase font-black text-[10px] tracking-widest hover:bg-emerald-50 transition-all text-slate-700 italic shadow-sm">🌴 Giorno Libero</button>
             <button onClick={closeModal} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 transition tracking-widest">Annulla</button>
          </div>
        </div>
      )}

      {modalMode === 'settings' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-8 text-slate-900 text-center">
          <div className="bg-white rounded-[4rem] p-16 w-full max-w-md shadow-2xl text-center border border-white/20">
            <h3 className="text-3xl font-black uppercase mb-12 tracking-tighter italic text-center">Google <span className="text-blue-600">Sync</span></h3>
            <div className="space-y-6 text-center">
               <input value={newIcalName} onChange={e => setNewIcalName(e.target.value)} placeholder="NOME CALENDARIO" className="w-full bg-slate-50 p-6 rounded-2xl font-black text-[11px] outline-none border border-slate-100 focus:border-blue-500 text-center uppercase shadow-inner tracking-widest text-slate-900" />
               <input value={newIcalUrl} onChange={e => setNewIcalUrl(e.target.value)} placeholder="LINK .ICS (SEGRETO)" className="w-full bg-slate-50 p-6 rounded-2xl font-black text-[11px] outline-none border border-slate-100 focus:border-blue-500 text-center text-slate-900 shadow-inner" />
               <button onClick={() => { if (!newIcalUrl) return; setIcalSources([...(icalSources || []), { name: newIcalName, url: newIcalUrl }]); setNewIcalName(''); setNewIcalUrl(''); setModalMode(null); }} className="w-full bg-slate-950 text-white py-8 rounded-[2rem] font-black uppercase text-[12px] hover:bg-black transition-all shadow-xl tracking-widest mt-6 italic">Connetti</button>
               <button onClick={closeModal} className="w-full text-[11px] font-black uppercase text-slate-400 tracking-[0.5em] pt-8 hover:text-slate-950 transition text-center">Indietro</button>
            </div>
          </div>
        </div>
      )}

      {modalMode === 'sync' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-6 text-center text-slate-900">
          <div className="bg-white rounded-[4rem] p-16 w-full max-w-md shadow-2xl border border-white/20 text-center">
             <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-10 scale-125 shadow-sm"><Icons.Cloud /></div>
             <h3 className="text-3xl font-black uppercase mb-4 tracking-tighter italic text-center text-slate-900">Sincro <span className="text-blue-600">Cloud</span></h3>
             <p className="text-slate-400 text-[10px] mb-12 font-bold uppercase tracking-[0.2em] px-10 leading-relaxed opacity-60 italic text-center">Sincronizzazione tramite Firestore per la gestione multi-dispositivo dei turni.</p>
             
             {syncStatus && <div className="mb-4 text-[10px] font-black text-blue-500 animate-pulse uppercase tracking-widest">{syncStatus.msg}</div>}

             <div className="space-y-4 text-center">
                <button onClick={async () => {
                   if (!user || !db || !appId) return;
                   setSyncStatus({type:'loading', msg: 'Invio...'});
                   try {
                     await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shifts', 'global'), { events, icalSources, updatedAt: Date.now() });
                     setSyncStatus({type:'success', msg: 'Dati Caricati'});
                     setTimeout(() => setSyncStatus(null), 2000);
                   } catch { setSyncStatus({type:'error', msg: 'Fallimento'}); }
                }} className="w-full py-8 bg-slate-950 text-white rounded-[2.5rem] flex items-center justify-center gap-4 font-black text-[12px] uppercase tracking-widest shadow-2xl hover:scale-[1.02] transition-all">Invia al Cloud</button>
                <button onClick={async () => {
                   if (!user || !db || !appId) return;
                   setSyncStatus({type:'loading', msg: 'Download...'});
                   try {
                     const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shifts', 'global'));
                     if (snap.exists()) {
                       const d = snap.data();
                       setEvents(Array.isArray(d.events) ? d.events : []);
                       setIcalSources(Array.isArray(d.icalSources) ? d.icalSources : []);
                       setSyncStatus({type:'success', msg: 'Dati Ricevuti'});
                       setTimeout(() => setSyncStatus(null), 2000);
                     }
                   } catch { setSyncStatus({type:'error', msg: 'Fallimento'}); }
                }} className="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] flex items-center justify-center gap-4 font-black text-[12px] uppercase tracking-widest shadow-2xl hover:scale-[1.02] transition-all">Ricevi dal Cloud</button>
                <button onClick={closeModal} className="w-full text-[11px] font-black uppercase text-slate-400 tracking-[0.4em] pt-12 hover:text-slate-900 transition text-center">Chiudi</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
