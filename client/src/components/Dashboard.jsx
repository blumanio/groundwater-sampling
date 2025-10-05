import React, { useState, useMemo, useCallback } from 'react';
import Papa from 'papaparse';

// ============================================================================
// UTILITY FUNCTIONS (Re-using logic from Schedule.js)
// ============================================================================
const getStartOfWeek = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};

const getDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const processCSVData = (csvContent, year, month) => {
    const schedules = {};
    if (!csvContent) return schedules;

    const results = Papa.parse(csvContent, { skipEmptyLines: true });
    const data = results.data;
    let dayNumberRowIndex = -1, dayNumberRow;

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const numericCells = row.slice(1).filter(cell => !isNaN(parseInt(cell)) && parseInt(cell) > 0 && parseInt(cell) < 32).length;
        if (numericCells > row.length / 2) {
            dayNumberRowIndex = i; dayNumberRow = row; break;
        }
    }
    if (dayNumberRowIndex === -1) return schedules;

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
        if (!cleanName) continue;
        
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
    return schedules;
};

// ============================================================================
// [FIXED] My Week Component
// ============================================================================
const MyWeek = ({ loggedInUser, employeeSchedules }) => {
    const getInitialWeekStart = () => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
        if (dayOfWeek === 6 || dayOfWeek === 0) {
            // It's a weekend, show next week
            const nextMonday = new Date(today);
            nextMonday.setDate(today.getDate() + (8 - dayOfWeek));
            return getStartOfWeek(nextMonday);
        }
        // It's a weekday, show the current week
        return getStartOfWeek(today);
    };

    const [currentWeekStart, setCurrentWeekStart] = useState(getInitialWeekStart);

    const handleWeekChange = (direction) => {
        setCurrentWeekStart(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(newDate.getDate() + (7 * direction));
            return newDate;
        });
    };

    const weeklyTasks = useMemo(() => {
        if (!loggedInUser || !employeeSchedules) return [];
        
        const weekDays = Array.from({ length: 5 }).map((_, i) => {
            const date = new Date(currentWeekStart);
            date.setDate(currentWeekStart.getDate() + i);
            return date;
        });
        
        const userSchedule = employeeSchedules[loggedInUser.fullName];

        return weekDays.map(date => {
            const dateKey = getDateKey(date);
            const task = userSchedule && userSchedule[dateKey] ? userSchedule[dateKey].task : null;
            return { date, task };
        });
    }, [loggedInUser, employeeSchedules, currentWeekStart]);

    if (!loggedInUser) return null;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">My Week at a Glance</h2>
                <div className="flex items-center space-x-2">
                    <button onClick={() => handleWeekChange(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={() => handleWeekChange(1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>
            <div className="space-y-3">
                {weeklyTasks.map(({ date, task }, index) => (
                    <div key={index} className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <div className="w-16 text-center flex-shrink-0">
                            <p className="font-bold text-indigo-600 text-sm">{date.toLocaleDateString('it-IT', { weekday: 'short' })}</p>
                            <p className="text-gray-600 text-lg">{date.getDate()}</p>
                        </div>
                        <div className="border-l border-gray-200 pl-4 ml-4 flex-1 min-w-0">
                            <p className="text-sm text-gray-800 truncate">{task || 'Nessuna attività programmata'}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// Colleague & Project Search Components (Unchanged)
// ============================================================================
const ColleagueSearch = ({ userData }) => { /* ... no changes ... */ };
const ProjectSearch = ({ commesse }) => { /* ... no changes ... */ };

// ============================================================================
// MAIN UPDATED DASHBOARD COMPONENT
// ============================================================================
const Dashboard = ({ receipts, commesse, schedule, loggedInUser, userData, setPage }) => {

    // [NEW] Parse the schedule data here once, and pass it down to children
    const employeeSchedules = useMemo(() => {
        if (!schedule) return {};
        return processCSVData(schedule.csvContent, schedule.year, schedule.month);
    }, [schedule]);

    const totalReceipts = receipts.length;
    const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);
    
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Bentornato, {loggedInUser?.fullName?.split(' ')[0]}!</h1>
                <p className="text-gray-500 capitalize">Ecco il tuo riepilogo per oggi, {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <MyWeek loggedInUser={loggedInUser} employeeSchedules={employeeSchedules} />
                    <ProjectSearch commesse={commesse} />
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Azioni Rapide</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <button className="flex flex-col items-center bg-gray-100 p-4 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => setPage('receipts')}>
                                <i className="fas fa-camera text-2xl text-indigo-500 mb-2"></i>
                                <span className="text-sm font-medium text-center">Aggiungi Scontrino</span>
                            </button>
                            <button className="flex flex-col items-center bg-gray-100 p-4 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => setPage('reports')}>
                                <i className="fas fa-file-pdf text-2xl text-indigo-500 mb-2"></i>
                                <span className="text-sm font-medium text-center">Crea Report</span>
                            </button>
                        </div>
                    </div>

                    <ColleagueSearch userData={userData} />

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Statistiche Scontrini</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center"><p className="text-gray-600">Scontrini totali</p><p className="font-bold text-indigo-600">{totalReceipts}</p></div>
                            <div className="flex justify-between items-center"><p className="text-gray-600">Importo totale</p><p className="font-bold text-indigo-600">€{totalAmount.toFixed(2)}</p></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;