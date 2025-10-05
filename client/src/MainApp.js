// MainApp.js
import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Receipts from './components/Receipts';
import Reports from './components/Reports';
import Schedule from './components/Schedule';
import GeologyPage from './components/GeologyPage';
import config from './config';
import logo from './assets/LogoACR.jpg'; // Import your logo
import { USER_DATA, getLoggedInUser } from './utils/utils';
const API_URL = config.API_URL;

const MainApp = () => {
    const [page, setPage] = useState('dashboard');
    const [receipts, setReceipts] = useState([]);
    const [commesse, setCommesse] = useState([]);
    const [schedule, setSchedule] = useState(null); // [NEW] State for schedule
    const [loggedInUser, setLoggedInUser] = useState(null); // [NEW] State for user
    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.reload();
    };
    const fetchApiData = async () => {
        try {
            // [MODIFIED] Fetch all data including the latest schedule
            const [receiptsRes, commesseRes, scheduleRes] = await Promise.all([
                fetch(`${API_URL}/receipts`),
                fetch(`${API_URL}/commesse`),
                fetch(`${API_URL}/schedule/all`)
            ]);
            const receiptsData = await receiptsRes.json();
            const commesseData = await commesseRes.json();
            const scheduleData = await scheduleRes.json();

            setReceipts(receiptsData);
            setCommesse(commesseData);

            // [NEW] Process and set the most recent schedule
            if (scheduleData && scheduleData.length > 0) {
                const mostRecent = scheduleData.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
                setSchedule(mostRecent);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        setLoggedInUser(getLoggedInUser()); // Get user info on load
        fetchApiData();
    }, []);

    const renderPage = () => {
        switch (page) {
            case 'dashboard':
                // [MODIFIED] Pass all necessary props to the Dashboard
                return (
                    <Dashboard
                        receipts={receipts}
                        commesse={commesse}
                        schedule={schedule}
                        loggedInUser={loggedInUser}
                        userData={USER_DATA}
                        setPage={setPage}
                    />
                );
            case 'receipts':
                return <Receipts receipts={receipts} commesse={commesse} onDataChange={fetchApiData} />;
            case 'schedule':
                return <Schedule schedule={schedule} />;
            case 'geology':
                return <GeologyPage />;
            case 'reports':
                return <Reports receipts={receipts}  />;
            default:
                return <Dashboard receipts={receipts} setPage={setPage} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Desktop Header with Logo and Logout */}
            <header className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex-shrink-0">
                        <img
                            src={logo}
                            alt="ACR di Reggiani Albertino SPA"
                            className="h-10 w-auto"
                        />
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 active:bg-red-700 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Esci</span>
                    </button>
                </div>
            </header>

            {/* Mobile Header with Logo */}
            <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
                <div className="px-4 py-3 flex items-center justify-between">
                    <img
                        src={logo}
                        alt="ACR"
                        className="h-8 w-auto max-w-[200px]"
                    />
                    <button
                        onClick={handleLogout}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Logout"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* Navigation */}
            <Navigation page={page} setPage={setPage} />

            {/* Main Content */}
            <main className="pb-20 md:pb-0">
                {renderPage()}
            </main>
        </div>
    );
};

export default MainApp;