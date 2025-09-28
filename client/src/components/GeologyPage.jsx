import React, { useState, useEffect } from 'react';
// MODIFIED: Added LayersControl for the map type switcher
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from 'react-leaflet';
import SiteDetail from './SiteDetail';

import config from '../config';
//const API_URL = 'http://localhost:5000/api';
const API_URL = config.API_URL;

const GeologyPage = () => {
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [newSiteName, setNewSiteName] = useState('');
    const [newSiteClient, setNewSiteClient] = useState('');
    const [newSiteCoords, setNewSiteCoords] = useState('');

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
                body: JSON.stringify({ name: newSiteName, client: newSiteClient, coordinates: [lat, lon] }),
            });
            if (!response.ok) throw new Error('Failed to add site.');
            fetchSites();
            setNewSiteName('');
            setNewSiteClient('');
            setNewSiteCoords('');
        } catch (err) {
            alert(err.message);
        }
    };

    if (isLoading) return <div className="text-center p-8">Loading sites...</div>;
    if (error) return <div className="text-center text-red-500 p-8">Error: {error}</div>;

    if (selectedSite) {
        return <SiteDetail site={selectedSite} onBack={() => setSelectedSite(null)} />;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Site Locations</h2>
                <div className="h-[600px] rounded-lg overflow-hidden shadow-md">
                    <MapContainer center={[45.65, 9.26]} zoom={8} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
                        {/* NEW: Map layer switcher */}
                        <LayersControl position="topright">
                            <LayersControl.BaseLayer checked name="Street Map">
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="Satellite Imagery">
                                <TileLayer
                                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                />
                            </LayersControl.BaseLayer>
                        </LayersControl>
                        
                        {sites.map(site => (
                            <Marker key={site._id} position={site.coordinates}>
                                <Popup><b>{site.name}</b><br/>{site.client}</Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>

            <div>
                 <h2 className="text-xl font-bold text-gray-800 mb-4">Project Sites</h2>
                <div className="space-y-2 mb-6">
                    {sites.map(site => (
                        <div key={site._id} onClick={() => setSelectedSite(site)} className="bg-white p-3 rounded-md shadow-sm hover:shadow-md hover:bg-indigo-50 cursor-pointer transition-all">
                            <h3 className="font-semibold">{site.name}</h3>
                            <p className="text-sm text-gray-500">{site.client}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h3 className="font-bold mb-2">Add New Site</h3>
                    <form onSubmit={handleAddSite} className="space-y-3">
                        <input type="text" placeholder="Site Name" value={newSiteName} onChange={e => setNewSiteName(e.target.value)} className="w-full p-2 border rounded-md" />
                        <input type="text" placeholder="Client" value={newSiteClient} onChange={e => setNewSiteClient(e.target.value)} className="w-full p-2 border rounded-md" />
                        <div>
                            <label className="text-sm font-medium text-gray-700 flex items-center">
                                Coordinates
                                <div className="group relative ml-2">
                                    <i className="fas fa-question-circle text-gray-400 cursor-pointer"></i>
                                    <div className="absolute bottom-full mb-2 w-64 bg-gray-800 text-white text-xs rounded-md p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        Open Google Maps, right-click on the exact location, and click the coordinates to copy them. Then paste here.
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                    </div>
                                </div>
                            </label>
                            <input 
                                type="text" 
                                placeholder="e.g., 45.123, 9.456" 
                                value={newSiteCoords} 
                                onChange={e => setNewSiteCoords(e.target.value)} 
                                className="w-full p-2 border rounded-md mt-1" 
                            />
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700">Add Site</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default GeologyPage;

