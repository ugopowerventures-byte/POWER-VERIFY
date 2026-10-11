import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { AgentAdminOnboarding } from '../../types';
import {
  ShieldCheck,
  UserCheck,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  BadgeAlert,
  ArrowRight,
  RefreshCw,
  Camera,
  Shield,
  HelpCircle,
  FileCheck,
  Sparkles,
  Lock,
  Phone,
  Home,
  MapPin,
  Users,
  Check,
  Eye,
  Info,
  Wallet,
  AlertTriangle
} from 'lucide-react';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara'
];

export const AgentOnboardingView: React.FC = () => {
  const { user, refreshUser, navigate } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [onboardingData, setOnboardingData] = useState<AgentAdminOnboarding | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Mandatory Rule Card state
  const [acknowledgedRules, setAcknowledgedRules] = useState(false);
  const [onboardingOtpAttempts, setOnboardingOtpAttempts] = useState(0);
  const [onboardingNinAttempts, setOnboardingNinAttempts] = useState(0);
  const [onboardingTerminated, setOnboardingTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState<string | null>(null);
  const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [targetRole, setTargetRole] = useState<'AGENT' | 'ADMIN' | 'SUPER_ADMIN'>('AGENT');
  const [feeRequired, setFeeRequired] = useState(2.5);
  const [insufficientCreditsInfo, setInsufficientCreditsInfo] = useState<{
    requiredCredits: number;
    currentBalance: number;
    targetRole: string;
  } | null>(null);

  // Form state - Existing requirements
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [dob, setDob] = useState(user?.dob || '');
  const [phone1, setPhone1] = useState(user?.phone || '');
  const [phone2, setPhone2] = useState(user?.phone2 || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.avatarUrl || user?.profilePhoto || '');
  const [nin, setNin] = useState(user?.nin || '');
  const [satisfactionTitle, setSatisfactionTitle] = useState(user?.satisfactionTitle || '');
  const [certificateFiles, setCertificateFiles] = useState<string[]>([]);
  const [certInputName, setCertInputName] = useState('');

  // Step 1: Residential Address
  const [residentialHouseNumber, setResidentialHouseNumber] = useState('');
  const [residentialStreet, setResidentialStreet] = useState('');
  const [residentialCity, setResidentialCity] = useState('');
  const [residentialState, setResidentialState] = useState('');
  const [residentialLga, setResidentialLga] = useState('');

  // Step 2: State of Origin
  const [stateOfOrigin, setStateOfOrigin] = useState('');
  const [lgaOfOrigin, setLgaOfOrigin] = useState('');

  // Step 3: Emergency / Reference Contact
  const [emergencyFullName, setEmergencyFullName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');

  // Step 4: Live NIN Identity Verification state
  const [verifyingNin, setVerifyingNin] = useState(false);
  const [ninVerified, setNinVerified] = useState(false);
  const [verifiedNinResult, setVerifiedNinResult] = useState<{
    verifiedFullName: string;
    verifiedDob: string;
    verifiedNinStatus: string;
    photoUrl: string | null;
  } | null>(null);

  // Step 5: Phone 1 OTP state (Sendchamp Integration)
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 60-second cooldown timer for SMS OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Step 6 & 7: Required Declarations
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);

  const fetchOnboardingStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/onboarding/me');
      if (res) {
        if (res.application) {
          setOnboardingData(res.application);
        }
        if (res.onboardingOtpAttempts !== undefined) {
          setOnboardingOtpAttempts(res.onboardingOtpAttempts);
        }
        if (res.onboardingNinAttempts !== undefined) {
          setOnboardingNinAttempts(res.onboardingNinAttempts);
        }
        if (res.onboardingTerminated) {
          setOnboardingTerminated(true);
          setTerminationReason(res.onboardingTerminationReason || null);
        }
        if (res.phone1Verified && res.phone1VerifiedNumber) {
          setPhoneVerified(true);
          setVerifiedPhoneNumber(res.phone1VerifiedNumber);
          setPhone1(res.phone1VerifiedNumber);
        }
        if (res.walletBalance !== undefined) {
          setWalletBalance(res.walletBalance);
        }
        if (res.targetRole) {
          setTargetRole(res.targetRole);
        }
        if (res.feeRequired !== undefined) {
          setFeeRequired(res.feeRequired);
        }
      }
    } catch (err: any) {
      console.error('Failed to load onboarding info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboardingStatus();
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Profile photo must be less than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCertificateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Certificate file must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCertificateFiles((prev) => [...prev, reader.result as string]);
      setCertInputName(file.name);
    };
    reader.readAsDataURL(file);
  };

  // Step 5: Phone Number 1 OTP verification handler (Sendchamp SMS)
  const handleSendOtp = async () => {
    const cleanPhone = phone1.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid Phone Number 1 before requesting OTP verification.');
      return;
    }
    if (resendCooldown > 0) {
      setErrorMessage(`Please wait ${resendCooldown} seconds before requesting a new OTP.`);
      return;
    }
    try {
      setSendingOtp(true);
      setErrorMessage(null);
      const res = await api.post('/onboarding/phone-otp/send', { phone1: cleanPhone });
      setOtpSent(true);
      setResendCooldown(res.cooldownSeconds || 60);
      setSuccessMessage(res.message || 'A 6-digit OTP has been sent via SMS to your phone number.');
    } catch (err: any) {
      if (err.cooldownSeconds) {
        setResendCooldown(err.cooldownSeconds);
      }
      setErrorMessage(err.message || 'Failed to send verification SMS. Please check your phone number.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otpCode.replace(/\D/g, '').trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP code received on your phone via SMS.');
      return;
    }
    try {
      setVerifyingOtp(true);
      setErrorMessage(null);
      const res = await api.post('/onboarding/phone-otp/verify', {
        phone1: phone1.trim(),
        otp: cleanOtp
      });
      if (res.verified) {
        setPhoneVerified(true);
        setVerifiedPhoneNumber(res.phone1VerifiedNumber || phone1.trim());
        setOnboardingOtpAttempts(0);
        setSuccessMessage('Phone Number 1 verified successfully via Sendchamp SMS OTP!');
      }
    } catch (err: any) {
      if (err.terminated) {
        setOnboardingTerminated(true);
        setTerminationReason(err.error);
        setErrorMessage(err.error);
        await refreshUser();
      } else {
        if (err.onboardingOtpAttempts !== undefined) {
          setOnboardingOtpAttempts(err.onboardingOtpAttempts);
        }
        setErrorMessage(err.error || err.message || 'Invalid or expired OTP code.');
      }
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Step 4: NIN Registry verification handler
  const handleVerifyNin = async () => {
    const cleanNin = nin.replace(/\D/g, '').trim();
    if (cleanNin.length !== 11) {
      setErrorMessage('National Identity Number (NIN) must be an exact 11-digit number.');
      return;
    }
    if (!fullName.trim()) {
      setErrorMessage('Please enter your Full Name before verifying NIN.');
      return;
    }
    if (!dob.trim()) {
      setErrorMessage('Please enter your Date of Birth before verifying NIN.');
      return;
    }

    try {
      setVerifyingNin(true);
      setErrorMessage(null);
      const res = await api.post('/onboarding/verify-nin', {
        nin: cleanNin,
        fullName: fullName.trim(),
        dob: dob.trim(),
        phone1: phone1.trim()
      });

      if (res.verified && res.data) {
        setNinVerified(true);
        setVerifiedNinResult(res.data);
        setOnboardingNinAttempts(0);
        setSuccessMessage('NIN identity verification passed! Official government record matched.');
      } else {
        setNinVerified(false);
        setVerifiedNinResult(null);
      }
    } catch (err: any) {
      setNinVerified(false);
      setVerifiedNinResult(null);
      if (err.terminated) {
        setOnboardingTerminated(true);
        setTerminationReason(err.error);
        setErrorMessage(err.error);
        await refreshUser();
      } else {
        if (err.onboardingNinAttempts !== undefined) {
          setOnboardingNinAttempts(err.onboardingNinAttempts);
        }
        setErrorMessage(err.error || err.message || 'NIN identity verification failed. Name or Date of Birth does not match official record.');
      }
    } finally {
      setVerifyingNin(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setInsufficientCreditsInfo(null);

    // Existing fields validation
    if (!fullName.trim()) {
      setErrorMessage('Full Name is required and must match your official NIN identity record.');
      return;
    }
    if (!dob.trim()) {
      setErrorMessage('Date of Birth is required and must match your official NIN identity record.');
      return;
    }
    if (!phone1.trim()) {
      setErrorMessage('Phone Number 1 is required.');
      return;
    }
    if (!profilePhoto.trim()) {
      setErrorMessage('Profile Photo is required. Please upload a clear photo.');
      return;
    }
    const cleanNin = nin.replace(/\D/g, '').trim();
    if (cleanNin.length !== 11) {
      setErrorMessage('National Identity Number (NIN) must be an exact 11-digit number.');
      return;
    }
    if (!satisfactionTitle.trim()) {
      setErrorMessage('Satisfaction/Title is required. E.g., Certified Verification Operator, Agent Officer, or Manager.');
      return;
    }

    // Step 1: Residential Address Validation
    if (!residentialHouseNumber.trim()) {
      setErrorMessage('Residential House/Building Number is required.');
      return;
    }
    if (!residentialStreet.trim()) {
      setErrorMessage('Residential Street Address is required.');
      return;
    }
    if (!residentialCity.trim()) {
      setErrorMessage('Residential Town/City is required.');
      return;
    }
    if (!residentialState.trim()) {
      setErrorMessage('Residential State is required.');
      return;
    }
    if (!residentialLga.trim()) {
      setErrorMessage('Residential LGA is required.');
      return;
    }

    // Step 2: State of Origin Validation
    if (!stateOfOrigin.trim()) {
      setErrorMessage('State of Origin is required.');
      return;
    }
    if (!lgaOfOrigin.trim()) {
      setErrorMessage('LGA of Origin is required.');
      return;
    }

    // Step 3: Emergency / Reference Contact Validation
    if (!emergencyFullName.trim()) {
      setErrorMessage('Emergency / Reference Contact Full Name is required.');
      return;
    }
    if (!emergencyPhone.trim()) {
      setErrorMessage('Emergency / Reference Contact Phone Number is required.');
      return;
    }
    if (!emergencyRelationship.trim()) {
      setErrorMessage('Emergency / Reference Contact Relationship is required.');
      return;
    }

    const cleanP1 = phone1.replace(/\D/g, '');
    const cleanRefPhone = emergencyPhone.replace(/\D/g, '');
    if (cleanP1 === cleanRefPhone) {
      setErrorMessage('The Emergency / Reference phone number must not be the same as Phone Number 1.');
      return;
    }

    // Step 5: Phone confirmation with OTP check
    if (!phoneVerified) {
      setErrorMessage('Phone Number 1 must be verified with an OTP before final submission.');
      return;
    }

    // Step 6: Truthfulness declaration check
    if (!declarationAccepted) {
      setErrorMessage('You must accept the truthfulness and administrative approval declaration before submitting.');
      return;
    }

    // Step 7: Final review confirmation check
    if (!reviewConfirmed) {
      setErrorMessage('You must confirm that you have reviewed your information before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/onboarding/submit', {
        fullName: fullName.trim(),
        dob: dob.trim(),
        phone1: phone1.trim(),
        phone2: phone2.trim() || undefined,
        profilePhoto,
        nin: cleanNin,
        satisfactionTitle: satisfactionTitle.trim(),
        certificates: certificateFiles,
        // Required address fields
        residentialHouseNumber: residentialHouseNumber.trim(),
        residentialStreet: residentialStreet.trim(),
        residentialCity: residentialCity.trim(),
        residentialState: residentialState.trim(),
        residentialLga: residentialLga.trim(),
        // Required origin fields
        stateOfOrigin: stateOfOrigin.trim(),
        lgaOfOrigin: lgaOfOrigin.trim(),
        // Required emergency / reference contact
        emergencyFullName: emergencyFullName.trim(),
        emergencyPhone: emergencyPhone.trim(),
        emergencyRelationship: emergencyRelationship.trim(),
        // Declarations
        declarationAccepted: true,
        reviewConfirmed: true
      });

      setSuccessMessage(res.message || 'Onboarding completed and role activated successfully!');
      if (res.onboarding) {
        setOnboardingData(res.onboarding);
      }
      await refreshUser();
      setTimeout(() => {
        const activeRole = res.activatedRole || user?.role;
        navigate(activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN' || activeRole === 'MEGA_ADMIN' ? '/admin' : '/dashboard');
      }, 1500);
    } catch (err: any) {
      if (err.code === 'INSUFFICIENT_CREDITS') {
        const required = err.requiredCredits || feeRequired;
        const role = err.roleDisplay || targetRole;
        setErrorMessage(err.error || `Insufficient Credits. You need ${required} Credits to enter ${role}. Please fund your wallet to continue.`);
        setInsufficientCreditsInfo({
          requiredCredits: required,
          currentBalance: err.currentBalance ?? walletBalance,
          targetRole: role
        });
      } else if (err.terminated) {
        setOnboardingTerminated(true);
        setTerminationReason(err.error);
        setErrorMessage(err.error);
        await refreshUser();
      } else {
        setErrorMessage(err.error || err.message || 'Onboarding submission failed. The supplied identity information does not match the NIN verification record.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const status = user?.onboardingStatus || onboardingData?.status || 'not_started';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <RefreshCw className="w-8 h-8 animate-spin text-[#FF6B00]" />
          <p className="text-xs font-semibold">Loading onboarding profile...</p>
        </div>
      </div>
    );
  }

  // 1. APPROVED VIEW (Rule 7 & 8: One-Time Onboarding - Never repeats once approved)
  if (status === 'approved' || user?.role === 'MEGA_ADMIN') {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-emerald-200 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Onboarding Approved & Complete
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                  Identity Verification Active
                </h1>
              </div>
            </div>

            <button
              onClick={() => navigate(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MEGA_ADMIN' ? '/admin' : '/dashboard')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-black transition-all cursor-pointer shadow-md"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs text-emerald-900 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Permanent Onboarding Record</p>
              <p className="text-emerald-700 mt-0.5">
                Your identity was authenticated against the National Identity Registry. You do not need to repeat this onboarding process during future logins.
              </p>
            </div>
          </div>

          {/* Profile particulars grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-gray-400 font-medium block">Approved Account Role</span>
              <span className="text-sm font-extrabold text-gray-900 mt-1 block">
                {user?.roleAtApproval || user?.role || 'AGENT'}
              </span>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-gray-400 font-medium block">Satisfaction/Title</span>
              <span className="text-sm font-extrabold text-gray-900 mt-1 block">
                {user?.satisfactionTitle || onboardingData?.satisfactionTitle || 'Verified Operator'}
              </span>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-gray-400 font-medium block">Approved Authority</span>
              <span className="text-sm font-extrabold text-gray-900 mt-1 block truncate">
                {user?.onboardingApprovedBy || onboardingData?.reviewedByName || 'Mega Administration'}
              </span>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-gray-400 font-medium block">Verified Full Legal Name</span>
              <span className="text-sm font-extrabold text-gray-900 mt-1 block">
                {user?.fullName || onboardingData?.fullName}
              </span>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-gray-400 font-medium block">Verified Date of Birth</span>
              <span className="text-sm font-extrabold text-gray-900 mt-1 block font-mono">
                {user?.dob || onboardingData?.dob || 'Verified on Registry'}
              </span>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-gray-400 font-medium block">NIN Verification Status</span>
              <span className="text-sm font-extrabold text-emerald-600 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Verified & Recorded
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. PENDING APPROVAL VIEW (Rule 4 & 6)
  if (status === 'pending') {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-amber-200 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900">
                  Pending Approval
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                  Onboarding Review in Progress
                </h1>
              </div>
            </div>

            <button
              onClick={fetchOnboardingStatus}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Status</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>NIN & Phone Identity Verification Passed & Validated</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              Your National Identity Number (NIN) has been authenticated against the official government registry. Your submitted Full Name, Date of Birth, Address, Origin, and Phone OTP were verified. Your application is now in <strong>PENDING APPROVAL</strong> state, awaiting review and approval by <strong>Mega Admin</strong> or <strong>Super Admin</strong>.
            </p>
          </div>

          {/* Submitted Information Summary */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Submitted Application Particulars
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block">Promoted Role</span>
                <span className="font-extrabold text-gray-900">{onboardingData?.targetRole || user?.role}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Satisfaction/Title</span>
                <span className="font-extrabold text-gray-900">{onboardingData?.satisfactionTitle || satisfactionTitle}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Full Name (NIN Matched)</span>
                <span className="font-extrabold text-gray-900">{onboardingData?.fullName || fullName}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Date of Birth (NIN Matched)</span>
                <span className="font-extrabold text-gray-900 font-mono">{onboardingData?.dob || dob}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Primary Contact Phone (Phone 1)</span>
                <span className="font-extrabold text-gray-900">{onboardingData?.phone1 || phone1} (OTP Confirmed)</span>
              </div>
              <div>
                <span className="text-gray-400 block">National Identity Number</span>
                <span className="font-extrabold text-gray-900 font-mono">
                  {onboardingData?.nin ? `${onboardingData.nin.slice(0, 3)}****${onboardingData.nin.slice(-4)}` : nin}
                </span>
              </div>
              {onboardingData?.residentialFullAddress && (
                <div className="sm:col-span-2">
                  <span className="text-gray-400 block">Residential Address</span>
                  <span className="font-extrabold text-gray-900">{onboardingData.residentialFullAddress}</span>
                </div>
              )}
              {onboardingData?.stateOfOrigin && (
                <div>
                  <span className="text-gray-400 block">State / LGA of Origin</span>
                  <span className="font-extrabold text-gray-900">{onboardingData.stateOfOrigin} / {onboardingData.lgaOfOrigin}</span>
                </div>
              )}
              {onboardingData?.emergencyFullName && (
                <div>
                  <span className="text-gray-400 block">Emergency Reference Contact</span>
                  <span className="font-extrabold text-gray-900">
                    {onboardingData.emergencyFullName} ({onboardingData.emergencyRelationship}) - {onboardingData.emergencyPhone}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. TERMINATED VIEW (Strict 2-Attempt Limit Reached)
  if (onboardingTerminated || user?.onboardingTerminated) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border-2 border-red-200 shadow-xl space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
              <BadgeAlert className="w-8 h-8" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800">
                Session Terminated
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                Onboarding Session Terminated
              </h1>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-2 leading-relaxed">
            <p className="font-bold text-sm text-red-950">
              Maximum Verification Attempts Reached
            </p>
            <p>
              {terminationReason || user?.onboardingTerminationReason || 'You have exceeded the maximum limit of 2 failed attempts for identity verification during onboarding. In accordance with system security rules, this onboarding session has been terminated and your account has been returned to its normal customer role.'}
            </p>
            <p className="text-red-800 font-medium">
              Your customer account remains fully active. You can continue to access all platform services, fund your wallet, and perform everyday verifications.
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-600 space-y-1">
            <p className="font-bold text-gray-800">Current Account Status</p>
            <p>Role: <span className="font-bold text-gray-900 font-mono">NORMAL CUSTOMER (USER)</span></p>
            <p>Wallet Balance: <span className="font-bold text-emerald-600 font-mono">{walletBalance.toFixed(2)} Credits</span> (Preserved & Intact)</p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-black transition-all cursor-pointer shadow-md"
            >
              <span>Return to Customer Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. MANDATORY RULE & VERIFICATION NOTICE CARD BEFORE ONBOARDING
  if (!acknowledgedRules) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                Notice & Verification Policy
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1 tracking-tight">
                ONBOARDING VERIFICATION RULES
              </h1>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Please read these verification requirements carefully before proceeding with your onboarding application. Strict automated validation limits are enforced.
          </p>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-950">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-amber-950">Strict Verification Limits & Regulations</p>
                <ul className="list-disc list-inside mt-2 space-y-1.5 text-amber-900 font-medium leading-relaxed">
                  <li><strong>SMS OTP Verification:</strong> You have a maximum of 2 attempts to successfully complete SMS OTP verification.</li>
                  <li><strong>NIN Information Matching:</strong> You have a maximum of 2 attempts to provide information that matches your NIN verification record.</li>
                  <li><strong>Automatic Session Termination:</strong> After 2 failed attempts in either verification stage, your onboarding session will be terminated and your account will be returned to its normal customer role.</li>
                  <li><strong>Information Accuracy:</strong> Make sure all information you provide is accurate before submitting.</li>
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-blue-900">
                <Wallet className="w-4 h-4 text-blue-600" />
                <span>Wallet Balance & Entry Fees</span>
              </div>
              <p className="text-blue-900 leading-relaxed">
                Your current wallet balance of <strong className="font-mono text-emerald-700">{walletBalance.toFixed(2)} Credits</strong> remains completely unchanged during onboarding. Upon final submission, the exact entry fee for your role is charged:
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-bold">
                <div className="p-2 bg-white rounded-xl border border-blue-100">
                  <span className="block text-[10px] text-gray-500 font-normal">Agent</span>
                  <span className="text-blue-700">2.5 Credits</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-blue-100">
                  <span className="block text-[10px] text-gray-500 font-normal">Admin</span>
                  <span className="text-blue-700">5.0 Credits</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-blue-100">
                  <span className="block text-[10px] text-gray-500 font-normal">Super Admin</span>
                  <span className="text-blue-700">5.3 Credits</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100">
            <span className="text-[11px] text-gray-500 font-medium">
              Clicking Continue opens the onboarding information entry form.
            </span>
            <button
              onClick={() => setAcknowledgedRules(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#E56000] text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg hover:shadow-orange-500/20"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. ONBOARDING INFORMATION ENTRY FORM
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-xl space-y-8">
        {/* Welcoming Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl space-y-3 relative overflow-hidden shadow-lg">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Account Role Onboarding</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {user?.role === 'USER' ? 'Identity & Agent Role Onboarding' : 'Congratulations! Your account has been upgraded.'}
          </h1>
          <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed max-w-2xl">
            {user?.role === 'USER'
              ? 'Complete your one-time identity verification and onboarding application below. Once verified, your upgraded role becomes immediately active.'
              : `Before you can start using your new ${user?.role === 'ADMIN' ? 'Administrator' : 'Agent Operator'} account, you must complete your one-time identity and profile onboarding.`}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-sky-200">
            <span className="bg-sky-500/20 border border-sky-400/40 px-3 py-1 rounded-full">
              Target Role: {targetRole}
            </span>
            <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full">
              Entry Fee: {feeRequired} Credits
            </span>
            <span className="bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 rounded-full text-emerald-200">
              Wallet Balance: {walletBalance.toFixed(2)} Credits
            </span>
          </div>
        </div>

        {/* Live Wallet Balance & Attempt Counters Info Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400 font-semibold block text-[10px] uppercase">Current Wallet Balance</span>
              <span className="text-sm font-black text-gray-900 font-mono mt-0.5 block">
                {walletBalance.toFixed(2)} Credits <span className="text-[11px] font-normal text-gray-500">(₦{(walletBalance * 200).toLocaleString()})</span>
              </span>
            </div>
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>

          <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${onboardingOtpAttempts > 0 ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-slate-50 border-slate-200 text-gray-900'}`}>
            <div>
              <span className="text-gray-400 font-semibold block text-[10px] uppercase">SMS OTP Failed Attempts</span>
              <span className={`text-sm font-black font-mono mt-0.5 block ${onboardingOtpAttempts >= 1 ? 'text-amber-700' : 'text-gray-900'}`}>
                {onboardingOtpAttempts} / 2 Allowed
              </span>
            </div>
            <Phone className={`w-5 h-5 ${phoneVerified ? 'text-emerald-600' : onboardingOtpAttempts > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
          </div>

          <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${onboardingNinAttempts > 0 ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-slate-50 border-slate-200 text-gray-900'}`}>
            <div>
              <span className="text-gray-400 font-semibold block text-[10px] uppercase">NIN Mismatch Failed Attempts</span>
              <span className={`text-sm font-black font-mono mt-0.5 block ${onboardingNinAttempts >= 1 ? 'text-amber-700' : 'text-gray-900'}`}>
                {onboardingNinAttempts} / 2 Allowed
              </span>
            </div>
            <Shield className={`w-5 h-5 ${ninVerified ? 'text-emerald-600' : onboardingNinAttempts > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
          </div>
        </div>

        {/* Insufficient Credits Banner (if user attempted submit with low balance) */}
        {insufficientCreditsInfo && (
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-sm text-amber-950">
                  Insufficient Credits to Enter {insufficientCreditsInfo.targetRole}
                </p>
                <p className="text-amber-900 mt-0.5">
                  You need <strong>{insufficientCreditsInfo.requiredCredits} Credits</strong> to enter {insufficientCreditsInfo.targetRole}. Your current wallet balance is <strong>{insufficientCreditsInfo.currentBalance.toFixed(2)} Credits</strong>. Please fund your wallet to continue.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/wallet/fund')}
              className="px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E56000] text-white font-bold text-xs uppercase tracking-wider shrink-0 transition-all cursor-pointer shadow-md"
            >
              Fund Wallet Now
            </button>
          </div>
        )}

        {/* Rejection / Correction Banner if present */}
        {status === 'rejected' && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
            <div className="flex items-center gap-2 font-bold text-red-950">
              <BadgeAlert className="w-4 h-4 text-red-600" />
              <span>Previous Onboarding Application Not Approved</span>
            </div>
            <p className="text-red-800">
              {onboardingData?.rejectionReason || onboardingData?.correctionMessage || 'Your previous submission did not meet verification criteria. Please review your details and resubmit.'}
            </p>
          </div>
        )}

        {/* Real-time Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Identity Validation Notice</p>
              <p className="text-red-700 mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Validation Status</p>
              <p className="text-emerald-700 mt-0.5 leading-relaxed">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Instructions banner */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-gray-800 space-y-1.5">
          <p className="font-bold text-blue-950 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-blue-600" />
            Rigor & Multi-Factor Verification Process
          </p>
          <p className="text-blue-900/90 leading-relaxed">
            Your onboarding requires: <strong>1. Live NIN Identity Verification</strong> matching your name and DOB, <strong>2. Phone Number OTP Confirmation</strong>, <strong>3. Complete Residential Address & State/LGA of Origin</strong>, <strong>4. Reference Contact</strong>, and <strong>5. Signed Declarations</strong> prior to administrative review.
          </p>
        </div>

        {/* Onboarding Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* ======================================================== */}
          {/* SECTION A: APPLICANT PERSONAL PARTICULARS & TITLE       */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                1. Personal Particulars & Title
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Name * <span className="text-gray-400 font-normal">(Must match NIN record)</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setNinVerified(false);
                  }}
                  placeholder="First Middle Last"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Date of Birth * <span className="text-gray-400 font-normal">(Must match NIN record)</span>
                </label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => {
                    setDob(e.target.value);
                    setNinVerified(false);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Satisfaction/Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Satisfaction/Title *
                </label>
                <input
                  type="text"
                  required
                  value={satisfactionTitle}
                  onChange={(e) => setSatisfactionTitle(e.target.value)}
                  placeholder="e.g. Certified Agent Operator, Manager"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Phone Number 2 (Optional) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Phone Number 2 <span className="text-gray-400 font-normal">(Optional Alternate)</span>
                </label>
                <input
                  type="tel"
                  value={phone2}
                  onChange={(e) => setPhone2(e.target.value)}
                  placeholder="e.g. 07098765432"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Phone Number 1 with Real OTP Confirmation (Step 5) */}
            <div className={`p-4 rounded-2xl border transition-all space-y-3 ${phoneVerified ? 'bg-emerald-50/40 border-emerald-400' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-xs font-bold text-gray-800">
                  Phone Number 1 * <span className="text-gray-500 font-normal">(Primary Active Mobile with OTP Verification)</span>
                </label>
                {phoneVerified && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-sm">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      Phone Verified ✓
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneVerified(false);
                        setOtpSent(false);
                        setOtpCode('');
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer ml-1"
                    >
                      Change Number
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <input
                    type="tel"
                    required
                    disabled={phoneVerified}
                    value={phone1}
                    onChange={(e) => {
                      const newP = e.target.value;
                      setPhone1(newP);
                      if (verifiedPhoneNumber && newP.trim() !== verifiedPhoneNumber.trim()) {
                        setPhoneVerified(false);
                        setOtpSent(false);
                      }
                    }}
                    placeholder="e.g. 08012345678"
                    className={`w-full px-4 py-2.5 rounded-xl text-xs transition-all ${
                      phoneVerified
                        ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-950 font-bold focus:outline-none'
                        : 'border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                  />
                  <Phone className={`w-4 h-4 absolute right-3 top-3 ${phoneVerified ? 'text-emerald-600' : 'text-gray-400'}`} />
                </div>

                {!phoneVerified && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || !phone1.trim() || resendCooldown > 0}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0 shadow-sm"
                  >
                    {sendingOtp ? 'Sending SMS...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : otpSent ? 'Resend OTP' : 'Send OTP Code'}
                  </button>
                )}
              </div>

              {!phoneVerified && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Please verify your phone number before continuing to the next onboarding stages.</span>
                </div>
              )}

              {/* OTP Entry Row */}
              {otpSent && !phoneVerified && (
                <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-2 mt-2">
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit OTP"
                      className="w-full sm:w-48 px-3 py-2 rounded-lg border border-gray-300 font-mono font-bold text-center tracking-widest text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={verifyingOtp || otpCode.length !== 6}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {verifyingOtp ? 'Validating...' : 'Confirm OTP'}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    A real 6-digit verification code was sent via SMS to your primary mobile phone. Enter the code to validate.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* STAGE GUARD NOTICE IF PHONE NOT VERIFIED */}
          {!phoneVerified && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border-2 border-amber-300 text-xs text-amber-950 flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-extrabold text-sm text-amber-950">Next Stages Locked</p>
                <p className="text-amber-900 mt-0.5">
                  Please verify your phone number above before continuing. Once verified, the phone number will turn <strong>GREEN (Phone Verified ✓)</strong> and unlock all subsequent verification stages.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION B: NIN IDENTITY CONFIRMATION & REGISTRY CHECK   */}
          {/* ======================================================== */}
          <div className={`space-y-4 transition-opacity ${!phoneVerified ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                2. National Identity Number (NIN) & Registry Check
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    NIN * <span className="text-gray-400 font-normal">(11 Digits)</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={nin}
                    onChange={(e) => {
                      setNin(e.target.value.replace(/\D/g, ''));
                      setNinVerified(false);
                      setVerifiedNinResult(null);
                    }}
                    placeholder="11-digit National Identity Number"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-mono text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:self-end w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleVerifyNin}
                    disabled={verifyingNin || nin.replace(/\D/g, '').length !== 11}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#121212] text-white font-bold text-xs hover:bg-black transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {verifyingNin ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Checking NIMC...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Verify NIN Identity</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step 4: Display ACTUAL verification information returned by NIN API */}
              {ninVerified && verifiedNinResult && (
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-3 mt-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                    <span className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Live Identity Record Confirmed by Registry
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900 font-bold">
                      {verifiedNinResult.verifiedNinStatus}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Genuine Registry photograph if provider returns one */}
                    {verifiedNinResult.photoUrl ? (
                      <div className="text-center shrink-0">
                        <img
                          src={verifiedNinResult.photoUrl}
                          alt="NIMC Registry"
                          className="w-20 h-20 rounded-2xl object-cover border border-emerald-300 shadow-sm mx-auto"
                        />
                        <span className="text-[9px] text-emerald-700 font-semibold block mt-1">Registry Photo</span>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-emerald-100/60 border border-emerald-200 flex items-center justify-center text-center p-1 text-[10px] text-emerald-800 font-medium shrink-0">
                        Registry Text KYC Record
                      </div>
                    )}

                    <div className="flex-1 space-y-1.5 text-left w-full">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Verified Full Name:</span>
                        <span className="font-bold text-gray-900">{verifiedNinResult.verifiedFullName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Verified Date of Birth:</span>
                        <span className="font-mono font-bold text-gray-900">{verifiedNinResult.verifiedDob}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Identity Token Match:</span>
                        <span className="text-emerald-700 font-bold">IDENTITY_MATCH (100% Deterministic)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION C: RESIDENTIAL ADDRESS (Step 1)                  */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <Home className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                3. Residential Address *
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  House / Building Number *
                </label>
                <input
                  type="text"
                  required
                  value={residentialHouseNumber}
                  onChange={(e) => setResidentialHouseNumber(e.target.value)}
                  placeholder="e.g. No. 14A, Suite 5"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={residentialStreet}
                  onChange={(e) => setResidentialStreet(e.target.value)}
                  placeholder="e.g. Broad Street, Marina or Wuse Zone 4 Road"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Town / City *
                </label>
                <input
                  type="text"
                  required
                  value={residentialCity}
                  onChange={(e) => setResidentialCity(e.target.value)}
                  placeholder="e.g. Ikeja, Garki, or Port Harcourt"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Residential State *
                </label>
                <select
                  required
                  value={residentialState}
                  onChange={(e) => setResidentialState(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select State</option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Residential LGA *
                </label>
                <input
                  type="text"
                  required
                  value={residentialLga}
                  onChange={(e) => setResidentialLga(e.target.value)}
                  placeholder="e.g. Ikeja, AMAC, Owerri Municipal"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION D: STATE OF ORIGIN (Step 2)                     */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                4. State & LGA of Origin *
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  State of Origin *
                </label>
                <select
                  required
                  value={stateOfOrigin}
                  onChange={(e) => setStateOfOrigin(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select State of Origin</option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  LGA of Origin *
                </label>
                <input
                  type="text"
                  required
                  value={lgaOfOrigin}
                  onChange={(e) => setLgaOfOrigin(e.target.value)}
                  placeholder="Enter LGA of origin"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION E: EMERGENCY / REFERENCE CONTACT (Step 3)        */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                5. Emergency / Reference Contact *
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={emergencyFullName}
                  onChange={(e) => setEmergencyFullName(e.target.value)}
                  placeholder="Reference person's name"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Phone Number * <span className="text-gray-400 font-normal">(Different from Phone 1)</span>
                </label>
                <input
                  type="tel"
                  required
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="e.g. 08098765432"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Relationship *
                </label>
                <input
                  type="text"
                  required
                  value={emergencyRelationship}
                  onChange={(e) => setEmergencyRelationship(e.target.value)}
                  placeholder="e.g. Next of Kin, Sibling, Employer, Parent"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION F: BIOMETRIC PROFILE PHOTO & CERTIFICATES       */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <Camera className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                6. Profile Photo & Credentials
              </h2>
            </div>

            {/* Profile Photo */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Profile Photo * <span className="text-gray-400 font-normal">(Clear portrait or passport photograph)</span>
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile Preview"
                    className="w-20 h-20 rounded-2xl object-cover border border-gray-300 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                    <Camera className="w-8 h-8" />
                  </div>
                )}
                <div className="flex-1 text-center sm:text-left space-y-1">
                  <input
                    type="file"
                    id="profile-photo-input"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="profile-photo-input"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer shadow-sm"
                  >
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>{profilePhoto ? 'Change Photo' : 'Upload Profile Photo'}</span>
                  </label>
                  <p className="text-[11px] text-gray-500">
                    Supported formats: JPG, PNG, WEBP (Max 5MB).
                  </p>
                </div>
              </div>
            </div>

            {/* Other Certificates (Optional) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Other Certificates <span className="text-gray-400 font-normal">(Optional - Credentials, Business Registration, ID)</span>
              </label>
              <div className="p-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="cert-file-input"
                    accept="image/*,.pdf"
                    onChange={handleCertificateUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="cert-file-input"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer shadow-sm"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Attach Certificate File</span>
                  </label>
                  {certInputName && <span className="text-xs text-gray-600 truncate">{certInputName}</span>}
                </div>

                {certificateFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {certificateFiles.map((_, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        Certificate #{idx + 1} Attached
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION G: COMPACT REVIEW YOUR INFORMATION (Step 7)     */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                7. Review Your Information
              </h2>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Full Name</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">{fullName || '—'}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Date of Birth</span>
                  <span className="font-bold font-mono text-gray-900 mt-0.5 block">{dob || '—'}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Primary Phone</span>
                  <span className="font-bold text-gray-900 mt-0.5 block flex items-center gap-1">
                    {phone1 || '—'}
                    {phoneVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">NIN</span>
                  <span className="font-bold font-mono text-gray-900 mt-0.5 block">
                    {nin ? `${nin.slice(0, 3)}****${nin.slice(-4)}` : '—'}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-gray-100 sm:col-span-2">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Residential Address</span>
                  <span className="font-bold text-gray-900 mt-0.5 block truncate">
                    {residentialHouseNumber ? `${residentialHouseNumber} ${residentialStreet}, ${residentialCity}, ${residentialLga}, ${residentialState}` : '—'}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">State / LGA of Origin</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">{stateOfOrigin || '—'} / {lgaOfOrigin || '—'}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-gray-100 sm:col-span-2">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Emergency Reference Contact</span>
                  <span className="font-bold text-gray-900 mt-0.5 block truncate">
                    {emergencyFullName ? `${emergencyFullName} (${emergencyRelationship}) - ${emergencyPhone}` : '—'}
                  </span>
                </div>
              </div>

              {/* Review Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={reviewConfirmed}
                  onChange={(e) => setReviewConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-blue-950">
                  I have reviewed my information and confirm that it is correct.
                </span>
              </label>

              {/* Declaration Checkbox (Step 6) */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={declarationAccepted}
                  onChange={(e) => setDeclarationAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-xs text-amber-950 font-medium leading-relaxed">
                  I confirm that all information and documents provided are correct, genuine and belong to me. I understand that my onboarding request will be reviewed and approved by an administrator before my assigned role becomes active.
                </span>
              </label>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SUBMIT ACTION                                            */}
          {/* ======================================================== */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-500 text-center sm:text-left space-y-0.5">
              <p className="font-bold text-gray-800">
                Required Entry Fee: <span className="font-mono text-blue-700 font-extrabold">{feeRequired} Credits</span>
              </p>
              <p className="text-[11px] text-gray-500">
                • Verified Phone OTP (Green) • Matched NIN • Address & Origin • Declarations Accepted
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || !declarationAccepted || !reviewConfirmed || !phoneVerified}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 text-white font-extrabold text-sm hover:bg-blue-700 transition-all cursor-pointer shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validating Identity & Activating Role...</span>
                </>
              ) : (
                <>
                  <span>SUBMIT & ACTIVATE ROLE ({feeRequired} CREDITS)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
