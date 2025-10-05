import React, { useState, useEffect } from 'react';
import config from '../config';

const API_URL = config.API_URL;

// Mock list of all supported parameters, linked to API measurement fields
const initialParameters = [
    { id: 'depthToWater', name: 'Water Level', unit: 'm', value: '', measured: true, required: true, icon: '💧' },
    // Removed 'depthPZ' as a distinct field to simplify mapping to 'depthToWater'
    { id: 'ph', name: 'pH', unit: 'pH', value: '', measured: true, required: true, icon: '🧪' },
    { id: 'conductivity', name: 'EC/Conductivity', unit: 'µS/cm', value: '', measured: true, required: true, icon: '⚡' },
    { id: 'temperature', name: 'Temperature', unit: '°C', value: '', measured: true, required: true, icon: '🌡️' },
    { id: 'dissolvedOxygen', name: 'Dissolved Oxygen (DO)', unit: 'mg/L', value: '', measured: true, required: false, icon: '🌬️' },
    { id: 'redoxPotential', name: 'Redox Potential', unit: 'mV', value: '', measured: true, required: false, icon: '📊' },
    { id: 'tds', name: 'TDS (Optional)', unit: 'mg/L', value: '', measured: true, required: false, icon: '🧂' },
];

const ParameterCard = ({ param, onValueChange, onToggleMeasured }) => {
    return (
        <div className={`bg-white rounded-lg p-4 shadow-lg border-l-4 ${param.measured ? 'border-indigo-500' : 'border-gray-300'} transition-all`}>
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                    <span className="mr-2 text-2xl">{param.icon}</span> {param.name}
                    {param.required && <span className="ml-2 text-red-500 text-sm">*</span>}
                </h4>
                <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-500">Not Measured</label>
                    <input 
                        type="checkbox" 
                        checked={!param.measured} 
                        onChange={() => onToggleMeasured(param.id)}
                        className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                </div>
            </div>
            
            <div className="flex space-x-2 items-center">
                <input
                    type="number"
                    step="0.01"
                    placeholder="Enter Reading"
                    value={param.value}
                    onChange={(e) => onValueChange(param.id, e.target.value)}
                    disabled={!param.measured}
                    className={`flex-1 p-3 text-xl border-2 rounded-lg focus:outline-none focus:ring-4 ${param.measured ? 'focus:ring-indigo-500/50 border-gray-300' : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'}`}
                    style={{ height: '60px' }} 
                />
                
                <span className="text-lg font-medium text-gray-600">{param.unit}</span>
                
                <button
                    type="button"
                    title="Voice Input (Feature Placeholder)"
                    disabled={!param.measured}
                    className={`p-3 rounded-full transition-colors shadow-md ${param.measured ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    style={{ height: '60px', width: '60px' }} 
                >
                    🎤
                </button>
            </div>
        </div>
    );
};

const PZMeasurementEntry = ({ pz, siteName, onComplete, onBack }) => {
    const [parameters, setParameters] = useState(initialParameters);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        // Auto-save simulation
        const timer = setTimeout(() => {
            console.log('Auto-saving PZ data:', pz.name);
        }, 3000);
        return () => clearTimeout(timer);
    }, [parameters, notes, pz.name]);

    const handleValueChange = (id, value) => {
        setParameters(params => params.map(p => 
            p.id === id ? { ...p, value: value } : p
        ));
    };

    const handleToggleMeasured = (id) => {
        setParameters(params => params.map(p => 
            p.id === id ? { ...p, measured: !p.measured, value: !p.measured ? '' : p.value } : p
        ));
    };

    // Calculate Completion Status (Only counts required fields)
    const requiredParameters = parameters.filter(p => p.required);
    const totalCount = requiredParameters.length;
    const measuredCount = requiredParameters.filter(p => p.measured && p.value !== '').length;
    const progressPercent = (measuredCount / totalCount) * 100;
    const isCompleted = measuredCount === totalCount;

    const handleSubmit = async () => {
        if (!isCompleted) {
            alert('Please complete all required measurements before submitting.');
            return;
        }

        const measurements = parameters
            .filter(p => p.measured && p.value !== '')
            .reduce((acc, p) => {
                // Map the parameter ID to the exact backend schema field names
                // TDS is not in the schema, so we skip it.
                if (p.id !== 'tds') {
                    acc[p.id] = parseFloat(p.value);
                }
                return acc;
            }, {});

        try {
            const payload = {
                measurements: measurements,
                notes: notes,
                date: new Date(),
            };

            console.log('Validating and Submitting Payload:', payload);

            // Send request to backend
            const response = await fetch(`${API_URL}/piezometers/${pz._id}/sampling-events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to save sampling event on the server.');
            
            alert('Sampling event successfully saved and synced! ✅');
            onComplete(); 

        } catch (error) {
            alert(`Error saving data: ${error.message}. Please check your connection and try again.`);
        }
    };


    // --- Render ---
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-lg border-b sticky top-0 z-30 p-4">
                <div className="flex items-center justify-between mb-2">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <h2 className="text-xl font-bold text-gray-800 truncate">{pz.name} - {siteName}</h2>
                    <button title="QR/Barcode Scan" className="p-2 text-indigo-600 hover:bg-gray-100 rounded-full transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10h16V7H4zm1 1h14M8 11v6m8-6v6" /></svg>
                    </button>
                </div>
                
                <div className="text-xs text-gray-500 mb-2">
                    GPS Location: {pz.coordinates[0]?.toFixed(6)}, {pz.coordinates[1]?.toFixed(6)} 
                    (Auto-tagged at {new Date().toLocaleTimeString()})
                </div>

                {/* Completion Bar */}
                <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                        Progress: {Math.round(progressPercent)}%
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                            className={`h-3 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-indigo-500'} transition-all duration-500`} 
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="p-4 max-w-7xl mx-auto space-y-6">
                
                {/* PZ Parameters */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-800">Measurements</h3>
                    {parameters.map(param => (
                        <ParameterCard 
                            key={param.id} 
                            param={param} 
                            onValueChange={handleValueChange}
                            onToggleMeasured={handleToggleMeasured}
                        />
                    ))}
                </div>

                {/* Notes Field */}
                <div className="bg-white p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Notes (Optional)</h3>
                    <div className="flex space-x-2 items-start">
                        <textarea
                            placeholder="Add any site notes or observations here..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows="4"
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                        ></textarea>
                         <button
                            type="button"
                            title="Voice Dictation (Feature Placeholder)"
                            className="p-3 rounded-full transition-colors bg-indigo-500 hover:bg-indigo-600 text-white shadow-md"
                            style={{ height: '60px', width: '60px', minWidth: '60px' }} 
                        >
                            🗣️
                        </button>
                    </div>
                </div>

                {/* Completion Button: Triggers Validation and Submission */}
                <div className="pb-20">
                    <button
                        onClick={handleSubmit}
                        disabled={!isCompleted}
                        className={`w-full py-4 rounded-lg text-xl font-bold transition-colors shadow-2xl ${
                            isCompleted ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        {isCompleted ? 'Validate & Submit to Server ✅' : `Finish ${totalCount - measuredCount} required parameter(s)`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PZMeasurementEntry;