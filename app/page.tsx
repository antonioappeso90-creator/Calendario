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
 * CALENDARIO TITANIO V70 - OBSIDIAN CHROME-NODE
 * MENTORE DOCET: 
 * 1. NODE COLOR PICKER: Scelta del colore per ogni sorgente iCal per distinzione immediata.
 * 2. CHRONO-RANGE PERSISTENCE: Orario Inizio-Fine visibile ovunque.
 * 3. RAPID-SHIFT PRESETS: Mantenuti i 3 tasti rapidi per i turni manuali.
 * 4. OBSIDIAN PRECISION: Ordinamento cronologico e pulizia visiva totale.
 */

const Icons = {
  Logo: () => (
    <svg viewBox="0 0 100 100" width="28" height="28">
      <rect x="10" y="10" width="80" height="80" rx="2" fill="#0f172a" />
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
  Clock: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  Terminal: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 7 5 5-5 5M19 17h-7"/></svg>
};

const PALETTE = [
  { id: 'blue', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  { id: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  { id: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  { id: 'rose', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  { id: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'slate', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' },
];

const Utils = {
  isValidDate: (d: any) => d instanceof Date && !isNaN(d.getTime()),
  fmtDate: (d: any) => { 
    try { if (!Utils.isValidDate(d)) return ""; return d.toISOString().split('T')[0]; } catch { return ""; } 
  },
  getGlobal: (key: string) => { 
    if (typeof window === 'undefined') return undefined;
    return (window as any)[key];
  },
  sortEvents: (evs: any[]) => {
    return [...evs].sort((a, b) => {
      if (a.startTime === 'G' && b.startTime !== 'G') return -1;
      if (a.startTime !== 'G' && b.startTime === 'G') return 1;
      return a.startTime.localeCompare(b.startTime);
    });
  }
};

export default function App() {
  const isMounted = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- DATABASE & AUTH ---
  const [user, setUser] = useState<User | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [appId, setAppId] = useState('');
  const [authStatus, setAuthStatus] = useState<'connected' | 'error' | 'loading' | 'offline'>('loading');
  const [debugLog, setDebugLog] = useState<Record<string, string>>({});
  
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

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('14:00');
  const [formColor, setFormColor] = useState(PALETTE[0]);

  const [newIcalName, setNewIcalName] = useState('');
  const [newIcalUrl, setNewIcalUrl] = useState('');
  const [newIcalColor, setNewIcalColor] = useState('blue');

  // 1. BOOTSTRAP
  useEffect(() => {
    isMounted.current = true;
    try {
      const sEvs = localStorage.getItem('titanio_v70_events');
      const sIcal = localStorage.getItem('titanio_v70_ical');
      if (sEvs) setEvents(JSON.parse(sEvs));
      if (sIcal) setIcalSources(JSON.parse(sIcal));
    } catch (e) {}

    const connect = async () => {
      const cfg = Utils.getGlobal('__firebase_config');
      const aid = Utils.getGlobal('__app_id');
      const tok = Utils.getGlobal('__initial_auth_token');

      setDebugLog({
        config: cfg ? 'FOUND' : 'MISSING',
        appId: aid ? 'FOUND' : 'DEFAULT',
        token: tok ? 'FOUND' : 'MISSING'
      });

      if (!cfg) { setAuthStatus('offline'); setInitializing(false); return; }

      try {
        const config = typeof cfg === 'object' ? cfg : JSON.parse(cfg);
        const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
        const auth = getAuth(app);
        const firestore = getFirestore(app);
        setAppId(aid || 'titanio-v70');
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
      localStorage.setItem('titanio_v70_events', JSON.stringify(events || []));
      localStorage.setItem('titanio_v70_ical', JSON.stringify(icalSources || []));
    }
  }, [events, icalSources, initializing]);

  // 3. iCAL ENGINE (CHROME-NODE COLOR SYNC)
  const fetchIcal = async () => {
    const active = (icalSources || []).filter(s => s?.url?.startsWith('http'));
    if (active.length === 0) { setIcalEvents([]); return; }
    let combined: any[] = [];
    for (const s of active) {
      setIcalStatuses(p => ({ ...p, [s.url]: 'Sync...' }));
      try {
        const res = await fetch(`/api/proxy-ical?url=${encodeURIComponent(s.url)}&t=${Date.now()}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const text = await res.text();
        if (text.includes("BEGIN:VCALENDAR")) {
          const blocks = text.replace(/\r\n /g, '').split('BEGIN:VEVENT').slice(1);
          const sColor = PALETTE.find(p => p.id === s.color) || PALETTE[0];
          blocks.forEach(block => {
            const summary = (block.match(/SUMMARY:(.*)/)?.[1] || "iCal Event").trim();
            const stMatch = block.match(/DTSTART[;:][^:]*:?(\d{8}T\d{4})/);
            const startTime = stMatch ? `${stMatch[1].substr(9,2)}:${stMatch[1].substr(11,2)}` : "G";
            const enMatch = block.match(/DTEND[;:][^:]*:?(\d{8}T\d{4})/);
            const endTime = enMatch ? `${enMatch[1].substr(9,2)}:${enMatch[1].substr(11,2)}` : (startTime === "G" ? "G" : "??:??");
            const dateMatch = block.match(/DTSTART[;:][^:]*:?(\d{8})/);
            if (dateMatch) {
              const dStr = dateMatch[1];
              const d = new Date(parseInt(dStr.substr(0,4)), parseInt(dStr.substr(4,2))-1, parseInt(dStr.substr(6,2)));
              combined.push({ 
                id: `ical-${Math.random()}`, 
                date: Utils.fmtDate(d), 
                title: summary, 
                startTime, 
                endTime,
                color: `${sColor.bg} ${sColor.text} ${sColor.border}`,
                dot: sColor.dot,
                isReadOnly: true 
              });
            }
          });
          setIcalStatuses(p => ({ ...p, [s.url]: 'Ok' }));
        }
      } catch (e: any) { setIcalStatuses(p => ({ ...p, [s.url]: 'Error' })); }
    }
    setIcalEvents(combined);
  };

  useEffect(() => { fetchIcal(); }, [icalSources]);

  // 4. CRUD LOGIC
  const openModal = (mode: 'create' | 'edit', date: string, event: any = null) => {
    setSelectedDate(date);
    setModalMode(mode);
    if (mode === 'edit' && event) {
      setEditingEvent(event);
      setFormTitle(event.title);
      setFormStart(event.startTime);
      setFormEnd(event.endTime);
      const matchedColor = PALETTE.find(p => event.color.includes(p.bg)) || PALETTE[0];
      setFormColor(matchedColor);
    } else {
      setEditingEvent(null);
      setFormTitle('Mattina');
      setFormStart('09:00');
      setFormEnd('14:00');
      setFormColor(PALETTE[0]);
    }
  };

  const handleSave = () => {
    const data = {
      date: selectedDate,
      title: formTitle || 'Turno',
      startTime: formStart,
      endTime: formEnd,
      color: `${formColor.bg} ${formColor.text} ${formColor.border}`,
      dot: formColor.dot
    };
    if (modalMode === 'edit' && editingEvent) {
      setEvents(events.map(e => e.id === editingEvent.id ? { ...e, ...data } : e));
    } else {
      setEvents([...events, { id: Math.random().toString(36).substr(2,9), ...data }]);
    }
    setModalMode(null);
  };

  // 5. OFFLINE BACKUP
  const exportBackup = () => {
    const data = JSON.stringify({ events, icalSources }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `titanio_v70_backup.json`;
    a.click();
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

  if (initializing && events.length === 0) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-black">
      <div className="text-[10px] tracking-[0.5em] animate-pulse italic uppercase text-blue-500 mb-2">Titanio Chrome-Node V70</div>
      <div className="text-[7px] opacity-40 uppercase tracking-widest italic text-center">Iniezione Protocollo Obsidian...</div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-white font-sans text-slate-900 overflow-hidden relative selection:bg-blue-100 text-left">
      <div className="absolute top-2 left-2 z-[100] bg-black text-white text-[7px] px-2 py-0.5 rounded-sm font-black opacity-20 uppercase tracking-widest pointer-events-none italic">CHROME-NODE V70</div>

      {/* SIDEBAR */}
      <aside className="w-80 shrink-0 bg-slate-950 text-white p-6 flex flex-col hidden lg:flex shadow-2xl z-20 border-r border-white/5">
        <div className="flex items-center gap-3 mb-10">
          <Icons.Logo />
          <h2 className="text-lg font-black uppercase tracking-tight italic leading-none text-left">Titanio<br/><span className="text-blue-500 text-[10px] text-left">Chrome-Node Suite</span></h2>
        </div>

        <div className="bg-white/[0.02] rounded-lg p-5 mb-8 border border-white/5 text-left relative overflow-hidden shadow-inner">
           <div className="flex justify-between items-start mb-4">
              <div className="text-left">
                 <div className={`text-[8px] font-black uppercase tracking-widest mb-1 flex items-center gap-2 ${authStatus === 'connected' ? 'text-emerald-500' : 'text-slate-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${authStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-600'}`}></div>
                    {authStatus === 'connected' ? 'Cloud Linked' : 'Standalone Mode'}
                 </div>
                 <div className="text-[10px] font-bold text-slate-500 italic uppercase tracking-tighter">Terminal: Ghedi-Chrome-01</div>
              </div>
              <Icons.Sun />
           </div>
           <div className="text-4xl font-black tracking-tighter mt-4 text-white text-left italic">18<span className="text-blue-500 font-light">°</span></div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col text-left">
           <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Data Nodes</h3>
              <div className="flex gap-2">
                 <button onClick={fetchIcal} className="text-slate-600 hover:text-white transition"><Icons.Refresh /></button>
                 <button onClick={() => setModalMode('settings')} className="text-blue-500 text-[9px] font-black uppercase">Add</button>
              </div>
           </div>
           <div className="space-y-1 overflow-y-auto no-scrollbar pr-1">
              {(icalSources || []).map((s, i) => {
                const color = PALETTE.find(p => p.id === s.color) || PALETTE[0];
                return (
                  <div key={i} className="bg-white/[0.02] p-3 rounded-md border border-white/5 flex items-center justify-between group transition hover:bg-white/[0.05]">
                     <div className="flex flex-col truncate w-full pr-4 text-left">
                        <div className="flex items-center gap-2">
                           <div className={`w-1.5 h-1.5 rounded-full ${color.dot}`}></div>
                           <span className="text-[10px] font-black text-slate-200 truncate uppercase tracking-tighter leading-none">{s?.name || 'Node'}</span>
                        </div>
                        <span className="text-[7px] text-slate-600 font-bold uppercase tracking-widest mt-1 text-left">{icalStatuses[s?.url] || 'Syncing...'}</span>
                     </div>
                     <button onClick={() => setIcalSources(icalSources.filter((_, idx) => idx !== i))} className="text-red-500 opacity-0 group-hover:opacity-100 transition p-1"><Icons.X /></button>
                  </div>
                );
              })}
           </div>
        </div>
      </aside>

      {/* DASHBOARD */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white text-left">
        <header className="bg-white px-8 py-4 flex justify-between items-center z-10 border-b border-slate-100 text-left shadow-sm">
          <div className="flex items-center gap-6 text-left">
             <div className="flex flex-col min-w-[140px] text-left">
                <h1 className="text-2xl font-black tracking-tighter uppercase leading-none text-slate-900 italic text-left">{currentDate.toLocaleString('it-IT', { month: 'long' })}</h1>
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em] text-left">{currentDate.getFullYear()}</span>
             </div>
             <div className="flex bg-slate-50 rounded p-0.5 border border-slate-100 shadow-inner">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()-1)))} className="p-2 hover:bg-white rounded transition text-slate-400"><Icons.ChevronLeft /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1 font-black text-[9px] uppercase hover:bg-white rounded transition text-slate-700 font-bold italic">Oggi</button>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+1)))} className="p-2 hover:bg-white rounded transition text-slate-400"><Icons.ChevronRight /></button>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="bg-slate-50 p-0.5 rounded flex border border-slate-100">
                {['month', 'week', 'day'].map((v: any) => (
                  <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded text-[8px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{v}</button>
                ))}
             </div>
             <button onClick={() => setModalMode('sync')} className="w-9 h-9 border border-slate-100 rounded flex items-center justify-center transition-all bg-white text-slate-900 hover:bg-slate-900 hover:text-white shadow-sm"><Icons.Cloud /></button>
             <button onClick={() => openModal('create', Utils.fmtDate(new Date()))} className="bg-blue-600 text-white h-9 px-5 rounded font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 italic"><Icons.Plus /> Nuova Entry</button>
          </div>
        </header>

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
                 const dayEvents = Utils.sortEvents(allEvents.filter(e => e.date === ds));

                 return (
                   <div key={i} onClick={() => openModal('create', ds)} className={`bg-white p-2 min-h-[120px] cursor-pointer border border-slate-100 transition-all flex flex-col ${!isCurMonth ? 'opacity-20 grayscale' : ''} ${isToday ? 'border-blue-500 border-2 z-10 shadow-lg' : ''}`}>
                      <div className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-sm mb-2 ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300'}`}>{d.getDate()}</div>
                      <div className="space-y-0.5 overflow-hidden flex-1 text-left">
                        {dayEvents.map(e => (
                          <div key={e.id} onClick={(ev) => { ev.stopPropagation(); if(!e.isReadOnly) { openModal('edit', e.date, e); } }} className={`${e.color || 'bg-slate-50'} text-[7px] px-1.5 py-1 rounded-sm border border-black/[0.03] font-black uppercase tracking-tighter truncate transition-all text-left leading-none shadow-sm flex items-center gap-1`}>
                             {e.dot && <div className={`w-1 h-1 rounded-full shrink-0 ${e.dot}`}></div>}
                             <span className="opacity-40">{e.startTime}-{e.endTime}</span>
                             <span className="truncate">{e.title}</span>
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
                 const dayEvents = Utils.sortEvents(allEvents.filter(e => e.date === ds));

                 return (
                   <div key={i} className={`bg-white flex flex-col border border-slate-100 h-full ${isToday ? 'border-blue-500 border-2 z-10 shadow-xl' : ''}`}>
                      <div className="text-center p-4 border-b border-slate-50 bg-slate-50/50">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{d.toLocaleString('it-IT', { weekday: 'short' })}</div>
                        <div className={`text-2xl font-black ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>{d.getDate()}</div>
                      </div>
                      <div className="flex-1 p-2 space-y-1 overflow-y-auto no-scrollbar text-left">
                         {dayEvents.map(e => (
                           <div key={e.id} onClick={() => { if(!e.isReadOnly) { openModal('edit', e.date, e); } }} className={`${e.color || 'bg-slate-50'} p-3 rounded border border-black/5 flex flex-col cursor-pointer transition-all hover:translate-x-1 shadow-sm`}>
                              <div className="flex justify-between items-start mb-1">
                                 <span className="text-[9px] font-black uppercase truncate leading-none w-[60%]">{e.title}</span>
                                 <span className="text-[7px] font-bold bg-black/5 px-1 rounded uppercase tracking-tighter">{e.startTime}-{e.endTime}</span>
                              </div>
                              {e.dot && <div className={`h-0.5 w-full rounded-full ${e.dot} mt-1 opacity-40`}></div>}
                           </div>
                         ))}
                      </div>
                      <button onClick={() => openModal('create', ds)} className="m-2 py-2 bg-slate-50 rounded text-[9px] text-slate-400 hover:text-blue-600 transition font-black uppercase tracking-widest border border-dashed border-slate-200 shadow-inner">Add</button>
                   </div>
                 );
               })}
             </div>
           )}

           {view === 'day' && (
             <div className="max-w-3xl mx-auto h-full flex flex-col py-8 px-4">
                <div className="bg-white rounded-xl p-12 border border-slate-100 shadow-2xl flex-1 flex flex-col text-left">
                   <div className="mb-10 pb-10 border-b border-slate-100 text-left flex justify-between items-end">
                      <div>
                         <h2 className="text-5xl font-black text-slate-950 uppercase tracking-tighter leading-none mb-3 italic text-left">{currentDate.toLocaleString('it-IT', { weekday: 'long' })}</h2>
                         <p className="text-blue-600 font-bold uppercase tracking-[0.6em] text-[10px] text-left">{currentDate.getDate()} {currentDate.toLocaleString('it-IT', { month: 'long' })} {currentDate.getFullYear()}</p>
                      </div>
                      <div className="text-slate-200 font-black text-6xl tracking-tighter select-none opacity-20 italic uppercase leading-none">{currentDate.getDate()}</div>
                   </div>
                   
                   <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pr-4">
                      {Utils.sortEvents(allEvents.filter(e => e.date === Utils.fmtDate(currentDate))).map(e => (
                        <div key={e.id} onClick={() => { if(!e.isReadOnly) { openModal('edit', e.date, e); } }} className={`${e.color || 'bg-slate-50'} p-6 rounded-lg border border-black/5 flex items-center gap-8 cursor-pointer transition-all hover:scale-[1.01] shadow-md group`}>
                           <div className="w-28 shrink-0 flex flex-col border-r border-black/5 pr-6">
                              <span className="text-sm font-black text-slate-900 leading-none">{e.startTime} - {e.endTime}</span>
                              <span className="text-[8px] font-bold opacity-30 uppercase tracking-[0.2em] mt-2">{e.startTime === 'G' ? 'ALL DAY' : 'CHRONO RANGE'}</span>
                           </div>
                           <div className="flex-1">
                              <div className="text-xl font-black uppercase tracking-tight text-slate-950 leading-none mb-1 italic group-hover:text-blue-600 transition text-left">{e.title}</div>
                              <div className="flex items-center gap-2 opacity-40">
                                 {e.dot && <div className={`w-2 h-2 rounded-full ${e.dot}`}></div>}
                                 <div className="text-[10px] font-bold uppercase tracking-widest">{e.isReadOnly ? 'Node Synced' : 'Manual Precision Entry'}</div>
                              </div>
                           </div>
                           {!e.isReadOnly && <div onClick={(ev) => { ev.stopPropagation(); setEvents(events.filter(ev => ev.id !== e.id)); }} className="text-red-500 opacity-20 hover:opacity-100 transition p-2"><Icons.Trash /></div>}
                        </div>
                      ))}
                      <button onClick={() => openModal('create', Utils.fmtDate(currentDate))} className="w-full py-10 rounded-lg border-2 border-dashed border-slate-100 text-slate-300 font-black uppercase text-[10px] tracking-[1em] hover:border-blue-500 hover:text-blue-500 transition-all shadow-inner mt-6">+ Nuova Entry</button>
                   </div>
                </div>
             </div>
           )}
        </div>
      </main>

      {/* DATA VAULT */}
      {modalMode === 'sync' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-center text-slate-900 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl p-10 w-full max-sm shadow-2xl">
             <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 bg-blue-50 text-blue-600 shadow-sm"><Icons.Cloud /></div>
             <h3 className="text-2xl font-black uppercase mb-8 tracking-tight italic text-slate-950 text-center leading-none">Data <span className="text-blue-600">Precision Vault</span></h3>
             
             <div className="mb-10 p-6 bg-slate-50 border border-slate-100 rounded-lg text-left overflow-hidden">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-200 pb-2">
                   <Icons.Terminal />
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Diagnostic Log</span>
                </div>
                <div className="space-y-1">
                   {Object.entries(debugLog).map(([k, v]) => (
                     <div key={k} className="flex justify-between items-center text-[7px] font-black uppercase">
                        <span className="text-slate-500">{k}:</span>
                        <span className={v === 'FOUND' ? 'text-emerald-500' : 'text-red-500'}>{v}</span>
                     </div>
                   ))}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-3 mb-8">
                <button onClick={exportBackup} className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col items-center gap-3 hover:bg-slate-950 hover:text-white transition-all shadow-sm">
                   <Icons.Upload />
                   <span className="text-[8px] font-black uppercase tracking-widest">Esporta</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col items-center gap-3 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                   <Icons.Download />
                   <span className="text-[8px] font-black uppercase tracking-widest">Importa</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={importBackup} accept=".json" className="hidden" />
             </div>

             <button onClick={() => setModalMode(null)} className="w-full text-[9px] font-black uppercase text-slate-400 hover:text-slate-900 transition tracking-[0.5em] text-center font-bold">Esci</button>
          </div>
        </div>
      )}

      {/* CRUD MODAL - RAPID SHIFT OVERRIDE */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200 text-slate-900">
          <div className="bg-white rounded-xl p-10 w-full max-w-sm shadow-2xl">
             <div className="flex justify-between items-start mb-8 text-left border-b border-slate-50 pb-6">
                <div className="text-left">
                   <h3 className="text-2xl font-black uppercase tracking-tight italic text-slate-950 leading-none text-left">{modalMode === 'edit' ? 'Aggiorna' : 'Pianifica'}</h3>
                   <p className="text-blue-600 text-[8px] font-bold uppercase tracking-[0.4em] mt-3 italic text-left">{selectedDate}</p>
                </div>
                <button onClick={() => setModalMode(null)} className="p-2 hover:bg-slate-100 rounded text-slate-400 transition"><Icons.X /></button>
             </div>
             
             <div className="space-y-8">
                <div className="space-y-3">
                   <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-[0.2em] block text-center italic">Seleziona Turno Rapido</label>
                   <div className="grid grid-cols-1 gap-2">
                      <button 
                         onClick={() => { setFormTitle('Mattina'); setFormStart('09:00'); setFormEnd('14:00'); setFormColor(PALETTE[0]); }}
                         className={`p-4 rounded-lg border flex items-center justify-between transition-all group ${formTitle === 'Mattina' ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-blue-300'}`}
                      >
                         <div className="flex items-center gap-3 text-left">
                            <span className="text-xl">🌅</span>
                            <div className="flex flex-col leading-none text-left">
                               <span className="text-[10px] font-black uppercase italic text-slate-900">Mattina</span>
                               <span className="text-[8px] font-bold text-slate-400 mt-1">09:00 - 14:00</span>
                            </div>
                         </div>
                         <div className={`w-3 h-3 rounded-full bg-blue-500 ${formTitle === 'Mattina' ? 'opacity-100' : 'opacity-20 group-hover:opacity-100'}`}></div>
                      </button>

                      <button 
                         onClick={() => { setFormTitle('Pomeriggio'); setFormStart('14:30'); setFormEnd('19:30'); setFormColor(PALETTE[2]); }}
                         className={`p-4 rounded-lg border flex items-center justify-between transition-all group ${formTitle === 'Pomeriggio' ? 'bg-amber-50 border-amber-500 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-amber-300'}`}
                      >
                         <div className="flex items-center gap-3 text-left">
                            <span className="text-xl">☀️</span>
                            <div className="flex flex-col leading-none text-left">
                               <span className="text-[10px] font-black uppercase italic text-slate-900">Pomeriggio</span>
                               <span className="text-[8px] font-bold text-slate-400 mt-1">14:30 - 19:30</span>
                            </div>
                         </div>
                         <div className={`w-3 h-3 rounded-full bg-amber-500 ${formTitle === 'Pomeriggio' ? 'opacity-100' : 'opacity-20 group-hover:opacity-100'}`}></div>
                      </button>

                      <button 
                         onClick={() => { setFormTitle('Riposo'); setFormStart('00:00'); setFormEnd('23:59'); setFormColor(PALETTE[4]); }}
                         className={`p-4 rounded-lg border flex items-center justify-between transition-all group ${formTitle === 'Riposo' ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-emerald-300'}`}
                      >
                         <div className="flex items-center gap-3 text-left">
                            <span className="text-xl">🌴</span>
                            <div className="flex flex-col leading-none text-left">
                               <span className="text-[10px] font-black uppercase italic text-slate-900">Riposo</span>
                               <span className="text-[8px] font-bold text-slate-400 mt-1">Giorno Libero</span>
                            </div>
                         </div>
                         <div className={`w-3 h-3 rounded-full bg-emerald-500 ${formTitle === 'Riposo' ? 'opacity-100' : 'opacity-20 group-hover:opacity-100'}`}></div>
                      </button>
                   </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                   <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-[0.2em] block mb-4 text-center italic">Personalizza Orario (Override)</label>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="text-left">
                         <label className="text-[7px] font-black uppercase text-slate-400 ml-1 block text-left">Inizio</label>
                         <input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} className="w-full bg-white p-3 rounded-lg font-black text-[11px] border border-slate-200 focus:border-blue-500 outline-none text-center shadow-sm" />
                      </div>
                      <div className="text-left">
                         <label className="text-[7px] font-black uppercase text-slate-400 ml-1 block text-left">Fine</label>
                         <input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="w-full bg-white p-3 rounded-lg font-black text-[11px] border border-slate-200 focus:border-blue-500 outline-none text-center shadow-sm" />
                      </div>
                   </div>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setModalMode(null)} className="flex-1 text-[9px] font-black uppercase text-slate-400 hover:text-slate-900 transition tracking-[0.3em] font-bold py-4 italic">Esci</button>
                   <button onClick={handleSave} className="flex-[2] bg-slate-950 text-white py-4 rounded-xl font-black uppercase text-[10px] hover:bg-black transition-all shadow-xl tracking-widest italic">Salva Turno</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* SETTINGS iCAL (CHROME-NODE COLOR PICKER) */}
      {modalMode === 'settings' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg z-[100] flex items-center justify-center p-8 text-center text-slate-900 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl p-12 w-full max-w-sm shadow-2xl border border-white/20">
            <h3 className="text-2xl font-black uppercase mb-10 tracking-tight italic text-center text-slate-950 leading-none font-bold">Add <span className="text-blue-600">Data Node</span></h3>
            <div className="space-y-5">
               <div className="text-left">
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-[0.2em] block text-left">Etichetta Nodo</label>
                  <input value={newIcalName} onChange={e => setNewIcalName(e.target.value)} placeholder="ES: LAVORO, FAMIGLIA..." className="w-full bg-slate-50 p-5 rounded-lg font-black text-[10px] outline-none border border-slate-100 focus:border-blue-500 text-center uppercase tracking-widest shadow-inner mt-1 text-slate-900" />
               </div>
               <div className="text-left">
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-[0.2em] block text-left">URL iCal (.ics)</label>
                  <input value={newIcalUrl} onChange={e => setNewIcalUrl(e.target.value)} placeholder="HTTPS://..." className="w-full bg-slate-50 p-5 rounded-lg font-black text-[10px] outline-none border border-slate-100 focus:border-blue-500 text-center shadow-inner mt-1 text-slate-900" />
               </div>
               
               <div className="pt-2">
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-[0.2em] block mb-3 text-center italic">Personalizzazione Cromatica</label>
                  <div className="flex justify-center gap-2">
                     {PALETTE.map(p => (
                       <button 
                         key={p.id} 
                         onClick={() => setNewIcalColor(p.id)}
                         className={`w-8 h-8 rounded-lg transition-all ${p.dot} ${newIcalColor === p.id ? 'ring-4 ring-offset-4 ring-slate-950 scale-110 shadow-lg' : 'hover:scale-110 opacity-60'}`}
                         title={p.id}
                       />
                     ))}
                  </div>
               </div>

               <button onClick={() => { if (!newIcalUrl) return; setIcalSources([...(icalSources || []), { name: newIcalName, url: newIcalUrl, color: newIcalColor }]); setNewIcalName(''); setNewIcalUrl(''); setModalMode(null); }} className="w-full bg-slate-950 text-white py-6 rounded-lg font-black uppercase text-[10px] hover:bg-black transition-all shadow-xl tracking-widest mt-6 italic shadow-blue-900/10">Inietta Node</button>
               <button onClick={() => setModalMode(null)} className="w-full text-[9px] font-black uppercase text-slate-400 tracking-[0.5em] pt-6 hover:text-slate-950 transition text-center font-bold italic">Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
