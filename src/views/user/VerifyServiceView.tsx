import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Service, VerificationRequest, VerificationResult } from '../../types';
import { VerificationSlip } from '../../components/common/VerificationSlip';
import { formatCurrency } from '../../utils/currency';
import { ServiceAuthorizationModal } from '../../components/common/ServiceAuthorizationModal';
import { preloadSlipTemplates } from '../../lib/pdfGenerator';
import {
  ShieldCheck,
  Search,
  Lock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Wallet,
  KeyRound,
  RotateCcw,
  Sparkles,
  Loader2
} from 'lucide-react';

export const VerifyServiceView: React.FC = () => {
  const { user, wallet, refreshWallet, navigate } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loadingServices, setLoadingServices] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Verification processing state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  // Load services and handle URL query param ?service=...
  useEffect(() => {
    preloadSlipTemplates().catch(() => {});
    async function init() {
      try {
        const sList: Service[] = await api.get('/services');
        setServices(sList || []);

        const params = new URLSearchParams(window.location.search);
        const codeParam = params.get('service');
        if (codeParam) {
          const upper = codeParam.toUpperCase();
          if (upper === 'MODIFICATION' || upper === 'NIN_MODIFICATION') {
            navigate('/verify/modification');
            return;
          }
          if (upper === 'CAC_TIN' || upper === 'CAC_REGISTRATION' || upper === 'TIN_REGISTRATION' || upper === 'TIN') {
            navigate('/verify/cac-tin');
            return;
          }
          if (upper === 'BIRTH_ATTESTATION') {
            navigate('/verify/birth-attestation');
            return;
          }
          if (upper === 'BVN_MODIFICATION') {
            navigate('/verify/bvn-modification');
            return;
          }
          if (upper === 'BVN_RETRIEVAL') {
            navigate('/verify/bvn-retrieval');
            return;
          }
          if (upper === 'BVN_ANDROID_USER' || upper === 'ANDROID_BVN_ONBOARDING') {
            navigate('/verify/bvn-android-user');
            return;
          }
          if (upper === 'NIN_DELINKING' || upper === 'SELF_SERVICE_EMAIL') {
            navigate('/verify/self-service');
            return;
          }
          if (
            upper.includes('MOD') ||
            upper === 'MODIFICATION' ||
            upper === 'NIN_MODIFICATION' ||
            upper.includes('PERSONAL') ||
            upper === 'IPE_CLEARANCE' ||
            upper === 'IPE_MODIFICATION' ||
            upper === 'NIN_VALIDATION'
          ) {
            if (upper === 'NIN_NAME_MOD') navigate('/verify/nin-modification/name');
            else if (upper === 'NIN_DOB_MOD') navigate('/verify/nin-modification/dob');
            else if (upper === 'NIN_PHONE_MOD') navigate('/verify/nin-modification/phone');
            else if (upper === 'NIN_ADDRESS_MOD') navigate('/verify/nin-modification/address');
            else if (upper === 'BVN_MODIFICATION') navigate('/verify/bvn-modification');
            else navigate('/verify/modification');
            return;
          }
          if (upper.includes('CAC') || upper.includes('TIN') || upper === 'CAC_TIN') {
            navigate('/verify/cac-tin');
            return;
          }
          if (upper.includes('ATTESTATION') || upper === 'BIRTH_ATTESTATION') {
            navigate('/verify/birth-attestation');
            return;
          }
          if (upper.includes('RETRIEVAL') || upper === 'BVN_RETRIEVAL') {
            navigate('/verify/bvn-retrieval');
            return;
          }
          if (upper.includes('ANDROID') || upper === 'BVN_ANDROID_USER' || upper === 'ANDROID_BVN_ONBOARDING') {
            navigate('/verify/bvn-android-user');
            return;
          }
          if (upper.includes('DELINK') || upper.includes('EMAIL') || upper.includes('SELF_SERVICE')) {
            navigate('/verify/self-service');
            return;
          }
          if (upper.includes('PERSONAL')) {
            navigate('/verify/modification');
            return;
          }
          if (upper === 'DEMOGRAPHIC_VERIFICATION' || upper === 'DEMOGRAPHIC') {
            navigate('/verify/demographic-verification');
            return;
          }
          if (upper === 'ONLINE_NIN_REGISTRATION' || upper === 'ONLINE_NIN') {
            navigate('/verify/online-nin-registration');
            return;
          }
          const matched = sList.find((s) => s.code.toUpperCase() === codeParam.toUpperCase());
          if (matched) setSelectedService(matched);
        } else if (window.location.pathname.toLowerCase().includes('/verify/nin')) {
          const ninService = sList.find((s) => s.code.toUpperCase() === 'NIN');
          if (ninService) setSelectedService(ninService);
          else if (sList.length > 0) setSelectedService(sList[0]);
        } else if (sList.length > 0) {
          const ninService = sList.find((s) => s.code.toUpperCase() === 'NIN');
          setSelectedService(ninService || sList[0]);
        }
      } catch (err) {
        console.error('Failed to load services:', err);
      } finally {
        setLoadingServices(false);
      }
    }
    init();
  }, [navigate]);

  const handleServiceChange = (service: Service) => {
    const upper = service.code.toUpperCase();
    if (
      upper.includes('MOD') ||
      upper === 'MODIFICATION' ||
      upper === 'NIN_MODIFICATION' ||
      upper.includes('PERSONAL') ||
      upper === 'IPE_CLEARANCE' ||
      upper === 'IPE_MODIFICATION' ||
      upper === 'NIN_VALIDATION'
    ) {
      if (upper === 'NIN_NAME_MOD') navigate('/verify/nin-modification/name');
      else if (upper === 'NIN_DOB_MOD') navigate('/verify/nin-modification/dob');
      else if (upper === 'NIN_PHONE_MOD') navigate('/verify/nin-modification/phone');
      else if (upper === 'NIN_ADDRESS_MOD') navigate('/verify/nin-modification/address');
      else if (upper === 'BVN_MODIFICATION') navigate('/verify/bvn-modification');
      else navigate('/verify/modification');
      return;
    }
    if (
      upper.includes('CAC') ||
      upper.includes('TIN') ||
      upper === 'CAC_TIN' ||
      upper === 'COMPANY_CAC' ||
      upper === 'BUSINESS_CAC' ||
      upper === 'TIN_INDIVIDUAL' ||
      upper === 'TIN_COMPANY'
    ) {
      navigate('/verify/cac-tin');
      return;
    }
    if (upper.includes('ATTESTATION') || upper === 'BIRTH_ATTESTATION') {
      navigate('/verify/birth-attestation');
      return;
    }
    if (upper.includes('RETRIEVAL') || upper === 'BVN_RETRIEVAL') {
      navigate('/verify/bvn-retrieval');
      return;
    }
    if (upper.includes('ANDROID') || upper === 'BVN_ANDROID_USER' || upper === 'ANDROID_BVN_ONBOARDING') {
      navigate('/verify/bvn-android-user');
      return;
    }
    if (upper.includes('DELINK') || upper.includes('EMAIL') || upper.includes('SELF_SERVICE')) {
      navigate('/verify/self-service');
      return;
    }
    if (upper.includes('PERSONAL')) {
      navigate('/verify/modification');
      return;
    }
    if (upper === 'DEMOGRAPHIC_VERIFICATION' || upper === 'DEMOGRAPHIC') {
      navigate('/verify/demographic-verification');
      return;
    }
    if (upper === 'ONLINE_NIN_REGISTRATION' || upper === 'ONLINE_NIN') {
      navigate('/verify/online-nin-registration');
      return;
    }
    setSelectedService(service);
    setFormData({});
    setError(null);
    setVerificationRequest(null);
    setVerificationResult(null);
  };

  const handleInputChange = (fieldName: string, val: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: val }));
  };

  const getEffectiveFields = (s: Service | null) => {
    if (!s) return [];
    if (s.requiredFields && s.requiredFields.length > 0) return s.requiredFields;
    const upper = s.code.toUpperCase();
    if (upper === 'NIN') {
      return [
        {
          name: 'nin',
          label: 'National Identity Number (NIN)',
          type: 'text' as const,
          placeholder: 'Enter 11-digit NIN',
          required: true,
          regex: '^\\d{11}$',
          helperText: 'Must be exactly 11 numeric digits'
        }
      ];
    }
    if (upper === 'BVN') {
      return [
        {
          name: 'bvn',
          label: 'Bank Verification Number (BVN)',
          type: 'text' as const,
          placeholder: 'Enter 11-digit BVN',
          required: true,
          regex: '^\\d{11}$',
          helperText: 'Must be exactly 11 numeric digits'
        }
      ];
    }
    if (upper === 'PHONE') {
      return [
        {
          name: 'phone',
          label: 'Phone Number',
          type: 'text' as const,
          placeholder: 'e.g. 08012345678',
          required: true,
          regex: '^(0|234)[789][01]\\d{8}$',
          helperText: 'Nigerian mobile telephone number'
        }
      ];
    }
    return [];
  };

  const effectiveFields = getEffectiveFields(selectedService);

  // Open confirmation modal
  const handleInitiateVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedService) return;

    // Validate required fields
    for (const field of effectiveFields) {
      if (field.required && !formData[field.name]?.trim()) {
        setError(`Please enter a valid ${field.label}`);
        return;
      }
      if (field.regex && formData[field.name]) {
        const reg = new RegExp(field.regex);
        if (!reg.test(formData[field.name].trim())) {
          setError(field.helperText || `Invalid format for ${field.label}`);
          return;
        }
      }
    }

    // Check balance
    if ((wallet?.availableBalance ?? 0) < selectedService.price) {
      setError(
        `Insufficient wallet balance (${formatCurrency(wallet?.availableBalance ?? 0)}). Required: ${formatCurrency(selectedService.price)}. Please fund your wallet.`
      );
      return;
    }

    // Generate unique client idempotency key for this verification attempt
    const newKey = `idem_${selectedService.code}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setIdempotencyKey(newKey);
    setConfirmModalOpen(true);
  };

  // Execute verification with backend
  const handleConfirmAndExecute = async () => {
    if (!selectedService) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await api.post('/verifications/execute', {
        serviceCode: selectedService.code,
        searchData: formData,
        idempotencyKey
      });

      setConfirmModalOpen(false);
      setVerificationRequest(response.request);
      setVerificationResult(response.result || null);
      setProcessing(false);
      refreshWallet().catch(() => {});
    } catch (err: any) {
      const respData = err?.response;
      if (respData?.request || respData?.verification) {
        setVerificationRequest(respData.request || respData.verification);
        setVerificationResult(null);
      }
      setError(respData?.message || respData?.error || err.message || 'Verification execution failed.');
      setConfirmModalOpen(false);
      refreshWallet().catch(() => {});
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setVerificationRequest(null);
    setVerificationResult(null);
    setFormData({});
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
          Verify Identity Record
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Perform live identity lookups with official registry verification and instant digital certificate.
        </p>
      </div>

      {/* If result exists, show official slip */}
      {verificationRequest ? (
        <VerificationSlip
          request={verificationRequest}
          result={verificationResult}
          onNewVerification={handleReset}
        />
      ) : (
        <div className="space-y-6">
          {/* Service Selector Tabs / Dropdown */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Select Verification Service ({services.length} Available)
                </label>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Choose from certified national registries, financial verification, and business services.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter service or code..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-gray-50/50 focus:bg-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['ALL', ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    categoryFilter === cat
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            {loadingServices ? (
              <div className="h-28 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
                {services
                  .filter((s) => {
                    const matchesQuery =
                      s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      s.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      s.description.toLowerCase().includes(searchFilter.toLowerCase());
                    const matchesCategory = categoryFilter === 'ALL' || s.category === categoryFilter;
                    return matchesQuery && matchesCategory;
                  })
                  .map((s) => {
                    const isSelected = selectedService?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleServiceChange(s)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#FF6B00] bg-orange-500/5 shadow-sm ring-2 ring-orange-500/20'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                              {s.code}
                            </span>
                            <span className="font-mono font-bold text-sm text-gray-950">
                              {formatCurrency(s.price)}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-gray-900 mt-2">{s.name}</h4>
                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                            {s.description}
                          </p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-100/60 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                          <span>{s.category}</span>
                          <span className={s.status === 'ACTIVE' ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                            {s.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Active Service Form */}
          {selectedService && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h3 className="font-extrabold text-lg text-gray-950">
                      {selectedService.name}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{selectedService.description}</p>
                </div>

                <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-200">
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Fee</span>
                    <span className="font-black text-gray-950 font-mono text-base">
                      {formatCurrency(selectedService.price)}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-gray-300" />
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Wallet</span>
                    <span className="font-bold text-amber-600 font-mono text-sm">
                      {formatCurrency(wallet?.availableBalance ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">Verification Notice</p>
                    <p className="mt-0.5">{error}</p>
                    {error.includes('Insufficient') && !error.toLowerCase().includes('gateway') && !error.toLowerCase().includes('provider') && (
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

              <form onSubmit={handleInitiateVerification} className="space-y-4">
                {effectiveFields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        value={formData[field.name] || ''}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        required={field.required}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-500 bg-white"
                      >
                        <option value="">Select option...</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
                      />
                    )}

                    {field.helperText && (
                      <p className="text-[11px] text-gray-400 mt-1">{field.helperText}</p>
                    )}
                  </div>
                ))}

                <div className="pt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Protected by Server Idempotency Lock</span>
                  </span>

                  <button
                    id="btn-proceed-verify"
                    type="submit"
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold text-sm hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
                  >
                    <span>Proceed to Verify</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Confirmation & Authorization Modal */}
      {confirmModalOpen && selectedService && (
        <ServiceAuthorizationModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title={`Confirm ${selectedService.name}`}
          subtitle="Review verification criteria and authorize registry query."
          serviceName={selectedService.name}
          serviceCode={selectedService.code}
          servicePrice={selectedService.price}
          walletBalance={wallet?.availableBalance ?? 0}
          reviewDetails={effectiveFields.map((f) => ({
            label: f.label,
            value: String(formData[f.name] || '—')
          })) || []}
          onConfirm={handleConfirmAndExecute}
          isProcessing={processing}
          actionButtonText="Authorize & Verify Record"
          processingText="Querying Official Registry..."
        />
      )}
    </div>
  );
};
