import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Service } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { ServiceAuthorizationModal } from '../../components/common/ServiceAuthorizationModal';
import {
  Fingerprint,
  ShieldCheck,
  User,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  Camera,
  Upload,
  FileCheck,
  FileText,
  HelpCircle,
  BadgeAlert,
  Wallet,
  Copy,
  Check,
  Trash2,
  Plus,
  Globe
} from 'lucide-react';

export const OnlineNinRegistrationFormView: React.FC = () => {
  const { user, wallet, refreshWallet, navigate } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTicket, setSuccessTicket] = useState<string | null>(null);
  const [copiedTicket, setCopiedTicket] = useState(false);

  // Form State
  const [title, setTitle] = useState('Mr');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname, setSurname] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [maritalStatus, setMaritalStatus] = useState('Single');
  const [nationality, setNationality] = useState('Nigerian');
  const [countryOfResidence, setCountryOfResidence] = useState('Nigeria');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [stateOfOrigin, setStateOfOrigin] = useState('');
  const [lgaOfOrigin, setLgaOfOrigin] = useState('');
  const [town, setTown] = useState('');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [currentState, setCurrentState] = useState('');
  const [currentLga, setCurrentLga] = useState('');

  // Next of Kin
  const [nokName, setNokName] = useState('');
  const [nokRelationship, setNokRelationship] = useState('Parent');
  const [nokPhone, setNokPhone] = useState('');
  const [nokAddress, setNokAddress] = useState('');

  // Individual Pictures (up to 3 photos per citizen registration)
  const [picture1, setPicture1] = useState('');
  const [picture2, setPicture2] = useState('');
  const [picture3, setPicture3] = useState('');

  // Supporting Document
  const [supportingDoc, setSupportingDoc] = useState('');
  const [supportingDocName, setSupportingDocName] = useState('');

  // Confirmation Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    async function loadService() {
      try {
        setLoading(true);
        const s: Service = await api.get('/services/ONLINE_NIN_REGISTRATION');
        setService(s);
      } catch (err: any) {
        console.error('Failed to load Online NIN Registration service:', err);
      } finally {
        setLoading(false);
      }
    }
    loadService();
  }, []);

  const isAssigned =
    user?.role === 'MEGA_ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    (user?.role === 'AGENT' && Boolean(user.assignedServices?.includes('ONLINE_NIN_REGISTRATION')));

  const handlePictureUpload = (index: 1 | 2 | 3, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(`Picture #${index} must be under 5MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (index === 1) setPicture1(dataUrl);
      else if (index === 2) setPicture2(dataUrl);
      else if (index === 3) setPicture3(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePicture = (index: 1 | 2 | 3) => {
    if (index === 1) setPicture1('');
    else if (index === 2) setPicture2('');
    else if (index === 3) setPicture3('');
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Document file must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSupportingDoc(reader.result as string);
      setSupportingDocName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleInitiateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !surname.trim()) {
      setError('Citizen First Name and Surname are required.');
      return;
    }
    if (!dob.trim()) {
      setError('Citizen Date of Birth is required.');
      return;
    }
    if (!nationality.trim()) {
      setError('Citizen Nationality is required.');
      return;
    }
    if (!countryOfResidence.trim()) {
      setError('Country of Residence is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Citizen Mobile Phone is required.');
      return;
    }
    if (!stateOfOrigin.trim() || !lgaOfOrigin.trim()) {
      setError('State and LGA of Origin are required.');
      return;
    }
    if (!residentialAddress.trim()) {
      setError('Citizen Residential Address is required.');
      return;
    }
    if (!nokName.trim() || !nokPhone.trim()) {
      setError('Next of Kin Full Name and Phone Number are required.');
      return;
    }

    const uploadedPics = [picture1, picture2, picture3].filter(Boolean);
    if (uploadedPics.length === 0) {
      setError('At least one (1) picture of the individual is required (up to 3 allowed).');
      return;
    }

    const price = user?.role === 'AGENT' && service?.agentPrice ? service.agentPrice : (service?.price || 5000);
    if ((wallet?.availableBalance || 0) < price) {
      setError(`Insufficient wallet balance. This registration requires ${formatCurrency(price)}. Current balance: ${formatCurrency(wallet?.availableBalance || 0)}. Please fund your wallet.`);
      return;
    }

    setConfirmModalOpen(true);
  };

  const handleConfirmRegistration = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Collect all uploaded individual pictures (minimum 1, maximum 3)
      const allPictures = [picture1, picture2, picture3].filter(Boolean);
      const files: any[] = [];
      allPictures.forEach((pic, idx) => {
        files.push({
          id: `photo_${idx + 1}`,
          name: `Individual_Picture_${idx + 1}.jpg`,
          url: pic,
          type: 'image/jpeg'
        });
      });
      if (supportingDoc) {
        files.push({
          id: 'f_doc',
          name: supportingDocName || 'Supporting_Document.pdf',
          url: supportingDoc,
          type: 'document'
        });
      }

      const submittedData = {
        title,
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        surname: surname.trim(),
        fullName: `${title} ${firstName} ${middleName} ${surname}`.replace(/\s+/g, ' ').trim(),
        dob,
        gender,
        maritalStatus,
        nationality: nationality.trim(),
        countryOfResidence: countryOfResidence.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        stateOfOrigin: stateOfOrigin.trim(),
        lgaOfOrigin: lgaOfOrigin.trim(),
        town: town.trim() || undefined,
        residentialAddress: residentialAddress.trim(),
        currentState: currentState.trim() || undefined,
        currentLga: currentLga.trim() || undefined,
        nokName: nokName.trim(),
        nokRelationship,
        nokPhone: nokPhone.trim(),
        nokAddress: nokAddress.trim() || undefined,
        passportPhoto: allPictures[0],
        uploadedPictures: allPictures,
        picturesCount: allPictures.length,
        operatorAgent: user?.fullName,
        operatorUsername: user?.username,
        satisfactionTitle: user?.satisfactionTitle || 'Accredited Operator'
      };

      const res = await api.post('/service-requests/submit', {
        serviceCode: 'ONLINE_NIN_REGISTRATION',
        submittedData,
        customerFiles: files
      });

      await refreshWallet();
      setConfirmModalOpen(false);
      const ticketId = res.ticketId || res.ticket?.ticketId || res.request?.ticketId || 'SV-REGISTERED';
      setSuccessTicket(ticketId);
    } catch (err: any) {
      setError(err.message || 'Failed to submit Online NIN Registration request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <RefreshCw className="w-8 h-8 animate-spin text-[#FF6B00]" />
          <p className="text-xs">Loading registration service...</p>
        </div>
      </div>
    );
  }

  // Not authorized / Not assigned view (Rule 9)
  if (!isAssigned) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl p-8 border border-red-200 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">
            Operator Authorization Required
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
            The <strong>Online NIN Registration</strong> service is an operator enrollment tool restricted to authorized agents.
            A <strong>Super Admin</strong> or <strong>Mega Admin</strong> must assign this service to your Agent account before citizen registrations can be processed.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/services')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-black cursor-pointer shadow-md"
            >
              Back to Services Catalogue
            </button>
            <button
              onClick={() => navigate('/support')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-50 text-orange-700 font-bold text-xs hover:bg-orange-100 border border-orange-200 cursor-pointer"
            >
              Contact Administration
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success view
  if (successTicket) {
    const uploadedPicsCount = [picture1, picture2, picture3].filter(Boolean).length;
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl p-8 border border-emerald-200 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
              NIN Registration Submitted Successfully
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2">
              Citizen Enrollment Recorded
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Your registration request has been queued in the processing center.
            </p>
          </div>

          {/* Ticket ID Box with Copy */}
          <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                Official Tracking Ticket ID
              </span>
              <span className="text-xl sm:text-2xl font-mono font-black text-orange-600 tracking-wider">
                {successTicket}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(successTicket);
                setCopiedTicket(true);
                setTimeout(() => setCopiedTicket(false), 2000);
              }}
              className="px-3.5 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-orange-700 transition-colors shadow-sm cursor-pointer"
            >
              {copiedTicket ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              <span>{copiedTicket ? 'Copied Ticket!' : 'Copy Ticket ID'}</span>
            </button>
          </div>

          {/* Summary Particulars */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-left text-xs space-y-2">
            <div className="grid grid-cols-2 gap-2 text-gray-700">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Applicant Name</span>
                <strong className="text-gray-900">{firstName} {middleName} {surname}</strong>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Nationality</span>
                <strong className="text-gray-900">{nationality}</strong>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Country of Residence</span>
                <strong className="text-gray-900">{countryOfResidence}</strong>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Uploaded Pictures</span>
                <strong className="text-emerald-700">{uploadedPicsCount} Individual Photo(s) Attached</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/my-service-requests')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-black cursor-pointer shadow-md"
            >
              Track in My Service Requests
            </button>
            {['ADMIN', 'SUPER_ADMIN', 'MEGA_ADMIN'].includes(user?.role || '') && (
              <button
                onClick={() => navigate('/admin/service-requests')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 cursor-pointer shadow-md"
              >
                View in Admin Fulfillment Desk
              </button>
            )}
            <button
              onClick={() => {
                setSuccessTicket(null);
                setFirstName('');
                setMiddleName('');
                setSurname('');
                setDob('');
                setPhone('');
                setEmail('');
                setNationality('Nigerian');
                setCountryOfResidence('Nigeria');
                setPicture1('');
                setPicture2('');
                setPicture3('');
                setSupportingDoc('');
                setSupportingDocName('');
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-800 font-bold text-xs hover:bg-gray-50 cursor-pointer"
            >
              Register Another Citizen
            </button>
          </div>
        </div>
      </div>
    );
  }

  const effectivePrice = user?.role === 'AGENT' && service?.agentPrice ? service.agentPrice : (service?.price || 5000);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider">
              <Fingerprint className="w-4 h-4" />
              <span>Operator Enrollment Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
              Online NIN Registration
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Official citizen National Identity Number enrollment and processing terminal.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="text-right">
              <span className="text-[10px] text-gray-400 block font-medium">Service Fee</span>
              <span className="text-lg font-black text-gray-900">
                {formatCurrency(effectivePrice)}
              </span>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-center">
              <ShieldCheck className="w-5 h-5 mx-auto" />
              <span className="text-[10px] font-bold block mt-0.5">Authorized Agent</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Registration Error</p>
              <p className="text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Enrollment Form */}
        <form onSubmit={handleInitiateSubmit} className="space-y-8">
          {/* Section 1: Citizen Bio Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-[10px] font-black">
                1
              </span>
              <span>Citizen Personal Particulars</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Title</label>
                <select
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                >
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Miss">Miss</option>
                  <option value="Chief">Chief</option>
                  <option value="Dr">Dr</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Citizen first name"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Middle Name</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Middle name (optional)"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Surname *</label>
                <input
                  type="text"
                  required
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="Family / Last name"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Gender *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Marital Status</label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com (optional)"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nationality *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    placeholder="e.g. Nigerian"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 font-semibold focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Country of Residence *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={countryOfResidence}
                    onChange={(e) => setCountryOfResidence(e.target.value)}
                    placeholder="e.g. Nigeria"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 font-semibold focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Origin & Residence */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-[10px] font-black">
                2
              </span>
              <span>Origin & Residential Address</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">State of Origin *</label>
                <input
                  type="text"
                  required
                  value={stateOfOrigin}
                  onChange={(e) => setStateOfOrigin(e.target.value)}
                  placeholder="e.g. Imo, Lagos, Kano"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">LGA of Origin *</label>
                <input
                  type="text"
                  required
                  value={lgaOfOrigin}
                  onChange={(e) => setLgaOfOrigin(e.target.value)}
                  placeholder="Local Government Area"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Town / Village</label>
                <input
                  type="text"
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                  placeholder="Hometown / Community"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Residential Street Address *</label>
                <input
                  type="text"
                  required
                  value={residentialAddress}
                  onChange={(e) => setResidentialAddress(e.target.value)}
                  placeholder="Current street address"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Current State of Residence</label>
                <input
                  type="text"
                  value={currentState}
                  onChange={(e) => setCurrentState(e.target.value)}
                  placeholder="State of residence"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Next of Kin */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-[10px] font-black">
                3
              </span>
              <span>Next of Kin Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Next of Kin Full Name *</label>
                <input
                  type="text"
                  required
                  value={nokName}
                  onChange={(e) => setNokName(e.target.value)}
                  placeholder="NOK Full Name"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Relationship</label>
                <select
                  value={nokRelationship}
                  onChange={(e) => setNokRelationship(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                >
                  <option value="Parent">Parent</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Next of Kin Phone *</label>
                <input
                  type="tel"
                  required
                  value={nokPhone}
                  onChange={(e) => setNokPhone(e.target.value)}
                  placeholder="e.g. 08098765432"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Individual Photographs & Supporting Documents */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-[10px] font-black">
                  4
                </span>
                <span>Individual Photographs & Supporting Documents</span>
              </h3>
              <span className="text-[11px] text-gray-500 font-semibold">
                Uploaded: <strong className="text-orange-600">{[picture1, picture2, picture3].filter(Boolean).length} of 3</strong> (Min 1 required)
              </span>
            </div>

            {/* 3 Upload Slots for Individual Pictures */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Picture 1 (Required) */}
              <div className={`p-4 rounded-2xl border transition-all ${
                picture1 ? 'border-emerald-300 bg-emerald-50/20' : 'border-dashed border-gray-300 bg-gray-50/50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-orange-600" />
                    <span>Picture 1 (Primary) *</span>
                  </span>
                  {picture1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePicture(1)}
                      className="text-red-500 hover:text-red-700 text-[11px] font-bold flex items-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>

                {picture1 ? (
                  <div className="space-y-2">
                    <img src={picture1} alt="Picture 1" className="w-full h-32 rounded-xl object-cover border border-emerald-200 shadow-sm" />
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Primary Photo Ready
                    </span>
                  </div>
                ) : (
                  <div className="h-32 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 p-3 text-center bg-white">
                    <Camera className="w-6 h-6 text-gray-400" />
                    <label className="text-xs font-bold text-orange-600 hover:underline cursor-pointer">
                      Upload Picture 1 *
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePictureUpload(1, e)}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[10px] text-gray-400">JPG/PNG up to 5MB</span>
                  </div>
                )}
              </div>

              {/* Picture 2 (Optional) */}
              <div className={`p-4 rounded-2xl border transition-all ${
                picture2 ? 'border-emerald-300 bg-emerald-50/20' : 'border-dashed border-gray-300 bg-gray-50/50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-orange-600" />
                    <span>Picture 2 (Optional)</span>
                  </span>
                  {picture2 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePicture(2)}
                      className="text-red-500 hover:text-red-700 text-[11px] font-bold flex items-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>

                {picture2 ? (
                  <div className="space-y-2">
                    <img src={picture2} alt="Picture 2" className="w-full h-32 rounded-xl object-cover border border-emerald-200 shadow-sm" />
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Photo 2 Attached
                    </span>
                  </div>
                ) : (
                  <div className="h-32 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 p-3 text-center bg-white">
                    <Plus className="w-6 h-6 text-gray-400" />
                    <label className="text-xs font-bold text-gray-700 hover:underline cursor-pointer">
                      Add Picture 2
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePictureUpload(2, e)}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[10px] text-gray-400">Optional profile / angle</span>
                  </div>
                )}
              </div>

              {/* Picture 3 (Optional) */}
              <div className={`p-4 rounded-2xl border transition-all ${
                picture3 ? 'border-emerald-300 bg-emerald-50/20' : 'border-dashed border-gray-300 bg-gray-50/50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-orange-600" />
                    <span>Picture 3 (Optional)</span>
                  </span>
                  {picture3 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePicture(3)}
                      className="text-red-500 hover:text-red-700 text-[11px] font-bold flex items-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>

                {picture3 ? (
                  <div className="space-y-2">
                    <img src={picture3} alt="Picture 3" className="w-full h-32 rounded-xl object-cover border border-emerald-200 shadow-sm" />
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Photo 3 Attached
                    </span>
                  </div>
                ) : (
                  <div className="h-32 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 p-3 text-center bg-white">
                    <Plus className="w-6 h-6 text-gray-400" />
                    <label className="text-xs font-bold text-gray-700 hover:underline cursor-pointer">
                      Add Picture 3
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePictureUpload(3, e)}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[10px] text-gray-400">Optional side / document view</span>
                  </div>
                )}
              </div>
            </div>

            {/* Supporting Document */}
            <div className="p-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50/50">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Supporting Document (Birth Certificate / Voter Card / Court Affidavit)
              </label>
              <div className="mt-2 space-y-1">
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleDocUpload}
                  className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gray-200 file:text-gray-800 cursor-pointer"
                />
                {supportingDocName && (
                  <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>{supportingDocName}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Submission Bar */}
          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-500">
              Wallet Available:{' '}
              <strong className="text-gray-900">
                {formatCurrency(wallet?.availableBalance || 0)}
              </strong>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-extrabold text-sm hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Fingerprint className="w-4 h-4" />
              <span>Submit Registration ({formatCurrency(effectivePrice)})</span>
            </button>
          </div>
        </form>
      </div>

      {/* Service Authorization Modal */}
      {confirmModalOpen && (
        <ServiceAuthorizationModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title="Confirm Online NIN Registration"
          subtitle="Review applicant enrollment details and confirm your submission."
          serviceName="Online NIN Registration (Operator)"
          serviceCode="ONLINE_NIN_REGISTRATION"
          servicePrice={effectivePrice}
          walletBalance={wallet?.availableBalance ?? 0}
          reviewDetails={[
            { label: 'Citizen Name', value: `${title} ${firstName} ${middleName ? middleName + ' ' : ''}${surname}`.trim() },
            { label: 'Gender', value: gender },
            { label: 'Date of Birth', value: dob },
            { label: 'State / LGA', value: `${stateOfOrigin} / ${lgaOfOrigin}` },
            { label: 'Phone', value: phone }
          ]}
          onConfirm={handleConfirmRegistration}
          isProcessing={submitting}
          actionButtonText="Authorize & Enroll Citizen"
          processingText="Submitting Enrollment..."
        />
      )}
    </div>
  );
};
