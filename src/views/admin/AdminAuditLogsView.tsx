import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { AuditLog } from '../../types';
import { ShieldCheck, Search, RefreshCw } from 'lucide-react';

export const AdminAuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.get('/admin/audit-logs');
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.actorName && l.actorName.toLowerCase().includes(search.toLowerCase())) ||
      (l.details && l.details.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Security & Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Immutable platform record of administrative actions, authentication attempts, and ledger transactions.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-bold text-xs hover:bg-white/10"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="bg-[#161616] p-4 rounded-2xl border border-[#262626]">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search audit logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#121212] rounded-xl border border-[#333] text-xs text-white focus:outline-none focus:border-[#FF6B00]"
          />
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
        </div>
      </div>

      <div className="bg-[#161616] rounded-3xl border border-[#262626] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300 divide-y divide-[#262626]">
            <thead className="bg-[#1B1B1B] text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Action</th>
                <th className="py-4 px-6">Actor</th>
                <th className="py-4 px-6">Details</th>
                <th className="py-4 px-6 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222] font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500 font-sans text-xs">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 text-gray-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-amber-400">{log.action}</span>
                    </td>
                    <td className="py-4 px-6 text-white font-sans font-bold">
                      {log.actorName || 'SYSTEM'} ({log.actorRole || 'SYSTEM'})
                    </td>
                    <td className="py-4 px-6 text-gray-400 max-w-sm truncate">
                      {log.details || 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-right text-gray-500">{log.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
