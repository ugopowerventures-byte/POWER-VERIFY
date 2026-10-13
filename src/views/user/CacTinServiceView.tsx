import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Service, VerificationRequest } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { ServiceAuthorizationModal } from '../../components/common/ServiceAuthorizationModal';
import {
  Briefcase,
  Building2,
  FileBadge,
  Receipt,
  ShieldCheck,
  Lock,
  AlertCircle,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  ArrowLeft,
  UploadCloud,
  FileText,
  User,
  MapPin,
  Check,
  Building
} from 'lucide-react';

export type CacTinSubKey = 'business_cac' | 'company_cac' | 'individual_tin' | 'company_tin';

export const CacTinServiceView: React.FC = () => {
  const { user, wallet, refreshWallet, navigate } = useAuth();

  const [activeTab, setActiveTab] = useState<CacTinSubKey>('business_cac');
  const [services, setServices] = useState<Service[]>([]);

  // 1 & 2: CAC Fields (Business CAC and Company CAC)
  const [proposedName1, setProposedName1] = useState('');
  const [proposedName2, setProposedName2] = useState('');
  const [businessNature, setBusinessNature] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [proprietorName, setProprietorName] = useState('');
  const [proprietorPhone, setProprietorPhone] = useState('');
  const [proprietorEmail, setProprietorEmail] = useState('');
  const [idType, setIdType] = useState('NIN');
  const [idNumber, setIdNumber] = useState('');
  const [shareCapital, setShareCapital] = useState('1,000,000');
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);

  // 3 & 4: TIN Fields (Individual TIN and Company TIN)
  const [taxpayerName, setTaxpayerName] = useState('');
  const [individualIdNumber, setIndividualIdNumber] = useState(''); // NIN or BVN
  const [dobOrIncorpDate, setDobOrIncorpDate] = useState('');
  const [tinPhone, setTinPhone] = useState('');
  const [tinEmail, setTinEmail] = useState('');
  const [tinAddress, setTinAddress] = useState('');
  const [taxState, setTaxState] = useState('');
  const [occupationOrActivity, setOccupationOrActivity] = useState('');
  const [rcOrBnNumber, setRcOrBnNumber] = useState('');

  // Consent
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
        setServices(list || []);
      } catch (err) {
        console.error('Failed to load services:', err);
      }
    }
    load();
  }, []);

  const subConfig: Record<
    CacTinSubKey,
    {
      title: string;
      subTitle: string;
      code: string;
      defaultPrice: number;
      icon: React.ElementType;
      badge: string;
      eta: string;
    }
  > = {
    business_cac: {
      title: 'Business CAC',
      subTitle: 'Register Sole Proprietorship / Enterprise with the Corporate Affairs Commission',
      code: 'BUSINESS_CAC',
      defaultPrice: 22000,
      icon: Building,
      badge: 'CAC Enterprise',
      eta: '2 to 3 weeks'
    },
    company_cac: {
      title: 'Company CAC',
      subTitle: 'Incorporate Private Limited Liability Company (LTD) with official CAC status',
      code: 'COMPANY_CAC',
      defaultPrice: 30000,
      icon: Building2,
      badge: 'CAC Incorporated',
      eta: '2 to 4 weeks'
    },
    individual_tin: {
      title: 'Individual TIN Registration',
      subTitle: 'Register Personal / Sole Trader Tax Identification Number with Joint Tax Board',
      code: 'TIN_INDIVIDUAL',
      defaultPrice: 1000,
      icon: Receipt,
      badge: 'JTB Personal',
      eta: '24 to 48 hours'
    },
    company_tin: {
      title: 'Company TIN Registration',
      subTitle: 'Register Corporate entity Tax Identification Number for businesses and LLCs',
      code: 'TIN_COMPANY',
      defaultPrice: 2500,
      icon: FileBadge,
      badge: 'JTB Corporate',
      eta: '24 to 48 hours'
    }
  };

  const currentConfig = subConfig[activeTab];

  // Price resolution
  let currentPrice = currentConfig.defaultPrice;
  const matchedSrv = services.find(
    (s) => s.code === currentConfig.code || s.name.toLowerCase() === currentConfig.title.toLowerCase()
  );
  if (matchedSrv && matchedSrv.price) {
    currentPrice = matchedSrv.price;
  }

  const userBalance = wallet?.availableBalance ?? 0;
  const isBalanceSufficient = userBalance >= currentPrice;
  const balanceShortfall = currentPrice - userBalance;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('document', file);
      const res = await api.post('/uploads/document', formData);
      setUploadedDocName(res.fileName || file.name);
    } catch {
      setUploadedDocName(file.name);
    }
  };

  const validateForm = (): boolean => {
    setFormError(null);

    if (activeTab === 'business_cac' || activeTab === 'company_cac') {
      if (!proposedName1.trim()) {
        setFormError('Please enter your primary Proposed Name.');
        return false;
      }
      if (!proposedName2.trim()) {
        setFormError('Please enter an alternative Proposed Name.');
        return false;
      }
      if (!businessNature.trim()) {
        setFormError('Please specify the principal nature / line of business.');
        return false;
      }
      if (!officeAddress.trim()) {
        setFormError('Please provide the physical registered office address in Nigeria.');
        return false;
      }
      if (!proprietorName.trim()) {
        setFormError(
          activeTab === 'company_cac'
            ? 'Please enter the Primary Director / Shareholder legal name.'
            : 'Please enter the Proprietor legal full name.'
        );
        return false;
      }
      const cleanPhone = proprietorPhone.trim();
      if (!cleanPhone || !/^(0|234)[789][01]\d{8}$/.test(cleanPhone)) {
        setFormError('Please enter a valid 11-digit phone number.');
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
    } else if (activeTab === 'individual_tin') {
      if (!taxpayerName.trim()) {
        setFormError('Please enter taxpayer legal full name.');
        return false;
      }
      const cleanId = individualIdNumber.trim();
      if (!cleanId || !/^\d{11}$/.test(cleanId)) {
        setFormError('Please enter a valid 11-digit NIN or BVN.');
        return false;
      }
      if (!dobOrIncorpDate) {
        setFormError('Please select taxpayer Date of Birth.');
        return false;
      }
      const cleanPhone = tinPhone.trim();
      if (!cleanPhone || !/^(0|234)[789][01]\d{8}$/.test(cleanPhone)) {
        setFormError('Please enter a valid 11-digit mobile phone number.');
        return false;
      }
      if (!tinEmail.trim() || !tinEmail.includes('@')) {
        setFormError('Please enter a valid email address.');
        return false;
      }
      if (!tinAddress.trim()) {
        setFormError('Please enter physical residential address.');
        return false;
      }
      if (!taxState.trim()) {
        setFormError('Please enter State of residence / tax jurisdiction.');
        return false;
      }
      if (!occupationOrActivity.trim()) {
        setFormError('Please enter taxpayer occupation or trade.');
        return false;
      }
    } else if (activeTab === 'company_tin') {
      if (!taxpayerName.trim()) {
        setFormError('Please enter registered corporate company / enterprise name.');
        return false;
      }
      if (!rcOrBnNumber.trim()) {
        setFormError('Please enter the CAC Registration Number (RC Number or BN Number).');
        return false;
      }
      if (!dobOrIncorpDate) {
        setFormError('Please select the official date of incorporation.');
        return false;
      }
      const cleanPhone = tinPhone.trim();
      if (!cleanPhone || !/^(0|234)[789][01]\d{8}$/.test(cleanPhone)) {
        setFormError('Please enter a valid corporate telephone number.');
        return false;
      }
      if (!tinEmail.trim() || !tinEmail.includes('@')) {
        setFormError('Please enter a valid corporate email address.');
        return false;
      }
      if (!tinAddress.trim()) {
        setFormError('Please enter registered company office address.');
        return false;
      }
      if (!taxState.trim()) {
        setFormError('Please enter state of operation / tax jurisdiction.');
        return false;
      }
      if (!occupationOrActivity.trim()) {
        setFormError('Please enter principal business activity.');
        return false;
      }
    }

    if (!agreed) {
      setFormError('You must confirm that all details provided are correct and authorize this filing.');
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
      mainService: 'CAC & TIN',
      cacTinType: currentConfig.title,
      subServiceKey: activeTab,
      declarationAccepted: true
    };

    if (activeTab === 'business_cac' || activeTab === 'company_cac') {
      searchData.registrationType = activeTab === 'business_cac' ? 'Business Name (Enterprise)' : 'Limited Liability Company (LLC)';
      searchData.proposedName1 = proposedName1.trim();
      searchData.proposedName2 = proposedName2.trim();
      searchData.businessNature = businessNature.trim();
      searchData.officeAddress = officeAddress.trim();
      searchData.proprietorName = proprietorName.trim();
      searchData.phone = proprietorPhone.trim();
      searchData.email = proprietorEmail.trim();
      searchData.idType = idType;
      searchData.idNumber = idNumber.trim();
      if (activeTab === 'company_cac') {
        searchData.shareCapital = shareCapital;
      }
      if (uploadedDocName) {
        searchData.uploadedDocument = uploadedDocName;
      }
    } else if (activeTab === 'individual_tin') {
      searchData.tinType = 'Individual TIN';
      searchData.taxpayerName = taxpayerName.trim();
      searchData.identifierNumber = individualIdNumber.trim();
      searchData.dateOfBirth = dobOrIncorpDate;
      searchData.phone = tinPhone.trim();
      searchData.email = tinEmail.trim();
      searchData.address = tinAddress.trim();
      searchData.taxState = taxState.trim();
      searchData.occupation = occupationOrActivity.trim();
    } else if (activeTab === 'company_tin') {
      searchData.tinType = 'Corporate / Non-Individual TIN';
      searchData.companyName = taxpayerName.trim();
      searchData.rcOrBnNumber = rcOrBnNumber.trim();
      searchData.incorporationDate = dobOrIncorpDate;
      searchData.phone = tinPhone.trim();
      searchData.email = tinEmail.trim();
      searchData.officeAddress = tinAddress.trim();
      searchData.taxState = taxState.trim();
      searchData.businessActivity = occupationOrActivity.trim();
    }

    try {
      const response = await api.post('/service-requests/submit', {
        serviceCode: 'CAC_TIN',
        submittedData: searchData,
        idempotencyKey: `idem_cactin_${activeTab}_${Date.now()}`
      });

      setConfirmModalOpen(false);
      const trackingId = response.trackingId || response.ticketId || response.request?.ticketId;
      setSubmissionSuccess({
        ...(response.request || {}),
        trackingId,
        serviceName: `CAC & TIN (${currentConfig.title})`,
        amountCharged: response.amountCharged || response.amount || currentPrice,
        status: response.status || 'PENDING'
      });
      await refreshWallet();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit application. Please try again.');
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
              Your <strong>{currentConfig.title}</strong> filing under <strong>CAC & TIN</strong> has been received and queued for administrative processing.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-left space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Service:</span>
              <span className="font-bold text-gray-900">CAC & TIN ({currentConfig.title})</span>
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
                setProposedName1('');
                setTaxpayerName('');
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
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
          <span className="text-gray-900 font-bold">CAC & TIN</span>
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
        {/* Header Banner */}
        <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-500/10 via-amber-500/5 to-white">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-500/15 text-blue-600">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border bg-blue-50 text-blue-700 border-blue-200">
                CORPORATE & TAX DESK
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                CAC & TIN
              </h1>
              <p className="text-xs text-gray-500">
                Select from Business CAC, Company CAC, Individual TIN, or Company TIN
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
            <span className="block text-[11px] font-bold uppercase text-gray-400">Current Fee</span>
            <span className="text-2xl font-black text-gray-950 font-mono tracking-tight text-blue-600">
              {formatCurrency(currentPrice)}
            </span>
          </div>
        </div>

        {/* Sub-Service Selection (4 options: Business CAC, Company CAC, Individual TIN, Company TIN) */}
        <div className="p-4 sm:p-6 bg-gray-50/80 border-b border-gray-200">
          <label className="block text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider">
            Select CAC & TIN Sub-Service <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {(Object.keys(subConfig) as CacTinSubKey[]).map((key) => {
              const cfg = subConfig[key];
              const Icon = cfg.icon;
              const isSelected = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveTab(key);
                    setFormError(null);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'border-blue-600 bg-white ring-2 ring-blue-500/20 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isSelected ? 'bg-blue-600 text-white font-bold' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-gray-900">{cfg.title}</span>
                      <span className="block text-[10px] text-gray-500">{cfg.badge}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100">
                    <span className="text-gray-400 text-[10px]">Fee:</span>
                    <span className="font-mono font-bold text-blue-700">
                      {formatCurrency(cfg.defaultPrice)}
                    </span>
                  </div>
                </button>
              );
            })}
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
              className="px-4 py-2 rounded-xl bg-[#FF6B00] text-black font-bold hover:brightness-110 transition-colors shrink-0 text-xs shadow-sm"
            >
              Fund Wallet
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleOpenReview} className="p-6 sm:p-8 space-y-6">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-gray-900">{currentConfig.title}</h2>
              <p className="text-xs text-gray-500">{currentConfig.subTitle}</p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
              ETA: {currentConfig.eta}
            </span>
          </div>

          {/* ========================================================================= */}
          {/* OPTIONS 1 & 2: BUSINESS CAC & COMPANY CAC                                 */}
          {/* ========================================================================= */}
          {(activeTab === 'business_cac' || activeTab === 'company_cac') && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Primary Proposed Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={proposedName1}
                    onChange={(e) => setProposedName1(e.target.value)}
                    placeholder={activeTab === 'company_cac' ? 'e.g. Apex Global Logistics Ltd' : 'e.g. Apex Ventures'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Alternative Proposed Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={proposedName2}
                    onChange={(e) => setProposedName2(e.target.value)}
                    placeholder={activeTab === 'company_cac' ? 'e.g. Apex Integrated Systems Ltd' : 'e.g. Apex Hub'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Nature / Principal Objects of Business <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={businessNature}
                  onChange={(e) => setBusinessNature(e.target.value)}
                  placeholder="e.g. General merchandise, IT consultancy, retail, supply services"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Registered Physical Office Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  placeholder="Complete physical address with house number, street, city and state"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
                  required
                />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide block mb-3">
                  {activeTab === 'company_cac' ? 'Director & Shareholder Particulars' : 'Proprietor Particulars'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700">Full Legal Name *</label>
                    <input
                      type="text"
                      value={proprietorName}
                      onChange={(e) => setProprietorName(e.target.value)}
                      placeholder="Surname Firstname Middlename"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700">Phone Number *</label>
                    <input
                      type="text"
                      maxLength={11}
                      value={proprietorPhone}
                      onChange={(e) => setProprietorPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="08012345678"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-mono outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700">Email Address *</label>
                    <input
                      type="email"
                      value={proprietorEmail}
                      onChange={(e) => setProprietorEmail(e.target.value)}
                      placeholder="proprietor@example.com"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700">Identity Document Type *</label>
                    <select
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                    >
                      <option value="NIN">National Identity Number (NIN)</option>
                      <option value="DRIVERS_LICENSE">FRSC Drivers License</option>
                      <option value="PASSPORT">International Passport</option>
                      <option value="VOTERS_CARD">Voters Card</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700">Identification Number *</label>
                    <input
                      type="text"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="Enter ID number"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-mono font-bold outline-none"
                      required
                    />
                  </div>
                </div>

                {activeTab === 'company_cac' && (
                  <div className="mt-3 space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700">Authorized Share Capital</label>
                    <select
                      value={shareCapital}
                      onChange={(e) => setShareCapital(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
                    >
                      <option value="1,000,000">1,000,000 Ordinary Shares (Standard LLC)</option>
                      <option value="2,000,000">2,000,000 Ordinary Shares</option>
                      <option value="5,000,000">5,000,000 Ordinary Shares</option>
                      <option value="10,000,000">10,000,000 Ordinary Shares</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Supporting File Upload */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <label className="block text-xs font-bold text-gray-800">
                  Supporting Document (Signature Specimen / Valid ID Card) (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2.5 rounded-xl border border-gray-300 hover:border-blue-500 bg-gray-50 text-gray-700 font-bold text-xs cursor-pointer flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-blue-600" />
                    <span>{uploadedDocName ? 'Change Document' : 'Upload Document'}</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {uploadedDocName && (
                    <span className="text-xs font-mono text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {uploadedDocName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* OPTION 3: INDIVIDUAL TIN REGISTRATION                                     */}
          {/* ========================================================================= */}
          {activeTab === 'individual_tin' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Taxpayer Legal Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taxpayerName}
                    onChange={(e) => setTaxpayerName(e.target.value)}
                    placeholder="Surname Firstname Middlename"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    National ID (NIN or BVN) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={individualIdNumber}
                    onChange={(e) => setIndividualIdNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 11-digit NIN or BVN"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-mono font-bold outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dobOrIncorpDate}
                    onChange={(e) => setDobOrIncorpDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
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
                    value={tinPhone}
                    onChange={(e) => setTinPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="08012345678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-mono outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={tinEmail}
                    onChange={(e) => setTinEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-800">
                    Residential Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={tinAddress}
                    onChange={(e) => setTinAddress(e.target.value)}
                    placeholder="Physical residential address"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    State of Residence <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taxState}
                    onChange={(e) => setTaxState(e.target.value)}
                    placeholder="e.g. Lagos"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Occupation / Principal Trade <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={occupationOrActivity}
                  onChange={(e) => setOccupationOrActivity(e.target.value)}
                  placeholder="e.g. Trader, Software Engineer, Teacher, Farmer"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* OPTION 4: COMPANY TIN REGISTRATION                                        */}
          {/* ========================================================================= */}
          {activeTab === 'company_tin' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Registered Company / Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taxpayerName}
                    onChange={(e) => setTaxpayerName(e.target.value)}
                    placeholder="e.g. Apex Global Solutions Ltd"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    CAC Registration Number (RC or BN) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={rcOrBnNumber}
                    onChange={(e) => setRcOrBnNumber(e.target.value)}
                    placeholder="e.g. RC-1849201 or BN-293847"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-mono font-bold outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Date of Incorporation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dobOrIncorpDate}
                    onChange={(e) => setDobOrIncorpDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Corporate Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={tinPhone}
                    onChange={(e) => setTinPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="08012345678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-mono outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Official Corporate Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={tinEmail}
                    onChange={(e) => setTinEmail(e.target.value)}
                    placeholder="info@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-800">
                    Registered Office Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={tinAddress}
                    onChange={(e) => setTinAddress(e.target.value)}
                    placeholder="Official registered company address"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    State / Tax Jurisdiction <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taxState}
                    onChange={(e) => setTaxState(e.target.value)}
                    placeholder="e.g. Lagos"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Principal Line of Business Activity <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={occupationOrActivity}
                  onChange={(e) => setOccupationOrActivity(e.target.value)}
                  placeholder="e.g. Telecommunications, Civil Engineering, Oil & Gas, Logistics"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* Declaration Checkbox */}
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
                I hereby declare that all supplied business particulars, director records, and identification information are authentic, and I authorize Bazeright Verify to file this official application under CAC & TIN on my behalf.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={!isBalanceSufficient}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Submit {currentConfig.title} Application</span>
              <span className="font-mono text-white/90 font-bold">({formatCurrency(currentPrice)})</span>
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
          title="Authorize CAC & TIN Request"
          subtitle="Review application parameters and choose your authorization method."
          serviceName={`CAC & TIN (${currentConfig.title})`}
          serviceCode="CAC_TIN"
          servicePrice={currentPrice}
          walletBalance={userBalance}
          reviewDetails={[
            { label: 'Sub-Service', value: currentConfig.title },
            { label: 'Entity / Name', value: proposedName1 || taxpayerName || '—' }
          ]}
          onConfirm={handleExecutePayment}
          isProcessing={processing}
          actionButtonText="Authorize Application"
          processingText="Submitting Application..."
        />
      )}
    </div>
  );
};
