import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import config from '../config';

// --- Helper Functions & Child Components ---
const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};

const ActivityDisplay = ({ taskInfo, onTaskClick }) => {
    if (!taskInfo || !taskInfo.task) {
        return <span className="text-gray-400 text-sm">No activity</span>;
    }
    
    const maxLength = window.innerWidth < 768 ? 30 : 60;
    const isTruncated = taskInfo.task.length > maxLength;
    
    return (
        <div 
            onClick={() => onTaskClick(taskInfo.task)} 
            className="cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
        >
            <span className="text-sm md:text-base">
                {isTruncated ? `${taskInfo.task.substring(0, maxLength)}...` : taskInfo.task}
            </span>
            {isTruncated && (
                <span className="ml-2 text-indigo-600 font-semibold text-xs">
                    [More]
                </span>
            )}
        </div>
    );
};

const ActivityModal = ({ content, onClose }) => {
    if (!content) return null;
    
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 p-4" 
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-t-xl md:rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white border-b px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800">Activity Details</h3>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="p-6">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</p>
                </div>
            </div>
        </div>
    );
};

const EmployeeSelector = ({ employees, selectedEmployee, onSelect, searchTerm, onSearchChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (employee) => {
        onSelect(employee);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            {/* Mobile Dropdown */}
            <div className="md:hidden">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between"
                >
                    <span className={selectedEmployee ? 'text-gray-900' : 'text-gray-500'}>
                        {selectedEmployee || 'Select Employee'}
                    </span>
                    <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-auto">
                        <div className="p-3 border-b">
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="py-1">
                            {employees.map(name => (
                                <button
                                    key={name}
                                    onClick={() => handleSelect(name)}
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 ${
                                        selectedEmployee === name ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-700'
                                    }`}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="border rounded-lg max-h-[60vh] overflow-y-auto">
                    {employees.map(name => (
                        <button
                            key={name}
                            onClick={() => onSelect(name)}
                            className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 last:border-b-0 transition-colors ${
                                selectedEmployee === name 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'hover:bg-gray-50 text-gray-700'
                            }`}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Main Schedule Component ---
const Schedule = () => {
    const API_URL = config.API_URL;

    // State
    const [employeeSchedules, setEmployeeSchedules] = useState({});
    const [employeeList, setEmployeeList] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentDate, setCurrentDate] = useState(getStartOfWeek(new Date()));
    const [scheduleMeta, setScheduleMeta] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [modalContent, setModalContent] = useState(null);

    const isAdmin = true;

    // Fetch schedule
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
    }, [API_URL]);

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

            window.location.reload();
        } catch (err) {
            setError(err.message || 'File upload failed.');
            setIsLoading(false);
        }
    };

    const processCSVData = (data) => {
        const schedules = {};
        const employees = new Set();
        const year = 2025; 
        const monthNum = 8;
        let dayNumberRowIndex = -1;
        let dayNumberRow;
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const numericCells = row.slice(1).filter(cell => !isNaN(parseInt(cell)) && parseInt(cell) > 0 && parseInt(cell) < 32).length;
            if (numericCells > row.length / 2) { 
                dayNumberRowIndex = i; 
                dayNumberRow = row; 
                break; 
            }
        }
        
        if (dayNumberRowIndex === -1) return { schedules: {}, employees: [] };
        
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
                const currentDate = new Date(year, monthNum, dayNum);
                const dayOfWeek = currentDate.getDay();
                const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;
                const taskInCell = row[colIndex]?.trim();
                
                if (taskInCell && taskInCell !== '' && taskInCell !== '-') { 
                    lastTask = taskInCell; 
                }
                
                if (lastTask && isWeekday) {
                    const dateString = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    schedules[cleanName][dateString] = { task: lastTask, isStart: true, duration: 1 };
                }
            }
        }
        return { schedules, employees: Array.from(employees).sort() };
    };

    // Memoized values
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

    const weekRangeString = `${weekData[0].date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} - ${weekData[6].date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
            <ActivityModal content={modalContent} onClose={() => setModalContent(null)} />

            {/* Header */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-40">
                <div className="px-4 py-4 md:px-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center">
                                📅 <span className="ml-2">Company Schedule</span>
                            </h1>
                            {scheduleMeta && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Updated: {new Date(scheduleMeta.uploadedAt).toLocaleDateString('it-IT')} ({scheduleMeta.fileName})
                                </p>
                            )}
                        </div>

                        {isAdmin && (
                            <div className="flex-shrink-0">
                                <label 
                                    htmlFor="csvInput" 
                                    className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                        isLoading 
                                            ? 'bg-gray-400 text-white cursor-not-allowed' 
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md active:scale-95'
                                    }`}
                                >
                                    <svg className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {isLoading ? (
                                            <circle cx="12" cy="12" r="10" strokeWidth={2} strokeDasharray="31.416" strokeDashoffset="31.416">
                                                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                                            </circle>
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        )}
                                    </svg>
                                    {isLoading ? 'Uploading...' : 'Upload Schedule'}
                                </label>
                                <input 
                                    id="csvInput" 
                                    type="file" 
                                    accept=".csv" 
                                    onChange={handleFileUpload} 
                                    className="sr-only" 
                                    disabled={isLoading} 
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mx-4 mt-4 md:mx-6">
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm">{error}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && employeeList.length === 0 && (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="text-gray-500 mt-3">Loading schedule...</p>
                    </div>
                </div>
            )}

            {/* Main Content */}
            {employeeList.length > 0 && (
                <div className="px-4 py-6 md:px-6">
                    <div className="max-w-7xl mx-auto">
                        {/* Employee Selection - Mobile */}
                        <div className="md:hidden mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Employee
                            </label>
                            <EmployeeSelector
                                employees={filteredEmployees}
                                selectedEmployee={selectedEmployee}
                                onSelect={setSelectedEmployee}
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                            />
                        </div>

                        {/* Week Navigation */}
                        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
                            <div className="flex items-center justify-between">
                                <button 
                                    onClick={() => navigateWeek(-1)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                
                                <div className="text-center">
                                    <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                                        {weekRangeString}
                                    </h2>
                                    {selectedEmployee && (
                                        <p className="text-sm text-indigo-600 font-medium mt-1">
                                            {selectedEmployee}
                                        </p>
                                    )}
                                </div>
                                
                                <button 
                                    onClick={() => navigateWeek(1)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                            {/* Employee List - Desktop Only */}
                            <div className="hidden md:block">
                                <div className="bg-white rounded-lg shadow-sm border p-4">
                                    <h3 className="font-semibold text-gray-800 mb-4">Employees</h3>
                                    <EmployeeSelector
                                        employees={filteredEmployees}
                                        selectedEmployee={selectedEmployee}
                                        onSelect={setSelectedEmployee}
                                        searchTerm={searchTerm}
                                        onSearchChange={setSearchTerm}
                                    />
                                </div>
                            </div>

                            {/* Schedule Display */}
                            <div className="md:col-span-4">
                                <div className="bg-white rounded-lg shadow-sm border p-4">
                                    {selectedEmployee ? (
                                        <div className="space-y-3">
                                            {weekData.map(({ date, taskInfo }) => {
                                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                                const isToday = date.toDateString() === new Date().toDateString();
                                                
                                                let bgColor = 'bg-white';
                                                let borderColor = 'border-gray-200';
                                                
                                                if (isWeekend) {
                                                    bgColor = 'bg-gray-50';
                                                } else if (taskInfo) {
                                                    const hue = taskInfo.task.length * 10 % 360;
                                                    bgColor = `bg-indigo-50`;
                                                    borderColor = 'border-indigo-200';
                                                }
                                                
                                                if (isToday) {
                                                    borderColor = 'border-indigo-500';
                                                }

                                                return (
                                                    <div 
                                                        key={date.toISOString()} 
                                                        className={`flex items-center p-4 rounded-lg border-l-4 border transition-all ${bgColor} ${borderColor} ${isToday ? 'ring-1 ring-indigo-200' : ''}`}
                                                    >
                                                        <div className="flex-shrink-0 text-center mr-4">
                                                            <div className={`text-2xl font-bold ${isWeekend ? 'text-gray-400' : isToday ? 'text-indigo-600' : 'text-gray-800'}`}>
                                                                {date.getDate()}
                                                            </div>
                                                            <div className={`text-xs font-medium ${isWeekend ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                {date.toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase()}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0">
                                                            <ActivityDisplay 
                                                                taskInfo={taskInfo} 
                                                                onTaskClick={setModalContent} 
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="text-gray-400 mb-4">
                                                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-medium text-gray-500 mb-2">Select an Employee</h3>
                                            <p className="text-gray-400 max-w-sm mx-auto">
                                                Choose an employee from the list to view their weekly schedule
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schedule;