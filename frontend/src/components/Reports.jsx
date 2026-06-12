import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
// Import autoTable to extend jsPDF prototype
import 'jspdf-autotable';

const Reports = ({ onClose }) => {
  const modalRef = useRef(null);
  const [reportType, setReportType] = useState('orders');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');

  // Set default date range (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError('');
    setReportData(null);

    try {
      const response = await axios.get(`/api/reports/shop/${reportType}`, {
        params: {
          startDate,
          endDate,
          format: 'json'
        }
      });

      setReportData(response.data);
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    try {
      const response = await axios.get(`/api/reports/shop/${reportType}`, {
        params: {
          startDate,
          endDate,
          format: 'csv'
        },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-report-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting report:', err);
      setError(err.response?.data?.message || 'Failed to export report');
    }
  };

  const exportToPDF = () => {
    if (!reportData) {
      setError('Please generate a report first');
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title
      doc.setFontSize(18);
      doc.setTextColor(249, 115, 22); // Primary color
      doc.text(
        `${reportType === 'orders' ? 'Orders' : 'Financial'} Report`,
        pageWidth / 2,
        yPosition,
        { align: 'center' }
      );
      yPosition += 10;

      // Shop Info
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Shop: ${reportData.shop?.name || 'N/A'}`, 14, yPosition);
      yPosition += 5;
      doc.text(`Email: ${reportData.shop?.email || 'N/A'}`, 14, yPosition);
      yPosition += 5;
      doc.text(`Phone: ${reportData.shop?.phone || 'N/A'}`, 14, yPosition);
      yPosition += 5;
      doc.text(
        `Period: ${formatDate(reportData.period.start)} - ${formatDate(reportData.period.end)}`,
        14,
        yPosition
      );
      yPosition += 10;

      // Statistics Section
      doc.setFontSize(14);
      doc.setTextColor(249, 115, 22);
      doc.text('Statistics', 14, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      if (reportType === 'orders') {
        const stats = reportData.statistics || {};
        doc.text(`Total Orders: ${stats.total || 0}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Total Revenue: ${formatCurrency(stats.totalRevenue || 0)}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Total Distance: ${(stats.totalDistance || 0).toFixed(2)} km`, 14, yPosition);
        yPosition += 6;
        
        // Status breakdown
        if (stats.byStatus && Object.keys(stats.byStatus).length > 0) {
          doc.text('Orders by Status:', 14, yPosition);
          yPosition += 6;
          Object.entries(stats.byStatus).forEach(([status, count]) => {
            doc.text(`  ${status}: ${count}`, 20, yPosition);
            yPosition += 5;
          });
        }
      } else {
        const stats = reportData.statistics || {};
        doc.text(`Total Topups: ${formatCurrency(stats.totalTopups || 0)}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Total Payments: ${formatCurrency(stats.totalPayments || 0)}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Total Earnings: ${formatCurrency(stats.totalEarnings || 0)}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Current Balance: ${formatCurrency(stats.currentBalance || 0)}`, 14, yPosition);
        yPosition += 6;
      }

      yPosition += 5;

      // Data Table
      if (reportType === 'orders' && reportData.orders && reportData.orders.length > 0) {
        const tableData = reportData.orders.map(order => [
          `#${(order.orderId || '').toString().slice(-6)}`,
          order.customerName || 'N/A',
          order.status || 'N/A',
          formatCurrency(order.deliveryPrice || 0),
          formatDate(order.createdAt || new Date())
        ]);

        // Check if autoTable is available
        if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            startY: yPosition,
            head: [['Order ID', 'Customer', 'Status', 'Price', 'Date']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [249, 115, 22] },
            styles: { fontSize: 8 },
            margin: { left: 14, right: 14 }
          });
        } else {
          // Fallback: simple table without autoTable
          doc.text('Order ID | Customer | Status | Price | Date', 14, yPosition);
          yPosition += 6;
          tableData.forEach(row => {
            doc.text(row.join(' | '), 14, yPosition);
            yPosition += 5;
          });
        }
      } else if (reportType === 'financial' && reportData.transactions && reportData.transactions.length > 0) {
        const tableData = reportData.transactions.map(trans => [
          trans.type || 'N/A',
          `${trans.type === 'topup' || trans.type === 'earning' ? '+' : '-'}${formatCurrency(Math.abs(trans.amount || 0))}`,
          trans.description || 'N/A',
          trans.status || 'N/A',
          formatDate(trans.createdAt || new Date())
        ]);

        // Check if autoTable is available
        if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            startY: yPosition,
            head: [['Type', 'Amount', 'Description', 'Status', 'Date']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [249, 115, 22] },
            styles: { fontSize: 8 },
            margin: { left: 14, right: 14 }
          });
        } else {
          // Fallback: simple table without autoTable
          doc.text('Type | Amount | Description | Status | Date', 14, yPosition);
          yPosition += 6;
          tableData.forEach(row => {
            doc.text(row.join(' | '), 14, yPosition);
            yPosition += 5;
          });
        }
      } else {
        doc.text('No data available for the selected period', 14, yPosition);
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        doc.text(
          `Generated on ${new Date().toLocaleString()}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      // Save PDF
      doc.save(`${reportType}-report-${Date.now()}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      console.error('Error details:', err.message, err.stack);
      setError(`Failed to generate PDF: ${err.message || 'Unknown error'}. Please check the console for details.`);
    }
  };

  const formatCurrency = (amount) => {
    return `KES ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-dark-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-dark-800 border-b border-dark-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Generate Reports</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Report Type Selection */}
          <div>
            <label className="block text-gray-300 mb-2">Report Type</label>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setReportType('orders');
                  setReportData(null);
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  reportType === 'orders'
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                }`}
              >
                Orders Report
              </button>
              <button
                onClick={() => {
                  setReportType('financial');
                  setReportData(null);
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  reportType === 'financial'
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                }`}
              >
                Financial Report
              </button>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field w-full"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field w-full"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={generateReport}
              disabled={loading || !startDate || !endDate}
              className="btn-primary flex-1"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            <div className="flex gap-2 flex-1">
              <button
                onClick={exportToCSV}
                disabled={!startDate || !endDate}
                className="btn-secondary flex-1"
                title="Export to CSV"
              >
                📄 CSV
              </button>
              <button
                onClick={exportToPDF}
                disabled={!reportData}
                className="btn-secondary flex-1"
                title="Export to PDF"
              >
                📑 PDF
              </button>
            </div>
          </div>

          {/* Report Results */}
          {reportData && (
            <div className="mt-6 space-y-4">
              {/* Report Header */}
              <div className="bg-dark-700 p-4 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-2">
                  {reportType === 'orders' ? 'Orders Report' : 'Financial Report'}
                </h3>
                <div className="text-sm text-gray-400 space-y-1">
                  <p><strong>Shop:</strong> {reportData.shop?.name}</p>
                  <p><strong>Period:</strong> {formatDate(reportData.period.start)} - {formatDate(reportData.period.end)}</p>
                </div>
              </div>

              {/* Statistics */}
              {reportType === 'orders' && reportData.statistics && (
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-dark-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Total Orders</p>
                    <p className="text-2xl font-bold text-white">{reportData.statistics.total}</p>
                  </div>
                  <div className="bg-dark-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-primary-500">
                      {formatCurrency(reportData.statistics.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-dark-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Total Distance</p>
                    <p className="text-2xl font-bold text-white">
                      {reportData.statistics.totalDistance.toFixed(2)} km
                    </p>
                  </div>
                  <div className="bg-dark-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Delivered</p>
                    <p className="text-2xl font-bold text-green-500">
                      {reportData.statistics.byStatus?.delivered || 0}
                    </p>
                  </div>
                </div>
              )}

              {reportType === 'financial' && reportData.statistics && (
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-dark-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Total Topups</p>
                    <p className="text-2xl font-bold text-green-500">
                      {formatCurrency(reportData.statistics.totalTopups)}
                    </p>
                  </div>
                  <div className="bg-dark-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Total Payments</p>
                    <p className="text-2xl font-bold text-red-500">
                      {formatCurrency(reportData.statistics.totalPayments)}
                    </p>
                  </div>
                  <div className="bg-dark-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Total Earnings</p>
                    <p className="text-2xl font-bold text-green-500">
                      {formatCurrency(reportData.statistics.totalEarnings)}
                    </p>
                  </div>
                  <div className="bg-dark-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Current Balance</p>
                    <p className="text-2xl font-bold text-primary-500">
                      {formatCurrency(reportData.statistics.currentBalance)}
                    </p>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="bg-dark-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-dark-800">
                      <tr>
                        {reportType === 'orders' ? (
                          <>
                            <th className="px-4 py-3 text-left text-gray-300 text-sm font-semibold">Order ID</th>
                            <th className="px-4 py-3 text-left text-gray-300 text-sm font-semibold">Customer</th>
                            <th className="px-4 py-3 text-left text-gray-300 text-sm font-semibold">Status</th>
                            <th className="px-4 py-3 text-left text-gray-300 text-sm font-semibold">Price</th>
                            <th className="px-4 py-3 text-left text-gray-300 text-sm font-semibold">Date</th>
                          </>
                        ) : (
                          <>
                            <th className="px-4 py-3 text-left text-gray-300 text-sm font-semibold">Type</th>
                            <th className="px-4 py-3 text-left text-gray-300 text-sm font-semibold">Amount</th>
                            <th className="px-4 py-3 text-left text-gray-300 text-sm font-semibold">Description</th>
                            <th className="px-4 py-3 text-left text-gray-300 text-sm font-semibold">Status</th>
                            <th className="px-4 py-3 text-left text-gray-300 text-sm font-semibold">Date</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-600">
                      {reportType === 'orders' && reportData.orders?.map((order) => (
                        <tr key={order.orderId} className="hover:bg-dark-600">
                          <td className="px-4 py-3 text-gray-300 text-sm">#{order.orderId.slice(-6)}</td>
                          <td className="px-4 py-3 text-gray-300 text-sm">{order.customerName}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              order.status === 'delivered' ? 'bg-green-600' :
                              order.status === 'cancelled' ? 'bg-red-600' :
                              'bg-yellow-600'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-300 text-sm">{formatCurrency(order.deliveryPrice)}</td>
                          <td className="px-4 py-3 text-gray-300 text-sm">{formatDate(order.createdAt)}</td>
                        </tr>
                      ))}
                      {reportType === 'financial' && reportData.transactions?.map((trans) => (
                        <tr key={trans.transactionId} className="hover:bg-dark-600">
                          <td className="px-4 py-3 text-gray-300 text-sm">{trans.type}</td>
                          <td className={`px-4 py-3 text-sm font-semibold ${
                            trans.type === 'topup' || trans.type === 'earning' 
                              ? 'text-green-400' 
                              : 'text-red-400'
                          }`}>
                            {trans.type === 'topup' || trans.type === 'earning' ? '+' : '-'}
                            {formatCurrency(Math.abs(trans.amount))}
                          </td>
                          <td className="px-4 py-3 text-gray-300 text-sm">{trans.description}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              trans.status === 'completed' ? 'bg-green-600' :
                              trans.status === 'failed' ? 'bg-red-600' :
                              'bg-yellow-600'
                            }`}>
                              {trans.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-300 text-sm">{formatDate(trans.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {((reportType === 'orders' && (!reportData.orders || reportData.orders.length === 0)) ||
                  (reportType === 'financial' && (!reportData.transactions || reportData.transactions.length === 0))) && (
                  <div className="p-8 text-center text-gray-400">
                    No data found for the selected period
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;

