import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { VerificationRequest, WalletTransaction, Service } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { UserAvatar } from '../../components/common/UserAvatar';
import { UserDashboardSkeleton } from '../../components/common/Skeleton';
import {
  Wallet,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  ReceiptText,
  CreditCard,
  UserCheck,
  PhoneCall,
  Clock,
  FileEdit,
  FileText,
  Baby
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { user, wallet, navigate } = useAuth();
  const [recentVerifications, setRecentVerifications] = useState<VerificationRequest[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<WalletTransaction[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [vList, tList, sList] = await Promise.all([
          api.get('/verifications/my?limit=5'),
          api.get('/wallet/transactions?limit=5'),
          api.get('/services')
        ]);
        setRecentVerifications(Array.isArray(vList) ? vList : (vList as any)?.verifications || []);
        setRecentTransactions(Array.isArray(tList) ? tList : (tList as any)?.transactions || []);
        setServices(Array.isArray(sList) ? sList : (sList as any)?.services || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setRecentVerifications([]);
        setRecentTransactions([]);
        setServices([]);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const successfulVerifications = Array.isArray(recentVerifications)
    ? recentVerifications.filter((v) => v.status === 'SUCCESS').length
    : 0;

  const getServiceRoute = (code: string) => {
    switch (code.toUpperCase()) {
      case 'MODIFICATION':
      case 'NIN_MODIFICATION':
        return '/verify/modification';
      case 'CAC_TIN':
      case 'CAC_REGISTRATION':
      case 'TIN_REGISTRATION':
      case 'TIN':
        return '/verify/cac-tin';
      case 'BIRTH_ATTESTATION':
        return '/verify/birth-attestation';
      case 'BVN_MODIFICATION':
        return '/verify/bvn-modification';
      case 'BVN_RETRIEVAL':
        return '/verify/bvn-retrieval';
      case 'BVN_ANDROID_USER':
      case 'ANDROID_BVN_ONBOARDING':
        return '/verify/bvn-android-user';
      case 'NIN_DELINKING':
      case 'SELF_SERVICE_EMAIL':
        return '/verify/self-service';
      case 'DEMOGRAPHIC_VERIFICATION':
      case 'DEMOGRAPHIC':
        return '/verify/demographic-verification';
      case 'ONLINE_NIN_REGISTRATION':
        return '/verify/online-nin-registration';
      default:
        return `/verify?service=${code}`;
    }
  };

  if (loading && services.length === 0) {
    return <UserDashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Online NIN Registration Shortcut for Authorized Agents */}
      {user?.role === 'AGENT' && user?.assignedServices?.includes('ONLINE_NIN_REGISTRATION') && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-300 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Authorized Service Active
              </span>
              <h2 className="text-base font-black text-gray-900 mt-0.5">
                Online NIN Registration Terminal
              </h2>
              <p className="text-xs text-gray-600">
                Your agent account is authorized to enroll citizens and submit online National Identity Number registrations.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/verify/online-nin-registration')}
            className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-extrabold text-xs hover:bg-emerald-800 transition-all cursor-pointer shrink-0 shadow-md flex items-center gap-1.5"
          >
            <span>Launch Registration</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#141414] to-[#202020] text-white p-6 sm:p-8 rounded-3xl border border-[#2E2E2E] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div
            onClick={() => navigate('/profile')}
            className="cursor-pointer group relative shrink-0"
            title="Click to manage profile and avatar"
          >
            <UserAvatar user={user} size="xl" showBorder className="shadow-2xl group-hover:scale-105 transition-transform" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-sm ${
                user?.role === 'MEGA_ADMIN'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : user?.role === 'SUPER_ADMIN'
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : user?.role === 'ADMIN'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : user?.role === 'AGENT'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                ROLE: {(user?.role || 'USER').replace(/_/g, ' ').toUpperCase()}
              </span>
              <span className="text-xs text-gray-400 font-mono">@{user?.username}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.fullName?.split(' ')[0] || 'User'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              Access certified identity registries, manage wallet deposits, and generate verified digital slips.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="dash-topup-btn"
            onClick={() => navigate('/wallet/fund')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold text-xs hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Fund Wallet</span>
          </button>
          <button
            id="dash-verify-btn"
            onClick={() => navigate('/verify?service=NIN')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/15 transition-colors border border-white/10 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Verify Identity</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Available Balance */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Available Balance
            </span>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-gray-950 font-mono">
              {formatCurrency(wallet?.availableBalance ?? 0)}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1">
            <span>Ready for real-time lookups</span>
          </p>
        </div>

        {/* Metric 2: Total Spent */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Spent
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-gray-950 font-mono">
              {formatCurrency(wallet?.totalSpent ?? 0)}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">Historical verification expenditure</p>
        </div>

        {/* Metric 3: Total Deposited */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Deposited
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ReceiptText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-gray-950 font-mono">
              {formatCurrency(wallet?.totalDeposited ?? 0)}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">Cumulative wallet top-ups</p>
        </div>

        {/* Metric 4: Success Rate */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Recent Activity
            </span>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-gray-950 font-mono">
              {recentVerifications.length} Lookups
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{successfulVerifications} Successful</span>
          </p>
        </div>
      </div>

      {/* Quick Verification Launcher */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-gray-950">Quick Verification</h3>
            <p className="text-xs text-gray-500">Launch standard identity queries in one click.</p>
          </div>
          <button
            onClick={() => navigate('/services')}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <span>Services Catalogue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Array.isArray(services) ? services : []).slice(0, 4).map((s) => (
            <div
              key={s.id}
              onClick={() => navigate(getServiceRoute(s.code))}
              className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-orange-500/60 shadow-sm hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-200">
                  {s.code}
                </span>
                <div className="text-right">
                  <span className="text-xs font-black text-gray-950 font-mono block">
                    {formatCurrency(user?.role === 'AGENT' && s.agentPrice ? s.agentPrice : s.price)}
                  </span>
                  {user?.role === 'AGENT' && s.agentPrice && s.agentPrice < s.price && (
                    <span className="text-[10px] text-emerald-600 font-bold block">Agent Rate</span>
                  )}
                </div>
              </div>
              <h4 className="font-bold text-gray-900 text-sm group-hover:text-orange-600 transition-colors">
                {s.name}
              </h4>
              <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{s.description}</p>
              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-orange-600">
                <span>Start Lookup</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Special Civil Services Highlights: NIN Modification & Birth Attestation & Service Requests */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/my-service-requests')}
          className="bg-gradient-to-br from-orange-500/10 via-white to-amber-500/10 p-6 rounded-3xl border border-orange-200/80 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-orange-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Fulfillment Desk
              </span>
              <h3 className="text-base font-black text-gray-950 mt-2">My Service Requests</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Track status of CAC business filings, TIN applications, and custom service orders. Download approved result documents.
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-700 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-orange-200/40 flex items-center justify-between text-xs font-bold text-orange-800">
            <span>View All Service Tickets</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        <div
          onClick={() => navigate('/verify/modification')}
          className="bg-gradient-to-br from-amber-500/10 via-white to-orange-500/10 p-6 rounded-3xl border border-amber-200/80 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Official Updates
              </span>
              <h3 className="text-base font-black text-gray-950 mt-2">MODIFICATION</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Submit official Date of Birth, Phone Number, BVN, Address, IPE, or Name modifications with supporting passport photographs.
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <FileEdit className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-200/40 flex items-center justify-between text-xs font-bold text-amber-800">
            <span>Explore 6 Modification Options</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        <div
          onClick={() => navigate('/verify/birth-attestation')}
          className="bg-gradient-to-br from-emerald-500/10 via-white to-teal-500/10 p-6 rounded-3xl border border-emerald-200/80 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                National Population Commission
              </span>
              <h3 className="text-base font-black text-gray-950 mt-2">NPC Birth Attestation</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Complete the 7-section official digital application for National Population Commission Attestation of Birth certification.
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0">
              <Baby className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-200/40 flex items-center justify-between text-xs font-bold text-emerald-800">
            <span>Apply for Attestation ({formatCurrency(15000)})</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Tables Row: Recent Verifications and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Verifications */}
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-950 text-sm">Recent Verifications</h3>
              <p className="text-[11px] text-gray-500">Latest identity lookups and status</p>
            </div>
            <button
              onClick={() => navigate('/verify/history')}
              className="text-xs font-bold text-orange-600 hover:underline"
            >
              View History
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {!Array.isArray(recentVerifications) || recentVerifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                No verifications run yet. Select a service above to get started.
              </div>
            ) : (
              (Array.isArray(recentVerifications) ? recentVerifications : []).map((v) => (
                <div
                  key={v.id}
                  onClick={() => navigate('/verify/history')}
                  className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-gray-900">{v.serviceName}</p>
                    <p className="text-[10px] text-gray-400 font-mono">Ref: {v.reference}</p>
                    <span className="text-[10px] text-gray-500">
                      {new Date(v.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-xs font-mono font-bold text-gray-900 block">
                      -{formatCurrency(v.amountCharged)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                        v.status === 'SUCCESS' || v.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : v.status === 'FAILED' || v.status === 'REJECTED'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-950 text-sm">Recent Ledger Activity</h3>
              <p className="text-[11px] text-gray-500">Debits, credits and refunds</p>
            </div>
            <button
              onClick={() => navigate('/transactions')}
              className="text-xs font-bold text-orange-600 hover:underline"
            >
              All Transactions
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {!Array.isArray(recentTransactions) || recentTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                No ledger transactions recorded yet.
              </div>
            ) : (
              (Array.isArray(recentTransactions) ? recentTransactions : []).map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-gray-900">{tx.description}</p>
                    <p className="text-[10px] text-gray-400 font-mono">Ref: {tx.reference}</p>
                    <span className="text-[10px] text-gray-500">
                      {new Date(tx.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-mono font-bold ${
                        tx.type === 'FUNDING' || tx.type === 'REFUND'
                          ? 'text-emerald-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {tx.type === 'FUNDING' || tx.type === 'REFUND' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </span>
                    <span className="block text-[10px] text-gray-400 font-mono">
                      Bal: {formatCurrency(tx.balanceAfter)}
                    </span>
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
