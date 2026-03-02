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
 * CALENDARIO TITANIO V66 - MULTICHROME COMMAND
 * MENTORE DOCET: 
 * 1. ICAL COLORING: Ogni sorgente ha un'identità cromatica per distinguere i flussi.
 * 2. FULL VIEW RESTORATION: Settimana e Giorno ripristinati con estetica Sharp.
 * 3. HIGH-DENSITY GRID: Spazio massimizzato in ogni vista.
 * 4. OFFLINE BACKUP: Mantenuto il protocollo di export/import JSON per sicurezza.
 */

const Icons = {
  Logo: () => (
    <svg viewBox="0 0 100 100" width="28" height="28">
      <rect x="10" y="10" width="80" height="80" rx="4" fill="#0f172a" />
      <path d="M30 10 V5 M70 10 V5" stroke="#3b82f6" strokeWidth="8" />
      <path d="M30 40 H70 M30 60 H50" stroke="#3b82f6" strokeWidth="4" />
    </svg>
  ),
  Cloud: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>,
  Sun: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41M2 12h2"/></svg>,
  Chevron: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>,
  X: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  Download: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
  Upload: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
  Refresh: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>,
  Clock: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
};

const Utils = {
  isValidDate: (d: any) => d instanceof Date && !isNaN(d.getTime()),
  fmtDate: (d: any) => { 
    try { if (!Utils.isValidDate(d)) return ""; return d.toISOString().split('T')[0]; } catch { return ""; } 
  },
  getGlobal: (key: string) => { 
    if (typeof window === 'undefined') return undefined;
    return (window as any)[key];
  }
};

const PALETTE = [
  { id: 'blue', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  { id: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
  { id: 'amber', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
  { id: 'rose', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
  { id: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  { id: 'slate', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100' },
];

export default function App() {
  const isMounted = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [appId, setAppId] = useState('');
  const [authStatus, setAuthStatus] = useState<'connected' | 'error' | 'loading' | 'offline'>('loading');
  
  const [events, setEvents] = useState<any[]>([]);
  const [icalSources, setIcalSources] = useState<any[]>([]);
  const [icalEvents, setIcalEvents] = useState<any[]>([]);
  const [icalStatuses, setIcalStatuses] = useState<Record<string, string>>({});
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'sync' | 'settings' | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(Utils.fmtDate(new Date()));
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [syncStatus, setSyncStatus] = useState<{type: 'success'|'error'|'loading', msg: string} | null>(null);

  const [newIcalName, setNewIcalName] = useState('');
  const [newIcalUrl, setNewIcalUrl] = useState('');
  const [newIcalColor, setNewIcalColor] = useState('blue');

  // 1. BOOTSTRAP
  useEffect(() => {
    isMounted.current = true;
    try {
      const sEvs = localStorage.getItem('titanio_v66_events');
      const sIcal = localStorage.getItem('titanio_v66_ical');
      if (sEvs) setEvents(JSON.parse(sEvs));
      if (sIcal) setIcalSources(JSON.parse(sIcal));
    } catch (e) { console.warn("Local storage empty."); }

    const connect = async () => {
      const cfg = Utils.getGlobal('__firebase_config');
      const aid = Utils.getGlobal('__app_id');
      const tok = Utils.getGlobal('__initial_auth_token');

      if (!cfg) { setAuthStatus('offline'); setInitializing(false); return; }

      try {
        const config = typeof cfg === 'object' ? cfg : JSON.parse(cfg);
        const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
        const auth = getAuth(app);
        const firestore = getFirestore(app);
        setAppId(aid || 'titanio-v66');
        setDb(firestore);
        onAuthStateChanged(auth, (u) => {
          if (isMounted.current) { setUser(u); if (u) setAuthStatus('connected'); setInitializing(false); }
        });
        if (tok) await signInWithCustomToken(auth, tok).catch(() => signInAnonymously(auth));
        else await signInAnonymously(auth);
      } catch (err) { setAuthStatus('offline'); setInitializing(false); }
    };
    setTimeout(connect, 1000);
    return () => { isMounted.current = false; };
  }, []);

  // 2. AUTO-SAVE
  useEffect(() => {
    if (!initializing) {
      localStorage.setItem('titanio_v66_events', JSON.stringify(events || []));
      localStorage.setItem('titanio_v66_ical', JSON.stringify(icalSources || []));
    }
  }, [events, icalSources, initializing]);

  // 3. iCAL ENGINE (Enhanced with Colors)
  const fetchIcal = async () => {
    const active = (icalSources || []).filter(s => s?.url?.startsWith('http'));
    if (active.length === 0) { setIcalEvents([]); return; }
    
    let combined: any[] = [];
    for (const s of active) {
      setIcalStatuses(p => ({ ...p, [s.url]: 'Sincronizzazione...' }));
      try {
        const res = await fetch(`/api/proxy-ical?url=${encodeURIComponent(s.url)}&t=${Date.now()}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const text = await res.text();
        if (text.includes("BEGIN:VCALENDAR")) {
          const blocks = text.replace(/\r\n /g, '').split('BEGIN:VEVENT').slice(1);
          const sColor = PALETTE.find(p => p.id === s.color) || PALETTE[0];
          
          blocks.forEach(block => {
            const summary = (block.match(/SUMMARY:(.*)/)?.[1] || "Evento iCal").trim();
            const st = block.match(/DTSTART[;:][^:]*:?([0-9T]+Z?)/)?.[1];
            if (st && st.length >= 8) {
              const d = new Date(parseInt(st.substr(0,4)), parseInt(st.substr(4,2))-1, parseInt(st.substr(6,2)));
              combined.push({ 
                id: `ical-${Math.random()}`, 
                date: Utils.fmtDate(d), 
                title: summary, 
                startTime: "G", 
                color: `${sColor.bg} ${sColor.text} ${sColor.border}`, 
                isReadOnly: true 
              });
            }
          });
          setIcalStatuses(p => ({ ...p, [s.url]: 'Sincronizzato' }));
        }
      } catch (e: any) { setIcalStatuses(p => ({ ...p, [s.url]: 'Errore' })); }
    }
    setIcalEvents(combined);
  };

  useEffect(() => { fetchIcal(); }, [icalSources]);

  // 4. OFFLINE PROTOCOL (JSON BACKUP)
  const exportBackup = () => {
    const data = JSON.stringify({ events, icalSources, exportDate: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `titanio_v66_${Utils.fmtDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSyncStatus({ type: 'success', msg: 'File Generato' });
    setTimeout(() => setSyncStatus(null), 2000);
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.events) setEvents(data.events);
        if (data.icalSources) setIcalSources(data.icalSources);
        setSyncStatus({ type: 'success', msg: 'Dati Caricati' });
        setModalMode(null);
      } catch (err) { setSyncStatus({ type: 'error', msg: 'File non valido' }); }
    };
    reader.readAsText(file);
  };

  const allEvents = useMemo(() => [...(events || []), ...(icalEvents || [])], [events, icalEvents]);

  const saveShift = (data: any) => {
    if (modalMode === 'edit' && editingEvent) setEvents(events.map(e => e.id === editingEvent.id ? { ...e, ...data } : e));
    else setEvents([...events, { id: Math.random().toString(36).substr(2,9), ...data }]);
    setModalMode(null); setEditingEvent(null);
  };

  if (initializing && events.length === 0) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
      <div className="font-black text-[10px] tracking-[0.5em] animate-pulse italic uppercase text-blue-500 mb-2">Titanio Multichrome V66</div>
      <div className="text-[7px] opacity-40 font-bold uppercase tracking-widest italic text-center">Iniezione Protocollo Visivo...</div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-white font-sans text-slate-900 overflow-hidden relative selection:bg-blue-100 text-left">
      <div className="absolute top-2 left-2 z-[100] bg-black text-white text-[7px] px-2 py-0.5 rounded font-black opacity-20 uppercase tracking-widest pointer-events-none italic">V66 MULTICHROME</div>

      {/* SIDEBAR EXECUTIVE */}
      <aside className="w-80 shrink-0 bg-slate-950 text-white p-6 flex flex-col hidden lg:flex shadow-2xl z-20 border-r border-white/5">
        <div className="flex items-center gap-3 mb-10">
          <Icons.Logo />
          <h2 className="text-lg font-black uppercase tracking-tight italic leading-none text-left">Titanio<br/><span className="text-blue-500 text-xs text-left">Executive V66</span></h2>
        </div>

        <div className="bg-white/[0.03] rounded-2xl p-5 mb-8 border border-white/5 text-left relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
              <div className="text-left">
                 <div className={`text-[8px] font-black uppercase tracking-widest mb-1 flex items-center gap-2 ${authStatus === 'connected' ? 'text-emerald-500' : 'text-slate-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${authStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-600'}`}></div>
                    {authStatus === 'connected' ? 'Cloud Linked' : 'Local Control Only'}
                 </div>
                 <div className="text-[10px] font-bold text-slate-400 italic">Terminal: Ghedi-01</div>
              </div>
              <Icons.Sun />
           </div>
           <div className="text-4xl font-black tracking-tighter mt-4 text-white text-left italic">18<span className="text-blue-500 font-light">°</span></div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col text-left">
           <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Data Nodes</h3>
              <div className="flex gap-2">
                 <button onClick={fetchIcal} className="text-slate-600 hover:text-white transition"><Icons.Refresh /></button>
                 <button onClick={() => setModalMode('settings')} className="text-blue-500 text-[9px] font-black uppercase">Add</button>
              </div>
           </div>
           <div className="space-y-2 overflow-y-auto no-scrollbar pr-1">
              {(icalSources || []).map((s, i) => {
                const color = PALETTE.find(p => p.id === s.color) || PALETTE[0];
                return (
                  <div key={i} className="bg-white/[0.02] p-3 rounded-xl border border-white/5 flex items-center justify-between group transition hover:bg-white/[0.05]">
                     <div className="flex flex-col truncate w-full pr-4 text-left">
                        <div className="flex items-center gap-2">
                           <div className={`w-1.5 h-1.5 rounded-full ${color.bg.replace('50', '500')}`}></div>
                           <span className="text-[10px] font-black text-slate-200 truncate uppercase tracking-tighter text-left leading-none">{s?.name || 'Node'}</span>
                        </div>
                        <span className="text-[7px] text-slate-600 font-bold uppercase tracking-widest mt-1 text-left">{icalStatuses[s?.url] || 'Pronto'}</span>
                     </div>
                  </div>
                );
              })}
           </div>
        </div>
      </aside>

      {/* DASHBOARD */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white text-left">
        <header className="bg-white px-8 py-4 flex justify-between items-center z-10 border-b border-slate-100 text-left">
          <div className="flex items-center gap-6 text-left">
             <div className="flex flex-col min-w-[140px] text-left">
                <h1 className="text-2xl font-black tracking-tighter uppercase leading-none text-slate-900 italic text-left">{currentDate.toLocaleString('it-IT', { month: 'long' })}</h1>
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em] text-left">{currentDate.getFullYear()}</span>
             </div>
             <div className="flex bg-slate-50 rounded-lg p-0.5 border border-slate-100 shadow-inner">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()-1)))} className="p-2 hover:bg-white rounded-md transition text-slate-400"><Icons.Chevron /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1 font-black text-[9px] uppercase hover:bg-white rounded-md transition text-slate-700 font-bold italic">Oggi</button>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+1)))} className="p-2 hover:bg-white rounded-md transition text-slate-400 rotate-180"><Icons.Chevron /></button>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="bg-slate-50 p-0.5 rounded-lg flex border border-slate-100 shadow-inner">
                {['month', 'week', 'day'].map((v: any) => (
                  <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 font-bold'}`}>{v}</button>
                ))}
             </div>
             <button onClick={() => setModalMode('sync')} className="w-9 h-9 border rounded-lg flex items-center justify-center transition-all shadow-sm bg-white border-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white"><Icons.Cloud /></button>
             <button onClick={() => { setSelectedDate(Utils.fmtDate(new Date())); setModalMode('create'); }} className="bg-blue-600 text-white h-9 px-5 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 italic"><Icons.Plus /> Inserisci</button>
          </div>
        </header>

        {/* CALENDAR ENGINE */}
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
                   <div key={i} onClick={() => { setSelectedDate(ds); setModalMode('create'); }} className={`bg-white p-2 min-h-[100px] cursor-pointer border border-slate-100 transition-all flex flex-col ${!isCurMonth ? 'opacity-20 grayscale' : ''} ${isToday ? 'border-blue-500 border-2 z-10 shadow-lg shadow-blue-500/10' : ''}`}>
                      <div className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded mb-2 ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 font-bold'}`}>{d.getDate()}</div>
                      <div className="space-y-0.5 overflow-hidden flex-1 text-left">
                        {dayEvents.map(e => (
                          <div key={e.id} onClick={(ev) => { ev.stopPropagation(); if(!e.isReadOnly) { setEditingEvent(e); setModalMode('edit'); setSelectedDate(e.date); } }} className={`${e.color || 'bg-slate-50'} text-[8px] px-1.5 py-1 rounded border border-black/[0.03] font-black uppercase tracking-tighter truncate transition-all text-left leading-none shadow-sm`}>
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
             <div className="grid grid-cols-7 gap-1 h-full min-h-[600px]">
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
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{d.toLocaleString('it-IT', { weekday: 'short' })}</div>
                        <div className={`text-2xl font-black ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>{d.getDate()}</div>
                      </div>
                      <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar text-left pr-1">
                         {dayEvents.map(e => (
                           <div key={e.id} onClick={() => { if(!e.isReadOnly) { setEditingEvent(e); setModalMode('edit'); setSelectedDate(e.date); } }} className={`${e.color || 'bg-slate-50'} p-3 rounded-xl border border-black/5 flex flex-col cursor-pointer transition-all hover:bg-opacity-80 shadow-sm`}>
                              <span className="text-[9px] font-black uppercase mb-0.5 truncate leading-tight">{e.title}</span>
                              <div className="flex items-center gap-1 opacity-50">
                                 <Icons.Clock />
                                 <span className="text-[7px] font-bold uppercase tracking-widest">{e.startTime === 'G' ? 'iCal' : e.startTime}</span>
                              </div>
                           </div>
                         ))}
                      </div>
                      <button onClick={() => { setSelectedDate(ds); setModalMode('create'); }} className="mt-4 w-full py-2 bg-slate-50 rounded-xl text-[9px] text-slate-300 hover:text-blue-600 transition font-black uppercase tracking-widest">Add</button>
                   </div>
                 );
               })}
             </div>
           )}

           {view === 'day' && (
             <div className="max-w-2xl mx-auto h-full flex flex-col py-8 px-4">
                <div className="bg-white rounded-[2.5rem] p-12 border border-slate-100 shadow-2xl flex-1 flex flex-col text-left">
                   <div className="mb-10 pb-10 border-b border-slate-100 text-left">
                      <h2 className="text-4xl font-black text-slate-950 uppercase tracking-tighter leading-none mb-3 italic">{currentDate.toLocaleString('it-IT', { weekday: 'long' })}</h2>
                      <p className="text-blue-600 font-bold uppercase tracking-[0.4em] text-[10px]">{currentDate.getDate()} {currentDate.toLocaleString('it-IT', { month: 'long' })} {currentDate.getFullYear()}</p>
                   </div>
                   <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar pr-4">
                      {allEvents.filter(e => e.date === Utils.fmtDate(currentDate)).map(e => (
                        <div key={e.id} onClick={() => { if(!e.isReadOnly) { setEditingEvent(e); setModalMode('edit'); setSelectedDate(e.date); } }} className={`${e.color || 'bg-slate-50'} p-8 rounded-[1.8rem] border border-black/5 flex justify-between items-center cursor-pointer transition-all hover:scale-[1.01] shadow-sm`}>
                           <div>
                              <div className="text-lg font-black uppercase tracking-tight text-slate-950 leading-none mb-2 italic">{e.title}</div>
                              <div className="flex items-center gap-2 opacity-50">
                                 <Icons.Clock />
                                 <div className="text-[9px] font-black uppercase tracking-widest">{e.startTime === 'G' ? 'Sorgente Esterna' : e.startTime}</div>
                              </div>
                           </div>
                           {!e.isReadOnly && <div className="text-red-500 opacity-20 hover:opacity-100 transition"><Icons.Trash /></div>}
                        </div>
                      ))}
                      <button onClick={() => { setSelectedDate(Utils.fmtDate(currentDate)); setModalMode('create'); }} className="w-full py-10 rounded-[2rem] border-2 border-dashed border-slate-100 text-slate-300 font-black uppercase text-[10px] tracking-[0.5em] hover:border-blue-500 hover:text-blue-500 transition-all shadow-inner mt-4">+ Inserisci Turno</button>
                   </div>
                </div>
             </div>
           )}
        </div>
      </main>

      {/* MODALE CRUD */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200 text-slate-900">
          <div className="bg-white rounded-[2.5rem] p-12 w-full max-w-sm shadow-2xl">
             <div className="flex justify-between items-start mb-10 text-left">
                <div className="text-left">
                   <h3 className="text-2xl font-black uppercase tracking-tight italic text-slate-950 leading-none">{modalMode === 'edit' ? 'Aggiorna' : 'Nuovo Turno'}</h3>
                   <p className="text-blue-600 text-[8px] font-bold uppercase tracking-[0.2em] mt-3 italic">{selectedDate}</p>
                </div>
                {modalMode === 'edit' && <button onClick={() => { setEvents(events.filter(e => e.id !== editingEvent.id)); setModalMode(null); }} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><Icons.Trash /></button>}
             </div>
             <div className="grid grid-cols-2 gap-4 mb-8">
                <button onClick={() => saveShift({date: selectedDate, title: 'Mattino', color: 'bg-orange-50 text-orange-600 border-orange-100', startTime: '09:00'})} className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:border-orange-500 transition-all flex flex-col items-center shadow-sm group">
                   <span className="text-3xl mb-2 group-hover:scale-110 transition">🌅</span><span className="text-[10px] font-black uppercase italic">Mattino</span>
                </button>
                <button onClick={() => saveShift({date: selectedDate, title: 'Pomeriggio', color: 'bg-blue-50 text-blue-600 border-blue-100', startTime: '14:30'})} className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:border-blue-500 transition-all flex flex-col items-center shadow-sm group">
                   <span className="text-3xl mb-2 group-hover:scale-110 transition">☀️</span><span className="text-[10px] font-black uppercase italic">Pomeriggio</span>
                </button>
             </div>
             <button onClick={() => saveShift({date: selectedDate, title: 'Riposo', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', startTime: 'Libero'})} className="w-full bg-slate-50 py-6 rounded-2xl border border-slate-100 mb-10 uppercase font-black text-[10px] tracking-[0.3em] hover:bg-emerald-50 text-slate-600 italic shadow-sm">🌴 Giorno Libero</button>
             <button onClick={() => setModalMode(null)} className="w-full text-[9px] font-black uppercase text-slate-400 hover:text-slate-950 transition tracking-[0.5em] text-center font-bold">Esci</button>
          </div>
        </div>
      )}

      {/* DATA VAULT (Manual & Cloud) */}
      {modalMode === 'sync' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-center text-slate-900">
          <div className="bg-white rounded-[3rem] p-12 w-full max-w-sm shadow-2xl">
             <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8 bg-blue-50 text-blue-600"><Icons.Cloud /></div>
             <h3 className="text-2xl font-black uppercase mb-10 tracking-tight italic text-slate-950 text-center leading-none">Data <span className="text-blue-600">Vault</span></h3>
             
             <div className="mb-10 p-6 bg-slate-50 border border-slate-100 rounded-[2rem]">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 text-center">Sync Fisica (USB)</div>
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={exportBackup} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col items-center gap-2 hover:bg-slate-950 hover:text-white transition-all shadow-sm">
                      <Icons.Upload />
                      <span className="text-[9px] font-black uppercase tracking-widest leading-none">Export</span>
                   </button>
                   <button onClick={() => fileInputRef.current?.click()} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col items-center gap-2 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                      <Icons.Download />
                      <span className="text-[9px] font-black uppercase tracking-widest leading-none">Import</span>
                   </button>
                   <input type="file" ref={fileInputRef} onChange={importBackup} accept=".json" className="hidden" />
                </div>
             </div>

             <div className="space-y-3">
                <button disabled={authStatus !== 'connected'} onClick={pullFromCloud} className={`w-full py-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all ${authStatus === 'connected' ? 'bg-blue-600 text-white hover:scale-[1.02]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>Cloud Download</button>
                <button disabled={authStatus !== 'connected'} onClick={pushToCloud} className={`w-full py-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all ${authStatus === 'connected' ? 'bg-slate-950 text-white hover:scale-[1.02]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>Cloud Upload</button>
                {syncStatus && <div className={`pt-4 text-[9px] font-black uppercase tracking-widest ${syncStatus.type === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>{syncStatus.msg}</div>}
                <button onClick={() => setModalMode(null)} className="w-full text-[9px] font-black uppercase text-slate-400 tracking-[0.5em] pt-10 hover:text-slate-900 transition text-center font-bold">Chiudi</button>
             </div>
          </div>
        </div>
      )}

      {/* SETTINGS iCAL (Color Selection) */}
      {modalMode === 'settings' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg z-[100] flex items-center justify-center p-8 text-center text-slate-900">
          <div className="bg-white rounded-[3rem] p-12 w-full max-w-sm shadow-2xl border border-white/20">
            <h3 className="text-2xl font-black uppercase mb-10 tracking-tight italic text-center text-slate-950 leading-none font-bold">Sorgenti <span className="text-blue-600">iCal</span></h3>
            <div className="space-y-5">
               <input value={newIcalName} onChange={e => setNewIcalName(e.target.value)} placeholder="NOME CALENDARIO" className="w-full bg-slate-50 p-5 rounded-2xl font-black text-[10px] outline-none border border-slate-100 focus:border-blue-500 text-center uppercase tracking-widest text-slate-900 shadow-inner" />
               <input value={newIcalUrl} onChange={e => setNewIcalUrl(e.target.value)} placeholder="LINK .ICS SEGRETO" className="w-full bg-slate-50 p-5 rounded-2xl font-black text-[10px] outline-none border border-slate-100 focus:border-blue-500 text-center text-slate-900 shadow-inner" />
               
               <div className="flex justify-center gap-2 py-2">
                  {PALETTE.map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => setNewIcalColor(p.id)}
                      className={`w-8 h-8 rounded-xl transition-all ${p.bg.replace('50', '500')} ${newIcalColor === p.id ? 'ring-4 ring-offset-4 ring-slate-900 scale-110 shadow-lg' : 'hover:scale-110'}`}
                    />
                  ))}
               </div>

               <button onClick={() => { if (!newIcalUrl) return; setIcalSources([...(icalSources || []), { name: newIcalName, url: newIcalUrl, color: newIcalColor }]); setNewIcalName(''); setNewIcalUrl(''); setModalMode(null); }} className="w-full bg-slate-950 text-white py-6 rounded-2xl font-black uppercase text-[10px] hover:bg-black transition-all shadow-xl tracking-widest mt-6 italic">Connetti Node</button>
               <button onClick={() => setModalMode(null)} className="w-full text-[9px] font-black uppercase text-slate-400 tracking-[0.5em] pt-6 hover:text-slate-950 transition text-center font-bold">Torna Indietro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
