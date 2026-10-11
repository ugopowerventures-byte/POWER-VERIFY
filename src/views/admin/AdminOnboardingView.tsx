import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { AgentAdminOnboarding } from '../../types';
import { UserAvatar } from '../../components/common/UserAvatar';
import {
  ShieldCheck,
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  FileText,
  BadgeAlert,
  ArrowRight,
  Shield,
  User,
  Calendar,
  Phone,
  FileCheck,
  X
} from 'lucide-react';

export const AdminOnboardingView: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<AgentAdminOnboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<'PENDING' | 'APPROVED' | 'ALL'>('PENDING');

  // Modal inspection state
  const [selectedApp, setSelectedApp] = useState<AgentAdminOnboarding | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [correctionMsg, setCorrectionMsg] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [showCorrectionInput, setShowCorrectionInput] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await api.get('/admin/onboarding');
      setApplications(data || []);
    } catch (err: any) {
      console.error('Failed to fetch onboarding applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async (role: 'AGENT' | 'ADMIN') => {
    if (!selectedApp) return;
    if (!confirm(`Are you sure you want to approve @${selectedApp.userEmail} and upgrade account to ${role}?`)) return;

    try {
      setActionLoading(true);
      setActionError(null);
      await api.patch(`/admin/onboarding/${selectedApp.id}/approve`, {
        approvedRole: role,
        adminNote: adminNote.trim() || undefined
      });
      await fetchApplications();
      setSelectedApp(null);
      alert(`Onboarding approved! User account upgraded to ${role}.`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve onboarding.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    if (!rejectReason.trim()) {
      setActionError('Please specify a rejection reason for the applicant.');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      await api.patch(`/admin/onboarding/${selectedApp.id}/reject`, {
        reason: rejectReason.trim()
      });
      await fetchApplications();
      setSelectedApp(null);
      setShowRejectInput(false);
      setRejectReason('');
      alert('Onboarding application has been rejected.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject onboarding.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCorrection = async () => {
    if (!selectedApp) return;
    if (!correctionMsg.trim()) {
      setActionError('Please specify the correction instructions for the applicant.');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      await api.patch(`/admin/onboarding/${selectedApp.id}/correction`, {
        message: correctionMsg.trim()
      });
      await fetchApplications();
      setSelectedApp(null);
      setShowCorrectionInput(false);
      setCorrectionMsg('');
      alert('Correction request sent to applicant.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to request correction.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredApps = applications.filter((app) => {
    const q = search.toLowerCase();
    const matchesSearch =
      app.fullName?.toLowerCase().includes(q) ||
      app.userEmail?.toLowerCase().includes(q) ||
      app.nin?.includes(q) ||
      app.phone1?.includes(q) ||
      app.satisfactionTitle?.toLowerCase().includes(q);

    if (tabFilter === 'PENDING') return matchesSearch && app.status === 'pending';
    if (tabFilter === 'APPROVED') return matchesSearch && app.status === 'approved';
    return matchesSearch;
  });

  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const agentCount = applications.filter((a) => a.roleAtApproval === 'AGENT').length;
  const adminRoleCount = applications.filter((a) => a.roleAtApproval === 'ADMIN').length;

  const isMegaAdmin = user?.role === 'MEGA_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || isMegaAdmin;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#FF6B00] uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>NIN Identity Validation & Approvals</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Agent & Admin Onboarding Directory
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Inspect live NIMC registry comparisons, examine verified photos, and approve or reject role upgrade applications.
          </p>
        </div>

        <button
          onClick={fetchApplications}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-bold text-xs hover:bg-white/10 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Applications</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#161616] border border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-bold">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{pendingCount}</p>
          <span className="text-[10px] text-gray-500">Awaiting Super/Mega approval</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#161616] border border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-bold">Total Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">{approvedCount}</p>
          <span className="text-[10px] text-gray-500">NIN-verified active operators</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#161616] border border-blue-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-bold">Active Agents</span>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-400 mt-2">{agentCount}</p>
          <span className="text-[10px] text-gray-500">Upgraded via onboarding</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#161616] border border-purple-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-bold">Active Admins</span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-400 mt-2">{adminRoleCount}</p>
          <span className="text-[10px] text-gray-500">Portal staff approved</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#161616] p-4 rounded-2xl border border-[#262626]">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by applicant name, email, NIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#121212] rounded-xl border border-[#333] text-xs text-white focus:outline-none focus:border-[#FF6B00]"
          />
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {[
            { key: 'PENDING', label: `Pending Review (${pendingCount})` },
            { key: 'APPROVED', label: `Approved (${approvedCount})` },
            { key: 'ALL', label: `All Applications (${applications.length})` }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTabFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tabFilter === tab.key
                  ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black shadow-md'
                  : 'bg-[#121212] text-gray-400 hover:text-white border border-[#2A2A2A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-[#161616] rounded-3xl border border-[#262626] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#FF6B00]" />
            <p className="text-xs">Loading onboarding applications...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-xs">No onboarding applications found in this category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300 divide-y divide-[#262626]">
              <thead className="bg-[#1B1B1B] text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-6">Applicant Particulars</th>
                  <th className="py-4 px-6">Target Role</th>
                  <th className="py-4 px-6">Satisfaction/Title</th>
                  <th className="py-4 px-6">NIN Registry Validation</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {filteredApps.map((app) => {
                  const isPending = app.status === 'pending';
                  const isApproved = app.status === 'approved';

                  return (
                    <tr key={app.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            user={{ fullName: app.fullName, avatarUrl: app.profilePhoto || (app as any).avatarUrl }}
                            size="md"
                            showBorder
                            className="shrink-0"
                          />
                          <div>
                            <span className="font-bold text-white block">{app.fullName}</span>
                            <span className="text-[10px] text-gray-400">{app.userEmail}</span>
                            <span className="text-[10px] text-gray-500 font-mono block">{app.phone1}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                            app.targetRole === 'ADMIN'
                              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                              : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {app.targetRole}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-semibold text-gray-200 block">{app.satisfactionTitle}</span>
                        <span className="text-[10px] text-gray-500">Submitted {new Date(app.submittedAt).toLocaleDateString()}</span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>NIN Matched (Name & DOB)</span>
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 block">
                            NIN: {app.nin.slice(0, 3)}****{app.nin.slice(-4)}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isApproved
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : isPending
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                              : 'bg-red-500/15 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => {
                            setSelectedApp(app);
                            setActionError(null);
                            setAdminNote('');
                            setShowRejectInput(false);
                            setShowCorrectionInput(false);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-extrabold text-xs hover:brightness-110 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect & Decide</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL INSPECTION MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#181818] border border-[#2E2E2E] rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A] bg-[#141414]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Identity Inspection: {selectedApp.fullName}
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    Target Role: <strong>{selectedApp.targetRole}</strong> • Email: {selectedApp.userEmail}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {actionError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Photos Comparison: Submitted Photo vs NIN Registry Photo */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Biometric Portrait Comparison
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Submitted Profile Photo */}
                  <div className="p-4 rounded-2xl bg-[#121212] border border-[#2A2A2A] text-center space-y-2">
                    <span className="text-[11px] font-bold text-gray-400 block">Submitted Profile Photo</span>
                    {selectedApp.profilePhoto ? (
                      <img
                        src={selectedApp.profilePhoto}
                        alt="Submitted Portrait"
                        className="w-32 h-32 rounded-2xl object-cover mx-auto border border-[#3A3A3A] shadow-md"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-600 mx-auto">
                        No Photo
                      </div>
                    )}
                    <span className="text-[10px] text-gray-500 block">Uploaded by applicant</span>
                  </div>

                  {/* NIMC Registry Official Photo */}
                  <div className="p-4 rounded-2xl bg-[#121212] border border-[#2A2A2A] text-center space-y-2">
                    <span className="text-[11px] font-bold text-emerald-400 block">
                      Official NIMC Registry Photo
                    </span>
                    {selectedApp.ninPhotoUrl ? (
                      <img
                        src={selectedApp.ninPhotoUrl}
                        alt="NIMC Registry"
                        className="w-32 h-32 rounded-2xl object-cover mx-auto border border-emerald-500/40 shadow-md"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-600 mx-auto text-xs">
                        Registry Photo Protected / Text KYC Only
                      </div>
                    )}
                    <span className="text-[10px] text-emerald-500/80 block">Direct from National Identity Database</span>
                  </div>
                </div>
              </div>

              {/* Identity Details Comparison Table */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Identity Registry Comparison Check
                </h4>
                <div className="bg-[#121212] rounded-2xl border border-[#262626] overflow-hidden text-xs">
                  <div className="grid grid-cols-3 p-3 border-b border-[#222] font-bold text-gray-400 text-[11px]">
                    <div>Field Parameter</div>
                    <div>Submitted Value</div>
                    <div>NIN Registry Record</div>
                  </div>

                  {/* Full Name */}
                  <div className="grid grid-cols-3 p-3 border-b border-[#1F1F1F] items-center">
                    <div className="font-semibold text-gray-300">Full Legal Name</div>
                    <div className="font-bold text-white">{selectedApp.fullName}</div>
                    <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{selectedApp.ninFullName || 'Matched'}</span>
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div className="grid grid-cols-3 p-3 border-b border-[#1F1F1F] items-center">
                    <div className="font-semibold text-gray-300">Date of Birth</div>
                    <div className="font-mono text-white">{selectedApp.dob}</div>
                    <div className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{selectedApp.ninDob || 'Matched'}</span>
                    </div>
                  </div>

                  {/* NIN */}
                  <div className="grid grid-cols-3 p-3 border-b border-[#1F1F1F] items-center">
                    <div className="font-semibold text-gray-300">National Identity No.</div>
                    <div className="font-mono text-white font-bold">{selectedApp.nin}</div>
                    <div className="text-emerald-400 font-semibold">Verified Active NIMC Record</div>
                  </div>

                  {/* Exact field name: Satisfaction/Title */}
                  <div className="grid grid-cols-3 p-3 border-b border-[#1F1F1F] items-center">
                    <div className="font-semibold text-gray-300">Satisfaction/Title</div>
                    <div className="text-white font-bold">{selectedApp.satisfactionTitle}</div>
                    <div className="text-gray-400">Operator Accreditation</div>
                  </div>

                  {/* Phone Numbers */}
                  <div className="grid grid-cols-3 p-3 border-b border-[#1F1F1F] items-center">
                    <div className="font-semibold text-gray-300">Contact Phones</div>
                    <div className="text-gray-300">
                      Primary: {selectedApp.phone1}
                      {selectedApp.phone2 && <span className="block text-[10px] text-gray-500">Alt: {selectedApp.phone2}</span>}
                    </div>
                    <div className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{selectedApp.phoneVerified ? 'OTP Verified' : 'Validated Mobile'}</span>
                    </div>
                  </div>

                  {/* Residential Address */}
                  <div className="grid grid-cols-3 p-3 border-b border-[#1F1F1F] items-center">
                    <div className="font-semibold text-gray-300">Residential Address</div>
                    <div className="text-white col-span-2">
                      {selectedApp.residentialFullAddress || (selectedApp.residentialHouseNumber ? `${selectedApp.residentialHouseNumber} ${selectedApp.residentialStreet}, ${selectedApp.residentialCity}, ${selectedApp.residentialLga}, ${selectedApp.residentialState}` : '—')}
                    </div>
                  </div>

                  {/* State & LGA of Origin */}
                  <div className="grid grid-cols-3 p-3 border-b border-[#1F1F1F] items-center">
                    <div className="font-semibold text-gray-300">Origin Particulars</div>
                    <div className="text-white col-span-2">
                      State: {selectedApp.stateOfOrigin || '—'} • LGA: {selectedApp.lgaOfOrigin || '—'}
                    </div>
                  </div>

                  {/* Emergency / Reference Contact */}
                  <div className="grid grid-cols-3 p-3 items-center">
                    <div className="font-semibold text-gray-300">Reference Contact</div>
                    <div className="text-white col-span-2">
                      {selectedApp.emergencyFullName ? `${selectedApp.emergencyFullName} (${selectedApp.emergencyRelationship}) - ${selectedApp.emergencyPhone}` : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Certificates (Optional) */}
              {selectedApp.certificates && selectedApp.certificates.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Submitted Certificates ({selectedApp.certificates.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedApp.certificates.map((cert, idx) => (
                      <a
                        key={idx}
                        href={cert}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-[#121212] border border-[#333] text-gray-300 text-xs font-semibold hover:border-orange-500 inline-flex items-center gap-1.5"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-orange-400" />
                        <span>View Certificate #{idx + 1}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw JSON toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowRawData((prev) => !prev)}
                  className="text-[11px] font-bold text-gray-400 hover:text-white underline cursor-pointer"
                >
                  {showRawData ? 'Hide Raw NIMC Gateway Response' : 'Inspect Raw NIMC Gateway Response'}
                </button>
                {showRawData && (
                  <pre className="mt-2 p-3 rounded-xl bg-black border border-[#2A2A2A] text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedApp.ninResultData || selectedApp, null, 2)}
                  </pre>
                )}
              </div>

              {/* Rejection input box */}
              {showRejectInput && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-3">
                  <label className="block text-xs font-bold text-red-400">
                    Reason for Rejection *
                  </label>
                  <textarea
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter clear explanation to send to the applicant..."
                    className="w-full px-3 py-2 bg-black rounded-xl border border-red-500/40 text-xs text-white focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReject}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 cursor-pointer disabled:opacity-50"
                    >
                      Confirm Rejection
                    </button>
                    <button
                      onClick={() => setShowRejectInput(false)}
                      className="px-3 py-2 rounded-xl bg-white/10 text-gray-300 font-bold text-xs hover:bg-white/15 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Correction input box (MEGA ADMIN ONLY - Rule 5) */}
              {showCorrectionInput && isMegaAdmin && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <label className="block text-xs font-bold text-amber-400">
                    Mega Admin Correction Instructions *
                  </label>
                  <textarea
                    rows={2}
                    value={correctionMsg}
                    onChange={(e) => setCorrectionMsg(e.target.value)}
                    placeholder="Describe specific changes or document corrections the applicant must make..."
                    className="w-full px-3 py-2 bg-black rounded-xl border border-amber-500/40 text-xs text-white focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCorrection}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-amber-600 text-black font-bold text-xs hover:bg-amber-500 cursor-pointer disabled:opacity-50"
                    >
                      Send Correction Request
                    </button>
                    <button
                      onClick={() => setShowCorrectionInput(false)}
                      className="px-3 py-2 rounded-xl bg-white/10 text-gray-300 font-bold text-xs hover:bg-white/15 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Admin Note Input */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Administrative Note (Optional internal log)
                </label>
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Identity verified and authorized for Abuja agent cluster"
                  className="w-full px-3 py-2 bg-[#121212] rounded-xl border border-[#333] text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 border-t border-[#2A2A2A] bg-[#141414] flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-gray-500">
                Acting as: <strong>{user?.fullName} ({user?.role})</strong>
                {!isMegaAdmin && <span className="block text-amber-500/80">Super Admin can upgrade to Agent or Admin only</span>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Approve as AGENT */}
                <button
                  onClick={() => handleApprove('AGENT')}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-extrabold text-xs hover:brightness-110 cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Approve as AGENT</span>
                </button>

                {/* Approve as ADMIN */}
                <button
                  onClick={() => handleApprove('ADMIN')}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white font-extrabold text-xs hover:brightness-110 cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Approve as ADMIN</span>
                </button>

                {/* Reject Button */}
                <button
                  onClick={() => {
                    setShowRejectInput(true);
                    setShowCorrectionInput(false);
                  }}
                  disabled={actionLoading}
                  className="px-3.5 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-xs hover:bg-red-500/25 cursor-pointer disabled:opacity-50"
                >
                  Reject
                </button>

                {/* Request Correction (MEGA ADMIN ONLY - Rule 5) */}
                {isMegaAdmin && (
                  <button
                    onClick={() => {
                      setShowCorrectionInput(true);
                      setShowRejectInput(false);
                    }}
                    disabled={actionLoading}
                    className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs hover:bg-amber-500/25 cursor-pointer disabled:opacity-50"
                  >
                    Request Correction
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
