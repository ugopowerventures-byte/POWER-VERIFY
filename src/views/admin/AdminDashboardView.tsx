import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { formatCurrency } from '../../utils/currency';
import { UserAvatar } from '../../components/common/UserAvatar';
import {
  Users,
  ShieldCheck,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Sliders,
  DollarSign,
  FileCheck2,
  Fingerprint,
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminDashboardSkeleton } from '../../components/common/Skeleton';

export const AdminDashboardView: React.FC = () => {
  const { user: currentUser, navigate } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await api.get('/admin/metrics');
      setMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading && !metrics) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Administrative Control Center
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Real-time platform telemetry, user ledger volumes, and service performance.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-bold hover:bg-white/10 shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Metrics</span>
        </button>
      </div>

      {/* Administrator Profile Card - Authoritative Avatar beside Name */}
      <div className="bg-[#161616] p-4 sm:p-5 rounded-3xl border border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <UserAvatar user={currentUser} size="lg" showBorder className="shadow-xl shrink-0" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base sm:text-lg font-black text-white">
                {currentUser?.fullName}
              </span>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm ${
                  currentUser?.role === 'MEGA_ADMIN'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : currentUser?.role === 'SUPER_ADMIN'
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {(currentUser?.role || 'ADMIN').replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span className="font-mono">@{currentUser?.username}</span>
              <span>•</span>
              <span>{currentUser?.email}</span>
              {currentUser?.phone && (
                <>
                  <span>•</span>
                  <span>{currentUser.phone}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/profile')}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
        >
          Manage Profile & Avatar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-[#161616] p-6 rounded-3xl border border-[#262626] space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Registered Users</span>
            <Users className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {metrics?.totalUsers ?? '--'}
          </div>
          <p className="text-[11px] text-emerald-400 font-semibold">
            {metrics?.activeUsers ?? '--'} Active accounts
          </p>
        </div>

        {/* Total Verifications */}
        <div className="bg-[#161616] p-6 rounded-3xl border border-[#262626] space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Verifications Run</span>
            <ShieldCheck className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {metrics?.totalVerifications ?? '--'}
          </div>
          <p className="text-[11px] text-amber-400 font-semibold">
            {metrics?.successfulVerifications ?? 0} Success ({metrics?.successRate ?? '100%'})
          </p>
        </div>

        {/* Total Revenue */}
        <div className="bg-[#161616] p-6 rounded-3xl border border-[#262626] space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Platform Revenue</span>
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono">
            {formatCurrency(metrics?.totalRevenue ?? 0)}
          </div>
          <p className="text-[11px] text-gray-400">From completed lookups</p>
        </div>

        {/* Pending Funding Reviews */}
        <div className="bg-[#161616] p-6 rounded-3xl border border-[#262626] space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Deposits</span>
            <Clock className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-3xl font-black text-orange-400 font-mono">
            {metrics?.pendingFundingRequests ?? 0}
          </div>
          <button
            onClick={() => navigate('/admin/wallets')}
            className="text-[11px] text-orange-400 hover:underline font-semibold"
          >
            Review receipts →
          </button>
        </div>
      </div>

      {/* Quick Action Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          onClick={() => navigate('/verify/online-nin-registration')}
          className="bg-[#161616] p-6 rounded-3xl border border-[#262626] hover:border-orange-500/50 cursor-pointer transition-colors space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center">
            <Fingerprint className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">NIN Registration Desk</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Directly enroll new citizens, capture biometric particulars, record up to 3 individual photographs, and generate tracking tickets.
          </p>
          <span className="text-xs font-bold text-orange-400 flex items-center gap-1">
            Open NIN Enrollment Portal <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

        <div
          onClick={() => navigate('/admin/service-requests')}
          className="bg-[#161616] p-6 rounded-3xl border border-[#262626] hover:border-[#FF6B00]/50 cursor-pointer transition-colors space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/15 text-[#FF6B00] flex items-center justify-center">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">Service Requests & Orders</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Review incoming NIN modifications, citizen registrations, and civil registry applications, update status, and dispatch results.
          </p>
          <span className="text-xs font-bold text-[#FF6B00] flex items-center gap-1">
            Manage Service Orders <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

        <div
          onClick={() => navigate('/admin/services')}
          className="bg-[#161616] p-6 rounded-3xl border border-[#262626] hover:border-orange-500/50 cursor-pointer transition-colors space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">Live Pricing Manager</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Update official verification fees in real-time. Changes immediately update across all customer portals.
          </p>
          <span className="text-xs font-bold text-orange-400 flex items-center gap-1">
            Manage Service Pricing <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

        <div
          onClick={() => navigate('/admin/providers')}
          className="bg-[#161616] p-6 rounded-3xl border border-[#262626] hover:border-amber-500/50 cursor-pointer transition-colors space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">Verification API Providers</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Configure Prembly, QoreID, or custom gateways. Test API connectivity and toggle development sandbox.
          </p>
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
            Configure Gateways <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {currentUser?.role === 'MEGA_ADMIN' && (
          <div
            onClick={() => navigate('/admin/api-accounts')}
            className="bg-[#161616] p-6 rounded-3xl border border-purple-500/30 hover:border-purple-500/60 cursor-pointer transition-colors space-y-3 relative overflow-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">API Account Center</h3>
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40">
                MEGA ADMIN
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Quick executive access to official provider accounts, documentation, and masked credentials.
            </p>
            <span className="text-xs font-bold text-purple-400 flex items-center gap-1">
              Access Provider Portals <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        )}

        <div
          onClick={() => navigate('/admin/wallets')}
          className="bg-[#161616] p-6 rounded-3xl border border-[#262626] hover:border-emerald-500/50 cursor-pointer transition-colors space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">Manual Funding Desk</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Approve or reject customer bank transfer receipts with automated ledger crediting and notification dispatch.
          </p>
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
            Review Deposits <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
