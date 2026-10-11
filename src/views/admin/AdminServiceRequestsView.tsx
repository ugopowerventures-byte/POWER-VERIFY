import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { CustomerServiceRequest, ServiceRequestStatus, ServiceRequestFile } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { UserAvatar } from '../../components/common/UserAvatar';
import {
  FileText,
  Search,
  Filter,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  UploadCloud,
  FileCheck,
  Send,
  Loader2,
  Calendar,
  Phone,
  Mail,
  User,
  Hash,
  Download,
  Eye,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  FolderOpen,
  Tag,
  AlertTriangle,
  Camera,
  Image as ImageIcon,
  Fingerprint
} from 'lucide-react';

interface CustomerAccountSummary {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalRequests: number;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  rejectedCount: number;
  requiresActionCount: number;
  lastSubmittedAt: string;
}

export const AdminServiceRequestsView: React.FC = () => {
  // Navigation level: 'customers' | 'customer_requests' | 'request_detail'
  const [viewLevel, setViewLevel] = useState<'customers' | 'customer_requests' | 'request_detail'>('customers');

  // Customer level state
  const [customers, setCustomers] = useState<CustomerAccountSummary[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerRequests, setSelectedCustomerRequests] = useState<CustomerServiceRequest[]>([]);
  const [customerProfile, setCustomerProfile] = useState<any>(null);

  // Single request detail level state
  const [selectedRequest, setSelectedRequest] = useState<CustomerServiceRequest | null>(null);

  // Result submission form state
  const [finalStatus, setFinalStatus] = useState<ServiceRequestStatus | ''>('');
  const [adminResultText, setAdminResultText] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [uploadedResultFiles, setUploadedResultFiles] = useState<ServiceRequestFile[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [submittingResult, setSubmittingResult] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [resultSuccessMsg, setResultSuccessMsg] = useState<string | null>(null);
  const [resultErrorMsg, setResultErrorMsg] = useState<string | null>(null);

  // Global filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'RECENT_UPDATED'>('NEWEST');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0,
    requiresAction: 0
  });

  // Fetch initial summary
  const loadOverviewData = async () => {
    try {
      setLoading(true);
      const [custList, statData] = await Promise.all([
        api.get('/admin/service-requests/customers'),
        api.get('/admin/service-requests/stats')
      ]);
      setCustomers(Array.isArray(custList) ? custList : []);
      if (statData) setStats(statData);
    } catch (err) {
      console.error('Failed to load service requests overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverviewData();
  }, []);

  // When admin clicks on a customer account
  const handleSelectCustomer = async (userId: string) => {
    setSelectedCustomerId(userId);
    setLoading(true);
    try {
      const res = await api.get(`/admin/service-requests/customer/${userId}`);
      setCustomerProfile(res?.customer || null);
      setSelectedCustomerRequests(res?.requests || []);
      setViewLevel('customer_requests');
    } catch (err) {
      console.error('Failed to load customer requests:', err);
    } finally {
      setLoading(false);
    }
  };

  // When admin clicks on a specific service request to open it
  // Notice: backend automatically marks PENDING as PROCESSING upon GET /admin/service-requests/:id
  const handleOpenRequest = async (requestId: string) => {
    setLoading(true);
    setResultSuccessMsg(null);
    setResultErrorMsg(null);
    try {
      const res = await api.get(`/admin/service-requests/${requestId}`);
      const req: CustomerServiceRequest = res.request;
      setSelectedRequest(req);
      setFinalStatus(
        req.status === 'COMPLETED' || req.status === 'REJECTED' || req.status === 'CANCELLED' || req.status === 'REQUIRES_ACTION'
          ? req.status
          : ''
      );
      setAdminResultText(req.adminResultText || '');
      setAdminNote(req.adminNote || '');
      setUploadedResultFiles(req.adminResultFiles || []);
      setViewLevel('request_detail');

      // Update in local list if status changed from PENDING to PROCESSING
      setSelectedCustomerRequests((prev) =>
        prev.map((item) => (item.id === req.id ? req : item))
      );
      loadOverviewData();
    } catch (err) {
      console.error('Failed to open request:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle uploading result files
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setResultErrorMsg('File size exceeds 15MB limit.');
      return;
    }

    try {
      setUploadingDoc(true);
      setResultErrorMsg(null);

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const uploadRes = await api.post('/uploads/document', {
            fileName: file.name,
            fileData: base64Data,
            fileType: file.type,
            fileSize: file.size,
            documentCategory: 'ADMIN_RESULT'
          });

          const newFile: ServiceRequestFile = {
            id: uploadRes.documentId || `doc_${Date.now()}`,
            name: file.name,
            url: uploadRes.url || base64Data,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString()
          };

          setUploadedResultFiles((prev) => [...prev, newFile]);
        } catch (uploadErr: any) {
          setResultErrorMsg(uploadErr.message || 'Failed to upload result document.');
        } finally {
          setUploadingDoc(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setResultErrorMsg('Could not read file.');
      setUploadingDoc(false);
    }
  };

  const handleRemoveUploadedFile = (fileId: string) => {
    setUploadedResultFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Submit Result & Final Status - Validates and triggers confirmation
  const handleSubmitResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    // Strict requirement: Admin must select a status
    if (!finalStatus) {
      setResultErrorMsg('You must select a final status (Completed, Rejected, Cancelled, or Requires Customer Action).');
      return;
    }

    // Require at least text response or uploaded file
    if (!adminResultText.trim() && uploadedResultFiles.length === 0) {
      setResultErrorMsg('Please provide either an official written response, an uploaded result file, or both.');
      return;
    }

    setResultErrorMsg(null);
    setShowConfirmModal(true);
  };

  // Execution after confirmation
  const executeSubmitResult = async () => {
    if (!selectedRequest) return;
    setShowConfirmModal(false);

    try {
      setSubmittingResult(true);
      setResultErrorMsg(null);
      setResultSuccessMsg(null);

      const res = await api.post(`/admin/service-requests/${selectedRequest.id}/result`, {
        finalStatus,
        adminResultText: adminResultText.trim(),
        adminResultFiles: uploadedResultFiles,
        adminNote: adminNote.trim()
      });

      setSelectedRequest(res.request);
      setResultSuccessMsg(`Job dispatched successfully. Status updated to: ${finalStatus}. Customer account has been updated.`);

      // Update local lists
      setSelectedCustomerRequests((prev) =>
        prev.map((item) => (item.id === res.request.id ? res.request : item))
      );
      loadOverviewData();
    } catch (err: any) {
      console.error('Submit result error:', err);
      setResultErrorMsg(err.message || 'Failed to submit result.');
    } finally {
      setSubmittingResult(false);
    }
  };

  // Status badge styling helper
  const getStatusBadge = (status: ServiceRequestStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Pending
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Processing
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Completed
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3 text-red-400" />
            Rejected
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3 text-rose-400" />
            Failed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">
            Cancelled
          </span>
        );
      case 'REQUIRES_ACTION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
            <AlertTriangle className="w-3 h-3 text-orange-400" />
            Requires Action
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-white/10 text-gray-300">
            {status}
          </span>
        );
    }
  };

  // Filtering customers list
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.customerName.toLowerCase().includes(q) ||
      c.customerEmail.toLowerCase().includes(q) ||
      c.customerPhone.toLowerCase().includes(q) ||
      c.userId.toLowerCase().includes(q);

    let matchesStatus = true;
    if (statusFilter === 'PENDING') matchesStatus = c.pendingCount > 0;
    else if (statusFilter === 'PROCESSING') matchesStatus = c.processingCount > 0;
    else if (statusFilter === 'COMPLETED') matchesStatus = c.completedCount > 0;
    else if (statusFilter === 'REJECTED') matchesStatus = c.rejectedCount > 0;
    else if (statusFilter === 'REQUIRES_ACTION') matchesStatus = c.requiresActionCount > 0;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                <FileText className="w-6 h-6" />
              </span>
              <span>Service Requests Management</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Dedicated fulfillment workspace for customer services (CAC filings, SIM services, TIN, Printing). Separate from Verification.
          </p>
        </div>

        <button
          onClick={loadOverviewData}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-bold text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          <span>Refresh Workspace</span>
        </button>
      </div>

      {/* KPI Counters Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-[#161616] border border-[#262626]">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Work</span>
          <span className="text-xl sm:text-2xl font-black text-white mt-1 block">{stats.total}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#161616] border border-amber-500/30">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">🟡 Pending</span>
          <span className="text-xl sm:text-2xl font-black text-amber-400 mt-1 block">{stats.pending}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#161616] border border-blue-500/30">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">🔵 In Progress</span>
          <span className="text-xl sm:text-2xl font-black text-blue-400 mt-1 block">{stats.processing}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#161616] border border-emerald-500/30">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">🟢 Completed</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 block">{stats.completed}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#161616] border border-orange-500/30">
          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block">🟠 Action Needed</span>
          <span className="text-xl sm:text-2xl font-black text-orange-400 mt-1 block">{stats.requiresAction}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#161616] border border-red-500/30">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">🔴 Rejected</span>
          <span className="text-xl sm:text-2xl font-black text-red-400 mt-1 block">{stats.rejected}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW LEVEL 1: CUSTOMERS DIRECTORY                                         */}
      {/* ========================================================================= */}
      {viewLevel === 'customers' && (
        <div className="space-y-4">
          {/* Search, Filter & Sort bar */}
          <div className="bg-[#161616] rounded-2xl border border-[#262626] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name, email, phone, or account ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#121212] border border-[#282828] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#121212] border border-[#282828] rounded-xl px-2.5 py-1.5">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-xs text-gray-300 font-bold focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">With Pending Work</option>
                  <option value="PROCESSING">With In-Progress Work</option>
                  <option value="COMPLETED">With Completed Work</option>
                  <option value="REQUIRES_ACTION">Requires Customer Action</option>
                  <option value="REJECTED">With Rejected Work</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-[#121212] border border-[#282828] rounded-xl px-2.5 py-1.5">
                <span className="text-[11px] text-gray-400 font-bold">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs text-gray-300 font-bold focus:outline-none"
                >
                  <option value="NEWEST">Newest Activity</option>
                  <option value="OLDEST">Oldest Activity</option>
                  <option value="RECENT_UPDATED">Recently Updated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer Accounts Table */}
          <div className="bg-[#161616] rounded-3xl border border-[#262626] overflow-hidden shadow-lg">
            <div className="p-4 sm:p-6 border-b border-[#262626] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-400" />
                  <span>Customer Accounts ({filteredCustomers.length})</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Select a customer account to view all service requests submitted by that customer.
                </p>
              </div>
            </div>

            {loading && customers.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                <p className="text-xs text-gray-400">Loading customer service accounts...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <FolderOpen className="w-10 h-10 text-gray-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">No Customer Accounts Found</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'No customer accounts match your search filters.'
                    : 'No customer service requests have been submitted yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#262626] text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-[#121212]/50">
                      <th className="py-3.5 px-6">Customer Name</th>
                      <th className="py-3.5 px-6">Contact (Email & Phone)</th>
                      <th className="py-3.5 px-6">Account ID</th>
                      <th className="py-3.5 px-6 text-center">Total Requests</th>
                      <th className="py-3.5 px-6 text-center">Pending</th>
                      <th className="py-3.5 px-6 text-center">Completed</th>
                      <th className="py-3.5 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626] text-xs">
                    {filteredCustomers.map((cust) => (
                      <tr
                        key={cust.userId}
                        onClick={() => handleSelectCustomer(cust.userId)}
                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              user={{ fullName: cust.customerName, avatarUrl: (cust as any).avatarUrl || (cust as any).avatar_url }}
                              size="sm"
                              showBorder
                              className="shrink-0"
                            />
                            <div>
                              <span className="font-bold text-white group-hover:text-orange-400 transition-colors block">
                                {cust.customerName}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                Last active: {new Date(cust.lastSubmittedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-gray-300">
                              <Mail className="w-3 h-3 text-gray-500" />
                              <span className="text-[11px] truncate max-w-[180px]">{cust.customerEmail}</span>
                            </div>
                            {cust.customerPhone && (
                              <div className="flex items-center gap-1.5 text-gray-400">
                                <Phone className="w-3 h-3 text-gray-500" />
                                <span className="text-[10px]">{cust.customerPhone}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6 font-mono text-[11px] text-gray-400">
                          {cust.userId}
                        </td>

                        <td className="py-4 px-6 text-center">
                          <span className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs">
                            {cust.totalRequests}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-center">
                          {cust.pendingCount > 0 ? (
                            <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs">
                              {cust.pendingCount}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs">0</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-center">
                          {cust.completedCount > 0 ? (
                            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                              {cust.completedCount}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs">0</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCustomer(cust.userId);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-black font-bold text-xs transition-colors"
                          >
                            <span>Open Customer Work</span>
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

      {/* ========================================================================= */}
      {/* VIEW LEVEL 2: CUSTOMER'S SERVICE REQUESTS LIST                            */}
      {/* ========================================================================= */}
      {viewLevel === 'customer_requests' && (
        <div className="space-y-5">
          {/* Breadcrumbs / Back button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setViewLevel('customers');
                setSelectedCustomerId(null);
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-bold text-xs hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Customer Accounts</span>
            </button>
          </div>

          {/* Customer Profile Banner */}
          <div className="bg-[#161616] rounded-3xl border border-[#262626] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <UserAvatar user={customerProfile} size="lg" showBorder className="shadow-lg shrink-0" />
              <div>
                <h2 className="text-xl font-black text-white">
                  {customerProfile?.fullName || 'Customer Account'}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-gray-500" />
                    {customerProfile?.email}
                  </span>
                  {customerProfile?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-500" />
                      {customerProfile.phone}
                    </span>
                  )}
                  <span className="font-mono text-[11px] text-gray-500">
                    ID: {selectedCustomerId}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-bold">Total Service Filings:</span>
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-xl text-white font-black text-sm">
                {selectedCustomerRequests.length}
              </span>
            </div>
          </div>

          {/* Table of Customer's Requests */}
          <div className="bg-[#161616] rounded-3xl border border-[#262626] overflow-hidden shadow-lg">
            <div className="p-5 border-b border-[#262626]">
              <h3 className="text-sm font-bold text-white">
                All Service Requests for {customerProfile?.fullName || 'this Customer'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Click any ticket to open the fulfillment desk, view submitted documents, change status, and dispatch official results.
              </p>
            </div>

            {selectedCustomerRequests.length === 0 ? (
              <div className="p-16 text-center space-y-2 text-gray-500">
                <FileText className="w-8 h-8 mx-auto" />
                <p className="text-xs">No service requests found for this customer.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#262626] text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-[#121212]/50">
                      <th className="py-3.5 px-6">Ticket ID</th>
                      <th className="py-3.5 px-6">Service Requested</th>
                      <th className="py-3.5 px-6">Category</th>
                      <th className="py-3.5 px-6">Submission Date</th>
                      <th className="py-3.5 px-6 text-center">Status</th>
                      <th className="py-3.5 px-6 text-right">Fulfillment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626] text-xs">
                    {selectedCustomerRequests.map((req) => (
                      <tr
                        key={req.id}
                        onClick={() => handleOpenRequest(req.id)}
                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-6 font-mono font-bold text-orange-400 flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5" />
                          <span>{req.ticketId}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-bold text-white block group-hover:text-orange-400 transition-colors">
                            {req.serviceName}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            Fee Paid: {formatCurrency(req.price)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-300">
                          {req.serviceCategory}
                        </td>
                        <td className="py-4 px-6 text-gray-400">
                          {new Date(req.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {getStatusBadge(req.status)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRequest(req.id);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 text-black font-bold text-xs hover:bg-orange-600 transition-colors"
                          >
                            <span>Open & Process</span>
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

      {/* ========================================================================= */}
      {/* VIEW LEVEL 3: INDIVIDUAL SERVICE REQUEST DETAIL & DISPATCH               */}
      {/* ========================================================================= */}
      {viewLevel === 'request_detail' && selectedRequest && (
        <div className="space-y-6">
          {/* Breadcrumbs & Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewLevel('customer_requests')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-bold text-xs hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Customer's Requests</span>
            </button>

            <span className="font-mono text-xs text-gray-400 font-bold">
              Ticket: <strong className="text-orange-400">{selectedRequest.ticketId}</strong>
            </span>
          </div>

          {/* Ticket Header Card */}
          <div className="bg-[#161616] rounded-3xl border border-[#262626] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#282828] gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-orange-400">
                    #{selectedRequest.ticketId}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-xs text-gray-400">{selectedRequest.serviceCategory}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {selectedRequest.serviceName}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Submitted: {new Date(selectedRequest.createdAt).toLocaleString()} • Fee Paid: {formatCurrency(selectedRequest.price)}
                </p>
              </div>

              <div className="flex flex-col sm:items-end gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Current Status
                </span>
                {getStatusBadge(selectedRequest.status)}
              </div>
            </div>

            {/* Customer Information Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-2xl bg-[#121212] border border-[#262626] space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3" /> Customer Name
                </span>
                <p className="text-xs font-bold text-white">{selectedRequest.customerName}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#121212] border border-[#262626] space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email Address
                </span>
                <p className="text-xs font-bold text-white truncate">{selectedRequest.customerEmail}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#121212] border border-[#262626] space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone Number
                </span>
                <p className="text-xs font-bold text-white">{selectedRequest.customerPhone || 'Not provided'}</p>
              </div>
            </div>

            {/* Special Highlight for Personalisation Requests */}
            {(selectedRequest.serviceCode === 'PERSONALIZATION' ||
              selectedRequest.serviceCode === 'PERSONALISATION' ||
              selectedRequest.serviceName.toLowerCase().includes('personal')) && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/15 via-[#161616] to-[#121212] border-2 border-orange-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    <span>NIN Personalisation Service Job</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30">
                    Provider: Veripine Gateway
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#262626]">
                  <div>
                    <span className="text-[11px] text-gray-400 block">NIN Tracking ID Entered by Customer:</span>
                    <span className="text-base sm:text-lg font-mono font-black text-white tracking-widest">
                      {selectedRequest.submittedData?.ninTrackingId ||
                        selectedRequest.submittedData?.trackingId ||
                        selectedRequest.submittedData?.tracking_id ||
                        selectedRequest.submittedData?.trackingNo ||
                        selectedRequest.submittedData?.searchQuery ||
                        'Not specified'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    Credits Deducted: <strong className="text-orange-400">{formatCurrency(selectedRequest.price)}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Special Highlight for NIN Delinking Requests: Old Phone Number */}
            {(selectedRequest.serviceCode === 'NIN_DELINKING' ||
              selectedRequest.serviceName.toLowerCase().includes('delink') ||
              selectedRequest.submittedData?.oldPhoneToDelink ||
              selectedRequest.submittedData?.oldPhoneNumber ||
              selectedRequest.submittedData?.oldPhone) && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500/15 via-[#161616] to-[#121212] border-2 border-red-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-red-400 uppercase tracking-wider flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>NIN Delinking Request Data</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                    NIMC Portal Filing
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#262626]">
                  <div>
                    <span className="text-[11px] text-gray-400 block">Old Phone Number to Delink:</span>
                    <span className="text-base sm:text-lg font-mono font-black text-red-400 tracking-wider">
                      {selectedRequest.submittedData?.oldPhoneNumber ||
                        selectedRequest.submittedData?.oldPhone ||
                        selectedRequest.submittedData?.oldPhoneToDelink ||
                        'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-400 block">Current Registered Phone Number:</span>
                    <span className="text-base font-mono font-bold text-white tracking-wider">
                      {selectedRequest.submittedData?.phone ||
                        selectedRequest.submittedData?.currentPhone ||
                        selectedRequest.customerPhone ||
                        '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Special Highlight for Email Retrieval Requests: Target Email */}
            {(selectedRequest.serviceCode === 'SELF_SERVICE_EMAIL' ||
              selectedRequest.serviceName.toLowerCase().includes('email') ||
              (selectedRequest.submittedData?.serviceType === 'EMAIL' && selectedRequest.submittedData?.email)) && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500/15 via-[#161616] to-[#121212] border-2 border-teal-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>Email Retrieval Request Data</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                    Target Email
                  </span>
                </div>
                <div className="pt-2 border-t border-[#262626]">
                  <span className="text-[11px] text-gray-400 block">Target Email Address:</span>
                  <span className="text-base sm:text-lg font-mono font-black text-teal-400">
                    {selectedRequest.submittedData?.email || 'Not specified'}
                  </span>
                </div>
              </div>
            )}

            {/* Special Highlight for Online NIN Registration Requests */}
            {(selectedRequest.serviceCode === 'ONLINE_NIN_REGISTRATION' ||
              selectedRequest.serviceName.toLowerCase().includes('online nin') ||
              selectedRequest.serviceName.toLowerCase().includes('nin registration')) && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-[#181818] to-[#141414] border-2 border-orange-500/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-orange-400" />
                    <span className="text-sm font-extrabold text-orange-400 uppercase tracking-wider">
                      Official Online NIN Registration Particulars
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30">
                      Ticket ID: {selectedRequest.ticketId}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white/10 text-gray-300">
                      Fee: {formatCurrency(selectedRequest.price)}
                    </span>
                  </div>
                </div>

                {/* Key Applicant Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#262626] text-xs">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-[#2a2a2a]">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Full Name</span>
                    <span className="font-bold text-white block">
                      {selectedRequest.submittedData?.fullName || `${selectedRequest.submittedData?.title || ''} ${selectedRequest.submittedData?.firstName || ''} ${selectedRequest.submittedData?.middleName || ''} ${selectedRequest.submittedData?.surname || ''}`.trim() || selectedRequest.customerName}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-[#2a2a2a]">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Nationality</span>
                    <span className="font-black text-amber-400 block">
                      {selectedRequest.submittedData?.nationality || 'Nigerian'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-[#2a2a2a]">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Country of Residence</span>
                    <span className="font-black text-emerald-400 block">
                      {selectedRequest.submittedData?.countryOfResidence || 'Nigeria'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-[#2a2a2a]">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Date of Birth & Gender</span>
                    <span className="font-bold text-white block">
                      {selectedRequest.submittedData?.dob || '—'} ({selectedRequest.submittedData?.gender || '—'})
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-[#2a2a2a]">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Citizen Phone</span>
                    <span className="font-mono font-bold text-white block">
                      {selectedRequest.submittedData?.phone || selectedRequest.customerPhone || '—'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-[#2a2a2a]">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">State & LGA of Origin</span>
                    <span className="font-bold text-gray-200 block truncate">
                      {selectedRequest.submittedData?.stateOfOrigin || '—'}, {selectedRequest.submittedData?.lgaOfOrigin || '—'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-[#2a2a2a]">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Residential Address</span>
                    <span className="font-medium text-gray-300 block truncate" title={selectedRequest.submittedData?.residentialAddress}>
                      {selectedRequest.submittedData?.residentialAddress || '—'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-[#2a2a2a]">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Next of Kin</span>
                    <span className="font-bold text-white block truncate">
                      {selectedRequest.submittedData?.nokName || '—'} ({selectedRequest.submittedData?.nokRelationship || 'NOK'})
                    </span>
                    <span className="text-[10px] text-gray-400 block font-mono">
                      {selectedRequest.submittedData?.nokPhone || ''}
                    </span>
                  </div>
                </div>

                {/* Uploaded Individual Pictures Gallery (Up to 3 Photos) */}
                <div className="space-y-2 pt-2 border-t border-[#262626]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-orange-400" />
                      <span>Uploaded Individual Pictures for Citizen</span>
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      {
                        (selectedRequest.customerFiles?.filter(f => f.type?.startsWith('image/') || f.name?.toLowerCase().includes('picture') || f.name?.toLowerCase().includes('photo')).length) ||
                        (Array.isArray(selectedRequest.submittedData?.uploadedPictures) ? selectedRequest.submittedData.uploadedPictures.length : (selectedRequest.submittedData?.passportPhoto ? 1 : 0))
                      } Picture(s) Stored
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* From customerFiles */}
                    {selectedRequest.customerFiles && selectedRequest.customerFiles.filter(f => f.type?.startsWith('image/') || f.name?.toLowerCase().includes('picture') || f.name?.toLowerCase().includes('photo') || f.url?.startsWith('data:image')).map((file, idx) => (
                      <div key={file.id || idx} className="rounded-xl border border-white/10 overflow-hidden bg-black/60 relative group shadow-sm">
                        <img src={file.url} alt={`Citizen Picture ${idx + 1}`} className="w-full h-44 object-cover object-center" />
                        <div className="p-2 bg-[#121212] flex items-center justify-between text-[11px]">
                          <span className="font-bold text-white truncate max-w-[120px]">
                            {file.name || `Picture #${idx + 1}`}
                          </span>
                          <a href={file.url} download={file.name || `citizen_photo_${idx + 1}.jpg`} target="_blank" rel="noreferrer" className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1">
                            <Download className="w-3 h-3" /> Save
                          </a>
                        </div>
                      </div>
                    ))}

                    {/* Fallback to submittedData.uploadedPictures if customerFiles empty */}
                    {(!selectedRequest.customerFiles || selectedRequest.customerFiles.length === 0) &&
                      Array.isArray(selectedRequest.submittedData?.uploadedPictures) &&
                      selectedRequest.submittedData.uploadedPictures.map((photoUrl: string, idx: number) => (
                        <div key={idx} className="rounded-xl border border-white/10 overflow-hidden bg-black/60 relative group shadow-sm">
                          <img src={photoUrl} alt={`Citizen Photo ${idx + 1}`} className="w-full h-44 object-cover object-center" />
                          <div className="p-2 bg-[#121212] flex items-center justify-between text-[11px]">
                            <span className="font-bold text-white">Picture #{idx + 1}</span>
                            <a href={photoUrl} download={`citizen_photo_${idx + 1}.jpg`} target="_blank" rel="noreferrer" className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1">
                              <Download className="w-3 h-3" /> Save
                            </a>
                          </div>
                        </div>
                      ))}

                    {/* Single passportPhoto fallback */}
                    {(!selectedRequest.customerFiles || selectedRequest.customerFiles.length === 0) &&
                      !Array.isArray(selectedRequest.submittedData?.uploadedPictures) &&
                      selectedRequest.submittedData?.passportPhoto && (
                        <div className="rounded-xl border border-white/10 overflow-hidden bg-black/60 relative group shadow-sm">
                          <img src={selectedRequest.submittedData.passportPhoto} alt="Passport Photo" className="w-full h-44 object-cover object-center" />
                          <div className="p-2 bg-[#121212] flex items-center justify-between text-[11px]">
                            <span className="font-bold text-white">Primary Portrait</span>
                            <a href={selectedRequest.submittedData.passportPhoto} download="citizen_photo.jpg" target="_blank" rel="noreferrer" className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1">
                              <Download className="w-3 h-3" /> Save
                            </a>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* Special Highlight for Modification Requests: Passport Photos Gallery */}
            {(selectedRequest.serviceCode === 'MODIFICATION' ||
              selectedRequest.serviceName.toLowerCase().includes('mod') ||
              (selectedRequest.submittedData?.passportPhotos && selectedRequest.submittedData.passportPhotos.length > 0) ||
              (selectedRequest.customerFiles && selectedRequest.customerFiles.some((f) => f.name.toLowerCase().includes('passport') || f.type?.startsWith('image/')))) && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#181818] to-[#141414] border-2 border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                      Attached Passport Photographs ({
                        (selectedRequest.submittedData?.passportPhotos?.length) ||
                        (selectedRequest.customerFiles?.filter((f) => f.name.toLowerCase().includes('passport') || f.type?.startsWith('image/')).length) ||
                        0
                      } Uploaded)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {selectedRequest.submittedData?.modificationType || 'Modification Proof'}
                  </span>
                </div>

                {/* Grid of Passport Photographs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {/* From customerFiles */}
                  {selectedRequest.customerFiles && selectedRequest.customerFiles.filter((f) => f.name.toLowerCase().includes('passport') || f.type?.startsWith('image/') || f.url?.startsWith('data:image')).map((file, idx) => (
                    <div key={file.id || idx} className="rounded-xl border border-white/10 overflow-hidden bg-black/60 relative group shadow-sm">
                      <img src={file.url} alt={`Passport ${idx + 1}`} className="w-full h-40 object-cover object-center" />
                      <div className="p-2 bg-[#121212] flex items-center justify-between text-[11px]">
                        <span className="font-bold text-white truncate max-w-[120px]">Photo {idx + 1}</span>
                        <a href={file.url} download={file.name || `passport_${idx + 1}.jpg`} target="_blank" rel="noreferrer" className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1">
                          <Download className="w-3 h-3" /> Save
                        </a>
                      </div>
                    </div>
                  ))}

                  {/* Fallback to submittedData.passportPhotos if not in customerFiles */}
                  {(!selectedRequest.customerFiles || selectedRequest.customerFiles.length === 0) &&
                    Array.isArray(selectedRequest.submittedData?.passportPhotos) &&
                    selectedRequest.submittedData.passportPhotos.map((photoUrl: string, idx: number) => (
                    <div key={idx} className="rounded-xl border border-white/10 overflow-hidden bg-black/60 relative group shadow-sm">
                      <img src={photoUrl} alt={`Passport ${idx + 1}`} className="w-full h-40 object-cover object-center" />
                      <div className="p-2 bg-[#121212] flex items-center justify-between text-[11px]">
                        <span className="font-bold text-white">Photo #{idx + 1}</span>
                        <a href={photoUrl} download={`passport_photo_${idx + 1}.jpg`} target="_blank" rel="noreferrer" className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1">
                          <Download className="w-3 h-3" /> Save
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submission Information & Documents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Submitted Information (100% Real Data) */}
            <div className="bg-[#161616] rounded-3xl border border-[#262626] p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-[#262626]">
                <FileCheck className="w-4 h-4 text-orange-400" />
                <span>Customer Submitted Information</span>
              </h3>

              {Object.keys(selectedRequest.submittedData || {}).length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  No additional parameters were required for this service.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                  {Object.entries(selectedRequest.submittedData).map(([key, val]) => (
                    <div
                      key={key}
                      className="p-3 rounded-xl bg-[#121212] border border-[#282828] flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                    >
                      <span className="text-xs font-bold text-gray-400 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:
                      </span>
                      <span className="text-xs font-mono font-bold text-white text-right break-all">
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

            {/* Customer Uploaded Documents */}
            <div className="bg-[#161616] rounded-3xl border border-[#262626] p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-[#262626]">
                <UploadCloud className="w-4 h-4 text-orange-400" />
                <span>Customer Uploaded Documents</span>
              </h3>

              {(!selectedRequest.customerFiles || selectedRequest.customerFiles.length === 0) ? (
                <div className="py-12 text-center space-y-2 text-gray-500">
                  <FolderOpen className="w-8 h-8 mx-auto" />
                  <p className="text-xs">No documents were uploaded by customer for this filing.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {selectedRequest.customerFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-3.5 rounded-2xl bg-[#121212] border border-[#282828] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-bold text-white truncate block">{file.name}</span>
                          <span className="text-[10px] text-gray-500">
                            {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Document'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={file.url}
                          download={file.name}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                          title="Download Document"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-colors"
                          title="Preview Document"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Timeline & History */}
          <div className="bg-[#161616] rounded-3xl border border-[#262626] p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-[#262626]">
              <Clock className="w-4 h-4 text-orange-400" />
              <span>Fulfillment Timeline & History</span>
            </h3>

            <div className="space-y-4 pl-2">
              {(selectedRequest.timeline || []).map((ev, idx) => (
                <div key={ev.id || idx} className="relative flex items-start gap-4">
                  {/* Connector line */}
                  {idx < (selectedRequest.timeline || []).length - 1 && (
                    <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-[#282828]" />
                  )}

                  <div className="w-5 h-5 rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs">
                      <span className="font-bold text-white">{ev.title}</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(ev.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{ev.description}</p>
                    <span className="text-[10px] text-gray-500 block">
                      Actor: {ev.actorName} ({ev.actorRole})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RESULT SUBMISSION AND DISPATCH SECTION                                   */}
          {/* ========================================================================= */}
          <div className="bg-[#161616] rounded-3xl border border-orange-500/30 p-6 space-y-5 shadow-2xl">
            <div className="pb-4 border-b border-[#282828]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-orange-400" />
                <span>Submit Result and Official Response</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Attach certificates/result documents, write official resolution text, and select the final ticket status.
              </p>
            </div>

            {resultSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{resultSuccessMsg}</span>
              </div>
            )}

            {resultErrorMsg && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resultErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitResult} className="space-y-5">
              {/* Option 1: Upload Result Files */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 block">
                  1. Result Documents / Certificates (Optional or in combination with text):
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-200 font-bold text-xs transition-colors">
                    <UploadCloud className="w-4 h-4 text-orange-400" />
                    <span>{uploadingDoc ? 'Uploading...' : 'Choose Result File (PDF, PNG, JPG)'}</span>
                    <input
                      type="file"
                      disabled={uploadingDoc}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                  </label>
                  <span className="text-[11px] text-gray-500">Max size 15MB.</span>
                </div>

                {/* Uploaded Result Files List */}
                {uploadedResultFiles.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {uploadedResultFiles.map((rf) => (
                      <div
                        key={rf.id}
                        className="p-2.5 rounded-xl bg-[#121212] border border-[#282828] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="font-bold text-white truncate">{rf.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveUploadedFile(rf.id)}
                          className="text-red-400 hover:text-red-300 font-bold text-[11px] px-2 py-1"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Option 2: Written Response */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 block">
                  2. Official Message / Result Details (Written to Customer):
                </label>
                <textarea
                  rows={4}
                  value={adminResultText}
                  onChange={(e) => setAdminResultText(e.target.value)}
                  placeholder="e.g. Your CAC Certificate of Registration has been approved. Certificate Number: RC-XXXXXX. Please download your stamped registration document attached."
                  className="w-full p-4 bg-[#121212] border border-[#282828] rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 leading-relaxed"
                />
              </div>

              {/* Option 3: Internal Admin Note */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 block">
                  3. Internal Admin Note (Not visible to customer):
                </label>
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Verified with portal batch #4088. Dispatched by operations."
                  className="w-full px-4 py-2.5 bg-[#121212] border border-[#282828] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Option 4: Mandatory Final Status Selection */}
              <div className="space-y-2 pt-2 border-t border-[#282828]">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="text-orange-400">*</span>
                  <span>4. Final Status (Mandatory before sending):</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { val: 'COMPLETED', label: 'Approve / Complete', color: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' },
                    { val: 'REJECTED', label: 'Reject', color: 'border-red-500/50 text-red-400 bg-red-500/10' },
                    { val: 'FAILED', label: 'Fail', color: 'border-rose-500/50 text-rose-400 bg-rose-500/10' },
                    { val: 'REQUIRES_ACTION', label: 'Action Required', color: 'border-orange-500/50 text-orange-400 bg-orange-500/10' },
                    { val: 'CANCELLED', label: 'Cancelled', color: 'border-gray-500/50 text-gray-400 bg-gray-500/10' }
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setFinalStatus(s.val as ServiceRequestStatus)}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                        finalStatus === s.val
                          ? `${s.color} ring-2 ring-orange-500 shadow-md`
                          : 'border-[#282828] bg-[#121212] text-gray-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={submittingResult || !finalStatus}
                  className="px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-extrabold text-xs flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20"
                >
                  {submittingResult ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{finalStatus === 'COMPLETED' ? 'Submit Completed Job' : 'Submit Official Result'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#161616] border border-[#333] rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Job Completion</h3>
                <p className="text-xs text-gray-400">Review before dispatching to customer account</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#121212] border border-[#262626] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Customer:</span>
                <strong className="text-white">{selectedRequest.customerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Service:</span>
                <strong className="text-white">{selectedRequest.serviceName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Ticket ID:</span>
                <strong className="font-mono text-orange-400">{selectedRequest.ticketId}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Final Status:</span>
                <strong className={finalStatus === 'COMPLETED' ? 'text-emerald-400' : 'text-orange-400'}>
                  {finalStatus}
                </strong>
              </div>
              {uploadedResultFiles.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Attached Files:</span>
                  <span className="text-white font-mono">{uploadedResultFiles.length} file(s)</span>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Are you sure you want to dispatch this completed job? The customer will receive an immediate notification and can view the result in their portal. The customer will NOT be charged again.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingResult}
                onClick={executeSubmitResult}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-extrabold text-xs flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20"
              >
                {submittingResult && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm & Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
