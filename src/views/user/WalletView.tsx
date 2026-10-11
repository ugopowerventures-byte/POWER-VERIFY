import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { WalletTransaction } from '../../types';
import { formatCurrency, formatUnits, ngnToUnits } from '../../utils/currency';
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  ReceiptText,
  ShieldCheck,
  Zap,
  Loader2,
  Lock,
  History
} from 'lucide-react';

export const WalletView: React.FC = () => {
  const { wallet, refreshWallet, settings, user, navigate } = useAuth();

  // Instant Automated Funding State
  const [fundingAmount, setFundingAmount] = useState<number>(2000);
  const [fundingLoading, setFundingLoading] = useState(false);
  const [fundingError, setFundingError] = useState<string | null>(null);

  // Recent transactions list
  const [recentTransactions, setRecentTransactions] = useState<WalletTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Unit / Credit Conversion Rate (Default ₦200 = 1 Credit)
  const unitRate = settings?.unitValueNgn || 200;
  const minFunding = settings?.minWalletFunding || 1000;
  const maxFunding = settings?.maxWalletFunding || 1000000;

  // Suggested Quick Amounts
  const quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

  useEffect(() => {
    loadRecentTransactions();
  }, []);

  const loadRecentTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const data = await api.get('/wallet/transactions?limit=10');
      if (Array.isArray(data)) {
        setRecentTransactions(data);
      } else if (data && Array.isArray((data as any).transactions)) {
        setRecentTransactions((data as any).transactions);
      } else if (data && Array.isArray((data as any).data)) {
        setRecentTransactions((data as any).data);
      } else {
        setRecentTransactions([]);
      }
    } catch (err) {
      console.error('Failed to load recent transactions:', err);
      setRecentTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Instant Automated Flow Handler
  const handleProceedPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFundingError(null);

    if (fundingAmount < minFunding) {
      const minCredits = (minFunding / unitRate).toFixed(1);
      setFundingError(`Minimum funding amount is ₦${minFunding.toLocaleString()} (${minCredits} Credits).`);
      return;
    }

    if (fundingAmount > maxFunding) {
      setFundingError(`Maximum funding amount per transaction is ₦${maxFunding.toLocaleString()}.`);
      return;
    }

    try {
      setFundingLoading(true);

      const callbackUrl = `${window.location.origin}/wallet/callback`;

      const res = await api.post('/paystack/initialize', {
        amount: fundingAmount,
        callbackUrl
      });

      if (!res.authorizationUrl) {
        throw new Error(res.error || res.message || 'Payment initialization did not return an authorization URL.');
      }

      // Redirect directly to secure checkout
      window.location.href = res.authorizationUrl;
    } catch (err: any) {
      setFundingError(err.message || 'Failed to initialize secure checkout. Please try again.');
      setFundingLoading(false);
    }
  };

  // Calculate expected credits for currently entered funding amount
  const calculatedCredits = Number((fundingAmount / unitRate).toFixed(2));
  const availableCredits = ngnToUnits(wallet?.availableBalance ?? 0, unitRate);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Instant Automated Funding Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            Wallet & Credit Top-Up
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Top up your account with credits to execute official governmental identity verifications and registrations.
          </p>
        </div>

        {/* Live Conversion Rule Pill */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 sm:px-4 text-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FF6B00] text-black font-extrabold flex items-center justify-center text-sm shadow-sm">
            ₦
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-orange-800 tracking-wider block">
              Official Rate
            </span>
            <span className="font-extrabold text-gray-950">
              ₦{unitRate} = 1 Credit
            </span>
          </div>
        </div>
      </div>

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1: Available Credit Balance */}
        <div className="bg-gradient-to-br from-[#121212] via-[#1A1A1A] to-[#242424] text-white p-6 rounded-3xl border border-[#2F2F2F] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6B00]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Available Credits
            </span>
            <div className="w-9 h-9 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono tracking-tight flex items-baseline gap-2">
              <span>{formatUnits(availableCredits)}</span>
            </div>
            <p className="text-xs text-gray-300 font-mono mt-1">
              ≈ ₦{(wallet?.availableBalance ?? 0).toLocaleString()} NGN equivalent
            </p>
          </div>
          <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-white/10">
            Instant credit deduction on verification query.
          </p>
        </div>

        {/* Card 2: Total Deposited */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Deposited
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 font-mono tracking-tight">
              {formatUnits(ngnToUnits(wallet?.totalDeposited ?? 0, unitRate))}
            </span>
            <p className="text-xs text-gray-500 font-mono mt-1">
              ₦{(wallet?.totalDeposited ?? 0).toLocaleString()} total funded
            </p>
          </div>
          <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-100">
            All lifetime verified wallet deposits.
          </p>
        </div>

        {/* Card 3: Total Spent */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Spent
            </span>
            <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 font-mono tracking-tight">
              {formatUnits(ngnToUnits(wallet?.totalSpent ?? 0, unitRate))}
            </span>
            <p className="text-xs text-gray-500 font-mono mt-1">
              ₦{(wallet?.totalSpent ?? 0).toLocaleString()} verification charges
            </p>
          </div>
          <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-100">
            Total verification service expenditures.
          </p>
        </div>
      </div>

      {/* Main Payment & Funding Interface */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden p-6 sm:p-10 max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Automated & Instant Crediting</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
            Fund Wallet
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Choose or enter your Naira payment amount. Your credits will be added immediately upon successful payment.
          </p>
        </div>

        {fundingError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Payment Error</p>
              <p>{fundingError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleProceedPayment} className="space-y-6">
          {/* Amount Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Amount in Naira (NGN)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-xl font-black text-gray-400">₦</span>
              <input
                type="number"
                min={minFunding}
                max={maxFunding}
                step={100}
                required
                value={fundingAmount}
                onChange={(e) => setFundingAmount(Number(e.target.value) || 0)}
                placeholder="2000"
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 font-mono font-black text-2xl text-gray-950 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
              <span>Min: ₦{minFunding.toLocaleString()}</span>
              <span>Max: ₦{maxFunding.toLocaleString()}</span>
            </div>
          </div>

          {/* Suggested Quick Amounts */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
              Suggested Funding Amounts:
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              {quickAmounts.map((amt) => {
                const credits = (amt / unitRate).toFixed(amt % unitRate === 0 ? 0 : 1);
                const isSelected = fundingAmount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setFundingAmount(amt)}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#121212] text-white border-black shadow-md ring-2 ring-orange-500/50'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-200'
                    }`}
                  >
                    <span className="block font-black font-mono text-xs sm:text-sm">
                      ₦{amt.toLocaleString()}
                    </span>
                    <span className={`block text-[11px] font-bold mt-0.5 ${isSelected ? 'text-amber-400' : 'text-orange-600'}`}>
                      {credits} Credits
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-time Payment Summary & Conversion Table */}
          <div className="bg-gradient-to-br from-gray-50 to-orange-50/40 p-5 rounded-2xl border border-orange-100/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-medium">Naira Amount You Pay:</span>
              <span className="font-extrabold text-gray-950 font-mono text-sm">
                ₦{fundingAmount.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200/60 pt-2">
              <span className="text-gray-600 font-medium">Credits You Will Receive:</span>
              <span className="font-black text-orange-600 font-mono text-base">
                +{calculatedCredits} Credits
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200/60 pt-2 text-[11px] text-gray-500">
              <span>Conversion Rate:</span>
              <span className="font-mono">₦{unitRate} = 1 Credit</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>Payment Gateway Surcharge:</span>
              <span className="font-bold text-emerald-600">₦0.00 (Waived)</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            type="submit"
            disabled={fundingLoading || fundingAmount < minFunding}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#FF6B00] via-[#FF7A00] to-[#FFA800] text-black font-black text-sm sm:text-base hover:brightness-110 shadow-xl shadow-orange-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {fundingLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to Secure Gateway...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>
                  Proceed to Secure Payment ₦{fundingAmount.toLocaleString()} ({calculatedCredits} Credits)
                </span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>

          <div className="text-center text-[11px] text-gray-400 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Processed securely via 256-bit TLS encrypted checkout.</span>
          </div>
        </form>
      </div>

      {/* ======================================================== */}
      {/* SECTION: RECENT WALLET TRANSACTIONS LEDGER               */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-950 flex items-center gap-2">
              <History className="w-5 h-5 text-orange-600" />
              <span>Recent Wallet Transactions</span>
            </h2>
            <p className="text-xs text-gray-500">
              Audit trail of recent credits, verification deductions, and refunds.
            </p>
          </div>

          <button
            onClick={() => navigate('/transactions')}
            className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
          >
            <span>Full Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingTransactions ? (
          <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
            <span>Loading recent transactions...</span>
          </div>
        ) : !Array.isArray(recentTransactions) || recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            No transactions recorded yet. Fund your wallet to begin executing verifications.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(Array.isArray(recentTransactions) ? recentTransactions : []).map((tx) => {
              const isCredit = tx.type === 'FUNDING' || tx.type === 'REFUND';
              return (
                <div key={tx.id} className="py-3.5 flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 truncate">{tx.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                      <span className="font-mono">{tx.reference}</span>
                      <span>•</span>
                      <span>{new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {tx.metadata?.gateway && (
                        <>
                          <span>•</span>
                          <span className="font-bold text-emerald-600">{tx.metadata.gateway}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-black font-mono text-sm block ${
                        isCredit ? 'text-emerald-600' : 'text-gray-950'
                      }`}
                    >
                      {isCredit ? '+' : '-'}{formatUnits(ngnToUnits(tx.amount, unitRate))}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.status === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : tx.status === 'FAILED'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
