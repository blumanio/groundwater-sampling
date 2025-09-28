import React from 'react';

const Dashboard = ({ receipts, setPage }) => {

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const totalReceipts = receipts.length;
    const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);
    const lastReceiptDate = totalReceipts > 0 ? formatDate(receipts[totalReceipts - 1].date) : 'N/A';

    return (
        <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
                    <p className="text-xl font-bold text-indigo-600">{totalReceipts}</p>
                    <p className="text-sm text-gray-500">Total Receipts</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
                    <p className="text-xl font-bold text-indigo-600">€{totalAmount.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">Total Amount</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
                    <p className="text-sm font-bold text-indigo-600">{lastReceiptDate}</p>
                    <p className="text-sm text-gray-500">Last Receipt</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-lg font-semibold text-gray-800">
                    <i className="fas fa-rocket text-indigo-500 mr-2"></i>Quick Actions
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <button className="flex flex-col items-center bg-gray-100 p-4 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => setPage('receipts')}>
                        <i className="fas fa-camera text-2xl text-indigo-500 mb-2"></i>
                        <span className="text-sm font-medium">Add Receipt</span>
                    </button>
                    <button className="flex flex-col items-center bg-gray-100 p-4 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => setPage('reports')}>
                        <i className="fas fa-file-pdf text-2xl text-indigo-500 mb-2"></i>
                        <span className="text-sm font-medium">Generate Report</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
