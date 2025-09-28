import React, { useState } from 'react';

const Navigation = ({ page, setPage }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const inactiveClasses = "text-gray-600 hover:bg-gray-100 active:bg-gray-200 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center min-h-[44px] tap-highlight-transparent";
    const activeClasses = "bg-indigo-500 hover:bg-indigo-600 text-white py-3 px-4 rounded-lg text-sm font-medium shadow-md flex items-center justify-center min-h-[44px]";

    const navigationItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'receipts', label: 'Receipts', icon: '🧾' },
        { id: 'schedule', label: 'Schedule', icon: '📅' },
        { id: 'geology', label: 'Geology', icon: '🌍' },
        { id: 'reports', label: 'Reports', icon: '📈' }
    ];

    const handleNavClick = (pageId) => {
        setPage(pageId);
        setIsMenuOpen(false); // Close mobile menu after selection
    };

    return (
        <>
            {/* Mobile Navigation */}
            <nav className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <h1 className="text-lg font-semibold text-gray-800">
                            Groundwater App
                        </h1>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label="Toggle menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                    
                    {/* Mobile Menu Dropdown */}
                    {isMenuOpen && (
                        <div className="mt-4 pb-2">
                            <div className="grid grid-cols-1 gap-2">
                                {navigationItems.map((item) => (
                                    <button
                                        key={item.id}
                                        className={page === item.id ? activeClasses : inactiveClasses}
                                        onClick={() => handleNavClick(item.id)}
                                    >
                                        <span className="mr-2">{item.icon}</span>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
                <div className="flex items-center space-x-1 overflow-x-auto">
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
            </nav>

            {/* Mobile Bottom Tab Bar (Alternative approach) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 z-50">
                <div className="flex justify-around">
                    {navigationItems.map((item) => (
                        <button
                            key={item.id}
                            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg min-w-0 flex-1 transition-all duration-200 ${
                                page === item.id 
                                    ? 'text-indigo-600 bg-indigo-50' 
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                            onClick={() => setPage(item.id)}
                        >
                            <span className="text-lg mb-1">{item.icon}</span>
                            <span className="text-xs font-medium truncate w-full text-center">
                                {item.label}
                            </span>
                            {page === item.id && (
                                <div className="w-4 h-0.5 bg-indigo-600 rounded-full mt-1"></div>
                            )}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Spacer for bottom tab bar */}
            <div className="md:hidden h-16"></div>
        </>
    );
};

export default Navigation;