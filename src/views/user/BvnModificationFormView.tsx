import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { BvnEnrollmentCenter, VerificationRequest } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { ServiceAuthorizationModal } from '../../components/common/ServiceAuthorizationModal';
import {
  ShieldCheck,
  Building2,
  Lock,
  AlertCircle,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  ArrowLeft
} from 'lucide-react';

export const BvnModificationFormView: React.FC = () => {
  const { user, wallet, refreshWallet, navigate } = useAuth();

  const [centers, setCenters] = useState<BvnEnrollmentCenter[]>([]);
  const [loadingCenters, setLoadingCenters] = useState(true);

  // Form Fields
  const [selectedCenterId, setSelectedCenterId] = useState<string>('');
  const [bvnNumber, setBvnNumber] = useState('');
  const [dob, setDob] = useState('');
  const [oldPhone, setOldPhone] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [agreed, setAgreed] = useState(false);

  // State
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<VerificationRequest | null>(null);

  useEffect(() => {
    async function loadCenters() {
      try {
        const list: BvnEnrollmentCenter[] = await api.get('/bvn/enrollment-centers');
        if (list && list.length > 0) {
          setCenters(list);
          setSelectedCenterId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load BVN enrollment centers:', err);
      } finally {
        setLoadingCenters(false);
      }
    }
    loadCenters();
  }, []);

  const selectedCenter = centers.find((c) => c.id === selectedCenterId) || centers[0];
  const servicePrice = selectedCenter ? selectedCenter.price : 3500;
  const userBalance = wallet?.availableBalance ?? 0;
  const isBalanceSufficient = userBalance >= servicePrice;
  const balanceShortfall = servicePrice - userBalance;

  const validateForm = (): boolean => {
    setFormError(null);

    if (!selectedCenterId) {
      setFormError('Please select an Enrollment Center.');
      return false;
    }

    const cleanBvn = bvnNumber.trim();
    if (!cleanBvn || !/^\d{11}$/.test(cleanBvn)) {
      setFormError('BVN Number must be exactly 11 numeric digits.');
      return false;
    }

    if (!dob) {
      setFormError('Date of Birth is required.');
      return false;
    }

    const cleanOldPhone = oldPhone.trim();
    if (!cleanOldPhone || !/^(0|234)[789][01]\d{8}$/.test(cleanOldPhone)) {
      setFormError('Please enter a valid 11-digit Old Phone Number.');
      return false;
    }

    const cleanNewPhone = newPhone.trim();
    if (!cleanNewPhone || !/^(0|234)[789][01]\d{8}$/.test(cleanNewPhone)) {
      setFormError('Please enter a valid 11-digit New Phone Number.');
      return false;
    }

    if (cleanOldPhone === cleanNewPhone) {
      setFormError('New Phone Number must be different from Old Phone Number.');
      return false;
    }

    if (!agreed) {
      setFormError('You must confirm that you are the lawful owner of this BVN record.');
      return false;
    }

    return true;
  };

  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!isBalanceSufficient) {
      setFormError(
        `Insufficient wallet balance. You need ${formatCurrency(servicePrice)}, but currently have ${formatCurrency(userBalance)}. Please fund your wallet with at least ${formatCurrency(balanceShortfall)} to continue.`
      );
      return;
    }

    setConfirmModalOpen(true);
  };

  const handleExecutePayment = async () => {
    setProcessing(true);
    setFormError(null);

    const searchData: Record<string, any> = {
      bvn: bvnNumber.trim(),
      dob,
      oldPhone: oldPhone.trim(),
      newPhone: newPhone.trim(),
      enrollmentCenter: selectedCenter?.name || 'AGENCY',
      enrollmentCenterId: selectedCenter?.id,
      enrollmentCenterPrice: servicePrice,
      declarationAccepted: true
    };

    try {
      const response = await api.post('/service-requests/submit', {
        serviceCode: 'BVN_MODIFICATION',
        submittedData: searchData,
        enrollmentCenterId: selectedCenter?.id,
        idempotencyKey: `idem_bvnmod_${bvnNumber.trim()}_${Date.now()}`
      });

      setConfirmModalOpen(false);
      setSubmissionSuccess({
        ...response.request,
        trackingId: response.trackingId || response.ticketId || response.request?.ticketId,
        serviceName: 'BVN Modification',
        amountCharged: response.amountCharged || response.amount || servicePrice,
        status: response.status || 'PENDING'
      });
      await refreshWallet();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit BVN modification. Please check your details and try again.');
      setConfirmModalOpen(false);
    } finally {
      setProcessing(false);
    }
  };

  if (submissionSuccess) {
    const trackingId = (submissionSuccess as any).trackingId || submissionSuccess.reference || (submissionSuccess as any).ticketId;
    return (
      <div className="max-w-2xl mx-auto py-8 text-center space-y-6">
        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm space-y-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900">Service request submitted successfully.</h2>
            <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto">
              Your BVN modification request has been placed for processing at <strong>{selectedCenter?.name}</strong>.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-left space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Service:</span>
              <span className="font-bold text-gray-900">BVN Modification</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Tracking ID:</span>
              <span className="font-bold text-orange-600 tracking-wider text-sm select-all">{trackingId}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">BVN:</span>
              <span className="font-bold text-gray-900">{bvnNumber}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Center:</span>
              <span className="font-bold text-gray-900">{selectedCenter?.name}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Amount:</span>
              <span className="font-bold text-emerald-600">{formatCurrency(submissionSuccess.amountCharged)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 font-sans font-medium">Status:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                PENDING
              </span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-left flex items-start gap-3 text-xs text-blue-950">
            <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Turnaround Notice</p>
              <p className="text-blue-900">
                Your BVN modification is currently routing through the selected center desk. You can monitor the progress anytime under your Service Requests dashboard.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigate('/my-service-requests')}
              className="flex-1 py-3 rounded-xl bg-gray-950 text-white font-bold text-xs hover:bg-black transition-colors"
            >
              View My Service Requests
            </button>
            <button
              onClick={() => {
                setSubmissionSuccess(null);
                setBvnNumber('');
                setOldPhone('');
                setNewPhone('');
              }}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Navigation Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <button
            onClick={() => navigate('/services')}
            className="hover:text-gray-900 transition-colors font-medium flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Services
          </button>
          <span>/</span>
          <span className="text-gray-900 font-bold">BVN Modification</span>
        </div>

        <button
          onClick={() => navigate('/services')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm"
        >
          <span>Choose Different Service</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-b from-blue-50/40 to-white">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border bg-blue-50 text-blue-700 border-blue-200">
                BANKING SERVICE
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                BVN Modification
              </h1>
              <p className="text-xs text-gray-500">Modification of BVN.</p>
            </div>
          </div>

          <div className="text-left sm:text-right bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
            <span className="block text-[11px] font-bold uppercase text-gray-400">Selected Cost</span>
            <span className="text-2xl font-black text-gray-950 font-mono tracking-tight">
              {formatCurrency(servicePrice)}
            </span>
            <span className="block text-[11px] font-semibold text-gray-500 mt-0.5">
              This service will cost you {formatCurrency(servicePrice)} depending on your selection.
            </span>
          </div>
        </div>

        {/* Dynamic Center Price Notice */}
        <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-blue-950 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold">
              This service will cost you <strong>{formatCurrency(servicePrice)}</strong> depending on your selection.
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
            {selectedCenter?.name}
          </span>
        </div>

        {/* Error Alert */}
        {formError && (
          <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Validation Error</p>
              <p>{formError}</p>
            </div>
          </div>
        )}

        {/* Insufficient Balance Notice */}
        {!isBalanceSufficient && (
          <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-orange-50 border border-orange-200 text-orange-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-orange-950">Insufficient Wallet Balance</p>
              <p>
                Available: <strong>{formatCurrency(userBalance)}</strong> | Required:{' '}
                <strong>{formatCurrency(servicePrice)}</strong> | Shortfall:{' '}
                <strong className="text-red-600">{formatCurrency(balanceShortfall)}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/wallet')}
              className="px-4 py-2 rounded-xl bg-[#FF6B00] text-white font-bold hover:bg-orange-600 transition-colors shrink-0 text-xs shadow-sm"
            >
              Fund Wallet
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleOpenReview} className="p-6 sm:p-8 space-y-6">
          {/* Enrollment Center Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-800">
              Enrollment Center <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCenterId}
              onChange={(e) => setSelectedCenterId(e.target.value)}
              disabled={loadingCenters}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 text-xs font-bold outline-none bg-white"
              required
            >
              {centers.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name} ({formatCurrency(center.price)})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500">
              Select your preferred official bank processing center or licensed agency.
            </p>
          </div>

          {/* BVN Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-800">
              BVN Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={11}
              value={bvnNumber}
              onChange={(e) => setBvnNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 11-digit BVN"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 text-xs font-mono font-bold outline-none"
              required
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-800">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 text-xs font-semibold outline-none"
              required
            />
          </div>

          {/* Phone Numbers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                Old Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={11}
                value={oldPhone}
                onChange={(e) => setOldPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Old registered phone number"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 text-xs font-mono font-semibold outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                New Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={11}
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="New phone number to bind"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 text-xs font-mono font-semibold outline-none"
                required
              />
            </div>
          </div>

          {/* Consent */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer text-xs text-gray-700 select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-600"
                required
              />
              <span>
                I certify that I am the authorized holder of this BVN or duly appointed representative, and I authorize the modification request at the selected enrollment center.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={!isBalanceSufficient}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Submit Modification</span>
              <span className="font-mono text-white/90">({formatCurrency(servicePrice)})</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/services')}
              className="w-full sm:w-auto py-3.5 px-6 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs transition-colors"
            >
              Choose Different Service
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation & Authorization Modal */}
      {confirmModalOpen && (
        <ServiceAuthorizationModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title="Authorize BVN Modification"
          subtitle="Review modification details and choose your authorization method."
          serviceName="BVN Modification"
          serviceCode="BVN_MODIFICATION"
          servicePrice={servicePrice}
          walletBalance={userBalance}
          reviewDetails={[
            { label: 'BVN Number', value: bvnNumber },
            { label: 'Enrollment Center', value: selectedCenter?.name || 'Agency' },
            { label: 'Date of Birth', value: dob },
            { label: 'New Phone', value: newPhone }
          ]}
          onConfirm={handleExecutePayment}
          isProcessing={processing}
          actionButtonText="Authorize & Submit"
          processingText="Submitting Modification..."
        />
      )}
    </div>
  );
};
