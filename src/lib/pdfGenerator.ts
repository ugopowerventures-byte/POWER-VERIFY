import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { VerificationRequest, VerificationResult } from '../types';
import {
  SlipTemplateMapping,
  PREMIUM_SLIP_MAPPING,
  STANDARD_SLIP_MAPPING,
  REGULAR_SLIP_MAPPING,
  BVN_PREMIUM_SLIP_MAPPING,
  formatNinSpaced,
  formatBvnSpaced
} from './slipMappings';
import { generateBarcodeDataUrl } from './barcodeGenerator';

export type SlipFormatType = 'PREMIUM' | 'STANDARD' | 'REGULAR';

export interface SlipFormatOption {
  id: SlipFormatType;
  label: string;
  description: string;
  templateUrl: string;
}

/**
 * AUTHENTIC TEMPLATE IMAGE URLS
 */
export const SLIP_TEMPLATE_URLS = {
  NIN_PREMIUM: '/templates/nin_premium.jpg',
  BVN_PREMIUM: '/templates/bvn_premium.jpg',
  NIN_STANDARD: '/templates/nin_standard.jpg',
  NIN_REGULAR: '/templates/nin_regular.jpg'
} as const;

export const REMOTE_SLIP_TEMPLATE_URLS = {
  NIN_PREMIUM: 'https://i.ibb.co/XZpC5fTL/20260921-214903.jpg',
  BVN_PREMIUM: 'https://i.ibb.co/Zp1bjKLd/20260921-222422.jpg',
  NIN_STANDARD: 'https://i.ibb.co/BFHms81/20260921-223018.jpg',
  NIN_REGULAR: 'https://i.ibb.co/5hWsw4yg/20260921-223813.jpg'
} as const;

/**
 * Normalizes all returned citizen data from the provider so every field is mapped
 */
export interface NormalizedCitizenRecord {
  fullName: string;
  surname: string;
  firstName: string;
  middleName: string;
  idNumber: string;
  nin: string;
  bvn: string;
  dateOfBirth: string;
  gender: string;
  phoneNumber: string;
  email: string;
  trackingId: string;
  residenceAddress: string;
  town?: string;
  stateOfOrigin: string;
  lgaOfOrigin: string;
  nationality?: string;
  registrationDate?: string;
  status?: string;
  banksLinked: string;
  photoUrl: string;
  reference: string;
  providerReference?: string;
  verifiedAt: string;
}

export function extractNormalizedCitizen(
  req: VerificationRequest,
  res?: VerificationResult | null
): NormalizedCitizenRecord {
  const d: Record<string, any> = res?.returnedData || req.resultData || {};

  const surname = (d.surname || d.lastName || d.surName || '').toString().trim();
  const firstName = (d.firstName || d.firstname || '').toString().trim();
  const middleName = (d.middleName || d.middlename || d.otherNames || '').toString().trim();

  let fullName = (d.fullName || d.fullname || '').toString().trim();
  if (!fullName && (surname || firstName)) {
    fullName = [surname, firstName, middleName].filter(Boolean).join(' ');
  }

  // Strict extraction of verified NIN from provider data ONLY
  let nin = (d.nin || '').toString().trim();
  if (!nin && d.idNumber && /^\d{11}$/.test(String(d.idNumber).trim()) && !req.serviceCode.startsWith('BVN')) {
    nin = String(d.idNumber).trim();
  }

  // Strict extraction of verified BVN from provider data ONLY
  let bvn = (d.bvn || '').toString().trim();
  if (!bvn && (req.serviceCode.startsWith('BVN') || req.serviceName.toLowerCase().includes('bvn'))) {
    if (d.idNumber && /^\d{11}$/.test(String(d.idNumber).trim())) {
      bvn = String(d.idNumber).trim();
    }
  }

  const idNumber = nin || bvn || (d.idNumber ? String(d.idNumber).trim() : '');

  const dateOfBirth = (d.dateOfBirth || d.dob || d.birthdate || '').toString().trim();
  const gender = (d.gender || d.sex || '').toString().trim().toUpperCase();
  const phoneNumber = (d.phoneNumber || d.phone || d.telecomNumber || d.telephoneno || d.mobile || '').toString().trim();
  const email = (d.email || d.emailAddress || '').toString().trim();

  const trackingId = (d.trackingId || d.tracking_id || d.trackingIdNumber || d.id || '').toString().trim();
  const residenceAddress = (d.residenceAddress || d.address || d.residential_address || d.residence || d.address_line || '').toString().trim();
  const town = (d.residence_town || d.town || d.city || d.address_town || '').toString().trim();
  const stateOfOrigin = (d.stateOfOrigin || d.state || d.state_of_origin || d.address_state || '').toString().trim();
  const lgaOfOrigin = (d.lgaOfOrigin || d.lga || d.lga_of_origin || d.address_lga || '').toString().trim();
  const nationality = (d.birthcountry || d.country || d.nationality || (nin || bvn ? 'Nigerian' : '')).toString().trim();
  const registrationDate = (d.registrationDate || d.registration_date || d.created_at || d.enrollmentDate || '').toString().trim();
  const status = (d.status || (req.status === 'COMPLETED' || req.status === 'SUCCESS' ? 'Active' : req.status) || 'Active').toString().trim();
  const banksLinked = (d.banksLinked || d.enrollmentBank || d.bank || d.bank_name || '').toString().trim();

  const photoUrl = (d.photoUrl || d.photo || d.image || res?.photoUrl || '').toString().trim();
  const reference = req.reference || '';
  const providerReference = (d.reference || d.reference_id || d.referenceId || res?.reference || req.reference || '').toString().trim();
  const verifiedAt = res?.verifiedAt || req.createdAt || new Date().toISOString();

  return {
    fullName,
    surname,
    firstName,
    middleName,
    idNumber,
    nin,
    bvn,
    dateOfBirth,
    gender,
    phoneNumber,
    email,
    trackingId,
    residenceAddress,
    town,
    stateOfOrigin,
    lgaOfOrigin,
    nationality,
    registrationDate,
    status,
    banksLinked,
    photoUrl,
    reference,
    providerReference,
    verifiedAt
  };
}

/**
 * Determine which slip format options to show for a verification in the dropdown only.
 */
export function getAvailableSlipFormats(
  serviceCode?: string,
  serviceName?: string
): SlipFormatOption[] | null {
  const code = (serviceCode || '').toUpperCase().trim();
  const name = (serviceName || '').toLowerCase().trim();

  // 1. BVN Verification -> ONLY BVN Premium Slip
  const isBvn =
    code === 'BVN' ||
    code === 'BVN_VERIFICATION' ||
    code === 'BVN_RETRIEVAL' ||
    code === 'BVN_PHONE' ||
    code === 'BVN_CRM' ||
    code === 'CAFE_BVN' ||
    (code.startsWith('BVN') && !code.includes('MOD') && !code.includes('ANDROID')) ||
    (name.includes('bvn') && (name.includes('verification') || name.includes('retrieval') || name.includes('lookup') || name.includes('search') || name === 'bvn'));

  if (isBvn) {
    return [
      {
        id: 'PREMIUM',
        label: 'BVN PREMIUM SLIP',
        description: 'Official BVN Premium Verification Slip Template',
        templateUrl: SLIP_TEMPLATE_URLS.BVN_PREMIUM
      }
    ];
  }

  // 2. Personalization / NIN Slip
  const isNinSlipService =
    code === 'NIN_SLIP' ||
    code === 'NIN_PREMIUM' ||
    code === 'NIN_STANDARD' ||
    code === 'NIN_REGULAR' ||
    name.includes('premium') ||
    name.includes('standard') ||
    name.includes('regular slip');

  if (isNinSlipService) {
    return [
      {
        id: 'PREMIUM',
        label: 'PREMIUM SLIP',
        description: 'Official NIMC NIN Premium Slip Template',
        templateUrl: SLIP_TEMPLATE_URLS.NIN_PREMIUM
      },
      {
        id: 'STANDARD',
        label: 'STANDARD SLIP',
        description: 'Official NIMC NIN Standard Slip Template',
        templateUrl: SLIP_TEMPLATE_URLS.NIN_STANDARD
      },
      {
        id: 'REGULAR',
        label: 'REGULAR SLIP',
        description: 'Official NIMC NIN Regular Slip Template',
        templateUrl: SLIP_TEMPLATE_URLS.NIN_REGULAR
      }
    ];
  }

  // 3. Demographic Verification -> NIN Templates
  const isDemographic =
    code === 'DEMOGRAPHIC_VERIFICATION' ||
    code === 'DEMOGRAPHIC' ||
    code === 'DEMOGRAPHIC_SEARCH' ||
    name.includes('demographic');

  if (isDemographic) {
    return [
      {
        id: 'PREMIUM',
        label: 'PREMIUM SLIP',
        description: 'Official NIMC NIN Premium Slip Template',
        templateUrl: SLIP_TEMPLATE_URLS.NIN_PREMIUM
      },
      {
        id: 'STANDARD',
        label: 'STANDARD SLIP',
        description: 'Official NIMC NIN Standard Slip Template',
        templateUrl: SLIP_TEMPLATE_URLS.NIN_STANDARD
      },
      {
        id: 'REGULAR',
        label: 'REGULAR SLIP',
        description: 'Official NIMC NIN Regular Slip Template',
        templateUrl: SLIP_TEMPLATE_URLS.NIN_REGULAR
      }
    ];
  }

  // 4. NIN Verification, Phone Verification & NIN Phone Search -> Official NIN Templates
  const isNinOrPhone =
    code === 'NIN' ||
    code === 'NIN_VERIFICATION' ||
    code === 'NIN_VALIDATION' ||
    code === 'PERSONALIZATION' ||
    code === 'NIN_TRACKING' ||
    code === 'PHONE' ||
    code === 'PHONE_VERIFICATION' ||
    code === 'NIN_PHONE' ||
    code === 'NIN_PHONE_SEARCH' ||
    code === 'PHONE_NIN' ||
    (code.includes('PHONE') && !code.includes('BVN') && !code.includes('MOD')) ||
    (name.includes('phone') && !name.includes('bvn') && !name.includes('mod')) ||
    (code.startsWith('NIN') && !code.includes('MOD') && !code.includes('DELINK')) ||
    (name.includes('nin') && !name.includes('mod') && !name.includes('delink'));

  if (isNinOrPhone) {
    return [
      {
        id: 'PREMIUM',
        label: 'PREMIUM SLIP',
        description: 'Official NIMC NIN Premium Slip Template',
        templateUrl: SLIP_TEMPLATE_URLS.NIN_PREMIUM
      },
      {
        id: 'STANDARD',
        label: 'STANDARD SLIP',
        description: 'Official NIMC NIN Standard Slip Template',
        templateUrl: SLIP_TEMPLATE_URLS.NIN_STANDARD
      },
      {
        id: 'REGULAR',
        label: 'REGULAR SLIP',
        description: 'Official NIMC NIN Regular Slip Template',
        templateUrl: SLIP_TEMPLATE_URLS.NIN_REGULAR
      }
    ];
  }

  return null;
}

const dataUrlMemoryCache = new Map<string, string>();

/**
 * Preload official slip templates into browser memory for zero-lag instant downloading
 */
export async function preloadSlipTemplates(): Promise<void> {
  const templates = [
    '/templates/nin_premium.jpg',
    '/templates/nin_standard.jpg',
    '/templates/nin_regular.jpg',
    '/templates/bvn_premium.jpg'
  ];
  await Promise.allSettled(templates.map((t) => urlToDataUrl(t, 4000)));
}

export function getProxiedImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('/')) return url;
  return `/api/slip-template-proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Loads an image reliably via browser Image element with CORS handling
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // If direct failed and isn't already proxied, try proxy route
      if (!src.includes('/api/slip-template-proxy') && src.startsWith('http')) {
        const proxied = getProxiedImageUrl(src);
        const retryImg = new Image();
        retryImg.crossOrigin = 'anonymous';
        retryImg.onload = () => resolve(retryImg);
        retryImg.onerror = (e) => reject(e);
        retryImg.src = proxied;
      } else {
        reject(new Error(`Failed to load image: ${src}`));
      }
    };
    img.src = src.startsWith('http') ? getProxiedImageUrl(src) : src;
  });
}

/**
 * Converts an image element or URL to a clean base64 data URL with in-memory caching and fast timeout
 */
export async function urlToDataUrl(url: string, timeoutMs: number = 3500): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (dataUrlMemoryCache.has(url)) {
    return dataUrlMemoryCache.get(url)!;
  }

  // Attempt direct fast fetch first
  try {
    const fetchUrl = url.startsWith('http') ? getProxiedImageUrl(url) : url;
    const res = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (res.ok) {
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
      if (dataUrl) {
        dataUrlMemoryCache.set(url, dataUrl);
        return dataUrl;
      }
    }
  } catch {
    // Fall back to Image canvas conversion
  }

  try {
    const img = await loadImage(url);
    const cvs = document.createElement('canvas');
    cvs.width = img.naturalWidth || img.width;
    cvs.height = img.naturalHeight || img.height;
    const ctx = cvs.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      const dataUrl = cvs.toDataURL('image/jpeg', 0.95);
      if (dataUrl) {
        dataUrlMemoryCache.set(url, dataUrl);
        return dataUrl;
      }
    }
  } catch (err) {
    console.warn('urlToDataUrl error for:', url, err);
  }
  return '';
}

/**
 * Loads the template background as data URL (tries local path, then remote URL)
 */
async function getTemplateDataUrl(mapping: SlipTemplateMapping): Promise<string> {
  // 1. Try local path first
  if (mapping.localTemplatePath) {
    const localData = await urlToDataUrl(mapping.localTemplatePath, 3500);
    if (localData) return localData;
  }
  // 2. Try remote URL
  if (mapping.remoteTemplateUrl) {
    const remoteData = await urlToDataUrl(mapping.remoteTemplateUrl, 3500);
    if (remoteData) return remoteData;
  }
  return '';
}

/**
 * Generates an authentic biometric portrait avatar if no photoUrl was returned
 */
export function createDefaultBiometricPhotoDataUrl(name: string): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, 480);
  grad.addColorStop(0, '#e2e8f0');
  grad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 480);

  // Silhouette Head
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(200, 180, 75, 0, Math.PI * 2);
  ctx.fill();

  // Silhouette Shoulders
  ctx.beginPath();
  ctx.ellipse(200, 360, 140, 110, 0, 0, Math.PI * 2);
  ctx.fill();

  // Watermark text
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BIOMETRIC RECORD', 200, 440);

  // Initials badge
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  if (initials) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillText(initials, 200, 192);
  }

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * CORE UNFLATTENED VECTOR PDF GENERATOR
 * 
 * CRITICAL ARCHITECTURAL CONFORMANCE:
 * 1. Background template is added as ONE separate image object (doc.addImage).
 * 2. Customer photo is added as an independent image object (doc.addImage).
 * 3. Barcode is added as an independent image object (doc.addImage).
 * 4. QR code is added as an independent image object (doc.addImage).
 * 5. Dynamic text is generated as REAL VECTOR PDF TEXT (doc.text).
 * 
 * Result: Text is 100% selectable, copyable, searchable, and editable in PDF editors!
 * ZERO flattening into a completed screenshot bitmap!
 */
export async function generateSlipPdfWithMapping(
  mapping: SlipTemplateMapping,
  req: VerificationRequest,
  res?: VerificationResult | null,
  filenamePrefix: string = 'Slip'
): Promise<void> {
  const citizen = extractNormalizedCitizen(req, res);

  const isLandscape = mapping.orientation === 'landscape';
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidthMm = doc.internal.pageSize.getWidth();
  const pageHeightMm = doc.internal.pageSize.getHeight();

  // Compute printable dimensions centered on A4
  const slipWidthMm = mapping.printWidthMm;
  const slipHeightMm = mapping.printHeightMm;
  const slipOriginXMm = (pageWidthMm - slipWidthMm) / 2;
  const slipOriginYMm = (pageHeightMm - slipHeightMm) / 2;

  // PREPARE ALL GRAPHICAL ASSETS IN PARALLEL FOR ULTRA-FAST PDF GENERATION
  const [templateDataUrl, photoDataUrl, qrDataUrl, backQrDataUrl, barcodeDataUrl] = await Promise.all([
    getTemplateDataUrl(mapping).catch(() => ''),
    (async () => {
      if (!mapping.photo) return '';
      let pUrl = citizen.photoUrl;
      if (pUrl && !pUrl.startsWith('data:')) {
        pUrl = await urlToDataUrl(pUrl, 3000);
      }
      if (!pUrl) {
        pUrl = createDefaultBiometricPhotoDataUrl(citizen.fullName || citizen.surname);
      }
      return pUrl;
    })().catch(() => createDefaultBiometricPhotoDataUrl(citizen.fullName || citizen.surname)),
    (async () => {
      if (!mapping.qrCode) return '';
      const cleanNin = (citizen.nin || citizen.idNumber || '').replace(/\D/g, '');
      const qrData = `UGOPAWAVERIFY|ID:${cleanNin}|SURNAME:${citizen.surname}|FIRSTNAME:${citizen.firstName}|DOB:${citizen.dateOfBirth}|REF:${citizen.reference}`;
      return QRCode.toDataURL(qrData, { margin: 1, width: 256 });
    })().catch(() => ''),
    (async () => {
      if (!mapping.backQrCode) return '';
      const cleanNin = (citizen.nin || citizen.idNumber || '').replace(/\D/g, '');
      const qrData = `NIMC|VERIFIED|NIN:${cleanNin}|SURNAME:${citizen.surname}|REF:${citizen.reference}`;
      return QRCode.toDataURL(qrData, { margin: 1, width: 256 });
    })().catch(() => ''),
    (async () => {
      if (!mapping.barcode) return '';
      const barcodeValue =
        (citizen.nin || citizen.idNumber || citizen.trackingId || citizen.reference || '00000000000').replace(/\D/g, '') ||
        citizen.reference;
      return generateBarcodeDataUrl(barcodeValue, {
        format: mapping.barcode.format,
        width: 2,
        height: 60,
        margin: 0
      });
    })().catch(() => '')
  ]);

  // 1. ADD TEMPLATE BACKGROUND AS SEPARATE PDF IMAGE OBJECT
  if (templateDataUrl) {
    try {
      doc.addImage(
        templateDataUrl,
        'JPEG',
        slipOriginXMm,
        slipOriginYMm,
        slipWidthMm,
        slipHeightMm,
        undefined,
        'FAST'
      );
    } catch (err) {
      console.warn('Failed to add template background to PDF:', err);
    }
  }

  // 2. ADD CUSTOMER PHOTO AS INDEPENDENT IMAGE OBJECT
  if (mapping.photo && photoDataUrl) {
    try {
      const photoXMm = slipOriginXMm + (mapping.photo.xPercent / 100) * slipWidthMm;
      const photoYMm = slipOriginYMm + (mapping.photo.yPercent / 100) * slipHeightMm;
      const photoWMm = (mapping.photo.widthPercent / 100) * slipWidthMm;
      const photoHMm = (mapping.photo.heightPercent / 100) * slipHeightMm;

      doc.addImage(
        photoDataUrl,
        'JPEG',
        photoXMm,
        photoYMm,
        photoWMm,
        photoHMm,
        undefined,
        'FAST'
      );
    } catch (err) {
      console.warn('Failed to place photo object in PDF:', err);
    }
  }

  // 3. ADD QR CODE AS INDEPENDENT IMAGE OBJECT
  if (mapping.qrCode && qrDataUrl) {
    try {
      const qrXMm = slipOriginXMm + (mapping.qrCode.xPercent / 100) * slipWidthMm;
      const qrYMm = slipOriginYMm + (mapping.qrCode.yPercent / 100) * slipHeightMm;
      const qrWMm = (mapping.qrCode.widthPercent / 100) * slipWidthMm;
      const qrHMm = (mapping.qrCode.heightPercent / 100) * slipHeightMm;
      const qrSizeMm = Math.min(qrWMm, qrHMm);

      doc.addImage(qrDataUrl, 'PNG', qrXMm, qrYMm, qrSizeMm, qrSizeMm, undefined, 'FAST');
    } catch (err) {
      console.warn('Failed to place QR code object in PDF:', err);
    }
  }

  // 4. ADD BACK QR CODE AS INDEPENDENT IMAGE OBJECT
  if (mapping.backQrCode && backQrDataUrl) {
    try {
      const qrXMm = slipOriginXMm + (mapping.backQrCode.xPercent / 100) * slipWidthMm;
      const qrYMm = slipOriginYMm + (mapping.backQrCode.yPercent / 100) * slipHeightMm;
      const qrWMm = (mapping.backQrCode.widthPercent / 100) * slipWidthMm;
      const qrHMm = (mapping.backQrCode.heightPercent / 100) * slipHeightMm;

      doc.addImage(backQrDataUrl, 'PNG', qrXMm, qrYMm, qrWMm, qrHMm, undefined, 'FAST');
    } catch (err) {
      console.warn('Failed to place back QR code object in PDF:', err);
    }
  }

  // 5. ADD 1D BARCODE AS INDEPENDENT IMAGE OBJECT
  if (mapping.barcode && barcodeDataUrl) {
    try {
      const barXMm = slipOriginXMm + (mapping.barcode.xPercent / 100) * slipWidthMm;
      const barYMm = slipOriginYMm + (mapping.barcode.yPercent / 100) * slipHeightMm;
      const barWMm = (mapping.barcode.widthPercent / 100) * slipWidthMm;
      const barHMm = (mapping.barcode.heightPercent / 100) * slipHeightMm;

      doc.addImage(barcodeDataUrl, 'PNG', barXMm, barYMm, barWMm, barHMm, undefined, 'FAST');
    } catch (err) {
      console.warn('Failed to place barcode object in PDF:', err);
    }
  }

  // 6. DRAW ALL DYNAMIC TEXT ELEMENTS AS REAL VECTOR PDF TEXT
  for (const field of mapping.textFields) {
    try {
      let val = field.getValue(citizen);
      if (!val) continue;
      if (field.casing === 'uppercase') {
        val = val.toUpperCase();
      }

      const textXMm = slipOriginXMm + (field.xPercent / 100) * slipWidthMm;
      const textYMm = slipOriginYMm + (field.yPercent / 100) * slipHeightMm;

      doc.setFont(field.fontFamily, field.fontStyle);
      doc.setFontSize(field.fontSizePt);
      doc.setTextColor(field.textColor[0], field.textColor[1], field.textColor[2]);

      const maxWMm = field.maxWidthPercent
        ? (field.maxWidthPercent / 100) * slipWidthMm
        : undefined;

      if (maxWMm) {
        doc.text(val, textXMm, textYMm, {
          align: field.align,
          maxWidth: maxWMm
        });
      } else {
        doc.text(val, textXMm, textYMm, {
          align: field.align
        });
      }
    } catch (err) {
      console.warn(`Failed to render text field ${field.id} in PDF:`, err);
    }
  }

  // 7. SAVE THE UNFLATTENED VECTOR PDF FILE WITH OFFICIAL NAMING RULE
  // Format: "UGOPAWAVERIFY [SLIP TYPE] [NIN or BVN] SLIP [ACTUAL NUMBER].pdf"
  let slipFormat: 'PREMIUM' | 'STANDARD' | 'REGULAR' = 'PREMIUM';
  if (mapping.slipType === 'NIN_STANDARD' || filenamePrefix.toLowerCase().includes('standard')) {
    slipFormat = 'STANDARD';
  } else if (mapping.slipType === 'NIN_REGULAR' || filenamePrefix.toLowerCase().includes('regular')) {
    slipFormat = 'REGULAR';
  } else {
    slipFormat = 'PREMIUM';
  }

  // Determine Document Type: NIN or BVN
  const sCode = (req.serviceCode || '').toUpperCase().trim();
  const sName = (req.serviceName || '').toLowerCase().trim();
  const isBvn =
    mapping.slipType === 'BVN_PREMIUM' ||
    filenamePrefix.toUpperCase().includes('BVN') ||
    sCode === 'BVN' ||
    sCode.startsWith('BVN') ||
    sName.includes('bvn') ||
    Boolean(citizen.bvn && !citizen.nin);

  const docType: 'NIN' | 'BVN' = isBvn ? 'BVN' : 'NIN';

  // Extract actual number: preserve leading zeros and exact number with no extraneous words
  let rawNumber = '';
  if (isBvn) {
    rawNumber = citizen.bvn || citizen.idNumber || req.searchData?.idNumber || (req as any).idNumber || citizen.nin || '';
  } else {
    rawNumber = citizen.nin || citizen.idNumber || req.searchData?.idNumber || (req as any).idNumber || citizen.bvn || '';
  }

  const filename = generateSlipFilename(slipFormat, docType, rawNumber);
  doc.save(filename);
}

/**
 * Generates official PDF filename following the exact structure:
 * "UGOPAWAVERIFY [SLIP TYPE] [NIN or BVN] SLIP [ACTUAL NUMBER].pdf"
 */
export function generateSlipFilename(
  slipType: 'PREMIUM' | 'STANDARD' | 'REGULAR',
  docType: 'NIN' | 'BVN',
  actualNumber: string
): string {
  const cleanNumber = (actualNumber || '').toString().trim().replace(/[\\/:*?"<>|]/g, '') || '00000000000';
  return `UGOPAWAVERIFY ${slipType} ${docType} SLIP ${cleanNumber}.pdf`;
}

/**
 * 1. NIN PREMIUM SLIP
 */
export async function generateNinPremiumSlipPdf(
  req: VerificationRequest,
  res?: VerificationResult | null,
  _platformName: string = 'UGOPAWAVERIFY'
): Promise<void> {
  await generateSlipPdfWithMapping(PREMIUM_SLIP_MAPPING, req, res, 'NIN_Premium_Slip');
}

/**
 * 2. BVN PREMIUM SLIP
 */
export async function generateBvnPremiumSlipPdf(
  req: VerificationRequest,
  res?: VerificationResult | null,
  _platformName: string = 'UGOPAWAVERIFY'
): Promise<void> {
  await generateSlipPdfWithMapping(BVN_PREMIUM_SLIP_MAPPING, req, res, 'BVN_Premium_Slip');
}

/**
 * 3. NIN STANDARD SLIP
 */
export async function generateStandardSlipPdf(
  req: VerificationRequest,
  res?: VerificationResult | null,
  _platformName: string = 'UGOPAWAVERIFY'
): Promise<void> {
  await generateSlipPdfWithMapping(STANDARD_SLIP_MAPPING, req, res, 'NIN_Standard_Slip');
}

/**
 * 4. NIN REGULAR SLIP
 */
export async function generateRegularSlipPdf(
  req: VerificationRequest,
  res?: VerificationResult | null,
  _platformName: string = 'UGOPAWAVERIFY'
): Promise<void> {
  await generateSlipPdfWithMapping(REGULAR_SLIP_MAPPING, req, res, 'NIN_Regular_Slip');
}

/**
 * Router for Premium Slip (Routes to BVN Premium or NIN Premium based on service)
 */
export async function generatePremiumSlipPdf(
  req: VerificationRequest,
  res?: VerificationResult | null,
  platformName: string = 'UGOPAWAVERIFY'
): Promise<void> {
  const code = (req.serviceCode || '').toUpperCase().trim();
  const name = (req.serviceName || '').toLowerCase().trim();

  const isBvn =
    code === 'BVN' ||
    code === 'BVN_VERIFICATION' ||
    code === 'BVN_RETRIEVAL' ||
    code === 'BVN_PHONE' ||
    code === 'BVN_CRM' ||
    code === 'CAFE_BVN' ||
    (code.startsWith('BVN') && !code.includes('MOD') && !code.includes('ANDROID')) ||
    (name.includes('bvn') && (name.includes('verification') || name.includes('retrieval') || name.includes('lookup') || name === 'bvn'));

  if (isBvn) {
    return generateBvnPremiumSlipPdf(req, res, platformName);
  } else {
    return generateNinPremiumSlipPdf(req, res, platformName);
  }
}

/**
 * Fallback for other non-template verification services
 */
export async function generateVerificationSlipPdf(
  req: VerificationRequest,
  res?: VerificationResult | null,
  platformName: string = 'UGOPAWAVERIFY'
): Promise<void> {
  const code = (req.serviceCode || '').toUpperCase().trim();
  const isBvn = code.startsWith('BVN');
  if (isBvn) {
    return generateBvnPremiumSlipPdf(req, res, platformName);
  }
  return generateNinPremiumSlipPdf(req, res, platformName);
}

/**
 * Helper to render on-screen slip canvas using the central mapping configuration
 */
export async function renderCompletedSlipCanvas(
  templateType: 'NIN_PREMIUM' | 'BVN_PREMIUM' | 'NIN_STANDARD' | 'NIN_REGULAR',
  citizen: NormalizedCitizenRecord
): Promise<HTMLCanvasElement> {
  const mapping =
    templateType === 'NIN_PREMIUM'
      ? PREMIUM_SLIP_MAPPING
      : templateType === 'BVN_PREMIUM'
      ? BVN_PREMIUM_SLIP_MAPPING
      : templateType === 'NIN_STANDARD'
      ? STANDARD_SLIP_MAPPING
      : REGULAR_SLIP_MAPPING;

  const canvas = document.createElement('canvas');
  canvas.width = mapping.templateWidthPx * 2;
  canvas.height = mapping.templateHeightPx * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  // Load and draw template background
  try {
    const templateDataUrl = await getTemplateDataUrl(mapping);
    if (templateDataUrl) {
      const bgImg = await loadImage(templateDataUrl);
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    }
  } catch (err) {
    console.warn('Canvas template background load warning:', err);
  }

  // Draw Photo
  if (mapping.photo) {
    try {
      let photoDataUrl = citizen.photoUrl;
      if (!photoDataUrl) {
        photoDataUrl = createDefaultBiometricPhotoDataUrl(citizen.fullName || citizen.surname);
      }
      const photoImg = await loadImage(photoDataUrl);
      const px = (mapping.photo.xPercent / 100) * canvas.width;
      const py = (mapping.photo.yPercent / 100) * canvas.height;
      const pw = (mapping.photo.widthPercent / 100) * canvas.width;
      const ph = (mapping.photo.heightPercent / 100) * canvas.height;
      ctx.drawImage(photoImg, px, py, pw, ph);
    } catch (e) {
      console.warn('Photo draw warning:', e);
    }
  }

  // Draw QR
  if (mapping.qrCode) {
    try {
      const cleanNin = (citizen.nin || citizen.idNumber || '').replace(/\D/g, '');
      const qrData = `UGOPAWAVERIFY|ID:${cleanNin}|SURNAME:${citizen.surname}|REF:${citizen.reference}`;
      const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 256 });
      const qrImg = await loadImage(qrDataUrl);
      const qx = (mapping.qrCode.xPercent / 100) * canvas.width;
      const qy = (mapping.qrCode.yPercent / 100) * canvas.height;
      const qw = (mapping.qrCode.widthPercent / 100) * canvas.width;
      const qh = (mapping.qrCode.heightPercent / 100) * canvas.height;
      const qSize = Math.min(qw, qh);
      ctx.drawImage(qrImg, qx, qy, qSize, qSize);
    } catch (e) {
      console.warn('QR draw warning:', e);
    }
  }

  // Draw Barcode
  if (mapping.barcode) {
    try {
      const barcodeValue = (citizen.nin || citizen.idNumber || citizen.reference || '00000000000').replace(/\D/g, '');
      const barcodeDataUrl = generateBarcodeDataUrl(barcodeValue, {
        format: mapping.barcode.format,
        width: 2,
        height: 60
      });
      if (barcodeDataUrl) {
        const barImg = await loadImage(barcodeDataUrl);
        const bx = (mapping.barcode.xPercent / 100) * canvas.width;
        const by = (mapping.barcode.yPercent / 100) * canvas.height;
        const bw = (mapping.barcode.widthPercent / 100) * canvas.width;
        const bh = (mapping.barcode.heightPercent / 100) * canvas.height;
        ctx.drawImage(barImg, bx, by, bw, bh);
      }
    } catch (e) {
      console.warn('Barcode draw warning:', e);
    }
  }

  // Draw dynamic text
  ctx.textBaseline = 'top';

  for (const field of mapping.textFields) {
    let text = field.getValue(citizen);
    if (!text) continue;
    if (field.casing === 'uppercase') text = text.toUpperCase();

    const tx = (field.xPercent / 100) * canvas.width;
    const ty = (field.yPercent / 100) * canvas.height;
    const fontPx = Math.round(field.fontSizePt * 2.5);
    ctx.font = `${field.fontStyle === 'bold' ? 'bold ' : ''}${fontPx}px ${
      field.fontFamily === 'courier' ? "'Courier New', monospace" : 'Arial, sans-serif'
    }`;
    ctx.textAlign = field.align;
    ctx.fillStyle = field.textColor
      ? `rgb(${field.textColor[0]}, ${field.textColor[1]}, ${field.textColor[2]})`
      : '#000000';
    ctx.fillText(text, tx, ty);
  }

  return canvas;
}
