import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import SiteDetail from './SiteDetail';
import config from '../config';

const API_URL = config.API_URL;

// Custom map component for coordinate clicking
const MapClickHandler = ({ onLocationSelect }) => {
    useMapEvents({
        click: (e) => {
            const { lat, lng } = e.latlng;
            onLocationSelect(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
    });
    return null;
};

// Component to fit map to markers bounds
const FitBoundsToMarkers = ({ sites }) => {
    const map = useMap();
    
    useEffect(() => {
        if (sites.length > 0) {
            const bounds = L.latLngBounds(sites.map(site => site.coordinates));
            map.fitBounds(bounds, { padding: [20, 20] });
        }
    }, [sites, map]);
    
    return null;
};

const GeologyPage = () => {
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isCoordinatePickerMode, setIsCoordinatePickerMode] = useState(false);

    const [newSiteName, setNewSiteName] = useState('');
    const [newSiteClient, setNewSiteClient] = useState('');
    const [newSiteCoords, setNewSiteCoords] = useState('');
    const [newSiteAddress, setNewSiteAddress] = useState('');

    const mapRef = useRef();

    const fetchSites = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/sites`);
            if (!response.ok) throw new Error('Failed to fetch sites.');
            const data = await response.json();
            setSites(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSites();
    }, []);

    const handleAddSite = async (e) => {
        e.preventDefault();
        const coordsArray = newSiteCoords.split(',').map(coord => parseFloat(coord.trim()));
        if (!newSiteName || coordsArray.length !== 2 || isNaN(coordsArray[0]) || isNaN(coordsArray[1])) {
            alert('Please provide a site name and valid coordinates (e.g., 45.6, 9.2).');
            return;
        }
        const [lat, lon] = coordsArray;

        try {
            const response = await fetch(`${API_URL}/sites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: newSiteName, 
                    client: newSiteClient, 
                    address: newSiteAddress,
                    coordinates: [lat, lon] 
                }),
            });
            if (!response.ok) throw new Error('Failed to add site.');
            await fetchSites();
            setNewSiteName('');
            setNewSiteClient('');
            setNewSiteCoords('');
            setNewSiteAddress('');
            setShowAddForm(false);
            setIsCoordinatePickerMode(false);
        } catch (err) {
            alert(err.message);
        }
    };

    const handleLocationSelect = (coordinates) => {
        setNewSiteCoords(coordinates);
        setIsCoordinatePickerMode(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Loading sites...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
                    <div className="flex items-center">
                        <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h3 className="text-red-800 font-medium">Error Loading Sites</h3>
                            <p className="text-red-600 text-sm mt-1">{error}</p>
                        </div>
                    </div>
                    <button 
                        onClick={fetchSites}
                        className="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (selectedSite) {
        return <SiteDetail site={selectedSite} onBack={() => setSelectedSite(null)} />;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
            {/* Header */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-40">
                <div className="px-4 py-4 md:px-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center">
                            🌍 <span className="ml-2">Geology Sites</span>
                        </h1>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Site
                        </button>
                    </div>
                </div>
            </div>

            {/* Add Form Modal - Mobile */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center p-4">
                    <div className="bg-white rounded-t-xl md:rounded-lg w-full max-w-lg max-h-[90vh] overflow-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-800">Add New Site</h3>
                                <button 
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setIsCoordinatePickerMode(false);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <form onSubmit={handleAddSite} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Site Name*</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter site name" 
                                    value={newSiteName} 
                                    onChange={e => setNewSiteName(e.target.value)} 
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                                <input 
                                    type="text" 
                                    placeholder="Client name" 
                                    value={newSiteClient} 
                                    onChange={e => setNewSiteClient(e.target.value)} 
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <input 
                                    type="text" 
                                    placeholder="Full address" 
                                    value={newSiteAddress} 
                                    onChange={e => setNewSiteAddress(e.target.value)} 
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Coordinates* (Latitude, Longitude)
                                </label>
                                <div className="flex space-x-2">
                                    <input 
                                        type="text" 
                                        placeholder="45.123456, 9.123456" 
                                        value={newSiteCoords} 
                                        onChange={e => setNewSiteCoords(e.target.value)} 
                                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsCoordinatePickerMode(!isCoordinatePickerMode)}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isCoordinatePickerMode 
                                                ? 'bg-indigo-600 text-white' 
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </button>
                                </div>
                                
                                {isCoordinatePickerMode && (
                                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-sm text-blue-700">
                                            📍 Click on the map below to select coordinates
                                        </p>
                                    </div>
                                )}
                                
                                <div className="mt-2 text-xs text-gray-500">
                                    💡 Tip: Use Google Maps to find exact coordinates, or click the location button to select on map
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setIsCoordinatePickerMode(false);
                                    }}
                                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Add Site
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="p-4 md:p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Sites List - Mobile */}
                    <div className="md:hidden mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Project Sites ({sites.length})</h2>
                        <div className="space-y-3">
                            {sites.map(site => (
                                <div 
                                    key={site._id} 
                                    onClick={() => setSelectedSite(site)} 
                                    className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md hover:bg-indigo-50 cursor-pointer transition-all active:scale-98"
                                >
                                    <h3 className="font-semibold text-gray-800">{site.name}</h3>
                                    {site.client && <p className="text-sm text-gray-600 mt-1">{site.client}</p>}
                                    {site.address && <p className="text-xs text-gray-500 mt-1">{site.address}</p>}
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-gray-400">
                                            {site.coordinates[0].toFixed(4)}, {site.coordinates[1].toFixed(4)}
                                        </span>
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:grid md:grid-cols-4 gap-6">
                        {/* Sites Sidebar */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-gray-800">Project Sites</h2>
                            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                                {sites.map(site => (
                                    <div 
                                        key={site._id} 
                                        onClick={() => setSelectedSite(site)} 
                                        className="bg-white p-3 rounded-lg shadow-sm border hover:shadow-md hover:bg-indigo-50 cursor-pointer transition-all"
                                    >
                                        <h3 className="font-semibold text-gray-800">{site.name}</h3>
                                        {site.client && <p className="text-sm text-gray-600">{site.client}</p>}
                                        {site.address && <p className="text-xs text-gray-500 mt-1">{site.address}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Map */}
                        <div className="col-span-3">
                            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                                <div className="h-[70vh]">
                                    {sites.length > 0 && (
                                        <MapContainer 
                                            ref={mapRef}
                                            center={[45.65, 9.26]} 
                                            zoom={8} 
                                            scrollWheelZoom={true} 
                                            style={{ height: "100%", width: "100%" }}
                                        >
                                            {isCoordinatePickerMode && (
                                                <MapClickHandler onLocationSelect={handleLocationSelect} />
                                            )}
                                            
                                            <FitBoundsToMarkers sites={sites} />
                                            
                                            <LayersControl position="topright">
                                                <LayersControl.BaseLayer checked name="Street Map">
                                                    <TileLayer
                                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                    />
                                                </LayersControl.BaseLayer>
                                                
                                                <LayersControl.BaseLayer name="Satellite View">
                                                    <TileLayer
                                                        attribution='Tiles &copy; Esri'
                                                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                                    />
                                                </LayersControl.BaseLayer>
                                                
                                                <LayersControl.BaseLayer name="Topographic Map">
                                                    <TileLayer
                                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                                                    />
                                                </LayersControl.BaseLayer>
                                            </LayersControl>
                                            
                                            {sites.map(site => (
                                                <Marker 
                                                    key={site._id} 
                                                    position={site.coordinates}
                                                    eventHandlers={{
                                                        click: () => setSelectedSite(site)
                                                    }}
                                                >
                                                    <Popup>
                                                        <div className="p-2">
                                                            <h4 className="font-semibold">{site.name}</h4>
                                                            {site.client && <p className="text-sm text-gray-600">{site.client}</p>}
                                                            {site.address && <p className="text-xs text-gray-500 mt-1">{site.address}</p>}
                                                            <button 
                                                                onClick={() => setSelectedSite(site)}
                                                                className="mt-2 bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                                                            >
                                                                View Details
                                                            </button>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            ))}
                                        </MapContainer>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Map */}
                    <div className="md:hidden">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Site Locations</h2>
                        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                            <div className="h-[400px]">
                                {sites.length > 0 && (
                                    <MapContainer 
                                        center={[45.65, 9.26]} 
                                        zoom={8} 
                                        scrollWheelZoom={true} 
                                        style={{ height: "100%", width: "100%" }}
                                    >
                                        {isCoordinatePickerMode && (
                                            <MapClickHandler onLocationSelect={handleLocationSelect} />
                                        )}
                                        
                                        <FitBoundsToMarkers sites={sites} />
                                        
                                        <LayersControl position="topright">
                                            <LayersControl.BaseLayer checked name="Street">
                                                <TileLayer
                                                    attribution='&copy; OpenStreetMap'
                                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                />
                                            </LayersControl.BaseLayer>
                                            
                                            <LayersControl.BaseLayer name="Satellite">
                                                <TileLayer
                                                    attribution='&copy; Esri'
                                                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                                />
                                            </LayersControl.BaseLayer>
                                        </LayersControl>
                                        
                                        {sites.map(site => (
                                            <Marker 
                                                key={site._id} 
                                                position={site.coordinates}
                                                eventHandlers={{
                                                    click: () => setSelectedSite(site)
                                                }}
                                            >
                                                <Popup>
                                                    <div className="p-1">
                                                        <h4 className="font-semibold text-sm">{site.name}</h4>
                                                        {site.client && <p className="text-xs text-gray-600">{site.client}</p>}
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        ))}
                                    </MapContainer>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeologyPage;