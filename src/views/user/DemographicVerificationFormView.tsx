import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Service, VerificationRequest, VerificationResult } from '../../types';
import { VerificationSlip } from '../../components/common/VerificationSlip';
import { formatCurrency } from '../../utils/currency';
import { ServiceAuthorizationModal } from '../../components/common/ServiceAuthorizationModal';
import {
  UserCheck,
  User,
  Calendar,
  Lock,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Wallet,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Info
} from 'lucide-react';

export const DemographicVerificationFormView: React.FC = () => {
  const { user, wallet, refreshWallet, navigate } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [loadingService, setLoadingService] = useState(true);

  // Form Fields as explicitly requested:
  // First name, Last name, Gender, Date of birth
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [dob, setDob] = useState('');

  // Execution & Modal States
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // Results state
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    async function loadService() {
      try {
        const list: Service[] = await api.get('/services');
        const match = list.find(
          (s) => s.code.toUpperCase() === 'DEMOGRAPHIC_VERIFICATION' || s.code.toUpperCase() === 'DEMOGRAPHIC'
        );
        if (match) {
          setService(match);
        } else {
          // Fallback if not yet synced in local memory
          setService({
            id: 'srv_demographic_ver_21',
            code: 'DEMOGRAPHIC_VERIFICATION',
            name: 'Demographic Verification',
            description: 'Verify identity records by matching demographic criteria: First Name, Last Name, Gender, and Date of Birth.',
            price: 1200,
            status: 'ACTIVE',
            icon: 'UserCheck',
            category: 'Identity Verification',
            providerMapping: 'demographic_verification',
            displayOrder: 21,
            requiredFields: [
              { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'Enter first name', required: true },
              { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Enter last name', required: true },
              { name: 'gender', label: 'Gender', type: 'select', placeholder: 'Select gender', required: true, options: ['Male', 'Female'] },
              { name: 'dob', label: 'Date of Birth', type: 'date', placeholder: 'YYYY-MM-DD', required: true }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('Failed to load demographic verification service:', err);
      } finally {
        setLoadingService(false);
      }
    }
    loadService();
  }, []);

  const serviceFee = service?.price ?? 1200;
  const userBalance = wallet?.availableBalance ?? 0;
  const isBalanceSufficient = userBalance >= serviceFee;

  const handleInitiate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!firstName.trim()) {
      setFormError('Please enter the First name.');
      return;
    }
    if (!lastName.trim()) {
      setFormError('Please enter the Last name (Surname).');
      return;
    }
    if (!gender) {
      setFormError('Please select Gender (Male or Female).');
      return;
    }
    if (!dob.trim()) {
      setFormError('Please enter Date of birth.');
      return;
    }

    if (!isBalanceSufficient) {
      setFormError(
        `Insufficient balance (${formatCurrency(userBalance)}). Required: ${formatCurrency(serviceFee)}. Please fund your wallet.`
      );
      return;
    }

    // Set unique idempotency key
    const newKey = `idem_demo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setIdempotencyKey(newKey);
    setConfirmModalOpen(true);
  };

  const handleConfirmAndExecute = async () => {
    setProcessing(true);
    setFormError(null);

    try {
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      const cleanDob = dob.trim();

      const response = await api.post('/verifications/execute', {
        serviceCode: service?.code || 'DEMOGRAPHIC_VERIFICATION',
        searchData: {
          firstName: trimmedFirst,
          firstname: trimmedFirst,
          lastName: trimmedLast,
          lastname: trimmedLast,
          surname: trimmedLast,
          gender: gender,
          dob: cleanDob,
          dateOfBirth: cleanDob
        },
        idempotencyKey
      });

      setConfirmModalOpen(false);
      setVerificationRequest(response.request);
      setVerificationResult(response.result || null);
      await refreshWallet();
    } catch (err: any) {
      setFormError(err.message || 'Demographic verification execution failed.');
      setConfirmModalOpen(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setVerificationRequest(null);
    setVerificationResult(null);
    setFirstName('');
    setLastName('');
    setGender('');
    setDob('');
    setFormError(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/verify')}
          className="p-2 rounded-xl text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
          title="Back to Services"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">
              Identity Verification
            </span>
            <span className="text-xs text-gray-400 font-mono">DEMOGRAPHIC_VERIFICATION</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight mt-1">
            Demographic Verification
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Verify and match official identity records using primary demographic credentials.
          </p>
        </div>
      </div>

      {/* If result exists, show official slip */}
      {verificationRequest ? (
        <VerificationSlip
          request={verificationRequest}
          result={verificationResult}
          onNewVerification={handleReset}
          onClose={handleReset}
        />
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Header Summary Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-gray-950">
                  Demographic Search Particulars
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enter First Name, Last Name, Gender, and Date of Birth as registered in national databases.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-200/80">
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Service Fee</span>
                <span className="font-black text-gray-950 font-mono text-sm sm:text-base">
                  {formatCurrency(serviceFee)}
                </span>
              </div>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Wallet Balance</span>
                <span className={`font-bold font-mono text-xs sm:text-sm ${isBalanceSufficient ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(userBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {formError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Verification Notice</p>
                <p className="mt-0.5">{formError}</p>
                {formError.includes('Insufficient') && (
                  <button
                    onClick={() => navigate('/wallet/fund')}
                    className="mt-2 inline-flex items-center gap-1 font-bold text-orange-600 hover:underline"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Fund Wallet Now</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* The Demographic Form */}
          <form onSubmit={handleInitiate} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="demographic-firstname"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-[#FF6B00] bg-white transition-colors"
                  />
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Applicant official legal first name</p>
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="demographic-lastname"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name (surname)"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-[#FF6B00] bg-white transition-colors"
                  />
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Applicant official surname</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Gender */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  id="demographic-gender"
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-[#FF6B00] bg-white transition-colors"
                >
                  <option value="">Select gender...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-1">Applicant registered gender</p>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="demographic-dob"
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-[#FF6B00] bg-white transition-colors"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Format: YYYY-MM-DD</p>
              </div>
            </div>

            {/* Informational Note */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Demographic Verification Standard:</span>
                <p className="mt-0.5 text-amber-900/90 leading-relaxed">
                  The criteria entered will be matched against accredited identity registries. Ensure the spelling matches the original registration slip or birth certificate.
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100">
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Protected by Verification Authorization & Idempotency Lock</span>
              </span>

              <button
                id="btn-proceed-demographic-verify"
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-extrabold text-sm hover:brightness-110 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>PROCEED TO VERIFY</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation & Authorization Modal */}
      {confirmModalOpen && (
        <ServiceAuthorizationModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title="Confirm Demographic Verification"
          subtitle="Review demographic criteria and authorize registry query."
          serviceName="Demographic Verification"
          serviceCode="DEMOGRAPHIC_VERIFICATION"
          servicePrice={serviceFee}
          walletBalance={userBalance}
          reviewDetails={[
            { label: 'Full Name', value: `${firstName} ${lastName}` },
            { label: 'Gender', value: gender },
            { label: 'Date of Birth', value: dob }
          ]}
          onConfirm={handleConfirmAndExecute}
          isProcessing={processing}
          actionButtonText="Authorize & Verify"
          processingText="Verifying Demographics..."
        />
      )}
    </div>
  );
};
