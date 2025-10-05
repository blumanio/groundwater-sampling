import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import PZMeasurementEntry from './PZMeasurementEntry'; 
import config from '../config';

const API_URL = config.API_URL;

// --- Helper Functions and Components ---

// Component to handle map clicks for PZ coordinates
const PZMapClickHandler = ({ onLocationSelect }) => {
    useMapEvents({
        click: (e) => {
            const { lat, lng } = e.latlng;
            onLocationSelect(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
    });
    return null;
};

const getStatusIcon = (status) => {
    switch (status) {
        case 'completed': return <span className="text-green-500 text-xl font-bold">✅</span>;
        case 'pending': return <span className="text-yellow-500 text-xl font-bold">⏳</span>;
        case 'not-started':
        default: return <span className="text-red-500 text-xl font-bold">❌</span>;
    }
};

const getStatusColor = (status) => {
    switch (status) {
        case 'completed': return 'border-green-300 bg-green-50';
        case 'pending': return 'border-yellow-300 bg-yellow-50';
        case 'not-started':
        default: return 'border-red-300 bg-red-50';
    }
}

// --- Main Component ---

const SiteDashboard = ({ site, onBack }) => {
    const [pzs, setPZs] = useState([]);
    const [currentPZ, setCurrentPZ] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [syncStatus, setSyncStatus] = useState('Synced ✅'); 
    
    // Add PZ Form State
    const [showAddPZForm, setShowAddPZForm] = useState(false);
    const [newPZName, setNewPZName] = useState('');
    const [newPZCoords, setNewPZCoords] = useState('');
    const [newPZDepth, setNewPZDepth] = useState('');
    const [isPZPickerMode, setIsPZPickerMode] = useState(false);


    const fetchPZs = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/sites/${site._id}/piezometers`);
            if (!response.ok) throw new Error('Failed to fetch Piezometers.');
            const data = await response.json();
            
            // NOTE: This mocking logic should be replaced by real status from a combined API call
            const pzsWithStatus = data.map(pz => ({
                ...pz,
                // Mock status based on a simple heuristic (replace with API data)
                status: Math.random() < 0.3 ? 'completed' : (Math.random() < 0.6 ? 'pending' : 'not-started')
            }));
            
            setPZs(pzsWithStatus);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPZs();
    }, [site._id]);

    const handlePZLocationSelect = (coordinates) => {
        setNewPZCoords(coordinates);
        setIsPZPickerMode(false);
    };

    const handleAddPZ = async (e) => {
        e.preventDefault();
        const coordsArray = newPZCoords.split(',').map(coord => parseFloat(coord.trim()));
        if (!newPZName || coordsArray.length !== 2 || isNaN(coordsArray[0]) || isNaN(coordsArray[1])) {
            alert('Please provide a PZ name and valid coordinates (e.g., 45.6, 9.2).');
            return;
        }
        const [lat, lon] = coordsArray;

        try {
            const response = await fetch(`${API_URL}/sites/${site._id}/piezometers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: newPZName, 
                    coordinates: [lat, lon],
                    depth: newPZDepth ? parseFloat(newPZDepth) : null
                }),
            });
            if (!response.ok) throw new Error('Failed to add Piezometer.');
            
            // Reset state and fetch updated list
            setNewPZName('');
            setNewPZCoords('');
            setNewPZDepth('');
            setShowAddPZForm(false);
            setIsPZPickerMode(false);
            fetchPZs(); 
        } catch (err) {
            alert(err.message);
        }
    };

    if (isLoading) return <div>Loading Piezometers...</div>;
    if (error) return <div>Error: {error}</div>;

    if (currentPZ) {
        // PZ Measurement Entry screen
        return (
            <PZMeasurementEntry 
                pz={currentPZ} 
                siteName={site.name}
                onComplete={() => {
                    setCurrentPZ(null);
                    fetchPZs(); // Re-fetch status after completion
                }} 
                onBack={() => setCurrentPZ(null)} 
            />
        );
    }

    // Site Dashboard Screen
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-indigo-600 text-white shadow-xl p-4 sticky top-0 z-30">
                <div className="flex items-center justify-between">
                    <button onClick={onBack} className="p-2 hover:bg-indigo-700 rounded-full transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <h2 className="text-xl font-bold truncate">{site.name}</h2>
                    <span className={`text-sm font-medium ${syncStatus.includes('✅') ? 'text-green-300' : 'text-yellow-300'}`}>
                        {syncStatus}
                    </span>
                </div>
                <div className="mt-2 text-xs text-center">
                    <p>GPS: {site.coordinates[0]?.toFixed(6)}, {site.coordinates[1]?.toFixed(6)}</p>
                    <p>Date: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
                </div>
            </div>
            
            <div className="p-4 max-w-7xl mx-auto">
                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <button className="flex-1 bg-indigo-100 text-indigo-800 py-3 rounded-lg font-medium hover:bg-indigo-200 transition-colors text-sm shadow-md">
                        <span className="mr-1">▶️</span> Start All PZs
                    </button>
                    <button onClick={() => setSyncStatus('Pending 🔄')} className="flex-1 bg-indigo-100 text-indigo-800 py-3 rounded-lg font-medium hover:bg-indigo-200 transition-colors text-sm shadow-md">
                        <span className="mr-1">🔄</span> Sync
                    </button>
                    <button className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm shadow-md">
                        <span className="mr-1">⬇️</span> Download Site Map
                    </button>
                </div>
                
                {/* PZ List Header with Add Button */}
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-bold text-gray-800">Piezometer List ({pzs.length})</h3>
                    <button 
                        onClick={() => setShowAddPZForm(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                        + Add PZ
                    </button>
                </div>

                {/* PZ List */}
                <div className="space-y-3">
                    {pzs.map(pz => (
                        <div 
                            key={pz._id} 
                            onClick={() => setCurrentPZ(pz)}
                            className={`flex items-center justify-between p-4 rounded-lg shadow-sm border-l-4 ${getStatusColor(pz.status)} cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]`}
                        >
                            <div className="flex items-center space-x-3">
                                {getStatusIcon(pz.status)}
                                <span className="text-lg font-semibold text-gray-800">{pz.name}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                                {pz.status.charAt(0).toUpperCase() + pz.status.slice(1).replace('-', ' ')}
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    ))}
                </div>
                
                {/* End-of-Site Summary Actions */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-2xl md:relative md:mt-6 md:p-0 md:bg-transparent md:border-none md:shadow-none">
                     <h3 className="text-xl font-bold text-red-600 mb-3 md:hidden">🚨 Data Alert</h3>
                     <div className="md:grid md:grid-cols-3 gap-3 flex flex-col-reverse">
                        <button className="bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors shadow-lg order-last md:order-first">
                            <span className="mr-1">💾</span> Save Offline
                        </button>
                        <button className="bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg md:col-span-2">
                            <span className="mr-1">📤</span> Export to CSV/PDF
                        </button>
                     </div>
                </div>
            </div>

            {/* Add PZ Modal */}
            {showAddPZForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center p-4">
                    <div className="bg-white rounded-t-xl md:rounded-lg w-full max-w-lg max-h-[90vh] overflow-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800">Add New Piezometer to {site.name}</h3>
                            <button onClick={() => setShowAddPZForm(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddPZ} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Piezometer Name (e.g., PZ-A)*</label>
                                <input type="text" value={newPZName} onChange={e => setNewPZName(e.target.value)} required
                                    className="w-full p-3 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Depth (Optional)</label>
                                <input type="number" step="0.01" placeholder="meters" value={newPZDepth} onChange={e => setNewPZDepth(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Coordinates* (Lat, Lng)</label>
                                <div className="flex space-x-2">
                                    <input type="text" value={newPZCoords} onChange={e => setNewPZCoords(e.target.value)} required
                                        className="flex-1 p-3 border border-gray-300 rounded-lg" />
                                    <button type="button" onClick={() => setIsPZPickerMode(!isPZPickerMode)} 
                                        className={`px-3 py-2 rounded-lg transition-colors ${isPZPickerMode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                        📍
                                    </button>
                                </div>
                                {isPZPickerMode && (
                                    <div className="mt-2 h-[200px] w-full border rounded-lg overflow-hidden">
                                        <MapContainer center={site.coordinates} zoom={13} style={{ height: "100%", width: "100%" }}>
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                            <PZMapClickHandler onLocationSelect={handlePZLocationSelect} />
                                        </MapContainer>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setShowAddPZForm(false)} className="bg-gray-100 text-gray-700 py-3 px-4 rounded-lg">Cancel</button>
                                <button type="submit" className="bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700">Add Piezometer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SiteDashboard;