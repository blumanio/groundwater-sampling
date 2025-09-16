import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from 'react-leaflet';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const API_URL = 'http://localhost:5000/api';

const AddPiezometerModal = ({ siteId, onClose, onPiezometerAdded }) => {
    const [name, setName] = useState('');
    const [coords, setCoords] = useState('');
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [error, setError] = useState('');

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }
        setIsGettingLocation(true);
        setError('');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setCoords(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                setIsGettingLocation(false);
            },
            (err) => {
                setError(`Failed to get location: ${err.message}`);
                setIsGettingLocation(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const coordsArray = coords.split(',').map(coord => parseFloat(coord.trim()));
        if (!name || coordsArray.length !== 2 || isNaN(coordsArray[0]) || isNaN(coordsArray[1])) {
            return setError('Name and valid coordinates (e.g., 45.123, 9.456) are required.');
        }
        const [latitude, longitude] = coordsArray;
        try {
            const response = await fetch(`${API_URL}/sites/${siteId}/piezometers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, coordinates: [latitude, longitude] })
            });
            if (!response.ok) throw new Error('Failed to save piezometer.');
            const newPz = await response.json();
            onPiezometerAdded(newPz);
            onClose();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="font-bold text-lg mb-4">Add New Piezometer</h3>
                {error && <p className="bg-red-100 text-red-700 p-2 rounded-md mb-4 text-sm">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="e.g., PZ-1, MW-5" required className="w-full p-2 border rounded-md mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 flex items-center">
                            Coordinates (Lat, Lon)
                            <div className="group relative ml-2">
                                <i className="fas fa-question-circle text-gray-400 cursor-pointer"></i>
                                <div className="absolute bottom-full mb-2 w-64 bg-gray-800 text-white text-xs rounded-md p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    Right-click on Google Maps to copy coordinates and paste here, or use the GPS button in the field.
                                </div>
                            </div>
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                            <input value={coords} onChange={e => setCoords(e.target.value)} type="text" placeholder="e.g., 45.123, 9.456" required className="w-full p-2 border rounded-md" />
                            <button type="button" onClick={handleGetLocation} disabled={isGettingLocation} className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300">
                                <i className={`fas ${isGettingLocation ? 'fa-spinner fa-spin' : 'fa-location-arrow'}`}></i>
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="bg-gray-300 py-2 px-4 rounded-md">Cancel</button>
                        <button type="submit" className="bg-indigo-600 text-white py-2 px-4 rounded-md">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const SiteDetail = ({ site, onBack }) => {
    const [piezometers, setPiezometers] = useState([]);
    const [selectedPiezometer, setSelectedPiezometer] = useState(null);
    const [samplingData, setSamplingData] = useState([]);
    const [isPzFormOpen, setIsPzFormOpen] = useState(false);
    const [isLogFormOpen, setIsLogFormOpen] = useState(false);
    const [logFormData, setLogFormData] = useState({ depthToWater: '', ph: '', conductivity: '', temperature: '', notes: '' });

    useEffect(() => {
        const fetchPiezometers = async () => {
            const response = await fetch(`${API_URL}/sites/${site._id}/piezometers`);
            setPiezometers(await response.json());
        };
        fetchPiezometers();
    }, [site._id]);

    const handlePiezometerSelect = async (pz) => {
        setSelectedPiezometer(pz);
        const response = await fetch(`${API_URL}/piezometers/${pz._id}/sampling-events`);
        const data = await response.json();
        setSamplingData(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    };

    // MODIFIED: Fully implemented the submission logic
    const handleAddSampling = async (e) => {
        e.preventDefault();
        if (!selectedPiezometer) return;

        try {
            const response = await fetch(`${API_URL}/piezometers/${selectedPiezometer._id}/sampling-events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    measurements: {
                        depthToWater: logFormData.depthToWater,
                        ph: logFormData.ph,
                        conductivity: logFormData.conductivity,
                        temperature: logFormData.temperature,
                    },
                    notes: logFormData.notes,
                }),
            });
            if (!response.ok) throw new Error('Failed to save sampling log.');

            // Reset form, close modal, and refresh data
            setLogFormData({ depthToWater: '', ph: '', conductivity: '', temperature: '', notes: '' });
            setIsLogFormOpen(false);
            handlePiezometerSelect(selectedPiezometer); // Refresh the data list
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    const handleLogFormChange = (e) => {
        const { name, value } = e.target;
        setLogFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerateReport = async (samplingEvent) => {
        // ... (this function remains the same)
    };

    return (
        <div>
            {isPzFormOpen &&
                <AddPiezometerModal
                    siteId={site._id}
                    onClose={() => setIsPzFormOpen(false)}
                    onPiezometerAdded={(newPz) => setPiezometers(prev => [...prev, newPz])}
                />
            }

            {/* NEW: Field Log Modal with high z-index */}
            {isLogFormOpen && selectedPiezometer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="font-bold text-lg mb-4">New Field Log for {selectedPiezometer.name}</h3>
                        <form onSubmit={handleAddSampling} className="grid grid-cols-2 gap-4">
                            <input name="depthToWater" value={logFormData.depthToWater} onChange={handleLogFormChange} type="number" step="0.01" placeholder="Depth to Water (m)" className="p-2 border rounded-md" />
                            <input name="ph" value={logFormData.ph} onChange={handleLogFormChange} type="number" step="0.01" placeholder="pH" className="p-2 border rounded-md" />
                            <input name="conductivity" value={logFormData.conductivity} onChange={handleLogFormChange} type="number" placeholder="Conductivity (µS/cm)" className="p-2 border rounded-md" />
                            <input name="temperature" value={logFormData.temperature} onChange={handleLogFormChange} type="number" step="0.1" placeholder="Temperature (°C)" className="p-2 border rounded-md" />
                            <textarea name="notes" value={logFormData.notes} onChange={handleLogFormChange} placeholder="Notes..." className="col-span-2 p-2 border rounded-md"></textarea>
                            <div className="col-span-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsLogFormOpen(false)} className="bg-gray-300 py-2 px-4 rounded-md">Cancel</button>
                                <button type="submit" className="bg-indigo-600 text-white py-2 px-4 rounded-md">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <button onClick={onBack} className="mb-4 text-indigo-600 hover:underline">&larr; Back to All Sites</button>
            <h2 className="text-2xl font-bold">{site.name}</h2>
            <p className="text-gray-600 mb-4">{site.client}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold">Piezometers</h3>
                            <button onClick={() => setIsPzFormOpen(true)} className="bg-blue-500 text-white text-sm py-1 px-3 rounded-md hover:bg-blue-600">+ Add New</button>
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {piezometers.map(pz => (
                                <div key={pz._id} onClick={() => handlePiezometerSelect(pz)}
                                    className={`p-2 rounded-md cursor-pointer ${selectedPiezometer?._id === pz._id ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-indigo-100'}`}>
                                    {pz.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                    <div className="h-[400px] rounded-lg overflow-hidden shadow-md">
                        <MapContainer center={site.coordinates} zoom={16} style={{ height: "100%", width: "100%" }}>
                            <LayersControl position="topright">
                                <LayersControl.BaseLayer name="Satellite Imagery">
                                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                                </LayersControl.BaseLayer>
                                <LayersControl.BaseLayer checked name="Street Map">
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                </LayersControl.BaseLayer>
                            </LayersControl>
                            {piezometers.map(pz => <Marker key={pz._id} position={pz.coordinates}><Popup>{pz.name}</Popup></Marker>)}
                        </MapContainer>
                    </div>

                    {selectedPiezometer && (
                        <div className="bg-white p-4 rounded-lg shadow-md">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg">Data for {selectedPiezometer.name}</h3>
                                <button onClick={() => setIsLogFormOpen(true)} className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600">+ Add Field Log</button>
                            </div>

                            <div className="mt-4">
                                <h4 className="font-semibold text-gray-700 mb-2">Sampling History</h4>
                                <div className="max-h-60 overflow-y-auto border rounded-md">
                                    <table className="w-full text-sm text-left text-gray-500">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                                            <tr>
                                                <th scope="col" className="px-4 py-2">Date</th>
                                                <th scope="col" className="px-4 py-2">Water Level (m)</th>
                                                <th scope="col" className="px-4 py-2">pH</th>
                                                <th scope="col" className="px-4 py-2">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {samplingData.length > 0 ? samplingData.map(event => (
                                                <tr key={event._id} className="bg-white border-b">
                                                    <td className="px-4 py-2">{new Date(event.date).toLocaleDateString('it-IT')}</td>
                                                    <td className="px-4 py-2">{event.measurements.depthToWater || '-'}</td>
                                                    <td className="px-4 py-2">{event.measurements.ph || '-'}</td>
                                                    <td className="px-4 py-2">
                                                        <button onClick={() => handleGenerateReport(event)} className="text-indigo-600 hover:underline font-semibold">
                                                            Generate COC
                                                        </button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="4" className="text-center p-4">No sampling data yet.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SiteDetail;