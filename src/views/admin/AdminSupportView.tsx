import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { SupportTicket } from '../../types';
import {
  Headphones,
  Send,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  Clock,
  User,
  Search,
  Filter,
  ArrowLeft,
  Loader2,
  Mail,
  Hash
} from 'lucide-react';

export const AdminSupportView: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      // Try /admin/support-tickets or fallback to /admin/support
      let data: SupportTicket[] = [];
      try {
        data = await api.get('/admin/support-tickets');
      } catch (e) {
        data = await api.get('/admin/support');
      }

      const safeData = Array.isArray(data) ? data : [];
      setTickets(safeData);

      if (selectedTicket) {
        const updated = safeData.find((t: SupportTicket) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err: any) {
      console.error('Support tickets fetch failed:', err);
      setError(err?.message || 'Unable to retrieve support tickets from the server. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim() || submittingReply) return;

    try {
      setSubmittingReply(true);
      setActionError(null);
      setActionSuccess(null);

      await api.post(`/admin/support-tickets/${selectedTicket.id}/reply`, {
        message: replyText.trim()
      });

      setReplyText('');
      setActionSuccess('Response dispatched to customer successfully.');
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchTickets();
    } catch (err: any) {
      console.error('Reply failed:', err);
      setActionError(err.message || 'Failed to dispatch reply. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket || updatingStatus) return;
    try {
      setUpdatingStatus(true);
      setActionError(null);
      setActionSuccess(null);

      await api.patch(`/admin/support-tickets/${selectedTicket.id}/status`, { status });
      setActionSuccess(`Ticket status updated to ${status}.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchTickets();
    } catch (err: any) {
      console.error('Status update failed:', err);
      setActionError(err.message || 'Failed to update ticket status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Filter and search computation
  const filteredTickets = tickets.filter((t) => {
    if (!t) return false;
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (t.ticketNumber && t.ticketNumber.toLowerCase().includes(q)) ||
      (t.subject && t.subject.toLowerCase().includes(q)) ||
      (t.userName && t.userName.toLowerCase().includes(q)) ||
      (t.userEmail && t.userEmail.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <Headphones className="w-6 h-6" />
            </span>
            <span>Support Tickets</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Review customer inquiries, send official responses, and manage ticket lifecycles.
          </p>
        </div>

        <button
          onClick={fetchTickets}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-bold text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Action alerts */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && tickets.length === 0 && (
        <div className="bg-[#161616] rounded-3xl border border-[#262626] p-12 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-white">Loading Support Queue...</h3>
            <p className="text-xs text-gray-400 mt-1">Retrieving customer tickets and messages from the server.</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-[#161616] rounded-3xl border border-red-500/30 p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Failed to Load Support Tickets</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">{error}</p>
          </div>
          <button
            onClick={fetchTickets}
            className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-xs inline-flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Normal Main Interface */}
      {(!loading || tickets.length > 0) && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Ticket list panel */}
          <div className={`lg:col-span-5 bg-[#161616] rounded-3xl border border-[#262626] p-4 flex flex-col space-y-3 ${selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
            {/* Search and Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search ticket #, subject, customer..."
                  className="w-full pl-9 pr-4 py-2 bg-[#121212] border border-[#282828] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Status pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors ${
                      statusFilter === st
                        ? 'bg-orange-500 text-black'
                        : 'bg-[#1f1f1f] text-gray-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-2 pt-1 border-t border-[#262626]">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Inquiries ({filteredTickets.length})
              </span>
              <span className="text-[10px] text-gray-500">
                {tickets.filter((t) => t.status === 'OPEN').length} Open
              </span>
            </div>

            {/* List */}
            <div className="divide-y divide-[#262626] max-h-[560px] overflow-y-auto space-y-1 pr-1">
              {filteredTickets.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <MessageSquare className="w-8 h-8 text-gray-600 mx-auto" />
                  <p className="text-xs text-gray-400 font-medium">
                    {searchTerm || statusFilter !== 'ALL'
                      ? 'No tickets match the selected filters.'
                      : 'No customer support tickets in queue.'}
                  </p>
                </div>
              ) : (
                filteredTickets.map((t) => {
                  const isSelected = selectedTicket?.id === t.id;
                  const messageCount = Array.isArray(t.messages) ? t.messages.length : 0;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={`p-3.5 rounded-2xl cursor-pointer transition-colors space-y-2 ${
                        isSelected
                          ? 'bg-orange-500/15 border border-orange-500/40 text-white'
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] text-orange-400 font-bold flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {t.ticketNumber || t.id.substring(0, 8)}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            t.status === 'RESOLVED'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : t.status === 'IN_PROGRESS'
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : t.status === 'OPEN'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-white/10 text-gray-300'
                          }`}
                        >
                          {t.status || 'OPEN'}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-white truncate">{t.subject || 'Support Ticket'}</h4>

                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span className="truncate max-w-[150px]">{t.userName || t.userEmail || 'Customer'}</span>
                        <span>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                        <span>{messageCount} {messageCount === 1 ? 'message' : 'messages'}</span>
                        <span className="capitalize">{t.category ? t.category.toLowerCase() : 'General'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Conversation details view */}
          <div className={`lg:col-span-7 bg-[#161616] rounded-3xl border border-[#262626] p-6 flex flex-col justify-between min-h-[500px] ${!selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
            {selectedTicket ? (
              <div className="flex flex-col h-full justify-between space-y-4">
                {/* Header */}
                <div>
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="lg:hidden flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-3"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Ticket Queue</span>
                  </button>

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-[#282828] gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-orange-400 font-bold">
                          #{selectedTicket.ticketNumber || selectedTicket.id.substring(0, 8)}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-xs text-gray-300 font-medium">
                          {selectedTicket.userName}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          ({selectedTicket.userEmail})
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-white mt-1">
                        {selectedTicket.subject}
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Category: <strong className="text-gray-200">{selectedTicket.category || 'General Support'}</strong> • Created: {new Date(selectedTicket.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400 font-bold">Status:</span>
                      <select
                        value={selectedTicket.status || 'OPEN'}
                        disabled={updatingStatus}
                        onChange={(e) => handleUpdateStatus(e.target.value)}
                        className="px-3 py-1.5 bg-[#121212] border border-[#333] rounded-xl text-xs font-bold text-amber-400 focus:outline-none focus:border-orange-500"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </div>
                  </div>

                  {/* Messages Feed */}
                  <div className="py-4 space-y-3 max-h-[380px] overflow-y-auto pr-2">
                    {(!selectedTicket.messages || selectedTicket.messages.length === 0) ? (
                      <div className="py-8 text-center text-xs text-gray-500">
                        No messages recorded on this ticket yet.
                      </div>
                    ) : (
                      (selectedTicket.messages || []).map((m) => {
                        const isStaff = m.senderRole !== 'USER';
                        return (
                          <div
                            key={m.id || Math.random().toString()}
                            className={`p-3.5 rounded-2xl text-xs max-w-lg space-y-1.5 ${
                              isStaff
                                ? 'bg-orange-500/15 text-orange-200 border border-orange-500/30 ml-auto'
                                : 'bg-[#1E1E1E] text-gray-200 mr-auto border border-[#333]'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold text-gray-400">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {m.senderName || (isStaff ? 'Operations Staff' : 'Customer')}
                                {isStaff && <span className="text-orange-400 font-bold">(Staff)</span>}
                              </span>
                              <span>
                                {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.message}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="pt-3 border-t border-[#282828] space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={replyText}
                      disabled={submittingReply}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type official reply to customer..."
                      className="flex-1 px-4 py-2.5 bg-[#121212] border border-[#333] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={submittingReply || !replyText.trim()}
                      className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-bold text-xs flex items-center gap-2 transition-colors shrink-0"
                    >
                      {submittingReply ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Send Response</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    The customer will receive an immediate in-app notification when you dispatch a response.
                  </p>
                </form>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-gray-500">
                <div className="w-14 h-14 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
                  <Headphones className="w-7 h-7 text-orange-400" />
                </div>
                <h4 className="font-bold text-white text-sm">Select Ticket from Queue</h4>
                <p className="text-xs max-w-xs">
                  Choose a ticket from the left panel to review inquiry particulars and dispatch official resolutions.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
