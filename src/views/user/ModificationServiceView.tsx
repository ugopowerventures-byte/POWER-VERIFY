import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Service, VerificationRequest, BvnEnrollmentCenter } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { ServiceAuthorizationModal } from '../../components/common/ServiceAuthorizationModal';
import {
  FileEdit,
  Calendar,
  PhoneCall,
  CreditCard,
  Home,
  ShieldAlert,
  UserCheck,
  ShieldCheck,
  Lock,
  AlertCircle,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  ArrowLeft,
  UploadCloud,
  X,
  Camera,
  Image as ImageIcon,
  Info
} from 'lucide-react';

export type ModSubServiceKey = 'dob' | 'phone' | 'bvn' | 'address' | 'ipe' | 'name';

interface PassportPhoto {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export const ModificationServiceView: React.FC = () => {
  const { user, wallet, refreshWallet, navigate } = useAuth();

  const [activeTab, setActiveTab] = useState<ModSubServiceKey>('dob');
  const [services, setServices] = useState<Service[]>([]);
  const [centers, setCenters] = useState<BvnEnrollmentCenter[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string>('');

  // 1. Common NIN for NIN-based modifications
  const [nin, setNin] = useState('');

  // 2. Date of Birth Modification Fields
  const [title, setTitle] = useState('Mr');
  const [gender, setGender] = useState('Male');
  const [newDob, setNewDob] = useState('');
  const [dobPhone, setDobPhone] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('Single');
  const [town, setTown] = useState('');
  const [cityOfResidence, setCityOfResidence] = useState('');
  const [stateOfResidence, setStateOfResidence] = useState('');
  const [lgaOfResidence, setLgaOfResidence] = useState('');
  const [addressOfResidence, setAddressOfResidence] = useState('');
  const [stateOfOrigin, setStateOfOrigin] = useState('');
  const [lgaOfOrigin, setLgaOfOrigin] = useState('');
  const [stateOfBirth, setStateOfBirth] = useState('');
  const [lgaOfBirth, setLgaOfBirth] = useState('');
  const [townOfBirth, setTownOfBirth] = useState('');
  const [placeOfWork, setPlaceOfWork] = useState('');
  const [fatherSurname, setFatherSurname] = useState('');
  const [fatherFirstName, setFatherFirstName] = useState('');
  const [fatherStateOfOrigin, setFatherStateOfOrigin] = useState('');
  const [fatherLga, setFatherLga] = useState('');
  const [fatherTown, setFatherTown] = useState('');
  const [motherSurname, setMotherSurname] = useState('');
  const [motherFirstName, setMotherFirstName] = useState('');
  const [motherMaidenName, setMotherMaidenName] = useState('');
  const [motherStateOfOrigin, setMotherStateOfOrigin] = useState('');
  const [motherLga, setMotherLga] = useState('');
  const [motherTown, setMotherTown] = useState('');

  // 3. Phone Number Modification Fields
  const [phoneOld, setPhoneOld] = useState('');
  const [phoneNew, setPhoneNew] = useState('');

  // 4. BVN Modification Fields
  const [bvnNumber, setBvnNumber] = useState('');
  const [bvnDob, setBvnDob] = useState('');
  const [bvnOldPhone, setBvnOldPhone] = useState('');
  const [bvnNewPhone, setBvnNewPhone] = useState('');
  const [bvnModType, setBvnModType] = useState('Phone Number Update');

  // 5. Address Modification Fields
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrTown, setAddrTown] = useState('');
  const [addrLga, setAddrLga] = useState('');
  const [addrState, setAddrState] = useState('');

  // 6. IPE Modification Fields
  const [ipeTrackingId, setIpeTrackingId] = useState('');
  const [ipePhone, setIpePhone] = useState('');
  const [ipeStateCenter, setIpeStateCenter] = useState('');
  const [ipeDetails, setIpeDetails] = useState('');

  // 7. Name Modification Fields
  const [surname, setSurname] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [nameReason, setNameReason] = useState('Marriage / Surname Change');

  // PASSPORT PHOTOGRAPHS (Required: 2 or 3 photos)
  const [passportPhotos, setPassportPhotos] = useState<PassportPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Common Consent
  const [agreed, setAgreed] = useState(false);

  // Modal & Flow states
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<VerificationRequest | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [srvList, centerList] = await Promise.all([
          api.get('/services').catch(() => []),
          api.get('/bvn/enrollment-centers').catch(() => [])
        ]);
        setServices(srvList || []);
        if (centerList && centerList.length > 0) {
          setCenters(centerList);
          setSelectedCenterId(centerList[0].id);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    }
    loadData();
  }, []);

  const subServicesConfig: Record<
    ModSubServiceKey,
    {
      title: string;
      subTitle: string;
      code: string;
      defaultPrice: number;
      icon: React.ElementType;
      color: string;
      eta: string;
    }
  > = {
    dob: {
      title: 'Date of Birth Modification',
      subTitle: 'NIMC official date of birth correction and NPC registry synchronization',
      code: 'NIN_DOB_MOD',
      defaultPrice: 50000,
      icon: Calendar,
      color: 'amber',
      eta: 'Official registry update'
    },
    phone: {
      title: 'Phone Number Modification',
      subTitle: 'Update and re-bind registered mobile phone number on your national identity',
      code: 'NIN_PHONE_MOD',
      defaultPrice: 4500,
      icon: PhoneCall,
      color: 'blue',
      eta: 'Processed in ~1 hour'
    },
    bvn: {
      title: 'BVN Modification',
      subTitle: 'Update phone number, name or date of birth on Bank Verification Number records',
      code: 'BVN_MODIFICATION',
      defaultPrice: 3000,
      icon: CreditCard,
      color: 'emerald',
      eta: 'Processed at selected center'
    },
    address: {
      title: 'Address Modification',
      subTitle: 'Update residential address, LGA, and State of residence on NIMC records',
      code: 'NIN_ADDRESS_MOD',
      defaultPrice: 4500,
      icon: Home,
      color: 'purple',
      eta: 'Processed in ~1 hour'
    },
    ipe: {
      title: 'IPE Modification',
      subTitle: 'Clear Identity Protection Eligibility exceptions and biometric mismatches',
      code: 'IPE_MODIFICATION',
      defaultPrice: 4500,
      icon: ShieldAlert,
      color: 'red',
      eta: 'Registry clearance'
    },
    name: {
      title: 'Name Modification',
      subTitle: 'Correct spelling errors, re-order names, or change surname in NIMC registry',
      code: 'NIN_NAME_MOD',
      defaultPrice: 4500,
      icon: UserCheck,
      color: 'teal',
      eta: 'Processed in ~1 hour'
    }
  };

  const currentConfig = subServicesConfig[activeTab];

  // Calculate Price
  let currentPrice = currentConfig.defaultPrice;
  if (activeTab === 'bvn' && selectedCenterId) {
    const matched = centers.find((c) => c.id === selectedCenterId);
    if (matched) currentPrice = matched.price;
  } else {
    const matchedSrv = services.find(
      (s) => s.code === currentConfig.code || s.name.toLowerCase() === currentConfig.title.toLowerCase()
    );
    if (matchedSrv && matchedSrv.price) {
      currentPrice = matchedSrv.price;
    }
  }

  const userBalance = wallet?.availableBalance ?? 0;
  const isBalanceSufficient = userBalance >= currentPrice;
  const balanceShortfall = currentPrice - userBalance;

  // Helper to compress and downscale passport photos client-side to prevent PayloadTooLarge errors
  const compressImageFile = (file: File): Promise<{ dataUrl: string; size: number }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawUrl = event.target?.result as string;
        if (!rawUrl) {
          resolve({ dataUrl: '', size: 0 });
          return;
        }

        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ dataUrl: rawUrl, size: file.size });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          const approxSize = Math.round((compressed.length * 3) / 4);
          resolve({ dataUrl: compressed, size: approxSize });
        };
        img.onerror = () => {
          resolve({ dataUrl: rawUrl, size: file.size });
        };
        img.src = rawUrl;
      };
      reader.onerror = () => {
        resolve({ dataUrl: '', size: 0 });
      };
      reader.readAsDataURL(file);
    });
  };

  // Passport Photo Upload Handler (supports multiple selections, ensures 2 or 3 max)
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const availableSlots = 3 - passportPhotos.length;
    if (availableSlots <= 0) {
      setPhotoError('You have already uploaded the maximum of 3 passport photographs.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, availableSlots);

    filesToProcess.forEach(async (file) => {
      if (!file.type.startsWith('image/')) {
        setPhotoError('Only image files (JPG, PNG, WEBP) are accepted for passport photographs.');
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setPhotoError(`Photo "${file.name}" is too large. Each photograph must be under 25MB.`);
        return;
      }

      try {
        const { dataUrl, size } = await compressImageFile(file);
        if (dataUrl) {
          setPassportPhotos((prev) => {
            if (prev.length >= 3) return prev;
            return [
              ...prev,
              {
                id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: file.name,
                size,
                type: 'image/jpeg',
                dataUrl
              }
            ];
          });
        }
      } catch (err) {
        console.error('Failed to process photo:', err);
      }
    });

    // Reset input
    e.target.value = '';
  };

  const handleRemovePhoto = (id: string) => {
    setPassportPhotos((prev) => prev.filter((p) => p.id !== id));
    setPhotoError(null);
  };

  const validateForm = (): boolean => {
    setFormError(null);

    // 1. Mandatory Passport Photo Validation: Must be 2 or 3 photos!
    if (passportPhotos.length < 2 || passportPhotos.length > 3) {
      setFormError(
        `Passport Photo Requirement: You must upload 2 or 3 recent passport photographs. Currently uploaded: ${passportPhotos.length}.`
      );
      return false;
    }

    // 2. Tab Specific Validations
    if (activeTab === 'dob') {
      const cleanNin = nin.trim();
      if (!cleanNin || !/^\d{11}$/.test(cleanNin)) {
        setFormError('Please enter a valid 11-digit National Identity Number (NIN).');
        return false;
      }
      if (!newDob) {
        setFormError('Please enter your new/correct Date of Birth.');
        return false;
      }
      const cleanPhone = dobPhone.trim();
      if (!cleanPhone || !/^(0|234)[789][01]\d{8}$/.test(cleanPhone)) {
        setFormError('Please enter a valid 11-digit phone number.');
        return false;
      }
      if (!stateOfResidence || !lgaOfResidence || !addressOfResidence.trim()) {
        setFormError('Please provide complete residential address details (State, LGA, and Street Address).');
        return false;
      }
      if (!stateOfOrigin || !lgaOfOrigin) {
        setFormError('Please provide your State and LGA of origin.');
        return false;
      }
      if (!fatherSurname.trim() || !fatherFirstName.trim()) {
        setFormError("Please enter your Father's Surname and First Name.");
        return false;
      }
      if (!motherSurname.trim() || !motherFirstName.trim()) {
        setFormError("Please enter your Mother's Surname and First Name.");
        return false;
      }
    } else if (activeTab === 'phone') {
      const cleanNin = nin.trim();
      if (!cleanNin || !/^\d{11}$/.test(cleanNin)) {
        setFormError('Please enter a valid 11-digit National Identity Number (NIN).');
        return false;
      }
      const cleanNewPhone = phoneNew.trim();
      if (!cleanNewPhone || !/^(0|234)[789][01]\d{8}$/.test(cleanNewPhone)) {
        setFormError('Please enter a valid 11-digit New Phone Number.');
        return false;
      }
      if (phoneOld.trim() && phoneOld.trim() === cleanNewPhone) {
        setFormError('New Phone Number must be different from the Old Phone Number.');
        return false;
      }
    } else if (activeTab === 'bvn') {
      const cleanBvn = bvnNumber.trim();
      if (!cleanBvn || !/^\d{11}$/.test(cleanBvn)) {
        setFormError('Please enter a valid 11-digit Bank Verification Number (BVN).');
        return false;
      }
      if (!bvnDob) {
        setFormError('Please select your Date of Birth linked to this BVN.');
        return false;
      }
      const cleanOld = bvnOldPhone.trim();
      if (!cleanOld || !/^(0|234)[789][01]\d{8}$/.test(cleanOld)) {
        setFormError('Please enter a valid 11-digit Old Phone Number.');
        return false;
      }
      const cleanNew = bvnNewPhone.trim();
      if (!cleanNew || !/^(0|234)[789][01]\d{8}$/.test(cleanNew)) {
        setFormError('Please enter a valid 11-digit New Phone Number.');
        return false;
      }
      if (cleanOld === cleanNew) {
        setFormError('New Phone Number must be different from Old Phone Number.');
        return false;
      }
    } else if (activeTab === 'address') {
      const cleanNin = nin.trim();
      if (!cleanNin || !/^\d{11}$/.test(cleanNin)) {
        setFormError('Please enter a valid 11-digit National Identity Number (NIN).');
        return false;
      }
      if (!addrLine1.trim()) {
        setFormError('Please enter your new house number / street address.');
        return false;
      }
      if (!addrTown.trim() || !addrLga.trim() || !addrState.trim()) {
        setFormError('Please provide Town/City, LGA, and State for the new address.');
        return false;
      }
    } else if (activeTab === 'ipe') {
      const cleanNin = nin.trim();
      if (!cleanNin || !/^\d{11}$/.test(cleanNin)) {
        setFormError('Please enter a valid 11-digit National Identity Number (NIN).');
        return false;
      }
      const cleanPhone = ipePhone.trim();
      if (!cleanPhone || !/^(0|234)[789][01]\d{8}$/.test(cleanPhone)) {
        setFormError('Please enter a valid registered 11-digit phone number.');
        return false;
      }
      if (!ipeDetails.trim()) {
        setFormError('Please describe the IPE exception or error encountered on your profile.');
        return false;
      }
    } else if (activeTab === 'name') {
      const cleanNin = nin.trim();
      if (!cleanNin || !/^\d{11}$/.test(cleanNin)) {
        setFormError('Please enter a valid 11-digit National Identity Number (NIN).');
        return false;
      }
      if (!surname.trim()) {
        setFormError('Please enter the new/corrected Surname.');
        return false;
      }
      if (!firstName.trim()) {
        setFormError('Please enter the new/corrected First Name.');
        return false;
      }
    }

    if (!agreed) {
      setFormError('You must confirm that you are authorized to submit this legal modification request.');
      return false;
    }

    return true;
  };

  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!isBalanceSufficient) {
      setFormError(
        `Insufficient wallet balance. This service costs ${formatCurrency(currentPrice)}, but you have ${formatCurrency(userBalance)}. Please fund with ${formatCurrency(balanceShortfall)} to continue.`
      );
      return;
    }

    setConfirmModalOpen(true);
  };

  const handleExecutePayment = async () => {
    setProcessing(true);
    setFormError(null);

    // Build comprehensive searchData
    const searchData: Record<string, any> = {
      mainService: 'MODIFICATION',
      modificationType: currentConfig.title,
      subServiceKey: activeTab,
      declarationAccepted: true,
      passportCount: passportPhotos.length,
      passportPhotos: passportPhotos.map((p) => p.dataUrl)
    };

    if (activeTab === 'dob') {
      searchData.nin = nin.trim();
      searchData.title = title;
      searchData.gender = gender;
      searchData.newDob = newDob;
      searchData.phone = dobPhone.trim();
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
    } else if (activeTab === 'phone') {
      searchData.nin = nin.trim();
      searchData.oldPhone = phoneOld.trim();
      searchData.newPhone = phoneNew.trim();
      searchData.phone = phoneNew.trim();
    } else if (activeTab === 'bvn') {
      const centerObj = centers.find((c) => c.id === selectedCenterId);
      searchData.bvn = bvnNumber.trim();
      searchData.bvnNumber = bvnNumber.trim();
      searchData.dob = bvnDob;
      searchData.oldPhone = bvnOldPhone.trim();
      searchData.newPhone = bvnNewPhone.trim();
      searchData.phone = bvnNewPhone.trim();
      searchData.bvnModificationType = bvnModType;
      searchData.enrollmentCenter = centerObj ? centerObj.name : selectedCenterId;
      searchData.enrollmentCenterId = selectedCenterId;
    } else if (activeTab === 'address') {
      searchData.nin = nin.trim();
      searchData.newAddressLine1 = addrLine1.trim();
      searchData.newAddressLine2 = addrLine2.trim();
      searchData.townCity = addrTown.trim();
      searchData.lga = addrLga.trim();
      searchData.state = addrState.trim();
      searchData.fullNewAddress = `${addrLine1.trim()}${addrLine2.trim() ? ', ' + addrLine2.trim() : ''}, ${addrTown.trim()}, ${addrLga.trim()}, ${addrState.trim()}`;
    } else if (activeTab === 'ipe') {
      searchData.nin = nin.trim();
      searchData.trackingId = ipeTrackingId.trim();
      searchData.phone = ipePhone.trim();
      searchData.stateCenter = ipeStateCenter.trim();
      searchData.ipeDetails = ipeDetails.trim();
      searchData.modificationDetails = ipeDetails.trim();
    } else if (activeTab === 'name') {
      searchData.nin = nin.trim();
      searchData.surname = surname.trim();
      searchData.firstName = firstName.trim();
      searchData.middleName = middleName.trim();
      searchData.fullName = `${surname.trim()} ${firstName.trim()} ${middleName.trim()}`.trim();
      searchData.reason = nameReason;
    }

    // Prepare customer files array for backend persistence
    const customerFiles = passportPhotos.map((photo, idx) => ({
      id: `file_${Date.now()}_${idx}`,
      name: `passport_photo_${idx + 1}_${photo.name}`,
      size: photo.size,
      type: photo.type,
      url: photo.dataUrl
    }));

    try {
      const response = await api.post('/service-requests/submit', {
        serviceCode: 'MODIFICATION',
        submittedData: searchData,
        customerFiles,
        idempotencyKey: `idem_mod_${activeTab}_${(nin || bvnNumber).trim()}_${Date.now()}`
      });

      setConfirmModalOpen(false);
      setSubmissionSuccess({
        ...response.request,
        trackingId: response.trackingId || response.ticketId || response.request?.ticketId,
        serviceName: `NIN Modification (${currentConfig.title})`,
        amountCharged: response.amountCharged || response.amount || currentPrice,
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
              <span className="font-bold text-gray-900">NIN Modification ({currentConfig.title})</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-sans font-medium">Tracking ID:</span>
              <span className="font-bold text-orange-600 tracking-wider text-sm select-all">{trackingId}</span>
            </div>
            {nin && (
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                <span className="text-gray-500 font-sans font-medium">NIN:</span>
                <span className="font-bold text-gray-900">{nin}</span>
              </div>
            )}
            {bvnNumber && (
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                <span className="text-gray-500 font-sans font-medium">BVN:</span>
                <span className="font-bold text-gray-900">{bvnNumber}</span>
              </div>
            )}
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

          {/* Mini thumbnails of submitted passport photos */}
          {passportPhotos.length > 0 && (
            <div className="space-y-2 text-left bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <span className="text-xs font-bold text-gray-700 block">Uploaded Passport Photographs:</span>
              <div className="flex gap-3">
                {passportPhotos.map((p, i) => (
                  <div key={p.id} className="relative w-16 h-20 rounded-xl overflow-hidden border border-gray-300 shadow-xs">
                    <img src={p.dataUrl} alt={`Passport ${i + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center font-bold">
                      Photo {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left flex items-start gap-3 text-xs text-amber-950">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Manual Fulfillment Notice</p>
              <p className="text-amber-900">
                This is a manual service. Our administrators are reviewing your submission particulars and passport photographs.
                Your completed job will appear in your account upon fulfillment.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigate('/my-service-requests')}
              className="flex-1 py-3 rounded-xl bg-[#FF6B00] text-black font-bold text-xs hover:brightness-110 transition-all shadow-md"
            >
              Track in My Service Requests
            </button>
            <button
              onClick={() => navigate('/services')}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors"
            >
              Browse Other Services
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
          <span className="text-gray-900 font-bold">MODIFICATION</span>
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
        <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-white">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[#FF6B00]/15 text-[#FF6B00]">
              <FileEdit className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border bg-orange-50 text-orange-700 border-orange-200">
                OFFICIAL PORTAL
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                MODIFICATION
              </h1>
              <p className="text-xs text-gray-500">
                Select your modification type, enter parameters, and upload required passport photographs
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
            <span className="block text-[11px] font-bold uppercase text-gray-400">Current Fee</span>
            <span className="text-2xl font-black text-gray-950 font-mono tracking-tight text-[#FF6B00]">
              {formatCurrency(currentPrice)}
            </span>
          </div>
        </div>

        {/* 6 Sub-Service Selection Tabs */}
        <div className="p-4 sm:p-6 bg-gray-50/80 border-b border-gray-200">
          <label className="block text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider">
            Select Modification Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {(Object.keys(subServicesConfig) as ModSubServiceKey[]).map((key) => {
              const cfg = subServicesConfig[key];
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
                  className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'border-[#FF6B00] bg-white ring-2 ring-orange-500/20 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isSelected ? 'bg-[#FF6B00] text-black font-bold' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-xs font-bold ${isSelected ? 'text-gray-950 font-extrabold' : 'text-gray-800'}`}>
                      {cfg.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100">
                    <span className="text-gray-400 text-[10px]">Fee:</span>
                    <span className="font-mono font-bold text-orange-600">
                      {formatCurrency(
                        key === 'bvn' && selectedCenterId
                          ? (centers.find((c) => c.id === selectedCenterId)?.price ?? cfg.defaultPrice)
                          : cfg.defaultPrice
                      )}
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

        {/* Active Modification Form */}
        <form onSubmit={handleOpenReview} className="p-6 sm:p-8 space-y-6">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-gray-900">{currentConfig.title}</h2>
              <p className="text-xs text-gray-500">{currentConfig.subTitle}</p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 font-bold border border-amber-500/20">
              {currentConfig.eta}
            </span>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: DATE OF BIRTH MODIFICATION FIELDS                                  */}
          {/* ========================================================================= */}
          {activeTab === 'dob' && (
            <div className="space-y-5">
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 text-xs font-mono font-bold outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">Title</label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
                  >
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Miss">Miss</option>
                    <option value="Chief">Chief</option>
                    <option value="Dr">Dr</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    New Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Active Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={dobPhone}
                    onChange={(e) => setDobPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 08012345678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-mono font-bold outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">Marital Status</label>
                  <select
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-gray-100">
                <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide block">
                  Residential Particulars
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={addressOfResidence}
                    onChange={(e) => setAddressOfResidence(e.target.value)}
                    placeholder="House No & Street Address *"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={cityOfResidence}
                    onChange={(e) => setCityOfResidence(e.target.value)}
                    placeholder="Town / City of Residence *"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={stateOfResidence}
                    onChange={(e) => setStateOfResidence(e.target.value)}
                    placeholder="State of Residence *"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-gray-100">
                <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide block">
                  Origin & Lineage
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={stateOfOrigin}
                    onChange={(e) => setStateOfOrigin(e.target.value)}
                    placeholder="State of Origin *"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={lgaOfOrigin}
                    onChange={(e) => setLgaOfOrigin(e.target.value)}
                    placeholder="LGA of Origin *"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={fatherSurname}
                    onChange={(e) => setFatherSurname(e.target.value)}
                    placeholder="Father's Surname *"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={fatherFirstName}
                    onChange={(e) => setFatherFirstName(e.target.value)}
                    placeholder="Father's First Name *"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={motherSurname}
                    onChange={(e) => setMotherSurname(e.target.value)}
                    placeholder="Mother's Surname *"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={motherFirstName}
                    onChange={(e) => setMotherFirstName(e.target.value)}
                    placeholder="Mother's First Name *"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PHONE NUMBER MODIFICATION FIELDS                                   */}
          {/* ========================================================================= */}
          {activeTab === 'phone' && (
            <div className="space-y-4">
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 text-xs font-mono font-bold outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Old Phone Number (Optional if lost)
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={phoneOld}
                  onChange={(e) => setPhoneOld(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 08012345678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-mono outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  New Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={phoneNew}
                  onChange={(e) => setPhoneNew(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter new 11-digit phone number to bind"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 text-xs font-mono font-bold outline-none"
                  required
                />
                <p className="text-[11px] text-gray-500">
                  This new phone number will be bound to your NIMC record and receive verification OTPs.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: BVN MODIFICATION FIELDS                                            */}
          {/* ========================================================================= */}
          {activeTab === 'bvn' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Select BVN Enrollment Center <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCenterId}
                  onChange={(e) => setSelectedCenterId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold outline-none"
                  required
                >
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {formatCurrency(c.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Bank Verification Number (BVN) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={bvnNumber}
                  onChange={(e) => setBvnNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 11-digit BVN"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 text-xs font-mono font-bold outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Date of Birth on BVN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={bvnDob}
                    onChange={(e) => setBvnDob(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">Modification Action</label>
                  <select
                    value={bvnModType}
                    onChange={(e) => setBvnModType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
                  >
                    <option value="Phone Number Update">Phone Number Update</option>
                    <option value="Date of Birth Correction">Date of Birth Correction</option>
                    <option value="Name Arrangement Correction">Name Arrangement Correction</option>
                    <option value="Linked Account Update">Linked Account Update</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Old Phone Number on BVN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={bvnOldPhone}
                    onChange={(e) => setBvnOldPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter old phone number"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-mono outline-none"
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
                    value={bvnNewPhone}
                    onChange={(e) => setBvnNewPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter new phone number"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-mono font-bold outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: ADDRESS MODIFICATION FIELDS                                        */}
          {/* ========================================================================= */}
          {activeTab === 'address' && (
            <div className="space-y-4">
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 text-xs font-mono font-bold outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  New House Number & Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addrLine1}
                  onChange={(e) => setAddrLine1(e.target.value)}
                  placeholder="e.g. 15 Adeola Odeku Street"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  value={addrLine2}
                  onChange={(e) => setAddrLine2(e.target.value)}
                  placeholder="Apartment, suite, or landmark"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Town / City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addrTown}
                    onChange={(e) => setAddrTown(e.target.value)}
                    placeholder="e.g. Ikeja"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
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
                    placeholder="e.g. Ikeja LGA"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
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
                    placeholder="e.g. Lagos"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: IPE MODIFICATION FIELDS                                            */}
          {/* ========================================================================= */}
          {activeTab === 'ipe' && (
            <div className="space-y-4">
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 text-xs font-mono font-bold outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    NIMC Tracking ID (Optional if available)
                  </label>
                  <input
                    type="text"
                    value={ipeTrackingId}
                    onChange={(e) => setIpeTrackingId(e.target.value)}
                    placeholder="e.g. TRK-12345678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-mono outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Registered Mobile Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={ipePhone}
                    onChange={(e) => setIpePhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 08012345678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-mono font-bold outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  State / Enrollment Center Where Exception Occurred
                </label>
                <input
                  type="text"
                  value={ipeStateCenter}
                  onChange={(e) => setIpeStateCenter(e.target.value)}
                  placeholder="e.g. NIMC State Office, Victoria Island Lagos"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  IPE Exception / Error Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={ipeDetails}
                  onChange={(e) => setIpeDetails(e.target.value)}
                  placeholder="Describe the error message, biometric mismatch or reason for IPE clearance request"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: NAME MODIFICATION FIELDS                                           */}
          {/* ========================================================================= */}
          {activeTab === 'name' && (
            <div className="space-y-4">
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 text-xs font-mono font-bold outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    New / Corrected Surname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="Enter surname"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    New / Corrected First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Middle Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Enter middle name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800">Reason for Name Modification</label>
                <select
                  value={nameReason}
                  onChange={(e) => setNameReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none"
                >
                  <option value="Marriage / Surname Change">Marriage / Maiden Name to Married Surname</option>
                  <option value="Typographical / Spelling Correction">Typographical / Spelling Correction</option>
                  <option value="Legal Name Change by Gazette / Affidavit">Legal Name Change by Gazette / Court Affidavit</option>
                  <option value="Name Re-ordering / Arrangement">Name Re-ordering / Arrangement</option>
                </select>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MANDATORY PASSPORT PHOTO UPLOAD (FOR ALL 6 MODIFICATIONS)                */}
          {/* ========================================================================= */}
          <div className="pt-6 border-t border-gray-200 space-y-4">
            {/* Clear Customer Instructions */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 space-y-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-black text-xs uppercase tracking-wider text-amber-900">
                  PASSPORT PHOTO REQUIREMENTS (REQUIRED: 2 OR 3 PHOTOS)
                </span>
              </div>
              <ul className="text-xs text-amber-900/90 space-y-1 list-disc pl-5 leading-relaxed">
                <li>Upload 2 or 3 recent passport photographs of the person the modification is for.</li>
                <li>Photos must be clear and show the person's face properly.</li>
                <li>Do not upload blurry, dark, cropped, damaged, or heavily edited images.</li>
                <li>Make sure the photographs belong to the person whose information is being modified.</li>
                <li>Upload only the requested person's passport photographs.</li>
                <li>Review the photographs before submitting your request.</li>
              </ul>
            </div>

            {/* Upload Area & Counter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-800">
                  Upload Passport Photographs <span className="text-red-500">*</span>
                </label>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    passportPhotos.length >= 2 && passportPhotos.length <= 3
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {passportPhotos.length} of 2–3 required photos uploaded
                </span>
              </div>

              {photoError && (
                <p className="text-xs text-red-600 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {photoError}
                </p>
              )}

              {/* Upload Drop Zone / Button */}
              {passportPhotos.length < 3 && (
                <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-gray-300 hover:border-orange-500 hover:bg-orange-50/20 transition-all cursor-pointer bg-gray-50/50">
                  <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-xs font-bold text-gray-800">
                    Click to browse or drag & drop passport photo
                  </span>
                  <span className="text-[11px] text-gray-500 mt-0.5">
                    JPG, PNG or WEBP (Max 8MB per photo). Upload 2 or 3 clear pictures.
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              )}

              {/* Preview Grid */}
              {passportPhotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {passportPhotos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="relative rounded-2xl border border-gray-200 overflow-hidden bg-gray-900 group shadow-xs"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={`Passport photo ${index + 1}`}
                        className="w-full h-36 object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-2">
                        <div className="flex justify-between items-start">
                          <span className="px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                            Photo #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(photo.id)}
                            className="p-1 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                            title="Remove photo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-white truncate font-medium">{photo.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Declaration Checkbox */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer text-xs text-gray-700 select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded text-orange-600 focus:ring-orange-600"
                required
              />
              <span>
                I hereby declare that all supplied personal data, changes, and uploaded passport photographs belong to the individual named, and I authorize Bazeright Verify to submit this legal modification request on my behalf.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={!isBalanceSufficient || passportPhotos.length < 2 || passportPhotos.length > 3}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-[#FF6B00] hover:brightness-110 disabled:opacity-50 text-black font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Submit Modification Request</span>
              <span className="font-mono text-black/80 font-bold">({formatCurrency(currentPrice)})</span>
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
          title="Authorize Modification Request"
          subtitle="Review modification request parameters and choose your authorization method."
          serviceName={`NIN Modification (${currentConfig.title})`}
          serviceCode="MODIFICATION"
          servicePrice={currentPrice}
          walletBalance={userBalance}
          reviewDetails={[
            { label: 'Sub-Service', value: currentConfig.title },
            ...(nin ? [{ label: 'NIN', value: nin }] : []),
            ...(bvnNumber ? [{ label: 'BVN', value: bvnNumber }] : []),
            { label: 'Attached Photos', value: `${passportPhotos.length} photo(s)` }
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
