import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { VerificationRequest, VerificationResult } from '../../types';
import { VerificationSlip } from '../../components/common/VerificationSlip';
import { formatCurrency } from '../../utils/currency';
import { preloadSlipTemplates } from '../../lib/pdfGenerator';
import { Search, ShieldCheck, Eye, Filter, ArrowLeft, RefreshCw, X } from 'lucide-react';

export const VerificationHistoryView: React.FC = () => {
  const [history, setHistory] = useState<VerificationRequest[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Selected verification for slip modal
  const [selectedReq, setSelectedReq] = useState<VerificationRequest | null>(null);
  const [selectedRes, setSelectedRes] = useState<VerificationResult | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.get('/verifications/my?limit=50');
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load verification history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    preloadSlipTemplates().catch(() => {});
    fetchHistory();
  }, []);

  const handleOpenSlip = async (req: VerificationRequest) => {
    setSelectedReq(req);
    // Instant display if result was already packaged on request
    if (req.result || req.resultData) {
      setSelectedRes({
        id: `vres_${req.id}`,
        requestId: req.id,
        userId: req.userId,
        serviceCode: req.serviceCode,
        serviceName: req.serviceName,
        reference: req.reference,
        returnedData: req.result || req.resultData,
        photoUrl: (req.result || req.resultData)?.photoUrl,
        providerName: req.serviceName || 'Identity Gateway',
        verifiedAt: req.createdAt,
        verifiedBy: req.userName || 'System'
      });
      setModalLoading(false);
      return;
    }

    setSelectedRes(null);
    setModalLoading(true);
    try {
      const res = await api.get(`/verifications/${req.id}`);
      setSelectedRes(res?.result || res || null);
    } catch (err) {
      console.warn('Could not fetch verification result details:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const filteredHistory = history.filter((v) => {
    const matchesSearch =
      v.reference.toLowerCase().includes(search.toLowerCase()) ||
      v.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      v.serviceCode.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            Verification History
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Browse past identity checks, review query outputs, and re-download official slips.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-gray-200">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by reference or service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-orange-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-gray-500">Status:</span>
          {['ALL', 'SUCCESS', 'PENDING', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                statusFilter === st
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400">Loading verification history...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-gray-600">No verification records found.</p>
            <p className="text-xs text-gray-400">Perform your first verification query to see entries here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-gray-200">
              <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase">
                <tr>
                  <th className="py-3.5 px-6">Service</th>
                  <th className="py-3.5 px-6">Reference</th>
                  <th className="py-3.5 px-6">Date & Time</th>
                  <th className="py-3.5 px-6">Fee Charged</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {filteredHistory.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-bold text-gray-950 block">{req.serviceName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{req.serviceCode}</span>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-orange-600">{req.reference}</td>
                    <td className="py-4 px-6 text-gray-600">
                      {new Date(req.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-gray-900">
                      {formatCurrency(req.amountCharged)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          req.status === 'SUCCESS' || req.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : req.status === 'FAILED' || req.status === 'REJECTED'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleOpenSlip(req)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] text-white hover:bg-orange-500 hover:text-black font-bold text-[11px] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Slip</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slip Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-transparent max-w-4xl w-full my-8">
            <button
              onClick={() => setSelectedReq(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 flex items-center gap-1 text-xs font-semibold"
            >
              <X className="w-5 h-5" />
              <span>Close View</span>
            </button>

            {modalLoading ? (
              <div className="bg-white rounded-3xl p-12 text-center text-sm font-semibold text-gray-500">
                Loading official slip...
              </div>
            ) : (
              <VerificationSlip
                request={selectedReq}
                result={selectedRes}
                onClose={() => setSelectedReq(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
