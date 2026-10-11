import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Service, VerificationRequest } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { ServiceAuthorizationModal } from '../../components/common/ServiceAuthorizationModal';
import {
  Baby,
  ArrowLeft,
  ShieldCheck,
  Lock,
  AlertCircle,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  User,
  MapPin,
  Building2,
  Home,
  Users,
  AlertTriangle
} from 'lucide-react';

export const BirthAttestationFormView: React.FC = () => {
  const { user, wallet, refreshWallet, navigate } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [loadingService, setLoadingService] = useState(true);

  // SECTION 1: Applicant / Personal Details
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [dob, setDob] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');

  // SECTION 2: Place / Origin Details
  const [stateOfOrigin, setStateOfOrigin] = useState('');
  const [lgaOfOrigin, setLgaOfOrigin] = useState('');
  const [townVillage, setTownVillage] = useState('');

  // SECTION 3: Place of Birth
  const [hospitalPlaceOfBirth, setHospitalPlaceOfBirth] = useState('');
  const [townOfBirth, setTownOfBirth] = useState('');
  const [lgaOfBirth, setLgaOfBirth] = useState('');
  const [stateOfBirth, setStateOfBirth] = useState('');

  // SECTION 4: Residential Address
  const [residentialAddress, setResidentialAddress] = useState('');
  const [cityTown, setCityTown] = useState('');
  const [stateOfResidence, setStateOfResidence] = useState('');

  // SECTION 5: Father's Details
  const [fatherFullName, setFatherFullName] = useState('');
  const [fatherStateOfOrigin, setFatherStateOfOrigin] = useState('');
  const [fatherLga, setFatherLga] = useState('');

  // SECTION 6: Mother's Details
  const [motherFullName, setMotherFullName] = useState('');
  const [motherStateOfOrigin, setMotherStateOfOrigin] = useState('');
  const [motherLga, setMotherLga] = useState('');

  // SECTION 7: Submission & Consent
  const [agreed, setAgreed] = useState(false);

  // States
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<VerificationRequest | null>(null);

  // Load Service to get exact configured price (default ₦15,000.00)
  useEffect(() => {
    async function load() {
      try {
        const list: Service[] = await api.get('/services');
        const s = list.find((item) => item.code === 'BIRTH_ATTESTATION');
        if (s) setService(s);
      } catch (err) {
        console.error('Failed to load service:', err);
      } finally {
        setLoadingService(false);
      }
    }
    load();
  }, []);

  const servicePrice = service?.price ?? 15000;
  const userBalance = wallet?.availableBalance ?? 0;
  const isBalanceSufficient = userBalance >= servicePrice;
  const balanceShortfall = servicePrice - userBalance;

  const validateForm = (): boolean => {
    setFormError(null);

    // Section 1 checks
    if (!fullName.trim()) {
      setFormError('Please provide the Applicant Legal Full Name (Section 1).');
      return false;
    }
    if (!dob) {
      setFormError('Please select the Applicant Date of Birth (Section 1).');
      return false;
    }
    if (!phoneNumber.trim()) {
      setFormError('Please provide a contact Phone Number (Section 1).');
      return false;
    }

    // Section 2 checks
    if (!stateOfOrigin.trim() || !lgaOfOrigin.trim() || !townVillage.trim()) {
      setFormError('Please complete all Place / Origin Details: State, LGA, and Town/Village (Section 2).');
      return false;
    }

    // Section 3 checks
    if (!hospitalPlaceOfBirth.trim() || !townOfBirth.trim() || !lgaOfBirth.trim() || !stateOfBirth.trim()) {
      setFormError('Please complete all Place of Birth Details: Hospital/Place, Town, LGA, and State (Section 3).');
      return false;
    }

    // Section 4 checks
    if (!residentialAddress.trim() || !cityTown.trim() || !stateOfResidence.trim()) {
      setFormError('Please complete the Residential Address fields (Section 4).');
      return false;
    }

    // Section 5 checks
    if (!fatherFullName.trim() || !fatherStateOfOrigin.trim()) {
      setFormError("Please provide Father's Full Name and State of Origin (Section 5).");
      return false;
    }

    // Section 6 checks
    if (!motherFullName.trim() || !motherStateOfOrigin.trim()) {
      setFormError("Please provide Mother's Maiden/Full Name and State of Origin (Section 6).");
      return false;
    }

    // Section 7 checks
    if (!agreed) {
      setFormError('You must review and agree to the declaration in Section 7.');
      return false;
    }

    return true;
  };

  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!isBalanceSufficient) {
      setFormError(
        `Insufficient wallet balance. You have ${formatCurrency(userBalance)}, but this service costs ${formatCurrency(servicePrice)}. Please fund your wallet with at least ${formatCurrency(balanceShortfall)} to continue.`
      );
      return;
    }

    setConfirmModalOpen(true);
  };

  const handleExecutePayment = async () => {
    setProcessing(true);
    setFormError(null);

    const searchData = {
      applicant: {
        fullName: fullName.trim(),
        gender,
        dob,
        phoneNumber: phoneNumber.trim(),
        emailAddress: emailAddress.trim()
      },
      origin: {
        stateOfOrigin: stateOfOrigin.trim(),
        lgaOfOrigin: lgaOfOrigin.trim(),
        townVillage: townVillage.trim()
      },
      birthPlace: {
        hospitalPlaceOfBirth: hospitalPlaceOfBirth.trim(),
        townOfBirth: townOfBirth.trim(),
        lgaOfBirth: lgaOfBirth.trim(),
        stateOfBirth: stateOfBirth.trim()
      },
      residence: {
        residentialAddress: residentialAddress.trim(),
        cityTown: cityTown.trim(),
        stateOfResidence: stateOfResidence.trim()
      },
      father: {
        fullName: fatherFullName.trim(),
        stateOfOrigin: fatherStateOfOrigin.trim(),
        lga: fatherLga.trim()
      },
      mother: {
        fullName: motherFullName.trim(),
        stateOfOrigin: motherStateOfOrigin.trim(),
        lga: motherLga.trim()
      },
      declarationAccepted: true
    };

    try {
      const response = await api.post('/service-requests/submit', {
        serviceCode: 'BIRTH_ATTESTATION',
        submittedData: searchData,
        idempotencyKey: `idem_birth_att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      });

      setConfirmModalOpen(false);
      setSubmissionSuccess({
        ...response.request,
        trackingId: response.trackingId || response.ticketId || response.request?.ticketId,
        serviceName: 'Birth Attestation',
        amountCharged: response.amountCharged || response.amount || servicePrice,
        status: response.status || 'PENDING'
      });
      await refreshWallet();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit Birth Attestation. Please try again.');
      setConfirmModalOpen(false);
    } finally {
      setProcessing(false);
    }
  };

  // Submission Outcome Screen
  if (submissionSuccess) {
    const trackingId = (submissionSuccess as any).trackingId || submissionSuccess.reference || (submissionSuccess as any).ticketId;
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full mx-auto flex items-center justify-center ring-8 ring-emerald-50">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900">
              Service request submitted successfully.
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto">
              Your official Birth Attestation application has been recorded and queued for administrative fulfillment.
            </p>
          </div>

          {/* Reference Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-left space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Service:</span>
              <span className="font-bold text-gray-900">Birth Attestation</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Tracking ID:</span>
              <span className="font-bold text-orange-600 tracking-wider text-sm select-all">{trackingId}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Applicant:</span>
              <span className="font-bold text-gray-900">{fullName}</span>
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

          {/* Notice Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left flex items-start gap-3 text-xs text-amber-950">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Official Processing Period</p>
              <p className="text-amber-900 font-medium">
                NOTE: This Service Takes 3 to 4 days To Be Processed. You can track this request in your History tab.
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
                setAgreed(false);
                setFullName('');
              }}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors"
            >
              Submit Another Attestation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Navigation Breadcrumb & Quick Action */}
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
          <span className="text-gray-900 font-bold">Attestation Form</span>
        </div>

        <button
          onClick={() => navigate('/services')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm"
        >
          <span>Choose Different Service</span>
        </button>
      </div>

      {/* Warning / Notice Banner (User Mandate) */}
      <div className="rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 p-4 text-amber-950 flex items-start gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-xs">
          <p className="font-extrabold uppercase tracking-wide text-amber-950">
            PROCESSING TIMELINE NOTICE
          </p>
          <p className="text-amber-950 font-bold">
            NOTE: This Service Takes 3 to 4 days To Be Processed.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Form Header */}
        <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-b from-purple-50/40 to-white">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-purple-500/15 text-purple-600">
              <Baby className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border bg-purple-50 text-purple-700 border-purple-200">
                  Civil Registry (NPC)
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                Birth Attestation
              </h1>
              <p className="text-xs text-gray-500">National Population Commission (NPC) Official Attestation</p>
            </div>
          </div>

          <div className="text-left sm:text-right bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
            <span className="block text-[11px] font-bold uppercase text-gray-400">Service Fee</span>
            <span className="text-2xl font-black text-gray-950 font-mono tracking-tight">
              {formatCurrency(servicePrice)}
            </span>
            <span className="block text-[11px] font-semibold text-gray-500 mt-0.5">
              This service will cost you {formatCurrency(servicePrice)}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {formError && (
          <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Please correct the following</p>
              <p>{formError}</p>
            </div>
          </div>
        )}

        {/* Wallet Shortfall Banner */}
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
              onClick={() => navigate('/wallet/fund')}
              className="px-4 py-2 rounded-xl bg-[#FF6B00] text-white font-bold text-xs hover:bg-orange-600 transition-colors shadow-sm shrink-0"
            >
              Fund Wallet Now
            </button>
          </div>
        )}

        {/* 7 STRUCTURED SECTIONS */}
        <form onSubmit={handleOpenReview} className="p-6 sm:p-8 space-y-8">
          {/* SECTION 1: Applicant / Personal Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <User className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Section 1: Applicant / Personal Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Full Name (Legal Name on Records) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Chukwuemeka Emmanuel Okafor"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-semibold outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-semibold outline-none bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-semibold outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Email Address
                </label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="e.g. applicant@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Place / Origin Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <MapPin className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Section 2: Place / Origin Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  State of Origin <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={stateOfOrigin}
                  onChange={(e) => setStateOfOrigin(e.target.value)}
                  placeholder="e.g. Imo State"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  LGA of Origin <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lgaOfOrigin}
                  onChange={(e) => setLgaOfOrigin(e.target.value)}
                  placeholder="e.g. Owerri Municipal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Town / Village <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={townVillage}
                  onChange={(e) => setTownVillage(e.target.value)}
                  placeholder="e.g. Umuahia / Village name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Place of Birth */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Building2 className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Section 3: Place of Birth
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Hospital / Place of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={hospitalPlaceOfBirth}
                  onChange={(e) => setHospitalPlaceOfBirth(e.target.value)}
                  placeholder="e.g. General Hospital / Maternity Home"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Town of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={townOfBirth}
                  onChange={(e) => setTownOfBirth(e.target.value)}
                  placeholder="e.g. Ikeja"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  LGA of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lgaOfBirth}
                  onChange={(e) => setLgaOfBirth(e.target.value)}
                  placeholder="e.g. Ikeja LGA"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  State of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={stateOfBirth}
                  onChange={(e) => setStateOfBirth(e.target.value)}
                  placeholder="e.g. Lagos State"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Residential Address */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Home className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Section 4: Residential Address
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3 space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Current Residential Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={residentialAddress}
                  onChange={(e) => setResidentialAddress(e.target.value)}
                  placeholder="e.g. 15 Admiralty Way, Lekki Phase 1"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  City / Town <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cityTown}
                  onChange={(e) => setCityTown(e.target.value)}
                  placeholder="e.g. Lekki"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-bold text-gray-800">
                  State of Residence <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={stateOfResidence}
                  onChange={(e) => setStateOfResidence(e.target.value)}
                  placeholder="e.g. Lagos State"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Father's Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Users className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Section 5: Father's Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Father's Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fatherFullName}
                  onChange={(e) => setFatherFullName(e.target.value)}
                  placeholder="Enter Father's Name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Father's State of Origin <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fatherStateOfOrigin}
                  onChange={(e) => setFatherStateOfOrigin(e.target.value)}
                  placeholder="State of Origin"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Father's LGA
                </label>
                <input
                  type="text"
                  value={fatherLga}
                  onChange={(e) => setFatherLga(e.target.value)}
                  placeholder="Local Government Area"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 6: Mother's Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Users className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Section 6: Mother's Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Mother's Maiden / Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={motherFullName}
                  onChange={(e) => setMotherFullName(e.target.value)}
                  placeholder="Enter Mother's Name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Mother's State of Origin <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={motherStateOfOrigin}
                  onChange={(e) => setMotherStateOfOrigin(e.target.value)}
                  placeholder="State of Origin"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Mother's LGA
                </label>
                <input
                  type="text"
                  value={motherLga}
                  onChange={(e) => setMotherLga(e.target.value)}
                  placeholder="Local Government Area"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 text-xs font-medium outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 7: Submission & Consent */}
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 pb-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Section 7: Submission & Consent
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <div className="text-xs text-purple-950 space-y-1">
                  <p className="font-bold">Declaration & Authorization</p>
                  <p className="leading-relaxed text-purple-900">
                    I solemnly declare that all personal and parental records stated in Sections 1 through 6 are true, complete, and legally correct. I authorize UGOPAWAVERIFY to submit this application to the National Population Commission (NPC) for processing.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Submission Action Bar */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>NOTE: This Service Takes 3 to 4 days To Be Processed</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate('/services')}
                className="flex-1 sm:flex-initial px-5 py-3 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors"
              >
                Choose Different Service
              </button>

              <button
                type="submit"
                disabled={!isBalanceSufficient}
                className={`flex-1 sm:flex-initial px-8 py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                  isBalanceSufficient
                    ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>Submit Application</span>
                <span className="font-mono font-black text-white/90">({formatCurrency(servicePrice)})</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Review & Authorization Modal */}
      {confirmModalOpen && (
        <ServiceAuthorizationModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title="Confirm Birth Attestation Request"
          subtitle="Review attestation details and confirm your submission."
          serviceName="Birth Attestation (NPC)"
          serviceCode="BIRTH_ATTESTATION"
          servicePrice={servicePrice}
          walletBalance={userBalance}
          reviewDetails={[
            { label: 'Applicant', value: fullName },
            { label: 'Gender', value: gender },
            { label: 'Date of Birth', value: dob },
            { label: 'State of Origin', value: stateOfOrigin }
          ]}
          turnaroundNote="Turnaround Time: This official NPC birth attestation takes 3 to 4 business days to process."
          onConfirm={handleExecutePayment}
          isProcessing={processing}
          actionButtonText="Authorize & Submit"
          processingText="Submitting Attestation..."
        />
      )}
    </div>
  );
};
