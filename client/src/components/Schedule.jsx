import React, { useState, useMemo, useEffect } from 'react';
// import { useAuth } from '../auth/AuthContext'; // Import useAuth to identify the admin
import Papa from 'papaparse';

import config from '../config';
//const API_URL = 'http://localhost:5000/api';

// --- Helper Functions & Child Components (No changes needed) ---
const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};
const ActivityDisplay = ({ taskInfo, onTaskClick }) => {
    if (!taskInfo || !taskInfo.task) return <span className="text-gray-400">No activity scheduled</span>;
    const maxLength = 60;
    const isTruncated = taskInfo.task.length > maxLength;
    return (
        <div onClick={() => onTaskClick(taskInfo.task)} className="cursor-pointer hover:opacity-80 transition-opacity">
            {isTruncated ? `${taskInfo.task.substring(0, maxLength)}...` : taskInfo.task}
            {isTruncated && <span className="ml-2 text-indigo-600 font-semibold text-xs">[Read More]</span>}
        </div>
    );
};
const ActivityModal = ({ content, onClose }) => {
    if (!content) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-lg w-full" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Full Activity Details</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{content}</p>
                <button onClick={onClose} className="mt-4 bg-indigo-600 text-white py-2 px-4 rounded-md">Close</button>
            </div>
        </div>
    );
};


// --- Main Schedule Component ---
const Schedule = () => {
   // const { user } = useAuth(); // Get the current logged-in user
  const API_URL = config.API_URL;

    // State
    const [employeeSchedules, setEmployeeSchedules] = useState({});
    const [employeeList, setEmployeeList] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentDate, setCurrentDate] = useState(getStartOfWeek(new Date()));
    const [scheduleMeta, setScheduleMeta] = useState(null); // To store filename and upload date
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [modalContent, setModalContent] = useState(null);

    // NEW: Check if the current user is an admin
    const isAdmin = true
    //user && user.email === 'your-admin-email@yourcompany.com'; // IMPORTANT: Set your admin email

    // NEW: Fetch the latest schedule from the server when the component loads
    useEffect(() => {
        const fetchLatestSchedule = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${API_URL}/schedule/latest`);
                if (!response.ok) {
                    throw new Error('No schedule found. An admin needs to upload one.');
                }
                const data = await response.json();
                setScheduleMeta({ fileName: data.fileName, uploadedAt: data.uploadedAt });
                
                // Parse the CSV content received from the server
                Papa.parse(data.csvContent, {
                    header: false,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const { schedules, employees } = processCSVData(results.data);
                        setEmployeeSchedules(schedules);
                        setEmployeeList(employees);
                    }
                });
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLatestSchedule();
    }, []);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('scheduleFile', file);

        try {
            const response = await fetch(`${API_URL}/schedule/upload`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            
            // Success! Now refresh the data from the server
            window.location.reload(); // Simple way to force a full refresh

        } catch (err) {
            setError(err.message || 'File upload failed.');
            setIsLoading(false);
        }
    };

    const processCSVData = (data) => {
        // ... The intelligent CSV processor (no changes needed here)
        const schedules = {};
        const employees = new Set();
        const year = 2025; const monthNum = 8;
        let dayNumberRowIndex = -1;
        let dayNumberRow;
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const numericCells = row.slice(1).filter(cell => !isNaN(parseInt(cell)) && parseInt(cell) > 0 && parseInt(cell) < 32).length;
            if (numericCells > row.length / 2) { dayNumberRowIndex = i; dayNumberRow = row; break; }
        }
        if (dayNumberRowIndex === -1) return { schedules: {}, employees: [] };
        const dayMapping = {};
        for (let i = 1; i < dayNumberRow.length; i++) {
            const dayNum = parseInt(dayNumberRow[i]);
            if (!isNaN(dayNum)) dayMapping[i] = dayNum;
        }
        for (let i = dayNumberRowIndex + 1; i < data.length; i++) {
            const row = data[i]; const employeeNameRaw = row[0]; if (!employeeNameRaw) continue;
            const cleanName = employeeNameRaw.split('\n')[0].trim();
            const irrelevantNames = ['SCOPERTI', 'UFFICIO BONIFICHE', 'IMPIANTI/ ARESE'];
            if (!cleanName || irrelevantNames.some(name => cleanName.startsWith(name))) continue;
            employees.add(cleanName); if (!schedules[cleanName]) schedules[cleanName] = {};
            let lastTask = null;
            for (let colIndex = 1; colIndex < row.length; colIndex++) {
                const dayNum = dayMapping[colIndex]; if (!dayNum) continue;
                const currentDate = new Date(year, monthNum, dayNum);
                const dayOfWeek = currentDate.getDay();
                const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;
                const taskInCell = row[colIndex]?.trim();
                if (taskInCell && taskInCell !== '' && taskInCell !== '-') { lastTask = taskInCell; }
                if (lastTask && isWeekday) {
                    const dateString = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    schedules[cleanName][dateString] = { task: lastTask, isStart: true, duration: 1 };
                }
            }
        }
        return { schedules, employees: Array.from(employees).sort() };
    };
    
    // --- Memoized Values & Navigation ---
    const filteredEmployees = useMemo(() => {
        if (!searchTerm) return employeeList;
        return employeeList.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm, employeeList]);

    const weekData = useMemo(() => {
        const start = getStartOfWeek(currentDate);
        const week = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            const dateString = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
            week.push({
                date: day,
                taskInfo: selectedEmployee ? employeeSchedules[selectedEmployee]?.[dateString] || null : null,
            });
        }
        return week;
    }, [currentDate, selectedEmployee, employeeSchedules]);
    
    const navigateWeek = (direction) => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(newDate.getDate() + (7 * direction));
            return newDate;
        });
    };
    
    const weekRangeString = `${weekData[0].date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} - ${weekData[6].date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
            <ActivityModal content={modalContent} onClose={() => setModalContent(null)} />
            
            <header className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        <i className="fas fa-calendar-alt text-indigo-500 mr-2"></i>
                        Company Schedule
                    </h2>
                    {scheduleMeta && (
                        <p className="text-xs text-gray-500 mt-1">
                            Last Updated: {new Date(scheduleMeta.uploadedAt).toLocaleString('it-IT')} ({scheduleMeta.fileName})
                        </p>
                    )}
                </div>
                {/* NEW: Admin-only upload section */}
                {isAdmin && (
                    <div>
                        <label htmlFor="csvInput" className={`text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center cursor-pointer ${isLoading ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'}`}>
                            <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-upload'} mr-2`}></i>
                            {isLoading ? 'Uploading...' : 'Upload New Schedule'}
                        </label>
                        <input id="csvInput" type="file" accept=".csv" onChange={handleFileUpload} className="sr-only" disabled={isLoading} />
                    </div>
                )}
            </header>
            
            {error && <div className="bg-red-100 text-red-700 p-3 rounded-md">{error}</div>}
            {isLoading && employeeList.length === 0 && <p className="text-center text-gray-500">Loading schedule...</p>}

            {employeeList.length > 0 && (
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Find an Employee</label>
                        <input type="text" placeholder="Type to search..." className="w-full md:w-1/3 p-2 border border-gray-300 rounded-md shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={() => navigateWeek(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><i className="fas fa-chevron-left"></i></button>
                            <h3 className="text-xl font-semibold text-gray-800 text-center">
                                {weekRangeString}
                                {selectedEmployee && <p className="text-sm font-normal text-indigo-600">{selectedEmployee}</p>}
                            </h3>
                            <button onClick={() => navigateWeek(1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><i className="fas fa-chevron-right"></i></button>
                        </div>
                        
                        <div className="grid grid-cols-5 gap-4">
                            <div className="col-span-1 border-r pr-4">
                                <h4 className="font-bold text-center mb-2">Employees</h4>
                                <div className="border rounded-md max-h-[60vh] overflow-y-auto">
                                    {filteredEmployees.map(name => (
                                        <button key={name} onClick={() => setSelectedEmployee(name)} className={`w-full text-left p-2 text-sm ${selectedEmployee === name ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'}`}>
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="col-span-4">
                                {selectedEmployee ? (
                                    <div className="border border-gray-200 rounded-lg p-2 space-y-1">
                                        {weekData.map(({ date, taskInfo }) => {
                                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                            const taskColor = taskInfo ? `hsl(${taskInfo.task.length * 10 % 360}, 90%, 95%)` : (isWeekend ? '#f9fafb' : 'white');
                                            const borderColor = taskInfo ? `hsl(${taskInfo.task.length * 10 % 360}, 70%, 80%)` : (isWeekend ? '#e5e7eb' : 'transparent');
                                            return (
                                                <div key={date.toISOString()} className="grid grid-cols-6 gap-4 items-center p-2 rounded-md" style={{ backgroundColor: taskColor, borderLeft: `4px solid ${borderColor}` }}>
                                                    <div className={`col-span-1 text-center font-semibold ${isWeekend ? 'text-gray-400' : ''}`}>
                                                        <p className="text-lg text-gray-800">{date.getDate()}</p>
                                                        <p className="text-xs">{date.toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase()}</p>
                                                    </div>
                                                    <div className="col-span-5 flex items-center p-2 text-sm font-medium text-gray-800">
                                                        <ActivityDisplay taskInfo={taskInfo} onTaskClick={setModalContent} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-500 pt-20">Please select an employee to view their schedule.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Schedule;