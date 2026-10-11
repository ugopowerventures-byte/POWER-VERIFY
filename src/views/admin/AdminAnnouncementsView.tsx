import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { Announcement } from '../../types';
import { Megaphone, Plus, Trash2, CheckCircle2, AlertTriangle, Info, BellRing } from 'lucide-react';

export const AdminAnnouncementsView: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'INFORMATION' | 'WARNING' | 'SUCCESS' | 'MAINTENANCE'>('INFORMATION');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await api.get('/admin/announcements');
      setAnnouncements(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admin/announcements', {
        title,
        message,
        type,
        isActive: true
      });
      setTitle('');
      setMessage('');
      await fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await api.patch(`/admin/announcements/${id}/toggle`, { isActive: !current });
      await fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle announcement');
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    if (!confirm('Are you sure you want to permanently delete this announcement?')) return;
    try {
      setDeletingId(id);
      await api.delete(`/admin/announcements/${id}`);
      await fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to delete announcement');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Platform Broadcasts & Announcements
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Broadcast operational notices, service updates, and urgent gateway advisories to all logged-in agents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create form */}
        <div className="bg-[#161616] p-6 rounded-3xl border border-[#262626] space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-white text-base">New Announcement</h3>
          </div>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. NIMC API Gateway Maintenance"
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
              >
                <option value="INFORMATION">INFORMATION</option>
                <option value="WARNING">WARNING</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="SUCCESS">SUCCESS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Message</label>
              <textarea
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message body shown to agents..."
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-extrabold text-xs hover:brightness-110 shadow-md"
            >
              {submitting ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </form>
        </div>

        {/* Existing announcements */}
        <div className="md:col-span-2 bg-[#161616] p-6 rounded-3xl border border-[#262626] space-y-4">
          <h3 className="font-bold text-white text-base">Active Broadcasts</h3>

          <div className="divide-y divide-[#262626]">
            {announcements.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500">No announcements published.</p>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          a.type === 'WARNING'
                            ? 'bg-amber-500/20 text-amber-400'
                            : a.type === 'MAINTENANCE'
                            ? 'bg-red-500/20 text-red-400'
                            : a.type === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {a.type}
                      </span>
                      <h4 className="font-bold text-white text-sm">{a.title}</h4>
                      {!a.isActive && (
                        <span className="text-[10px] text-gray-500 font-mono">[INACTIVE]</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{a.message}</p>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(a.id, a.isActive)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        a.isActive
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      {a.isActive ? 'Active' : 'Muted'}
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={deletingId === a.id}
                      className={`p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors ${
                        deletingId === a.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      title="Delete Announcement"
                    >
                      <Trash2 className={`w-4 h-4 ${deletingId === a.id ? 'animate-pulse' : ''}`} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
