import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import config from '../config';

const API_URL = config.API_URL;

// Helper Functions
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
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 ${selectedEmployee === name ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-700'
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
                            className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 last:border-b-0 transition-colors ${selectedEmployee === name
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

// Month Selector Component
const MonthSelector = ({ availableSchedules, selectedSchedule, onScheduleChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const getDisplayName = (schedule) => {
        return `${monthNames[schedule.month]} ${schedule.year}`;
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium flex items-center space-x-2 hover:bg-gray-50 transition-colors"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{selectedSchedule ? getDisplayName(selectedSchedule) : 'Select Month'}</span>
                <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px]">
                    <div className="py-1 max-h-60 overflow-auto">
                        {availableSchedules.map((schedule) => (
                            <button
                                key={schedule._id}
                                onClick={() => {
                                    onScheduleChange(schedule);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedSchedule?._id === schedule._id ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-700'
                                    }`}
                            >
                                {getDisplayName(schedule)}
                                <span className="block text-xs text-gray-500 mt-1">
                                    Uploaded: {new Date(schedule.uploadedAt).toLocaleDateString()}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Main Schedule Component
const Schedule = () => {
    // State
    const [employeeSchedules, setEmployeeSchedules] = useState({});
    const [employeeList, setEmployeeList] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentDate, setCurrentDate] = useState(getStartOfWeek(new Date()));
    const [availableSchedules, setAvailableSchedules] = useState([]);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [modalContent, setModalContent] = useState(null);
    const [showUploadForm, setShowUploadForm] = useState(false);

    // Upload form state
    const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
    const [uploadMonth, setUploadMonth] = useState(new Date().getMonth());

    const isAdmin = true;

    // Fetch all available schedules
    const fetchAvailableSchedules = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/schedule/all`);
            if (!response.ok) throw new Error('Failed to fetch schedules.');

            const data = await response.json();
            setAvailableSchedules(data);

            // Auto-select the most recent schedule
            if (data.length > 0) {
                const mostRecent = data.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
                setSelectedSchedule(mostRecent);
                loadScheduleData(mostRecent);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAvailableSchedules();
    }, [availableSchedules]);

    const loadScheduleData = (schedule) => {
        if (!schedule) return;

        Papa.parse(schedule.csvContent, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
                const { schedules, employees } = processCSVData(results.data, schedule.year, schedule.month);
                setEmployeeSchedules(schedules);
                setEmployeeList(employees);
            }
        });
    };

    const handleScheduleChange = (schedule) => {
        setSelectedSchedule(schedule);
        loadScheduleData(schedule);
        setSelectedEmployee(''); // Reset employee selection
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.CSV') && !file.name.endsWith('.csv')) {
            setError('Please select a CSV file');
            return;
        }

        setIsLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('scheduleFile', file);
        formData.append('year', uploadYear.toString());
        formData.append('month', uploadMonth.toString());

        try {
            const response = await fetch(`${API_URL}/schedule/upload`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            // Refresh the available schedules
            await fetchAvailableSchedules();
            setShowUploadForm(false);

        } catch (err) {
            setError(err.message || 'File upload failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const processCSVData = (data, year, month) => {
        const schedules = {};
        const employees = new Set();

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
                const currentDate = new Date(year, month, dayNum);
                const dayOfWeek = currentDate.getDay();
                const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;
                const taskInCell = row[colIndex]?.trim();

                if (taskInCell && taskInCell !== '' && taskInCell !== '-') {
                    lastTask = taskInCell;
                }

                if (lastTask && isWeekday) {
                    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
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

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
            <ActivityModal content={modalContent} onClose={() => setModalContent(null)} />

            {/* Header */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-40">
                <div className="px-4 py-4 md:px-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center">
                                📅 <span className="ml-2">Company Schedule</span>
                            </h1>

                            {/* Month Selector */}
                            <MonthSelector
                                availableSchedules={availableSchedules}
                                selectedSchedule={selectedSchedule}
                                onScheduleChange={handleScheduleChange}
                            />
                        </div>

                        {isAdmin && (
                            <button
                                onClick={() => setShowUploadForm(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Upload Schedule
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Upload Form Modal */}
            {showUploadForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center p-4">
                    <div className="bg-white rounded-t-xl md:rounded-lg w-full max-w-lg">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-xl md:rounded-t-lg">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-800">Upload New Schedule</h3>
                                <button
                                    onClick={() => setShowUploadForm(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                                    <select
                                        value={uploadYear}
                                        onChange={e => setUploadYear(parseInt(e.target.value))}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {[2024, 2025, 2026, 2027].map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                                    <select
                                        value={uploadMonth}
                                        onChange={e => setUploadMonth(parseInt(e.target.value))}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {monthNames.map((month, index) => (
                                            <option key={index} value={index}>{month}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Upload a CSV file exported from your Excel schedule
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex space-x-3 pt-4">
                                <button
                                    onClick={() => setShowUploadForm(false)}
                                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && !showUploadForm && (
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
                                    {selectedSchedule && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {monthNames[selectedSchedule.month]} {selectedSchedule.year}
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
                                                    bgColor = `bg-indigo-50`;
                                                    borderColor = 'border-indigo-200';
                                                }

                                                if (isToday) {
                                                    borderColor = 'border-indigo-500';
                                                }

                                                return (
                                                    <div
                                                        key={date.toISOString()}
                                                        className={`flex items-center p-4 rounded-lg border-l-4 border transition-all ${bgColor} ${borderColor}`}
                                                    >
                                                        {/* Date Info */}
                                                        <div className="w-24 md:w-32 flex-shrink-0">
                                                            <p className={`font-semibold ${isToday ? 'text-indigo-600' : 'text-gray-800'}`}>
                                                                {date.toLocaleDateString('en-US', { weekday: 'long' })}
                                                            </p>
                                                            <p className={`text-sm ${isToday ? 'text-indigo-500' : 'text-gray-500'}`}>
                                                                {date.toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}
                                                            </p>
                                                        </div>
                                                        {/* Activity Display */}
                                                        <div className="flex-grow">
                                                            {isWeekend ? (
                                                                <span className="text-gray-400 text-sm">Weekend</span>
                                                            ) : (
                                                                <ActivityDisplay
                                                                    taskInfo={taskInfo}
                                                                    onTaskClick={(content) => setModalContent(content)}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center p-8 h-full min-h-[300px]">
                                            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A1.875 1.875 0 0118 22.5h-12a1.875 1.875 0 01-1.499-2.382z" />
                                            </svg>
                                            <h3 className="text-lg font-semibold text-gray-700">Select an Employee</h3>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Choose an employee from the list to see their schedule.
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