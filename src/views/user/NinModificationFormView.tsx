import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Service, VerificationRequest } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { ServiceAuthorizationModal } from '../../components/common/ServiceAuthorizationModal';
import {
  UserCheck,
  Calendar,
  PhoneCall,
  Home,
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
  Briefcase,
  Users
} from 'lucide-react';

export type ModificationType = 'name' | 'dob' | 'phone' | 'address';

interface NinModificationFormViewProps {
  type: ModificationType;
}

export const NinModificationFormView: React.FC<NinModificationFormViewProps> = ({ type }) => {
  const { user, wallet, refreshWallet, navigate } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [, setLoadingService] = useState(true);

  // Common Field
  const [nin, setNin] = useState('');

  // 1A. Name Modification Fields
  const [surname, setSurname] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');

  // 1B. DOB Modification Fields
  // Personal Info
  const [title, setTitle] = useState('');
  const [gender, setGender] = useState('');
  const [newDob, setNewDob] = useState('');
  const [phone, setPhone] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  // Address Details
  const [town, setTown] = useState('');
  const [cityOfResidence, setCityOfResidence] = useState('');
  const [stateOfResidence, setStateOfResidence] = useState('');
  const [lgaOfResidence, setLgaOfResidence] = useState('');
  const [addressOfResidence, setAddressOfResidence] = useState('');
  const [stateOfOrigin, setStateOfOrigin] = useState('');
  const [lgaOfOrigin, setLgaOfOrigin] = useState('');
  // Birth Details
  const [stateOfBirth, setStateOfBirth] = useState('');
  const [lgaOfBirth, setLgaOfBirth] = useState('');
  const [townOfBirth, setTownOfBirth] = useState('');
  // Place of Work
  const [placeOfWork, setPlaceOfWork] = useState('');
  // Father's Details
  const [fatherSurname, setFatherSurname] = useState('');
  const [fatherFirstName, setFatherFirstName] = useState('');
  const [fatherStateOfOrigin, setFatherStateOfOrigin] = useState('');
  const [fatherLga, setFatherLga] = useState('');
  const [fatherTown, setFatherTown] = useState('');
  // Mother's Details
  const [motherSurname, setMotherSurname] = useState('');
  const [motherFirstName, setMotherFirstName] = useState('');
  const [motherMaidenName, setMotherMaidenName] = useState('');
  const [motherStateOfOrigin, setMotherStateOfOrigin] = useState('');
  const [motherLga, setMotherLga] = useState('');
  const [motherTown, setMotherTown] = useState('');

  // 1C. Phone Modification Fields
  const [newPhone, setNewPhone] = useState('');

  // 1D. Address Modification Fields
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [townCity, setTownCity] = useState('');
  const [addrLga, setAddrLga] = useState('');
  const [addrState, setAddrState] = useState('');

  // Common Consent
  const [agreed, setAgreed] = useState(false);

  // Modal & Flow states
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<VerificationRequest | null>(null);

  const configMap = {
    name: {
      code: 'NIN_NAME_MOD',
      title: 'Name Modification',
      buttonLabel: 'Submit Name Change',
      defaultPrice: 4500,
      icon: UserCheck
    },
    dob: {
      code: 'NIN_DOB_MOD',
      title: 'Date of Birth Modification',
      buttonLabel: 'Submit DOB Change',
      defaultPrice: 50000,
      icon: Calendar
    },
    phone: {
      code: 'NIN_PHONE_MOD',
      title: 'Phone Number Modification',
      buttonLabel: 'Submit Phone Change',
      defaultPrice: 4500,
      icon: PhoneCall
    },
    address: {
      code: 'NIN_ADDRESS_MOD',
      title: 'Address Modification',
      buttonLabel: 'Submit Address Change',
      defaultPrice: 4500,
      icon: Home
    }
  };

  const currentConfig = configMap[type];

  useEffect(() => {
    async function loadService() {
      try {
        const services: Service[] = await api.get('/services');
        const specific = services.find((s) => s.code === currentConfig.code);
        if (specific) setService(specific);
      } catch (err) {
        console.error('Failed to load service price:', err);
      } finally {
        setLoadingService(false);
      }
    }
    loadService();
  }, [type, currentConfig.code]);

  const servicePrice = service?.price ?? currentConfig.defaultPrice;
  const userBalance = wallet?.availableBalance ?? 0;
  const isBalanceSufficient = userBalance >= servicePrice;
  const balanceShortfall = servicePrice - userBalance;

  const validateForm = (): boolean => {
    setFormError(null);

    const cleanNin = nin.trim();
    if (!cleanNin || !/^\d{11}$/.test(cleanNin)) {
      setFormError('NIN Number must be exactly 11 numeric digits.');
      return false;
    }

    if (type === 'name') {
      if (!surname.trim()) {
        setFormError('Surname is required.');
        return false;
      }
      if (!firstName.trim()) {
        setFormError('First Name is required.');
        return false;
      }
    } else if (type === 'dob') {
      if (!title) {
        setFormError('Title is required (Personal Information).');
        return false;
      }
      if (!surname.trim()) {
        setFormError('Surname is required (Personal Information).');
        return false;
      }
      if (!firstName.trim()) {
        setFormError('First Name is required (Personal Information).');
        return false;
      }
      if (!gender) {
        setFormError('Gender is required (Personal Information).');
        return false;
      }
      if (!newDob) {
        setFormError('New Date of Birth (YYYY-MM-DD) is required.');
        return false;
      }
      if (!phone.trim()) {
        setFormError('Phone Number is required (Personal Information).');
        return false;
      }
      if (!maritalStatus) {
        setFormError('Marital Status is required (Personal Information).');
        return false;
      }
      // Address Details
      if (!town.trim() || !cityOfResidence.trim() || !stateOfResidence.trim() || !lgaOfResidence.trim() || !addressOfResidence.trim() || !stateOfOrigin.trim() || !lgaOfOrigin.trim()) {
        setFormError('All Address Details fields marked with * are required.');
        return false;
      }
      // Birth Details
      if (!stateOfBirth.trim() || !lgaOfBirth.trim() || !townOfBirth.trim()) {
        setFormError('All Birth Details fields marked with * are required.');
        return false;
      }
      // Father's Details
      if (!fatherSurname.trim() || !fatherFirstName.trim() || !fatherStateOfOrigin.trim() || !fatherLga.trim() || !fatherTown.trim()) {
        setFormError("All Father's Details marked with * are required.");
        return false;
      }
      // Mother's Details
      if (!motherSurname.trim() || !motherFirstName.trim() || !motherStateOfOrigin.trim() || !motherLga.trim() || !motherTown.trim()) {
        setFormError("All Mother's Details marked with * are required.");
        return false;
      }
    } else if (type === 'phone') {
      const cleanPhone = newPhone.trim();
      if (!cleanPhone || !/^(0|234)[789][01]\d{8}$/.test(cleanPhone)) {
        setFormError('Please enter a valid 11-digit Nigerian New Phone Number.');
        return false;
      }
    } else if (type === 'address') {
      if (!addressLine1.trim() || !townCity.trim() || !addrLga.trim() || !addrState.trim()) {
        setFormError('Address Line 1, Town/City, LGA, and State are required.');
        return false;
      }
    }

    if (!agreed) {
      setFormError('You must confirm that all details provided are accurate and authentic.');
      return false;
    }

    return true;
  };

  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!isBalanceSufficient) {
      setFormError(
        `Insufficient wallet balance. You need ${formatCurrency(servicePrice)}, but have ${formatCurrency(userBalance)}. Please fund your wallet with ${formatCurrency(balanceShortfall)} to proceed.`
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
      modificationCategory: type,
      declarationAccepted: true
    };

    if (type === 'name') {
      searchData.surname = surname.trim();
      searchData.firstName = firstName.trim();
      searchData.middleName = middleName.trim();
    } else if (type === 'dob') {
      searchData.title = title;
      searchData.surname = surname.trim();
      searchData.firstName = firstName.trim();
      searchData.gender = gender;
      searchData.newDob = newDob;
      searchData.phone = phone.trim();
      searchData.maritalStatus = maritalStatus;

      searchData.town = town.trim();
      searchData.cityOfResidence = cityOfResidence.trim();
      searchData.stateOfResidence = stateOfResidence.trim();
      searchData.lgaOfResidence = lgaOfResidence.trim();
      searchData.addressOfResidence = addressOfResidence.trim();
      searchData.stateOfOrigin = stateOfOrigin.trim();
      searchData.lgaOfOrigin = lgaOfOrigin.trim();

      searchData.stateOfBirth = stateOfBirth.trim();
      searchData.lgaOfBirth = lgaOfBirth.trim();
      searchData.townOfBirth = townOfBirth.trim();

      searchData.placeOfWork = placeOfWork.trim();

      searchData.fatherSurname = fatherSurname.trim();
      searchData.fatherFirstName = fatherFirstName.trim();
      searchData.fatherStateOfOrigin = fatherStateOfOrigin.trim();
      searchData.fatherLga = fatherLga.trim();
      searchData.fatherTown = fatherTown.trim();

      searchData.motherSurname = motherSurname.trim();
      searchData.motherFirstName = motherFirstName.trim();
      searchData.motherMaidenName = motherMaidenName.trim();
      searchData.motherStateOfOrigin = motherStateOfOrigin.trim();
      searchData.motherLga = motherLga.trim();
      searchData.motherTown = motherTown.trim();
    } else if (type === 'phone') {
      searchData.newPhone = newPhone.trim();
    } else if (type === 'address') {
      searchData.addressLine1 = addressLine1.trim();
      searchData.addressLine2 = addressLine2.trim();
      searchData.townCity = townCity.trim();
      searchData.lga = addrLga.trim();
      searchData.state = addrState.trim();
    }

    try {
      const response = await api.post('/service-requests/submit', {
        serviceCode: currentConfig.code,
        submittedData: searchData,
        idempotencyKey: `idem_ninmod_${type}_${nin.trim()}_${Date.now()}`
      });

      setConfirmModalOpen(false);
      setSubmissionSuccess({
        ...response.request,
        trackingId: response.trackingId || response.ticketId || response.request?.ticketId,
        serviceName: currentConfig.title,
        amountCharged: response.amountCharged || response.amount || servicePrice,
        status: response.status || 'PENDING'
      });
      await refreshWallet();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit modification request. Please try again.');
      setConfirmModalOpen(false);
    } finally {
      setProcessing(false);
    }
  };

  const Icon = currentConfig.icon;

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
              Your request for <strong>{currentConfig.title}</strong> has been received and queued for administrative processing.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-left space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Service:</span>
              <span className="font-bold text-gray-900">{currentConfig.title}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Tracking ID:</span>
              <span className="font-bold text-orange-600 tracking-wider text-sm select-all">{trackingId}</span>
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

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left flex items-start gap-3 text-xs text-amber-900">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Turnaround Notice</p>
              <p className="text-amber-800">
                Your request has been forwarded to authorized operations officers. You can track this request anytime in your Service Requests dashboard.
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
                setNin('');
                setSurname('');
                setFirstName('');
                setMiddleName('');
                setNewDob('');
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <button
            onClick={() => navigate('/verify/modification')}
            className="hover:text-gray-900 transition-colors font-medium flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            MODIFICATION
          </button>
          <span>/</span>
          <span className="text-gray-900 font-bold">{currentConfig.title}</span>
        </div>

        <button
          onClick={() => navigate('/verify/modification')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm"
        >
          <span>Choose Different Service</span>
        </button>
      </div>

      {/* Main Form Container */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-b from-gray-50/50 to-white">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00]">
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border bg-amber-50 text-amber-700 border-amber-200">
                NIMC SERVICE
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                NIN Modification Service
              </h1>
              <p className="text-xs text-gray-500">{currentConfig.title}</p>
            </div>
          </div>

          <div className="text-left sm:text-right bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
            <span className="block text-[11px] font-bold uppercase text-gray-400">Cost</span>
            <span className="text-2xl font-black text-gray-950 font-mono tracking-tight">
              {formatCurrency(servicePrice)}
            </span>
          </div>
        </div>

        {/* DOB Instruction */}
        {type === 'dob' && (
          <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-medium">
              Please enter your NIN and all required details for DOB modification.
            </p>
          </div>
        )}

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
          {/* 1A. NAME MODIFICATION */}
          {type === 'name' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  NIN Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
                  placeholder="11-digit NIN"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-mono font-bold outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Surname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="Enter surname"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">Middle Name</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Enter middle name (optional)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                />
              </div>
            </div>
          )}

          {/* 1B. DATE OF BIRTH MODIFICATION */}
          {type === 'dob' && (
            <div className="space-y-8">
              {/* SECTION: PERSONAL INFORMATION */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <User className="w-4 h-4 text-[#FF6B00]" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    Section: Personal Information
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      NIN Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      value={nin}
                      onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
                      placeholder="11-digit NIN"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-mono font-bold outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none bg-white"
                      required
                    >
                      <option value="">Select Title</option>
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Miss">Miss</option>
                      <option value="Chief">Chief</option>
                      <option value="Dr">Dr</option>
                      <option value="Alhaji">Alhaji</option>
                      <option value="Hajiya">Hajiya</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Surname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value)}
                      placeholder="Enter surname"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter first name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none bg-white"
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      New Date of Birth (YYYY-MM-DD) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newDob}
                      onChange={(e) => setNewDob(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 08012345678"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Marital Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none bg-white"
                    required
                  >
                    <option value="">Select Marital Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
              </div>

              {/* SECTION: ADDRESS DETAILS */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <MapPin className="w-4 h-4 text-[#FF6B00]" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    Section: Address Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Town <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={town}
                      onChange={(e) => setTown(e.target.value)}
                      placeholder="Enter town"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      City of Residence <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={cityOfResidence}
                      onChange={(e) => setCityOfResidence(e.target.value)}
                      placeholder="Enter city of residence"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      State of Residence <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={stateOfResidence}
                      onChange={(e) => setStateOfResidence(e.target.value)}
                      placeholder="e.g. Lagos, Enugu, Kano"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      LGA of Residence <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={lgaOfResidence}
                      onChange={(e) => setLgaOfResidence(e.target.value)}
                      placeholder="Enter LGA of residence"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Address of Residence <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressOfResidence}
                    onChange={(e) => setAddressOfResidence(e.target.value)}
                    placeholder="Enter detailed street address"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      State of Origin <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={stateOfOrigin}
                      onChange={(e) => setStateOfOrigin(e.target.value)}
                      placeholder="Enter state of origin"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
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
                      placeholder="Enter LGA of origin"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: BIRTH DETAILS */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Calendar className="w-4 h-4 text-[#FF6B00]" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    Section: Birth Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      State of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={stateOfBirth}
                      onChange={(e) => setStateOfBirth(e.target.value)}
                      placeholder="Enter state of birth"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
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
                      placeholder="Enter LGA of birth"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
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
                      placeholder="Enter town of birth"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: PLACE OF WORK */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Briefcase className="w-4 h-4 text-[#FF6B00]" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    Section: Place of Work
                  </h2>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">Place of Work</label>
                  <input
                    type="text"
                    value={placeOfWork}
                    onChange={(e) => setPlaceOfWork(e.target.value)}
                    placeholder="Enter employer or place of work"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* SECTION: FATHER'S DETAILS */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Users className="w-4 h-4 text-[#FF6B00]" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    Section: Father&apos;s Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Father&apos;s Surname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fatherSurname}
                      onChange={(e) => setFatherSurname(e.target.value)}
                      placeholder="Father's surname"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Father&apos;s First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fatherFirstName}
                      onChange={(e) => setFatherFirstName(e.target.value)}
                      placeholder="Father's first name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Father&apos;s State of Origin <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fatherStateOfOrigin}
                      onChange={(e) => setFatherStateOfOrigin(e.target.value)}
                      placeholder="State of origin"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Father&apos;s LGA <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fatherLga}
                      onChange={(e) => setFatherLga(e.target.value)}
                      placeholder="Father's LGA"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Father&apos;s Town <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fatherTown}
                      onChange={(e) => setFatherTown(e.target.value)}
                      placeholder="Father's town"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: MOTHER'S DETAILS */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Users className="w-4 h-4 text-[#FF6B00]" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    Section: Mother&apos;s Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Mother&apos;s Surname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={motherSurname}
                      onChange={(e) => setMotherSurname(e.target.value)}
                      placeholder="Mother's surname"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Mother&apos;s First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={motherFirstName}
                      onChange={(e) => setMotherFirstName(e.target.value)}
                      placeholder="Mother's first name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Mother&apos;s Maiden Name
                    </label>
                    <input
                      type="text"
                      value={motherMaidenName}
                      onChange={(e) => setMotherMaidenName(e.target.value)}
                      placeholder="Mother's maiden name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Mother&apos;s State of Origin <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={motherStateOfOrigin}
                      onChange={(e) => setMotherStateOfOrigin(e.target.value)}
                      placeholder="Mother's state"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Mother&apos;s LGA <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={motherLga}
                      onChange={(e) => setMotherLga(e.target.value)}
                      placeholder="Mother's LGA"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Mother&apos;s Town <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={motherTown}
                      onChange={(e) => setMotherTown(e.target.value)}
                      placeholder="Mother's town"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1C. PHONE NUMBER MODIFICATION */}
          {type === 'phone' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  NIN Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
                  placeholder="11-digit NIN"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-mono font-bold outline-none"
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
                  placeholder="e.g. 08012345678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-mono font-bold outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* 1D. ADDRESS MODIFICATION */}
          {type === 'address' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  NIN Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
                  placeholder="11-digit NIN"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-mono font-bold outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="House number, street name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">Address Line 2</label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Suite, apartment, landmark (optional)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Town/City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={townCity}
                    onChange={(e) => setTownCity(e.target.value)}
                    placeholder="Enter town/city"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    LGA <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addrLga}
                    onChange={(e) => setAddrLga(e.target.value)}
                    placeholder="Enter LGA"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                    placeholder="Enter state"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF6B00] text-xs font-semibold outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Legal / Accuracy Declaration */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer text-xs text-gray-700 select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded text-[#FF6B00] focus:ring-[#FF6B00]"
                required
              />
              <span>
                I solemnly certify and declare that the information submitted above is true, complete, and legally accurate. I understand that false identity declarations are punishable under NIMC regulations.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={!isBalanceSufficient}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-[#FF6B00] hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{currentConfig.buttonLabel}</span>
              <span className="font-mono text-white/80">({formatCurrency(servicePrice)})</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/verify/modification')}
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
          title="Confirm Modification Request"
          subtitle="Review modification request parameters and confirm your submission."
          serviceName={`NIN Modification (${currentConfig.title})`}
          serviceCode={currentConfig.code}
          servicePrice={servicePrice}
          walletBalance={userBalance}
          reviewDetails={[
            { label: 'Category', value: currentConfig.title },
            { label: 'NIN Number', value: nin }
          ]}
          turnaroundNote="Turnaround Time: Official NIMC modification updates take 2 to 3 business days to sync."
          onConfirm={handleExecutePayment}
          isProcessing={processing}
          actionButtonText="Authorize Modification"
          processingText="Submitting Modification..."
        />
      )}
    </div>
  );
};
