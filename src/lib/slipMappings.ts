/**
 * DEDICATED SLIP FIELD MAPPING CONFIGURATIONS
 * 
 * Each slip type (Premium, Standard, Regular, BVN Premium) has its own independent,
 * precisely measured field mapping configuration.
 * Coordinates are expressed as percentages (0 to 100%) of the template dimensions,
 * making them resolution-independent and perfectly aligned for both native jsPDF
 * vector rendering and HTML preview layers.
 */

export interface DynamicTextFieldConfig {
  id: string;
  label?: string;
  /** X position as percentage of slip template width (0 to 100) */
  xPercent: number;
  /** Y position as percentage of slip template height (0 to 100) */
  yPercent: number;
  /** Font family in jsPDF ('helvetica' | 'courier' | 'times') */
  fontFamily: 'helvetica' | 'courier' | 'times';
  /** Font style ('normal' | 'bold' | 'italic') */
  fontStyle: 'normal' | 'bold' | 'italic';
  /** Font size in points (pt) */
  fontSizePt: number;
  /** Text color RGB */
  textColor: [number, number, number];
  /** Text alignment */
  align: 'left' | 'center' | 'right';
  /** Maximum width as percentage of slip width (for auto-wrapping) */
  maxWidthPercent?: number;
  /** Line height factor (defaults to 1.15) */
  lineHeightFactor?: number;
  /** Text transform */
  casing?: 'uppercase' | 'none';
  /** Value extraction key or custom resolver */
  getValue: (citizen: any) => string;
}

export interface DynamicImageFieldConfig {
  id: string;
  /** X position as percentage of slip width (0 to 100) */
  xPercent: number;
  /** Y position as percentage of slip height (0 to 100) */
  yPercent: number;
  /** Width as percentage of slip width (0 to 100) */
  widthPercent: number;
  /** Height as percentage of slip height (0 to 100) */
  heightPercent: number;
  /** Optional border radius in mm / px */
  borderRadius?: number;
}

export interface SlipTemplateMapping {
  slipType: 'NIN_PREMIUM' | 'NIN_STANDARD' | 'NIN_REGULAR' | 'BVN_PREMIUM';
  title: string;
  templateWidthPx: number;
  templateHeightPx: number;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape';
  /** Printable width in mm on A4 paper */
  printWidthMm: number;
  /** Printable height in mm on A4 paper */
  printHeightMm: number;
  /** Fallback and local URL for template */
  localTemplatePath: string;
  remoteTemplateUrl: string;
  photo: DynamicImageFieldConfig;
  qrCode?: DynamicImageFieldConfig;
  backQrCode?: DynamicImageFieldConfig;
  barcode?: DynamicImageFieldConfig & { format: 'CODE128' | 'CODE39' };
  textFields: DynamicTextFieldConfig[];
}

/**
 * Format 11-digit NIN into spaced groups: 1234  567  8901
 */
export function formatNinSpaced(nin: string): string {
  const clean = (nin || '').replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 4)}  ${clean.slice(4, 7)}  ${clean.slice(7)}`;
  }
  return nin || '';
}

/**
 * Format 11-digit BVN into spaced groups: 1234  567  8901
 */
export function formatBvnSpaced(bvn: string): string {
  const clean = (bvn || '').replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 4)}  ${clean.slice(4, 7)}  ${clean.slice(7)}`;
  }
  return bvn || '';
}

/**
 * Format Date of Birth cleanly (e.g. 23 JUN 2000 or YYYY-MM-DD to DD MMM YYYY)
 */
export function formatDobReadable(dob: string): string {
  if (!dob) return '';
  const clean = dob.trim();
  // Already in DD MMM YYYY or similar format
  if (/^[0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{4}$/i.test(clean)) {
    return clean.toUpperCase();
  }
  // YYYY-MM-DD or YYYY/MM/DD
  const m = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    }
  }
  // DD-MM-YYYY
  const m2 = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m2) {
    const d = new Date(parseInt(m2[3]), parseInt(m2[2]) - 1, parseInt(m2[1]));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    }
  }
  return clean.toUpperCase();
}

/**
 * Format Issue Date cleanly (DD MMM YYYY)
 */
export function formatIssueDate(verifiedAt?: string): string {
  const dateObj = verifiedAt ? new Date(verifiedAt) : new Date();
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  }
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

// ============================================================================
// 1. PREMIUM SLIP MAPPING CONFIGURATION (NIN Digital Premium Slip)
// Based on exact measurements of template nin_premium.jpg & reference image
// ============================================================================
export const PREMIUM_SLIP_MAPPING: SlipTemplateMapping = {
  slipType: 'NIN_PREMIUM',
  title: 'Official NIMC NIN Premium Slip',
  templateWidthPx: 452,
  templateHeightPx: 640,
  aspectRatio: 452 / 640, // 0.70625
  orientation: 'portrait',
  printWidthMm: 190,
  printHeightMm: 190 / (452 / 640), // 269 mm
  localTemplatePath: '/templates/nin_premium.jpg',
  remoteTemplateUrl: 'https://i.ibb.co/XZpC5fTL/20260921-214903.jpg',
  photo: {
    id: 'customer_photo',
    xPercent: 5.0, // x=23px
    yPercent: 14.5, // y=93px
    widthPercent: 21.0, // w=95px
    heightPercent: 19.5, // h=125px
    borderRadius: 4
  },
  qrCode: {
    id: 'top_qr_code',
    xPercent: 72.1, // x=326px - perfectly covers the top-right white rectangular area without exposure
    yPercent: 7.35, // y=47px
    widthPercent: 23.0, // w=104px (covers up to x=430px)
    heightPercent: 16.25 // h=104px (covers up to y=151px)
  },
  textFields: [
    {
      id: 'surname',
      label: 'SURNAME / NOM',
      xPercent: 29.6, // x=134px
      yPercent: 19.4, // y=124px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 13.0, // Increased font size for better readability
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      casing: 'uppercase',
      maxWidthPercent: 39.0,
      getValue: (c) => c.surname || (c.fullName ? c.fullName.split(' ')[0] : '')
    },
    {
      id: 'given_names',
      label: 'GIVEN NAMES / PRENOMS',
      xPercent: 29.6, // x=134px
      yPercent: 28.4, // y=182px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 13.0, // Increased font size for better readability
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      casing: 'uppercase',
      maxWidthPercent: 39.0,
      getValue: (c) => {
        if (c.firstName) {
          return [c.firstName, c.middleName].filter(Boolean).join(' ');
        }
        return c.fullName ? c.fullName.split(' ').slice(1).join(' ') : '';
      }
    },
    {
      id: 'date_of_birth',
      label: 'DATE OF BIRTH',
      xPercent: 29.6, // x=134px
      yPercent: 36.9, // y=236px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 12.0, // Increased font size for better readability
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      casing: 'uppercase',
      getValue: (c) => formatDobReadable(c.dateOfBirth)
    },
    {
      id: 'gender',
      label: 'SEX / SEXE',
      xPercent: 56.6, // x=256px - directly below 'SEX / SEXE' label
      yPercent: 36.9, // y=236px - aligned with Date of Birth row
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 12.0, // Increased font size for better readability
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      casing: 'uppercase',
      getValue: (c) => (c.gender || 'M').charAt(0).toUpperCase()
    },
    {
      id: 'issue_date_label',
      label: 'ISSUE DATE Label',
      xPercent: 74.5, // Right side directly underneath the existing "NGA" text
      yPercent: 34.8, // Placed neatly below NGA
      fontFamily: 'helvetica',
      fontStyle: 'bold', // Bold label
      fontSizePt: 10.0, // Clearly more visible
      textColor: [75, 85, 99], // Keep grey colour RGB [75, 85, 99]
      align: 'left',
      casing: 'uppercase',
      getValue: () => 'ISSUE DATE'
    },
    {
      id: 'issue_date',
      label: 'ISSUE DATE Value',
      xPercent: 74.5, // Vertically and neatly aligned directly underneath ISSUE DATE label
      yPercent: 38.2, // Placed directly underneath the "Issue Date" label
      fontFamily: 'helvetica',
      fontStyle: 'bold', // Bold date
      fontSizePt: 12.5, // Clearly more visible
      textColor: [75, 85, 99], // Keep grey colour RGB [75, 85, 99]
      align: 'left',
      casing: 'uppercase',
      getValue: (c) => formatIssueDate(c.verifiedAt)
    },
    {
      id: 'nin_number',
      label: 'National Identification Number (NIN)',
      xPercent: 50.0, // Centered horizontally across the card
      yPercent: 44.2, // y=283px
      fontFamily: 'courier',
      fontStyle: 'bold',
      fontSizePt: 23.0, // Very large and bold
      textColor: [0, 0, 0], // Pure Black
      align: 'center',
      casing: 'none',
      getValue: (c) => formatNinSpaced(c.nin || c.idNumber)
    }
  ]
};

// ============================================================================
// 2. STANDARD SLIP MAPPING CONFIGURATION (NIN Standard Slip - Sample Template)
// Based on exact measurements of template nin_standard.jpg & reference image
// ============================================================================
export const STANDARD_SLIP_MAPPING: SlipTemplateMapping = {
  slipType: 'NIN_STANDARD',
  title: 'Official NIMC NIN Standard Slip (Sample Template)',
  templateWidthPx: 480,
  templateHeightPx: 640,
  aspectRatio: 480 / 640, // 0.75
  orientation: 'portrait',
  printWidthMm: 190,
  printHeightMm: 190 / (480 / 640), // 253.3 mm
  localTemplatePath: '/templates/nin_standard.jpg',
  remoteTemplateUrl: 'https://i.ibb.co/BFHms81/20260921-223018.jpg',
  photo: {
    id: 'customer_photo',
    xPercent: 6.9, // x=33px
    yPercent: 7.2, // y=46px
    widthPercent: 22.1, // w=106px
    heightPercent: 20.0, // h=128px
    borderRadius: 4
  },
  qrCode: {
    id: 'top_qr_code',
    xPercent: 72.5, // x=348px
    yPercent: 11.7, // y=75px
    widthPercent: 16.7, // w=80px
    heightPercent: 12.5 // h=80px
  },
  textFields: [
    {
      id: 'surname',
      label: 'Surname/Nom',
      xPercent: 31.7, // x=152px
      yPercent: 11.3, // y=72px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 13.5, // Increased font size
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      casing: 'uppercase',
      maxWidthPercent: 39.0,
      getValue: (c) => c.surname || (c.fullName ? c.fullName.split(' ')[0] : 'SAMPLE')
    },
    {
      id: 'given_names',
      label: 'Given Names/Prénoms',
      xPercent: 31.7, // x=152px
      yPercent: 18.8, // y=120px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 13.5, // Increased font size
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      casing: 'uppercase',
      maxWidthPercent: 39.0,
      getValue: (c) => {
        if (c.firstName) {
          return [c.firstName, c.middleName].filter(Boolean).join(' ');
        }
        return c.fullName ? c.fullName.split(' ').slice(1).join(' ') : 'SPECIMEN';
      }
    },
    {
      id: 'date_of_birth',
      label: 'Date of Birth',
      xPercent: 31.7, // x=152px
      yPercent: 26.6, // y=170px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 12.5, // Increased font size
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      casing: 'uppercase',
      getValue: (c) => (c.dateOfBirth ? formatDobReadable(c.dateOfBirth) : '01 JAN 1990')
    },
    {
      id: 'nin_number',
      label: 'NATIONAL IDENTIFICATION NUMBER (NIN)',
      xPercent: 50.0, // Centered horizontally across the card
      yPercent: 36.8, // y=235px
      fontFamily: 'courier',
      fontStyle: 'bold',
      fontSizePt: 24.0, // Very large and bold NIN area
      textColor: [0, 0, 0], // Pure Black
      align: 'center',
      casing: 'none',
      getValue: (c) => (c.nin || c.idNumber ? formatNinSpaced(c.nin || c.idNumber) : '0000 000 0000')
    }
  ]
};

// ============================================================================
// 3. REGULAR SLIP MAPPING CONFIGURATION (NIN Regular Landscape Slip)
// Based on exact measurements of template nin_regular.jpg & reference image
// ============================================================================
export const REGULAR_SLIP_MAPPING: SlipTemplateMapping = {
  slipType: 'NIN_REGULAR',
  title: 'Official NIMC NIN Regular Slip (NINS)',
  templateWidthPx: 640,
  templateHeightPx: 320,
  aspectRatio: 640 / 320, // 2.0
  orientation: 'landscape',
  printWidthMm: 265,
  printHeightMm: 265 / (640 / 320), // 132.5 mm
  localTemplatePath: '/templates/nin_regular.jpg',
  remoteTemplateUrl: 'https://i.ibb.co/5hWsw4yg/20260921-223813.jpg',
  photo: {
    id: 'customer_photo',
    xPercent: 82.0, // x=525px
    yPercent: 25.6, // y=82px
    widthPercent: 15.3, // w=98px
    heightPercent: 36.9, // h=118px
    borderRadius: 4
  },
  textFields: [
    {
      id: 'tracking_id',
      label: 'Tracking ID:',
      xPercent: 10.9, // x=70px (same line after 'Tracking ID:' label)
      yPercent: 32.2, // y=103px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 10.5,
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      maxWidthPercent: 14.5,
      getValue: (c) => c.trackingId || c.reference || 'N/A'
    },
    {
      id: 'nin_number',
      label: 'NIN:',
      xPercent: 7.8, // x=50px (same line after 'NIN:' label)
      yPercent: 42.2, // y=135px
      fontFamily: 'courier',
      fontStyle: 'bold',
      fontSizePt: 12.5,
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      maxWidthPercent: 17.5,
      getValue: (c) => formatNinSpaced(c.nin || c.idNumber)
    },
    {
      id: 'surname',
      label: 'Surname:',
      xPercent: 35.0, // x=224px (same line to the right of 'Surname:' label)
      yPercent: 32.0, // y=102.5px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 12.0, // Increased bold font
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      casing: 'uppercase',
      maxWidthPercent: 20.5,
      getValue: (c) => c.surname || (c.fullName ? c.fullName.split(' ')[0] : '')
    },
    {
      id: 'first_name',
      label: 'First Name:',
      xPercent: 35.3, // x=226px (same line to the right of 'First Name:' label)
      yPercent: 42.4, // y=135.5px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 12.0, // Increased bold font
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      casing: 'uppercase',
      maxWidthPercent: 20.0,
      getValue: (c) => c.firstName || (c.fullName ? c.fullName.split(' ')[1] : '')
    },
    {
      id: 'middle_name',
      label: 'Middle Name:',
      xPercent: 36.3, // x=232px (same line to the right of 'Middle Name:' label)
      yPercent: 52.0, // y=166.5px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 12.0, // Increased bold font
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      casing: 'uppercase',
      maxWidthPercent: 19.0,
      getValue: (c) => c.middleName || (c.fullName ? c.fullName.split(' ').slice(2).join(' ') : '')
    },
    {
      id: 'gender',
      label: 'Gender:',
      xPercent: 33.4, // x=214px (same line to the right of 'Gender:' label)
      yPercent: 61.1, // y=195.5px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 12.0, // Increased bold font
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      casing: 'uppercase',
      maxWidthPercent: 22.0,
      getValue: (c) => (c.gender ? (c.gender.length === 1 ? c.gender.toUpperCase() : c.gender.toUpperCase().startsWith('F') ? 'F' : 'M') : 'M')
    },
    {
      id: 'residence_address',
      label: 'Address:',
      xPercent: 56.6, // x=362px
      yPercent: 35.0, // y=112px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 8.5,
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      casing: 'uppercase',
      maxWidthPercent: 23.5,
      lineHeightFactor: 1.2,
      getValue: (c) => c.residenceAddress || [c.town, c.lgaOfOrigin, c.stateOfOrigin ? `${c.stateOfOrigin} STATE` : ''].filter(Boolean).join(', ')
    }
  ]
};

// ============================================================================
// 4. BVN PREMIUM SLIP MAPPING CONFIGURATION (BVN Premium Slip)
// Based on exact measurements of template bvn_premium.jpg
// ============================================================================
export const BVN_PREMIUM_SLIP_MAPPING: SlipTemplateMapping = {
  slipType: 'BVN_PREMIUM',
  title: 'Official BVN Premium Verification Slip',
  templateWidthPx: 480,
  templateHeightPx: 640,
  aspectRatio: 480 / 640, // 0.75
  orientation: 'portrait',
  printWidthMm: 190,
  printHeightMm: 190 / (480 / 640), // 253.3 mm
  localTemplatePath: '/templates/bvn_premium.jpg',
  remoteTemplateUrl: 'https://i.ibb.co/Zp1bjKLd/20260921-222422.jpg',
  photo: {
    id: 'customer_photo',
    xPercent: 3.3, // x=16px
    yPercent: 14.4, // y=92px
    widthPercent: 22.5, // w=108px
    heightPercent: 21.3, // h=136px
    borderRadius: 6
  },
  textFields: [
    {
      id: 'full_name',
      label: 'Full Name',
      xPercent: 28.1, // x=135px
      yPercent: 16.9, // y=108px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 11,
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      casing: 'uppercase',
      maxWidthPercent: 68.0,
      getValue: (c) => c.fullName || [c.surname, c.firstName, c.middleName].filter(Boolean).join(' ')
    },
    {
      id: 'date_of_birth',
      label: 'Date of Birth',
      xPercent: 28.1, // x=135px
      yPercent: 21.6, // y=138px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 10.5,
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      casing: 'uppercase',
      getValue: (c) => formatDobReadable(c.dateOfBirth)
    },
    {
      id: 'phone_number',
      label: 'Phone Number',
      xPercent: 28.1, // x=135px
      yPercent: 26.3, // y=168px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 10.5,
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      getValue: (c) => c.phoneNumber || 'N/A'
    },
    {
      id: 'email',
      label: 'Email',
      xPercent: 28.1, // x=135px
      yPercent: 30.9, // y=198px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 9.5,
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      getValue: (c) => c.email || 'N/A'
    },
    {
      id: 'banks_linked',
      label: 'Banks Linked',
      xPercent: 28.1, // x=135px
      yPercent: 35.6, // y=228px
      fontFamily: 'helvetica',
      fontStyle: 'bold',
      fontSizePt: 9.5,
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      getValue: (c) => c.banksLinked || 'Commercial Banks (Verified)'
    },
    {
      id: 'bvn_number',
      label: 'Bank Verification Number (BVN)',
      xPercent: 28.1, // x=135px
      yPercent: 40.6, // y=260px
      fontFamily: 'courier',
      fontStyle: 'bold',
      fontSizePt: 14.5,
      textColor: [0, 0, 0], // Pure Black
      align: 'left',
      casing: 'none',
      getValue: (c) => formatBvnSpaced(c.bvn || c.idNumber)
    }
  ]
};

/**
 * Registry mapping table for fast lookup by slip type
 */
export const SLIP_MAPPING_REGISTRY: Record<string, SlipTemplateMapping> = {
  PREMIUM: PREMIUM_SLIP_MAPPING,
  NIN_PREMIUM: PREMIUM_SLIP_MAPPING,
  STANDARD: STANDARD_SLIP_MAPPING,
  NIN_STANDARD: STANDARD_SLIP_MAPPING,
  REGULAR: REGULAR_SLIP_MAPPING,
  NIN_REGULAR: REGULAR_SLIP_MAPPING,
  BVN_PREMIUM: BVN_PREMIUM_SLIP_MAPPING
};
