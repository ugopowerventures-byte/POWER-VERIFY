import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Service, VerificationRequest } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { ServiceAuthorizationModal } from '../../components/common/ServiceAuthorizationModal';
import {
  Briefcase,
  ShieldCheck,
  Lock,
  AlertCircle,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  ArrowLeft,
  UploadCloud,
  FileText
} from 'lucide-react';

export const CacRegistrationFormView: React.FC = () => {
  const { user, wallet, refreshWallet, navigate } = useAuth();
  const [service, setService] = useState<Service | null>(null);

  // Form Fields
  const [regType, setRegType] = useState<'Business Name' | 'Limited Liability Company (LLC)' | 'Incorporated Trustee (NGO/Church)'>('Business Name');
  const [proposedName1, setProposedName1] = useState('');
  const [proposedName2, setProposedName2] = useState('');
  const [businessNature, setBusinessNature] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [proprietorName, setProprietorName] = useState('');
  const [proprietorPhone, setProprietorPhone] = useState('');
  const [proprietorEmail, setProprietorEmail] = useState('');
  const [idType, setIdType] = useState('NIN');
  const [idNumber, setIdNumber] = useState('');
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
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
        const s = list.find((item) => item.code === 'CAC_REGISTRATION');
        if (s) setService(s);
      } catch (err) {
        console.error('Failed to load CAC registration service:', err);
      }
    }
    load();
  }, []);

  const servicePrice = service?.price ?? 22000;
  const userBalance = wallet?.availableBalance ?? 0;
  const isBalanceSufficient = userBalance >= servicePrice;
  const balanceShortfall = servicePrice - userBalance;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('document', file);
      const res = await api.post('/uploads/document', formData);
      setUploadedDocName(res.fileName || file.name);
    } catch (err) {
      // Fallback: record filename locally
      setUploadedDocName(file.name);
    }
  };

  const validateForm = (): boolean => {
    setFormError(null);

    if (!proposedName1.trim()) {
      setFormError('Please enter your primary Proposed Business Name.');
      return false;
    }

    if (!proposedName2.trim()) {
      setFormError('Please enter an alternative Proposed Business Name.');
      return false;
    }

    if (!businessNature.trim()) {
      setFormError('Please describe the nature and activities of the business.');
      return false;
    }

    if (!officeAddress.trim()) {
      setFormError('Please provide the physical registered office address.');
      return false;
    }

    if (!proprietorName.trim()) {
      setFormError('Please enter the Proprietor or Primary Director legal name.');
      return false;
    }

    const cleanPhone = proprietorPhone.trim();
    if (!cleanPhone || !/^(0|234)[789][01]\d{8}$/.test(cleanPhone)) {
      setFormError('Please enter a valid 11-digit phone number for the proprietor.');
      return false;
    }

    if (!proprietorEmail.trim() || !proprietorEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return false;
    }

    if (!idNumber.trim()) {
      setFormError('Please enter the Identification Number for the chosen ID type.');
      return false;
    }

    if (!agreed) {
      setFormError('You must confirm authorization to file this Corporate Affairs Commission registration.');
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
      registrationType: regType,
      proposedName1: proposedName1.trim(),
      proposedName2: proposedName2.trim(),
      businessNature: businessNature.trim(),
      officeAddress: officeAddress.trim(),
      proprietorName: proprietorName.trim(),
      proprietorPhone: proprietorPhone.trim(),
      proprietorEmail: proprietorEmail.trim(),
      idType,
      idNumber: idNumber.trim(),
      uploadedDocument: uploadedDocName,
      declarationAccepted: true
    };

    try {
      const response = await api.post('/service-requests/submit', {
        serviceCode: 'CAC_REGISTRATION',
        submittedData: searchData,
        idempotencyKey: `idem_cac_${Date.now()}_${Math.random().toString(36).substring(7)}`
      });

      setConfirmModalOpen(false);
      const trackingId = response.trackingId || response.ticketId || response.request?.ticketId;
      setSubmissionSuccess({
        ...(response.request || {}),
        trackingId,
        serviceName: 'CAC Business Registration',
        amountCharged: response.amountCharged || response.amount || servicePrice,
        status: response.status || 'PENDING'
      });
      await refreshWallet();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit CAC application. Please try again.');
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
              Your CAC filing for <strong>{proposedName1}</strong> has been received and queued for administrative processing.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-left space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Service:</span>
              <span className="font-bold text-gray-900">CAC Business Registration</span>
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
                setProposedName1('');
                setProposedName2('');
                setProprietorName('');
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
          <span className="text-gray-900 font-bold">CAC Registration</span>
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
        <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-b from-blue-50/40 to-white">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-700">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border bg-blue-50 text-blue-700 border-blue-200">
                CORPORATE AFFAIRS COMMISSION
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                CAC Registration
              </h1>
              <p className="text-xs text-gray-500">Corporate Affairs Commission Registration (Business Name & Company)</p>
            </div>
          </div>

          <div className="text-left sm:text-right bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
            <span className="block text-[11px] font-bold uppercase text-gray-400">Official Fee</span>
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
          {/* Registration Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-800">
              Registration Category <span className="text-red-500">*</span>
            </label>
            <select
              value={regType}
              onChange={(e) => setRegType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 text-xs font-semibold outline-none bg-white"
            >
              <option value="Business Name">Business Name (Sole Proprietorship / Enterprise)</option>
              <option value="Limited Liability Company (LLC)">Limited Liability Company (Private Ltd / LLC)</option>
              <option value="Incorporated Trustee (NGO/Church)">Incorporated Trustee (NGO, Club, Foundation)</option>
            </select>
          </div>

          {/* Proposed Names Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                Proposed Name (1st Choice) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={proposedName1}
                onChange={(e) => setProposedName1(e.target.value)}
                placeholder="e.g. Apex Global Ventures"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 text-xs font-semibold outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                Proposed Name (2nd Choice) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={proposedName2}
                onChange={(e) => setProposedName2(e.target.value)}
                placeholder="e.g. Apex Prime Integrated Services"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 text-xs font-semibold outline-none"
                required
              />
            </div>
          </div>

          {/* Nature of Business */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-800">
              Nature & Objectives of Business <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={businessNature}
              onChange={(e) => setBusinessNature(e.target.value)}
              placeholder="e.g. General merchandise, IT consultancy, trading, civil contracts..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 text-xs font-semibold outline-none"
              required
            />
          </div>

          {/* Office Address */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-800">
              Registered Office Address in Nigeria <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={officeAddress}
              onChange={(e) => setOfficeAddress(e.target.value)}
              placeholder="Full physical address"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 text-xs font-semibold outline-none"
              required
            />
          </div>

          {/* Proprietor / Director Details */}
          <div className="pt-2 border-t border-gray-100 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
              Proprietor / Director Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-1">
                <label className="block text-xs font-bold text-gray-800">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={proprietorName}
                  onChange={(e) => setProprietorName(e.target.value)}
                  placeholder="Legal full name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 text-xs font-semibold outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={proprietorPhone}
                  onChange={(e) => setProprietorPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="08012345678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 text-xs font-mono font-bold outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={proprietorEmail}
                  onChange={(e) => setProprietorEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 text-xs font-semibold outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Means of Identification <span className="text-red-500">*</span>
                </label>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 text-xs font-semibold outline-none bg-white"
                >
                  <option value="NIN">National Identity Number (NIN)</option>
                  <option value="Voter Card">Voter's Card (VIN)</option>
                  <option value="Driver License">Driver's License Number</option>
                  <option value="International Passport">International Passport</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  ID Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="Enter ID number"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-600 text-xs font-mono font-bold outline-none"
                  required
                />
              </div>
            </div>

            {/* Document Upload */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                Supporting ID / Signature Document (Optional)
              </label>
              <div className="border border-dashed border-gray-300 rounded-2xl p-4 text-center hover:bg-gray-50 transition-colors">
                <input
                  type="file"
                  id="cac-doc-upload"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf"
                />
                <label htmlFor="cac-doc-upload" className="cursor-pointer flex flex-col items-center gap-1.5">
                  <UploadCloud className="w-6 h-6 text-gray-400" />
                  <span className="text-xs font-bold text-blue-600">
                    {uploadedDocName ? `Uploaded: ${uploadedDocName}` : 'Click to select ID scan or signature card'}
                  </span>
                  <span className="text-[10px] text-gray-400">PDF, PNG, or JPG up to 5MB</span>
                </label>
              </div>
            </div>
          </div>

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
                I hereby declare that the information provided is correct and true to the best of my knowledge and I authorize Ugopawa Verify to file this incorporation registration with the Corporate Affairs Commission (CAC).
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
              <span>Submit CAC Application</span>
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
          title="Confirm CAC Registration"
          subtitle="Review CAC application details and confirm your submission."
          serviceName="CAC Business Registration"
          serviceCode="CAC_REGISTRATION"
          servicePrice={servicePrice}
          walletBalance={userBalance}
          reviewDetails={[
            { label: 'Category', value: regType },
            { label: 'Proposed Name', value: proposedName1 },
            { label: 'Proprietor', value: proprietorName },
            { label: 'Phone', value: proprietorPhone }
          ]}
          onConfirm={handleExecutePayment}
          isProcessing={processing}
          actionButtonText="Authorize & File Application"
          processingText="Submitting Application..."
        />
      )}
    </div>
  );
};
