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
 * CALENDARIO TITANIO V63 - NUCLEAR DEBUGGER PROTOCOL
 * MENTORE DOCET: 
 * 1. ZERO SILENCE: Se le chiavi mancano, l'app urla il motivo nel terminale di debug.
 * 2. WINDOW SCANNER: Ispezione profonda dell'oggetto globale per trovare le config.
 * 3. BOOT SPEED: I turni locali appaiono in <100ms, il Cloud è asincrono.
 * 4. ERROR HARDENING: Gestione dei crash durante il parsing JSON delle chiavi.
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
  Refresh: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>,
  Terminal: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 7 5 5-5 5M19 17h-7"/></svg>
};

const Utils = {
  isValidDate: (d: any) => d instanceof Date && !isNaN(d.getTime()),
  fmtDate: (d: any) => { 
    try { if (!Utils.isValidDate(d)) return ""; return d.toISOString().split('T')[0]; } catch { return ""; } 
  },
  getGlobal: (key: string) => { 
    try { return typeof window !== 'undefined' ? (window as any)[key] : undefined; } catch { return undefined; } 
  }
};

export default function App() {
  const isMounted = useRef(true);
  
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

  // 1. NUCLEAR BOOTSTRAP
  const attemptConnection = async () => {
    if (!isMounted.current) return;
    setAuthStatus('loading');
    
    const configRaw = Utils.getGlobal('__firebase_config');
    const aid = Utils.getGlobal('__app_id');
    const token = Utils.getGlobal('__initial_auth_token');

    // Aggiorna Log di Debug
    setDebugLog({
      config: configRaw ? 'FOUND' : 'MISSING',
      appId: aid ? 'FOUND' : 'DEFAULT',
      token: token ? 'FOUND' : 'MISSING',
      window: typeof window !== 'undefined' ? 'READY' : 'WAIT'
    });

    if (!configRaw) {
      setAuthStatus('offline');
      setInitializing(false);
      return;
    }

    try {
      const config = typeof configRaw === 'object' ? configRaw : JSON.parse(configRaw);
      const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
      const auth = getAuth(app);
      const firestore = getFirestore(app);
      
      setAppId(aid || 'titanio-v63');
      setDb(firestore);

      const unsubscribe = onAuthStateChanged(auth, (u) => {
        if (isMounted.current) {
          setUser(u);
          if (u) setAuthStatus('connected');
          setInitializing(false);
        }
      });

      if (token) {
        await signInWithCustomToken(auth, token).catch(() => signInAnonymously(auth));
      } else {
        await signInAnonymously(auth);
      }
      
      return () => unsubscribe();
    } catch (err: any) {
      console.error("Firebase Error:", err);
      setAuthStatus('error');
      setInitializing(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    
    // Caricamento locale (priorità assoluta)
    try {
      const sEvs = localStorage.getItem('titanio_v63_events');
      const sIcal = localStorage.getItem('titanio_v63_ical');
      if (sEvs) setEvents(JSON.parse(sEvs));
      if (sIcal) setIcalSources(JSON.parse(sIcal));
    } catch (e) {}

    // Avvio asincrono del Cloud
    setTimeout(attemptConnection, 1000);

    return () => { isMounted.current = false; };
  }, []);

  // 2. AUTO-SAVE LOCALE
  useEffect(() => {
    if (!initializing) {
      localStorage.setItem('titanio_v63_events', JSON.stringify(events || []));
      localStorage.setItem('titanio_v63_ical', JSON.stringify(icalSources || []));
    }
  }, [events, icalSources, initializing]);

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
          blocks.forEach(block => {
            const summary = (block.match(/SUMMARY:(.*)/)?.[1] || "G-Turno").trim();
            const st = block.match(/DTSTART[;:][^:]*:?([0-9T]+Z?)/)?.[1];
            if (st && st.length >= 8) {
              const d = new Date(parseInt(st.substr(0,4)), parseInt(st.substr(4,2))-1, parseInt(st.substr(6,2)));
              combined.push({ id: `ical-${Math.random()}`, date: Utils.fmtDate(d), title: summary, startTime: "G", color: 'bg-zinc-50 text-zinc-400 border-zinc-200', isReadOnly: true });
            }
          });
          setIcalStatuses(p => ({ ...p, [s.url]: 'Ok' }));
        }
      } catch (e: any) { setIcalStatuses(p => ({ ...p, [s.url]: 'Errore' })); }
    }
    setIcalEvents(combined);
  };

  useEffect(() => { fetchIcal(); }, [icalSources]);

  // 4. CLOUD ACTIONS
  const pushToCloud = async () => {
    if (!user || !db || !appId) return setSyncStatus({type: 'error', msg: 'Cloud Sconnesso'});
    setSyncStatus({type: 'loading', msg: 'Invio...'});
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shifts', 'global'), {
        events, icalSources, updatedAt: Date.now(), user: user.uid
      });
      setSyncStatus({type: 'success', msg: 'Backup OK'});
      setTimeout(() => setSyncStatus(null), 2000);
    } catch (e: any) { setSyncStatus({type: 'error', msg: e.message}); }
  };

  const pullFromCloud = async () => {
    if (!user || !db || !appId) return setSyncStatus({type: 'error', msg: 'Cloud Sconnesso'});
    setSyncStatus({type: 'loading', msg: 'Ricezione...'});
    try {
      const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shifts', 'global'));
      if (snap.exists()) {
        const d = snap.data();
        setEvents(Array.isArray(d.events) ? d.events : []);
        setIcalSources(Array.isArray(d.icalSources) ? d.icalSources : []);
        setSyncStatus({type: 'success', msg: 'Sync OK'});
      } else { setSyncStatus({type: 'error', msg: 'Vuoto'}); }
      setTimeout(() => setSyncStatus(null), 2000);
    } catch (e: any) { setSyncStatus({type: 'error', msg: e.message}); }
  };

  const allEvents = useMemo(() => [...(events || []), ...(icalEvents || [])], [events, icalEvents]);

  const saveShift = (data: any) => {
    if (modalMode === 'edit' && editingEvent) setEvents(events.map(e => e.id === editingEvent.id ? { ...e, ...data } : e));
    else setEvents([...events, { id: Math.random().toString(36).substr(2,9), ...data }]);
    setModalMode(null); setEditingEvent(null);
  };

  // 5. LOADING SCREEN (Non blocca se i dati locali ci sono)
  if (initializing && events.length === 0) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
      <div className="font-black text-[10px] tracking-[0.5em] animate-pulse italic uppercase mb-4 text-blue-500">Titanio Nuclear V63</div>
      <div className="text-[8px] opacity-40 font-bold uppercase tracking-widest">Inizializzazione Kernel...</div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-white font-sans text-slate-900 overflow-hidden relative selection:bg-blue-100">
      <div className="absolute top-2 left-2 z-[100] bg-black text-white text-[7px] px-2 py-0.5 rounded font-black opacity-20 uppercase tracking-widest pointer-events-none italic">NUCLEAR V63</div>

      {/* SIDEBAR EXECUTIVE */}
      <aside className="w-80 shrink-0 bg-slate-950 text-white p-6 flex flex-col hidden lg:flex shadow-2xl z-20 border-r border-white/5">
        <div className="flex items-center gap-3 mb-10">
          <Icons.Logo />
          <h2 className="text-lg font-black uppercase tracking-tight italic leading-none text-left">Titanio<br/><span className="text-blue-500 text-xs text-left">Nuclear Protocol</span></h2>
        </div>

        {/* STATUS WIDGET NUCLEAR */}
        <div className="bg-white/[0.03] rounded-2xl p-5 mb-8 border border-white/5 text-left relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
              <div className="text-left">
                 <div className={`text-[8px] font-black uppercase tracking-widest mb-1 flex items-center gap-2 ${authStatus === 'connected' ? 'text-emerald-500' : authStatus === 'loading' ? 'text-blue-400' : 'text-slate-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${authStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : authStatus === 'loading' ? 'bg-blue-400 animate-ping' : 'bg-red-600'}`}></div>
                    {authStatus === 'connected' ? 'Cloud Active' : authStatus === 'loading' ? 'Kernel Linking...' : 'Offline Mode'}
                 </div>
                 <div className="text-[10px] font-bold text-slate-400 italic">Terminal: Ghedi-01</div>
              </div>
              <Icons.Sun />
           </div>
           
           {authStatus === 'offline' && (
             <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-[7px] font-black text-red-400 uppercase leading-tight italic">Chiavi Cloud non rilevate nel sistema Canvas.</p>
                <button onClick={attemptConnection} className="mt-2 text-[7px] text-white border-b border-white/40 pb-0.5 hover:text-blue-400 transition uppercase font-black">Riprova Aggancio</button>
             </div>
           )}

           <div className="text-4xl font-black tracking-tighter mt-4 text-white text-left italic">18<span className="text-blue-500 font-light">°</span></div>
        </div>

        {/* SOURCES */}
        <div className="flex-1 overflow-hidden flex flex-col text-left">
           <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Data Streams</h3>
              <div className="flex gap-2">
                 <button onClick={fetchIcal} className="text-slate-600 hover:text-white transition"><Icons.Refresh /></button>
                 <button onClick={() => setModalMode('settings')} className="text-blue-500 text-[9px] font-black uppercase">Add</button>
              </div>
           </div>
           <div className="space-y-2 overflow-y-auto no-scrollbar pr-1">
              {(icalSources || []).map((s, i) => (
                <div key={i} className="bg-white/[0.02] p-3 rounded-xl border border-white/5 flex items-center justify-between group transition hover:bg-white/[0.05]">
                   <div className="flex flex-col truncate w-full pr-4 text-left">
                      <span className="text-[10px] font-black text-slate-200 truncate uppercase tracking-tighter text-left">{s?.name || 'Sorgente'}</span>
                      <span className="text-[7px] text-slate-600 font-bold uppercase tracking-widest mt-0.5 text-left">{icalStatuses[s?.url] || 'Online'}</span>
                   </div>
                </div>
              ))}
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
                <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1 font-black text-[9px] uppercase hover:bg-white rounded-md transition text-slate-700 font-bold">Oggi</button>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+1)))} className="p-2 hover:bg-white rounded-md transition text-slate-400 rotate-180"><Icons.Chevron /></button>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="bg-slate-50 p-0.5 rounded-lg flex border border-slate-100 shadow-inner">
                {['month', 'week', 'day'].map((v: any) => (
                  <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 font-bold'}`}>{v}</button>
                ))}
             </div>
             <button onClick={() => setModalMode('sync')} className={`w-9 h-9 border rounded-lg flex items-center justify-center transition-all shadow-sm ${authStatus === 'connected' ? 'bg-white border-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-400'}`}><Icons.Cloud /></button>
             <button onClick={() => { setSelectedDate(Utils.fmtDate(new Date())); setModalMode('create'); }} className="bg-blue-600 text-white h-9 px-5 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 italic shadow-blue-500/20"><Icons.Plus /> Inserisci</button>
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
        </div>
      </main>

      {/* CLOUD VAULT - NUCLEAR DEBUGGER */}
      {modalMode === 'sync' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-center text-slate-900">
          <div className="bg-white rounded-2xl p-10 w-full max-w-sm shadow-2xl border border-white/20">
             <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-sm transition-all ${authStatus === 'connected' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400 animate-pulse'}`}><Icons.Cloud /></div>
             <h3 className="text-2xl font-black uppercase mb-3 tracking-tight italic text-slate-950 text-center leading-none">Cloud <span className="text-blue-600">Vault</span></h3>
             
             {/* Terminal Debug Output */}
             <div className="mb-8 p-4 rounded-xl bg-slate-900 text-left border border-white/10 shadow-inner">
                <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
                   <Icons.Terminal />
                   <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">System Debugger</span>
                </div>
                <div className="space-y-1.5">
                   {Object.entries(debugLog).map(([k, v]) => (
                     <div key={k} className="flex justify-between items-center">
                        <span className="text-[7px] font-black text-slate-500 uppercase">{k}:</span>
                        <span className={`text-[7px] font-black uppercase ${v === 'FOUND' || v === 'READY' ? 'text-emerald-400' : 'text-red-500'}`}>{v}</span>
                     </div>
                   ))}
                </div>
                <div className="mt-3 pt-2 border-t border-white/10 text-[7px] font-bold text-slate-500 italic uppercase">
                   Status: {authStatus === 'connected' ? 'AUTH_SUCCESS' : 'AUTH_PENDING'}
                </div>
             </div>

             <div className="space-y-3">
                <button 
                  disabled={authStatus !== 'connected'}
                  onClick={pushToCloud} 
                  className={`w-full py-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all ${authStatus === 'connected' ? 'bg-slate-950 text-white hover:scale-[1.02]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  Force Upload
                </button>
                <button 
                  disabled={authStatus !== 'connected'}
                  onClick={pullFromCloud} 
                  className={`w-full py-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all ${authStatus === 'connected' ? 'bg-blue-600 text-white hover:scale-[1.02]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  Force Download
                </button>
                
                {syncStatus && (
                   <div className={`pt-4 text-[9px] font-black uppercase tracking-widest animate-modal ${syncStatus.type === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {syncStatus.msg}
                   </div>
                )}
                
                <button onClick={() => setModalMode(null)} className="w-full text-[9px] font-black uppercase text-slate-400 tracking-[0.4em] pt-8 hover:text-slate-900 transition text-center font-bold">Esci</button>
             </div>
          </div>
        </div>
      )}

      {/* SETTINGS iCAL */}
      {modalMode === 'settings' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg z-[100] flex items-center justify-center p-8 text-center text-slate-900">
          <div className="bg-white rounded-2xl p-10 w-full max-w-sm shadow-2xl border border-white/20">
            <h3 className="text-2xl font-black uppercase mb-10 tracking-tight italic text-center text-slate-950 leading-none font-bold">Data <span className="text-blue-600">Feed</span></h3>
            <div className="space-y-4">
               <input value={newIcalName || ''} onChange={e => setIcalSources([...icalSources, {name: e.target.value, url: ''}])} placeholder="NOME CALENDARIO" className="w-full bg-slate-50 p-5 rounded-xl font-black text-[10px] outline-none border border-slate-100 focus:border-blue-500 text-center uppercase tracking-widest text-slate-900" />
               <button onClick={() => setModalMode(null)} className="w-full bg-slate-950 text-white py-6 rounded-xl font-black uppercase text-[10px] hover:bg-black transition-all shadow-xl tracking-widest mt-4 italic">Connetti</button>
               <button onClick={() => setModalMode(null)} className="w-full text-[9px] font-black uppercase text-slate-400 tracking-[0.5em] pt-6 hover:text-slate-950 transition text-center font-bold">Indietro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
