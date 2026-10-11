export type UserRole = 'MEGA_ADMIN' | 'SUPER_ADMIN' | 'ADMIN' | 'AGENT' | 'USER';
export type UserStatus = 'ACTIVE' | 'PAUSED' | 'SUSPENDED';
export type OnboardingStatus = 'not_started' | 'in_progress' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'correction_required';

export interface UserSummary {
  id: string;
  email: string;
  username: string;
  fullName: string;
  phone: string;
  phone2?: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  address?: string;
  avatarUrl?: string;
  profilePictureUrl?: string;
  lastActiveAt?: string;
  lastLoginAt?: string;
  walletBalance?: number;
  
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
  assignedServices?: string[];
  satisfactionTitle?: string; // Exact field name "Satisfaction/Title"
  dob?: string;
  nin?: string;
  profilePhoto?: string;
  certificates?: string[];
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

export type User = UserSummary;

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
  searchData: Record<string, any>;
  resultData?: Record<string, any>;
  result?: any;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'SUCCESS' | 'REJECTED' | 'FAILED';
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

export interface VerificationProviderSafe {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';
  isDevelopmentMode: boolean;
  balance?: number | string;
  hasApiKey: boolean;
  maskedApiKey?: string;
  hasSecretKey: boolean;
  lastTestedAt?: string;
  notes?: string;
}

export interface ApiAccountProvider {
  id: string;
  slug: 'ninja' | 'veripine' | 'paystack' | string;
  name: string;
  badgeName?: string;
  serviceCategory: string;
  assignedServices: string[];
  dashboardUrl: string;
  docsUrl: string;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONFIGURED';
  environment: 'PRODUCTION LIVE' | 'SANDBOX / DEV';
  maskedApiKey: string;
  lastSuccessfulConnection?: string;
  balance?: number | string;
  description: string;
  accountEmailHint?: string;
  tags?: string[];
  hasSecretKey?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'INFORMATION' | 'WARNING' | 'SUCCESS' | 'MAINTENANCE';
  isActive: boolean;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'VERIFICATION' | 'WALLET' | 'SECURITY' | 'ANNOUNCEMENT';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

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
  category: 'VERIFICATION' | 'WALLET' | 'ACCOUNT' | 'TECHNICAL' | 'OTHER';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
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

export interface PublicSettings {
  platformName: string;
  logoText: string;
  tagline: string;
  supportWhatsapp: string;
  supportEmail: string;
  whatsappNumber?: string;
  phoneNumber1?: string;
  phoneNumber2?: string;
  businessEmail?: string;
  unitValueNgn: number; // 1 Credit = X NGN (default 200)
  currency: string;
  currencySymbol: string;
  minWalletFunding: number;
  maxWalletFunding: number;
  maintenanceMode: boolean;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
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
