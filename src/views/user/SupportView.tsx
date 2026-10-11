import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { SupportTicket } from '../../types';
import { Headphones, Plus, MessageSquare, Send, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export const SupportView: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);

  // New ticket form
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'VERIFICATION' | 'WALLET' | 'ACCOUNT' | 'TECHNICAL' | 'OTHER'>('WALLET');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await api.get('/support/tickets');
      setTickets(data || []);
      if (selectedTicket) {
        const updated = (data || []).find((t: SupportTicket) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await api.post('/support/tickets', {
        subject,
        category,
        message
      });
      setNewModalOpen(false);
      setSubject('');
      setMessage('');
      await fetchTickets();
      setSelectedTicket(created);
    } catch (err: any) {
      alert(err.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    try {
      await api.post(`/support/tickets/${selectedTicket.id}/messages`, {
        message: replyText.trim()
      });
      setReplyText('');
      await fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            Support Desk
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Resolve verification issues, report payment problems, or request custom features.
          </p>
        </div>

        <button
          onClick={() => setNewModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#121212] text-white hover:bg-orange-500 hover:text-black font-bold text-xs transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Ticket</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="bg-white rounded-3xl border border-gray-200 p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">
            My Open Tickets ({tickets.length})
          </h3>

          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {tickets.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                No support tickets found. Click "New Ticket" to begin.
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-3 rounded-2xl cursor-pointer transition-colors space-y-1 ${
                      isSelected ? 'bg-orange-500/10 border border-orange-500/30' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-gray-400 font-bold">
                        #{t.ticketNumber}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-gray-900 truncate">{t.subject}</h4>
                    <p className="text-[11px] text-gray-500 line-clamp-1">
                      {t.messages[t.messages.length - 1]?.message || 'No messages'}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ticket Message Thread */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between min-h-[450px]">
          {selectedTicket ? (
            <div className="flex flex-col h-full justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                  <div>
                    <span className="font-mono text-xs text-orange-600 font-bold">
                      #{selectedTicket.ticketNumber}
                    </span>
                    <h3 className="font-bold text-base text-gray-950 mt-0.5">
                      {selectedTicket.subject}
                    </h3>
                    <span className="text-[10px] text-gray-400">
                      Category: {selectedTicket.category} | Created:{' '}
                      {new Date(selectedTicket.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full">
                    {selectedTicket.status}
                  </span>
                </div>

                {/* Messages */}
                <div className="py-4 space-y-3 max-h-80 overflow-y-auto pr-2">
                  {selectedTicket.messages.map((m) => {
                    const isStaff = m.senderRole !== 'USER';
                    return (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-2xl text-xs max-w-lg space-y-1 ${
                          isStaff
                            ? 'bg-amber-50 text-amber-950 border border-amber-200/60 mr-auto'
                            : 'bg-gray-100 text-gray-900 ml-auto'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                          <span>{m.senderName} {isStaff && '(Official Desk)'}</span>
                          <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs leading-relaxed">{m.message}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendReply} className="flex gap-2 pt-3 border-t border-gray-100">
                <input
                  type="text"
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your message to support..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-[#121212] text-white hover:bg-orange-500 hover:text-black font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <Headphones className="w-12 h-12 text-gray-300" />
              <h4 className="font-bold text-gray-700 text-sm">Select a Ticket to View Messages</h4>
              <p className="text-xs text-gray-400 max-w-xs">
                Choose an existing conversation from the list or open a new inquiry.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-gray-900">Open New Support Ticket</h3>

            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of inquiry..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-orange-500"
                >
                  <option value="WALLET">Wallet & Funding</option>
                  <option value="VERIFICATION">Verification Issue</option>
                  <option value="ACCOUNT">Account Management</option>
                  <option value="TECHNICAL">Technical & API</option>
                  <option value="OTHER">Other Questions</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide all relevant details (references, service name)..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#121212] text-white font-bold text-xs hover:bg-orange-500 hover:text-black"
                >
                  {submitting ? 'Submitting...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
