import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';

const API_URL = 'http://localhost:5000/api';

const Receipts = ({ receipts = [], commesse = [], onDataChange }) => {
    // --- State Management ---
    const [receiptEditImage, setReceiptEditImage] = useState(null);
    const [textInput, setTextInput] = useState('');
    const [textX, setTextX] = useState(50);
    const [textY, setTextY] = useState(50);
    const [fontSize, setFontSize] = useState(24);
    const [fontColor, setFontColor] = useState('#000000');
    const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
    const [receiptAmount, setReceiptAmount] = useState('');
    const [previewPdfUrl, setPreviewPdfUrl] = useState('');
    const [selectedCommessa, setSelectedCommessa] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- Refs ---
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    // --- Effects ---
    useEffect(() => {
        if (commesse.length > 0 && !selectedCommessa) {
            setSelectedCommessa(commesse[0]);
        }
    }, [commesse, selectedCommessa]);

    useEffect(() => {
        if (receiptEditImage && canvasRef.current) {
            setupCanvas(receiptEditImage, canvasRef.current);
        }
    }, [receiptEditImage]);

    useEffect(() => {
        return () => {
            if (previewPdfUrl) {
                URL.revokeObjectURL(previewPdfUrl);
            }
        };
    }, [previewPdfUrl]);

    // --- Helper Functions ---
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // --- Canvas Drawing Functions ---
    const setupCanvas = (image, canvasElement) => {
        const ctx = canvasElement.getContext('2d');
        const maxWidth = 800;
        const maxHeight = 600;
        let { width, height } = image;
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
        }
        canvasElement.width = width;
        canvasElement.height = height;
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        ctx.drawImage(image, 0, 0, width, height);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => setReceiptEditImage(img);
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

const drawTextOverlay = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (receiptEditImage) {
        setupCanvas(receiptEditImage, canvas);
    }

    // --- Text and Style Setup ---
    const notes = textInput.trim();
    const commessaProj = `Commessa: ${selectedCommessa?.CodiceElementoWBS || ''}`;
    const projectText = ` - ${selectedCommessa?.Descrizione.split('-')[1] || ''}`;
    
    ctx.font = `${fontSize}px Arial`;
    // ADDED: Define a background color (semi-transparent white)
    const backgroundColor = 'rgba(255, 255, 255, 0.75)';

    // --- Helper function to draw text with a background ---
    const drawTextWithBackground = (text, x, y) => {
        // 1. Measure the text to get its width
        const textMetrics = ctx.measureText(text);
        const textHeight = parseInt(fontSize, 10); // Approximate height
        const padding = 4;

        // 2. Set the background color and draw the rectangle
        ctx.fillStyle = backgroundColor;
        // The Y position is shifted up by the font size because fillText's y is the baseline
        ctx.fillRect(
            x - padding, 
            y - textHeight, 
            textMetrics.width + (padding * 2), 
            textHeight + (padding * 2)
        );

        // 3. Set the text color and draw the actual text on top
        ctx.fillStyle = fontColor;
        ctx.fillText(text, x, y);
    };

    // --- Draw the text layers ---
    const startX = parseInt(textX, 10);
    let currentY = parseInt(textY, 10);
    const lineHeight = parseInt(fontSize, 10) + 10; // Space between lines

    // Draw optional notes first
    if (notes) {
        drawTextWithBackground(notes, startX, currentY);
        currentY += lineHeight; // Move down for the next line
    }
    
    // MODIFIED: Draw the project code and description on two separate lines
    drawTextWithBackground(commessaProj, startX, currentY);
    currentY += lineHeight; // Move down for the final line
    drawTextWithBackground(projectText, startX, currentY);
};

    // --- Data Handling Functions ---
    const resetForm = () => {
        setReceiptEditImage(null);
        setTextInput('');
        setReceiptAmount('');
        setReceiptDate(new Date().toISOString().split('T')[0]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const saveReceipt = async () => {
        const canvas = canvasRef.current;
        if (!canvas || !receiptAmount || !selectedCommessa) {
            setError('Please fill out all fields and upload a receipt image.');
            return;
        }
        setError(null);
        setIsLoading(true);
        drawTextOverlay();
        const newReceipt = {
            date: receiptDate,
            amount: parseFloat(receiptAmount),
            text: textInput,
            imageData: canvas.toDataURL('image/jpeg', 0.8),
            commessa: selectedCommessa,
        };
        try {
            const response = await fetch(`${API_URL}/receipts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newReceipt),
            });
            if (!response.ok) throw new Error('Failed to save the receipt.');
            resetForm();
            await onDataChange();
        } catch (error) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteReceipt = async (id) => {
        if (window.confirm('Are you sure you want to delete this receipt?')) {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_URL}/receipts/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Failed to delete the receipt.');
                await onDataChange();
            } catch (error) {
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const downloadReceiptPDF = (receipt) => {
        const pdf = new jsPDF();
        let yPos = 20;
        pdf.setFontSize(16);
        pdf.text('Receipt Details', 10, yPos);
        yPos += 10;
        pdf.setFontSize(10);
        pdf.text(`Date: ${formatDate(receipt.date)}`, 10, yPos);
        yPos += 5;
        pdf.text(`Amount: €${receipt.amount.toFixed(2)}`, 10, yPos);
        yPos += 5;
        pdf.text(`Notes: ${receipt.text || 'No notes'}`, 10, yPos);
        yPos += 5;
        if (receipt.commessa) {
            pdf.text(`Project: ${receipt.commessa.CodiceProgettoSAP}`, 10, yPos);
            yPos += 5;
            pdf.text(`Description: ${receipt.commessa.Descrizione}`, 10, yPos);
        }
        yPos += 10;
        const imgData = receipt.imageData;
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgWidth = 120;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        const xOffset = (pdfWidth - imgWidth) / 2;
        if (yPos + imgHeight > pdf.internal.pageSize.getHeight() - 10) {
            pdf.addPage();
            yPos = 20;
        }
        pdf.addImage(imgData, 'JPEG', xOffset, yPos, imgWidth, imgHeight);
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        setPreviewPdfUrl(url);
    };

    return (
        <div>
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                    <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                {/* ADDED: Complete form content */}
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    <i className="fas fa-plus-circle text-indigo-500 mr-2"></i>Add New Receipt
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Project</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            value={selectedCommessa?.CodiceProgettoSAP || ''}
                            onChange={(e) => {
                                const selected = commesse.find(c => c.CodiceProgettoSAP === e.target.value);
                                setSelectedCommessa(selected || null);
                            }}
                        >
                            <option value="">-- Select a Project --</option>
                            {commesse.map(c => (
                                <option key={c.CodiceProgettoSAP} value={c.CodiceProgettoSAP}>
                                    {c.CodiceProgettoSAP} - {c.Descrizione}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input
                            type="date"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            value={receiptDate}
                            onChange={(e) => setReceiptDate(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Amount (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            value={receiptAmount}
                            onChange={(e) => setReceiptAmount(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Upload Receipt</label>
                        <div
                            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-indigo-500 transition-colors"
                            onClick={() => fileInputRef.current.click()}
                        >
                            <div className="space-y-1 text-center">
                                <i className="fas fa-cloud-upload-alt text-4xl text-gray-400"></i>
                                <p className="text-sm text-gray-600">Click to upload or take a photo</p>
                            </div>
                        </div>
                        <input ref={fileInputRef} id="fileInput" type="file" accept="image/*" onChange={handleFileSelect} className="sr-only" />
                    </div>
                </div>
            </div>

            {receiptEditImage && (
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                     <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        <i className="fas fa-edit text-indigo-500 mr-2"></i>Edit and Save
                    </h2>
                    <canvas ref={canvasRef} className="w-full h-auto border border-gray-300 rounded-md mb-4"></canvas>
                    {/* ADDED: Canvas and edit controls */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder="e.g., Lunch with client"
                            />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">X Pos</label>
                                <input type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={textX} onChange={(e) => setTextX(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Y Pos</label>
                                <input type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={textY} onChange={(e) => setTextY(e.target.value)} />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Font Size</label>
                                <input type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={fontSize} onChange={(e) => setFontSize(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Color</label>
                                <input type="color" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm h-10" value={fontColor} onChange={(e) => setFontColor(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4 mt-4">
                        <button className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center disabled:opacity-50" onClick={drawTextOverlay} disabled={isLoading}>
                            <i className="fas fa-eye mr-2"></i>Preview Text
                        </button>
                        <button className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors flex items-center justify-center disabled:opacity-50" onClick={saveReceipt} disabled={isLoading}>
                            <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-save'} mr-2`}></i>
                            {isLoading ? 'Saving...' : 'Save Receipt'}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                <h2 className="text-lg font-semibold text-gray-800">
                    <i className="fas fa-history text-indigo-500 mr-2"></i>Recent Receipts
                </h2>
                <div className="space-y-4 mt-4">
                    {receipts.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">
                            <i className="fas fa-receipt text-5xl mb-4"></i>
                            <p>No receipts found. Add one using the form above.</p>
                        </div>
                    ) : (
                        receipts.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map(receipt => (
                            <div key={receipt._id} className="bg-gray-100 p-4 rounded-md flex items-center justify-between hover:bg-gray-200 transition-colors">
                                {/* ADDED: Receipt details */}
                                <div>
                                    <p className="font-bold text-lg text-gray-800">€{receipt.amount.toFixed(2)}</p>
                                    <p className="text-sm text-gray-600">{formatDate(receipt.date)}</p>
                                    <p className="text-xs text-gray-500">{receipt.commessa?.CodiceProgettoSAP} - {receipt.text || 'No notes'}</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    {/* ADDED: PDF button */}
                                    <button className="text-gray-500 hover:text-indigo-600" title="View PDF" onClick={() => downloadReceiptPDF(receipt)}>
                                        <i className="fas fa-file-pdf fa-lg"></i>
                                    </button>
                                    <button className="text-gray-500 hover:text-red-600" title="Delete Receipt" onClick={() => deleteReceipt(receipt._id)} disabled={isLoading}>
                                        <i className="fas fa-trash fa-lg"></i>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {previewPdfUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl h-full max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-4 flex justify-between items-center border-b border-gray-200">
                            <h3 className="text-xl font-semibold">PDF Preview</h3>
                            <button className="text-gray-500 hover:text-gray-700" onClick={() => setPreviewPdfUrl('')}>
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <iframe src={previewPdfUrl} title="PDF Preview" className="w-full flex-grow border-0"></iframe>
                        <div className="p-4 border-t border-gray-200 text-right">
                            <a href={previewPdfUrl} download={`receipt-${new Date().toISOString().split('T')[0]}.pdf`} className="bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition-colors inline-block">
                                <i className="fas fa-download mr-2"></i>Download PDF
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Receipts;