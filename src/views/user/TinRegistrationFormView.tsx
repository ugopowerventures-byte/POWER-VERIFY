import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Service, VerificationRequest } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { ServiceAuthorizationModal } from '../../components/common/ServiceAuthorizationModal';
import {
  FileBadge,
  ShieldCheck,
  Lock,
  AlertCircle,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  ArrowLeft
} from 'lucide-react';

export const TinRegistrationFormView: React.FC = () => {
  const { user, wallet, refreshWallet, navigate } = useAuth();
  const [service, setService] = useState<Service | null>(null);

  // Form Fields
  const [tinType, setTinType] = useState<'Individual TIN' | 'Corporate / Non-Individual TIN'>('Individual TIN');
  const [taxpayerName, setTaxpayerName] = useState('');
  const [identifierNumber, setIdentifierNumber] = useState(''); // NIN or BVN or RC
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxState, setTaxState] = useState('');
  const [occupation, setOccupation] = useState('');
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
        const s = list.find((item) => item.code === 'TIN_REGISTRATION');
        if (s) setService(s);
      } catch (err) {
        console.error('Failed to load TIN registration service:', err);
      }
    }
    load();
  }, []);

  const servicePrice = service?.price ?? 3500;
  const userBalance = wallet?.availableBalance ?? 0;
  const isBalanceSufficient = userBalance >= servicePrice;
  const balanceShortfall = servicePrice - userBalance;

  const validateForm = (): boolean => {
    setFormError(null);

    if (!taxpayerName.trim()) {
      setFormError('Please enter taxpayer legal full name or registered business name.');
      return false;
    }

    const cleanId = identifierNumber.trim();
    if (!cleanId || cleanId.length < 8) {
      setFormError('Please enter a valid 11-digit NIN or BVN (or RC/BN Number for corporate).');
      return false;
    }

    if (!dateOfBirth) {
      setFormError('Please select date of birth or company incorporation date.');
      return false;
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone || !/^(0|234)[789][01]\d{8}$/.test(cleanPhone)) {
      setFormError('Please enter a valid 11-digit mobile phone number.');
      return false;
    }

    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return false;
    }

    if (!address.trim()) {
      setFormError('Please enter physical residential or operational address.');
      return false;
    }

    if (!taxState.trim()) {
      setFormError('Please enter state of residence or preferred tax office jurisdiction.');
      return false;
    }

    if (!occupation.trim()) {
      setFormError('Please enter occupation or principal line of business.');
      return false;
    }

    if (!agreed) {
      setFormError('You must confirm that all details provided are accurate under Joint Tax Board rules.');
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
      tinType,
      taxpayerName: taxpayerName.trim(),
      identifierNumber: identifierNumber.trim(),
      dateOfBirth,
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      taxState: taxState.trim(),
      occupation: occupation.trim(),
      declarationAccepted: true
    };

    try {
      const response = await api.post('/service-requests/submit', {
        serviceCode: 'TIN_REGISTRATION',
        submittedData: searchData,
        idempotencyKey: `idem_tin_${identifierNumber.trim()}_${Date.now()}`
      });

      setConfirmModalOpen(false);
      const trackingId = response.trackingId || response.ticketId || response.request?.ticketId;
      setSubmissionSuccess({
        ...(response.request || {}),
        trackingId,
        serviceName: 'TIN Registration',
        amountCharged: response.amountCharged || response.amount || servicePrice,
        status: response.status || 'PENDING'
      });
      await refreshWallet();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit TIN registration. Please try again.');
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
              Your Tax Identification Number registration for <strong>{taxpayerName}</strong> has been received and queued for administrative processing.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-left space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Service:</span>
              <span className="font-bold text-gray-900">TIN Registration</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Tracking ID:</span>
              <span className="font-bold text-orange-600 font-mono text-sm">{trackingId}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Amount:</span>
              <span className="font-bold text-emerald-600">{formatCurrency(submissionSuccess.amountCharged || servicePrice)}</span>
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
                setTaxpayerName('');
                setIdentifierNumber('');
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
          <span className="text-gray-900 font-bold">TIN Registration</span>
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
        <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-b from-emerald-50/40 to-white">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-700">
              <FileBadge className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border bg-emerald-50 text-emerald-700 border-emerald-200">
                FIRS / JOINT TAX BOARD
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                TIN Registration
              </h1>
              <p className="text-xs text-gray-500">Federal Inland Revenue Service (FIRS) / Joint Tax Board (JTB) Tax Identification Number Registration</p>
            </div>
          </div>

          <div className="text-left sm:text-right bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
            <span className="block text-[11px] font-bold uppercase text-gray-400">Processing Fee</span>
            <span className="text-2xl font-black text-gray-950 font-mono tracking-tight">
              {formatCurrency(servicePrice)}
            </span>
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
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-800">
              TIN Classification <span className="text-red-500">*</span>
            </label>
            <select
              value={tinType}
              onChange={(e) => setTinType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-600 text-xs font-semibold outline-none bg-white"
            >
              <option value="Individual TIN">Individual Tax Identification Number (Personal / Sole Trader)</option>
              <option value="Corporate / Non-Individual TIN">Corporate / Non-Individual Tax ID (Registered Business / Company)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-800">
              Taxpayer Legal Name / Registered Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={taxpayerName}
              onChange={(e) => setTaxpayerName(e.target.value)}
              placeholder="e.g. John Obinna Okeke or Obinna Ventures Ltd"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-600 text-xs font-semibold outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                NIN or BVN (or RC/BN for Corporate) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={identifierNumber}
                onChange={(e) => setIdentifierNumber(e.target.value)}
                placeholder="11-digit NIN or BVN, or RC number"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-600 text-xs font-mono font-bold outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                Date of Birth / Incorporation Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-600 text-xs font-semibold outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="08012345678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-600 text-xs font-mono font-bold outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-600 text-xs font-semibold outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-800">
              Residential / Operational Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-600 text-xs font-semibold outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                State / Tax Office Jurisdiction <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={taxState}
                onChange={(e) => setTaxState(e.target.value)}
                placeholder="e.g. Lagos, Rivers, FCT Abuja..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-600 text-xs font-semibold outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                Occupation / Line of Business <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. Civil Servant, Contractor, Trader"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-600 text-xs font-semibold outline-none"
                required
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer text-xs text-gray-700 select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-600"
                required
              />
              <span>
                I attest that the provided information is true, accurate, and lawfully submitted for registration of a national Tax Identification Number with the Joint Tax Board (JTB) and FIRS.
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={!isBalanceSufficient}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Submit TIN Registration</span>
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
          title="Confirm TIN Registration"
          subtitle="Review tax registration details and confirm your submission."
          serviceName="Tax Identification Number (TIN)"
          serviceCode="TIN_REGISTRATION"
          servicePrice={servicePrice}
          walletBalance={userBalance}
          reviewDetails={[
            { label: 'Category', value: tinType },
            { label: 'Taxpayer Name', value: taxpayerName },
            { label: 'Identifier (NIN/BVN/RC)', value: identifierNumber },
            { label: 'Tax State', value: taxState }
          ]}
          onConfirm={handleExecutePayment}
          isProcessing={processing}
          actionButtonText="Authorize & File TIN"
          processingText="Submitting TIN Application..."
        />
      )}
    </div>
  );
};
