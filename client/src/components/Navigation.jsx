import React from 'react';

const Navigation = ({ page, setPage }) => {
    const inactiveClasses = "text-gray-600 hover:bg-gray-200 py-2 px-3 rounded-md text-sm font-medium transition-colors";
    const activeClasses = "bg-indigo-500 text-white py-2 px-3 rounded-md text-sm font-medium";

    return (
        <nav className="flex space-x-2">
            <button className={page === 'dashboard' ? activeClasses : inactiveClasses} onClick={() => setPage('dashboard')}>Dashboard</button>
            <button className={page === 'receipts' ? activeClasses : inactiveClasses} onClick={() => setPage('receipts')}>Receipts</button>
            <button className={page === 'schedule' ? activeClasses : inactiveClasses} onClick={() => setPage('schedule')}>Schedule</button>
            
            {/* NEW BUTTON FOR THE GEOLOGY TOOLKIT */}
            <button className={page === 'geology' ? activeClasses : inactiveClasses} onClick={() => setPage('geology')}>Geology</button>
            
            <button className={page === 'reports' ? activeClasses : inactiveClasses} onClick={() => setPage('reports')}>Reports</button>
        </nav>
    );
};

export default Navigation;
