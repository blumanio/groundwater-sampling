import React, { useState, useEffect } from 'react';

import config from '../config';
//const API_URL = 'http://localhost:5000/api';
const API_URL = config.API_URL;

const WasteManagement = ({ siteId }) => {
    const [wasteLogs, setWasteLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    // Form state
    const [wasteType, setWasteType] = useState('Contaminated Water');
    const [description, setDescription] = useState('');
    const [eerCode, setEerCode] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('Liters');
    const [storageLocation, setStorageLocation] = useState('');
    const [status, setStatus] = useState('Stored On-Site');
    const [imageFile, setImageFile] = useState(null);

    const fetchWasteLogs = async () => {
        try {
            const response = await fetch(`${API_URL}/sites/${siteId}/waste-logs`);
            const data = await response.json();
            setWasteLogs(data);
        } catch (error) {
            console.error("Failed to fetch waste logs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWasteLogs();
    }, [siteId]);

    const resetForm = () => {
        setWasteType('Contaminated Water');
        setDescription('');
        setEerCode('');
        setQuantity('');
        setUnit('Liters');
        setStorageLocation('');
        setStatus('Stored On-Site');
        setImageFile(null);
        setIsFormOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('wasteType', wasteType);
        formData.append('description', description);
        formData.append('eerCode', eerCode);
        formData.append('quantity', quantity);
        formData.append('unit', unit);
        formData.append('storageLocation', storageLocation);
        formData.append('status', status);
        if (imageFile) {
            formData.append('wasteImage', imageFile);
        }

        try {
            const response = await fetch(`${API_URL}/sites/${siteId}/waste-logs`, {
                method: 'POST',
                body: formData, // No 'Content-Type' header needed, browser sets it for FormData
            });

            if (!response.ok) {
                throw new Error('Failed to create waste log');
            }

            resetForm();
            fetchWasteLogs(); // Refresh the list
        } catch (error) {
            console.error("Submission error:", error);
            alert('Failed to submit waste log.');
        }
    };

    if (isLoading) {
        return <p className="text-center text-gray-500 mt-8">Loading waste logs...</p>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Waste Logs</h3>
                <button onClick={() => setIsFormOpen(true)} className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600">
                    <i className="fas fa-plus mr-2"></i>Add Waste Log
                </button>
            </div>

            {/* Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
                        <h3 className="font-bold text-xl mb-4">New Waste Log Entry</h3>
                        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Waste Type</label>
                                    <select value={wasteType} onChange={e => setWasteType(e.target.value)} className="w-full p-2 border rounded-md">
                                        <option>Contaminated Water</option>
                                        <option>Contaminated Soil</option>
                                        <option>Used Absorbents</option>
                                        <option>Drilling Cuttings</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">EER / CER Code</label>
                                    <input value={eerCode} onChange={e => setEerCode(e.target.value)} type="text" placeholder="e.g., 19 13 01*" required className="w-full p-2 border rounded-md" />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-grow">
                                        <label className="block text-sm font-medium">Quantity</label>
                                        <input value={quantity} onChange={e => setQuantity(e.target.value)} type="number" required className="w-full p-2 border rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Unit</label>
                                        <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full p-2 border rounded-md">
                                            <option>Liters</option>
                                            <option>kg</option>
                                            <option>Drums</option>
                                            <option>m³</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Management Status</label>
                                    <select value={status} onChange={e => setStatus(e.target.value)} className="w-full p-2 border rounded-md">
                                        <option>Stored On-Site</option>
                                        <option>Awaiting Disposal</option>
                                        <option>Transported Off-Site</option>
                                        <option>Disposed</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Description</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows="2" required className="w-full p-2 border rounded-md"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">On-Site Storage Location</label>
                                <input value={storageLocation} onChange={e => setStorageLocation(e.target.value)} type="text" placeholder="e.g., Drum storage area near gate" className="w-full p-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Attach Photo</label>
                                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={resetForm} className="bg-gray-300 py-2 px-4 rounded-md">Cancel</button>
                                <button type="submit" className="bg-indigo-600 text-white py-2 px-4 rounded-md">Save Log</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Waste Logs Display */}
            <div className="space-y-4 mt-4">
                {wasteLogs.length > 0 ? (
                    wasteLogs.map(log => (
                        <div key={log._id} className="bg-gray-50 p-4 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                            <div className="md:col-span-1">
                                {log.imageUrl ? (
                                    <img src={`${API_URL}${log.imageUrl}`} alt={log.wasteType} className="w-full h-40 object-cover rounded-md" />
                                ) : (
                                    <div className="w-full h-40 bg-gray-200 rounded-md flex items-center justify-center text-gray-500">
                                        <i className="fas fa-image fa-2x"></i>
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-2">
                                <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{log.eerCode}</span>
                                <h4 className="font-bold mt-2">{log.wasteType}</h4>
                                <p className="text-sm text-gray-600">{log.description}</p>
                                <div className="mt-2 text-sm space-y-1">
                                    <p><strong>Quantity:</strong> {log.quantity} {log.unit}</p>
                                    <p><strong>Status:</strong> <span className="font-semibold">{log.status}</span></p>
                                    <p><strong>Date:</strong> {new Date(log.dateGenerated).toLocaleDateString('it-IT')}</p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 mt-8">No waste logs have been created for this site yet.</p>
                )}
            </div>
        </div>
    );
};

export default WasteManagement;
