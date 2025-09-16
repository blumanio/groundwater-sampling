import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Receipts from './components/Receipts';
import Reports from './components/Reports';
import Schedule from './components/Schedule';
import GeologyPage from './components/GeologyPage'; // 1. IMPORT THE NEW PAGE

const API_URL = 'http://localhost:5000/api';

const App = () => {
    const [page, setPage] = useState('dashboard');
    const [receipts, setReceipts] = useState([]);
    const [commesse, setCommesse] = useState([]);

    const fetchApiData = async () => {
        try {
            const [receiptsResponse, commesseResponse] = await Promise.all([
                fetch(`${API_URL}/receipts`),
                fetch(`${API_URL}/commesse`)
            ]);
            const receiptsData = await receiptsResponse.json();
            const commesseData = await commesseResponse.json();
            setReceipts(receiptsData);
            setCommesse(commesseData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        fetchApiData();
    }, []);

    const renderPage = () => {
        switch (page) {
            case 'dashboard':
                return <Dashboard receipts={receipts} setPage={setPage} />;
            case 'receipts':
                return <Receipts receipts={receipts} commesse={commesse} onDataChange={fetchApiData} />;
            case 'schedule':
                return <Schedule />;
            
            // 2. ADD THE NEW CASE FOR THE GEOLOGY PAGE
            case 'geology':
                return <GeologyPage />;

            case 'reports':
                return <Reports receipts={receipts} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-7xl mx-auto"> {/* Increased max-width for better layout */}
                <header className="bg-white p-4 rounded-lg shadow-md mb-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Field Operations Hub</h1>
                    <Navigation page={page} setPage={setPage} />
                </header>
                <main>
                    {renderPage()}
                </main>
            </div>
        </div>
    );
};

export default App;
