import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import config from '../config';
const API_URL = config.API_URL;

const Reports = () => {
    const [reportStartDate, setReportStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [previewPdfUrl, setPreviewPdfUrl] = useState('');

    const generateReport = async () => {
        const response = await fetch(`${API_URL}/receipts?startDate=${reportStartDate}&endDate=${reportEndDate}`);
        const monthlyReceipts = await response.json();

        if (monthlyReceipts.length === 0) {
            alert("No receipts found for the selected date range.");
            return;
        }

        const pdf = new jsPDF();

        // --- PAGE 1: SUMMARY TABLE ---
        const totalReimbursableAmount = monthlyReceipts.reduce((sum, receipt) => {
            const numPeople = 1 + (receipt.peoplePaidFor?.length || 0);
            const maxReimbursement = numPeople * 13;
            const reimbursableAmount = Math.min(receipt.amount, maxReimbursement);
            return sum + reimbursableAmount;
        }, 0);

        // [MODIFIED] Added "Project Phase" column header
        const tableColumn = ["Date", "Project Phase", "Description / Guests", "No. of People", "Amount (€)", "Reimbursable (€)"];
        const tableRows = [];

        monthlyReceipts.forEach(receipt => {
            const numPeople = 1 + (receipt.peoplePaidFor?.length || 0);
            const maxReimbursement = numPeople * 13;
            const reimbursableAmount = Math.min(receipt.amount, maxReimbursement);

            const descriptionParts = [];
            if (receipt.peoplePaidFor && receipt.peoplePaidFor.length > 0) {
                descriptionParts.push(`Guests: ${receipt.peoplePaidFor.join(', ')}`);
            }
            if (receipt.text) {
                descriptionParts.push(receipt.text);
            }
            const descriptionText = descriptionParts.length > 0 ? descriptionParts.join('. ') : 'No notes';

            // [NEW] Extract the project phase from the description
            const projectPhase = (receipt.commessa?.Descrizione || '').split('-')[0].trim();

            const receiptData = [
                new Date(receipt.date).toLocaleDateString(),
                projectPhase, // Add the new data to the row
                descriptionText,
                numPeople,
                receipt.amount.toFixed(2),
                reimbursableAmount.toFixed(2)
            ];
            tableRows.push(receiptData);
        });

        pdf.setFontSize(18);
        pdf.text('Monthly Meal Report Summary', 14, 22);
        pdf.setFontSize(11);
        pdf.text(`Period: ${new Date(reportStartDate).toLocaleDateString()} to ${new Date(reportEndDate).toLocaleDateString()}`, 14, 30);

        autoTable(pdf, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
            didDrawPage: (data) => {
                const tableBottomY = data.cursor.y;
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Total Reimbursable Amount: €${totalReimbursableAmount.toFixed(2)}`, data.settings.margin.left, tableBottomY + 10);
            }
        });

        // --- SUBSEQUENT PAGES: ONE RECEIPT PER PAGE ---
        monthlyReceipts.forEach(receipt => {
            pdf.addPage();
            let yPos = 20;
            const pageHeight = pdf.internal.pageSize.getHeight();
            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 15;
            const pageContentWidth = pageWidth - (margin * 2);

            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Date: ${new Date(receipt.date).toLocaleDateString()}`, margin, yPos);
            pdf.text(`Amount: €${receipt.amount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
            yPos += 10;

            pdf.setLineWidth(0.5);
            pdf.line(margin, yPos - 5, pageWidth - margin, yPos - 5);

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');

            if (receipt.commessa) {
                pdf.text(`Project: ${receipt.commessa.CodiceProgettoSAP} - ${receipt.commessa.Descrizione}`, margin, yPos);
                yPos += 7;
            }
            
            if (receipt.peoplePaidFor && receipt.peoplePaidFor.length > 0) {
                const guestText = `Guests: ${receipt.peoplePaidFor.join(', ')}`;
                const guestLines = pdf.splitTextToSize(guestText, pageContentWidth);
                pdf.setFont('helvetica', 'bold');
                pdf.text(guestLines, margin, yPos);
                pdf.setFont('helvetica', 'normal');
                yPos += (guestLines.length * 5) + 2;
            }

            const notesLines = pdf.splitTextToSize(`Notes: ${receipt.text || 'No notes'}`, pageContentWidth);
            pdf.text(notesLines, margin, yPos);
            yPos += notesLines.length * 5 + 5;

            const imgData = receipt.imageData;
            const imgProps = pdf.getImageProperties(imgData);
            const availableWidth = pageWidth - 2 * margin;
            const availableHeight = pageHeight - yPos - margin;
            const imgRatio = imgProps.width / imgProps.height;
            let finalWidth = availableWidth;
            let finalHeight = finalWidth / imgRatio;
            if (finalHeight > availableHeight) {
                finalHeight = availableHeight;
                finalWidth = finalHeight * imgRatio;
            }
            const xPos = (pageWidth - finalWidth) / 2;
            pdf.addImage(imgData, 'JPEG', xPos, yPos, finalWidth, finalHeight);
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
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl h-full max-h-[90vh] flex flex-col overflow-hidden">
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