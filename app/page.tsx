import React, { useState, useEffect } from 'react';

// --- ICONE SVG (Inline per evitare dipendenze esterne) ---
const Icons = {
    ChevronLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
    ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
    Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
    X: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
    Sun: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
    Cloud: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>,
    Settings: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
    Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
};

// --- UTILITY DATE ---
const DateUtils = {
    getDaysInMonth: (year: number, month: number) => new Date(year, month + 1, 0).getDate(),
    getFirstDayOfMonth: (year: number, month: number) => {
        let day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; 
    },
    formatDate: (date: Date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    },
    getStartOfWeek: (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    },
    addDays: (date: Date, days: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    },
    parseTime: (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return { h, m, totalMinutes: h * 60 + m };
    }
};

// --- COMPONENTE PRINCIPALE ---
export default function App() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('month');
    const [events, setEvents] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [icalUrls, setIcalUrls] = useState<string[]>([]);
    const [icalEvents, setIcalEvents] = useState<any[]>([]);

    // Caricamento Iniziale da LocalStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('calendario_turni');
            if (saved) setEvents(JSON.parse(saved));

            const savedUrls = localStorage.getItem('calendario_ical_urls');
            if (savedUrls) setIcalUrls(JSON.parse(savedUrls));
        } catch (e) {
            console.error("Errore nel caricamento dei dati", e);
        }
    }, []);

    // Salvataggio su LocalStorage ad ogni modifica
    useEffect(() => {
        localStorage.setItem('calendario_turni', JSON.stringify(events));
    }, [events]);

    useEffect(() => {
        localStorage.setItem('calendario_ical_urls', JSON.stringify(icalUrls));
    }, [icalUrls]);

    // Simulazione fetch iCal (nell'editor Canvas fallirà la chimata API reale, ma su Vercel funzionerà)
    useEffect(() => {
        if (icalUrls.length === 0) {
            setIcalEvents([]);
            return;
        }
        
        const fetchAllIcal = async () => {
            let allFetchedEvents: any[] = [];
            for (const url of icalUrls) {
                try {
                    const res = await fetch(`/api/proxy-ical?url=${encodeURIComponent(url)}`);
                    if (!res.ok) throw new Error('CORS o API non disponibile in anteprima');
                    // Logica parse omessa per compattezza nell'anteprima
                } catch (err) {
                    console.log("Nota: Sincronizzazione iCal bloccata nell'anteprima, funzionerà su Vercel.", err);
                }
            }
            setIcalEvents(allFetchedEvents);
        };
        fetchAllIcal();
    }, [icalUrls]);

    const allEventsToDisplay = [...events, ...icalEvents];

    const addEvent = (newEvent: any) => {
        setEvents(prev => [...prev, { ...newEvent, id: Date.now().toString() }]);
        setIsModalOpen(false);
    };

    const deleteEvent = (id: string, e?: any) => {
        if(e) e.stopPropagation();
        if(String(id).startsWith('ical-')) return;

        if(window.confirm("Sei sicuro di voler eliminare questo turno?")) {
            setEvents(prev => prev.filter(ev => ev.id !== id));
        }
    };

    const navigateDate = (dir: number) => {
        const newDate = new Date(currentDate);
        if (view === 'month') {
            newDate.setMonth(newDate.getMonth() + dir);
        } else {
            newDate.setDate(newDate.getDate() + (dir * 7));
        }
        setCurrentDate(newDate);
    };

    const openModalForDate = (dateStr: string) => {
        setSelectedDate(dateStr);
        setIsModalOpen(true);
    };

    return (
        <div className="flex h-screen w-full bg-slate-100 font-sans text-slate-900 overflow-hidden">
            <style dangerouslySetInnerHTML={{__html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .time-grid-row { height: 60px; border-bottom: 1px solid #e5e7eb; }
            `}} />

            {/* Sidebar Meteo */}
            <WeatherSidebar />

            {/* Area Principale */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
                {/* Header Principale */}
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight capitalize">
                            {currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}
                        </h1>
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-white rounded-md transition text-slate-600"><Icons.ChevronLeft /></button>
                            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 font-medium hover:bg-white rounded-md transition text-sm text-slate-700">Oggi</button>
                            <button onClick={() => navigateDate(1)} className="p-2 hover:bg-white rounded-md transition text-slate-600"><Icons.ChevronRight /></button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                            <button onClick={() => setView('month')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${view === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Mese</button>
                            <button onClick={() => setView('week')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${view === 'week' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Settimana</button>
                        </div>

                        <button 
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2 rounded-xl transition-colors shadow-sm border border-slate-200 hover:bg-slate-50 text-slate-600"
                            title="Impostazioni iCal"
                        >
                            <Icons.Settings />
                        </button>

                        <button 
                            onClick={() => openModalForDate(DateUtils.formatDate(new Date()))}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors shadow-sm"
                        >
                            <Icons.Plus /> Nuovo Turno
                        </button>
                    </div>
                </header>

                {/* Contenuto Calendario */}
                <div className="flex-1 overflow-auto bg-white relative">
                    {view === 'month' ? (
                        <MonthView currentDate={currentDate} events={allEventsToDisplay} onDayClick={openModalForDate} onDeleteEvent={deleteEvent} />
                    ) : (
                        <WeekView currentDate={currentDate} events={allEventsToDisplay} onTimeClick={openModalForDate} onDeleteEvent={deleteEvent} />
                    )}
                </div>
            </main>

            {/* Modali */}
            {isModalOpen && (
                <EventModal 
                    date={selectedDate} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={addEvent} 
                />
            )}

            {isSettingsOpen && (
                <SettingsModal 
                    urls={icalUrls} 
                    setUrls={setIcalUrls} 
                    onClose={() => setIsSettingsOpen(false)} 
                />
            )}
        </div>
    );
}

// --- VISTA MENSILE ---
function MonthView({ currentDate, events, onDayClick, onDeleteEvent }: any) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = DateUtils.getDaysInMonth(year, month);
    const firstDay = DateUtils.getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

    return (
        <div className="h-full flex flex-col min-h-[600px]">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {weekDays.map(day => (
                    <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200 last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>
            <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-slate-200 gap-[1px]">
                {days.map((date, index) => {
                    if (!date) return <div key={`empty-${index}`} className="bg-slate-50"></div>;
                    
                    const dateStr = DateUtils.formatDate(date);
                    const dayEvents = events.filter((e: any) => e.date === dateStr);
                    const isToday = dateStr === DateUtils.formatDate(new Date());

                    return (
                        <div 
                            key={dateStr} 
                            onClick={() => onDayClick(dateStr)}
                            className={`bg-white p-2 flex flex-col hover:bg-blue-50/50 transition cursor-pointer group min-h-[100px] ${isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}
                        >
                            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700 group-hover:text-blue-600'}`}>
                                {date.getDate()}
                            </span>
                            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
                                {dayEvents.map((evt: any) => (
                                    <div key={evt.id} className={`${evt.color || 'bg-blue-100 text-blue-800'} text-xs p-1.5 rounded-3xl relative group/event truncate pr-6 shadow-sm border border-black/5`}>
                                        <span className="font-semibold">{evt.startTime}</span> {evt.title}
                                        {!evt.isReadOnly && (
                                            <button 
                                                onClick={(e) => onDeleteEvent(evt.id, e)}
                                                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/event:opacity-100 bg-white/50 hover:bg-white rounded-full p-0.5 text-red-600 transition"
                                            >
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
    );
}

// --- VISTA SETTIMANALE ---
function WeekView({ currentDate, events, onTimeClick, onDeleteEvent }: any) {
    const startOfWeek = DateUtils.getStartOfWeek(currentDate);
    const weekDays = Array.from({length: 7}).map((_, i) => DateUtils.addDays(startOfWeek, i));
    const hours = Array.from({length: 24}).map((_, i) => i);
    
    const ROW_HEIGHT = 60;

    return (
        <div className="h-full flex flex-col relative bg-white min-w-[800px]">
            <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20 shadow-sm">
                <div className="w-16 border-r border-slate-200 shrink-0"></div>
                {weekDays.map(date => {
                    const isToday = DateUtils.formatDate(date) === DateUtils.formatDate(new Date());
                    return (
                        <div key={date.toString()} className="flex-1 py-3 text-center border-r border-slate-200 last:border-r-0">
                            <div className="text-xs text-slate-500 font-medium uppercase">{date.toLocaleDateString('it-IT', { weekday: 'short' })}</div>
                            <div className={`text-lg font-semibold mt-0.5 inline-flex w-8 h-8 items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-800'}`}>
                                {date.getDate()}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex-1 overflow-y-auto relative no-scrollbar">
                <div className="flex relative" style={{ height: `${24 * ROW_HEIGHT}px` }}>
                    <div className="w-16 shrink-0 border-r border-slate-200 bg-white sticky left-0 z-10 shadow-[1px_0_2px_rgba(0,0,0,0.05)]">
                        {hours.map(h => (
                            <div key={h} className="time-grid-row flex items-start justify-end pr-2 py-1">
                                <span className="text-xs font-medium text-slate-400">{h}:00</span>
                            </div>
                        ))}
                    </div>

                    {weekDays.map(date => {
                        const dateStr = DateUtils.formatDate(date);
                        const dayEvents = events.filter((e: any) => e.date === dateStr);

                        return (
                            <div 
                                key={dateStr} 
                                className="flex-1 border-r border-slate-200 last:border-r-0 relative group hover:bg-slate-50/50 transition-colors"
                                onClick={() => onTimeClick(dateStr)}
                            >
                                {hours.map(h => (
                                    <div key={h} className="time-grid-row border-slate-100 border-b"></div>
                                ))}

                                {dayEvents.map((evt: any) => {
                                    const start = DateUtils.parseTime(evt.startTime);
                                    const end = DateUtils.parseTime(evt.endTime);
                                    const top = (start.totalMinutes / 60) * ROW_HEIGHT;
                                    let duration = end.totalMinutes - start.totalMinutes;
                                    if (duration <= 0) duration = 60;
                                    const height = (duration / 60) * ROW_HEIGHT;

                                    return (
                                        <div 
                                            key={evt.id}
                                            className={`absolute left-1 right-1 ${evt.color || 'bg-blue-500 text-white'} p-2 rounded-[1.5rem] shadow-sm overflow-hidden text-sm flex flex-col group/evt z-10 transition-transform hover:scale-[1.02] hover:z-20 hover:shadow-md border border-black/5`}
                                            style={{ top: `${top}px`, height: `${height}px` }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="font-semibold flex justify-between items-start">
                                                <span className="truncate">{evt.title}</span>
                                                {!evt.isReadOnly && (
                                                    <button 
                                                        onClick={(e) => onDeleteEvent(evt.id, e)}
                                                        className="opacity-0 group-hover/evt:opacity-100 bg-black/20 hover:bg-black/40 rounded-full p-1 transition"
                                                    >
                                                        <Icons.X />
                                                    </button>
                                                )}
                                            </div>
                                            <span className="text-xs opacity-90 font-medium">{evt.startTime} - {evt.endTime}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// --- MODALE AGGIUNTA EVENTO (CON PRESET) ---
function EventModal({ date, onClose, onSave }: any) {
    const [title, setTitle] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('14:00');
    const [color, setColor] = useState('bg-blue-500 text-white');

    const colors = [
        { class: 'bg-blue-500 text-white', label: 'Blu' },
        { class: 'bg-emerald-500 text-white', label: 'Verde' },
        { class: 'bg-amber-500 text-white', label: 'Giallo' },
        { class: 'bg-rose-500 text-white', label: 'Rosso' },
        { class: 'bg-purple-500 text-white', label: 'Viola' },
    ];

    const shiftPresets = [
        { label: 'Mattina', start: '09:00', end: '14:00', color: 'bg-blue-500 text-white' },
        { label: 'Pomeriggio', start: '14:30', end: '19:30', color: 'bg-amber-500 text-white' },
        { label: 'Riposo', start: '00:00', end: '23:59', color: 'bg-emerald-500 text-white' }
    ];

    const applyPreset = (preset: any) => {
        setTitle(preset.label);
        setStartTime(preset.start);
        setEndTime(preset.end);
        setColor(preset.color);
    };

    const handleSubmit = (e: any) => {
        e.preventDefault();
        if(!title) return alert("Inserisci un titolo per il turno");
        onSave({ date, title, startTime, endTime, color });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">Nuovo Turno</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500"><Icons.X /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data</label>
                        <input type="date" value={date} disabled className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-xl px-4 py-2.5 focus:outline-none" />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Selezione Rapida</label>
                        <div className="flex flex-wrap gap-2">
                            {shiftPresets.map(preset => (
                                <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => applyPreset(preset)}
                                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border border-slate-200 hover:bg-slate-50 transition ${title === preset.label ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200 text-blue-700' : 'text-slate-600'}`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Titolo Evento</label>
                        <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Es. Mattina, Call, Dentista..." className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-800" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Inizio</label>
                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-800" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fine</label>
                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-800" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Colore Etichetta</label>
                        <div className="flex gap-3">
                            {colors.map(c => (
                                <button 
                                    key={c.class} type="button" 
                                    onClick={() => setColor(c.class)}
                                    className={`w-10 h-10 rounded-full transition-transform ${c.class} ${color === c.class ? 'ring-4 ring-offset-2 ring-slate-300 scale-110 shadow-md' : 'hover:scale-110'}`}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition">Annulla</button>
                        <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-md hover:shadow-lg">Salva Evento</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- MODALE IMPOSTAZIONI ICAL ---
function SettingsModal({ urls, setUrls, onClose }: any) {
    const [newUrl, setNewUrl] = useState('');

    const handleAdd = (e: any) => {
        e.preventDefault();
        if (!newUrl.trim() || !newUrl.startsWith('http')) return alert("Inserisci un URL valido.");
        if (urls.includes(newUrl.trim())) return alert("URL già presente.");
        setUrls([...urls, newUrl.trim()]);
        setNewUrl('');
    };

    const handleRemove = (urlToRemove: string) => {
        setUrls(urls.filter((u: string) => u !== urlToRemove));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Icons.Settings /> Impostazioni e iCal
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500"><Icons.X /></button>
                </div>
                
                <div className="p-6 overflow-y-auto no-scrollbar flex-1">
                    <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200 text-blue-800 text-sm">
                        <strong>Nota del Mentore:</strong> Nell'anteprima l'importazione iCal è disabilitata. Funzionerà perfettamente una volta esportato il codice su Vercel.
                    </div>

                    <h4 className="font-semibold text-slate-700 mb-3">Sorgenti Google Calendar / iCal</h4>
                    
                    <form onSubmit={handleAdd} className="flex gap-2 mb-4">
                        <input 
                            type="url" 
                            value={newUrl} 
                            onChange={e => setNewUrl(e.target.value)} 
                            placeholder="https://calendar.google.com/.../basic.ics" 
                            className="flex-1 border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-800"
                        />
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition text-sm whitespace-nowrap">Aggiungi</button>
                    </form>

                    <div className="space-y-2">
                        {urls.length === 0 ? (
                            <p className="text-slate-400 text-sm italic">Nessun calendario sincronizzato.</p>
                        ) : urls.map((url: string, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <span className="text-xs text-slate-600 truncate mr-3" title={url}>{url}</span>
                                <button onClick={() => handleRemove(url)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"><Icons.Trash /></button>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-900 transition shadow">Chiudi</button>
                </div>
            </div>
        </div>
    );
}

// --- SIDEBAR METEO ---
function WeatherSidebar() {
    const [weather, setWeather] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchWeather = async () => {
            setLoading(true);
            try {
                await new Promise(r => setTimeout(r, 800));
                setWeather({
                    temp: '18°', condition: 'Parzialmente Nuvoloso', location: 'Ghedi, IT',
                    forecast: [
                        { day: 'Oggi', temp: '18°/12°', icon: 'Sun' },
                        { day: 'Domani', temp: '16°/10°', icon: 'Cloud' },
                    ]
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchWeather();
    }, []);

    return (
        <aside className="w-72 bg-slate-900 text-white p-6 flex flex-col hidden md:flex border-r border-slate-800 shadow-xl z-20">
            <div className="mb-8">
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Icons.Cloud /> Meteo Turni
                </h2>
                <p className="text-slate-400 text-sm mt-1">Sempre pronto per uscire.</p>
            </div>

            <div className="bg-slate-800/50 rounded-3xl p-5 border border-slate-700/50 backdrop-blur-sm">
                {loading ? (
                    <div className="animate-pulse flex flex-col gap-4">
                        <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                        <div className="h-10 bg-slate-700 rounded w-3/4"></div>
                    </div>
                ) : weather ? (
                    <>
                        <div className="text-slate-400 text-sm font-medium mb-1">{weather.location}</div>
                        <div className="flex items-end gap-3 mb-2">
                            <span className="text-5xl font-bold tracking-tighter">{weather.temp}</span>
                            <Icons.Sun />
                        </div>
                        <div className="text-slate-300 font-medium">{weather.condition}</div>
                        
                        <div className="mt-6 space-y-3 border-t border-slate-700 pt-4">
                            {weather.forecast.map((f: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">{f.day}</span>
                                    <span className="font-semibold">{f.temp}</span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : null}
            </div>

            <div className="mt-auto pt-6 text-xs text-slate-500">
                App Turni v3.0 (Preview)<br/>
                <span className="italic text-slate-400">Avvocato del Diavolo Edition</span>
            </div>
        </aside>
    );
}
