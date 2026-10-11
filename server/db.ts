import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  UserProfile,
  Wallet,
  WalletTransaction,
  FundingRequest,
  Service,
  VerificationRequest,
  VerificationResult,
  VerificationProvider,
  Announcement,
  Notification,
  SupportTicket,
  AuditLog,
  PlatformSettings,
  BvnEnrollmentCenter,
  CustomerServiceRequest,
  AgentAdminOnboarding
} from './types';
import {
  fetchSupabaseUsers,
  fetchSupabaseServices,
  saveUserToSupabase,
  saveWalletToSupabase,
  isSupabaseServiceRoleActive
} from './supabase';

interface DatabaseSchema {
  users: User[];
  profiles: UserProfile[];
  wallets: Wallet[];
  transactions: WalletTransaction[];
  fundingRequests: FundingRequest[];
  services: Service[];
  verificationRequests: VerificationRequest[];
  verificationResults: VerificationResult[];
  providers: VerificationProvider[];
  announcements: Announcement[];
  notifications: Notification[];
  supportTickets: SupportTicket[];
  serviceRequests: CustomerServiceRequest[];
  auditLogs: AuditLog[];
  settings: PlatformSettings;
  bvnEnrollmentCenters?: BvnEnrollmentCenter[];
  onboardingRequests?: AgentAdminOnboarding[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Memory cache of the database
let dbCache: DatabaseSchema | null = null;
const processingLocks = new Set<string>();

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const cleanPass = String(password || '').trim();
  if (!cleanPass || !hash || !salt) return false;
  const check = crypto.pbkdf2Sync(cleanPass, salt, 1000, 64, 'sha512').toString('hex');
  return check === hash;
}

export function hashPin(pin: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(8).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, actualSalt, 1000, 32, 'sha256').toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPin(pin: string, hash: string, salt: string): boolean {
  const cleanPin = String(pin || '').trim();
  if (!cleanPin || !hash || !salt) return false;
  const check = crypto.pbkdf2Sync(cleanPin, salt, 1000, 32, 'sha256').toString('hex');
  return check === hash;
}

export function acquireLock(key: string): boolean {
  if (processingLocks.has(key)) {
    return false;
  }
  processingLocks.add(key);
  return true;
}

export function releaseLock(key: string): void {
  processingLocks.delete(key);
}

export function ensureOwnerExists(db: DatabaseSchema): void {
  const ownerEmail = 'ugochukwuoparaocha3@gmail.com';
  const megaAdminUsername = '/Mega//admin/ugopawaverify';
  const megaAdminPassword = (process.env.INITIAL_OWNER_PASSWORD || process.env.MEGA_ADMIN_PASSWORD || 'Ugo@536992').trim();

  // 1. Locate existing permanent Mega Admin record or find by email / path / role
  let owner = db.users.find(
    (u) =>
      (u.email && u.email.toLowerCase() === ownerEmail) ||
      u.username === megaAdminUsername ||
      u.username?.toLowerCase() === '/mega//admin/ugopawaverify' ||
      u.username?.toLowerCase() === '/mega/admin/ugopawaverify' ||
      u.role === 'MEGA_ADMIN'
  );

  // 2. Strict Security Invariant: Only ONE account may ever have MEGA_ADMIN role
  // Demote any duplicate or erroneous account claiming MEGA_ADMIN
  for (const u of db.users) {
    if (owner && u.id !== owner.id && u.role === 'MEGA_ADMIN') {
      u.role = 'SUPER_ADMIN';
      u.updatedAt = new Date().toISOString();
    }
  }

  const salt = owner?.salt || crypto.randomBytes(16).toString('hex');
  const { hash } = hashPassword(megaAdminPassword, salt);

  if (!owner) {
    owner = {
      id: 'usr_owner_001',
      email: ownerEmail,
      username: megaAdminUsername,
      fullName: 'UGOPAWAVERIFY Mega Admin',
      phone: '+2348030009988',
      passwordHash: hash,
      salt,
      transactionPinHash: '',
      pinSalt: '',
      role: 'MEGA_ADMIN',
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      onboardingStatus: 'approved',
      onboardingApprovedAt: new Date().toISOString(),
      onboardingApprovedBy: 'SYSTEM OWNER / FOUNDER',
      roleAtApproval: 'MEGA_ADMIN',
      assignedServices: ['ONLINE_NIN_REGISTRATION'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.users.unshift(owner);
  } else {
    // Permanent Mega Admin cannot be altered, demoted, deactivated or renamed
    owner.id = owner.id || 'usr_owner_001';
    owner.email = ownerEmail;
    owner.username = megaAdminUsername;
    owner.fullName = owner.fullName || 'UGOPAWAVERIFY Mega Admin';
    owner.role = 'MEGA_ADMIN';
    owner.status = 'ACTIVE';
    owner.onboardingStatus = 'approved';
    owner.passwordHash = hash;
    owner.salt = salt;
    if (!owner.onboardingApprovedAt) owner.onboardingApprovedAt = new Date().toISOString();
    if (!owner.onboardingApprovedBy) owner.onboardingApprovedBy = 'SYSTEM OWNER / FOUNDER';
    owner.roleAtApproval = 'MEGA_ADMIN';
    if (!owner.assignedServices || owner.assignedServices.length === 0) {
      owner.assignedServices = ['ONLINE_NIN_REGISTRATION'];
    }
    if (!owner.avatarUrl) {
      owner.avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
    }
    owner.updatedAt = new Date().toISOString();
  }

  let ownerWallet = db.wallets.find((w) => w.userId === owner!.id);
  if (!ownerWallet) {
    ownerWallet = {
      id: 'wal_owner_001',
      userId: owner.id,
      availableBalance: 1000000,
      pendingBalance: 0,
      totalDeposited: 1000000,
      totalSpent: 0,
      updatedAt: new Date().toISOString()
    };
    db.wallets.unshift(ownerWallet);
  }
}

export const defaultCatalogueServices: Service[] = [
  {
    id: 'srv_nin_01',
    code: 'NIN',
    name: 'NIN Verification',
    description: 'Verify National Identity Number directly via official biometric identity registry database.',
    price: 1000,
    status: 'ACTIVE',
    icon: 'UserCheck',
    category: 'Identity',
    serviceType: 'verification',
    providerMapping: 'nin_verify',
    defaultProvider: 'ninja',
    displayOrder: 1,
    requiredFields: [
      {
        name: 'nin',
        label: 'National Identity Number (NIN)',
        type: 'text',
        placeholder: 'Enter 11-digit NIN',
        required: true,
        regex: '^\\d{11}$',
        helperText: 'Must be exactly 11 numeric digits'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_bvn_02',
    code: 'BVN',
    name: 'BVN Verification',
    description: 'Instant Bank Verification Number check and KYC identity validation.',
    price: 1200,
    status: 'ACTIVE',
    icon: 'CreditCard',
    category: 'Banking',
    serviceType: 'verification',
    providerMapping: 'bvn_verify',
    defaultProvider: 'ninja',
    displayOrder: 2,
    requiredFields: [
      {
        name: 'bvn',
        label: 'Bank Verification Number (BVN)',
        type: 'text',
        placeholder: 'Enter 11-digit BVN',
        required: true,
        regex: '^\\d{11}$',
        helperText: 'Must be exactly 11 numeric digits'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_phone_03',
    code: 'PHONE',
    name: 'Phone Number Verification',
    description: 'Validate registered subscriber information, SIM binding and carrier status.',
    price: 500,
    status: 'ACTIVE',
    icon: 'PhoneCall',
    category: 'Telecom',
    serviceType: 'verification',
    providerMapping: 'phone_verify',
    displayOrder: 3,
    requiredFields: [
      {
        name: 'phone',
        label: 'Phone Number',
        type: 'text',
        placeholder: 'e.g. 08012345678 or 2348012345678',
        required: true,
        regex: '^(0|234)[789][01]\\d{8}$',
        helperText: 'Nigerian mobile telephone number'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_nin_phone_search_28',
    code: 'NIN_PHONE',
    name: 'NIN Phone Search',
    description: 'Search and retrieve National Identity Number (NIN) record using registered mobile phone number.',
    price: 1200,
    status: 'ACTIVE',
    icon: 'Smartphone',
    category: 'Identity',
    serviceType: 'verification',
    providerMapping: 'nin_phone_search',
    displayOrder: 4,
    requiredFields: [
      {
        name: 'phone',
        label: 'Registered Mobile Phone Number',
        type: 'text',
        placeholder: 'e.g. 08012345678 or 2348012345678',
        required: true,
        regex: '^(0|234)[789][01]\\d{8}$',
        helperText: 'Enter registered mobile phone number linked to NIN'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_nin_val_04',
    code: 'NIN_VALIDATION',
    name: 'NIN Validation & Status Lookup',
    description: 'Comprehensive National Identity register check with full slip verification breakdown.',
    price: 1500,
    status: 'ACTIVE',
    icon: 'ShieldCheck',
    category: 'Identity',
    serviceType: 'verification',
    providerMapping: 'nin_validation',
    displayOrder: 4,
    requiredFields: [
      {
        name: 'nin',
        label: 'National Identity Number (NIN)',
        type: 'text',
        placeholder: 'Enter 11-digit NIN',
        required: true,
        regex: '^\\d{11}$'
      },
      {
        name: 'trackingId',
        label: 'Tracking ID / Slip No. (Optional)',
        type: 'text',
        placeholder: 'Enter tracking reference if available',
        required: false
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_id_lookup_05',
    code: 'IDENTITY_LOOKUP',
    name: 'Identity Cross Lookup',
    description: 'Unified demographic search against certified governmental registry nodes.',
    price: 800,
    status: 'ACTIVE',
    icon: 'Search',
    category: 'Cross-Match',
    serviceType: 'verification',
    providerMapping: 'identity_lookup',
    displayOrder: 5,
    defaultProvider: 'veripine',
    requiredFields: [
      {
        name: 'searchQuery',
        label: 'Search Query (NIN, Phone or Document ID)',
        type: 'text',
        placeholder: 'Enter identifier',
        required: true
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_drivers_06',
    code: 'DRIVERS_LICENSE',
    name: 'Drivers License Verification',
    description: 'FRSC Drivers License authenticity check and driver particulars match.',
    price: 1800,
    status: 'ACTIVE',
    icon: 'FileBadge',
    category: 'Licensing',
    serviceType: 'verification',
    providerMapping: 'frsc_license',
    displayOrder: 6,
    requiredFields: [
      {
        name: 'licenseNumber',
        label: 'License Number',
        type: 'text',
        placeholder: 'e.g. ABC12345AA',
        required: true
      },
      {
        name: 'dob',
        label: 'Date of Birth (YYYY-MM-DD)',
        type: 'text',
        placeholder: '1990-05-15',
        required: true
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  // --- INDIVIDUAL MODIFICATION SERVICES (EACH MANAGED INDIVIDUALLY) ---
  {
    id: 'srv_nin_name_mod',
    code: 'NIN_NAME_MOD',
    name: 'Name Modification',
    description: 'Change or correct registered names, fix spelling errors, or update surname due to marriage.',
    price: 4500,
    status: 'ACTIVE',
    icon: 'UserCheck',
    category: 'Modification Services',
    serviceType: 'non_verification',
    providerMapping: 'modification_name',
    displayOrder: 7,
    requiredFields: [
      { name: 'nin', label: 'National Identity Number (NIN)', type: 'text', placeholder: 'Enter 11-digit NIN', required: true, regex: '^\\d{11}$' },
      { name: 'surname', label: 'New Surname', type: 'text', placeholder: 'Enter new surname', required: true },
      { name: 'firstName', label: 'New First Name', type: 'text', placeholder: 'Enter new first name', required: true },
      { name: 'middleName', label: 'New Middle Name', type: 'text', placeholder: 'Enter middle name if any', required: false }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_nin_dob_mod',
    code: 'NIN_DOB_MOD',
    name: 'Date of Birth Modification',
    description: 'Official NIMC date of birth correction and registry update.',
    price: 50000,
    status: 'ACTIVE',
    icon: 'Calendar',
    category: 'Modification Services',
    serviceType: 'non_verification',
    providerMapping: 'modification_dob',
    displayOrder: 8,
    requiredFields: [
      { name: 'nin', label: 'National Identity Number (NIN)', type: 'text', placeholder: 'Enter 11-digit NIN', required: true, regex: '^\\d{11}$' },
      { name: 'newDob', label: 'Correct Date of Birth', type: 'date', required: true }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_nin_phone_mod',
    code: 'NIN_PHONE_MOD',
    name: 'Phone Number Modification',
    description: 'Update the primary mobile telephone number linked to your National Identity Number.',
    price: 4500,
    status: 'ACTIVE',
    icon: 'PhoneCall',
    category: 'Modification Services',
    serviceType: 'non_verification',
    providerMapping: 'modification_phone',
    displayOrder: 9,
    requiredFields: [
      { name: 'nin', label: 'National Identity Number (NIN)', type: 'text', placeholder: 'Enter 11-digit NIN', required: true, regex: '^\\d{11}$' },
      { name: 'oldPhone', label: 'Old Phone Number', type: 'text', placeholder: 'Previous phone number', required: true },
      { name: 'newPhone', label: 'New Phone Number', type: 'text', placeholder: 'New phone number to link', required: true }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_nin_address_mod',
    code: 'NIN_ADDRESS_MOD',
    name: 'Address Modification',
    description: 'Update residential address, state, and local government area on your national identity record.',
    price: 4500,
    status: 'ACTIVE',
    icon: 'Home',
    category: 'Modification Services',
    serviceType: 'non_verification',
    providerMapping: 'modification_address',
    displayOrder: 10,
    requiredFields: [
      { name: 'nin', label: 'National Identity Number (NIN)', type: 'text', placeholder: 'Enter 11-digit NIN', required: true, regex: '^\\d{11}$' },
      { name: 'address', label: 'New Street Address', type: 'text', placeholder: 'Enter new residential address', required: true },
      { name: 'state', label: 'State', type: 'text', placeholder: 'State of residence', required: true },
      { name: 'lga', label: 'LGA', type: 'text', placeholder: 'Local Government Area', required: true }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_bvn_mod_center',
    code: 'BVN_MODIFICATION',
    name: 'BVN Modification',
    description: 'Update name, date of birth, or phone number on bank verification record via certified center.',
    price: 3500,
    status: 'ACTIVE',
    icon: 'CreditCard',
    category: 'Modification Services',
    serviceType: 'non_verification',
    providerMapping: 'bvn_modification',
    displayOrder: 11,
    requiredFields: [
      { name: 'bvn', label: 'Bank Verification Number (BVN)', type: 'text', placeholder: 'Enter 11-digit BVN', required: true, regex: '^\\d{11}$' },
      { name: 'dob', label: 'Date of Birth (YYYY-MM-DD)', type: 'text', placeholder: 'YYYY-MM-DD', required: true },
      { name: 'newPhone', label: 'New Phone Number', type: 'text', placeholder: 'Enter new phone number', required: true }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_online_nin_reg',
    code: 'ONLINE_NIN_REGISTRATION',
    name: 'Online NIN Registration',
    description: 'Authorized operator enrollment service for registering citizen National Identity Numbers.',
    price: 5000,
    status: 'ACTIVE',
    icon: 'Fingerprint',
    category: 'Operator Services',
    serviceType: 'non_verification',
    providerMapping: 'online_nin_registration',
    displayOrder: 12,
    managedBy: 'MEGA_ADMIN',
    allowedRoles: ['MEGA_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'AGENT'],
    requiredFields: [
      { name: 'firstName', label: 'First Name', type: 'text', required: true },
      { name: 'lastName', label: 'Last Name', type: 'text', required: true },
      { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
      { name: 'nationality', label: 'Nationality', type: 'text', required: true }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_cac_reg_01',
    code: 'CAC_REGISTRATION',
    name: 'CAC Business Registration',
    description: 'Full business name, enterprise, or company incorporation registration with CAC.',
    price: 25000,
    agentPrice: 20000,
    status: 'ACTIVE',
    icon: 'Building2',
    category: 'Corporate',
    serviceType: 'non_verification',
    providerMapping: 'cac_registration',
    displayOrder: 13,
    requiredFields: [
      { name: 'proposedName1', label: 'Proposed Name Option 1', type: 'text', required: true },
      { name: 'proposedName2', label: 'Proposed Name Option 2', type: 'text', required: true },
      { name: 'businessNature', label: 'Nature of Business', type: 'text', required: true }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_business_cac',
    code: 'BUSINESS_CAC',
    name: 'Business CAC',
    description: 'Register Sole Proprietorship / Enterprise with the Corporate Affairs Commission.',
    price: 22000,
    agentPrice: 18000,
    status: 'ACTIVE',
    icon: 'Building',
    category: 'Corporate',
    serviceType: 'non_verification',
    providerMapping: 'cac_registration',
    displayOrder: 14,
    requiredFields: [
      { name: 'proposedName1', label: 'Proposed Business Name 1', type: 'text', required: true },
      { name: 'proposedName2', label: 'Proposed Business Name 2', type: 'text', required: true },
      { name: 'businessNature', label: 'Nature of Business', type: 'text', required: true },
      { name: 'officeAddress', label: 'Office Address', type: 'text', required: true },
      { name: 'proprietorName', label: 'Proprietor Legal Name', type: 'text', required: true }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_company_cac',
    code: 'COMPANY_CAC',
    name: 'Company CAC',
    description: 'Incorporate Private Limited Liability Company (LTD) with official CAC status.',
    price: 30000,
    agentPrice: 25000,
    status: 'ACTIVE',
    icon: 'Building2',
    category: 'Corporate',
    serviceType: 'non_verification',
    providerMapping: 'cac_registration',
    displayOrder: 15,
    requiredFields: [
      { name: 'proposedName1', label: 'Proposed Company Name 1', type: 'text', required: true },
      { name: 'proposedName2', label: 'Proposed Company Name 2', type: 'text', required: true },
      { name: 'businessNature', label: 'Object / Nature of Business', type: 'text', required: true },
      { name: 'shareCapital', label: 'Share Capital', type: 'text', required: true },
      { name: 'officeAddress', label: 'Registered Address', type: 'text', required: true }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_tin_reg_01',
    code: 'TIN_REGISTRATION',
    name: 'TIN Registration',
    description: 'Joint Tax Board (JTB) / FIRS Tax Identification Number registration and generation.',
    price: 8000,
    agentPrice: 6000,
    status: 'ACTIVE',
    icon: 'FileText',
    category: 'Corporate',
    serviceType: 'non_verification',
    providerMapping: 'tin_registration',
    displayOrder: 16,
    requiredFields: [
      { name: 'identifier', label: 'NIN or BVN', type: 'text', required: true },
      { name: 'businessName', label: 'Registered Business or Personal Name', type: 'text', required: true }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_tin_individual',
    code: 'TIN_INDIVIDUAL',
    name: 'Individual TIN Registration',
    description: 'Register Personal / Sole Trader Tax Identification Number with Joint Tax Board.',
    price: 1000,
    agentPrice: 750,
    status: 'ACTIVE',
    icon: 'Receipt',
    category: 'Corporate',
    serviceType: 'non_verification',
    providerMapping: 'tin_registration',
    displayOrder: 17,
    requiredFields: [
      { name: 'taxpayerName', label: 'Taxpayer Full Name', type: 'text', required: true },
      { name: 'individualIdNumber', label: 'NIN or BVN', type: 'text', required: true },
      { name: 'tinPhone', label: 'Phone Number', type: 'text', required: true },
      { name: 'taxState', label: 'State of Tax Residence', type: 'text', required: true }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_tin_company',
    code: 'TIN_COMPANY',
    name: 'Company TIN Registration',
    description: 'Register Corporate entity Tax Identification Number for registered businesses and LLCs.',
    price: 2500,
    agentPrice: 2000,
    status: 'ACTIVE',
    icon: 'FileBadge',
    category: 'Corporate',
    serviceType: 'non_verification',
    providerMapping: 'tin_registration',
    displayOrder: 18,
    requiredFields: [
      { name: 'taxpayerName', label: 'Company / Business Registered Name', type: 'text', required: true },
      { name: 'rcOrBnNumber', label: 'RC Number / BN Number', type: 'text', required: true },
      { name: 'tinPhone', label: 'Official Phone Number', type: 'text', required: true },
      { name: 'taxState', label: 'State of Operation', type: 'text', required: true }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_ipe_mod',
    code: 'IPE_MODIFICATION',
    name: 'IPE Modification',
    description: 'Identity Protection Eligibility update and NIMC tracking clearance modification.',
    price: 4500,
    agentPrice: 3500,
    status: 'ACTIVE',
    icon: 'ShieldAlert',
    category: 'Modification Services',
    serviceType: 'non_verification',
    providerMapping: 'ipe_clearance',
    displayOrder: 19,
    requiredFields: [
      { name: 'nin', label: 'National Identity Number (NIN)', type: 'text', required: true, regex: '^\\d{11}$' },
      { name: 'ipeTrackingId', label: 'Tracking ID', type: 'text', required: true },
      { name: 'ipePhone', label: 'Phone Number', type: 'text', required: true }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_birth_att_09',
    code: 'BIRTH_ATTESTATION',
    name: 'Birth Attestation',
    description: 'Official birth attestation processing (Takes 3-4 days)',
    price: 15000,
    status: 'ACTIVE',
    icon: 'Baby',
    category: 'Civil Registry',
    serviceType: 'non_verification',
    providerMapping: 'birth_attestation',
    displayOrder: 12,
    requiredFields: [
      {
        name: 'fullName',
        label: 'Applicant Legal Full Name',
        type: 'text',
        placeholder: 'Full Name as on records',
        required: true
      },
      {
        name: 'dob',
        label: 'Attested Date of Birth',
        type: 'date',
        placeholder: 'YYYY-MM-DD',
        required: true
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_pers_08',
    code: 'PERSONALIZATION',
    name: 'Personalization',
    description: 'Get/retrieve NIN slip using a valid tracking ID.',
    price: 2000,
    status: 'ACTIVE',
    icon: 'IdCard',
    category: 'NIN Services',
    serviceType: 'non_verification',
    providerMapping: 'nin_personalization',
    displayOrder: 13,
    requiredFields: [
      {
        name: 'trackingId',
        label: 'NIMC Tracking ID',
        type: 'text',
        placeholder: 'Enter valid NIMC enrollment tracking ID',
        required: true,
        helperText: 'Enter your valid NIMC enrollment tracking ID to retrieve slip'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_bvn_crm_10',
    code: 'BVN_CRM',
    name: 'BVN By CRM',
    description: 'Verify Bank Verification Number through the supported CRM verification service.',
    price: 1500,
    status: 'ACTIVE',
    icon: 'Database',
    category: 'Banking',
    serviceType: 'verification',
    providerMapping: 'bvn_crm',
    displayOrder: 10,
    requiredFields: [
      {
        name: 'bvn',
        label: 'Bank Verification Number (BVN)',
        type: 'text',
        placeholder: 'Enter 11-digit BVN',
        required: true,
        regex: '^\\d{11}$',
        helperText: 'Must be 11 numeric digits'
      },
      {
        name: 'crmRef',
        label: 'CRM Reference / Account Number',
        type: 'text',
        placeholder: 'Enter CRM tracking ID or linked 10-digit NUBAN',
        required: true,
        helperText: 'Any additional information required by the actual API'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_ipe_clr_12',
    code: 'IPE_CLEARANCE',
    name: 'IPE Clearance',
    description: 'Identity Protection Eligibility clearance service.',
    price: 5000,
    status: 'ACTIVE',
    icon: 'ShieldAlert',
    category: 'Identity',
    serviceType: 'non_verification',
    providerMapping: 'ipe_clearance',
    displayOrder: 12,
    requiredFields: [
      {
        name: 'nin',
        label: 'National Identity Number (NIN)',
        type: 'text',
        placeholder: 'Enter 11-digit NIN',
        required: true,
        regex: '^\\d{11}$',
        helperText: '11-digit applicant NIN'
      },
      {
        name: 'applicantDetails',
        label: 'Applicant Legal Name & NIMC Center',
        type: 'text',
        placeholder: 'Full legal name and NIMC registration center details',
        required: true,
        helperText: 'Other information required by the actual verification provider'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_nin_delink_14',
    code: 'NIN_DELINKING',
    name: 'NIN Delinking',
    description: 'NIN delinking/self-service delinking and email retrieval where supported.',
    price: 2500,
    status: 'ACTIVE',
    icon: 'Unlink',
    category: 'NIN Services',
    serviceType: 'non_verification',
    providerMapping: 'nin_delinking',
    displayOrder: 14,
    requiredFields: [
      {
        name: 'nin',
        label: 'National Identity Number (NIN)',
        type: 'text',
        placeholder: 'Enter 11-digit NIN',
        required: true,
        regex: '^\\d{11}$',
        helperText: '11-digit applicant NIN'
      },
      {
        name: 'contactInfo',
        label: 'Phone Number or Email to Delink / Retrieve',
        type: 'text',
        placeholder: 'e.g. 08012345678 or user@example.com',
        required: true,
        helperText: 'Phone/email or other information required by the actual provider'
      },
      {
        name: 'delinkAction',
        label: 'Delinking Action Type',
        type: 'select',
        placeholder: 'Select action',
        required: true,
        options: [
          'Self-Service Phone Delinking',
          'Self-Service Email Delinking',
          'Email Retrieval & Status Verification'
        ]
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_bvn_and_15',
    code: 'BVN_ANDROID_USER',
    name: 'BVN Android User',
    description: 'Allow users/agents to submit their details to become an approved BVN service agent where this service is actually supported.',
    price: 5000,
    status: 'ACTIVE',
    icon: 'Smartphone',
    category: 'Agent Services',
    serviceType: 'non_verification',
    providerMapping: 'bvn_android_user',
    displayOrder: 15,
    requiredFields: [
      {
        name: 'fullName',
        label: 'Agent Legal Full Name',
        type: 'text',
        placeholder: 'Enter official full legal name',
        required: true
      },
      {
        name: 'phone',
        label: 'Mobile Phone Number',
        type: 'text',
        placeholder: 'e.g. 08012345678',
        required: true,
        regex: '^(0|234)[789][01]\\d{8}$'
      },
      {
        name: 'bvn',
        label: 'BVN',
        type: 'text',
        placeholder: 'Enter 11-digit BVN',
        required: true,
        regex: '^\\d{11}$',
        helperText: 'Must be 11 numeric digits'
      },
      {
        name: 'email',
        label: 'Agent Email Address',
        type: 'text',
        placeholder: 'agent@example.com',
        required: true
      },
      {
        name: 'deviceDetails',
        label: 'Android Device Particulars',
        type: 'text',
        placeholder: 'Device model and hardware identification',
        required: true,
        helperText: 'Other provider-required information'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_bvn_ret_16',
    code: 'BVN_RETRIEVAL',
    name: 'BVN Retrieval',
    description: 'Retrieve BVN details. This service costs ₦550.00.',
    price: 550,
    status: 'ACTIVE',
    icon: 'KeyRound',
    category: 'Banking',
    serviceType: 'non_verification',
    providerMapping: 'bvn_retrieval',
    displayOrder: 16,
    requiredFields: [
      {
        name: 'phone',
        label: 'Phone Number',
        type: 'text',
        placeholder: 'e.g. 08012345678 or 2348012345678',
        required: true,
        regex: '^(0|234)[789][01]\\d{8}$',
        helperText: 'Enter registered mobile phone number linked to BVN'
      },
      {
        name: 'firstName',
        label: 'First Name (Optional)',
        type: 'text',
        placeholder: 'Enter first name if known',
        required: false
      },
      {
        name: 'lastName',
        label: 'Last Name / Surname (Optional)',
        type: 'text',
        placeholder: 'Enter surname if known',
        required: false
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_cac_tin_17',
    code: 'CAC_TIN',
    name: 'CAC & TIN',
    description: 'Corporate Affairs Commission filings & Joint Tax Board registrations (Business CAC, Company CAC, Individual TIN Registration, Company TIN Registration).',
    price: 1000,
    status: 'ACTIVE',
    icon: 'Building2',
    category: 'Corporate',
    serviceType: 'non_verification',
    providerMapping: 'cac_tin_service',
    displayOrder: 17,
    requiredFields: [
      {
        name: 'cacTinType',
        label: 'Sub-Service',
        type: 'select',
        options: [
          'Business CAC',
          'Company CAC',
          'Individual TIN Registration',
          'Company TIN Registration'
        ],
        required: true
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_self_email_20',
    code: 'SELF_SERVICE_EMAIL',
    name: 'Self service Email Retrieval',
    description: 'Retrieve email address linked to your NIN identity record.',
    price: 1500,
    status: 'ACTIVE',
    icon: 'Mail',
    category: 'NIN Services',
    serviceType: 'non_verification',
    providerMapping: 'self_service_email',
    displayOrder: 20,
    requiredFields: [
      { name: 'nin', label: 'National Identity Number (NIN)', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'Enter email address', required: true }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv_demographic_ver_21',
    code: 'DEMOGRAPHIC_VERIFICATION',
    name: 'Demographic Verification',
    description: 'Verify identity records by matching demographic criteria: First Name, Last Name, Gender, and Date of Birth.',
    price: 1200,
    status: 'ACTIVE',
    icon: 'UserCheck',
    category: 'Identity Verification',
    serviceType: 'verification',
    providerMapping: 'demographic_verification',
    displayOrder: 21,
    requiredFields: [
      {
        name: 'firstName',
        label: 'First Name',
        type: 'text',
        placeholder: 'Enter first name',
        required: true,
        helperText: 'Applicant legal first name'
      },
      {
        name: 'lastName',
        label: 'Last Name',
        type: 'text',
        placeholder: 'Enter last name (surname)',
        required: true,
        helperText: 'Applicant legal last name / surname'
      },
      {
        name: 'gender',
        label: 'Gender',
        type: 'select',
        placeholder: 'Select gender',
        required: true,
        options: ['Male', 'Female'],
        helperText: 'Applicant gender'
      },
      {
        name: 'dob',
        label: 'Date of Birth',
        type: 'date',
        placeholder: 'YYYY-MM-DD',
        required: true,
        helperText: 'Applicant registered date of birth'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const defaultEnrollmentCenters: BvnEnrollmentCenter[] = [
  {
    id: 'bvn_ec_agency',
    name: 'AGENCY',
    code: 'AGENCY',
    price: 3500,
    status: 'ACTIVE',
    description: 'Agency Banking Enrollment Center Network',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bvn_ec_cafe',
    name: 'CAFE BVN',
    code: 'CAFE_BVN',
    price: 3500,
    status: 'ACTIVE',
    description: 'Cyber Café Certified Service Point',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bvn_ec_gtb',
    name: 'GT BANK',
    code: 'GT_BANK',
    price: 7000,
    status: 'ACTIVE',
    description: 'Guaranty Trust Bank Official KYC Center',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export function ensureDefaultProviders(db: DatabaseSchema): void {
  if (!db.providers) {
    db.providers = [];
  }

  // Ensure Ninja API Provider
  const ninjaApiKey = (process.env.NINJA_PUBLIC_KEY || '').trim();
  const ninjaSecretKey = (process.env.NINJA_SECRET_KEY || '').trim();
  const ninjaBaseUrl = (process.env.NINJA_BASE_URL && process.env.NINJA_BASE_URL.startsWith('http'))
    ? process.env.NINJA_BASE_URL.replace(/\/$/, '')
    : 'https://api.ninja.boucloud.io';

  let ninjaProv = db.providers.find((p) => p.slug === 'ninja');
  if (!ninjaProv) {
    ninjaProv = {
      id: 'prov_ninja_01',
      name: 'Ninja API (NIN & BVN Gateway)',
      slug: 'ninja',
      baseUrl: ninjaBaseUrl,
      apiKey: '',
      secretKey: '',
      status: (ninjaApiKey || ninjaSecretKey) ? 'CONNECTED' : 'NOT_CONFIGURED',
      isDevelopmentMode: false,
      notes: 'Dedicated provider for NIN Verification, BVN Verification, Driving Licence, and BVN by CRM.'
    };
    db.providers.push(ninjaProv);
  } else {
    ninjaProv.baseUrl = ninjaBaseUrl;
    ninjaProv.apiKey = '';
    ninjaProv.secretKey = '';
    ninjaProv.isDevelopmentMode = false;
    ninjaProv.status = (ninjaApiKey || ninjaSecretKey) ? 'CONNECTED' : 'NOT_CONFIGURED';
  }

  // Remove HK API and Prembly/IdentityPass Providers if present
  db.providers = db.providers.filter((p) => p.slug !== 'hk' && p.id !== 'prov_hk_01' && p.slug !== 'identitypass' && p.id !== 'prov_prembly_01');

  // Ensure Veripine API Provider
  const safeVeripineBaseUrl = (process.env.VERIPINE_BASE_URL && process.env.VERIPINE_BASE_URL.startsWith('http'))
    ? process.env.VERIPINE_BASE_URL.replace(/\/$/, '')
    : 'https://veripine.com/api';
  const veripineKey = (process.env.VERIPINE_SECRET_KEY || process.env.VERIPINE_API_KEY || '').trim();

  let veripineProv = db.providers.find((p) => p.slug === 'veripine');
  if (!veripineProv) {
    veripineProv = {
      id: 'prov_veripine_01',
      name: 'Veripine API Gateway',
      slug: 'veripine',
      baseUrl: safeVeripineBaseUrl,
      apiKey: '',
      secretKey: '',
      status: veripineKey ? 'CONNECTED' : 'NOT_CONFIGURED',
      isDevelopmentMode: false,
      notes: 'Dedicated provider for NIN & BVN Verification, NIN Phone Search, BVN Retrieval with Phone, Personalization Tracking, Demographic Verification, and NIN Modifications.'
    };
    db.providers.push(veripineProv);
  } else {
    veripineProv.apiKey = '';
    veripineProv.secretKey = '';
    if (!veripineProv.baseUrl) {
      veripineProv.baseUrl = safeVeripineBaseUrl;
    }
    veripineProv.isDevelopmentMode = false;
    veripineProv.status = veripineKey ? 'CONNECTED' : 'NOT_CONFIGURED';
  }

  // Ensure Paystack Live Payment Gateway Provider
  const paystackSecretKey = (
    process.env.PAYSTACK_SECRET_KEY ||
    process.env.PAYSTACK_LIVE_SECRET_KEY ||
    process.env.PAYSTACK_SECRET ||
    process.env.PAYSTACK_KEY ||
    ''
  ).trim();
  const paystackPublicKey = (
    process.env.VITE_PAYSTACK_PUBLIC_KEY ||
    process.env.PAYSTACK_PUBLIC_KEY ||
    process.env.VITE_PAYSTACK_LIVE_PUBLIC_KEY ||
    ''
  ).trim();

  let paystackProv = db.providers.find((p) => p.slug === 'paystack');
  if (!paystackProv) {
    paystackProv = {
      id: 'prov_paystack_01',
      name: 'Paystack Live Gateway',
      slug: 'paystack',
      baseUrl: 'https://api.paystack.co',
      apiKey: paystackPublicKey,
      secretKey: paystackSecretKey,
      status: paystackSecretKey ? 'CONNECTED' : 'NOT_CONFIGURED',
      isDevelopmentMode: false,
      notes: 'Official live payment gateway for customer wallet card & bank account funding.'
    };
    db.providers.push(paystackProv);
  } else {
    if (paystackSecretKey) paystackProv.secretKey = paystackSecretKey;
    if (paystackPublicKey) paystackProv.apiKey = paystackPublicKey;
    if (!paystackProv.baseUrl) paystackProv.baseUrl = 'https://api.paystack.co';
    paystackProv.isDevelopmentMode = false;
    paystackProv.status = (paystackProv.secretKey || paystackSecretKey) ? 'CONNECTED' : 'NOT_CONFIGURED';
  }
}

export function ensureAllServices(db: DatabaseSchema): void {
  if (!db.services) {
    db.services = [];
  }

  // Remove deprecated parent bundled 'MODIFICATION' placeholder so all sub-services are individually managed
  db.services = db.services.filter((s) => s.code !== 'MODIFICATION');

  // Initialize bvnEnrollmentCenters if missing or empty
  if (!db.bvnEnrollmentCenters || db.bvnEnrollmentCenters.length === 0) {
    db.bvnEnrollmentCenters = [...defaultEnrollmentCenters];
  }

  // Only seed services that do NOT exist yet - never overwrite existing values!
  for (const defService of defaultCatalogueServices) {
    const existing = db.services.find((s) => s.code.toUpperCase() === defService.code.toUpperCase());
    if (!existing) {
      db.services.push({
        ...defService,
        agentPrice: defService.agentPrice || Math.round(defService.price * 0.75 * 100) / 100
      });
    } else {
      if (existing.agentPrice === undefined) {
        existing.agentPrice = defService.agentPrice || Math.round(existing.price * 0.75 * 100) / 100;
      }
      if (defService.managedBy) existing.managedBy = defService.managedBy;
      if (defService.allowedRoles) existing.allowedRoles = defService.allowedRoles;
      if (existing.displayOrder === undefined || existing.displayOrder === 0 || !existing.displayOrder) {
        existing.displayOrder = defService.displayOrder;
      }
      if (!existing.providerMapping) {
        existing.providerMapping = defService.providerMapping;
      }
      if (!existing.category) {
        existing.category = defService.category;
      }
      if (!existing.serviceType) {
        existing.serviceType = defService.serviceType;
      }
      if (!existing.requiredFields || existing.requiredFields.length === 0) {
        existing.requiredFields = defService.requiredFields;
      }
      if (!existing.defaultProvider) {
        existing.defaultProvider = 'default';
      }
    }
  }

  // Sort services by displayOrder
  db.services.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
}

function getInitialData(): DatabaseSchema {
  const defaultServices: Service[] = [
    {
      id: 'srv_nin_01',
      code: 'NIN',
      name: 'NIN Verification',
      description: 'Verify National Identity Number directly via official biometric identity registry database.',
      price: 1000,
      status: 'ACTIVE',
      icon: 'UserCheck',
      category: 'Identity',
      providerMapping: 'nin_verify',
      requiredFields: [
        {
          name: 'nin',
          label: 'National Identity Number (NIN)',
          type: 'text',
          placeholder: 'Enter 11-digit NIN',
          required: true,
          regex: '^\\d{11}$',
          helperText: 'Must be exactly 11 numeric digits'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'srv_bvn_02',
      code: 'BVN',
      name: 'BVN Verification',
      description: 'Instant Bank Verification Number check and KYC identity validation.',
      price: 1200,
      status: 'ACTIVE',
      icon: 'CreditCard',
      category: 'Banking',
      providerMapping: 'bvn_verify',
      requiredFields: [
        {
          name: 'bvn',
          label: 'Bank Verification Number (BVN)',
          type: 'text',
          placeholder: 'Enter 11-digit BVN',
          required: true,
          regex: '^\\d{11}$',
          helperText: 'Must be exactly 11 numeric digits'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'srv_phone_03',
      code: 'PHONE',
      name: 'Phone Number Verification',
      description: 'Validate registered subscriber information, SIM binding and carrier status.',
      price: 500,
      status: 'ACTIVE',
      icon: 'PhoneCall',
      category: 'Telecom',
      providerMapping: 'phone_verify',
      requiredFields: [
        {
          name: 'phone',
          label: 'Phone Number',
          type: 'text',
          placeholder: 'e.g. 08012345678 or 2348012345678',
          required: true,
          regex: '^(0|234)[789][01]\\d{8}$',
          helperText: 'Nigerian mobile telephone number'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'srv_nin_val_04',
      code: 'NIN_VALIDATION',
      name: 'NIN Validation & Status Lookup',
      description: 'Comprehensive National Identity register check with full slip verification breakdown.',
      price: 1500,
      status: 'ACTIVE',
      icon: 'ShieldCheck',
      category: 'Identity',
      providerMapping: 'nin_validation',
      requiredFields: [
        {
          name: 'nin',
          label: 'National Identity Number (NIN)',
          type: 'text',
          placeholder: 'Enter 11-digit NIN',
          required: true,
          regex: '^\\d{11}$'
        },
        {
          name: 'trackingId',
          label: 'Tracking ID / Slip No. (Optional)',
          type: 'text',
          placeholder: 'Enter tracking reference if available',
          required: false
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'srv_id_lookup_05',
      code: 'IDENTITY_LOOKUP',
      name: 'Identity Cross Lookup',
      description: 'Unified demographic search against certified governmental registry nodes.',
      price: 800,
      status: 'ACTIVE',
      icon: 'Search',
      category: 'Cross-Match',
      providerMapping: 'identity_lookup',
      defaultProvider: 'veripine',
      requiredFields: [
        {
          name: 'searchQuery',
          label: 'Search Query (NIN, Phone or Document ID)',
          type: 'text',
          placeholder: 'Enter identifier',
          required: true
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'srv_drivers_06',
      code: 'DRIVERS_LICENSE',
      name: 'Drivers License Verification',
      description: 'FRSC Drivers License authenticity check and driver particulars match.',
      price: 1800,
      status: 'ACTIVE',
      icon: 'FileBadge',
      category: 'Licensing',
      providerMapping: 'frsc_license',
      requiredFields: [
        {
          name: 'licenseNumber',
          label: 'License Number',
          type: 'text',
          placeholder: 'e.g. ABC12345AA',
          required: true
        },
        {
          name: 'dob',
          label: 'Date of Birth (YYYY-MM-DD)',
          type: 'text',
          placeholder: '1990-05-15',
          required: true
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  return {
    users: [],
    profiles: [],
    wallets: [],
    transactions: [],
    fundingRequests: [],
    services: defaultServices,
    verificationRequests: [],
    verificationResults: [],
    providers: [
      {
        id: 'prov_ninja_01',
        name: 'Ninja API (NIN & BVN Gateway)',
        slug: 'ninja',
        baseUrl: 'https://api.ninja.boucloud.io',
        apiKey: '',
        secretKey: '',
        status: 'CONNECTED',
        isDevelopmentMode: false,
        balance: 0,
        notes: 'Dedicated provider for NIN Verification, BVN Verification, Driving Licence, and BVN by CRM.'
      },
      {
        id: 'prov_veripine_01',
        name: 'Veripine API Gateway',
        slug: 'veripine',
        baseUrl: 'https://veripine.com/api',
        apiKey: '',
        secretKey: '',
        status: 'CONNECTED',
        isDevelopmentMode: false,
        balance: 65.4,
        notes: 'Dedicated provider for Identity Cross Lookup, NIN Phone Search, BVN Retrieval with Phone, Personalization Tracking, Demographic Verification, and NIN Modifications.'
      }
    ],
    announcements: [
      {
        id: 'ann_01',
        title: 'Welcome to UGOPAWAVERIFY Enterprise Portal',
        message: 'All verification queries are cryptographically encrypted. Always ensure your wallet is pre-funded before submitting bulk or individual requests.',
        type: 'INFORMATION',
        isActive: true,
        startDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ],
    notifications: [],
    supportTickets: [],
    serviceRequests: [],
    auditLogs: [],
    settings: {
      id: 'settings_main',
      platformName: 'UGOPAWAVERIFY',
      logoText: 'UGOPAWAVERIFY',
      tagline: 'Fast, Secure & Reliable Identity Verification Platform',
      supportWhatsapp: process.env.SUPPORT_WHATSAPP || '07071944789',
      supportEmail: process.env.SUPPORT_EMAIL || 'contact@ugopawaverify.com.ng',
      whatsappNumber: '07071944789',
      phoneNumber1: '07071944789',
      phoneNumber2: '07018486189',
      businessEmail: 'contact@ugopawaverify.com.ng',
      unitValueNgn: 200,
      currency: 'Credits',
      currencySymbol: 'Credits',
      transactionPinLength: 4,
      minWalletFunding: 1000,
      maxWalletFunding: 1000000,
      maintenanceMode: false,
      allowManualFunding: true,
      allowCardFunding: true,
      bankDetails: {
        bankName: 'Moniepoint Microfinance Bank',
        accountNumber: '8249103821',
        accountName: 'UGOPAWA VERIFY SERVICES LTD'
      },
      updatedAt: new Date().toISOString()
    }
  };
}

export function initDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbCache = JSON.parse(raw);
    } catch (err) {
      console.error('Error reading db.json, generating fresh schema:', err);
      dbCache = getInitialData();
      saveDb();
    }
  } else {
    dbCache = getInitialData();
    saveDb();
  }

  ensureOwnerExists(dbCache!);
  ensureAllServices(dbCache!);
  ensureDefaultProviders(dbCache!);
  if (!dbCache!.serviceRequests) {
    dbCache!.serviceRequests = [];
  }
  if (!dbCache!.supportTickets) {
    dbCache!.supportTickets = [];
  }
  if (!dbCache!.onboardingRequests) {
    dbCache!.onboardingRequests = [];
  }
  if (!dbCache!.settings) {
    dbCache!.settings = getInitialData().settings;
  }
  // Ensure every user has onboardingStatus & assignedServices initialized
  for (const u of dbCache!.users) {
    if (u.role === 'MEGA_ADMIN') {
      u.onboardingStatus = 'approved';
      if (!u.onboardingApprovedBy) u.onboardingApprovedBy = 'SYSTEM OWNER / FOUNDER';
      if (!u.assignedServices) u.assignedServices = ['ONLINE_NIN_REGISTRATION'];
    } else {
      if (!u.onboardingStatus) u.onboardingStatus = 'not_started';
      if (!u.assignedServices) u.assignedServices = [];
    }
  }
  saveDb();

  // Asynchronously reconcile authoritative data from Supabase PostgreSQL
  syncAuthoritativeDataFromSupabase().catch((err) => {
    console.error('[Supabase Initial Sync Error]:', err?.message || err);
  });

  return dbCache!;
}

/**
 * Reconciles authoritative accounts, services, and wallets from Supabase PostgreSQL.
 * Ensures data/db.json NEVER acts as a competing production database.
 */
export async function syncAuthoritativeDataFromSupabase(migrateAll = false): Promise<void> {
  if (!dbCache) return;

  try {
    // Synchronize services catalogue from Supabase only if Supabase has a strictly newer update timestamp
    const supaServices = await fetchSupabaseServices();
    if (supaServices && supaServices.length > 0) {
      if (!dbCache.services) dbCache.services = [];
      for (const ss of supaServices) {
        const sIdx = dbCache.services.findIndex((s) => s.id === ss.id || s.code.toUpperCase() === ss.code.toUpperCase());
        if (sIdx !== -1) {
          const supaTime = new Date(ss.updatedAt || 0).getTime();
          const localTime = new Date(dbCache.services[sIdx].updatedAt || 0).getTime();
          // Never overwrite a local administrative change (price, routing provider, etc.) with stale Supabase data!
          if (supaTime > localTime) {
            dbCache.services[sIdx] = {
              ...dbCache.services[sIdx],
              ...ss
            };
          }
        } else {
          dbCache.services.push(ss);
        }
      }
    }

    if (!isSupabaseServiceRoleActive()) return;

    const supaUsers = await fetchSupabaseUsers();
    if (supaUsers && supaUsers.length > 0) {
      for (const su of supaUsers) {
        const idx = dbCache.users.findIndex((u) => u.id === su.id || u.email.toLowerCase() === su.email.toLowerCase());
        if (idx !== -1) {
          const supaTime = new Date(su.updatedAt || 0).getTime();
          const localTime = new Date(dbCache.users[idx].updatedAt || 0).getTime();
          // Stale Supabase reads must NEVER overwrite a newer administrative update!
          if (supaTime > localTime) {
            dbCache.users[idx] = {
              ...dbCache.users[idx],
              role: su.role,
              status: su.status,
              avatarUrl: su.avatarUrl || dbCache.users[idx].avatarUrl,
              onboardingStatus: su.onboardingStatus,
              onboardingApprovedAt: su.onboardingApprovedAt,
              onboardingApprovedBy: su.onboardingApprovedBy,
              roleAtApproval: su.roleAtApproval,
              assignedServices: su.assignedServices && su.assignedServices.length > 0 ? su.assignedServices : dbCache.users[idx].assignedServices,
              updatedAt: su.updatedAt
            };
          }
        } else {
          dbCache.users.push(su);
        }
      }
    }

    if (migrateAll) {
      // Migrate any existing legitimate users in dbCache to Supabase on startup
      for (const u of dbCache.users) {
        const res = await saveUserToSupabase(u);
        if (!res.success) {
          console.error('[Supabase Migration Notice] Failed to save user:', u.email, res.error);
        }
      }
      for (const w of dbCache.wallets) {
        const res = await saveWalletToSupabase(w);
        if (!res.success) {
          console.error('[Supabase Migration Notice] Failed to save wallet for:', w.userId, res.error);
        }
      }
    }
    // Re-verify single permanent Mega Admin after any Supabase sync
    ensureOwnerExists(dbCache);
  } catch (err: any) {
    console.error('[Supabase Sync Error]:', err.message || err);
  }
}

export function getDb(): DatabaseSchema {
  if (!dbCache) {
    return initDb();
  }
  ensureOwnerExists(dbCache);
  if (!dbCache.serviceRequests) {
    dbCache.serviceRequests = [];
  }
  if (!dbCache.supportTickets) {
    dbCache.supportTickets = [];
  }
  if (!dbCache.onboardingRequests) {
    dbCache.onboardingRequests = [];
  }
  if (!dbCache.services || dbCache.services.length === 0) {
    ensureAllServices(dbCache);
    saveDb();
  }
  return dbCache;
}

export function generateServiceTicketId(): string {
  const db = getDb();
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePrefix = `UPV-${yyyy}${mm}${dd}-`;

  // Generate 6-character uppercase alphanumeric tracking code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  let ticketId = `${datePrefix}${randomPart}`;

  // Ensure uniqueness in database
  const exists = (db.serviceRequests || []).some((r) => r.ticketId === ticketId || (r as any).trackingId === ticketId);
  if (exists) {
    let altPart = '';
    for (let i = 0; i < 6; i++) {
      altPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    ticketId = `${datePrefix}${altPart}`;
  }
  return ticketId;
}

let isSaving = false;
let pendingSave = false;
let saveDebounceTimer: NodeJS.Timeout | null = null;

async function performDiskSave(): Promise<void> {
  if (!dbCache || isSaving) {
    if (dbCache) pendingSave = true;
    return;
  }
  isSaving = true;
  pendingSave = false;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
    }
    const jsonStr = JSON.stringify(dbCache);
    const tmpFile = `${DB_FILE}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    await fs.promises.writeFile(tmpFile, jsonStr, 'utf-8');
    await fs.promises.rename(tmpFile, DB_FILE);
  } catch (err) {
    console.warn('[DB_SAVE_WARN] Async write error:', err);
  } finally {
    isSaving = false;
    if (pendingSave) {
      pendingSave = false;
      setImmediate(() => {
        performDiskSave().catch(() => {});
      });
    }
  }
}

export function saveDb(): void {
  if (!dbCache) return;
  pendingSave = true;
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    saveDebounceTimer = null;
    performDiskSave().catch(() => {});
  }, 100);
}

export function saveDbSync(): void {
  if (!dbCache) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DB_FILE}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    fs.writeFileSync(tmpFile, JSON.stringify(dbCache), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.warn('[DB_SAVE_SYNC_WARN]', err);
  }
}

// Helper to log audit actions
export function logAudit(
  actorName: string,
  actorRole: string,
  action: string,
  details?: string,
  userId?: string,
  reference?: string,
  ipAddress?: string
) {
  const db = getDb();
  const entry: AuditLog = {
    id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    actorName,
    actorRole,
    action,
    details,
    reference,
    ipAddress,
    timestamp: new Date().toISOString()
  };
  db.auditLogs.unshift(entry);
  // Keep audit logs trimmed to last 2000
  if (db.auditLogs.length > 2000) {
    db.auditLogs = db.auditLogs.slice(0, 2000);
  }
  saveDb();
}
