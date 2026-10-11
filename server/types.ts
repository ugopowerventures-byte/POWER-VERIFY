export type UserRole = 'MEGA_ADMIN' | 'SUPER_ADMIN' | 'ADMIN' | 'AGENT' | 'USER';
export type UserStatus = 'ACTIVE' | 'PAUSED' | 'SUSPENDED';
export type OnboardingStatus = 'not_started' | 'in_progress' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'correction_required';

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  phone: string;
  phone2?: string;
  passwordHash: string;
  salt: string;
  transactionPinHash: string;
  pinSalt: string;
  role: UserRole;
  status: UserStatus;
  address?: string;
  avatarUrl?: string;
  profilePictureUrl?: string;
  verificationPinMode?: 'NONE' | 'USE_PIN';
  lastActiveAt?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  
  // Onboarding & Identity status
  onboardingStatus?: OnboardingStatus;
  onboardingApprovedAt?: string;
  onboardingApprovedBy?: string;
  onboardingStartedAt?: string;
  onboardingExpiresAt?: string;
  onboardingOtpAttempts?: number;
  onboardingNinAttempts?: number;
  onboardingTerminated?: boolean;
  onboardingTerminationReason?: string;
  phone1Verified?: boolean;
  phone1VerifiedNumber?: string;
  pendingRoleEntry?: {
    targetRole: string;
    feeCredits: number;
    feeNgn: number;
    initiatedAt: string;
    onboardingRecordData?: any;
  };
  roleAtApproval?: UserRole;
  assignedServices?: string[]; // e.g. ['ONLINE_NIN_REGISTRATION']
  satisfactionTitle?: string; // Exact field name "Satisfaction/Title"
  dob?: string;
  nin?: string;
  profilePhoto?: string;
  certificates?: string[];
  
  createdAt: string;
  updatedAt: string;
}

export interface AgentAdminOnboarding {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  targetRole: 'AGENT' | 'ADMIN' | 'SUPER_ADMIN';
  fullName: string;
  dob: string;
  phone1: string;
  phone2?: string;
  profilePhoto: string;
  nin: string;
  certificates?: string[];
  satisfactionTitle: string; // "Satisfaction/Title"
  
  // Residential Address
  residentialHouseNumber?: string;
  residentialStreet?: string;
  residentialCity?: string;
  residentialState?: string;
  residentialLga?: string;
  residentialFullAddress?: string;

  // Origin
  stateOfOrigin?: string;
  lgaOfOrigin?: string;

  // Emergency / Reference Contact
  emergencyFullName?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;

  // Phone OTP Confirmation
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;

  // Declarations
  declarationAccepted?: boolean;
  reviewConfirmed?: boolean;
  
  // Real NIN verification data
  ninVerified: boolean;
  ninVerifiedAt?: string;
  ninResultData?: Record<string, any>;
  ninPhotoUrl?: string;
  ninFullName?: string;
  ninDob?: string;
  ninComparisonMatch: boolean;
  nameMatch: boolean;
  dobMatch: boolean;
  verificationMessage?: string;
  
  status: OnboardingStatus;
  rejectionReason?: string;
  correctionRequested?: boolean;
  correctionMessage?: string;
  
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedByRole?: string;
  roleAtApproval?: UserRole;
}

export interface UserProfile {
  userId: string;
  address?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
}

export interface Wallet {
  id: string;
  userId: string;
  availableBalance: number;
  pendingBalance: number;
  totalDeposited: number;
  totalSpent: number;
  updatedAt: string;
}

export type TransactionType = 'FUNDING' | 'VERIFICATION' | 'SERVICE_REQUEST' | 'REFUND' | 'ADJUSTMENT';
export type TransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

export interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  reference: string;
  type: TransactionType;
  amount: number;
  fee: number;
  balanceBefore: number;
  balanceAfter: number;
  status: TransactionStatus;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export type FundingStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type FundingMethod = 'BANK_TRANSFER' | 'CARD' | 'MANUAL';

export interface FundingRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  reference: string;
  amount: number;
  method: FundingMethod;
  receiptUrl?: string;
  receiptName?: string;
  status: FundingStatus;
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ServiceField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'email' | 'file';
  placeholder?: string;
  required: boolean;
  options?: string[];
  regex?: string;
  helperText?: string;
}

export type ServiceType = 'verification' | 'non_verification';
export type ApiRequestStatus = 'success' | 'api_error' | 'timeout' | 'network_error' | 'system_error';
export type ApiCallState =
  | 'api_not_called'
  | 'api_called_response_received'
  | 'api_call_failed_before_response'
  | 'completed'
  | 'refunded';

export interface Service {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  agentPrice?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  requiredFields: ServiceField[];
  icon: string;
  category: string;
  serviceType?: ServiceType;
  providerMapping: string;
  defaultProvider?: string;
  displayOrder?: number;
  allowedRoles?: UserRole[];
  managedBy?: 'MEGA_ADMIN' | 'ALL_ADMINS';
  createdAt: string;
  updatedAt: string;
}

export interface VerificationRequest {
  id: string;
  idempotencyKey: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  reference: string;
  ticketId?: string;
  serviceRequestId?: string;
  serviceCategory?: string;
  serviceType?: ServiceType;
  apiCallState?: ApiCallState;
  apiRequestStatus?: ApiRequestStatus;
  providerResponse?: any;
  searchData: Record<string, any>;
  resultData?: Record<string, any>;
  result?: any;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'SUCCESS' | 'SUCCESSFUL' | 'REJECTED' | 'FAILED' | 'CANCELLED' | 'REQUIRES_ACTION';
  amountCharged: number;
  refundStatus?: 'NONE' | 'REFUNDED';
  refundAmount?: number;
  refundedAt?: string;
  refundedBy?: string;
  errorMessage?: string;
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationResult {
  id: string;
  requestId: string;
  userId: string;
  serviceCode: string;
  serviceName: string;
  reference: string;
  returnedData: Record<string, any>;
  photoUrl?: string;
  providerName: string;
  verifiedAt: string;
  verifiedBy: string;
}

export type ProviderStatus = 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';

export interface VerificationProvider {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  apiKey: string;
  secretKey: string;
  status: ProviderStatus;
  isDevelopmentMode: boolean; // clearly labelled demo/sandbox option if explicitly toggled by admin
  balance?: number | string;
  lastTestedAt?: string;
  lastErrorMessage?: string;
  notes?: string;
}

export type AnnouncementType = 'INFORMATION' | 'WARNING' | 'SUCCESS' | 'MAINTENANCE';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export type NotificationType = 'VERIFICATION' | 'SERVICE_REQUEST' | 'WALLET' | 'SECURITY' | 'ANNOUNCEMENT';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export type ServiceRequestStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REQUIRES_ACTION';

export interface ServiceRequestFile {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  uploadedAt: string;
}

export interface ServiceRequestTimelineEvent {
  id: string;
  status: ServiceRequestStatus;
  title: string;
  description: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
}

export interface CustomerServiceRequest {
  id: string;
  ticketId: string; // e.g. UPV-20261005-0001
  trackingId?: string; // Tracking ID alias
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceCategory: string;
  price: number;
  amountCharged?: number;
  creditsDeducted?: number;
  submittedData: Record<string, any>;
  customerFiles?: ServiceRequestFile[];
  status: ServiceRequestStatus;
  processingTimestamp?: string;
  processingStartedAt?: string;
  processedBy?: string;
  processedByName?: string;
  rejectionReason?: string;
  failureReason?: string;
  refundStatus?: 'NONE' | 'REFUNDED';
  refundAmount?: number;
  refundTxnId?: string;
  refundedAt?: string;
  refundedBy?: string;
  adminNote?: string;
  adminResultText?: string;
  adminResultFiles?: ServiceRequestFile[];
  openedAt?: string;
  openedBy?: string;
  completedAt?: string;
  completedBy?: string;
  completedByAdminId?: string;
  timeline: ServiceRequestTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export type TicketCategory = 'VERIFICATION' | 'WALLET' | 'ACCOUNT' | 'TECHNICAL' | 'OTHER';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: string;
  attachmentUrl?: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  actorName: string;
  actorRole: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  reference?: string;
  details?: string;
  timestamp: string;
}

export interface PlatformSettings {
  id: string;
  platformName: string;
  logoText: string;
  tagline: string;
  supportWhatsapp: string;
  supportEmail: string;
  whatsappNumber?: string;
  phoneNumber1?: string;
  phoneNumber2?: string;
  businessEmail?: string;
  unitValueNgn: number; // Conversion rate: 1 Credit = X NGN (default 200)
  currency: string;
  currencySymbol: string;
  transactionPinLength: number;
  minWalletFunding: number;
  maxWalletFunding: number;
  maintenanceMode: boolean;
  allowManualFunding: boolean;
  allowCardFunding: boolean;
  apiTimeoutMs?: number;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  updatedAt: string;
}

export interface BvnEnrollmentCenter {
  id: string;
  name: string;
  code: string;
  price: number;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
  createdAt: string;
  updatedAt: string;
}
