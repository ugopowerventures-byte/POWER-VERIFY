import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { formatCurrency, formatUnits } from '../../utils/currency';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Wallet,
  ShieldCheck,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export const PaystackCallbackView: React.FC = () => {
  const { wallet, refreshWallet, navigate } = useAuth();
  const [status, setStatus] = useState<'VERIFYING' | 'SUCCESS' | 'FAILED'>('VERIFYING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<{
    reference: string;
    amountNgn: number;
    creditsCredited: number;
    alreadyProcessed?: boolean;
    paidAt?: string;
    channel?: string;
  } | null>(null);

  // Prevent double invocation in React 18 StrictMode
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');

    if (!reference) {
      setStatus('FAILED');
      setErrorMessage('No payment reference found in the callback URL.');
      return;
    }

    verifyPayment(reference.trim());
  }, []);

  const verifyPayment = async (reference: string) => {
    setStatus('VERIFYING');
    setErrorMessage(null);

    try {
      const res = await api.get(`/paystack/verify/${encodeURIComponent(reference)}`);

      if (res.success) {
        setDetails({
          reference,
          amountNgn: res.amountNgn || res.transaction?.amount || 0,
          creditsCredited: res.creditsCredited || res.transaction?.metadata?.credits_credited || 0,
          alreadyProcessed: res.alreadyProcessed,
          paidAt: res.transaction?.metadata?.paid_at || res.transaction?.createdAt,
          channel: res.transaction?.metadata?.channel || 'Card'
        });
        setStatus('SUCCESS');
        await refreshWallet();
      } else {
        setStatus('FAILED');
        setErrorMessage(res.message || res.error || 'Payment verification failed. Please check your transaction history.');
      }
    } catch (err: any) {
      setStatus('FAILED');
      setErrorMessage(err.message || 'Unable to connect to verification server. Please check your transaction history.');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
        {/* State 1: Verifying */}
        {status === 'VERIFYING' && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center mx-auto border border-orange-100 shadow-inner">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
                Verifying payment...
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                Please wait while our backend verifies your payment transaction securely...
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cryptographic Idempotency Protected</span>
            </div>
          </div>
        )}

        {/* State 2: Success */}
        {status === 'SUCCESS' && details && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-100 shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h2 className="text-2xl font-black text-gray-950 tracking-tight">
                Payment Successful!
              </h2>
              <p className="text-xs text-gray-500">
                Your payment has been verified and settled.
              </p>
            </div>

            {/* Credit Breakdown Banner */}
            <div className="bg-gradient-to-br from-[#121212] to-[#1E1E1E] text-white p-5 rounded-2xl border border-[#2B2B2B] shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                  Credits Added
                </span>
                <span className="text-xl font-black text-amber-400 font-mono">
                  +{details.creditsCredited} Credits
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-gray-400 block text-[11px]">Naira Paid:</span>
                  <span className="font-bold text-white font-mono">₦{details.amountNgn.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">New Wallet Balance:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {formatCurrency(wallet?.availableBalance ?? 0)}
                  </span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-2 text-[11px] text-gray-400 flex items-center justify-between">
                <span>Reference:</span>
                <span className="font-mono text-gray-200 select-all">{details.reference}</span>
              </div>
            </div>

            {details.alreadyProcessed && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Notice: This payment had already been safely credited. No duplicate credits were added.</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => navigate('/wallet')}
                className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-extrabold text-xs sm:text-sm hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>View My Wallet</span>
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-3.5 px-4 rounded-xl bg-gray-100 text-gray-800 font-bold text-xs sm:text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* State 3: Failed / Cancelled */}
        {status === 'FAILED' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto border border-red-100 shadow-inner">
                <AlertCircle className="w-9 h-9" />
              </div>
              <h2 className="text-2xl font-black text-gray-950 tracking-tight">
                Payment Verification Failed
              </h2>
              <p className="text-xs text-gray-500">
                The payment could not be verified, or was cancelled/abandoned.
              </p>
            </div>

            {errorMessage && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Verification Note:</span>
                </p>
                <p>{errorMessage}</p>
                <p className="text-[11px] text-red-600 pt-1">
                  Your wallet has NOT been credited. If money was deducted from your bank, your bank will auto-reverse or contact support.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => navigate('/wallet')}
                className="flex-1 py-3.5 px-4 rounded-xl bg-[#121212] text-white hover:bg-gray-900 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Return to Wallet</span>
              </button>

              <button
                onClick={() => navigate('/support')}
                className="flex-1 py-3.5 px-4 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs sm:text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Contact Support</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
