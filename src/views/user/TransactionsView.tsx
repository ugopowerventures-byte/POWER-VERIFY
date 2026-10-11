import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { WalletTransaction } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { Search, ReceiptText, ArrowDownLeft, ArrowUpRight, RefreshCw, Filter } from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await api.get('/wallet/transactions?limit=100');
      if (Array.isArray(data)) {
        setTransactions(data);
      } else if (data && Array.isArray((data as any).transactions)) {
        setTransactions((data as any).transactions);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const filteredTransactions = safeTransactions.filter((t) => {
    const matchesSearch =
      (t.reference || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            Transaction Ledger
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Complete, immutable audit trail of your wallet deposits, charges, and automated refunds.
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-gray-200">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by reference or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-orange-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {['ALL', 'FUNDING', 'VERIFICATION', 'REFUND', 'ADJUSTMENT'].map((tp) => (
            <button
              key={tp}
              onClick={() => setTypeFilter(tp)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                typeFilter === tp
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tp}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400">Loading ledger data...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ReceiptText className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-gray-600">No transactions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-gray-200">
              <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase">
                <tr>
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-6">Reference</th>
                  <th className="py-3.5 px-6">Type</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6 text-right">Amount</th>
                  <th className="py-3.5 px-6 text-right">Balance After</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {filteredTransactions.map((tx) => {
                  const isCredit = tx.type === 'FUNDING' || tx.type === 'REFUND';
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 max-w-sm">
                        <div className="font-bold text-gray-950 truncate">{tx.description}</div>
                        {tx.metadata?.debitSummary && (
                          <div
                            className={`text-[10px] mt-0.5 font-medium ${
                              tx.metadata.apiCallState === 'api_called_response_received'
                                ? 'text-amber-700'
                                : tx.type === 'REFUND'
                                ? 'text-blue-700'
                                : 'text-gray-500'
                            }`}
                          >
                            {tx.metadata.debitSummary}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 font-mono text-gray-500">{tx.reference}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === 'FUNDING'
                              ? 'bg-emerald-50 text-emerald-700'
                              : tx.type === 'REFUND'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {new Date(tx.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold">
                        <span className={isCredit ? 'text-emerald-600' : 'text-gray-950'}>
                          {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-gray-500">
                        {formatCurrency(tx.balanceAfter)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
