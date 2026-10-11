import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

export interface CustomerConfirmationGateProps {
  isConfirmed: boolean;
  onConfirm: () => void;
  onReset?: () => void;
  label?: string;
  confirmedLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Universal Customer Confirmation Gate Component
 * 
 * Flow:
 * 1. Before confirmation: Shows "○ Confirmation required" and a [Confirm] button.
 * 2. When customer clicks [Confirm]:
 *    - Does NOT execute service.
 *    - Updates state to a clear green checkmark: "✓ Confirmed".
 * 3. The parent Verify/Submit button unlocks only after confirmation is complete.
 */
export const CustomerConfirmationGate: React.FC<CustomerConfirmationGateProps> = ({
  isConfirmed,
  onConfirm,
  onReset,
  label = 'Confirmation required',
  confirmedLabel = 'Confirmed',
  disabled = false,
  className = ''
}) => {
  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
        isConfirmed
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 shadow-sm'
          : 'bg-amber-500/10 border-amber-500/25 text-amber-950'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {isConfirmed ? (
            <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm sm:text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>✓ {confirmedLabel}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
              <Circle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>○ {label}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isConfirmed ? (
            onReset && (
              <button
                type="button"
                onClick={onReset}
                disabled={disabled}
                className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 underline transition-colors cursor-pointer"
              >
                Edit request
              </button>
            )
          ) : (
            <button
              type="button"
              id="btn-customer-confirm-action"
              onClick={onConfirm}
              disabled={disabled}
              className="px-5 py-2 rounded-xl bg-gray-950 hover:bg-black text-white font-extrabold text-xs transition-all shadow-sm hover:shadow cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
