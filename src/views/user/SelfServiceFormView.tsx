import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Service, VerificationRequest } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { ServiceAuthorizationModal } from '../../components/common/ServiceAuthorizationModal';
import {
  Unlink,
  ShieldCheck,
  Lock,
  AlertCircle,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  ArrowLeft,
  Mail
} from 'lucide-react';

export const SelfServiceFormView: React.FC = () => {
  const { user, wallet, refreshWallet, navigate } = useAuth();
  const [services, setServices] = useState<Service[]>([]);

  // Selected sub-service
  const [selectedServiceType, setSelectedServiceType] = useState<'DELINK' | 'EMAIL'>('DELINK');

  // Fields
  const [nin, setNin] = useState('');
  const [phone, setPhone] = useState('');
  const [oldPhoneToDelink, setOldPhoneToDelink] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [agreed, setAgreed] = useState(false);

  // Flow State
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<VerificationRequest | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const list: Service[] = await api.get('/services');
        setServices(list);
      } catch (err) {
        console.error('Failed to load services:', err);
      }
    }
    load();
  }, []);

  const delinkService = services.find((s) => s.code === 'NIN_DELINKING');
  const emailService = services.find((s) => s.code === 'SELF_SERVICE_EMAIL');

  const delinkPrice = delinkService?.price ?? 2500;
  const emailPrice = emailService?.price ?? 1500;

  const currentPrice = selectedServiceType === 'DELINK' ? delinkPrice : emailPrice;
  const currentServiceName =
    selectedServiceType === 'DELINK' ? 'NIN Delinking' : 'Self service Email Retrieval';

  const userBalance = wallet?.availableBalance ?? 0;
  const isBalanceSufficient = userBalance >= currentPrice;
  const balanceShortfall = currentPrice - userBalance;

  const validateForm = (): boolean => {
    setFormError(null);

    const cleanNin = nin.trim();
    if (!cleanNin || !/^\d{11}$/.test(cleanNin)) {
      setFormError('Please enter a valid 11-digit National Identity Number (NIN).');
      return false;
    }

    if (selectedServiceType === 'EMAIL') {
      const cleanEmail = email.trim();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setFormError('Please enter a valid email address.');
        return false;
      }
    } else {
      const cleanPhone = phone.trim();
      if (!cleanPhone || !/^(0|234)[789][01]\d{8}$/.test(cleanPhone)) {
        setFormError('Please enter a valid registered 11-digit phone number.');
        return false;
      }

      const cleanOldPhone = oldPhoneToDelink.trim();
      if (!cleanOldPhone || !/^(0|234)[789][01]\d{8}$/.test(cleanOldPhone)) {
        setFormError('Please enter the old phone number you wish to delink.');
        return false;
      }

      if (cleanPhone === cleanOldPhone) {
        setFormError('Old Phone Number to delink must be different from current registered phone number.');
        return false;
      }
    }

    if (!agreed) {
      setFormError('You must confirm that you are the lawful owner of this identity profile.');
      return false;
    }

    return true;
  };

  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!isBalanceSufficient) {
      setFormError(
        `Insufficient wallet balance. You need ${formatCurrency(currentPrice)}, but currently have ${formatCurrency(userBalance)}. Please fund your wallet with at least ${formatCurrency(balanceShortfall)} to continue.`
      );
      return;
    }

    setConfirmModalOpen(true);
  };

  const handleExecutePayment = async () => {
    setProcessing(true);
    setFormError(null);

    const searchData: Record<string, any> = {
      nin: nin.trim(),
      selectedService: currentServiceName,
      serviceType: selectedServiceType,
      declarationAccepted: true
    };

    if (selectedServiceType === 'DELINK') {
      searchData.phone = phone.trim();
      searchData.currentPhone = phone.trim();
      searchData.oldPhone = oldPhoneToDelink.trim();
      searchData.oldPhoneNumber = oldPhoneToDelink.trim();
      searchData.oldPhoneToDelink = oldPhoneToDelink.trim();
      searchData.reason = reason.trim();
    } else {
      searchData.email = email.trim();
    }

    const targetServiceCode = selectedServiceType === 'DELINK' ? 'NIN_DELINKING' : 'SELF_SERVICE_EMAIL';

    try {
      const response = await api.post('/service-requests/submit', {
        serviceCode: targetServiceCode,
        submittedData: searchData,
        idempotencyKey: `idem_self_${selectedServiceType}_${nin.trim()}_${Date.now()}`
      });

      setConfirmModalOpen(false);
      const trackingId = response.trackingId || response.ticketId || response.request?.ticketId;
      setSubmissionSuccess({
        ...(response.request || {}),
        trackingId,
        serviceName: currentServiceName,
        amountCharged: response.amountCharged || response.amount || currentPrice,
        status: response.status || 'PENDING'
      });
      await refreshWallet();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit self service request. Please try again.');
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
              Your <strong>{currentServiceName}</strong> application has been received and queued for administrative processing.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-left space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Service:</span>
              <span className="font-bold text-gray-900">{currentServiceName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Tracking ID:</span>
              <span className="font-bold text-orange-600 font-mono text-sm">{trackingId}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Amount:</span>
              <span className="font-bold text-emerald-600">{formatCurrency(submissionSuccess.amountCharged || currentPrice)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 font-sans font-medium">Status:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                PENDING
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigate('/my-service-requests')}
              className="flex-1 py-3 px-4 rounded-xl bg-gray-950 text-white font-bold text-xs hover:bg-black transition-colors"
            >
              View My Service Requests
            </button>
            <button
              onClick={() => {
                setSubmissionSuccess(null);
                setNin('');
                setPhone('');
                setEmail('');
                setOldPhoneToDelink('');
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 transition-colors"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
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
          <span className="text-gray-900 font-bold">Self Service</span>
        </div>

        <button
          onClick={() => navigate('/services')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm"
        >
          <span>Choose Different Service</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-b from-teal-50/40 to-white">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-teal-50 text-teal-600">
              <Unlink className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border bg-teal-50 text-teal-700 border-teal-200">
                NIMC PORTAL
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                Self Service
              </h1>
              <p className="text-xs text-gray-500">Self-service for NIN Delinking & Email Retrieval</p>
            </div>
          </div>

          <div className="text-left sm:text-right bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
            <span className="block text-[11px] font-bold uppercase text-gray-400">Current Fee</span>
            <span className="text-2xl font-black text-gray-950 font-mono tracking-tight">
              {formatCurrency(currentPrice)}
            </span>
          </div>
        </div>

        {/* Timeline Warning Banner */}
        <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-950 text-xs flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-extrabold uppercase tracking-wide">Processing Timeline Notice</p>
            <p className="font-bold">NOTE: This Service Takes 24-48hrs To Be Processed.</p>
          </div>
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
                <strong>{formatCurrency(currentPrice)}</strong> | Shortfall:{' '}
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
          {/* Sub-Service Selection Toggle */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-800">
              Select Self Service Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedServiceType('DELINK')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  selectedServiceType === 'DELINK'
                    ? 'border-teal-500 bg-teal-50/50 shadow-xs ring-2 ring-teal-500/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${selectedServiceType === 'DELINK' ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Unlink className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-gray-900">NIN Delinking</span>
                    <span className="block text-[11px] text-gray-500">Unbind old phone number</span>
                  </div>
                </div>
                <span className="text-xs font-black font-mono text-teal-700">
                  {formatCurrency(delinkPrice)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedServiceType('EMAIL')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  selectedServiceType === 'EMAIL'
                    ? 'border-teal-500 bg-teal-50/50 shadow-xs ring-2 ring-teal-500/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${selectedServiceType === 'EMAIL' ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-gray-900">Email Retrieval</span>
                    <span className="block text-[11px] text-gray-500">Retrieve registered email</span>
                  </div>
                </div>
                <span className="text-xs font-black font-mono text-teal-700">
                  {formatCurrency(emailPrice)}
                </span>
              </button>
            </div>
          </div>

          {/* Common NIN */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-800">
              National Identity Number (NIN) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={11}
              value={nin}
              onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 11-digit NIN"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-teal-600 text-xs font-mono font-bold outline-none"
              required
            />
          </div>

          {/* Email Retrieval specific field: Email is mandatory, Phone is removed */}
          {selectedServiceType === 'EMAIL' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address (e.g. name@example.com)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-teal-600 text-xs font-semibold outline-none"
                required
              />
              <p className="text-[11px] text-gray-500">
                The retrieved email address will be linked and verified on your national identity record.
              </p>
            </div>
          )}

          {/* Delinking specific fields: Current Phone and Old Phone to Delink */}
          {selectedServiceType === 'DELINK' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Current Registered Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter current 11-digit registered phone number"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-teal-600 text-xs font-mono font-bold outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-800">
                  Old Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={oldPhoneToDelink}
                  onChange={(e) => setOldPhoneToDelink(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter old phone number to delink from NIN"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-teal-600 text-xs font-mono font-bold outline-none"
                  required
                />
                <p className="text-[11px] text-gray-500">
                  This Old Phone Number will be permanently unlinked and delinked from your NIMC record.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Reason for Delinking (Optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Lost SIM card, Line deactivated, Network operator change"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-teal-600 text-xs font-semibold outline-none"
                />
              </div>
            </div>
          )}

          {/* Declaration */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer text-xs text-gray-700 select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded text-teal-600 focus:ring-teal-600"
                required
              />
              <span>
                I certify that I am the legal owner of this National Identity Number and authorize the requested self-service operation on my profile.
              </span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={!isBalanceSufficient}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Submit Request</span>
              <span className="font-mono text-white/90">({formatCurrency(currentPrice)})</span>
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
          title="Confirm Self Service Request"
          subtitle="Review request details and confirm your submission."
          serviceName={currentServiceName}
          serviceCode={selectedServiceType === 'DELINK' ? 'NIN_DELINKING' : 'SELF_SERVICE_EMAIL'}
          servicePrice={currentPrice}
          walletBalance={userBalance}
          reviewDetails={[
            { label: 'Service Type', value: currentServiceName },
            { label: 'NIN Number', value: nin },
            ...(selectedServiceType === 'DELINK'
              ? [
                  { label: 'Current Phone', value: phone },
                  { label: 'Phone to Delink', value: oldPhoneToDelink }
                ]
              : [{ label: 'Email Address', value: email }])
          ]}
          onConfirm={handleExecutePayment}
          isProcessing={processing}
          actionButtonText="Authorize & Submit"
          processingText="Submitting Request..."
        />
      )}
    </div>
  );
};
