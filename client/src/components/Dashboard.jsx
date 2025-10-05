import React, { useState, useMemo } from 'react';
//import Papa from 'papaparse';

// ============================================================================
// UTILITY FUNCTIONS (needed for the schedule)
// ============================================================================
const getStartOfWeek = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};
const getDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;


// ============================================================================
// NEW: My Week Component
// ============================================================================
const MyWeek = ({ loggedInUser, schedule }) => {
    const weeklyTasks = useMemo(() => {
        if (!loggedInUser || !schedule || !schedule.csvContent) return [];
        
        //const results = Papa.parse(schedule.csvContent, { skipEmptyLines: true });
        //const data = results.data;
        // This is a simplified parser; you might need to reuse your more complex one from Schedule.js
        // For this example, we assume a simpler structure or reuse your existing logic.
        // This part needs to be robust to parse your specific CSV.
        
        const start = getStartOfWeek(new Date());
        const weekDays = Array.from({ length: 5 }).map((_, i) => {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            return date;
        });
        
        // Placeholder for real parsing logic
        return weekDays.map(date => ({
            date,
            task: `Task for ${loggedInUser.fullName} on ${getDateKey(date)}` // Replace with actual task lookup
        }));
    }, [loggedInUser, schedule]);

    if (!loggedInUser) return null;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">My Week at a Glance</h2>
            <div className="space-y-3">
                {weeklyTasks.map(({ date, task }, index) => (
                    <div key={index} className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <div className="w-16 text-center">
                            <p className="font-bold text-indigo-600 text-sm">{date.toLocaleDateString('it-IT', { weekday: 'short' })}</p>
                            <p className="text-gray-600 text-lg">{date.getDate()}</p>
                        </div>
                        <div className="border-l border-gray-200 pl-4 ml-4 flex-1">
                            <p className="text-sm text-gray-800">{task || 'No activity scheduled'}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// NEW: Colleague Search Component
// ============================================================================
const ColleagueSearch = ({ userData }) => {
    const [query, setQuery] = useState('');
    const filteredUsers = useMemo(() => {
        if (!query) return [];
        return userData.filter(user =>
            user.fullName.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5); // Limit to 5 results
    }, [query, userData]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Find a Colleague</h2>
            <input
                type="text"
                placeholder="Type a name..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mt-3 space-y-2">
                {query && filteredUsers.map(user => (
                    <div key={user.email} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-gray-900">{user.fullName}</p>
                            <p className="text-sm text-gray-500">{user.city || 'N/A'}</p>
                        </div>
                        {user.phone && (
                            <a href={`tel:${user.phone.replace(/[^0-9]/g, '')}`} className="p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200">
                                <i className="fas fa-phone"></i>
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// NEW: Project Search Component
// ============================================================================
const ProjectSearch = ({ commesse }) => {
    const [query, setQuery] = useState('');
    const filteredProjects = useMemo(() => {
        if (!query) return [];
        return commesse.filter(c =>
            c.CodiceProgettoSAP.toLowerCase().includes(query.toLowerCase()) ||
            c.Descrizione.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);
    }, [query, commesse]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Find a Project</h2>
            <input
                type="text"
                placeholder="Type code or description..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mt-3 space-y-2">
                {query && filteredProjects.map(c => (
                    <div key={c._id} className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-semibold text-gray-900">{c.CodiceProgettoSAP}</p>
                        <p className="text-sm text-gray-600 truncate">{c.Descrizione}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};


// ============================================================================
// MAIN UPDATED DASHBOARD COMPONENT
// ============================================================================
const Dashboard = ({ receipts, commesse, schedule, loggedInUser, userData, setPage }) => {

    const totalReceipts = receipts.length;
    const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);
    
    return (
        <div>
            {/* Welcome Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Welcome, {loggedInUser?.fullName?.split(' ')[0]}!</h1>
                <p className="text-gray-500">Here's your overview for today, {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}.</p>
            </div>
            
            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column (Main Content) */}
                <div className="lg:col-span-2 space-y-6">
                    <MyWeek loggedInUser={loggedInUser} schedule={schedule} />
                    <ProjectSearch commesse={commesse} />
                </div>

                {/* Right Column (Tools & Stats) */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <button className="flex flex-col items-center bg-gray-100 p-4 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => setPage('receipts')}>
                                <i className="fas fa-camera text-2xl text-indigo-500 mb-2"></i>
                                <span className="text-sm font-medium text-center">Add Receipt</span>
                            </button>
                            <button className="flex flex-col items-center bg-gray-100 p-4 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => setPage('reports')}>
                                <i className="fas fa-file-pdf text-2xl text-indigo-500 mb-2"></i>
                                <span className="text-sm font-medium text-center">Gen Report</span>
                            </button>
                        </div>
                    </div>

                    <ColleagueSearch userData={userData} />

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Receipt Stats</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center"><p className="text-gray-600">Total Receipts</p><p className="font-bold text-indigo-600">{totalReceipts}</p></div>
                            <div className="flex justify-between items-center"><p className="text-gray-600">Total Amount</p><p className="font-bold text-indigo-600">€{totalAmount.toFixed(2)}</p></div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;