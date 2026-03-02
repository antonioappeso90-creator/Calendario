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
 * CALENDARIO TITANIO V58 - SHARP EXECUTIVE
 * MENTORE DOCET: 
 * 1. SPACE MAXIMIZATION: Ridotti i gap e i padding per mostrare più testo.
 * 2. MODERN GEOMETRY: Arrotondamenti ridotti (xl/2xl) per un look più "Pro".
 * 3. HIGH DENSITY: I turni occupano meno spazio verticale ma mantengono leggibilità.
 * 4. LEGACY REMOVAL: Pulizia totale di ogni residuo grafico inutile.
 */

const Icons = {
  Logo: () => (
    <svg viewBox="0 0 100 100" width="28" height="28">
      <rect x="10" y="10" width="80" height="80" rx="4" fill="#0f172a" />
      <path d="M30 10 V5 M70 10 V5" stroke="#3b82f6" strokeWidth="8" strokeLinecap="square" />
      <path d="M30 40 H70 M30 60 H50" stroke="#3b82f6" strokeWidth="4" strokeLinecap="square" />
    </svg>
  ),
  Cloud: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>,
  Sun: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41M2 12h2"/></svg>,
  Chevron: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>,
  X: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  Refresh: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
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
  
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [appId, setAppId] = useState('');
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

  // 1. BOOT
  useEffect(() => {
    isMounted.current = true;
    try {
      const sEvs = localStorage.getItem('titanio_v58_events');
      if (sEvs) setEvents(Array.isArray(JSON.parse(sEvs)) ? JSON.parse(sEvs) : []);
      const sIcal = localStorage.getItem('titanio_v58_ical');
      if (sIcal) setIcalSources(Array.isArray(JSON.parse(sIcal)) ? JSON.parse(sIcal) : []);
    } catch (e) { console.warn("Storage reset."); }

    const init = async () => {
      try {
        const configRaw = Utils.getGlobal('__firebase_config');
        const aid = Utils.getGlobal('__app_id') || 'titanio-v58';
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
    init();
    return () => { isMounted.current = false; };
  }, []);

  // 2. SAVE
  useEffect(() => {
    if (!initializing) {
      localStorage.setItem('titanio_v58_events', JSON.stringify(events || []));
      localStorage.setItem('titanio_v58_ical', JSON.stringify(icalSources || []));
    }
  }, [events, icalSources, initializing]);

  // 3. iCAL ENGINE
  const fetchIcal = async () => {
    const active = (icalSources || []).filter(s => s?.url?.startsWith('http'));
    if (active.length === 0) { setIcalEvents([]); return; }
    for (const s of active) {
      setIcalStatuses(p => ({ ...p, [s.url]: 'Sincronizzazione...' }));
      try {
        const res = await fetch(`/api/proxy-ical?url=${encodeURIComponent(s.url)}&t=${Date.now()}`);
        if (!res.ok) throw new Error(`Codice ${res.status}`);
        const text = await res.text();
        if (text.includes("BEGIN:VCALENDAR")) {
          const blocks = text.replace(/\r\n /g, '').split('BEGIN:VEVENT').slice(1);
          const combined = blocks.map(block => {
            const summary = (block.match(/SUMMARY:(.*)/)?.[1] || "Turno").trim();
            const st = block.match(/DTSTART[;:][^:]*:?([0-9T]+Z?)/)?.[1];
            if (st && st.length >= 8) {
              const d = new Date(parseInt(st.substr(0,4)), parseInt(st.substr(4,2))-1, parseInt(st.substr(6,2)));
              return { id: `ical-${Math.random()}`, date: Utils.fmtDate(d), title: summary, startTime: "G", color: 'bg-zinc-50 text-zinc-400 border-zinc-200', isReadOnly: true };
            }
            return null;
          }).filter(Boolean);
          setIcalEvents(combined);
          setIcalStatuses(p => ({ ...p, [s.url]: 'Sincronizzato' }));
        }
      } catch (e: any) { setIcalStatuses(p => ({ ...p, [s.url]: e.message })); }
    }
  };

  useEffect(() => { fetchIcal(); }, [icalSources]);

  const allEvents = useMemo(() => [...(events || []), ...(icalEvents || [])], [events, icalEvents]);

  const saveShift = (data: any) => {
    if (modalMode === 'edit' && editingEvent) setEvents(events.map(e => e.id === editingEvent.id ? { ...e, ...data } : e));
    else setEvents([...events, { id: Math.random().toString(36).substr(2,9), ...data }]);
    setModalMode(null); setEditingEvent(null);
  };

  if (initializing) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white font-black text-[10px] tracking-[0.3em] animate-pulse italic">TITANIO EXECUTIVE V58</div>;

  return (
    <div className="flex h-screen w-full bg-white font-sans text-slate-900 overflow-hidden relative selection:bg-blue-100">
      <div className="absolute top-2 left-2 z-[100] bg-black text-white text-[7px] px-2 py-0.5 rounded font-black opacity-20 uppercase tracking-widest pointer-events-none italic">SHARP EXECUTIVE V58</div>

      {/* SIDEBAR SHARP */}
      <aside className="w-80 shrink-0 bg-slate-950 text-white p-6 flex flex-col hidden lg:flex shadow-2xl z-20 overflow-hidden border-r border-white/5">
        <div className="flex items-center gap-3 mb-10">
          <Icons.Logo />
          <h2 className="text-lg font-black uppercase tracking-tight italic leading-none">Titanio<br/><span className="text-blue-500 text-xs">Architectural</span></h2>
        </div>

        {/* WIDGET METEO SNEAKY */}
        <div className="bg-white/[0.03] rounded-2xl p-5 mb-8 border border-white/5 text-left">
           <div className="flex justify-between items-start mb-4">
              <div className="text-left">
                 <div className="text-[8px] font-black uppercase text-blue-500 tracking-widest mb-1">Status: Operational</div>
                 <div className="text-xs font-bold text-slate-500 italic">Ghedi Feed</div>
              </div>
              <Icons.Sun />
           </div>
           <div className="text-4xl font-black tracking-tighter mb-4 text-white">18<span className="text-blue-500 font-light">°</span></div>
           <div className="flex justify-between text-[9px] font-black text-slate-600 border-t border-white/5 pt-3 uppercase tracking-tighter">
              <span>Dom <b className="text-white ml-1 font-bold">16°</b></span>
              <span>Lun <b className="text-white ml-1 font-bold">14°</b></span>
           </div>
        </div>

        {/* SOURCES */}
        <div className="flex-1 overflow-hidden flex flex-col text-left">
           <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Data Streams</h3>
              <div className="flex gap-2">
                 <button onClick={fetchIcal} className="text-slate-600 hover:text-white transition"><Icons.Refresh /></button>
                 <button onClick={() => setModalMode('settings')} className="text-blue-500 text-[9px] font-black uppercase tracking-widest">Add</button>
              </div>
           </div>
           <div className="space-y-2 overflow-y-auto no-scrollbar">
              {(icalSources || []).map((s, i) => (
                <div key={i} className="bg-white/[0.02] p-3 rounded-xl border border-white/5 flex items-center justify-between group transition hover:bg-white/[0.05]">
                   <div className="flex flex-col truncate w-full pr-4 text-left">
                      <span className="text-[10px] font-black text-slate-200 truncate uppercase tracking-tighter">{s?.name || 'Calendario'}</span>
                      <span className="text-[7px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">{icalStatuses[s?.url] || 'Online'}</span>
                   </div>
                   <button onClick={() => setIcalSources(icalSources.filter((_, idx) => idx !== i))} className="text-red-500 opacity-0 group-hover:opacity-100 transition p-1"><Icons.X /></button>
                </div>
              ))}
           </div>
        </div>
      </aside>

      {/* DASHBOARD */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
        <header className="bg-white px-8 py-4 flex justify-between items-center z-10 border-b border-slate-100">
          <div className="flex items-center gap-6">
             <div className="flex flex-col min-w-[140px] text-left">
                <h1 className="text-2xl font-black tracking-tighter uppercase leading-none text-slate-900 italic">{currentDate.toLocaleString('it-IT', { month: 'long' })}</h1>
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">{currentDate.getFullYear()}</span>
             </div>
             <div className="flex bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth()-1); setCurrentDate(d); }} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition text-slate-400"><Icons.Chevron /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1 font-black text-[9px] uppercase hover:bg-white hover:shadow-sm rounded-md transition">Oggi</button>
                <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth()+1); setCurrentDate(d); }} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition text-slate-400 rotate-180"><Icons.Chevron /></button>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="bg-slate-50 p-0.5 rounded-lg flex border border-slate-100">
                {['month', 'week', 'day'].map((v: any) => (
                  <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{v}</button>
                ))}
             </div>
             <button onClick={() => setModalMode('sync')} className="w-9 h-9 bg-white border border-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-950 hover:text-white transition-all shadow-sm"><Icons.Cloud /></button>
             <button onClick={() => { setSelectedDate(Utils.fmtDate(new Date())); setModalMode('create'); }} className="bg-blue-600 text-white h-9 px-5 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2 italic"><Icons.Plus /> Inserisci</button>
          </div>
        </header>

        {/* GRID VIEW - RECOVERED SPACE */}
        <div className="flex-1 overflow-auto no-scrollbar bg-slate-50/30 p-1">
           {view === 'month' && (
             <div className="grid grid-cols-7 gap-1 min-h-full auto-rows-fr">
               {Array.from({ length: 42 }).map((_, i) => {
                 const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                 const first = start.getDay() === 0 ? 6 : start.getDay() - 1;
                 const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i - first + 1);
                 const ds = Utils.fmtDate(d);
                 const isToday = ds === Utils.fmtDate(new Date());
                 const isCurMonth = d.getMonth() === currentDate.getMonth();
                 const dayEvents = allEvents.filter(e => e.date === ds);

                 return (
                   <div key={i} onClick={() => { setSelectedDate(ds); setModalMode('create'); }} className={`bg-white p-2 min-h-[100px] cursor-pointer hover:bg-blue-50/30 border border-slate-100 transition-all flex flex-col ${!isCurMonth ? 'opacity-20 grayscale' : ''} ${isToday ? 'border-blue-500 border-2 z-10' : ''}`}>
                      <div className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded mb-2 ${isToday ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-300'}`}>{d.getDate()}</div>
                      <div className="space-y-0.5 overflow-hidden flex-1">
                        {dayEvents.map(e => (
                          <div key={e.id} onClick={(ev) => { ev.stopPropagation(); if(!e.isReadOnly) { setEditingEvent(e); setModalMode('edit'); setSelectedDate(e.date); } }} className={`${e.color || 'bg-slate-50'} text-[8px] px-1.5 py-1 rounded border border-black/[0.03] font-black uppercase tracking-tighter truncate transition-all hover:translate-x-0.5 shadow-sm text-left leading-none`}>
                            {e.startTime === 'G' ? 'G • ' : ''}{e.title}
                          </div>
                        ))}
                      </div>
                   </div>
                 );
               })}
             </div>
           )}

           {view === 'week' && (
             <div className="grid grid-cols-7 gap-1 h-full">
               {Array.from({ length: 7 }).map((_, i) => {
                 const curr = new Date(currentDate);
                 const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1);
                 const d = new Date(curr.setDate(first + i));
                 const ds = Utils.fmtDate(d);
                 const isToday = ds === Utils.fmtDate(new Date());
                 const dayEvents = allEvents.filter(e => e.date === ds);

                 return (
                   <div key={i} className={`bg-white p-4 flex flex-col border border-slate-100 h-full ${isToday ? 'border-blue-500 border-2 z-10 shadow-xl' : ''}`}>
                      <div className="text-center mb-6">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{d.toLocaleString('it-IT', { weekday: 'short' })}</div>
                        <div className={`text-2xl font-black ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>{d.getDate()}</div>
                      </div>
                      <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar text-left">
                         {dayEvents.map(e => (
                           <div key={e.id} onClick={() => { if(!e.isReadOnly) { setEditingEvent(e); setModalMode('edit'); setSelectedDate(e.date); } }} className={`${e.color || 'bg-slate-50'} p-3 rounded-lg border border-black/5 flex flex-col cursor-pointer transition-all hover:bg-opacity-80`}>
                              <span className="text-[9px] font-black uppercase mb-0.5 truncate">{e.title}</span>
                              <span className="text-[7px] font-bold opacity-50 uppercase tracking-widest">{e.startTime}</span>
                           </div>
                         ))}
                      </div>
                      <button onClick={() => { setSelectedDate(ds); setModalMode('create'); }} className="mt-4 w-full py-1.5 bg-slate-50 rounded text-[9px] text-slate-300 hover:text-blue-600 transition">+</button>
                   </div>
                 );
               })}
             </div>
           )}

           {view === 'day' && (
             <div className="max-w-xl mx-auto h-full flex flex-col py-6">
                <div className="bg-white rounded-2xl p-10 border border-slate-100 shadow-2xl flex-1 flex flex-col text-left">
                   <div className="mb-8 pb-8 border-b border-slate-100 text-left">
                      <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter leading-none mb-2 italic">{currentDate.toLocaleString('it-IT', { weekday: 'long' })}</h2>
                      <p className="text-blue-600 font-bold uppercase tracking-[0.4em] text-[10px]">{currentDate.getDate()} {currentDate.toLocaleString('it-IT', { month: 'long' })}</p>
                   </div>
                   <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
                      {allEvents.filter(e => e.date === Utils.fmtDate(currentDate)).map(e => (
                        <div key={e.id} onClick={() => { if(!e.isReadOnly) { setEditingEvent(e); setModalMode('edit'); setSelectedDate(e.date); } }} className={`${e.color || 'bg-slate-50'} p-6 rounded-xl border border-black/5 flex justify-between items-center cursor-pointer transition-all hover:scale-[1.01] shadow-sm`}>
                           <div>
                              <div className="text-sm font-black uppercase tracking-tight text-slate-900 leading-none mb-1">{e.title}</div>
                              <div className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{e.startTime === 'G' ? 'Google Calendar' : e.startTime}</div>
                           </div>
                           {!e.isReadOnly && <Icons.Trash />}
                        </div>
                      ))}
                      <button onClick={() => { setSelectedDate(Utils.fmtDate(currentDate)); setModalMode('create'); }} className="w-full py-6 rounded-xl border-2 border-dashed border-slate-100 text-slate-300 font-black uppercase text-[10px] tracking-[0.5em] hover:border-blue-500 hover:text-blue-500 transition-all">+ Add Turno</button>
                   </div>
                </div>
             </div>
           )}
        </div>
      </main>

      {/* MODALE CRUD SHARP */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-2xl p-10 w-full max-w-sm shadow-2xl border border-white/20">
             <div className="flex justify-between items-start mb-8 text-left">
                <div>
                   <h3 className="text-xl font-black uppercase tracking-tight text-slate-950 italic leading-none">{modalMode === 'edit' ? 'Modifica' : 'Nuovo Turno'}</h3>
                   <p className="text-blue-600 text-[8px] font-bold uppercase tracking-[0.2em] mt-2 italic">{selectedDate}</p>
                </div>
                {modalMode === 'edit' && <button onClick={() => { setEvents(events.filter(e => e.id !== editingEvent.id)); setModalMode(null); }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Icons.Trash /></button>}
             </div>
             
             <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={() => saveShift({date: selectedDate, title: 'Mattino', color: 'bg-orange-50 text-orange-600 border-orange-100', startTime: '09:00'})} className="bg-slate-50 p-6 rounded-xl border border-slate-100 hover:border-orange-500 transition-all flex flex-col items-center gap-1 shadow-sm group">
                   <span className="text-2xl group-hover:scale-110 transition">🌅</span><span className="text-[9px] font-black uppercase tracking-tighter">Mattino</span>
                </button>
                <button onClick={() => saveShift({date: selectedDate, title: 'Pomeriggio', color: 'bg-blue-50 text-blue-600 border-blue-100', startTime: '14:30'})} className="bg-slate-50 p-6 rounded-xl border border-slate-100 hover:border-blue-500 transition-all flex flex-col items-center gap-1 shadow-sm group">
                   <span className="text-2xl group-hover:scale-110 transition">☀️</span><span className="text-[9px] font-black uppercase tracking-tighter">Pomeriggio</span>
                </button>
             </div>
             <button onClick={() => saveShift({date: selectedDate, title: 'Riposo', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', startTime: 'Libero'})} className="w-full bg-slate-50 py-5 rounded-xl border border-slate-100 mb-8 uppercase font-black text-[9px] tracking-[0.3em] hover:bg-emerald-50 text-slate-600 italic">🌴 Giorno Libero</button>
             <button onClick={() => { setModalMode(null); setEditingEvent(null); }} className="w-full text-[8px] font-black uppercase text-slate-400 hover:text-slate-900 transition tracking-[0.5em]">Annulla</button>
          </div>
        </div>
      )}

      {/* SYNC PANEL */}
      {modalMode === 'sync' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg z-[100] flex items-center justify-center p-6 text-center text-slate-900">
          <div className="bg-white rounded-2xl p-12 w-full max-w-sm shadow-2xl border border-white/20">
             <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-sm"><Icons.Cloud /></div>
             <h3 className="text-2xl font-black uppercase mb-3 tracking-tight italic">Cloud <span className="text-blue-600">Vault</span></h3>
             <p className="text-slate-400 text-[8px] mb-10 font-bold uppercase tracking-widest px-6 leading-relaxed opacity-60 italic">Sincronizzazione manuale obbligatoria per garantire l'integrità dei dati tra Mac e Mobile.</p>
             <div className="space-y-3">
                <button onClick={async () => {
                   if (!user || !db || !appId) return;
                   setSyncStatus({type:'loading', msg: 'Invio...'});
                   try {
                     await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shifts', 'global'), { events, icalSources, updatedAt: Date.now() });
                     setSyncStatus({type:'success', msg: 'OK'});
                     setTimeout(() => setSyncStatus(null), 2000);
                   } catch { setSyncStatus({type:'error', msg: 'Error'}); }
                }} className="w-full py-6 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all">Upload</button>
                <button onClick={async () => {
                   if (!user || !db || !appId) return;
                   setSyncStatus({type:'loading', msg: 'Download...'});
                   try {
                     const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shifts', 'global'));
                     if (snap.exists()) {
                       const d = snap.data();
                       setEvents(Array.isArray(d.events) ? d.events : []);
                       setIcalSources(Array.isArray(d.icalSources) ? d.icalSources : []);
                       setSyncStatus({type:'success', msg: 'OK'});
                       setTimeout(() => setSyncStatus(null), 2000);
                     }
                   } catch { setSyncStatus({type:'error', msg: 'Error'}); }
                }} className="w-full py-6 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all">Download</button>
                {syncStatus && <div className="pt-4 text-[8px] font-black text-blue-500 uppercase tracking-widest animate-pulse">{syncStatus.msg}</div>}
                <button onClick={() => setModalMode(null)} className="w-full text-[9px] font-black uppercase text-slate-400 tracking-[0.4em] pt-8 hover:text-slate-900 transition">Chiudi</button>
             </div>
          </div>
        </div>
      )}

      {/* SETTINGS iCAL */}
      {modalMode === 'settings' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg z-[100] flex items-center justify-center p-8 text-slate-900">
          <div className="bg-white rounded-2xl p-10 w-full max-w-sm shadow-2xl border border-white/20">
            <h3 className="text-2xl font-black uppercase mb-10 tracking-tight italic text-center text-slate-900">Google <span className="text-blue-600">Feed</span></h3>
            <div className="space-y-4">
               <input value={newIcalName} onChange={e => setNewIcalName(e.target.value)} placeholder="NOME CALENDARIO" className="w-full bg-slate-50 p-5 rounded-xl font-black text-[10px] outline-none border border-slate-100 focus:border-blue-500 text-center uppercase tracking-widest text-slate-900" />
               <input value={newIcalUrl} onChange={e => setNewIcalUrl(e.target.value)} placeholder="LINK .ICS (INDIRIZZO SEGRETO)" className="w-full bg-slate-50 p-5 rounded-xl font-black text-[10px] outline-none border border-slate-100 focus:border-blue-500 text-center text-slate-900" />
               <button onClick={() => { if (!newIcalUrl) return; setIcalSources([...(icalSources || []), { name: newIcalName, url: newIcalUrl }]); setNewIcalName(''); setNewIcalUrl(''); setModalMode(null); }} className="w-full bg-slate-950 text-white py-6 rounded-xl font-black uppercase text-[10px] hover:bg-black transition-all shadow-xl tracking-widest mt-4 italic">Connetti</button>
               <button onClick={() => setModalMode(null)} className="w-full text-[9px] font-black uppercase text-slate-400 tracking-[0.5em] pt-6 hover:text-slate-950 transition text-center">Indietro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
