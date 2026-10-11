import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { FundingRequest, User } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { UserAvatar } from '../../components/common/UserAvatar';
import { Wallet, CheckCircle2, XCircle, Eye, RefreshCw, AlertCircle, DollarSign, X } from 'lucide-react';

export const AdminWalletsView: React.FC = () => {
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState<FundingRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Manual direct wallet adjustment modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState<number>(1000);
  const [adjustType, setAdjustType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustReason, setAdjustReason] = useState('');

  const fetchFundingRequests = async () => {
    try {
      setLoading(true);
      const data = await api.get('/admin/funding-requests');
      setRequests(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFundingRequests();
  }, []);

  const handleApprove = async (reqId: string) => {
    if (!confirm('Approve this payment and credit user wallet?')) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/funding-requests/${reqId}/approve`, {
        adminNote: adminNote || 'Approved by Administrator'
      });
      alert('Payment approved and user wallet credited successfully!');
      setActiveReceipt(null);
      setAdminNote('');
      await fetchFundingRequests();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reqId: string) => {
    const reason = prompt('Please enter reason for rejecting this payment:');
    if (!reason) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/funding-requests/${reqId}/reject`, {
        adminNote: reason
      });
      alert('Funding request rejected.');
      setActiveReceipt(null);
      await fetchFundingRequests();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openAdjustModal = async () => {
    try {
      const uList = await api.get('/admin/users');
      setUsers(uList || []);
      if (uList && uList.length > 0) setTargetUserId(uList[0].id);
      setAdjustModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !adjustReason) return;
    try {
      await api.post('/admin/wallet/adjust', {
        userId: targetUserId,
        amount: adjustAmount,
        type: adjustType,
        reason: adjustReason
      });
      alert('Wallet balance adjusted successfully!');
      setAdjustModalOpen(false);
      setAdjustReason('');
    } catch (err: any) {
      alert(err.message || 'Failed to adjust wallet');
    }
  };

  const filtered = requests.filter(
    (r) => statusFilter === 'ALL' || r.status === statusFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Wallet Deposits & Approvals
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Audit manual bank transfer receipts and credit customer wallets with one-click verification.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={openAdjustModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
          >
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span>Manual Balance Adjustment</span>
          </button>

          <button
            onClick={fetchFundingRequests}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-bold text-xs hover:bg-white/10"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === st
                ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black'
                : 'bg-[#181818] text-gray-400 hover:text-white border border-[#282828]'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <div className="bg-[#161616] rounded-3xl border border-[#262626] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300 divide-y divide-[#262626]">
            <thead className="bg-[#1B1B1B] text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">User</th>
                <th className="py-4 px-6">Amount</th>
                <th className="py-4 px-6">Method / Ref</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No funding requests matching status: {statusFilter}
                  </td>
                </tr>
              ) : (
                filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          user={{ fullName: req.userName, email: req.userEmail }}
                          size="sm"
                          showBorder
                          className="shrink-0"
                        />
                        <div>
                          <span className="font-bold text-white block">{req.userName}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{req.userEmail}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-amber-400 text-sm">
                      {formatCurrency(req.amount)}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-gray-300 block">{req.method}</span>
                      <span className="font-mono text-[10px] text-gray-500">{req.reference}</span>
                    </td>
                    <td className="py-4 px-6 text-gray-400">
                      {new Date(req.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : req.status === 'REJECTED'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        {req.receiptUrl && (
                          <button
                            onClick={() => setActiveReceipt(req)}
                            className="px-2.5 py-1 rounded bg-white/10 text-white hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                        )}
                        {req.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(req.id)}
                              className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 font-bold text-[11px]"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              className="px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold text-[11px]"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Inspection Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#2E2E2E] rounded-3xl max-w-lg w-full p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#282828]">
              <div>
                <h3 className="font-bold text-base">Payment Receipt Review</h3>
                <p className="text-xs text-gray-400">
                  User: {activeReceipt.userName} | Amount: {formatCurrency(activeReceipt.amount)}
                </p>
              </div>
              <button onClick={() => setActiveReceipt(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeReceipt.receiptUrl ? (
              <div className="max-h-80 overflow-y-auto rounded-xl border border-[#333] p-2 bg-[#121212]">
                <img
                  src={activeReceipt.receiptUrl}
                  alt="Customer Payment Receipt"
                  className="w-full object-contain rounded-lg mx-auto"
                />
              </div>
            ) : (
              <p className="text-xs text-gray-400">No receipt image attached.</p>
            )}

            {activeReceipt.status === 'PENDING' && (
              <div className="space-y-3 pt-2">
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Optional admin remark..."
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReject(activeReceipt.id)}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 font-bold text-xs"
                  >
                    Reject Payment
                  </button>
                  <button
                    onClick={() => handleApprove(activeReceipt.id)}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 font-bold text-xs"
                  >
                    Approve & Credit {formatCurrency(activeReceipt.amount)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Direct Wallet Adjustment Modal */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#2E2E2E] rounded-3xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#282828]">
              <h3 className="font-bold text-base">Direct Wallet Adjustment</h3>
              <button onClick={() => setAdjustModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                  Select User Account
                </label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} (@{u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                    Action Type
                  </label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs"
                  >
                    <option value="CREDIT">CREDIT (+)</option>
                    <option value="DEBIT">DEBIT (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-amber-400 mb-1">
                    Amount (NGN)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs font-mono font-bold text-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                  Audit Reason / Justification
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Promo credit, Manual payment settlement"
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-extrabold text-xs"
                >
                  Execute Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
