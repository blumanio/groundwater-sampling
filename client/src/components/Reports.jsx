import React, { useState } from 'react';
import { jsPDF } from 'jspdf';

const API_URL = 'http://localhost:5000/api';

const Reports = ({ receipts }) => {
    const [reportStartDate, setReportStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [previewPdfUrl, setPreviewPdfUrl] = useState('');

    const generateReport = async () => {
        // Fetch receipts for the selected date range
        const response = await fetch(`${API_URL}/receipts?startDate=${reportStartDate}&endDate=${reportEndDate}`);
        const monthlyReceipts = await response.json();

        const pdf = new jsPDF();
        let yPos = 20;

        pdf.setFontSize(16);
        pdf.text('Monthly Meal Report', 10, yPos);
        yPos += 10;
        pdf.setFontSize(10);
        pdf.text(`Period: ${reportStartDate} to ${reportEndDate}`, 10, yPos);
        yPos += 10;
        pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 10, yPos);
        yPos += 15;

        monthlyReceipts.forEach(receipt => {
            const textLines = pdf.splitTextToSize(`Notes: ${receipt.text || 'No notes'}`, 130);
            const lineHeight = 7;
            const textHeight = textLines.length * lineHeight;
            const imgData = receipt.imageData;
            const imgProps = pdf.getImageProperties(imgData);
            const imgWidth = 50;
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

            const itemHeight = 15 + textHeight + imgHeight + 10;

            if (yPos + itemHeight > pdf.internal.pageSize.getHeight() - 20) {
                pdf.addPage();
                yPos = 20;
            }

            pdf.setFontSize(12);
            pdf.text(`Date: ${receipt.date}`, 10, yPos);
            pdf.text(`Amount: €${receipt.amount.toFixed(2)}`, 140, yPos);
            yPos += 5;

            pdf.setFontSize(10);
            pdf.text(textLines, 10, yPos);
            yPos += textHeight;

            if (receipt.commessa) {
                pdf.text(`Project: ${receipt.commessa.CodiceProgettoSAP}`, 10, yPos);
                yPos += 5;
                pdf.text(`Description: ${receipt.commessa.Descrizione}`, 10, yPos);
                yPos += 5;
            }

            pdf.addImage(imgData, 'JPEG', 10, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 10;

            pdf.line(10, yPos, 200, yPos);
            yPos += 10;
        });

        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        setPreviewPdfUrl(url);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
                <i className="fas fa-chart-bar text-indigo-500 mr-2"></i>Generate Monthly Report
            </h2>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                    type="date"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                />
            </div>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                    type="date"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                />
            </div>
            <button
                className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors flex items-center justify-center"
                onClick={generateReport}
            >
                <i className="fas fa-file-pdf mr-2"></i>Generate PDF Report
            </button>
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
                            <button
                                className="bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition-colors"
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = previewPdfUrl;
                                    link.download = `monthly_report-${new Date().toISOString().split('T')[0]}.pdf`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}
                            >
                                <i className="fas fa-download mr-2"></i>Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;