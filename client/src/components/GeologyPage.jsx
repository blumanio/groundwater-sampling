import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import SiteDashboard from './SiteDashboard';
import config from '../config';

const API_URL = config.API_URL;

// --- Helper Components ---

// Custom map component for coordinate clicking (kept for Add Site)
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
            const validSites = sites.filter(site => site.coordinates && site.coordinates.length === 2);
            if (validSites.length > 0) {
                const bounds = L.latLngBounds(validSites.map(site => site.coordinates));
                map.fitBounds(bounds, { padding: [50, 50] }); // Increased padding
            }
        }
    }, [sites, map]);

    return null;
};

// Custom icon creator function using L.divIcon to display site name next to the pin
const createCustomMarkerIcon = (siteName, isNearest) => {
    const deepBlue = '#4f46e5'; // Indigo-600
    const accentColor = isNearest ? '#ef4444' : deepBlue; // Red for nearest, blue for others

    const labelStyle = `
        position: absolute;
        padding: 4px 8px;
        border-radius: 6px;
        background-color: ${isNearest ? '#fee2e2' : 'white'};
        color: ${deepBlue};
        border: 2px solid ${accentColor};
        font-weight: bold;
        white-space: nowrap;
        font-size: 14px;
        top: -15px;
        left: 10px;
        transform: translate(0, -50%);
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        z-index: 1000;
        cursor: pointer;
    `;

    const pinDotStyle = `
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: ${accentColor};
        border: 3px solid white;
        box-shadow: 0 0 0 2px ${accentColor};
        transform: translate(-50%, -50%);
        position: absolute;
        top: 0;
        left: 0;
    `;

    const htmlContent = `
        <div style="position: relative; width: 0; height: 0;">
            <div style="${pinDotStyle}"></div>
            <div style="${labelStyle}">${siteName}</div>
        </div>
    `;

    return L.divIcon({
        className: 'custom-site-label-marker',
        html: htmlContent,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
    });
};

// Site Card Component (Reflects PZ status)
const SiteCard = ({ site, onClick }) => {
    // Now receives correct data from the summary endpoint
    const totalPZs = site.totalPZs || 0;
    const completedPZs = site.completedPZs || 0;
    const progress = totalPZs > 0 ? (completedPZs / totalPZs) * 100 : 0;
    const statusText = `${completedPZs}/${totalPZs} measured`;
    const progressColor = completedPZs === totalPZs && totalPZs > 0 ? 'bg-green-500' : 'bg-yellow-500';

    return (
        <div
            onClick={onClick}
            className="bg-white p-4 rounded-lg shadow-lg border border-gray-100 hover:shadow-xl hover:bg-indigo-50 cursor-pointer transition-all active:scale-[0.98]"
        >
            <h3 className="font-bold text-gray-800 text-lg">{site.name}</h3>
            {site.client && <p className="text-sm text-gray-600 mt-1">Client: {site.client}</p>}

            <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-1">
                    PZ Status: <span className="font-semibold">{statusText}</span>
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className={`h-2.5 rounded-full ${progressColor} transition-all duration-500`}
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                <span>{site.coordinates[0]?.toFixed(4)}, {site.coordinates[1]?.toFixed(4)}</span>
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </div>
    );
};


// --- Main Component ---

const GeologyPage = () => {
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [viewMode, setViewMode] = useState('list');
    const [searchQuery, setSearchQuery] = useState('');

    // Add Form State
    const [showAddForm, setShowAddForm] = useState(false);
    const [isCoordinatePickerMode, setIsCoordinatePickerMode] = useState(false);
    const [newSiteName, setNewSiteName] = useState('');
    const [newSiteClient, setNewSiteClient] = useState('');
    const [newSiteCoords, setNewSiteCoords] = useState('');
    const [newSiteAddress, setNewSiteAddress] = useState('');

    const mapRef = useRef();
    const [userLocation, setUserLocation] = useState(null); // Default to null
    const [nearestSite, setNearestSite] = useState(null);


    // --- Data Fetching and Location Logic ---

    // [FIXED] Fetch from the /summary endpoint to get PZ counts
    const fetchSites = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/sites/summary`); // <-- UPDATED
            if (!response.ok) throw new Error('Failed to fetch sites.');
            const data = await response.json();
            setSites(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // [ADDED] Get user's location on initial load
    useEffect(() => {
        fetchSites(); // Fetch sites first

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation([latitude, longitude]);
            },
            (err) => {
                console.error("Error getting user location:", err);
                // Fallback to a default location if geolocation fails (e.g., Milan)
                setUserLocation([45.4642, 9.1900]);
            }
        );
    }, []);

    // [FIXED] Full implementation to find the nearest site
    const findNearestSite = (userCoords, siteList) => {
        if (!userCoords || !siteList || siteList.length === 0) return null;

        let closestSite = null;
        let minDistance = Infinity;

        // Simple distance calculation (Euclidean) - good enough for most UIs
        const getDistance = (coord1, coord2) => {
            const dx = coord1[0] - coord2[0];
            const dy = coord1[1] - coord2[1];
            return Math.sqrt(dx * dx + dy * dy);
        };

        for (const site of siteList) {
            if (site.coordinates && site.coordinates.length === 2) {
                const distance = getDistance(userCoords, site.coordinates);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestSite = site;
                }
            }
        }
        return closestSite;
    };

    // Recalculate nearest site when user location or sites change
    useEffect(() => {
        if (userLocation && sites.length > 0) {
            setNearestSite(findNearestSite(userLocation, sites));
        }
    }, [userLocation, sites]);

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
            await fetchSites(); // Refresh the list with summary data
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


    // --- Filtered/Searched Sites Logic ---
    const filteredSites = sites.filter(site =>
        (site.name && site.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (site.client && site.client.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (site.address && site.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );


    // --- Loading, Error, Dashboard Views ---
    if (isLoading) { return (<div className="flex justify-center items-center h-screen"><div className="text-lg font-semibold">Loading Sites...</div></div>); }
    if (error) { return (<div className="flex justify-center items-center h-screen"><div className="text-lg text-red-600">Error: {error}</div></div>); }
    if (selectedSite) {
        return <SiteDashboard site={selectedSite} onBack={() => setSelectedSite(null)} />;
    }


    // --- Main Site Selection UI (List/Map View) ---
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white shadow-lg border-b sticky top-0 z-40 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-indigo-800 flex items-center">
                        <span className="text-3xl mr-2">🧭</span> Project Sites
                    </h1>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md"
                    >
                        + Add Site
                    </button>
                </div>
            </div>

            {/* Add Form Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[1000] flex items-end md:items-center justify-center p-4">
                    <div className="bg-white rounded-t-xl md:rounded-lg w-full max-w-lg max-h-[90vh] overflow-auto z-[1001]">
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
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isCoordinatePickerMode
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

                                {isCoordinatePickerMode && userLocation && (
                                    <div className="mt-2 h-[200px] w-full border rounded-lg overflow-hidden">
                                        <MapContainer center={userLocation} zoom={8} style={{ height: "100%", width: "100%" }}>
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                            <MapClickHandler onLocationSelect={handleLocationSelect} />
                                        </MapContainer>
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

            {/* View Controls and Search */}
            <div className="p-4">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-4 flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-2">
                        <input
                            type="text"
                            placeholder="Search site name, client, or address..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                        />
                        <div className="flex bg-white rounded-lg shadow-sm border p-1 shrink-0">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex-1 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <span className="mr-1">📋</span> List
                            </button>
                            <button
                                onClick={() => setViewMode('map')}
                                className={`flex-1 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${viewMode === 'map' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <span className="mr-1">🗺️</span> Map
                            </button>
                        </div>
                    </div>

                    {/* List View */}
                    {viewMode === 'list' && (
                        <div className="space-y-3">
                            {filteredSites.length > 0 ? (
                                filteredSites.map(site => (
                                    <SiteCard
                                        key={site._id}
                                        site={site}
                                        onClick={() => setSelectedSite(site)}
                                    />
                                ))
                            ) : (
                                <p className="text-center text-gray-500 p-8">No sites found matching "{searchQuery}".</p>
                            )}
                        </div>
                    )}

                    {/* Map View */}
{viewMode === 'map' && (
    <div className="bg-white rounded-lg shadow-xl border overflow-hidden h-[75vh] relative">
        {/*
            [FIX] Render the map only when we have sites. This prevents race conditions.
            The 'key' prop is crucial: it forces a full re-render of the map when the sites change,
            ensuring FitBoundsToMarkers runs correctly on the new instance.
        */}
        {filteredSites.length > 0 && userLocation ? (
            <MapContainer
                key={filteredSites.map(s => s._id).join('-')} // <-- THE FIX
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
            >
                {/* This component will now work reliably on the new map instance */}
                <FitBoundsToMarkers sites={filteredSites} />

                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Street Map">
                        <TileLayer
                            attribution='&copy; OpenStreetMap contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satellite View">
                        <TileLayer
                            attribution='Tiles &copy; Esri'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>

                {filteredSites.map(site => {
                    const isNearest = nearestSite && nearestSite._id === site._id;
                    return (
                        <Marker
                            key={site._id}
                            position={site.coordinates}
                            icon={createCustomMarkerIcon(site.name, isNearest)}
                            eventHandlers={{ click: () => setSelectedSite(site) }}
                        >
                            <Popup>
                                <div className="p-1">
                                    <h4 className="font-semibold text-indigo-700">{site.name}</h4>
                                    <p className="text-xs text-gray-600 mt-1">Status: {site.completedPZs}/{site.totalPZs}</p>
                                    <button
                                        onClick={() => setSelectedSite(site)}
                                        className="mt-2 bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700 transition-colors"
                                    >
                                        View Dashboard
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                <Marker position={userLocation} icon={L.divIcon({ className: 'blinking-dot', html: '<div class="w-4 h-4 bg-red-600 rounded-full ring-4 ring-red-300 animate-pulse"></div>' })}>
                    <Popup>Your Approximate Location</Popup>
                </Marker>
            </MapContainer>
        ) : (
             <div className="flex items-center justify-center h-full text-gray-500">
                {/* Show a loading message while sites are being fetched */}
                <p>Loading map and sites...</p>
            </div>
        )}
    </div>
)}
                </div>
            </div>
        </div>
    );
};

export default GeologyPage;