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
 * CALENDARIO TITANIO V77 - OBSIDIAN WIDE-VISION
 * MENTORE DOCET: 
 * 1. WIDE LAYOUT: Layout espanso per tablet, rimosse le limitazioni di larghezza.
 * 2. SIDEBAR COMPRESSION: Ridotto l'ingombro della barra comandi per dare spazio ai dati.
 * 3. READABILITY ENGINE: Font degli eventi ingranditi e resi più "Bold".
 * 4. TIME-SHIELD: Mantenuta la logica locale per evitare errori di data/anno (Fix V76).
 */

const Icons = {
  Logo: () => (
    <svg viewBox="0 0 100 100" width="24" height="24">
      <rect x="10" y="10" width="80" height="80" rx="4" fill="#0f172a" />
      <path d="M30 10 V5 M70 10 V5" stroke="#3b82f6" strokeWidth="10" />
      <path d="M30 40 H70 M30 60 H50" stroke="#3b82f6" strokeWidth="6" />
    </svg>
  ),
  Cloud: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>,
  Sun: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41M2 12h2"/></svg>,
  ChevronLeft: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>,
  ChevronRight: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6 6-6"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>,
  X: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  Download: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
  Upload: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
  Refresh: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>,
  Clock: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  Terminal: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 7 5 5-5 5M19 17h-7"/></svg>
};

const PALETTE = [
  { id: 'blue', bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700', dot: 'bg-white', ghostBg: 'bg-blue-50/50', ghostText: 'text-blue-700', ghostBorder: 'border-blue-200' },
  { id: 'indigo', bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-700', dot: 'bg-white', ghostBg: 'bg-indigo-50/50', ghostText: 'text-indigo-700', ghostBorder: 'border-indigo-200' },
  { id: 'amber', bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600', dot: 'bg-white', ghostBg: 'bg-amber-50/50', ghostText: 'text-amber-700', ghostBorder: 'border-amber-200' },
  { id: 'rose', bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-700', dot: 'bg-white', ghostBg: 'bg-rose-50/50', ghostText: 'text-rose-700', ghostBorder: 'border-rose-200' },
  { id: 'emerald', bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700', dot: 'bg-white', ghostBg: 'bg-emerald-50/50', ghostText: 'text-emerald-700', ghostBorder: 'border-emerald-200' },
  { id: 'slate', bg: 'bg-slate-700', text: 'text-white', border: 'border-slate-800', dot: 'bg-white', ghostBg: 'bg-slate-50/50', ghostText: 'text-slate-700', ghostBorder: 'border-slate-200' },
];

const Utils = {
  isValidDate: (d: any) => d instanceof Date && !isNaN(d.getTime()),
  fmtDate: (date: any) => { 
    try { 
      if (!Utils.isValidDate(date)) return ""; 
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    } catch { return ""; } 
  },
  getGlobal: (key: string) => { 
    if (typeof window === 'undefined') return undefined;
    return (window as any)[key];
  },
  sortEvents: (evs: any[]) => {
    return [...evs].sort((a, b) => {
      if (!a.isReadOnly && b.isReadOnly) return -1;
      if (a.isReadOnly && !b.isReadOnly) return 1;
      if (a.startTime === 'G' && b.startTime !== 'G') return -1;
      if (a.startTime !== 'G' && b.startTime === 'G') return 1;
      return a.startTime.localeCompare(b.startTime);
    });
  }
};

export default function App() {
  const isMounted = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appId = useMemo(() => Utils.getGlobal('__app_id') || 'titanio-v77', []);
  
  // --- DATABASE & AUTH ---
  const [user, setUser] = useState<User | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [authStatus, setAuthStatus] = useState<'connected' | 'error' | 'loading' | 'offline'>('loading');
  const [debugLog, setDebugLog] = useState<Record<string, string>>({});
  
  // --- DATA & PERSISTENCE ---
  const [events, setEvents] = useState<any[]>([]);
  const [icalSources, setIcalSources] = useState<any[]>([]);
  const [icalEvents, setIcalEvents] = useState<any[]>([]);
  const [icalStatuses, setIcalStatuses] = useState<Record<string, string>>({});
  
  const [initializing, setInitializing] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // --- UI ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'sync' | 'settings' | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(Utils.fmtDate(new Date()));
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<{type: 'success'|'error'|'loading', msg: string} | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('14:00');
  const [formColor, setFormColor] = useState(PALETTE[0]);

  const [newIcalName, setNewIcalName] = useState('');
  const [newIcalUrl, setNewIcalUrl] = useState('');
  const [newIcalColor, setNewIcalColor] = useState('blue');

  // --- HOISTED FUNCTIONS ---
  const exportBackup = () => {
    try {
      const data = JSON.stringify({ events, icalSources }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `titanio_v77_backup_${Utils.fmtDate(new Date())}.json`;
      a.click();
      setSyncStatus({ type: 'success', msg: 'Backup Generato' });
      setTimeout(() => setSyncStatus(null), 2000);
    } catch (e) { setSyncStatus({ type: 'error', msg: 'Errore Export' }); }
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

  const pushToCloud = async () => {
    if (!user || !db) return;
    setSyncStatus({ type: 'loading', msg: 'Salvataggio Cloud...' });
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'userData', 'main');
      await setDoc(docRef, { events, icalSources, lastSync: new Date().toISOString() });
      setSyncStatus({ type: 'success', msg: 'Sync Cloud Ok' });
    } catch (e) { setSyncStatus({ type: 'error', msg: 'Errore Cloud Write' }); }
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const pullFromCloud = async () => {
    if (!user || !db) return;
    setSyncStatus({ type: 'loading', msg: 'Recupero Cloud...' });
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'userData', 'main');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.events) setEvents(data.events);
        if (data.icalSources) setIcalSources(data.icalSources);
        setSyncStatus({ type: 'success', msg: 'Dati Recuperati' });
      } else { setSyncStatus({ type: 'error', msg: 'Nessun dato nel Cloud' }); }
    } catch (e) { setSyncStatus({ type: 'error', msg: 'Errore Cloud Read' }); }
    setTimeout(() => setSyncStatus(null), 3000);
  };

  // 1. BOOTSTRAP
  useEffect(() => {
    isMounted.current = true;
    try {
      const sEvs = localStorage.getItem('titanio_v77_events');
      const sIcal = localStorage.getItem('titanio_v77_ical');
      if (sEvs) setEvents(JSON.parse(sEvs));
      if (sIcal) setIcalSources(JSON.parse(sIcal));
      setDataLoaded(true);
    } catch (e) { setDataLoaded(true); }

    const connect = async () => {
      const cfgStr = Utils.getGlobal('__firebase_config');
      const tok = Utils.getGlobal('__initial_auth_token');
      setDebugLog({ config: cfgStr ? 'FOUND' : 'MISSING', app: appId ? 'FOUND' : 'DEFAULT' });
      if (!cfgStr) { setAuthStatus('offline'); setInitializing(false); return; }
      try {
        const config = typeof cfgStr === 'object' ? cfgStr : JSON.parse(cfgStr);
        const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
        const auth = getAuth(app);
        const firestore = getFirestore(app);
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
  }, [appId]);

  // 2. AUTO-SAVE
  useEffect(() => {
    if (dataLoaded && !initializing) {
      localStorage.setItem('titanio_v77_events', JSON.stringify(events || []));
      localStorage.setItem('titanio_v77_ical', JSON.stringify(icalSources || []));
    }
  }, [events, icalSources, dataLoaded, initializing]);

  // 3. iCAL ENGINE
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
            const summary = (block.match(/SUMMARY:(.*)/)?.[1] || "Evento iCal").trim();
            const dateMatch = block.match(/DTSTART[;:][^:]*:?(\d{8})/);
            if (dateMatch) {
              const dStr = dateMatch[1];
              const y = parseInt(dStr.substr(0,4));
              const m = parseInt(dStr.substr(4,2))-1;
              const dDay = parseInt(dStr.substr(6,2));
              const dateObj = new Date(y, m, dDay);
              
              const stMatch = block.match(/DTSTART[;:][^:]*:?(\d{8}T\d{4})/);
              const startTime = stMatch ? `${stMatch[1].substr(9,2)}:${stMatch[1].substr(11,2)}` : "G";
              const enMatch = block.match(/DTEND[;:][^:]*:?(\d{8}T\d{4})/);
              const endTime = enMatch ? `${enMatch[1].substr(9,2)}:${enMatch[1].substr(11,2)}` : (startTime === "G" ? "G" : "??:??");

              combined.push({ 
                id: `ical-${Math.random()}`, 
                date: Utils.fmtDate(dateObj), 
                title: summary, 
                startTime, 
                endTime,
                color: `${sColor.ghostBg} ${sColor.ghostText} ${sColor.ghostBorder}`,
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

  useEffect(() => { if (dataLoaded) fetchIcal(); }, [icalSources, dataLoaded]);

  // 4. MODAL LOGIC
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
      dot: formColor.dot,
      isReadOnly: false
    };
    if (modalMode === 'edit' && editingEvent) {
      setEvents(events.map(e => e.id === editingEvent.id ? { ...e, ...data } : e));
    } else { setEvents([...events, { id: Math.random().toString(36).substr(2,9), ...data }]); }
    setModalMode(null);
  };

  const allEvents = useMemo(() => [...(events || []), ...(icalEvents || [])], [events, icalEvents]);

  if (initializing && events.length === 0) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-black text-left">
      <div className="text-[10px] tracking-[0.5em] animate-pulse italic uppercase text-blue-500 mb-2">Titanio Wide-Vision V77</div>
      <div className="text-[7px] opacity-40 uppercase tracking-widest italic text-center leading-none">Ottimizzazione Interfaccia Tablet...</div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-white font-sans text-slate-900 overflow-hidden relative selection:bg-blue-100 text-left">
      <div className="absolute top-2 left-2 z-[100] bg-black text-white text-[7px] px-2 py-0.5 rounded-sm font-black opacity-20 uppercase tracking-widest pointer-events-none italic">WIDE-VISION V77</div>

      {/* SIDEBAR COMPRESSA (Mentore: Meno chiacchiere, più spazio) */}
      <aside className="w-64 shrink-0 bg-slate-950 text-white p-5 flex flex-col hidden lg:flex shadow-2xl z-20 border-r border-white/5 text-left">
        <div className="flex items-center gap-2 mb-8 text-left">
          <Icons.Logo />
          <h2 className="text-sm font-black uppercase tracking-tighter italic leading-none text-left">Titanio<br/><span className="text-blue-500 text-[9px] text-left">Wide Control</span></h2>
        </div>

        <div className="bg-white/[0.03] rounded-xl p-4 mb-6 border border-white/5 text-left relative overflow-hidden shadow-inner text-left">
           <div className="flex justify-between items-start mb-2 text-left">
              <div className="text-left">
                 <div className={`text-[8px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5 ${authStatus === 'connected' ? 'text-emerald-500' : 'text-slate-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${authStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-600'}`}></div>
                    {authStatus === 'connected' ? 'Sync On' : 'Local Only'}
                 </div>
                 <div className="text-[9px] font-bold text-slate-500 italic uppercase tracking-tighter text-left leading-none">Iron Persistence</div>
              </div>
              <Icons.Sun />
           </div>
           <div className="text-3xl font-black tracking-tighter mt-3 text-white text-left italic leading-none">18<span className="text-blue-500 font-light text-left">°</span></div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col text-left">
           <div className="flex items-center justify-between mb-3 px-1 text-left">
              <h3 className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] text-left leading-none">Nodes</h3>
              <div className="flex gap-2">
                 <button onClick={fetchIcal} className="text-slate-600 hover:text-white transition"><Icons.Refresh /></button>
                 <button onClick={() => setModalMode('settings')} className="text-blue-500 text-[8px] font-black uppercase">Add</button>
              </div>
           </div>
           <div className="space-y-1 overflow-y-auto no-scrollbar pr-1 text-left">
              {(icalSources || []).map((s, i) => {
                const color = PALETTE.find(p => p.id === s.color) || PALETTE[0];
                return (
                  <div key={i} className="bg-white/[0.02] p-2.5 rounded-lg border border-white/5 flex items-center justify-between group transition hover:bg-white/[0.05] text-left">
                     <div className="flex flex-col truncate w-full pr-2 text-left">
                        <div className="flex items-center gap-2 text-left">
                           <div className={`w-1.5 h-1.5 rounded-full ${color.dot}`}></div>
                           <span className="text-[9px] font-black text-slate-200 truncate uppercase tracking-tighter leading-none text-left">{s?.name || 'Node'}</span>
                        </div>
                     </div>
                     <button onClick={() => setIcalSources(icalSources.filter((_, idx) => idx !== i))} className="text-red-500 opacity-0 group-hover:opacity-100 transition p-1"><Icons.X /></button>
                  </div>
                );
              })}
           </div>
        </div>
      </aside>

      {/* DASHBOARD ESPANSA (Mentore: Finalmente si respira) */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white text-left">
        <header className="bg-white px-6 py-4 flex justify-between items-center z-10 border-b border-slate-100 text-left shadow-sm text-left">
          <div className="flex items-center gap-6 text-left">
             <div className="flex flex-col min-w-[140px] text-left">
                <h1 className="text-2xl font-black tracking-tighter uppercase leading-none text-slate-900 italic text-left leading-none">{currentDate.toLocaleString('it-IT', { month: 'long' })}</h1>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] text-left leading-none italic leading-none">{currentDate.getFullYear()}</span>
             </div>
             <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 shadow-inner text-left">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()-1)))} className="p-2.5 hover:bg-white rounded-md transition text-slate-400"><Icons.ChevronLeft /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-5 py-1 font-black text-[10px] uppercase hover:bg-white rounded-md transition text-slate-700 font-bold italic leading-none">Oggi</button>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+1)))} className="p-2.5 hover:bg-white rounded-md transition text-slate-400"><Icons.ChevronRight /></button>
             </div>
          </div>
          
          <div className="flex items-center gap-3 text-left">
             <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200 shadow-inner text-left">
                {['month', 'week', 'day'].map((v: any) => (
                  <button key={v} onClick={() => setView(v)} className={`px-5 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{v}</button>
                ))}
             </div>
             <button 
                onClick={() => setModalMode('sync')} 
                className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-all shadow-sm ${authStatus === 'offline' ? 'border-amber-100 bg-amber-50/20 text-amber-500' : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-900 hover:text-white'}`}
             >
                <Icons.Cloud />
             </button>
             <button onClick={() => openModal('create', Utils.fmtDate(new Date()))} className="bg-blue-600 text-white h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center gap-2 italic leading-none"><Icons.Plus /> Nuova Entry</button>
          </div>
        </header>

        <div className="flex-1 overflow-auto no-scrollbar bg-slate-50/40 p-1.5 text-left">
           {view === 'month' && (
             <div className="grid grid-cols-7 gap-1 min-h-full auto-rows-fr text-left">
               {Array.from({ length: 42 }).map((_, i) => {
                 const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                 const first = start.getDay() === 0 ? 6 : start.getDay() - 1;
                 const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i - first + 1);
                 const ds = Utils.fmtDate(d);
                 const isToday = ds === Utils.fmtDate(new Date());
                 const isCurMonth = d.getMonth() === currentDate.getMonth();
                 const dayEvents = Utils.sortEvents(allEvents.filter(e => e.date === ds));

                 return (
                   <div key={i} onClick={() => openModal('create', ds)} className={`bg-white p-3 min-h-[140px] cursor-pointer border border-slate-100 transition-all flex flex-col ${!isCurMonth ? 'opacity-20 grayscale' : ''} ${isToday ? 'border-blue-500 border-2 z-10 shadow-lg shadow-blue-500/10' : ''} text-left`}>
                      <div className={`text-xs font-black w-7 h-7 flex items-center justify-center rounded-lg mb-2 ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300'} text-left`}>{d.getDate()}</div>
                      <div className="space-y-1 overflow-hidden flex-1 text-left">
                        {dayEvents.map(e => (
                          <div key={e.id} onClick={(ev) => { ev.stopPropagation(); if(!e.isReadOnly) { openModal('edit', e.date, e); } }} 
                             className={`${e.color} text-[10px] px-2 py-2 rounded-lg border border-black/[0.05] font-black uppercase tracking-tighter truncate transition-all text-left leading-tight shadow-sm flex items-center gap-1.5 ${!e.isReadOnly ? 'scale-[1.02] z-[2]' : 'opacity-60 grayscale-[0.5]'}`}
                          >
                             {!e.isReadOnly && <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.dot}`}></div>}
                             <span className="opacity-50 shrink-0 font-bold">{e.startTime}</span>
                             <span className="truncate font-black">{e.title}</span>
                          </div>
                        ))}
                      </div>
                   </div>
                 );
               })}
             </div>
           )}

           {view === 'week' && (
             <div className="grid grid-cols-7 gap-1.5 h-full min-h-[600px] text-left">
               {Array.from({ length: 7 }).map((_, i) => {
                 const curr = new Date(currentDate);
                 const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1);
                 const d = new Date(curr.setDate(first + i));
                 const ds = Utils.fmtDate(d);
                 const isToday = ds === Utils.fmtDate(new Date());
                 const dayEvents = Utils.sortEvents(allEvents.filter(e => e.date === ds));

                 return (
                   <div key={i} className={`bg-white flex flex-col border border-slate-200 h-full rounded-xl shadow-sm overflow-hidden ${isToday ? 'border-blue-500 border-2 z-10 shadow-xl' : ''} text-left`}>
                      <div className={`text-center p-5 border-b border-slate-50 ${isToday ? 'bg-blue-50/50' : 'bg-slate-50/50'} text-left`}>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none italic text-left leading-none">{d.toLocaleString('it-IT', { weekday: 'short' })}</div>
                        <div className={`text-3xl font-black ${isToday ? 'text-blue-600' : 'text-slate-900'} text-left`}>{d.getDate()}</div>
                      </div>
                      <div className="flex-1 p-3 space-y-3 overflow-y-auto no-scrollbar text-left pr-1 text-left">
                         {dayEvents.map(e => (
                           <div key={e.id} onClick={() => { if(!e.isReadOnly) { openModal('edit', e.date, e); } }} 
                              className={`${e.color} p-5 rounded-2xl border border-black/5 flex flex-col cursor-pointer transition-all shadow-sm ${!e.isReadOnly ? 'border-l-8 ring-1 ring-black/5' : 'opacity-60 grayscale-[0.3]'} text-left`}
                           >
                              <div className="flex justify-between items-start mb-2 text-left">
                                 <span className={`text-xs font-black uppercase truncate leading-none w-[70%] text-left italic ${!e.isReadOnly ? 'tracking-tighter' : ''}`}>{e.title}</span>
                                 <span className="text-[8px] font-black bg-black/10 px-1.5 py-0.5 rounded-full uppercase tracking-tighter leading-none">{e.startTime}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 opacity-50 text-left">
                                 <Icons.Clock />
                                 <span className="text-[8px] font-black uppercase tracking-widest leading-none text-left">{e.isReadOnly ? 'Node Event' : 'Titanium Shift'}</span>
                              </div>
                           </div>
                         ))}
                      </div>
                      <button onClick={() => openModal('create', ds)} className="m-3 py-3 bg-slate-50 rounded-xl text-[10px] text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition font-black uppercase tracking-widest border border-dashed border-slate-200 shadow-inner italic text-left flex justify-center items-center gap-2 leading-none"><Icons.Plus /> Add Shift</button>
                   </div>
                 );
               })}
             </div>
           )}

           {view === 'day' && (
             <div className="w-full h-full flex flex-col py-6 px-6 text-left">
                <div className="bg-white rounded-2xl p-10 border border-slate-200 shadow-2xl flex-1 flex flex-col text-left overflow-hidden text-left">
                   <div className="mb-8 pb-8 border-b border-slate-100 text-left flex justify-between items-end text-left">
                      <div className="text-left">
                         <h2 className="text-6xl font-black text-slate-950 uppercase tracking-tighter leading-none mb-4 italic text-left leading-none">{currentDate.toLocaleString('it-IT', { weekday: 'long' })}</h2>
                         <p className="text-blue-600 font-bold uppercase tracking-[0.5em] text-xs text-left leading-none italic text-left leading-none">{currentDate.getDate()} {currentDate.toLocaleString('it-IT', { month: 'long' })} {currentDate.getFullYear()}</p>
                      </div>
                      <div className="text-slate-100 font-black text-9xl tracking-tighter select-none opacity-20 italic uppercase leading-none text-left">{currentDate.getDate()}</div>
                   </div>
                   
                   <div className="flex-1 space-y-10 overflow-y-auto no-scrollbar pr-4 text-left">
                      <div className="space-y-6 text-left">
                        <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 italic mb-2 text-left">Primary Executive Shifts</div>
                        {Utils.sortEvents(allEvents.filter(e => e.date === Utils.fmtDate(currentDate) && !e.isReadOnly)).map(e => (
                           <div key={e.id} onClick={() => openModal('edit', e.date, e)} className={`${e.color} p-10 rounded-3xl border border-black/5 flex items-center gap-12 cursor-pointer transition-all hover:scale-[1.01] shadow-2xl group border-l-[16px] text-left`}>
                              <div className="w-40 shrink-0 flex flex-col border-r border-white/20 pr-10 text-left">
                                 <span className="text-3xl font-black leading-none text-left tracking-tighter">{e.startTime} - {e.endTime}</span>
                                 <span className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em] mt-3 text-left leading-none italic text-white/50 text-left">ACTIVE SHIFT</span>
                              </div>
                              <div className="flex-1 text-left">
                                 <div className="text-5xl font-black uppercase tracking-tight leading-none mb-2 italic transition text-left leading-none">{e.title}</div>
                                 <div className="flex items-center gap-3 opacity-70 text-left">
                                    <div className={`w-3 h-3 rounded-full ${e.dot}`}></div>
                                    <div className="text-xs font-black uppercase tracking-widest text-left leading-none text-white/80 italic text-left leading-none">Manually Calibrated Nodes</div>
                                 </div>
                              </div>
                              <div onClick={(ev) => { ev.stopPropagation(); setEvents(events.filter(ev => ev.id !== e.id)); }} className="text-white/30 hover:text-white transition p-4 bg-black/10 rounded-2xl"><Icons.Trash /></div>
                           </div>
                        ))}
                      </div>

                      <div className="space-y-6 text-left">
                        <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 italic mb-2 text-left">Secondary Auxiliary Nodes</div>
                        {Utils.sortEvents(allEvents.filter(e => e.date === Utils.fmtDate(currentDate) && e.isReadOnly)).map(e => (
                           <div key={e.id} className={`${e.color} p-6 rounded-2xl border border-black/5 flex items-center gap-10 opacity-80 hover:opacity-100 transition shadow-lg text-left`}>
                              <div className="w-32 shrink-0 flex flex-col border-r border-black/5 pr-8 text-left opacity-60 text-left leading-none">
                                 <span className="text-xl font-black text-slate-900 leading-none text-left italic text-left tracking-tighter">{e.startTime} - {e.endTime}</span>
                              </div>
                              <div className="flex-1 text-left">
                                 <div className="text-2xl font-black uppercase tracking-tight text-slate-950 leading-none mb-1 italic text-left leading-none">{e.title}</div>
                                 <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-left leading-none italic text-left leading-none">SYNCED EXTERNAL DATA</div>
                              </div>
                           </div>
                        ))}
                      </div>
                      
                      {allEvents.filter(e => e.date === Utils.fmtDate(currentDate)).length === 0 && (
                        <div className="py-24 text-center text-slate-100 uppercase font-black tracking-widest italic text-2xl text-left">No Active Operation</div>
                      )}

                      <button onClick={() => openModal('create', Utils.fmtDate(currentDate))} className="w-full py-16 rounded-3xl border-2 border-dashed border-slate-100 text-slate-200 font-black uppercase text-xs tracking-[1em] hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50/30 transition-all shadow-inner mt-8 italic text-left flex justify-center items-center gap-4">+ Add Operation</button>
                   </div>
                </div>
             </div>
           )}
        </div>
      </main>

      {/* VAULT MODAL (Mentore: Solo per emergenze) */}
      {modalMode === 'sync' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-center text-slate-900 animate-in fade-in duration-200 text-left">
          <div className="bg-white rounded-[2rem] p-10 w-full max-sm:p-6 max-w-sm shadow-2xl overflow-hidden text-left border border-slate-100">
             <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm ${authStatus === 'offline' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-600'} text-left`}><Icons.Cloud /></div>
             <h3 className="text-2xl font-black uppercase mb-8 tracking-tight italic text-slate-950 text-center leading-none text-left font-bold">Data <span className="text-blue-600">Priority Vault</span></h3>
             
             <div className="mb-10 p-6 bg-slate-50 border border-slate-100 rounded-2xl text-left overflow-hidden shadow-inner text-left">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-200 pb-2 text-left">
                   <Icons.Terminal />
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic text-left leading-none">Diagnostics</span>
                </div>
                <div className="space-y-1.5 text-left">
                   {Object.entries(debugLog).map(([k, v]) => (
                     <div key={k} className="flex justify-between items-center text-[7px] font-black uppercase text-left">
                        <span className="text-slate-500 text-left">{k}:</span>
                        <span className={v === 'FOUND' ? 'text-emerald-500' : 'text-red-500 font-bold'} text-left>{v}</span>
                     </div>
                   ))}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                <button onClick={exportBackup} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col items-center gap-3 hover:bg-slate-950 hover:text-white transition-all shadow-sm text-left">
                   <Icons.Upload />
                   <span className="text-[9px] font-black uppercase tracking-widest text-center italic leading-none text-left">Export</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col items-center gap-3 hover:bg-blue-600 hover:text-white transition-all shadow-sm text-left">
                   <Icons.Download />
                   <span className="text-[9px] font-black uppercase tracking-widest text-center italic leading-none text-left">Import</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={importBackup} accept=".json" className="hidden" />
             </div>

             {syncStatus && <div className={`mb-4 text-[9px] font-black uppercase tracking-widest italic ${syncStatus.type === 'error' ? 'text-red-500' : 'text-emerald-500 animate-pulse'} text-left leading-none`}>{syncStatus.msg}</div>}

             <button onClick={() => setModalMode(null)} className="w-full text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 transition tracking-[0.4em] text-center font-bold italic text-left leading-none pt-4">Chiudi Vault</button>
          </div>
        </div>
      )}

      {/* CRUD MODAL - RAPID SHIFT (Mentore: Pulsanti grossi per dita veloci) */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200 text-slate-900 text-left">
          <div className="bg-white rounded-[2rem] p-10 w-full max-sm:p-6 max-w-sm shadow-2xl text-left border border-slate-100">
             <div className="flex justify-between items-start mb-8 text-left border-b border-slate-50 pb-6 text-left">
                <div className="text-left">
                   <h3 className="text-2xl font-black uppercase tracking-tight italic text-slate-950 leading-none text-left font-bold">{modalMode === 'edit' ? 'Update' : 'Schedule'}</h3>
                   <p className="text-blue-600 text-[10px] font-bold uppercase tracking-[0.4em] mt-3 italic text-left leading-none">{selectedDate}</p>
                </div>
                <button onClick={() => setModalMode(null)} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 transition"><Icons.X /></button>
             </div>
             
             <div className="space-y-8 text-left">
                <div className="space-y-4 text-left">
                   <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-[0.2em] block text-center italic text-left leading-none">Command Presets</label>
                   <div className="grid grid-cols-1 gap-3 text-left">
                      <button 
                         onClick={() => { setFormTitle('Mattina'); setFormStart('09:00'); setFormEnd('14:00'); setFormColor(PALETTE[0]); }}
                         className={`p-5 rounded-2xl border flex items-center justify-between transition-all group ${formTitle === 'Mattina' ? 'bg-blue-600 border-blue-700 shadow-xl scale-[1.02] ring-4 ring-blue-600/20' : 'bg-slate-50 border-slate-100 hover:border-blue-300'} text-left`}
                      >
                         <div className="flex items-center gap-4 text-left">
                            <span className="text-2xl text-left leading-none">🌅</span>
                            <div className="flex flex-col leading-none text-left">
                               <span className={`text-xs font-black uppercase italic ${formTitle === 'Mattina' ? 'text-white' : 'text-slate-900'} text-left`}>Mattina</span>
                               <span className={`text-[10px] font-bold mt-1.5 ${formTitle === 'Mattina' ? 'text-blue-100' : 'text-slate-400'} text-left`}>09:00 - 14:00</span>
                            </div>
                         </div>
                         <div className={`w-3.5 h-3.5 rounded-full bg-white ${formTitle === 'Mattina' ? 'opacity-100' : 'opacity-20'} text-left shadow-inner`}></div>
                      </button>

                      <button 
                         onClick={() => { setFormTitle('Pomeriggio'); setFormStart('14:30'); setFormEnd('19:30'); setFormColor(PALETTE[2]); }}
                         className={`p-5 rounded-2xl border flex items-center justify-between transition-all group ${formTitle === 'Pomeriggio' ? 'bg-amber-500 border-amber-600 shadow-xl scale-[1.02] ring-4 ring-amber-500/20' : 'bg-slate-50 border-slate-100 hover:border-amber-300'} text-left`}
                      >
                         <div className="flex items-center gap-4 text-left">
                            <span className="text-2xl text-left leading-none">☀️</span>
                            <div className="flex flex-col leading-none text-left">
                               <span className={`text-xs font-black uppercase italic ${formTitle === 'Pomeriggio' ? 'text-white' : 'text-slate-900'} text-left`}>Pomeriggio</span>
                               <span className={`text-[10px] font-bold mt-1.5 ${formTitle === 'Pomeriggio' ? 'text-amber-50' : 'text-slate-400'} text-left`}>14:30 - 19:30</span>
                            </div>
                         </div>
                         <div className={`w-3.5 h-3.5 rounded-full bg-white ${formTitle === 'Pomeriggio' ? 'opacity-100' : 'opacity-20'} text-left shadow-inner`}></div>
                      </button>

                      <button 
                         onClick={() => { setFormTitle('Riposo'); setFormStart('00:00'); setFormEnd('23:59'); setFormColor(PALETTE[4]); }}
                         className={`p-5 rounded-2xl border flex items-center justify-between transition-all group ${formTitle === 'Riposo' ? 'bg-emerald-600 border-emerald-700 shadow-xl scale-[1.02] ring-4 ring-emerald-600/20' : 'bg-slate-50 border-slate-100 hover:border-emerald-300'} text-left`}
                      >
                         <div className="flex items-center gap-4 text-left">
                            <span className="text-2xl text-left leading-none">🌴</span>
                            <div className="flex flex-col leading-none text-left">
                               <span className={`text-xs font-black uppercase italic ${formTitle === 'Riposo' ? 'text-white' : 'text-slate-900'} text-left`}>Riposo</span>
                               <span className={`text-[10px] font-bold mt-1.5 ${formTitle === 'Riposo' ? 'text-emerald-50' : 'text-slate-400'} text-left`}>Command: Off</span>
                            </div>
                         </div>
                         <div className={`w-3.5 h-3.5 rounded-full bg-white ${formTitle === 'Riposo' ? 'opacity-100' : 'opacity-20'} text-left shadow-inner`}></div>
                      </button>
                   </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner text-left">
                   <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-[0.2em] block mb-4 text-center italic text-left leading-none">Manual Override</label>
                   <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="text-left">
                         <label className="text-[8px] font-black uppercase text-slate-400 ml-1 block text-left leading-none mb-1.5 italic text-left leading-none">In</label>
                         <input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} className="w-full bg-white p-3.5 rounded-xl font-black text-xs border border-slate-200 focus:border-blue-500 outline-none text-center shadow-sm text-slate-900 text-left" />
                      </div>
                      <div className="text-left">
                         <label className="text-[8px] font-black uppercase text-slate-400 ml-1 block text-left leading-none mb-1.5 italic text-left leading-none">Out</label>
                         <input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="w-full bg-white p-3.5 rounded-xl font-black text-xs border border-slate-200 focus:border-blue-500 outline-none text-center shadow-sm text-slate-900 text-left" />
                      </div>
                   </div>
                </div>

                <div className="flex gap-4 text-left pt-2">
                   <button onClick={() => setModalMode(null)} className="flex-1 text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 transition tracking-[0.3em] font-bold py-5 italic text-center leading-none text-left">Cancel</button>
                   <button onClick={handleSave} className="flex-[2] bg-slate-950 text-white py-5 rounded-2xl font-black uppercase text-[11px] hover:bg-black transition-all shadow-2xl tracking-widest italic leading-none text-left border border-white/10">Save Record</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {modalMode === 'settings' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg z-[100] flex items-center justify-center p-8 text-center text-slate-900 animate-in fade-in duration-200 text-left">
          <div className="bg-white rounded-[2rem] p-12 w-full max-sm:p-6 max-w-sm shadow-2xl border border-slate-100 text-left">
            <h3 className="text-2xl font-black uppercase mb-10 tracking-tight italic text-center text-slate-950 leading-none font-bold text-left font-bold text-left leading-tight">Inject <span className="text-blue-600">Data Node</span></h3>
            <div className="space-y-6 text-left">
               <div className="text-left">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-[0.2em] block text-left leading-none mb-2.5 italic text-left leading-none">Label</label>
                  <input value={newIcalName} onChange={e => setNewIcalName(e.target.value)} placeholder="Node Identifier..." className="w-full bg-slate-50 p-5 rounded-xl font-black text-[11px] outline-none border border-slate-100 focus:border-blue-500 text-center uppercase tracking-widest shadow-inner text-slate-900 text-left" />
               </div>
               <div className="text-left">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-[0.2em] block text-left leading-none mb-2.5 italic text-left leading-none">Endpoint (iCal)</label>
                  <input value={newIcalUrl} onChange={e => setNewIcalUrl(e.target.value)} placeholder="HTTPS://..." className="w-full bg-slate-50 p-5 rounded-xl font-black text-[11px] outline-none border border-slate-100 focus:border-blue-500 text-center shadow-inner text-slate-900 text-left" />
               </div>
               
               <div className="pt-2 text-left">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-[0.2em] block mb-4 text-center italic text-left leading-none">Node Chroma</label>
                  <div className="flex justify-center gap-3 text-left">
                     {PALETTE.map(p => (
                       <button 
                         key={p.id} 
                         onClick={() => setNewIcalColor(p.id)}
                         className={`w-9 h-9 rounded-xl transition-all ${p.bg} ${newIcalColor === p.id ? 'ring-4 ring-offset-4 ring-slate-950 scale-110 shadow-lg' : 'hover:scale-110 opacity-60'} text-left`}
                       />
                     ))}
                  </div>
               </div>

               <button onClick={() => { if (!newIcalUrl) return; setIcalSources([...(icalSources || []), { name: newIcalName, url: newIcalUrl, color: newIcalColor }]); setNewIcalName(''); setNewIcalUrl(''); setModalMode(null); }} className="w-full bg-slate-950 text-white py-6 rounded-2xl font-black uppercase text-[11px] hover:bg-black transition-all shadow-2xl tracking-widest mt-8 italic border border-white/10 text-center leading-none text-left">Activate Node</button>
               <button onClick={() => setModalMode(null)} className="w-full text-[10px] font-black uppercase text-slate-400 tracking-[0.5em] pt-8 hover:text-slate-950 transition text-center font-bold italic text-left leading-none">Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
