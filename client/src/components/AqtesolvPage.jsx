/*
 * Create file: blumanio/groundwater-sampling/groundwater-sampling-46bd3081445e84c43befac77c081b536b920eceb/client/src/components/AqtesolvPage.jsx
 */
import React, { useState, useEffect, useRef, useCallback,useMemo } from 'react';
import Papa from 'papaparse';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale, // Import LogarithmicScale
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import html2canvas from 'html2canvas';
import { calculateDrawdownTheis, calculateDrawdownCooperJacob, calculateFitMetrics } from '../utils/hydrogeologyUtils'; // We'll create this file next

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale, // Register LogarithmicScale
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// --- Helper Components ---

// Component to update map view when coordinates change
const MapUpdater = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, 13);
        }
    }, [center, map]);
    return null;
};

// Component to handle map rendering after tab switch
const MapInvalidator = () => {
    const map = useMap();
    useEffect(() => {
        // Invalidate map size shortly after component mounts or updates
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 10);
        return () => clearTimeout(timer);
    }, [map]);
    return null;
};


// --- Main Component ---
const AqtesolvPage = () => {
    // --- State ---
    const [activeTab, setActiveTab] = useState('data');
    const [theme] = useState(localStorage.getItem('theme') || 'light');
    const [data, setData] = useState([]);
    const [fileName, setFileName] = useState('');
    const [fileSize, setFileSize] = useState('');
    const [dataValidationError, setDataValidationError] = useState('');
    const [metadata, setMetadata] = useState({
        pumpingRate: 1500,
        distance: 100,
        wellLat: 45.65,
        wellLon: 8.88,
    });
    const [selectedModel, setSelectedModel] = useState('theis');
    const [parameters, setParameters] = useState({
        transmissivity: 1000,
        storativity: 0.0002,
    });
    const [fitMetrics, setFitMetrics] = useState({ rmse: '-', r2: '-' });

    const chartRef = useRef(null);
    const mapRef = useRef(null);
    const reportContentRef = useRef(null);
    const [reportImages, setReportImages] = useState({ chart: null, map: null });


    // --- Theme Handling ---
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    // --- Tab Navigation ---
    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
    };

    // --- File Handling & Parsing ---
    const handleFileDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('active');
        const files = e.dataTransfer.files;
        handleFiles(files);
    };

    const handleFileChange = (e) => {
        handleFiles(e.target.files);
    };

    const handleFiles = (files) => {
        if (files.length > 0) {
            const file = files[0];
            if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                setDataValidationError('Error: Please upload a valid CSV file.');
                setFileName('');
                setFileSize('');
                setData([]);
                return;
            }
            setFileName(file.name);
            setFileSize(`${(file.size / 1024).toFixed(2)} KB`);
            parseCSV(file);
        }
    };

    const parseCSV = (file) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                const validationError = validateData(results.data);
                if (validationError) {
                    setDataValidationError(`Error: ${validationError}`);
                    setData([]);
                    return;
                }
                setDataValidationError('');
                const parsedData = results.data
                    .map(row => ({ time: row.time, drawdown: row.drawdown }))
                    .filter(row => typeof row.time === 'number' && typeof row.drawdown === 'number' && row.time > 0 && row.drawdown >= 0) // Ensure time > 0
                    .sort((a, b) => a.time - b.time); // Sort data by time
                setData(parsedData);
            },
            error: (err) => {
                setDataValidationError(`CSV Parsing Error: ${err.message}`);
                setData([]);
            }
        });
    };

    const validateData = (parsedData) => {
        if (parsedData.length === 0) return "CSV file is empty or invalid.";
        const firstRow = parsedData[0];
        if (!('time' in firstRow && 'drawdown' in firstRow)) {
            return "CSV must contain 'time' and 'drawdown' columns.";
        }
        for (let i = 0; i < parsedData.length; i++) {
            const row = parsedData[i];
             if (typeof row.time !== 'number' || typeof row.drawdown !== 'number' || row.time <= 0 || row.drawdown < 0) { // Check time > 0
                return `Invalid data at row ${i + 1}: time=${row.time}, drawdown=${row.drawdown}. Values must be non-negative numbers, time must be > 0.`;
            }
        }
        return null;
    };


    // --- Metadata and Parameter Handling ---
    const handleMetadataChange = (e) => {
        const { id, value } = e.target;
        setMetadata(prev => ({ ...prev, [id.replace(/-/g, '')]: parseFloat(value) || 0 }));
    };

    const handleParameterChange = (e) => {
        const { id, value } = e.target;
        const paramName = id.replace('-slider', '');
        setParameters(prev => ({ ...prev, [paramName]: parseFloat(value) }));
    };


    // --- Model Calculations & Chart Update ---
     const calculateFittedData = useCallback(() => {
        if (data.length < 2) return [];

        const timePoints = data.map(d => d.time);
        const fitted = [];
        const minLog = Math.log10(timePoints[0]);
        const maxLog = Math.log10(timePoints[timePoints.length - 1]);

        for (let i = 0; i < 100; i++) {
            const logTime = minLog + (maxLog - minLog) * (i / 99);
            const t = Math.pow(10, logTime);
            let s;
            if (selectedModel === 'theis') {
                s = calculateDrawdownTheis(t, metadata.pumpingRate, metadata.distance, parameters.transmissivity, parameters.storativity);
            } else if (selectedModel === 'cooper-jacob') {
                s = calculateDrawdownCooperJacob(t, metadata.pumpingRate, metadata.distance, parameters.transmissivity, parameters.storativity);
            }

            if (s !== null && s > 0 && isFinite(s)) {
                fitted.push({ x: t, y: s });
            }
        }
         // Ensure the fitted data covers the range smoothly, especially for Cooper-Jacob
        return fitted.sort((a,b) => a.x - b.x);
    }, [data, selectedModel, metadata, parameters]);


    useEffect(() => {
        const observed = data.map(d => ({ x: d.time, y: d.drawdown }));
        const fitted = calculateFittedData();
        const metrics = calculateFitMetrics(observed, fitted, (t) => {
             if (selectedModel === 'theis') {
                return calculateDrawdownTheis(t, metadata.pumpingRate, metadata.distance, parameters.transmissivity, parameters.storativity);
            } else if (selectedModel === 'cooper-jacob') {
                return calculateDrawdownCooperJacob(t, metadata.pumpingRate, metadata.distance, parameters.transmissivity, parameters.storativity);
            }
            return 0;
        });
        setFitMetrics(metrics);
    }, [data, metadata, parameters, selectedModel, calculateFittedData]);


    const chartData = useMemo(() => {
        const observed = data.map(d => ({ x: d.time, y: d.drawdown }));
        const fitted = calculateFittedData();

        return {
            datasets: [
                {
                    label: 'Observed Data',
                    data: observed,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    pointRadius: 5,
                    showLine: false,
                    type: 'scatter',
                },
                {
                    label: 'Fitted Curve',
                    data: fitted,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderWidth: 2,
                    pointRadius: 0,
                    showLine: true,
                    type: 'line', // Ensure this is line type
                    tension: 0.1 // Optional: for slight smoothing
                }
            ]
        };
    }, [data, calculateFittedData]); // Recalculate when data or fitted data changes

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'logarithmic',
                title: {
                    display: true,
                    text: 'Time (days)',
                    color: theme === 'dark' ? '#e2e8f0' : '#2d3748'
                },
                 ticks: {
                     color: theme === 'dark' ? '#e2e8f0' : '#2d3748',
                     // Add more ticks for logarithmic scale if needed
                     callback: function(value, index, values) {
                         // Only show labels for powers of 10 or significant points
                         const log = Math.log10(value);
                         if (log === Math.floor(log) || index === 0 || index === values.length -1) {
                            return Number(value.toPrecision(1)).toString();
                         }
                         return '';
                     }
                 },
                 grid: {
                     color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                 }
            },
            y: {
                // type: 'linear', // Optional: could be logarithmic too
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Drawdown (m)',
                     color: theme === 'dark' ? '#e2e8f0' : '#2d3748'
                },
                 ticks: {
                     color: theme === 'dark' ? '#e2e8f0' : '#2d3748'
                 },
                 grid: {
                    color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                 }
            }
        },
         plugins: {
            legend: {
                 labels: {
                     color: theme === 'dark' ? '#e2e8f0' : '#2d3748'
                 }
            },
            tooltip: {
                bodyColor: theme === 'dark' ? '#e2e8f0' : '#2d3748',
                titleColor: theme === 'dark' ? '#e2e8f0' : '#2d3748',
            }
         }
    };


    // --- Model Info Display ---
    const modelDescriptions = {
        theis: {
            name: "Theis (1935)",
            description: "The Theis solution is a fundamental analytical model for transient flow to a fully penetrating well in a confined, homogeneous, isotropic aquifer of infinite extent. It is based on the analogy between groundwater flow and heat conduction.",
            assumptions: ["Aquifer is confined, homogeneous, isotropic, and of infinite areal extent.", "Well is fully penetrating.", "Pumping rate is constant."]
        },
        'cooper-jacob': {
            name: "Cooper-Jacob (1946)",
            description: "The Cooper-Jacob method is a simplification of the Theis solution, applicable for small values of 'u' (i.e., large time or small distance). It allows for straightforward graphical analysis on semi-log plots.",
            assumptions: ["Same as Theis.", "Valid for small values of u (u < 0.05)."]
        }
    };
    const currentModelInfo = modelDescriptions[selectedModel];

    // --- Map ---
     const mapCenter = [metadata.wellLat, metadata.wellLon];


    // --- Reporting ---
     const prepareReportImages = async () => {
        let chartImgData = null;
        let mapImgData = null;

        // Capture chart
        if (chartRef.current) {
            chartImgData = chartRef.current.toBase64Image();
        }

        // Capture map - requires switching to map tab temporarily if not active
        const currentActiveTab = activeTab;
        if (activeTab !== 'map') {
            setActiveTab('map');
            // Give map time to render
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (mapRef.current) {
             try {
                const mapElement = document.getElementById('map'); // Target the container div
                if (mapElement) {
                     const canvas = await html2canvas(mapElement, {
                         useCORS: true, // Important for external tiles
                         logging: false // Disable logging to console
                     });
                     mapImgData = canvas.toDataURL('image/png');
                 }
             } catch (error) {
                 console.error("Error capturing map:", error);
                 mapImgData = null; // Set to null if capture fails
             }
        }

         // Switch back to report tab (or original tab)
         setActiveTab(currentActiveTab === 'report' ? 'report' : currentActiveTab);
         // Short delay to allow tab switching before potentially triggering PDF generation
        await new Promise(resolve => setTimeout(resolve, 100));


        setReportImages({ chart: chartImgData, map: mapImgData });
    };

    // Prepare images when switching to the report tab
    useEffect(() => {
        if (activeTab === 'report') {
            prepareReportImages();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]); // Trigger only when activeTab changes


     const exportPDF = async () => {
        await prepareReportImages(); // Ensure images are fresh

         const reportElement = reportContentRef.current;
        if (!reportElement) return;

         // Temporarily set images for rendering before capture
         const tempChartImg = reportElement.querySelector('#report-chart-img');
         const tempMapImg = reportElement.querySelector('#report-map-img');
         if (tempChartImg && reportImages.chart) tempChartImg.src = reportImages.chart;
         if (tempMapImg && reportImages.map) tempMapImg.src = reportImages.map;

        const { jsPDF } = window.jspdf;
        html2canvas(reportElement, { scale: 2, useCORS: true }).then(canvas => { // Increase scale for better quality
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps= pdf.getImageProperties(imgData);
            const imgWidth = pdfWidth - 20; // Add some margin
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
             let heightLeft = imgHeight;
             let position = 10; // Top margin

            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
             heightLeft -= (pdfHeight - 20); // Subtract first page height (with margins)

             while (heightLeft > 0) {
                 position = heightLeft - imgHeight + 10; // Calculate new position for next page
                 pdf.addPage();
                 pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                 heightLeft -= (pdfHeight - 20);
             }

            pdf.save("AQTESOLV-Web-Report.pdf");

             // Clear temporary images after PDF generation
             if (tempChartImg) tempChartImg.src = "";
             if (tempMapImg) tempMapImg.src = "";
        });
    };

    const exportCSV = () => {
        const headers = "Parameter,Value,Units\n";
        const k = (parameters.transmissivity / 10).toFixed(2); // Assuming aquifer thickness of 10m
        const rows = [
            `Model,"${currentModelInfo?.name || selectedModel}",`,
            `Transmissivity,${parameters.transmissivity},m2/day`,
            `Storativity,${parameters.storativity.toExponential(2)},`,
            `Hydraulic Conductivity (est.),${k},m/day`,
            `RMSE,${fitMetrics.rmse},`,
            `R-squared,${fitMetrics.r2},`
        ];
        const csvContent = "data:text/csv;charset=utf-8," + headers + rows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "aqtesolv_web_results.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportJSON = () => {
         const exportData = {
            metadata: metadata,
            analysis: {
                model: selectedModel,
                parameters: parameters,
                fit_metrics: fitMetrics
            },
            data: data
        };
        const jsonContent = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const link = document.createElement("a");
        link.setAttribute("href", jsonContent);
        link.setAttribute("download", "aqtesolv_web_session.json");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Render ---
    return (
        <div className="min-h-screen flex flex-col text-sm"> {/* Reduced base font size */}
            {/* Header - Assuming you have a shared header or integrate this logic */}
            {/* Tab Navigation */}
            <nav className="card-bg-light-mode dark:card-bg-dark-mode border-b border-light-mode dark:border-dark-mode">
                <div className="container mx-auto px-4">
                    <div id="tabs" className="flex space-x-6 overflow-x-auto"> {/* Reduced space */}
                        {['data', 'model', 'fit', 'map', 'report'].map(tabId => (
                            <button
                                key={tabId}
                                data-tab={tabId}
                                onClick={() => handleTabChange(tabId)}
                                className={`tab-button py-3 px-1 text-xs font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-500 whitespace-nowrap ${activeTab === tabId ? 'active' : ''}`} // Reduced padding, smaller text
                            >
                                {tabId === 'data' && '🗂️ Data'}
                                {tabId === 'model' && '📊 Model'}
                                {tabId === 'fit' && '📈 Fit & Visualize'}
                                {tabId === 'map' && '🌍 Map'}
                                {tabId === 'report' && '📤 Report'}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

             {/* Main Content */}
             <main className="flex-grow container mx-auto p-4 md:p-6">
                 {/* Data Tab */}
                 <div id="data-tab" className={`tab-content grid grid-cols-1 lg:grid-cols-3 gap-4 ${activeTab !== 'data' ? 'hidden' : ''}`}> {/* Reduced gap */}
                     {/* Left Column: Data Input */}
                     <div className="lg:col-span-1 space-y-4"> {/* Reduced space */}
                          <div className="card-bg-light-mode dark:card-bg-dark-mode p-4 rounded-lg shadow"> {/* Reduced padding */}
                              <h2 className="text-md font-semibold mb-3">1. Upload Data</h2> {/* Reduced size/margin */}
                              <div
                                id="drag-drop-area"
                                className="drag-area rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition" // Reduced padding
                                onClick={() => document.getElementById('file-input').click()}
                                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('active');}}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation();}}
                                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('active');}}
                                onDrop={handleFileDrop}
                              >
                                  <p className="text-gray-500 dark:text-gray-400 text-sm">Drag & drop CSV</p> {/* Smaller text */}
                                  <p className="text-xs text-gray-400 dark:text-gray-500 my-1">or</p> {/* Smaller text/margin */}
                                  <button type="button" className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition text-xs">Browse</button> {/* Smaller button */}
                                  <input type="file" id="file-input" className="hidden" accept=".csv" onChange={handleFileChange}/>
                              </div>
                              <div id="file-info" className="mt-2 text-xs text-gray-600 dark:text-gray-300">{fileName && `File: ${fileName} (${fileSize})`}</div> {/* Smaller text */}
                              <div id="data-validation-error" className="mt-1 text-xs text-red-500">{dataValidationError}</div> {/* Smaller text */}
                              <p className="text-xs text-gray-400 mt-1">Cols: 'time', 'drawdown'</p> {/* Smaller text */}
                          </div>

                         <div className="card-bg-light-mode dark:card-bg-dark-mode p-4 rounded-lg shadow"> {/* Reduced padding */}
                             <h2 className="text-md font-semibold mb-3">2. Enter Metadata</h2> {/* Reduced size/margin */}
                             <div className="space-y-3"> {/* Reduced space */}
                                 {/* Input fields remain similar but ensure consistent styling */}
                                 <div>
                                      <label htmlFor="pumping-rate" className="block text-xs font-medium mb-0.5">Pumping Rate (Q) [m³/day]</label> {/* Smaller text */}
                                      <input type="number" id="pumping-rate" value={metadata.pumpingRate} onChange={handleMetadataChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1.5"/> {/* Reduced padding */}
                                  </div>
                                   <div>
                                       <label htmlFor="well-distance" className="block text-xs font-medium mb-0.5">Obs. Well Distance (r) [m]</label>
                                       <input type="number" id="well-distance" value={metadata.distance} onChange={handleMetadataChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1.5"/>
                                   </div>
                                     <div>
                                         <label htmlFor="well-lat" className="block text-xs font-medium mb-0.5">Pumping Well Latitude</label>
                                         <input type="number" id="well-lat" value={metadata.wellLat} onChange={handleMetadataChange} step="0.0001" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1.5"/>
                                     </div>
                                      <div>
                                          <label htmlFor="well-lon" className="block text-xs font-medium mb-0.5">Pumping Well Longitude</label>
                                          <input type="number" id="well-lon" value={metadata.wellLon} onChange={handleMetadataChange} step="0.0001" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1.5"/>
                                      </div>
                             </div>
                         </div>
                     </div>

                     {/* Right Column: Data Preview */}
                     <div className="lg:col-span-2 card-bg-light-mode dark:card-bg-dark-mode p-4 rounded-lg shadow"> {/* Reduced padding */}
                         <h2 className="text-md font-semibold mb-3">Data Preview</h2> {/* Reduced size/margin */}
                         <div className="overflow-auto h-80 border border-light-mode dark:border-dark-mode rounded-md"> {/* Adjusted height */}
                             <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0"> {/* Sticky header */}
                                     <tr>
                                         <th scope="col" id="time-header" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th> {/* Reduced padding */}
                                         <th scope="col" id="drawdown-header" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Drawdown</th> {/* Reduced padding */}
                                     </tr>
                                 </thead>
                                 <tbody id="data-table-body" className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                      {data.length === 0 ? (
                                           <tr><td colSpan="2" className="px-4 py-3 text-center text-gray-500 text-xs">Upload data to see preview.</td></tr> /* Reduced padding/size */
                                       ) : (
                                           data.map((row, index) => (
                                               <tr key={index}>
                                                   <td className="px-4 py-2 whitespace-nowrap text-xs">{row.time}</td> {/* Reduced padding/size */}
                                                   <td className="px-4 py-2 whitespace-nowrap text-xs">{row.drawdown}</td> {/* Reduced padding/size */}
                                               </tr>
                                           ))
                                       )}
                                 </tbody>
                             </table>
                         </div>
                     </div>
                 </div>

                 {/* Model Tab */}
                 <div id="model-tab" className={`tab-content ${activeTab !== 'model' ? 'hidden' : ''}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Reduced gap */}
                       <div className="md:col-span-1 card-bg-light-mode dark:card-bg-dark-mode p-4 rounded-lg shadow"> {/* Reduced padding */}
                            <h2 className="text-md font-semibold mb-3">Select Analytical Model</h2> {/* Reduced size/margin */}
                            <select id="model-selector" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1.5"> {/* Reduced padding */}
                                <option value="theis">Theis (1935)</option>
                                <option value="cooper-jacob">Cooper-Jacob (1946)</option>
                            </select>
                        </div>
                        <div id="model-info" className="md:col-span-2 card-bg-light-mode dark:card-bg-dark-mode p-4 rounded-lg shadow"> {/* Reduced padding */}
                           {currentModelInfo && (
                                <>
                                    <h3 className="text-md font-bold">{currentModelInfo.name}</h3> {/* Reduced size */}
                                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{currentModelInfo.description}</p> {/* Reduced size/margin */}
                                    <h4 className="mt-3 font-semibold text-xs">Assumptions:</h4> {/* Reduced size/margin */}
                                    <ul className="list-disc list-inside mt-1 text-xs space-y-1 text-gray-600 dark:text-gray-300"> {/* Reduced size/margin */}
                                        {currentModelInfo.assumptions.map((item, index) => <li key={index}>{item}</li>)}
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                 {/* Fit & Visualize Tab */}
                <div id="fit-tab" className={`tab-content grid grid-cols-1 lg:grid-cols-3 gap-4 ${activeTab !== 'fit' ? 'hidden' : ''}`}> {/* Reduced gap */}
                    <div className="lg:col-span-2 card-bg-light-mode dark:card-bg-dark-mode p-4 rounded-lg shadow h-[400px] md:h-[500px]"> {/* Reduced padding, adjusted height */}
                        <h2 className="text-md font-semibold mb-3">Time-Drawdown Analysis</h2> {/* Reduced size/margin */}
                        <div className="h-[calc(100%-2rem)]"> {/* Ensure chart canvas fits */}
                           <Line ref={chartRef} options={chartOptions} data={chartData} />
                        </div>
                    </div>
                     <div className="lg:col-span-1 space-y-4"> {/* Reduced space */}
                          <div className="card-bg-light-mode dark:card-bg-dark-mode p-4 rounded-lg shadow"> {/* Reduced padding */}
                              <h2 className="text-md font-semibold mb-3">Manual Curve Fitting</h2> {/* Reduced size/margin */}
                              <div className="space-y-3"> {/* Reduced space */}
                                  <div>
                                      <label htmlFor="transmissivity-slider" className="block text-xs font-medium">Transmissivity (T) [m²/day]</label> {/* Smaller text */}
                                      <div className="flex items-center space-x-2">
                                          <input type="range" id="transmissivity-slider" min="10" max="5000" value={parameters.transmissivity} onChange={handleParameterChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"/>
                                          <span id="transmissivity-value" className="text-xs font-mono w-16 text-center">{parameters.transmissivity}</span> {/* Reduced width */}
                                      </div>
                                  </div>
                                  <div>
                                       <label htmlFor="storativity-slider" className="block text-xs font-medium">Storativity (S)</label> {/* Smaller text */}
                                       <div className="flex items-center space-x-2">
                                           <input type="range" id="storativity-slider" min="0.00001" max="0.01" step="0.00001" value={parameters.storativity} onChange={handleParameterChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"/>
                                           <span id="storativity-value" className="text-xs font-mono w-16 text-center">{parameters.storativity.toExponential(1)}</span> {/* Reduced width/precision */}
                                       </div>
                                  </div>
                              </div>
                          </div>
                          <div className="card-bg-light-mode dark:card-bg-dark-mode p-4 rounded-lg shadow"> {/* Reduced padding */}
                              <h2 className="text-md font-semibold mb-2">Fit Quality</h2> {/* Reduced size/margin */}
                               <div id="fit-metrics" className="text-xs space-y-1"> {/* Reduced size/space */}
                                   <p><strong>RMSE:</strong> <span id="rmse-value">{fitMetrics.rmse}</span></p>
                                   <p><strong>R²:</strong> <span id="r2-value">{fitMetrics.r2}</span></p>
                               </div>
                          </div>
                     </div>
                </div>

                {/* Map Tab */}
                 <div id="map-tab" className={`tab-content ${activeTab !== 'map' ? 'hidden' : ''}`}>
                    <div className="card-bg-light-mode dark:card-bg-dark-mode p-4 rounded-lg shadow h-[500px] md:h-[600px] flex flex-col"> {/* Reduced padding, adjusted height */}
                       <h2 className="text-md font-semibold mb-3">Site Map</h2> {/* Reduced size/margin */}
                       <div id="map" className="flex-grow rounded-md border border-light-mode dark:border-dark-mode" style={{ zIndex: 10 }}>
                           <MapContainer
                                center={mapCenter}
                                zoom={13}
                                scrollWheelZoom={true}
                                style={{ height: "100%", width: "100%" }}
                                whenCreated={mapInstance => { mapRef.current = mapInstance; }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <Marker position={mapCenter}>
                                    <Popup>Pumping Well Location</Popup>
                                </Marker>
                                <MapUpdater center={mapCenter} />
                                 {activeTab === 'map' && <MapInvalidator />} {/* Invalidate size when tab becomes active */}
                            </MapContainer>
                       </div>
                    </div>
                </div>


                  {/* Report Tab */}
                  <div id="report-tab" className={`tab-content ${activeTab !== 'report' ? 'hidden' : ''}`}>
                      <div className="flex justify-end space-x-2 mb-3"> {/* Reduced space/margin */}
                          <button id="export-pdf-btn" onClick={exportPDF} className="bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition text-xs">Export PDF</button> {/* Smaller button */}
                          <button id="export-csv-btn" onClick={exportCSV} className="bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 transition text-xs">Export CSV</button> {/* Smaller button */}
                          <button id="export-json-btn" onClick={exportJSON} className="bg-yellow-500 text-white px-3 py-1.5 rounded-md hover:bg-yellow-600 transition text-xs">Export JSON</button> {/* Smaller button */}
                      </div>
                      <div id="report-content" ref={reportContentRef} className="card-bg-light-mode dark:card-bg-dark-mode p-6 rounded-lg shadow space-y-4"> {/* Reduced padding/space */}
                          <h1 className="text-xl font-bold border-b pb-1 mb-3">Hydrogeological Analysis Report</h1> {/* Reduced size/padding/margin */}
                          <div>
                              <h2 className="text-lg font-semibold mb-1">1. Summary of Results</h2> {/* Reduced size/margin */}
                              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 mt-1 text-xs"> {/* Reduced size/margin */}
                                  <tbody id="results-summary-table" className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                      {/* Results will be populated here */}
                                      <tr><td className="px-4 py-2 font-medium">Model</td><td className="px-4 py-2">{currentModelInfo?.name || selectedModel}</td></tr>
                                      <tr><td className="px-4 py-2 font-medium">Transmissivity (T)</td><td className="px-4 py-2">{parameters.transmissivity} m²/day</td></tr>
                                      <tr><td className="px-4 py-2 font-medium">Storativity (S)</td><td className="px-4 py-2">{parameters.storativity.toExponential(2)}</td></tr>
                                      <tr><td className="px-4 py-2 font-medium">Hydraulic Conductivity (K, est.)</td><td className="px-4 py-2">{(parameters.transmissivity / 10).toFixed(2)} m/day</td></tr>
                                      <tr><td className="px-4 py-2 font-medium">RMSE</td><td className="px-4 py-2">{fitMetrics.rmse}</td></tr>
                                      <tr><td className="px-4 py-2 font-medium">R²</td><td className="px-4 py-2">{fitMetrics.r2}</td></tr>
                                  </tbody>
                              </table>
                          </div>
                           <div>
                               <h2 className="text-lg font-semibold mb-1">2. Time-Drawdown Plot</h2> {/* Reduced size/margin */}
                               <div className="mt-1 border rounded-lg p-2 max-w-lg mx-auto"> {/* Reduced padding/margin */}
                                    {/* Image will be populated by prepareReport */}
                                   <img id="report-chart-img" src={reportImages.chart || ""} alt="Time-Drawdown Chart" className="mx-auto w-full"/>
                               </div>
                           </div>
                            <div>
                                <h2 className="text-lg font-semibold mb-1">3. Site Map</h2> {/* Reduced size/margin */}
                                 <div className="mt-1 border rounded-lg p-2 max-w-lg mx-auto"> {/* Reduced padding/margin */}
                                     {/* Image will be populated by prepareReport */}
                                     <img id="report-map-img" src={reportImages.map || ""} alt="Site Map" className="mx-auto w-full"/>
                                 </div>
                            </div>
                      </div>
                  </div>

             </main>
        </div>
    );
};

export default AqtesolvPage;