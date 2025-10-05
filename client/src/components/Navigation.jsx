// Navigation.js
import React from 'react';

const Navigation = ({ page, setPage }) => {
    const inactiveClasses = "text-gray-600 hover:bg-gray-100 active:bg-gray-200 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center min-h-[44px]";
    const activeClasses = "bg-indigo-500 hover:bg-indigo-600 text-white py-3 px-4 rounded-lg text-sm font-medium shadow-md flex items-center justify-center min-h-[44px]";

    const navigationItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'receipts', label: 'Receipts', icon: '🧾' },
        { id: 'schedule', label: 'Schedule', icon: '📅' },
        { id: 'geology', label: 'Geology', icon: '🌍' },
        { id: 'reports', label: 'Reports', icon: '📈' }
    ];

    return (
        <>
            {/* Desktop Navigation */}
            <nav className="hidden md:block bg-white border-b border-gray-200 sticky top-[61px] z-40 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-3">
                    <div className="flex items-center space-x-2 overflow-x-auto">
                        {navigationItems.map((item) => (
                            <button
                                key={item.id}
                                className={page === item.id ? activeClasses : inactiveClasses}
                                onClick={() => setPage(item.id)}
                            >
                                <span className="mr-2">{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="flex justify-around items-stretch h-16">
                    {navigationItems.map((item) => (
                        <button
                            key={item.id}
                            className={`flex flex-col items-center justify-center flex-1 min-w-0 transition-all duration-200 relative ${
                                page === item.id 
                                    ? 'text-indigo-600' 
                                    : 'text-gray-500 active:bg-gray-50'
                            }`}
                            onClick={() => setPage(item.id)}
                            aria-label={item.label}
                        >
                            {page === item.id && (
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
                            )}
                            
                            <span className={`text-xl mb-1 transition-transform duration-200 ${
                                page === item.id ? 'scale-110' : ''
                            }`}>
                                {item.icon}
                            </span>
                            
                            <span className={`text-xs font-medium truncate max-w-full px-1 ${
                                page === item.id ? 'font-semibold' : ''
                            }`}>
                                {item.label}
                            </span>
                        </button>
                    ))}
                </div>
            </nav>
        </>
    );
};

export default Navigation;