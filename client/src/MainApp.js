// src/MainApp.js
import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Receipts from './components/Receipts';
import Reports from './components/Reports';
import Schedule from './components/Schedule';
import AqtesolvPage from './components/AqtesolvPage';
import GeologyPage from './components/GeologyPage';
import TimeTracker from './components/TimeTracker';
import BonificaPro from './components/BonificaPro';
import HydroGeoPro from './components/HydroGeoPro';
import TrovaCommessa from './components/TrovaCommessa';
import Magazzino from './components/Magazzino';
import Login from './components/Login';
import config from './config';
import logo from './assets/LogoACR.jpg';

const API_URL = config.API_URL;

const MainApp = () => {
    const [page, setPage] = useState('dashboard');
    const [receipts, setReceipts] = useState([]);
    const [commesse, setCommesse] = useState([]);
    const [schedule, setSchedule] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Check token on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setIsLoggedIn(true);
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
    };

    const fetchApiData = async () => {
        try {
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

            if (scheduleData && scheduleData.length > 0) {
                const mostRecent = scheduleData.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
                setSchedule(mostRecent);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        if (isLoggedIn) fetchApiData();
    }, [isLoggedIn]);

    const renderPage = () => {
        switch (page) {
            case 'dashboard':
                return <TrovaCommessa commesse={commesse} receipts={receipts} schedule={schedule} />;
            case 'receipts':
                return <Receipts receipts={receipts} commesse={commesse} onDataChange={fetchApiData} />;
            case 'schedule':
                return <Schedule schedule={schedule} />;
            case 'geology':
                return <GeologyPage />;
            case 'aqtesolv':
                return <AqtesolvPage />;
            case 'reports':
                return <Reports receipts={receipts} />;
            case 'timetracker':
                return <TimeTracker />;
            case 'bonificapro':
                return <BonificaPro />;
            case 'hydrogeopro':
                return <HydroGeoPro />;
            case 'trovacommessa':
                return <TrovaCommessa commesse={commesse} />;
            case 'magazzino':
                return <Magazzino />;
            default:
                return <TrovaCommessa commesse={commesse} />;
        }
    };

    // ── Not logged in — show login screen ──
    if (!isLoggedIn) {
        return <Login onLoginSuccess={() => setIsLoggedIn(true)} />;
    }

    // ── Logged in — show app ──
    return (
        <div className="min-h-screen bg-gray-50">

            {/* Desktop Header */}
            <header className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                    <p className="text-lg font-semibold">Per Tecnici ACR</p>
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

            {/* Mobile Header */}
            <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
                <div className="px-4 py-3 flex items-center justify-between">
                    <p className="text-lg font-semibold">Groundwater Field App</p>
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