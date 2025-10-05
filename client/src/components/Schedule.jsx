import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import config from '../config';
import { USER_DATA, getLoggedInUser } from '../utils/utils';
const API_URL = config.API_URL;


const userMap = new Map(USER_DATA.map(user => [user.fullName, user]));

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const getStartOfWeek = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};
const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};
const formatDate = (date) => date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
const getDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const isToday = (date) => date.toDateString() === getToday().toDateString();
const isTomorrow = (date) => {
    const tomorrow = new Date(getToday());
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
};
const getActivityIcon = (task) => {
    if (!task) return '📋';
    const t = task.toLowerCase();
    if (t.includes('monitoraggio') || t.includes('monitoring')) return '🔵';
    if (t.includes('sondaggi') || t.includes('survey')) return '🟡';
    if (t.includes('installazione') || t.includes('install')) return '⚙️';
    if (t.includes('prescavo')) return '🔨';
    if (t.includes('bonifiche')) return '♻️';
    return '📋';
};
const getActivityColor = (task) => {
    if (!task) return 'bg-gray-50 border-gray-200';
    const t = task.toLowerCase();
    if (t.includes('monitoraggio')) return 'bg-blue-50 border-blue-200';
    if (t.includes('sondaggi')) return 'bg-amber-50 border-amber-200';
    if (t.includes('installazione')) return 'bg-purple-50 border-purple-200';
    if (t.includes('prescavo')) return 'bg-orange-50 border-orange-200';
    if (t.includes('bonifiche')) return 'bg-green-50 border-green-200';
    return 'bg-gray-50 border-gray-200';
};


// ============================================================================
// CHILD COMPONENTS
// ============================================================================

// [RESTORED] BottomNav for mobile navigation
// You can rename the component from BottomNav to MobileNav
const BottomNav = ({ activeView, onViewChange }) => {
    const navItems = [
        { id: 'today', icon: '📅', label: 'Oggi' },
        { id: 'week', icon: '📆', label: 'Settimana' },
        { id: 'team', icon: '👥', label: 'Team' },
        { id: 'calendar', icon: '🗓️', label: 'Mese' },
    ];

    return (
        // [MODIFIED] Removed fixed positioning and changed border-t to border-b
        <div className="bg-white border-b border-gray-200 md:hidden">
            <div className="grid grid-cols-4 h-16 max-w-7xl mx-auto">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        className={`flex flex-col items-center justify-center transition-all ${
                            activeView === item.id ? 'text-indigo-600' : 'text-gray-500'
                        }`}
                    >
                        <span className="text-xl mb-0.5">{item.icon}</span>
                        <span className="text-xs font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const ActivityCard = ({ employee, date, task, onTap }) => (
    <div onClick={() => onTap({ employee, date, task })} className={`${getActivityColor(task)} border-l-4 rounded-lg p-4 mb-3 active:scale-98 transition-transform cursor-pointer shadow-sm`}>
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                    <span className="text-2xl">{getActivityIcon(task)}</span>
                    <span className="font-semibold text-gray-900">{employee}</span>
                </div>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">{task}</p>
            </div>
            {(isToday(new Date(date)) || isTomorrow(new Date(date))) && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${isToday(new Date(date)) ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isToday(new Date(date)) ? 'OGGI' : 'DOMANI'}
                </span>
            )}
        </div>
        <div className="flex items-center mt-3 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {formatDate(new Date(date))}
        </div>
    </div>
);

const DetailModal = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;
    const userData = userMap.get(data.employee);
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-end md:items-center justify-center" onClick={onClose}>
            <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 rounded-t-2xl z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <span className="text-3xl">{getActivityIcon(data.task)}</span>
                            <div>
                                <h3 className="text-lg font-bold text-white">{data.employee}</h3>
                                <p className="text-xs text-indigo-100">{formatDate(new Date(data.date))}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Attività</h4>
                        <p className="text-gray-800 leading-relaxed">{data.task}</p>
                    </div>
                    {userData && (
                        <div className="space-y-3">
                            {userData.phone && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    <span>{userData.phone}</span>
                                </div>
                            )}
                            {userData.city && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <span>{userData.city}</span>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex space-x-3">
                        <a href={`tel:${userData?.phone?.replace(/[^0-9]/g, '')}`} className={`flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 active:scale-95 transition-transform ${!userData?.phone ? 'opacity-50 pointer-events-none' : ''}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            <span>Chiama</span>
                        </a>
                        <button className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors">Mappa</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TodayView = ({ schedules, employees, onActivityTap }) => {
    const todayKey = getDateKey(getToday());
    const todayActivities = useMemo(() => employees.map(emp => schedules[emp]?.[todayKey] ? { employee: emp, date: todayKey, task: schedules[emp][todayKey].task } : null).filter(Boolean), [schedules, employees, todayKey]);
    return (
        <div className="pb-4">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-4 py-6 mb-4 rounded-b-3xl">
                <h2 className="text-2xl font-bold mb-1">Oggi</h2>
                <p className="text-indigo-100">{getToday().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <div className="mt-3 text-sm text-indigo-100">{todayActivities.length} {todayActivities.length === 1 ? 'attività' : 'attività'}</div>
            </div>
            <div className="px-4">
                {todayActivities.length > 0 ? (
                    todayActivities.map((act, idx) => <ActivityCard key={idx} {...act} onTap={onActivityTap} />)
                ) : (
                    <div className="text-center py-16"><div className="text-6xl mb-4">☕</div><p className="text-gray-500 font-medium">Nessuna attività oggi</p><p className="text-gray-400 text-sm mt-2">Goditi la giornata!</p></div>
                )}
            </div>
        </div>
    );
};

const WeekView = ({ schedules, employees, onActivityTap, currentWeekStart }) => {
    const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + i)), [currentWeekStart]);
    return (
        <div className="pb-4">
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white px-4 py-6 mb-4 rounded-b-3xl">
                <h2 className="text-2xl font-bold mb-1">Settimana</h2>
                <p className="text-purple-100">{weekDays[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} - {weekDays[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</p>
            </div>
            <div className="px-4">
                {weekDays.map((date, dayIdx) => {
                    if (date.getDay() === 0 || date.getDay() === 6) return null;
                    const dateKey = getDateKey(date);
                    const dayActivities = employees.map(emp => schedules[emp]?.[dateKey] ? { employee: emp, date: dateKey, task: schedules[emp][dateKey].task } : null).filter(Boolean);
                    return (
                        <div key={dayIdx} className="mb-6">
                            <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-gray-800 capitalize">{date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</h3><span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{dayActivities.length} {dayActivities.length === 1 ? 'attività' : 'attività'}</span></div>
                            {dayActivities.length > 0 ? (dayActivities.map((act, actIdx) => <ActivityCard key={actIdx} {...act} onTap={onActivityTap} />)) : (<div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><p className="text-gray-400 text-sm">Nessuna attività</p></div>)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const TeamView = ({ schedules, employees, onActivityTap }) => {
    const todayKey = getDateKey(getToday());
    return (
        <div className="pb-4">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white px-4 py-6 mb-4 rounded-b-3xl">
                <h2 className="text-2xl font-bold mb-1">Team</h2>
                <p className="text-emerald-100">{employees.length} tecnici attivi</p>
            </div>
            <div className="px-4 space-y-3">
                {employees.map((employee, idx) => {
                    const todayTask = schedules[employee]?.[todayKey];
                    const userData = userMap.get(employee);
                    return (
                        <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center space-x-3 mb-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">{employee.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                                <div className="flex-1"><h3 className="font-semibold text-gray-900">{employee}</h3><p className="text-xs text-gray-500">{userData?.city || 'Tecnico'}</p></div>
                                {userData?.phone && (<a href={`tel:${userData.phone.replace(/[^0-9]/g, '')}`} className="p-2 bg-indigo-50 rounded-full text-indigo-600 hover:bg-indigo-100 transition-colors" onClick={e => e.stopPropagation()}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></a>)}
                            </div>
                            {todayTask ? (<div onClick={() => onActivityTap({ employee, date: todayKey, task: todayTask.task })} className={`${getActivityColor(todayTask.task)} border-l-4 rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow`}><div className="flex items-center space-x-2 mb-1"><span className="text-lg">{getActivityIcon(todayTask.task)}</span><span className="text-xs font-semibold text-gray-600 bg-white px-2 py-0.5 rounded-full">OGGI</span></div><p className="text-sm text-gray-700 mt-1">{todayTask.task}</p></div>) : (<div className="bg-gray-50 rounded-lg p-3 text-center border-2 border-dashed border-gray-200"><p className="text-xs text-gray-400">Nessuna attività oggi</p></div>)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const CalendarView = ({ schedules, employees, currentMonth, onActivityTap }) => {
    const monthDays = useMemo(() => {
        const year = currentMonth.getFullYear(), month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1), lastDay = new Date(year, month + 1, 0);
        const days = [];
        const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        for (let i = 0; i < startPadding; i++) days.push(null);
        for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
        return days;
    }, [currentMonth]);
    const getActivitiesForDay = date => date ? employees.map(emp => schedules[emp]?.[getDateKey(date)] ? { employee: emp, task: schedules[emp][getDateKey(date)].task } : null).filter(Boolean) : [];
    return (
        <div className="pb-4">
            <div className="px-4">
                <div className="grid grid-cols-7 mb-2">
                    {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {monthDays.map((date, idx) => {
                        if (!date) return <div key={idx} className="aspect-square"></div>;
                        const activities = getActivitiesForDay(date);
                        const isToday_ = isToday(date);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        return (
                            <div key={idx} onClick={() => activities.length > 0 && onActivityTap({ employee: activities[0].employee, date: getDateKey(date), task: activities[0].task })}
                                 className={`aspect-square border rounded-lg p-1 flex flex-col items-center justify-start transition-all ${isToday_ ? 'border-indigo-600 bg-indigo-50 shadow-md' : isWeekend ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'} ${activities.length > 0 ? 'cursor-pointer hover:shadow-md' : ''}`}>
                                <span className={`text-xs font-bold ${isToday_ ? 'text-indigo-600' : isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>{date.getDate()}</span>
                                {activities.length > 0 && <div className="w-full mt-auto flex justify-center items-center gap-0.5"><div className="w-1 h-1 bg-indigo-500 rounded-full"></div></div>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const UploadSection = ({ onUploadSuccess }) => {
    const [file, setFile] = useState(null);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth());
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState('');
    const handleUpload = async () => {
        if (!file) { setMessage({ type: 'error', text: 'Seleziona un file.' }); return; }
        setIsUploading(true); setMessage('');
        const formData = new FormData();
        formData.append('scheduleFile', file);
        formData.append('year', year);
        formData.append('month', month);
        try {
            const response = await fetch(`${API_URL}/schedule/upload`, { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Upload failed');
            setMessage({ type: 'success', text: 'Upload riuscito! Schedule aggiornato.' });
            setFile(null);
            onUploadSuccess();
            setTimeout(() => setMessage(''), 5000);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsUploading(false);
        }
    };
    const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><span className="mr-2">📤</span>Carica Schedule</h3>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Mese</label><select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="w-full p-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">{months.map((m, i) => <option key={i} value={i}>{m}</option>)}</select></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Anno</label><input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" /></div>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">File CSV</label><input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" /></div>
                <button onClick={handleUpload} disabled={isUploading || !file} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors flex items-center justify-center">{isUploading ? <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Caricamento...</> : 'Carica & Processa'}</button>
                {message && <div className={`p-3 rounded-lg text-sm text-center ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>{message.text}</div>}
            </div>
        </div>
    );
};

// ============================================================================
// [RESTORED] MAIN SCHEDULE COMPONENT
// ============================================================================
const Schedule = () => {
    const [employeeSchedules, setEmployeeSchedules] = useState({});
    const [fullEmployeeList, setFullEmployeeList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [mostRecentSchedule, setMostRecentSchedule] = useState(null);

    const [loggedInUser, setLoggedInUser] = useState(null);
    const [viewMode, setViewMode] = useState('personal');
    const [activeMobileView, setActiveMobileView] = useState('today');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState(null);
    const [currentDate, setCurrentDate] = useState(getToday());

    const displayedEmployees = useMemo(() => {
        if (viewMode === 'personal' && loggedInUser?.fullName && fullEmployeeList.includes(loggedInUser.fullName)) {
            return [loggedInUser.fullName];
        }
        return fullEmployeeList;
    }, [viewMode, loggedInUser, fullEmployeeList]);
    
    const processCSVData = useCallback((csvContent, year, month) => {
        const schedules = {};
        const employees = new Set();
        let dayNumberRowIndex = -1, dayNumberRow;
        
        // Ensure Papa.parse is correctly used
        const results = Papa.parse(csvContent, { skipEmptyLines: true });
        const data = results.data;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const numericCells = row.slice(1).filter(cell => !isNaN(parseInt(cell)) && parseInt(cell) > 0 && parseInt(cell) < 32).length;
            if (numericCells > row.length / 2) {
                dayNumberRowIndex = i; dayNumberRow = row; break;
            }
        }
        if (dayNumberRowIndex === -1) {
            console.error("Could not find day number row in CSV");
            return { schedules: {}, employees: [] };
        }

        const dayMapping = {};
        for (let i = 1; i < dayNumberRow.length; i++) {
            const dayNum = parseInt(dayNumberRow[i]);
            if (!isNaN(dayNum)) dayMapping[i] = dayNum;
        }

        for (let i = dayNumberRowIndex + 1; i < data.length; i++) {
            const row = data[i];
            const employeeNameRaw = row[0];
            if (!employeeNameRaw) continue;
            const cleanName = employeeNameRaw.split('\n')[0].trim();
            const irrelevantNames = ['SCOPERTI', 'UFFICIO BONIFICHE', 'IMPIANTI/ ARESE'];
            if (!cleanName || irrelevantNames.some(name => cleanName.startsWith(name))) continue;
            
            employees.add(cleanName);
            if (!schedules[cleanName]) schedules[cleanName] = {};

            let lastTask = null;
            for (let colIndex = 1; colIndex < row.length; colIndex++) {
                const dayNum = dayMapping[colIndex];
                if (!dayNum) continue;
                const taskInCell = row[colIndex]?.trim();
                if (taskInCell && taskInCell !== '' && taskInCell !== '-') lastTask = taskInCell;
                if (lastTask) {
                    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    schedules[cleanName][dateString] = { task: lastTask };
                }
            }
        }
        return { schedules, employees: Array.from(employees).sort() };
    }, []);

    const fetchAndLoadSchedules = useCallback(async () => {
        try {
            setIsLoading(true); setError('');
            const response = await fetch(`${API_URL}/schedule/all`);
            if (!response.ok) throw new Error('Failed to fetch schedules.');
            const data = await response.json();
            if (data.length > 0) {
                const mostRecent = data.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
                setMostRecentSchedule(mostRecent);
                const { schedules, employees } = processCSVData(mostRecent.csvContent, mostRecent.year, mostRecent.month);
                setEmployeeSchedules(schedules);
                setFullEmployeeList(employees);
            } else {
                setError('No schedules found. Please upload one.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [processCSVData]);

    useEffect(() => {
        setLoggedInUser(getLoggedInUser());
        fetchAndLoadSchedules();
    }, [fetchAndLoadSchedules]);

    const handleActivityTap = data => { setModalData(data); setIsModalOpen(true); };
    const handleDateChange = (direction) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + direction);
            return newDate;
        });
    };
    
    if (isLoading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
    
    if (error && !mostRecentSchedule) return (
        <div className="p-4 md:grid md:grid-cols-3 md:gap-8">
            <div className="md:col-start-2"><UploadSection onUploadSuccess={fetchAndLoadSchedules} /></div>
            <div className="text-center p-8 text-red-500 md:col-span-3">{error}</div>
        </div>
    );
    
    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-16 md:pb-0">
            <BottomNav activeView={activeMobileView} onViewChange={setActiveMobileView} />

            <DetailModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={modalData} />
            
            {/* --- DESKTOP HEADER --- */}
            <header className="hidden md:flex items-center justify-between p-4 bg-white border-b sticky top-0 z-40">
                <h1 className="text-xl font-bold text-gray-800">Schedule</h1>
                <div className="flex items-center space-x-4">
                    {loggedInUser && (
                        <div className="flex items-center p-1 bg-gray-100 rounded-lg">
                            <button onClick={() => setViewMode('personal')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${viewMode === 'personal' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}>My Schedule</button>
                            <button onClick={() => setViewMode('team')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${viewMode === 'team' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}>Team View</button>
                        </div>
                    )}
                    <div className="flex items-center space-x-2">
                        <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-gray-100 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                        <h2 className="font-bold text-gray-800 w-40 text-center capitalize">{currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</h2>
                        <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-gray-100 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT GRID --- */}
            <div className="md:grid md:grid-cols-3 md:gap-8 md:p-4">
                <aside className="hidden md:block space-y-6">
                    <UploadSection onUploadSuccess={fetchAndLoadSchedules} />
                    {mostRecentSchedule && <div className="bg-white p-4 rounded-xl shadow-lg border"><h4 className="font-bold mb-2">File Corrente</h4><p className="text-sm text-gray-600 break-words">{mostRecentSchedule.fileName}</p><p className="text-xs text-gray-400 mt-1">Caricato: {new Date(mostRecentSchedule.uploadedAt).toLocaleString('it-IT')}</p></div>}
                </aside>
                
                <main className="md:col-span-2">
                    {/* Desktop View */}
                    <div className="hidden md:block bg-white rounded-xl shadow-lg border p-4">
                        <CalendarView schedules={employeeSchedules} employees={displayedEmployees} currentMonth={currentDate} onActivityTap={handleActivityTap} />
                    </div>
                    {/* Mobile View */}
                    <div className="md:hidden">
                        {activeMobileView === 'today' && <TodayView schedules={employeeSchedules} employees={displayedEmployees} onActivityTap={handleActivityTap} />}
                        {activeMobileView === 'week' && <WeekView schedules={employeeSchedules} employees={displayedEmployees} onActivityTap={handleActivityTap} currentWeekStart={getStartOfWeek(currentDate)} />}
                        {activeMobileView === 'team' && <TeamView schedules={employeeSchedules} employees={fullEmployeeList} onActivityTap={handleActivityTap} />}
                        {activeMobileView === 'calendar' && <CalendarView schedules={employeeSchedules} employees={displayedEmployees} currentMonth={currentDate} onActivityTap={handleActivityTap} />}
                    </div>
                </main>
            </div>
            
        </div>
    );
};

export default Schedule;