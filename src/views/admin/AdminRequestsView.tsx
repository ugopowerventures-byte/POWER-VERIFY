import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { VerificationRequest } from '../../types';
import { formatCurrency } from '../../utils/currency';
import {
  FileCheck2,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Loader2,
  AlertCircle,
  FileText,
  User,
  Hash,
  Calendar,
  DollarSign,
  Send,
  Sparkles,
  ShieldCheck,
  Building2,
  ChevronDown,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  MapPin
} from 'lucide-react';

interface BvnEnrollmentCenter {
  id: string;
  name: string;
  price: number;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
  displayOrder?: number;
  updatedAt?: string;
}

export const AdminRequestsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'requests' | 'centers'>('requests');

  // Requests state
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [selectedReq, setSelectedReq] = useState<VerificationRequest | null>(null);

  // Review & Status Update Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<VerificationRequest['status']>('PROCESSING');
  const [adminNote, setAdminNote] = useState('');
  const [refundUser, setRefundUser] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Document image preview modal
  const [previewImage, setPreviewImage] = useState<{ title: string; src: string } | null>(null);

  // BVN Centers State
  const [centers, setCenters] = useState<BvnEnrollmentCenter[]>([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [centerModalOpen, setCenterModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<BvnEnrollmentCenter | null>(null);
  const [centerName, setCenterName] = useState('');
  const [centerPrice, setCenterPrice] = useState<number>(3000);
  const [centerStatus, setCenterStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [centerDescription, setCenterDescription] = useState('');
  const [centerSaving, setCenterSaving] = useState(false);
  const [centerDeletingId, setCenterDeletingId] = useState<string | null>(null);
  const [centerError, setCenterError] = useState<string | null>(null);
  const [centerSuccess, setCenterSuccess] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data: VerificationRequest[] = await api.get('/admin/verifications');
      setRequests(data || []);
    } catch (err) {
      console.error('Failed to fetch admin verifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCenters = async () => {
    setLoadingCenters(true);
    try {
      const data: BvnEnrollmentCenter[] = await api.get('/bvn/enrollment-centers');
      setCenters(data || []);
    } catch (err) {
      console.error('Failed to fetch enrollment centers:', err);
    } finally {
      setLoadingCenters(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchCenters();
  }, []);

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesService =
      serviceFilter === 'ALL' ||
      (r.serviceCode && r.serviceCode.toUpperCase().includes(serviceFilter.toUpperCase()));

    const q = search.toLowerCase().trim();
    if (!q) return matchesStatus && matchesService;

    const matchesSearch =
      r.reference.toLowerCase().includes(q) ||
      r.serviceName.toLowerCase().includes(q) ||
      (r.userName && r.userName.toLowerCase().includes(q)) ||
      (r.userEmail && r.userEmail.toLowerCase().includes(q)) ||
      (r.serviceCode && r.serviceCode.toLowerCase().includes(q)) ||
      Object.values(r.searchData || {}).some((val) =>
        typeof val === 'object'
          ? JSON.stringify(val).toLowerCase().includes(q)
          : String(val).toLowerCase().includes(q)
      );

    return matchesStatus && matchesService && matchesSearch;
  });

  const handleOpenReview = (r: VerificationRequest) => {
    setSelectedReq(r);
    setNewStatus(r.status);
    setAdminNote(r.adminNote || '');
    setRefundUser(false);
    setActionSuccess(null);
    setActionError(null);
    setReviewModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedReq) return;
    setUpdating(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await api.patch(`/admin/verifications/${selectedReq.id}/status`, {
        status: newStatus,
        adminNote,
        refundUser
      });

      setActionSuccess(`Request ${selectedReq.reference} successfully marked as ${newStatus}.`);
      await fetchRequests();
      setTimeout(() => {
        setReviewModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update request status.');
    } finally {
      setUpdating(false);
    }
  };

  // Center Management Handlers
  const handleOpenNewCenter = () => {
    setEditingCenter(null);
    setCenterName('');
    setCenterPrice(3000);
    setCenterStatus('ACTIVE');
    setCenterDescription('');
    setCenterError(null);
    setCenterSuccess(null);
    setCenterModalOpen(true);
  };

  const handleOpenEditCenter = (center: BvnEnrollmentCenter) => {
    setEditingCenter(center);
    setCenterName(center.name);
    setCenterPrice(center.price);
    setCenterStatus(center.status);
    setCenterDescription(center.description || '');
    setCenterError(null);
    setCenterSuccess(null);
    setCenterModalOpen(true);
  };

  const handleSaveCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerName.trim()) {
      setCenterError('Please enter a center name.');
      return;
    }

    setCenterSaving(true);
    setCenterError(null);
    try {
      if (editingCenter) {
        await api.put(`/admin/bvn/enrollment-centers/${editingCenter.id}`, {
          name: centerName.trim(),
          price: Number(centerPrice),
          status: centerStatus,
          description: centerDescription.trim()
        });
        setCenterSuccess('Enrollment center updated successfully.');
      } else {
        await api.post('/admin/bvn/enrollment-centers', {
          name: centerName.trim(),
          price: Number(centerPrice),
          status: centerStatus,
          description: centerDescription.trim()
        });
        setCenterSuccess('New enrollment center created.');
      }

      await fetchCenters();
      setTimeout(() => {
        setCenterModalOpen(false);
      }, 1000);
    } catch (err: any) {
      setCenterError(err.message || 'Failed to save enrollment center.');
    } finally {
      setCenterSaving(false);
    }
  };

  const handleDeleteCenter = async (id: string, name: string) => {
    if (centerDeletingId) return;
    if (!window.confirm(`Are you sure you want to permanently delete enrollment center "${name}"?`)) return;
    try {
      setCenterDeletingId(id);
      await api.delete(`/admin/bvn/enrollment-centers/${id}`);
      await fetchCenters();
    } catch (err: any) {
      alert(err.message || 'Failed to delete enrollment center.');
    } finally {
      setCenterDeletingId(null);
    }
  };

  const getStatusBadge = (status: VerificationRequest['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </span>
        );
      case 'COMPLETED':
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return <span className="text-xs font-bold text-gray-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Service Requests & Orders</h1>
          <p className="text-xs text-gray-500 mt-1">
            Review, process, and fulfill customer requests across NIN modifications, BVN services, NPC birth attestations, CAC, and TIN registrations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'centers' && (
            <button
              onClick={handleOpenNewCenter}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-bold hover:bg-orange-600 shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Center</span>
            </button>
          )}

          <button
            onClick={() => {
              if (activeTab === 'requests') fetchRequests();
              else fetchCenters();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'requests'
              ? 'bg-[#121212] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-orange-400" />
          <span>All Requests & Orders</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            {requests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('centers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'centers'
              ? 'bg-[#121212] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Building2 className="w-4 h-4 text-orange-400" />
          <span>BVN Enrollment Centers</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            {centers.length}
          </span>
        </button>
      </div>

      {activeTab === 'requests' ? (
        <>
          {/* Filter and Search Bar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row items-center gap-3 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer, reference, service code, NIN, BVN..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:border-[#FF6B00] outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Service Filter */}
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:border-[#FF6B00] outline-none bg-white"
              >
                <option value="ALL">All Services</option>
                <option value="MODIFICATION">MODIFICATION</option>
                <option value="CAC_TIN">CAC & TIN</option>
                <option value="BVN_RETRIEVAL">BVN Retrieval</option>
                <option value="BVN_ANDROID">Android BVN Onboarding</option>
                <option value="BIRTH_ATTESTATION">NPC Birth Attestation</option>
                <option value="NIN_DELINKING">NIN Delinking</option>
                <option value="SELF_SERVICE_EMAIL">Self service Email Retrieval</option>
              </select>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:border-[#FF6B00] outline-none bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending Only</option>
                  <option value="PROCESSING">Processing Only</option>
                  <option value="COMPLETED">Completed / Success</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mx-auto" />
                <p className="text-xs text-gray-500 font-medium">Loading requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FileCheck2 className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-sm font-bold text-gray-700">No requests match your filter</p>
                <p className="text-xs text-gray-400">Try changing your search query or status filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Reference & Date</th>
                      <th className="py-3 px-4">Service</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Reference & Date */}
                        <td className="py-3.5 px-4 font-mono">
                          <span className="font-bold text-gray-900 block">{req.reference}</span>
                          <span className="text-[11px] text-gray-400 font-sans">
                            {new Date(req.createdAt).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </span>
                        </td>

                        {/* Service */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-900 block">{req.serviceName}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-orange-600 bg-orange-50 font-mono font-bold px-1.5 py-0.2 rounded border border-orange-200">
                              {req.serviceCode}
                            </span>
                            {req.searchData?.centerName && (
                              <span className="text-[10px] text-indigo-700 bg-indigo-50 font-semibold px-1.5 py-0.2 rounded border border-indigo-200">
                                {String(req.searchData.centerName)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-800 block">
                            {req.userName || 'Customer'}
                          </span>
                          <span className="text-[11px] text-gray-400 block">{req.userEmail}</span>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                          {formatCurrency(req.amountCharged)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">{getStatusBadge(req.status)}</td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenReview(req)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-bold hover:bg-gray-100 shadow-sm transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                            <span>Review</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* BVN Enrollment Centers Tab */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Configured BVN Enrollment Centers</h3>
                <p className="text-xs text-gray-500">
                  Each center can have a custom processing fee. When users select a center during BVN modification, the application dynamically charges this exact amount.
                </p>
              </div>
              <button
                onClick={handleOpenNewCenter}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#121212] text-white text-xs font-bold hover:bg-orange-600 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Center</span>
              </button>
            </div>

            {loadingCenters ? (
              <div className="py-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#FF6B00] mx-auto" />
              </div>
            ) : centers.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-xs text-gray-500 font-medium">No enrollment centers configured yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Center Name</th>
                      <th className="py-2.5 px-3">Center ID</th>
                      <th className="py-2.5 px-3">Official Fee</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {centers.map((center) => (
                      <tr key={center.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-3 font-bold text-gray-900 flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          <span>{center.name}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-500 text-[11px]">{center.id}</td>
                        <td className="py-3 px-3 font-mono font-black text-gray-900 text-sm">
                          {formatCurrency(center.price)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              center.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {center.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500 text-[11px] max-w-xs truncate">
                          {center.description || '--'}
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditCenter(center)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
                            title="Edit center details & price"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCenter(center.id, center.name)}
                            disabled={centerDeletingId === center.id}
                            className={`p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors ${
                              centerDeletingId === center.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title="Remove center"
                          >
                            <Trash2 className={`w-3.5 h-3.5 ${centerDeletingId === center.id ? 'animate-pulse' : ''}`} />
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

      {/* Review / Status Change Modal */}
      {reviewModalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Manage Request: {selectedReq.serviceName}
                </h3>
                <p className="text-xs text-gray-500 font-mono">Ref: {selectedReq.reference}</p>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 text-base font-bold"
              >
                ✕
              </button>
            </div>

            {/* Notification alert inside modal */}
            {actionSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{actionSuccess}</span>
              </div>
            )}
            {actionError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Request Summary Card */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-3 border-b border-gray-200">
                <div>
                  <span className="text-gray-400 block font-medium">Customer:</span>
                  <span className="font-bold text-gray-900">{selectedReq.userName}</span>
                  <span className="text-gray-500 block text-[11px]">{selectedReq.userEmail}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Service Code:</span>
                  <span className="font-mono font-bold text-gray-900">{selectedReq.serviceCode}</span>
                  <span className="text-[10px] text-gray-500 block">
                    {new Date(selectedReq.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Fee Charged:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    {formatCurrency(selectedReq.amountCharged)}
                  </span>
                  <span className="text-[10px] text-gray-500 block">Deducted from balance</span>
                </div>
              </div>

              {/* Center Info if present */}
              {selectedReq.searchData?.centerName && (
                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <div>
                      <span className="font-bold text-indigo-950 block text-xs">
                        Enrollment Center: {String(selectedReq.searchData.centerName)}
                      </span>
                      <span className="text-[11px] text-indigo-700 font-mono">
                        Center ID: {String(selectedReq.searchData.centerId || '--')}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-black text-indigo-900 text-xs">
                    Fee: {formatCurrency(Number(selectedReq.searchData.centerPrice) || selectedReq.amountCharged)}
                  </span>
                </div>
              )}

              {/* Submitted Form Information & Document Uploads */}
              <div className="pt-1">
                <span className="text-gray-800 font-bold block mb-1.5">Submitted Application Details:</span>
                <div className="bg-white rounded-xl border border-gray-200 p-3.5 space-y-2 text-xs">
                  {Object.entries(selectedReq.searchData || {}).map(([key, val]) => {
                    const strVal = String(val || '');
                    const isImage =
                      strVal.startsWith('data:image/') ||
                      (strVal.startsWith('http') && (strVal.includes('.png') || strVal.includes('.jpg') || strVal.includes('.jpeg')));

                    return (
                      <div
                        key={key}
                        className="flex flex-col sm:flex-row sm:items-start sm:justify-between py-1.5 border-b border-gray-50 last:border-0 gap-1"
                      >
                        <span className="text-gray-500 font-medium capitalize shrink-0 sm:w-1/3">
                          {key.replace(/([A-Z])/g, ' $1')}:
                        </span>
                        <div className="sm:w-2/3 text-right">
                          {isImage ? (
                            <div className="inline-flex items-center gap-2">
                              <img
                                src={strVal}
                                alt={key}
                                className="w-12 h-12 object-cover rounded-lg border border-gray-200 shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ title: key, src: strVal })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-[11px] font-bold text-gray-700 transition-colors"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Inspect Document</span>
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono font-bold text-gray-900 break-all text-[11px]">
                              {typeof val === 'object' ? JSON.stringify(val) : strVal}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Status Change Form */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">Update Request Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold focus:border-[#FF6B00] outline-none bg-white"
                >
                  <option value="PENDING">PENDING (Awaiting Review / In Queue)</option>
                  <option value="PROCESSING">PROCESSING (Under Execution / Submitted to Authority)</option>
                  <option value="COMPLETED">COMPLETED (Successfully Updated / Result Slip Issued)</option>
                  <option value="REJECTED">REJECTED (Declined by Authority or Registry)</option>
                  <option value="FAILED">FAILED (Technical / Document Invalidation)</option>
                </select>
              </div>

              {/* Processing Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Customer Status Remark / Processing Note
                </label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Application dispatched to registry. Turnaround time: 24-48 working hours."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:border-[#FF6B00] outline-none"
                />
              </div>

              {/* Optional Refund Checkbox if Rejected or Failed */}
              {(newStatus === 'REJECTED' || newStatus === 'FAILED') &&
                selectedReq.refundStatus !== 'REFUNDED' && (
                  <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs text-orange-950 font-bold select-none">
                      <input
                        type="checkbox"
                        checked={refundUser}
                        onChange={(e) => setRefundUser(e.target.checked)}
                        className="rounded text-[#FF6B00] focus:ring-[#FF6B00]"
                      />
                      <span>Refund full fee ({formatCurrency(selectedReq.amountCharged)}) to user wallet balance</span>
                    </label>
                  </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                disabled={updating}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleSaveStatus}
                disabled={updating}
                className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-orange-600 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Save Status</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Center Create/Edit Modal */}
      {centerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900">
                {editingCenter ? 'Edit BVN Enrollment Center' : 'Add New BVN Enrollment Center'}
              </h3>
              <button
                onClick={() => setCenterModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            {centerError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{centerError}</span>
              </div>
            )}
            {centerSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{centerSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveCenter} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Center Name</label>
                <input
                  type="text"
                  required
                  value={centerName}
                  onChange={(e) => setCenterName(e.target.value)}
                  placeholder="e.g. Abuja Central Enrollment Hub"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-semibold focus:border-orange-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Service Fee ({formatCurrency(centerPrice)})</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={100}
                    value={centerPrice}
                    onChange={(e) => setCenterPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-mono font-bold focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Status</label>
                  <select
                    value={centerStatus}
                    onChange={(e) => setCenterStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-bold focus:border-orange-500 outline-none bg-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Description / Center Notes</label>
                <textarea
                  rows={2}
                  value={centerDescription}
                  onChange={(e) => setCenterDescription(e.target.value)}
                  placeholder="e.g. Standard 24h turnaround, biometric sync support"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCenterModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={centerSaving}
                  className="flex-1 py-2.5 rounded-xl bg-[#121212] hover:bg-orange-600 text-white font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  {centerSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Center'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Inspection Zoom Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="font-bold text-gray-900 text-sm capitalize">{previewImage.title}</h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-gray-400 hover:text-gray-700 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="bg-black/5 rounded-2xl p-2 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={previewImage.src}
                alt={previewImage.title}
                className="max-w-full max-h-[65vh] object-contain rounded-xl"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewImage(null)}
                className="px-5 py-2 rounded-xl bg-gray-900 text-white font-bold text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
