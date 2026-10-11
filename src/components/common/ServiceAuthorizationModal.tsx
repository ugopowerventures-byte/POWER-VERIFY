import React, { useState, useEffect } from 'react';
import { formatCurrency, formatUnits } from '../../utils/currency';
import {
  ShieldCheck,
  X,
  CheckCircle2,
  Circle,
  Loader2,
  Clock,
  Sparkles
} from 'lucide-react';

export interface ServiceReviewItem {
  label: string;
  value: string | React.ReactNode;
}

export interface ServiceAuthorizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  serviceName: string;
  serviceCode?: string;
  servicePrice: number;
  walletBalance: number;
  reviewDetails?: ServiceReviewItem[];
  turnaroundNote?: string;
  onConfirm: () => Promise<void> | void;
  isProcessing: boolean;
  actionButtonText?: string;
  processingText?: string;
}

export const ServiceAuthorizationModal: React.FC<ServiceAuthorizationModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  serviceName,
  servicePrice,
  walletBalance,
  reviewDetails = [],
  turnaroundNote,
  onConfirm,
  isProcessing,
  actionButtonText = 'Authorize & Submit',
  processingText = 'Processing Request...'
}) => {
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Reset confirmation state whenever modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setIsConfirmed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const balanceAfter = walletBalance - servicePrice;
  const isInsufficient = balanceAfter < 0;

  const handleFinalSubmit = async () => {
    if (!isConfirmed || isInsufficient || isProcessing) return;
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-gray-100 space-y-5 relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="absolute right-4 top-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-gray-950">
              {title || 'Confirm & Authorize Request'}
            </h3>
            <p className="text-xs text-gray-500">
              {subtitle || 'Review request details and confirm your submission.'}
            </p>
          </div>
        </div>

        {/* Request Details Review Card */}
        <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/90 space-y-2.5 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <span className="text-gray-500 font-medium">Service</span>
            <span className="font-extrabold text-gray-900 text-right truncate max-w-[240px]">
              {serviceName}
            </span>
          </div>

          {reviewDetails.length > 0 && (
            <div className="space-y-1.5 py-1 border-b border-gray-200">
              {reviewDetails.map((detail, idx) => (
                <div key={idx} className="flex justify-between items-start gap-2">
                  <span className="text-gray-500">{detail.label}</span>
                  <span className="font-semibold text-gray-900 text-right truncate max-w-[220px]">
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pricing & Wallet Calculation */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Service Fee:</span>
              <div className="text-right">
                <span className="font-mono font-bold text-gray-950">
                  {formatCurrency(servicePrice)}
                </span>
                <span className="text-[11px] text-gray-500 ml-1.5 font-bold">
                  ({formatUnits(servicePrice)})
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-gray-600">
              <span>Wallet Balance:</span>
              <span className="font-mono font-semibold">{formatCurrency(walletBalance)}</span>
            </div>

            <div className={`flex justify-between items-center pt-1 border-t border-gray-200 font-bold ${
              isInsufficient ? 'text-red-600' : 'text-emerald-700'
            }`}>
              <span>Balance After:</span>
              <span className="font-mono">
                {formatCurrency(balanceAfter)}
                {isInsufficient && ' (Insufficient)'}
              </span>
            </div>
          </div>
        </div>

        {turnaroundNote && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-900">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{turnaroundNote}</span>
          </div>
        )}

        {/* Customer Confirmation Step */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isConfirmed
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950'
              : 'bg-amber-500/10 border-amber-500/25 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isConfirmed ? (
                <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs sm:text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>✓ Confirmed</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                  <Circle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>○ Confirmation required</span>
                </div>
              )}
            </div>

            <div>
              {isConfirmed ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmed(false)}
                  disabled={isProcessing}
                  className="text-xs text-gray-500 hover:text-gray-800 underline font-semibold cursor-pointer"
                >
                  Edit Details
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-customer-modal-confirm"
                  onClick={() => setIsConfirmed(true)}
                  disabled={isProcessing || isInsufficient}
                  className="px-5 py-2 rounded-xl bg-gray-950 hover:bg-black text-white font-extrabold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-40"
                >
                  Confirm
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-modal-final-submit"
            onClick={handleFinalSubmit}
            disabled={isProcessing || isInsufficient || !isConfirmed}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-extrabold text-xs hover:brightness-110 shadow-md shadow-orange-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>{processingText}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{actionButtonText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
