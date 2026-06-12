import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const AdminReports = ({ onClose }) => {
  const modalRef = useRef(null);
  const [reportType, setReportType] = useState('orders');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userRole, setUserRole] = useState('all');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

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
      const params = {
        startDate,
        endDate,
        format: 'json'
      };
      if (userRole !== 'all') {
        params.userRole = userRole;
      }

      const response = await axios.get(`/api/admin/reports/${reportType}`, { params });
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
      const params = {
        startDate,
        endDate,
        format: 'csv'
      };
      if (userRole !== 'all') {
        params.userRole = userRole;
      }

      const response = await axios.get(`/api/admin/reports/${reportType}`, {
        params,
        responseType: 'blob'
      });

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

    const doc = new jsPDF();
    doc.text(`${reportType.toUpperCase()} Report`, 14, 15);
    doc.text(`From: ${startDate} To: ${endDate}`, 14, 22);
    
    if (reportData.data && reportData.data.length > 0) {
      const tableData = reportData.data.map(item => {
        if (reportType === 'orders') {
          return [
            item._id.slice(-6),
            item.shop?.shopName || 'N/A',
            item.rider?.name || 'N/A',
            item.status,
            `KES ${item.goodsValue}`,
            new Date(item.createdAt).toLocaleDateString()
          ];
        } else if (reportType === 'transactions') {
          return [
            item.type,
            `KES ${item.amount}`,
            item.description,
            item.status,
            new Date(item.createdAt).toLocaleDateString()
          ];
        } else {
          return [
            item.name || item.shopName || 'N/A',
            item.role,
            item.email || 'N/A',
            new Date(item.createdAt).toLocaleDateString()
          ];
        }
      });

      doc.autoTable({
        head: [getTableHeaders()],
        body: tableData,
        startY: 30
      });
    }

    doc.save(`${reportType}-report-${Date.now()}.pdf`);
  };

  const getTableHeaders = () => {
    switch (reportType) {
      case 'orders':
        return ['Order ID', 'Shop', 'Rider', 'Status', 'Value', 'Date'];
      case 'transactions':
        return ['Type', 'Amount', 'Description', 'Status', 'Date'];
      case 'users':
        return ['Name', 'Role', 'Email', 'Created'];
      default:
        return [];
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-dark-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Admin Reports</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
          </div>

          {/* Report Options */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-gray-300 mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="input-field"
              >
                <option value="orders">Orders</option>
                <option value="transactions">Transactions</option>
                <option value="users">Users</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-300 mb-2">User Role</label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="input-field"
              >
                <option value="all">All Users</option>
                <option value="rider">Riders Only</option>
                <option value="shop">Shops Only</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-4 mb-6">
            <button onClick={generateReport} disabled={loading} className="btn-primary">
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            <button onClick={exportToCSV} className="btn-secondary">
              Export CSV
            </button>
            <button onClick={exportToPDF} disabled={!reportData} className="btn-secondary">
              Export PDF
            </button>
          </div>

          {/* Report Results */}
          {reportData && (
            <div className="bg-dark-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Report Results ({reportData.total} items)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-600">
                      {getTableHeaders().map((header, idx) => (
                        <th key={idx} className="text-left p-2 text-gray-300">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.slice(0, 50).map((item, idx) => (
                      <tr key={idx} className="border-b border-dark-600">
                        {reportType === 'orders' && (
                          <>
                            <td className="p-2 text-gray-400">{item._id.slice(-6)}</td>
                            <td className="p-2 text-gray-400">{item.shop?.shopName || 'N/A'}</td>
                            <td className="p-2 text-gray-400">{item.rider?.name || 'N/A'}</td>
                            <td className="p-2 text-gray-400">{item.status}</td>
                            <td className="p-2 text-gray-400">KES {item.goodsValue}</td>
                            <td className="p-2 text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                          </>
                        )}
                        {reportType === 'transactions' && (
                          <>
                            <td className="p-2 text-gray-400">{item.type}</td>
                            <td className="p-2 text-gray-400">KES {item.amount}</td>
                            <td className="p-2 text-gray-400">{item.description}</td>
                            <td className="p-2 text-gray-400">{item.status}</td>
                            <td className="p-2 text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                          </>
                        )}
                        {reportType === 'users' && (
                          <>
                            <td className="p-2 text-gray-400">{item.name || item.shopName || 'N/A'}</td>
                            <td className="p-2 text-gray-400">{item.role}</td>
                            <td className="p-2 text-gray-400">{item.email || 'N/A'}</td>
                            <td className="p-2 text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reportData.data.length > 50 && (
                  <p className="text-gray-400 text-sm mt-2">
                    Showing first 50 of {reportData.data.length} items. Export to see all.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReports;











