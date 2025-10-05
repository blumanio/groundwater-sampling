import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';

import config from '../config';
const API_URL = config.API_URL;

const Receipts = ({ receipts = [], commesse = [], onDataChange }) => {
    // --- State Management ---
    const [receiptEditImage, setReceiptEditImage] = useState(null);
    const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
    const [receiptAmount, setReceiptAmount] = useState('');
    const [previewPdfUrl, setPreviewPdfUrl] = useState('');
    const [selectedCommessa, setSelectedCommessa] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [textInput, setTextInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [isMultiPerson, setIsMultiPerson] = useState(false);
    const [peoplePaidFor, setPeoplePaidFor] = useState([]);

    // --- Refs ---
    const fileInputRef = useRef(null);

    // --- Effects ---
    useEffect(() => {
        return () => {
            if (previewPdfUrl) {
                URL.revokeObjectURL(previewPdfUrl);
            }
        };
    }, [previewPdfUrl]);

    // --- Filtered Commesse Logic ---
    const baseFilteredCommesse = commesse.filter(c =>
        c.CodiceProgettoSAP && (c.CodiceProgettoSAP.startsWith('20C1881') )
    );
    const finalFilteredCommesse = baseFilteredCommesse.filter(c => {
        const searchString = `${c.CodiceProgettoSAP} ${c.Descrizione}`.toLowerCase();
        return searchString.includes(searchQuery.toLowerCase());
    });
    useEffect(() => {
        if (finalFilteredCommesse.length > 0 && !selectedCommessa) {
            setSelectedCommessa(finalFilteredCommesse[0]);
        }
        if (selectedCommessa && !finalFilteredCommesse.includes(selectedCommessa)) {
            setSelectedCommessa(finalFilteredCommesse[0] || null);
        }
    }, [finalFilteredCommesse, selectedCommessa]);

    // --- Helper Functions ---
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) {
            setReceiptEditImage(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => setReceiptEditImage(img);
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const resetForm = () => {
        setReceiptEditImage(null);
        setTextInput('');
        setReceiptAmount('');
        setReceiptDate(new Date().toISOString().split('T')[0]);
        setIsMultiPerson(false);
        setPeoplePaidFor([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handlePersonNameChange = (index, value) => {
        const updatedPeople = [...peoplePaidFor];
        updatedPeople[index] = value;
        setPeoplePaidFor(updatedPeople);
    };

    const addPersonInput = () => {
        setPeoplePaidFor([...peoplePaidFor, '']);
    };

    const removePersonInput = (index) => {
        setPeoplePaidFor(peoplePaidFor.filter((_, i) => i !== index));
    };

    // --- Data Handling Functions ---
    const saveReceipt = async () => {
        if (!receiptEditImage || !receiptAmount || !selectedCommessa) {
            setError('Please fill out all mandatory fields and upload a receipt image.');
            return;
        }

        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        tempCanvas.width = receiptEditImage.width;
        tempCanvas.height = receiptEditImage.height;
        ctx.drawImage(receiptEditImage, 0, 0);
        const imageData = tempCanvas.toDataURL('image/jpeg', 0.9);

        setError(null);
        setIsLoading(true);

        const newReceipt = {
            date: receiptDate,
            amount: parseFloat(receiptAmount),
            text: textInput,
            imageData: imageData,
            commessa: selectedCommessa,
            peoplePaidFor: isMultiPerson ? peoplePaidFor.filter(name => name.trim() !== '') : [],
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
        const pdf = new jsPDF('p', 'mm', 'a4');
        const margin = 10;
        const textHeight = 5;
        let yPos = margin;
        const pageContentWidth = pdf.internal.pageSize.getWidth() - (margin * 2);

        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);

        // [FIX] Corrected `selectedCommessa` to `CodiceProgettoSAP`
        pdf.text(`Commessa: ${receipt.commessa.Descrizione.split('-')[0]} - ${receipt.commessa.Descrizione.split('-')[2] || 'N/A'}`, margin, yPos);
        yPos += textHeight;
        
        pdf.text(`Date: ${formatDate(receipt.date)}`, margin, yPos);
        yPos += textHeight;
        pdf.text(`Amount: €${receipt.amount.toFixed(2)}`, margin, yPos);
        yPos += textHeight;

        // --- [NEW] Add guest names if they exist ---
        if (receipt.peoplePaidFor && receipt.peoplePaidFor.length > 0) {
            const guestText = `Paid for: ${receipt.peoplePaidFor.join(', ')}`;
            const guestLines = pdf.splitTextToSize(guestText, pageContentWidth);
            pdf.text(guestLines, margin, yPos);
            yPos += textHeight * guestLines.length;
        }
        // --- [END OF NEW] ---

        if (receipt.text) {
            const notesLines = pdf.splitTextToSize(`Notes: ${receipt.text}`, pageContentWidth);
            pdf.text(notesLines, margin, yPos);
            yPos += textHeight * notesLines.length;
        }

        yPos += 5;

        const imgData = receipt.imageData;
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        let imgWidth = pageContentWidth;
        let imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        const remainingHeight = pdfHeight - yPos - margin;

        if (imgHeight > remainingHeight) {
            imgHeight = remainingHeight;
            imgWidth = (imgProps.width * imgHeight) / imgProps.height;
        }

        const xOffset = (pdfWidth - imgWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, yPos, imgWidth, imgHeight);

        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        setPreviewPdfUrl(url);
    };


    return (
        <div className="min-h-screen bg-gray-50 p-3 sm:p-6 md:p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">
                Expense Receipts 🧾
            </h1>

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-4" role="alert">
                    <p className="font-bold">Operation Failed</p>
                    <p>{error}</p>
                </div>
            )}

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg mb-6 border border-indigo-200">
                <h2 className="text-xl font-semibold text-indigo-700 mb-4 flex items-center">
                    <i className="fas fa-upload mr-3"></i>Upload New Expense
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Search Project (20C1880/1-based)</label>
                        <input
                            type="text"
                            placeholder="Type code or description to filter..."
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Selected Project</label>
                        <select
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                            value={selectedCommessa?.CodiceProgettoSAP || ''}
                            onChange={(e) => {
                                const selected = finalFilteredCommesse.find(c => c.CodiceProgettoSAP === e.target.value);
                                setSelectedCommessa(selected || null);
                            }}
                        >
                            <option value="" disabled>-- Select a Project --</option>
                            {finalFilteredCommesse.map(c => (
                                <option key={c.CodiceProgettoSAP} value={c.CodiceProgettoSAP}>
                                    {c.CodiceProgettoSAP} - {c.Descrizione}
                                </option>
                            ))}
                        </select>
                        {finalFilteredCommesse.length === 0 && searchQuery && (
                            <p className="text-xs text-red-500 mt-1">
                                No projects found matching filter.
                            </p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Date</label>
                            <input
                                type="date"
                                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm"
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
                                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm"
                                value={receiptAmount}
                                onChange={(e) => setReceiptAmount(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Note / Description</label>
                        <input
                            type="text"
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm"
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="e.g., Lunch with client..."
                        />
                    </div>
                    <div className="pt-2">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                checked={isMultiPerson}
                                onChange={(e) => setIsMultiPerson(e.target.checked)}
                            />
                            <span className="ml-2 text-sm text-gray-700">Did you pay for other people?</span>
                        </label>
                    </div>
                    {isMultiPerson && (
                        <div className="p-4 border rounded-md bg-gray-50">
                            <h4 className="font-semibold text-gray-800 mb-2">Guest Names</h4>
                            {peoplePaidFor.map((person, index) => (
                                <div key={index} className="flex items-center mb-2">
                                    <input
                                        type="text"
                                        placeholder={`Person ${index + 2}`}
                                        value={person}
                                        onChange={(e) => handlePersonNameChange(index, e.target.value)}
                                        className="flex-grow p-2 border rounded-md"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePersonInput(index)}
                                        className="ml-2 p-2 text-red-500 hover:bg-red-100 rounded-full"
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addPersonInput}
                                className="mt-2 w-full text-sm bg-indigo-100 text-indigo-700 py-2 rounded-md hover:bg-indigo-200"
                            >
                                + Add Person
                            </button>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Image (JPEG/PNG)</label>
                        <div
                            className={`mt-1 flex justify-center px-4 pt-4 pb-4 border-2 ${receiptEditImage ? 'border-indigo-500' : 'border-gray-300'} border-dashed rounded-lg cursor-pointer hover:border-indigo-500 transition-colors`}
                            onClick={() => fileInputRef.current.click()}
                        >
                            <div className="space-y-1 text-center">
                                <i className={`fas ${receiptEditImage ? 'fa-check-circle text-green-500' : 'fa-camera text-4xl text-gray-400'}`}></i>
                                <p className="text-sm text-gray-600">
                                    {receiptEditImage ? 'Image Selected. Click to change.' : 'Tap here to upload or take a photo'}
                                </p>
                            </div>
                        </div>
                        <input ref={fileInputRef} id="fileInput" type="file" accept="image/*" onChange={handleFileSelect} className="sr-only" />
                    </div>
                    {receiptEditImage && (
                        <div className="mt-2 text-center border rounded-lg p-2 bg-gray-50">
                            <p className="text-sm font-medium text-gray-600 mb-2">Image Preview:</p>
                            <img
                                src={receiptEditImage.src}
                                alt="Receipt Preview"
                                className="max-w-full h-auto max-h-40 mx-auto rounded"
                            />
                        </div>
                    )}
                    <button
                        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center font-semibold disabled:opacity-50"
                        onClick={saveReceipt}
                        disabled={isLoading || !selectedCommessa || !receiptAmount || !receiptEditImage}
                    >
                        <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-save'} mr-2`}></i>
                        {isLoading ? 'Saving...' : 'Save Receipt'}
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg mt-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <i className="fas fa-history mr-3"></i>Recent Receipts
                </h2>
                <div className="space-y-3">
                    {receipts.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">
                            <i className="fas fa-receipt text-5xl mb-4 text-gray-300"></i>
                            <p>No receipts found. Add one above.</p>
                        </div>
                    ) : (
                        receipts.slice()
                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                            .map(receipt => (
                                <div key={receipt._id} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between hover:bg-gray-100 transition-colors border border-gray-200">
                                    <div className="flex-1 min-w-0 pr-3">
                                        <p className="font-bold text-lg text-gray-800">€{receipt.amount.toFixed(2)}</p>
                                        <p className="text-xs sm:text-sm text-gray-600 truncate">{receipt.commessa?.CodiceProgettoSAP} | {formatDate(receipt.date)}</p>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{receipt.text || 'No notes'}</p>
                                    </div>
                                    <div className="flex items-center space-x-2 sm:space-x-3">
                                        <button className="text-gray-500 hover:text-indigo-600 p-2" title="View PDF" onClick={() => downloadReceiptPDF(receipt)}>
                                            <i className="fas fa-file-pdf fa-lg"></i>
                                        </button>
                                        <button className="text-gray-500 hover:text-red-600 p-2" title="Delete Receipt" onClick={() => deleteReceipt(receipt._id)} disabled={isLoading}>
                                            <i className="fas fa-trash fa-lg"></i>
                                        </button>
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </div>

            {previewPdfUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-0 sm:p-4 z-50">
                    <div className="bg-white rounded-t-lg sm:rounded-lg shadow-2xl w-full h-full sm:max-w-2xl sm:h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-4 flex justify-between items-center border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800">PDF Preview</h3>
                            <button className="text-gray-500 hover:text-gray-700" onClick={() => setPreviewPdfUrl('')}>
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <iframe src={previewPdfUrl} title="PDF Preview" className="w-full flex-grow border-0"></iframe>
                        <div className="p-4 border-t border-gray-200 text-right">
                            <a href={previewPdfUrl} download={`receipt-${new Date().toISOString().split('T')[0]}.pdf`} className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center font-medium">
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