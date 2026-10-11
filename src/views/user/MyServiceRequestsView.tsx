import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { CustomerServiceRequest, ServiceRequestStatus } from '../../types';
import { formatCurrency } from '../../utils/currency';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Download,
  ExternalLink,
  ChevronRight,
  FolderOpen,
  Hash,
  Calendar,
  Building2,
  Send,
  Loader2,
  FileCheck,
  RefreshCw,
  Bell
} from 'lucide-react';

export const MyServiceRequestsView: React.FC = () => {
  const { user, navigate } = useAuth();
  const [requests, setRequests] = useState<CustomerServiceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CustomerServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const data = await api.get('/service-requests/my');
      setRequests(Array.isArray(data) ? data : []);
      if (selectedRequest) {
        const updated = (data || []).find((r: CustomerServiceRequest) => r.id === selectedRequest.id);
        if (updated) setSelectedRequest(updated);
      }
    } catch (err) {
      console.error('Failed to load my service requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const getStatusBadge = (status: ServiceRequestStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Pending
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-500 border border-blue-500/30">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Processing
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Completed
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-500 border border-red-500/30">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            Rejected
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            Failed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-500/15 text-gray-500 border border-gray-500/30">
            Cancelled
          </span>
        );
      case 'REQUIRES_ACTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/15 text-orange-600 border border-orange-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
            Action Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.ticketId.toLowerCase().includes(q) ||
      r.serviceName.toLowerCase().includes(q) ||
      r.serviceCategory.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100">
              <FileText className="w-6 h-6" />
            </span>
            <span>My Service Requests</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Track your CAC registrations, TIN applications, and custom service filings in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/services')}
            className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm transition-colors"
          >
            Apply for New Service
          </button>
          <button
            onClick={fetchMyRequests}
            disabled={loading}
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors disabled:opacity-50"
            title="Refresh Requests"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {selectedRequest ? (
        /* DETAIL VIEW */
        <div className="space-y-6">
          <button
            onClick={() => setSelectedRequest(null)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Requests</span>
          </button>

          {/* Header Card */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-orange-600">
                    Ticket ID: #{selectedRequest.ticketId}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-500">{selectedRequest.serviceCategory}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                  {selectedRequest.serviceName}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Submitted on {new Date(selectedRequest.createdAt).toLocaleString()} • Amount Paid: {formatCurrency(selectedRequest.price)}
                </p>
              </div>

              <div className="flex flex-col sm:items-end gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Current Status
                </span>
                {getStatusBadge(selectedRequest.status)}
                {selectedRequest.refundStatus === 'REFUNDED' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Refunded {formatCurrency(selectedRequest.refundAmount || selectedRequest.price)}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Rejection / Failure Notice Section */}
            {(selectedRequest.status === 'REJECTED' || selectedRequest.status === 'FAILED') && (
              <div className="p-5 rounded-2xl bg-red-50 border border-red-200 space-y-2.5">
                <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase tracking-wider">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>{selectedRequest.status === 'REJECTED' ? 'Application Rejected' : 'Processing Failed'}</span>
                </div>
                <div className="p-4 bg-white rounded-xl border border-red-100 text-xs sm:text-sm text-red-950 leading-relaxed">
                  <span className="font-bold text-red-800 block mb-1">Official Administrative Reason:</span>
                  {selectedRequest.rejectionReason || selectedRequest.failureReason || selectedRequest.adminResultText || 'No specific reason provided.'}
                </div>
                <div className="flex items-center gap-2 pt-1 text-xs text-red-800 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Full refund of <strong>{formatCurrency(selectedRequest.refundAmount || selectedRequest.price)}</strong> has been credited back to your wallet balance.
                  </span>
                </div>
              </div>
            )}

            {/* Admin Result & Response Section (if available) */}
            {(selectedRequest.adminResultText || (selectedRequest.adminResultFiles && selectedRequest.adminResultFiles.length > 0)) && (
              <div className="p-5 rounded-2xl bg-orange-50/60 border border-orange-200 space-y-3">
                <h3 className="text-xs font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-orange-600" />
                  <span>Official Resolution & Result Documents</span>
                </h3>

                {selectedRequest.adminResultText && (
                  <div className="p-4 bg-white rounded-xl border border-orange-100 text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {selectedRequest.adminResultText}
                  </div>
                )}

                {selectedRequest.adminResultFiles && selectedRequest.adminResultFiles.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-bold text-gray-700 block">
                      Download Result Files:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedRequest.adminResultFiles.map((file) => (
                        <div
                          key={file.id}
                          className="p-3 bg-white rounded-xl border border-orange-200 flex items-center justify-between text-xs"
                        >
                          <div className="truncate pr-2">
                            <span className="font-bold text-gray-900 truncate block">{file.name}</span>
                            <span className="text-[10px] text-gray-500">
                              {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Certificate/Document'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={file.url}
                              download={file.name}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submission Particulars & Files */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Submitted Information */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 pb-3 border-b border-gray-100">
                Your Submitted Information
              </h3>

              {Object.keys(selectedRequest.submittedData || {}).length === 0 ? (
                <p className="text-xs text-gray-500 py-4">No additional parameters required.</p>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {Object.entries(selectedRequest.submittedData).map(([key, val]) => (
                    <div
                      key={key}
                      className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                    >
                      <span className="font-bold text-gray-500 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-right break-all">
                        {typeof val === 'boolean'
                          ? val
                            ? 'Yes / Accepted'
                            : 'No'
                          : String(val || '—')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Uploaded Files */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 pb-3 border-b border-gray-100">
                Your Uploaded Documents
              </h3>

              {(!selectedRequest.customerFiles || selectedRequest.customerFiles.length === 0) ? (
                <p className="text-xs text-gray-500 py-4">No documents were uploaded with this submission.</p>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {selectedRequest.customerFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-gray-900 truncate block">{file.name}</span>
                        <span className="text-[10px] text-gray-500">
                          {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Document'}
                        </span>
                      </div>
                      <a
                        href={file.url}
                        download={file.name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                        title="Download Document"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Timeline / History */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span>Request Timeline & Progress</span>
            </h3>

            <div className="space-y-4 pl-2">
              {(selectedRequest.timeline || []).map((ev, idx) => (
                <div key={ev.id || idx} className="relative flex items-start gap-4">
                  {idx < (selectedRequest.timeline || []).length - 1 && (
                    <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-gray-200" />
                  )}
                  <div className="w-5 h-5 rounded-full bg-orange-100 border-2 border-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                  </div>
                  <div className="flex-1 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                      <span className="font-bold text-gray-900">{ev.title}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(ev.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-0.5">{ev.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ticket ID or service name..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-bold focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="REQUIRES_ACTION">Action Required</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {/* List Table */}
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
            {loading && requests.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                <p className="text-xs text-gray-500">Loading your service requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-16 text-center space-y-4">
                <FolderOpen className="w-12 h-12 text-gray-300 mx-auto" />
                <div>
                  <h3 className="text-base font-bold text-gray-900">No Service Requests Found</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                    {search || statusFilter !== 'ALL'
                      ? 'No service requests matched your query.'
                      : 'You have not submitted any service requests yet.'}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/services')}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm transition-colors"
                >
                  Explore Available Services
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/50">
                      <th className="py-3.5 px-6">Ticket ID</th>
                      <th className="py-3.5 px-6">Service Name</th>
                      <th className="py-3.5 px-6">Category</th>
                      <th className="py-3.5 px-6">Submission Date</th>
                      <th className="py-3.5 px-6 text-center">Status</th>
                      <th className="py-3.5 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredRequests.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedRequest(r)}
                        className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-6 font-mono font-bold text-orange-600 flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5 text-orange-400" />
                          <span>{r.ticketId}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-bold text-gray-900 block group-hover:text-orange-600 transition-colors">
                            {r.serviceName}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Fee: {formatCurrency(r.price)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-500">
                          {r.serviceCategory}
                        </td>
                        <td className="py-4 px-6 text-gray-500">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {getStatusBadge(r.status)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(r);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white font-bold text-xs transition-colors"
                          >
                            <span>View Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
