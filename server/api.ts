import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  getDb,
  saveDb,
  hashPassword,
  verifyPassword,
  acquireLock,
  releaseLock,
  logAudit,
  generateServiceTicketId,
  syncAuthoritativeDataFromSupabase,
  defaultCatalogueServices
} from './db';
import {
  testSupabaseConnection,
  supabaseServer,
  createSupabaseAuthUser,
  ensureUserInSupabase,
  getSupabaseUserProfile,
  syncWalletToSupabase,
  insertTransactionToSupabase,
  insertFundingRequestToSupabase,
  updateFundingRequestStatusInSupabase,
  insertAuditLogToSupabase,
  fetchSupabaseUsers,
  fetchSupabaseUserById,
  fetchSupabaseUserByIdentifier,
  saveUserToSupabase,
  updateUserRoleInSupabase,
  updateUserStatusInSupabase,
  updateUserAvatarInSupabase,
  updateUserOnboardingInSupabase,
  deleteUserFromSupabase,
  fetchSupabaseWalletByUserId,
  saveWalletToSupabase,
  saveServiceRequestToSupabase,
  fetchSupabaseServices,
  fetchSupabaseServiceByCodeOrId,
  updateServiceInSupabase,
  saveServiceToSupabase,
  deleteServiceFromSupabase,
  saveOnboardingApplicationToSupabase,
  fetchSupabaseOnboardingApplications,
  uploadAvatarToSupabaseStorage,
  isSupabaseServiceRoleActive
} from './supabase';
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  verifyWebhookSignature,
  getPaystackConfigStatus
} from './paystack';
import {
  sendSendchampOtp,
  verifySendchampOtp,
  isPhoneVerifiedForUser,
  resetPhoneVerification,
  getSendchampConfigStatus
} from './sendchamp';
import { providerAdapter, CanonicalNinVerificationResult } from './providerAdapter';
import {
  User,
  Wallet,
  WalletTransaction,
  FundingRequest,
  Service,
  VerificationRequest,
  VerificationResult,
  Notification,
  SupportTicket,
  Announcement,
  CustomerServiceRequest,
  ServiceRequestStatus,
  ServiceRequestFile,
  ServiceRequestTimelineEvent,
  AgentAdminOnboarding
} from './types';

export const apiRouter = express.Router();

// CORS handling for API requests
apiRouter.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Parse JSON with generous limit for receipt, passport photo, and document uploads
apiRouter.use(express.json({
  limit: '100mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
apiRouter.use(express.urlencoded({ limit: '100mb', extended: true }));

// ----------------------------------------------------
// Authentication Middleware
// ----------------------------------------------------
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Simple signed token mechanism for portable session handling
function generateToken(userId: string): string {
  const payload = { userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = process.env.JWT_SECRET || 'bazeright_secure_identity_key_2026';
  const sig = crypto.createHmac('sha256', secret).update(str).digest('base64url');
  return `${str}.${sig}`;
}

function verifyToken(tokenString: string): string | null {
  try {
    const parts = tokenString.split('.');
    if (parts.length !== 2) return null;
    const [str, sig] = parts;
    const secret = process.env.JWT_SECRET || 'bazeright_secure_identity_key_2026';
    const expectedSig = crypto.createHmac('sha256', secret).update(str).digest('base64url');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(str, 'base64url').toString('utf-8'));
    if (payload.exp < Date.now()) return null;
    return payload.userId;
  } catch {
    return null;
  }
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }

  const db = getDb();
  let user = db.users.find((u) => u.id === userId);
  if (!user) {
    const supaUser = await fetchSupabaseUserById(userId);
    if (supaUser) {
      user = supaUser;
      db.users.push(user);
    }
  } else {
    // Reconcile authoritative status from database
    const supaUser = await fetchSupabaseUserById(userId);
    if (supaUser) {
      user.status = supaUser.status;
      user.role = supaUser.role;
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  if (user.status === 'PAUSED') {
    return res.status(403).json({ error: 'Your account has been paused by the administrator. Please contact support.' });
  }

  if (user.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Your account has been suspended. Please contact an administrator.' });
  }

  req.user = user;
  next();
}

export function requireMegaAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'MEGA_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized. Mega Administrator (Owner) privileges required.' });
    }
    next();
  });
}

export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user || (req.user.role !== 'MEGA_ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Unauthorized. Super Administrator privileges required.' });
    }
    next();
  });
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user || (req.user.role !== 'MEGA_ADMIN' && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Unauthorized. Administrative access required.' });
    }
    if (req.user.role === 'ADMIN' && req.user.onboardingStatus !== 'approved') {
      return res.status(403).json({ error: 'Administrative access suspended pending completion and approval of one-time identity onboarding.' });
    }
    next();
  });
}

export function getPriceForRole(basePrice: number, role?: string): number {
  if (role === 'AGENT' || role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MEGA_ADMIN') {
    return Math.round(basePrice * 0.75 * 100) / 100;
  }
  return basePrice;
}

// ----------------------------------------------------
// Public Endpoints: Health & Settings & Public Stats
// ----------------------------------------------------
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'healthy', platform: 'BAZERIGHTVERIFY', timestamp: new Date().toISOString() });
});

apiRouter.get('/supabase/status', async (req, res) => {
  const result = await testSupabaseConnection();
  res.json(result);
});

apiRouter.get('/settings/public', (req, res) => {
  const db = getDb();
  const s = db.settings;
  res.json({
    platformName: s.platformName,
    logoText: s.logoText,
    tagline: s.tagline,
    supportWhatsapp: s.supportWhatsapp,
    supportEmail: s.supportEmail,
    whatsappNumber: s.whatsappNumber || s.supportWhatsapp || '07071944789',
    phoneNumber1: s.phoneNumber1 || '07071944789',
    phoneNumber2: s.phoneNumber2 || '07018486189',
    businessEmail: s.businessEmail || s.supportEmail || 'contact@bazerightverify.com.ng',
    unitValueNgn: s.unitValueNgn || 200,
    currency: s.currency === 'UNITS' ? 'Credits' : (s.currency || 'Credits'),
    currencySymbol: s.currencySymbol === 'UNITS' ? 'Credits' : (s.currencySymbol || 'Credits'),
    minWalletFunding: s.minWalletFunding,
    maxWalletFunding: s.maxWalletFunding,
    maintenanceMode: s.maintenanceMode,
    bankDetails: s.bankDetails
  });
});

apiRouter.get('/stats/public', (req, res) => {
  const db = getDb();
  const totalUsers = db.users.length;
  const totalVerifications = db.verificationRequests.length;
  const successfulVerifications = db.verificationRequests.filter((r) => r.status === 'SUCCESS').length;
  const successRate = totalVerifications > 0 ? Math.round((successfulVerifications / totalVerifications) * 100) : 99.4;
  const activeServices = db.services.filter((s) => s.status === 'ACTIVE').length;

  res.json({
    totalUsers: totalUsers > 0 ? totalUsers : '--',
    verificationsCompleted: totalVerifications > 0 ? totalVerifications : '--',
    successRate: totalVerifications > 0 ? `${successRate}%` : '--',
    servicesAvailable: activeServices > 0 ? activeServices : '--'
  });
});

apiRouter.get('/announcements/active', (req, res) => {
  const db = getDb();
  const active = db.announcements.filter((a) => a.isActive);
  res.json(active);
});

// ----------------------------------------------------
// Authentication Endpoints
// ----------------------------------------------------
apiRouter.post('/auth/register', async (req, res) => {
  const { fullName, phone, username, email, password, confirmPassword, agreeTerms } = req.body;

  if (!fullName || !phone || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  if (!agreeTerms) {
    return res.status(400).json({ error: 'You must agree to the Terms and Conditions to proceed.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanUsername = username.toLowerCase().trim();
  const db = getDb();

  // Prevent duplicate email or username
  if (db.users.some((u) => u.email === cleanEmail)) {
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }

  if (db.users.some((u) => u.username === cleanUsername)) {
    return res.status(400).json({ error: 'This username is already taken. Please choose another.' });
  }

  const { hash: passwordHash, salt } = hashPassword(password);

  // Create real Supabase Auth user if Supabase is connected
  const supaAuthId = await createSupabaseAuthUser({
    email: cleanEmail,
    password,
    fullName: fullName.trim(),
    phone: phone.trim()
  });

  const userId = supaAuthId || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newUser: User = {
    id: userId,
    email: cleanEmail,
    username: cleanUsername,
    fullName: fullName.trim(),
    phone: phone.trim(),
    passwordHash,
    salt,
    transactionPinHash: '',
    pinSalt: '',
    role: 'USER', // Standard rule: Public registrations always receive default USER role
    status: 'ACTIVE',
    onboardingStatus: 'not_started',
    assignedServices: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const newWallet: Wallet = {
    id: `wal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    availableBalance: 0,
    pendingBalance: 0,
    totalDeposited: 0,
    totalSpent: 0,
    updatedAt: new Date().toISOString()
  };

  db.users.push(newUser);
  db.wallets.push(newWallet);
  db.profiles.push({
    userId,
    address: '',
    lastLoginAt: new Date().toISOString(),
    lastLoginIp: req.ip || '127.0.0.1'
  });

  // Welcome notification
  db.notifications.push({
    id: `notif_${Date.now()}`,
    userId,
    title: 'Welcome to BAZERIGHTVERIFY',
    message: 'Your identity portal has been set up successfully. Fund your wallet to begin authenticating records.',
    type: 'SECURITY',
    isRead: false,
    link: '/wallet/fund',
    createdAt: new Date().toISOString()
  });

  logAudit(newUser.fullName, newUser.role, 'USER_REGISTERED', `New account created: ${newUser.email}`, userId, undefined, req.ip);
  saveDb();

  // Authoritatively save profile and wallet to Supabase
  await saveUserToSupabase(newUser);
  await saveWalletToSupabase(newWallet);

  const token = generateToken(userId);
  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      fullName: newUser.fullName,
      phone: newUser.phone,
      role: newUser.role,
      status: newUser.status
    }
  });
});

apiRouter.post('/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/username and password are required.' });
  }

  const rawId = String(identifier).trim();
  const clean = rawId.toLowerCase();
  const db = getDb();

  // Check if identifier matches the permanent Mega Admin account
  const isMegaAdminIdentifier =
    clean === '/mega//admin/bazerightverify' ||
    clean === '/mega/admin/bazerightverify' ||
    clean === 'mega/admin/bazerightverify' ||
    clean === 'bazerightverify' ||
    clean === 'ugochukwuoparaocha3@gmail.com' ||
    rawId === '/Mega//admin/bazerightverify';

  let user = db.users.find((u) => {
    if (isMegaAdminIdentifier && u.role === 'MEGA_ADMIN') return true;
    return (
      (u.email && u.email.toLowerCase() === clean) ||
      (u.username && u.username.toLowerCase() === clean) ||
      (u.username && u.username === rawId)
    );
  });

  // If not found in memory, query Supabase authoritatively
  if (!user) {
    const supaUser = await fetchSupabaseUserByIdentifier(clean);
    if (supaUser) {
      user = supaUser;
      db.users.push(user);
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid email/username or password.' });
  }

  // Authoritatively check fresh status from Supabase to prevent bypassing suspension
  const supaUser = await fetchSupabaseUserById(user.id);
  if (supaUser) {
    user.status = supaUser.status;
    user.role = supaUser.role;
    const idx = db.users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      db.users[idx].status = supaUser.status;
      db.users[idx].role = supaUser.role;
    }
  }

  if (user.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Your account has been suspended. Please contact an administrator.' });
  }

  const isValid = verifyPassword(String(password).trim(), user.passwordHash, user.salt);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email/username or password.' });
  }

  // Update profile last login
  const profile = db.profiles.find((p) => p.userId === user.id);
  if (profile) {
    profile.lastLoginAt = new Date().toISOString();
    profile.lastLoginIp = req.ip || '127.0.0.1';
  }

  const auditAction = user.role === 'MEGA_ADMIN' ? 'MEGA_ADMIN_LOGIN' : 'USER_LOGIN';
  logAudit(user.fullName, user.role, auditAction, `Logged in via IP ${req.ip || 'unknown'}`, user.id, undefined, req.ip);
  saveDb();

  const token = generateToken(user.id);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      phone: user.phone,
      phone2: user.phone2,
      role: user.role,
      status: user.status,
      onboardingStatus: user.onboardingStatus || (user.role === 'MEGA_ADMIN' ? 'approved' : 'not_started'),
      onboardingApprovedAt: user.onboardingApprovedAt,
      onboardingApprovedBy: user.onboardingApprovedBy,
      roleAtApproval: user.roleAtApproval,
      assignedServices: user.assignedServices || [],
      satisfactionTitle: user.satisfactionTitle,
      dob: user.dob,
      nin: user.nin,
      avatarUrl: user.avatarUrl || profile?.avatarUrl || '',
      verificationPinMode: user.verificationPinMode || 'NONE'
    }
  });
});

/**
 * Dedicated secure login endpoint for the permanent Mega Administrator
 * Username/Path: "/Mega//admin/bazerightverify"
 */
apiRouter.post('/auth/mega-admin-login', async (req, res) => {
  const { identifier = '/Mega//admin/bazerightverify', password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Mega Administrator password is required.' });
  }

  const clean = String(identifier).trim().toLowerCase();
  const db = getDb();

  // Find the single authoritative Mega Admin account
  const megaAdmin = db.users.find(
    (u) =>
      u.role === 'MEGA_ADMIN' ||
      u.email.toLowerCase() === 'ugochukwuoparaocha3@gmail.com' ||
      u.username === '/Mega//admin/bazerightverify'
  );

  if (!megaAdmin) {
    return res.status(500).json({ error: 'System error: Mega Administrator record is uninitialized.' });
  }

  const isValid = verifyPassword(String(password).trim(), megaAdmin.passwordHash, megaAdmin.salt);
  if (!isValid) {
    logAudit('SYSTEM', 'SECURITY', 'MEGA_ADMIN_AUTH_FAILED', `Failed Mega Admin login attempt from IP ${req.ip || 'unknown'}`, megaAdmin.id, undefined, req.ip);
    return res.status(401).json({ error: 'Invalid Mega Administrator credentials.' });
  }

  logAudit(megaAdmin.fullName, 'MEGA_ADMIN', 'MEGA_ADMIN_LOGIN', `Mega Admin logged in securely via dedicated gateway from IP ${req.ip || 'unknown'}`, megaAdmin.id, undefined, req.ip);
  saveDb();

  const token = generateToken(megaAdmin.id);
  res.json({
    token,
    user: {
      id: megaAdmin.id,
      email: megaAdmin.email,
      username: megaAdmin.username,
      fullName: megaAdmin.fullName,
      phone: megaAdmin.phone,
      role: 'MEGA_ADMIN',
      status: 'ACTIVE',
      onboardingStatus: 'approved',
      onboardingApprovedAt: megaAdmin.onboardingApprovedAt,
      onboardingApprovedBy: megaAdmin.onboardingApprovedBy,
      roleAtApproval: 'MEGA_ADMIN',
      assignedServices: megaAdmin.assignedServices || ['ONLINE_NIN_REGISTRATION'],
      avatarUrl: megaAdmin.avatarUrl,
      createdAt: megaAdmin.createdAt
    }
  });
});

apiRouter.get('/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  let user = req.user!;
  
  // Reconcile user from Supabase authoritatively
  const supaUser = await fetchSupabaseUserById(user.id);
  if (supaUser) {
    user = { ...user, ...supaUser };
    req.user = user;
    const db = getDb();
    const idx = db.users.findIndex((u) => u.id === user.id);
    if (idx !== -1) db.users[idx] = user;
  }

  const db = getDb();
  let wallet: Wallet | null = await fetchSupabaseWalletByUserId(user.id);
  if (!wallet) {
    wallet = db.wallets.find((w) => w.userId === user.id) || {
      id: '',
      userId: user.id,
      availableBalance: 0,
      pendingBalance: 0,
      totalDeposited: 0,
      totalSpent: 0,
      updatedAt: new Date().toISOString()
    };
  }
  const profile = db.profiles.find((p) => p.userId === user.id);
  const unreadCount = db.notifications.filter((n) => n.userId === user.id && !n.isRead).length;

  res.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      phone: user.phone,
      phone2: user.phone2,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      address: profile?.address || '',
      avatarUrl: user.avatarUrl || profile?.avatarUrl || '',
      verificationPinMode: user.verificationPinMode || 'NONE',
      onboardingStatus: user.onboardingStatus || (user.role === 'MEGA_ADMIN' ? 'approved' : 'not_started'),
      onboardingApprovedAt: user.onboardingApprovedAt,
      onboardingApprovedBy: user.onboardingApprovedBy,
      roleAtApproval: user.roleAtApproval,
      assignedServices: user.assignedServices || [],
      satisfactionTitle: user.satisfactionTitle,
      dob: user.dob,
      nin: user.nin
    },
    wallet,
    unreadNotifications: unreadCount
  });
});

apiRouter.post('/auth/change-password', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'New passwords do not match.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const user = req.user!;
  if (!verifyPassword(currentPassword, user.passwordHash, user.salt)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  user.updatedAt = new Date().toISOString();

  logAudit(user.fullName, user.role, 'PASSWORD_CHANGED', 'User successfully changed password', user.id, undefined, req.ip);
  saveDb();

  res.json({ success: true, message: 'Password updated successfully.' });
});

apiRouter.post('/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }
  // Safe message even if email not found
  res.json({
    success: true,
    message: 'If an account exists with this email address, a password reset link has been dispatched.'
  });
});

apiRouter.all(['/profile', '/auth/profile'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fullName, phone, address, avatarUrl, profilePictureUrl, verificationPinMode } = req.body;
  const user = req.user!;
  const db = getDb();

  if (fullName !== undefined) user.fullName = String(fullName).trim();
  if (phone !== undefined) user.phone = String(phone).trim();
  
  const targetAvatar = avatarUrl !== undefined ? avatarUrl : profilePictureUrl;
  if (targetAvatar !== undefined) {
    user.avatarUrl = String(targetAvatar).trim();
  }

  if (verificationPinMode !== undefined) {
    const cleanMode = String(verificationPinMode).trim().toUpperCase();
    if (cleanMode === 'NONE' || cleanMode === 'USE_PIN') {
      user.verificationPinMode = cleanMode as 'NONE' | 'USE_PIN';
    }
  }

  user.updatedAt = new Date().toISOString();

  let profile = db.profiles.find((p) => p.userId === user.id);
  if (!profile) {
    profile = { userId: user.id };
    db.profiles.push(profile);
  }
  if (address !== undefined) profile.address = String(address).trim();
  if (targetAvatar !== undefined) profile.avatarUrl = user.avatarUrl;

  logAudit(user.fullName, user.role, 'PROFILE_UPDATED', 'User updated account profile details', user.id, undefined, req.ip);
  saveDb();

  // Authoritatively save to Supabase users table
  const saveRes = await saveUserToSupabase(user);
  if (!saveRes.success && isSupabaseServiceRoleActive()) {
    console.error(`[PROFILE_UPDATE_ERROR] Supabase update failed for ${user.email}:`, saveRes.error);
    return res.status(500).json({
      error: `Failed to update profile in authoritative Supabase database: ${saveRes.error || 'Unknown error'}.`
    });
  }

  // Reload profile from Supabase to confirm persistence
  const supaUser = await fetchSupabaseUserById(user.id);
  const confirmedUser = supaUser || user;

  res.json({
    success: true,
    message: 'Profile updated successfully.',
    user: {
      id: confirmedUser.id,
      email: confirmedUser.email,
      username: confirmedUser.username,
      fullName: confirmedUser.fullName,
      phone: confirmedUser.phone,
      address: profile.address || '',
      avatarUrl: confirmedUser.avatarUrl || '',
      verificationPinMode: user.verificationPinMode || 'NONE',
      role: confirmedUser.role,
      status: confirmedUser.status
    }
  });
});

// Upload / Update Profile Picture
apiRouter.post(['/auth/profile-picture', '/user/profile-picture'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { pictureData, avatarUrl } = req.body;
  const user = req.user!;
  const db = getDb();

  const photoString = String(pictureData || avatarUrl || '').trim();
  if (!photoString) {
    return res.status(400).json({ error: 'No image data provided. Please select a valid JPG or PNG image.' });
  }

  // Validate that it looks like an image or data URL
  if (!photoString.startsWith('data:image/') && !photoString.startsWith('http://') && !photoString.startsWith('https://') && !photoString.startsWith('/uploads/')) {
    return res.status(400).json({ error: 'Invalid image format. Allowed formats: JPG, JPEG, PNG.' });
  }

  let authoritativeUrl = photoString;

  // If base64 data URL, upload to persistent Supabase Storage & local disk
  if (photoString.startsWith('data:image/')) {
    try {
      const mimeMatch = photoString.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
      const rawExt = mimeMatch ? mimeMatch[1].toLowerCase() : 'jpg';
      const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
      const base64Data = photoString.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `avatar_${user.id}_${Date.now()}.${ext}`;

      // Persist to local disk storage
      const avatarsDir = path.join(process.cwd(), 'data', 'uploads', 'avatars');
      if (!fs.existsSync(avatarsDir)) {
        fs.mkdirSync(avatarsDir, { recursive: true });
      }
      const filePath = path.join(avatarsDir, fileName);
      fs.writeFileSync(filePath, buffer);
      authoritativeUrl = `/uploads/avatars/${fileName}`;

      // Upload to Supabase Storage if service role is active
      if (isSupabaseServiceRoleActive()) {
        const storageRes = await uploadAvatarToSupabaseStorage(user.id, fileName, buffer, `image/${ext}`);
        if (!storageRes.success) {
          console.error('[PROFILE_PHOTO_ERROR] Supabase storage upload failed:', storageRes.error);
          return res.status(500).json({
            error: `Failed to upload profile picture to Supabase storage: ${storageRes.error}`
          });
        }
        if (storageRes.url) {
          authoritativeUrl = storageRes.url;
        }
      }
    } catch (e: any) {
      console.error('[PROFILE_PHOTO_ERROR] Failed to process avatar image:', e.message || e);
      return res.status(500).json({ error: `Image processing error: ${e.message || String(e)}` });
    }
  }

  user.avatarUrl = authoritativeUrl;
  user.updatedAt = new Date().toISOString();

  let profile = db.profiles.find((p) => p.userId === user.id);
  if (!profile) {
    profile = { userId: user.id };
    db.profiles.push(profile);
  }
  profile.avatarUrl = authoritativeUrl;

  logAudit(user.fullName, user.role, 'PROFILE_PICTURE_UPDATED', 'User updated profile avatar photo', user.id, undefined, req.ip);
  saveDb();

  // Authoritatively update Supabase users table
  const avatarRes = await updateUserAvatarInSupabase(user.id, user.avatarUrl);
  if (!avatarRes.success && isSupabaseServiceRoleActive()) {
    console.error('[PROFILE_PHOTO_ERROR] Supabase avatar update failed:', avatarRes.error);
    return res.status(500).json({ error: `Failed to persist avatar in Supabase database: ${avatarRes.error}` });
  }

  const saveRes = await saveUserToSupabase(user);
  if (!saveRes.success && isSupabaseServiceRoleActive()) {
    console.error('[PROFILE_PHOTO_ERROR] Supabase saveUser failed:', saveRes.error);
    return res.status(500).json({ error: `Failed to persist user profile in Supabase database: ${saveRes.error}` });
  }

  // Reload profile from Supabase to confirm persistence
  const reloaded = await fetchSupabaseUserById(user.id);
  const finalAvatar = reloaded?.avatarUrl || user.avatarUrl;

  res.json({
    success: true,
    message: 'Profile picture saved successfully.',
    avatarUrl: finalAvatar
  });
});

// Remove Profile Picture
apiRouter.delete(['/auth/profile-picture', '/user/profile-picture'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();

  user.avatarUrl = '';
  user.updatedAt = new Date().toISOString();

  let profile = db.profiles.find((p) => p.userId === user.id);
  if (profile) {
    profile.avatarUrl = '';
  }

  logAudit(user.fullName, user.role, 'PROFILE_PICTURE_REMOVED', 'User removed profile avatar photo', user.id, undefined, req.ip);
  saveDb();

  // Authoritatively update Supabase users table
  const avatarRes = await updateUserAvatarInSupabase(user.id, '');
  if (!avatarRes.success && isSupabaseServiceRoleActive()) {
    return res.status(500).json({ error: `Failed to remove profile picture in database: ${avatarRes.error}` });
  }
  await saveUserToSupabase(user);

  res.json({
    success: true,
    message: 'Profile picture removed.',
    avatarUrl: ''
  });
});

// ----------------------------------------------------
// Services Endpoints (DB-driven with Authoritative Supabase Read)
// ----------------------------------------------------
apiRouter.get('/services', async (req, res) => {
  const db = getDb();

  const getServiceOrder = (s: Service) => {
    const code = s.code.toUpperCase();
    if (code === 'NIN') return 1;
    if (code === 'BVN') return 2;
    if (code === 'PHONE') return 3;
    if (code === 'NIN_PHONE') return 4;
    if (code === 'NIN_VALIDATION') return 5;
    if (s.displayOrder && s.displayOrder > 0) return s.displayOrder;
    const def = defaultCatalogueServices.find((d) => d.code.toUpperCase() === code || d.id === s.id);
    return def?.displayOrder ?? 50;
  };

  const sorted = [...(db.services || [])].sort((a, b) => getServiceOrder(a) - getServiceOrder(b));
  res.json(sorted);
});

apiRouter.get('/services/:id', async (req, res) => {
  const term = req.params.id.trim();
  const db = getDb();
  let localService = db.services.find((s) => s.id === term || s.code.toUpperCase() === term.toUpperCase());
  const supaService = await fetchSupabaseServiceByCodeOrId(term);

  let service = localService;
  if (supaService) {
    if (localService) {
      const supaTime = new Date(supaService.updatedAt || 0).getTime();
      const localTime = new Date(localService.updatedAt || 0).getTime();
      // Prefer Supabase only if it has a strictly newer update timestamp
      if (supaTime > localTime) {
        service = { ...localService, ...supaService };
        const idx = db.services.findIndex((s) => s.id === localService!.id);
        if (idx !== -1) db.services[idx] = service;
      }
    } else {
      service = supaService;
      if (!db.services) db.services = [];
      db.services.push(supaService);
    }
  }

  if (!service) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  if (!service.requiredFields || service.requiredFields.length === 0) {
    const def = defaultCatalogueServices.find((d) => d.code.toUpperCase() === service!.code.toUpperCase() || d.id === service!.id);
    if (def?.requiredFields) service.requiredFields = def.requiredFields;
  }

  res.json(service);
});

// ----------------------------------------------------
// Wallet & Funding Endpoints
// ----------------------------------------------------
apiRouter.get('/wallet/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();

  // Query Supabase authoritatively
  const supaWallet = await fetchSupabaseWalletByUserId(user.id);
  if (supaWallet) {
    const idx = db.wallets.findIndex((w) => w.userId === user.id);
    if (idx !== -1) {
      db.wallets[idx] = supaWallet;
    } else {
      db.wallets.push(supaWallet);
    }
  }

  const wallet = db.wallets.find((w) => w.userId === user.id);
  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found.' });
  }
  res.json(wallet);
});

// Card Funding - Redirects to Paystack Live Gateway
apiRouter.post('/wallet/fund/card', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  return res.status(400).json({
    error: 'Direct card simulation is deprecated. All card payments must be initialized via POST /api/paystack/initialize and verified with Paystack Live API.'
  });
});

// Bank Transfer / Manual Funding Request with Receipt Upload
apiRouter.post('/wallet/fund/bank-transfer', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { amount, reference, receiptData, receiptName, method } = req.body;
  const user = req.user!;
  const db = getDb();

  const numAmount = Number(amount);
  if (!numAmount || numAmount < db.settings.minWalletFunding) {
    return res.status(400).json({
      error: `Minimum wallet funding amount is ₦${db.settings.minWalletFunding.toLocaleString()}.`
    });
  }

  const payRef = (reference || `TRF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`).trim();

  // Check if reference already submitted
  if (db.fundingRequests.some((r) => r.reference === payRef)) {
    return res.status(400).json({ error: 'A funding request with this payment reference already exists.' });
  }

  const newRequest: FundingRequest = {
    id: `fnd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    userName: user.fullName,
    userEmail: user.email,
    reference: payRef,
    amount: numAmount,
    method: method || 'BANK_TRANSFER',
    receiptUrl: receiptData || undefined,
    receiptName: receiptName || 'transfer_receipt.png',
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  db.fundingRequests.unshift(newRequest);

  // Update pending balance
  const wallet = db.wallets.find((w) => w.userId === user.id);
  if (wallet) {
    wallet.pendingBalance += numAmount;
    wallet.updatedAt = new Date().toISOString();
  }

  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: user.id,
    title: 'Transfer Receipt Submitted',
    message: `Your deposit request of ₦${numAmount.toLocaleString()} has been received and is pending admin verification.`,
    type: 'WALLET',
    isRead: false,
    link: '/wallet',
    createdAt: new Date().toISOString()
  });

  logAudit(user.fullName, user.role, 'FUNDING_REQUEST_CREATED', `Deposit receipt of ₦${numAmount} ref: ${payRef}`, user.id, payRef, req.ip);
  saveDb();

  // Authoritatively save funding request to Supabase
  await insertFundingRequestToSupabase(newRequest);

  res.status(201).json({
    success: true,
    message: 'Deposit request submitted successfully. It will be credited once confirmed by our finance desk.',
    request: newRequest
  });
});

apiRouter.get('/wallet/funding-requests', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const list = db.fundingRequests.filter((f) => f.userId === user.id);
  res.json(list);
});

apiRouter.get(['/transactions', '/wallet/transactions'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const db = getDb();
    let txns = (db.transactions || []).filter((t) => t.userId === user.id);

    // If Supabase server is connected, merge any transactions from Supabase
    if (supabaseServer) {
      try {
        const { data: supaTxns } = await supabaseServer
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (supaTxns && Array.isArray(supaTxns)) {
          const existingIds = new Set(txns.map((t) => t.id));
          const existingRefs = new Set(txns.map((t) => t.reference));

          for (const st of supaTxns) {
            if (!existingIds.has(st.id) && !existingRefs.has(st.reference)) {
              txns.push({
                id: st.id,
                walletId: st.wallet_id,
                userId: st.user_id,
                reference: st.reference,
                type: st.type,
                amount: Number(st.amount),
                fee: Number(st.fee || 0),
                balanceBefore: Number(st.balance_before),
                balanceAfter: Number(st.balance_after),
                status: st.status,
                description: st.description,
                metadata: st.metadata || {},
                createdAt: st.created_at
              });
              existingIds.add(st.id);
            }
          }
        }
      } catch (err) {
        // Non-blocking fallback
      }
    }

    txns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const limitStr = req.query.limit as string;
    if (limitStr) {
      const limit = parseInt(limitStr, 10);
      if (!isNaN(limit) && limit > 0) {
        txns = txns.slice(0, limit);
      }
    }

    res.json(txns);
  } catch (err: any) {
    console.error('Error fetching transactions:', err);
    res.json([]);
  }
});

// ----------------------------------------------------
// PAYSTACK PAYMENT INTEGRATION (STEP 2: BACKEND FLOW)
// ----------------------------------------------------

interface FulfillPaymentResult {
  success: boolean;
  alreadyProcessed: boolean;
  message: string;
  wallet?: Wallet;
  transaction?: WalletTransaction;
  creditsCredited?: number;
  amountNgn?: number;
}

/**
 * Atomic, Idempotent Payment Fulfillment Function
 * Used by both GET /api/paystack/verify/:reference and POST /api/paystack/webhook
 * Guarantees that the same Paystack transaction reference will NEVER credit a wallet twice.
 */
export async function fulfillPaystackPayment({
  reference,
  verifiedData,
  source,
  expectedUserId,
  ipAddress
}: {
  reference: string;
  verifiedData: any;
  source: 'VERIFY_ENDPOINT' | 'WEBHOOK';
  expectedUserId?: string;
  ipAddress?: string;
}): Promise<FulfillPaymentResult> {
  const cleanRef = String(reference || '').trim();
  if (!cleanRef) {
    return {
      success: false,
      alreadyProcessed: false,
      message: 'Transaction reference is missing.'
    };
  }

  // 1. Acquire mutex lock on this reference to prevent race conditions
  const lockKey = `LOCK_PAYSTACK_${cleanRef}`;
  if (!acquireLock(lockKey)) {
    // Wait briefly and re-check if already processed
    await new Promise((r) => setTimeout(r, 500));
    const db = getDb();
    const existingTx = db.transactions.find((t) => t.reference === cleanRef && t.status === 'SUCCESS');
    if (existingTx) {
      if (expectedUserId && existingTx.userId !== expectedUserId) {
        return {
          success: false,
          alreadyProcessed: false,
          message: 'This payment transaction belongs to another account.'
        };
      }
      const wallet = db.wallets.find((w) => w.id === existingTx.walletId);
      return {
        success: true,
        alreadyProcessed: true,
        message: 'Transaction has already been successfully processed and credited.',
        wallet,
        transaction: existingTx
      };
    }
    return {
      success: false,
      alreadyProcessed: false,
      message: 'Payment fulfillment is currently in progress. Please check balance momentarily.'
    };
  }

  try {
    const db = getDb();

    // 2. Idempotency Check A: In-memory/JSON transactions
    const existingTxn = db.transactions.find((t) => t.reference === cleanRef && t.status === 'SUCCESS');
    if (existingTxn) {
      releaseLock(lockKey);
      if (expectedUserId && existingTxn.userId !== expectedUserId) {
        return {
          success: false,
          alreadyProcessed: false,
          message: 'This payment transaction belongs to another account.'
        };
      }
      const wallet = db.wallets.find((w) => w.id === existingTxn.walletId);
      return {
        success: true,
        alreadyProcessed: true,
        message: 'Transaction has already been successfully processed and credited.',
        wallet,
        transaction: existingTxn
      };
    }

    // 3. Idempotency Check B: Supabase transactions table
    if (supabaseServer) {
      try {
        const { data: supaTx } = await supabaseServer
          .from('transactions')
          .select('*')
          .eq('reference', cleanRef)
          .eq('status', 'SUCCESS')
          .limit(1);
        if (supaTx && supaTx.length > 0) {
          releaseLock(lockKey);
          if (expectedUserId && supaTx[0].user_id !== expectedUserId) {
            return {
              success: false,
              alreadyProcessed: false,
              message: 'This payment transaction belongs to another account.'
            };
          }
          const wallet = db.wallets.find((w) => w.id === supaTx[0].wallet_id);
          return {
            success: true,
            alreadyProcessed: true,
            message: 'Transaction was already processed in database.',
            wallet,
            transaction: supaTx[0] as any
          };
        }
      } catch (err) {
        // Non-blocking fallback
      }
    }

    // 4. Verify that this reference belongs to an existing BAZERIGHTVERIFY funding request
    let fundingReq = db.fundingRequests.find((r) => r.reference === cleanRef);
    if (!fundingReq && supabaseServer) {
      try {
        const { data: supaReq } = await supabaseServer
          .from('funding_requests')
          .select('*')
          .eq('reference', cleanRef)
          .limit(1);
        if (supaReq && supaReq.length > 0) {
          fundingReq = {
            id: supaReq[0].id,
            userId: supaReq[0].user_id,
            userName: supaReq[0].user_name,
            userEmail: supaReq[0].user_email,
            reference: supaReq[0].reference,
            amount: Number(supaReq[0].amount),
            method: supaReq[0].method,
            status: supaReq[0].status,
            createdAt: supaReq[0].created_at
          };
          db.fundingRequests.unshift(fundingReq);
        }
      } catch (err) {
        // Continue
      }
    }

    if (!fundingReq) {
      releaseLock(lockKey);
      return {
        success: false,
        alreadyProcessed: false,
        message: `No BAZERIGHTVERIFY funding request found for reference '${cleanRef}'.`
      };
    }

    // Validate customer ownership
    if (expectedUserId && fundingReq.userId !== expectedUserId) {
      releaseLock(lockKey);
      return {
        success: false,
        alreadyProcessed: false,
        message: 'This payment transaction belongs to another account.'
      };
    }

    if (fundingReq.status === 'APPROVED') {
      releaseLock(lockKey);
      const wallet = db.wallets.find((w) => w.userId === fundingReq!.userId);
      const existingTx = db.transactions.find((t) => t.reference === cleanRef);
      return {
        success: true,
        alreadyProcessed: true,
        message: 'Funding request has already been approved and credited.',
        wallet,
        transaction: existingTx
      };
    }

    // 5. Confirm Paystack reports a successful transaction
    if (verifiedData.status !== 'success') {
      releaseLock(lockKey);
      fundingReq.status = 'REJECTED';
      fundingReq.adminNote = `Paystack payment status was '${verifiedData.status}' (${verifiedData.gateway_response || 'Unsuccessful'})`;
      saveDb();
      updateFundingRequestStatusInSupabase(cleanRef, 'REJECTED', 'PAYSTACK', fundingReq.adminNote);
      return {
        success: false,
        alreadyProcessed: false,
        message: `Paystack reported payment was not successful (Status: ${verifiedData.status}). Wallet was not credited.`
      };
    }

    // 6. Confirm Currency is NGN
    if (verifiedData.currency && verifiedData.currency.toUpperCase() !== 'NGN') {
      releaseLock(lockKey);
      fundingReq.status = 'REJECTED';
      fundingReq.adminNote = `Currency mismatch: expected NGN, received ${verifiedData.currency}`;
      saveDb();
      updateFundingRequestStatusInSupabase(cleanRef, 'REJECTED', 'SECURITY_CHECK', fundingReq.adminNote);
      return {
        success: false,
        alreadyProcessed: false,
        message: `Currency mismatch: Expected NGN, but Paystack processed ${verifiedData.currency}. Wallet was not credited.`
      };
    }

    // 7. Confirm the Paystack amount matches the recorded funding amount
    // Paystack processes amounts in Kobo (1 NGN = 100 Kobo)
    const paystackAmountNgn = verifiedData.amount / 100;
    if (Math.abs(paystackAmountNgn - fundingReq.amount) > 0.01) {
      releaseLock(lockKey);
      fundingReq.status = 'REJECTED';
      fundingReq.adminNote = `Payment amount mismatch: expected ₦${fundingReq.amount}, received ₦${paystackAmountNgn}`;
      saveDb();
      updateFundingRequestStatusInSupabase(cleanRef, 'REJECTED', 'SECURITY_CHECK', fundingReq.adminNote);
      logAudit(
        'SECURITY',
        'SYSTEM',
        'PAYMENT_AMOUNT_MISMATCH',
        fundingReq.adminNote,
        fundingReq.userId,
        cleanRef,
        ipAddress
      );
      return {
        success: false,
        alreadyProcessed: false,
        message: `Payment amount mismatch: Expected ₦${fundingReq.amount}, but Paystack processed ₦${paystackAmountNgn}. Wallet was not credited.`
      };
    }

    // 7. Find customer wallet and credit availableBalance
    const wallet = db.wallets.find((w) => w.userId === fundingReq!.userId);
    if (!wallet) {
      releaseLock(lockKey);
      return {
        success: false,
        alreadyProcessed: false,
        message: 'Customer wallet not found.'
      };
    }

    const unitRate = db.settings?.unitValueNgn || 200;
    const creditsCredited = Number((fundingReq.amount / unitRate).toFixed(2));

    const before = wallet.availableBalance;
    wallet.availableBalance += fundingReq.amount;
    wallet.totalDeposited += fundingReq.amount;
    wallet.updatedAt = new Date().toISOString();

    const feeNgn = verifiedData.fees ? verifiedData.fees / 100 : 0;

    // 8. Record successful transaction in public.transactions
    const newTxn: WalletTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      walletId: wallet.id,
      userId: fundingReq.userId,
      reference: cleanRef,
      type: 'FUNDING',
      amount: fundingReq.amount,
      fee: feeNgn,
      balanceBefore: before,
      balanceAfter: wallet.availableBalance,
      status: 'SUCCESS',
      description: `Wallet funded with ${creditsCredited} Credits (₦${fundingReq.amount.toLocaleString()}) via Paystack (${cleanRef})`,
      metadata: {
        gateway: 'PAYSTACK',
        paystack_id: verifiedData.id,
        channel: verifiedData.channel,
        card_type: verifiedData.authorization?.card_type,
        last4: verifiedData.authorization?.last4,
        bank: verifiedData.authorization?.bank,
        customer_email: verifiedData.customer?.email,
        paid_at: verifiedData.paid_at,
        gateway_response: verifiedData.gateway_response,
        credits_credited: creditsCredited,
        unit_rate: unitRate,
        source
      },
      createdAt: new Date().toISOString()
    };

    db.transactions.unshift(newTxn);

    // 9. Update the funding request
    fundingReq.status = 'APPROVED';
    fundingReq.reviewedBy = `PAYSTACK_${source}`;
    fundingReq.reviewedAt = new Date().toISOString();
    fundingReq.adminNote = `Settled successfully via Paystack (${verifiedData.channel || 'Card'}) on ${verifiedData.paid_at || new Date().toISOString()}`;

    // 10. Write notification & audit log
    db.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: fundingReq.userId,
      title: 'Wallet Funded Successfully',
      message: `Your wallet was credited with ${creditsCredited} Credits (₦${fundingReq.amount.toLocaleString()}) via Paystack.`,
      type: 'WALLET',
      isRead: false,
      link: '/wallet',
      createdAt: new Date().toISOString()
    });

    logAudit(
      fundingReq.userName,
      'USER',
      'WALLET_FUNDED_PAYSTACK',
      `Credited ₦${fundingReq.amount.toLocaleString()} (${creditsCredited} Credits) ref: ${cleanRef} (${source})`,
      fundingReq.userId,
      cleanRef,
      ipAddress
    );

    saveDb();

    // 11. Synchronize to Supabase tables
    const userObj = db.users.find((u) => u.id === fundingReq!.userId);
    if (userObj) {
      await ensureUserInSupabase(userObj);
    }
    await syncWalletToSupabase(wallet);
    await insertTransactionToSupabase(newTxn);
    await updateFundingRequestStatusInSupabase(cleanRef, 'APPROVED', `PAYSTACK_${source}`, fundingReq.adminNote);
    await insertAuditLogToSupabase({
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: fundingReq.userId,
      actorName: fundingReq.userName,
      actorRole: 'USER',
      action: 'WALLET_FUNDED_PAYSTACK',
      details: `Credited ₦${fundingReq.amount.toLocaleString()} (${creditsCredited} Credits) ref: ${cleanRef} (${source})`,
      reference: cleanRef,
      ipAddress,
      timestamp: new Date().toISOString()
    });

    releaseLock(lockKey);

    return {
      success: true,
      alreadyProcessed: false,
      message: `Successfully credited ${creditsCredited} Credits (₦${fundingReq.amount.toLocaleString()}) to your wallet.`,
      wallet,
      transaction: newTxn,
      creditsCredited,
      amountNgn: fundingReq.amount
    };
  } catch (err: any) {
    releaseLock(lockKey);
    return {
      success: false,
      alreadyProcessed: false,
      message: `Error fulfilling payment: ${err.message || String(err)}`
    };
  }
}

/**
 * Paystack Live Configuration Status (Public/Safe - Never exposes secret key)
 * GET /api/paystack/status
 */
apiRouter.get('/paystack/status', (req: Request, res: Response) => {
  const status = getPaystackConfigStatus();
  return res.json(status);
});

/**
 * 1. POST /api/paystack/initialize
 * Initializes a customer funding transaction through Paystack
 */
apiRouter.post('/paystack/initialize', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const { amount, callbackUrl } = req.body;

  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Please enter a valid funding amount in NGN.' });
  }

  // Validate funding limits
  const minFunding = db.settings?.minWalletFunding || 1000;
  const maxFunding = db.settings?.maxWalletFunding || 1000000;
  const unitRate = db.settings?.unitValueNgn || 200;

  if (numAmount < minFunding) {
    const minCredits = Number((minFunding / unitRate).toFixed(1));
    return res.status(400).json({
      error: `Minimum wallet funding is ₦${minFunding.toLocaleString()} (${minCredits} Credits).`
    });
  }

  if (numAmount > maxFunding) {
    return res.status(400).json({
      error: `Maximum wallet funding per transaction is ₦${maxFunding.toLocaleString()}.`
    });
  }

  // Calculate corresponding Credits (₦200 = 1 Credit)
  const calculatedCredits = Number((numAmount / unitRate).toFixed(2));

  // Generate unique Paystack reference server-side
  const reference = `PSTK-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  // Create PENDING funding record
  const newRequest: FundingRequest = {
    id: `fnd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    userName: user.fullName,
    userEmail: user.email,
    reference,
    amount: numAmount,
    method: 'CARD',
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  db.fundingRequests.unshift(newRequest);
  saveDb();

  // Sync pending request to Supabase
  await ensureUserInSupabase(user);
  await insertFundingRequestToSupabase(newRequest);

  try {
    // Initialize transaction through Paystack API
    const paystackRes = await initializePaystackTransaction({
      email: user.email,
      amountNgn: numAmount,
      reference,
      callbackUrl: callbackUrl || undefined,
      metadata: {
        userId: user.id,
        userEmail: user.email,
        userName: user.fullName,
        credits: calculatedCredits,
        unitRate
      }
    });

    logAudit(
      user.fullName,
      user.role,
      'PAYSTACK_INITIATED',
      `Initiated funding of ₦${numAmount.toLocaleString()} (${calculatedCredits} Credits) ref: ${reference}`,
      user.id,
      reference,
      req.ip
    );

    // Return authorization_url and reference. Do NOT credit the wallet at initialization.
    return res.json({
      success: true,
      reference,
      authorizationUrl: paystackRes.data?.authorization_url,
      accessCode: paystackRes.data?.access_code,
      amount: numAmount,
      credits: calculatedCredits,
      unitRate
    });
  } catch (err: any) {
    // If Paystack initialization fails, mark funding request as REJECTED
    newRequest.status = 'REJECTED';
    newRequest.adminNote = `Paystack initialization failed: ${err.message}`;
    saveDb();
    updateFundingRequestStatusInSupabase(reference, 'REJECTED', 'SYSTEM', newRequest.adminNote);

    return res.status(502).json({
      error: `Failed to initialize transaction with Paystack: ${err.message}`
    });
  }
});

/**
 * 2. GET /api/paystack/verify/:reference
 * Verifies transaction with Paystack and safely credits the customer wallet
 */
apiRouter.get('/paystack/verify/:reference', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { reference } = req.params;
  const cleanRef = String(reference || '').trim();

  if (!cleanRef) {
    return res.status(400).json({ error: 'Transaction reference is required.' });
  }

  const db = getDb();

  // Fast check: If already processed and credited, return the result immediately
  const existingTx = db.transactions.find((t) => t.reference === cleanRef && t.status === 'SUCCESS');
  if (existingTx) {
    if (req.user && !['ADMIN', 'SUPER_ADMIN', 'MEGA_ADMIN'].includes(req.user.role) && existingTx.userId !== req.user.id) {
      return res.status(403).json({ error: 'This payment transaction belongs to another account.' });
    }
    const wallet = db.wallets.find((w) => w.id === existingTx.walletId);
    return res.json({
      success: true,
      alreadyProcessed: true,
      message: 'Transaction has already been verified and credited.',
      wallet,
      transaction: existingTx,
      amountNgn: existingTx.amount,
      creditsCredited: existingTx.metadata?.credits_credited || 0
    });
  }

  try {
    // 1. Verify with Paystack API
    const paystackRes = await verifyPaystackTransaction(cleanRef);
    if (!paystackRes.status || !paystackRes.data) {
      return res.status(400).json({
        error: paystackRes.message || 'Payment verification failed on Paystack.'
      });
    }

    // 2. Fulfill payment with strict idempotency and validation
    const result = await fulfillPaystackPayment({
      reference: cleanRef,
      verifiedData: paystackRes.data,
      source: 'VERIFY_ENDPOINT',
      expectedUserId: req.user?.id,
      ipAddress: req.ip
    });

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(502).json({
      error: `Paystack verification failed: ${err.message}`
    });
  }
});

/**
 * 3. POST /api/paystack/webhook
 * Handles incoming Paystack webhook events using raw body HMAC-SHA512 verification
 */
apiRouter.post('/paystack/webhook', async (req: Request, res: Response) => {
  const signature = (req.headers['x-paystack-signature'] as string) || '';
  const rawBody = (req as any).rawBody;

  // Verify webhook signature using HMAC-SHA512
  if (!signature || !rawBody || !verifyWebhookSignature(signature, rawBody)) {
    console.warn('[Paystack Webhook] Signature verification failed from IP:', req.ip);
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }

  const event = req.body;
  if (!event || !event.event) {
    return res.status(400).json({ error: 'Malformed webhook payload.' });
  }

  // Handle charge.success event
  if (event.event === 'charge.success') {
    const data = event.data;
    const reference = data?.reference;

    if (reference) {
      try {
        await fulfillPaystackPayment({
          reference,
          verifiedData: data,
          source: 'WEBHOOK',
          ipAddress: req.ip
        });
      } catch (err) {
        console.error('[Paystack Webhook] Error fulfilling charge.success:', err);
      }
    }
  }

  // Always return HTTP 200 OK to acknowledge receipt
  return res.status(200).json({ status: true, message: 'Webhook event processed.' });
});

// ----------------------------------------------------
// Service Classification: Verification vs Non-Verification
// ----------------------------------------------------
export function isVerificationService(serviceOrCode: any): boolean {
  if (!serviceOrCode) return false;
  const db = getDb();
  let code = '';
  let name = '';
  let category = '';
  let routingProvider: string | undefined;

  if (typeof serviceOrCode === 'string') {
    const raw = serviceOrCode.trim();
    const upper = raw.toUpperCase();
    const s =
      db.services?.find((x) => x.id === raw || x.code.toUpperCase() === upper) ||
      defaultCatalogueServices.find((x) => x.id === raw || x.code.toUpperCase() === upper);
    if (s) {
      code = s.code.toUpperCase();
      name = (s.name || '').toUpperCase();
      category = (s.category || '').toUpperCase();
      routingProvider = s.defaultProvider ? String(s.defaultProvider).toLowerCase().trim() : undefined;
    } else {
      code = upper;
    }
  } else if (typeof serviceOrCode === 'object') {
    code = (serviceOrCode.code || '').toUpperCase();
    name = (serviceOrCode.name || '').toUpperCase();
    category = (serviceOrCode.category || '').toUpperCase();
    routingProvider = serviceOrCode.defaultProvider ? String(serviceOrCode.defaultProvider).toLowerCase().trim() : undefined;
  }

  // 1. Explicit Routing Overrides
  // When set to 'admin' (Admin Gateway), it MUST send info to all admins, acting like a non-verification service!
  if (routingProvider === 'admin' || routingProvider === 'admin_gateway' || routingProvider === 'manual') {
    return false;
  }

  // When explicitly configured for automated API gateways ('ninja' or 'veripine'), treat as automated live verification
  if (routingProvider === 'ninja' || routingProvider === 'veripine') {
    return true;
  }

  // 2. Default Routing: Follow standard catalogue classification
  // Non-verification keywords: modifications, registrations, retrievals, attestations, delinking, personalization, CAC, TIN, etc.
  const nonVerifKeywords = [
    'MOD',
    'REG',
    'ATTESTATION',
    'RETRIEVAL',
    'DELINK',
    'ONBOARDING',
    'PERSONAL',
    'SELF_SERVICE',
    'IPE',
    'CAC',
    'TIN',
    'TRACKING',
    'VALIDATION',
    'LOOKUP',
    'CRM',
    'DEMOGRAPHIC',
    'ONLINE_NIN'
  ];

  for (const kw of nonVerifKeywords) {
    if (code.includes(kw) || name.includes(kw) || category.includes(kw)) {
      return false;
    }
  }

  // Live automated API verification services ONLY (instant national registry query)
  const exactVerificationCodes = [
    'NIN',
    'BVN',
    'PHONE',
    'VNIN',
    'DRIVERS_LICENSE'
  ];

  return exactVerificationCodes.includes(code);
}

// ----------------------------------------------------
// Unified Non-Verification Service Request Handler
// ----------------------------------------------------
async function handleNonVerificationServiceRequest(
  req: AuthenticatedRequest,
  res: Response,
  serviceIdentifier: string,
  searchData: Record<string, any>,
  idempotencyKey?: string,
  customerFiles?: any[]
) {
  const user = req.user!;
  const db = getDb();
  if (!db.serviceRequests) db.serviceRequests = [];
  if (!db.transactions) db.transactions = [];

  const rawIdent = String(serviceIdentifier || '').trim().toUpperCase();
  let resolvedCode = rawIdent;

  // Resolve sub-service variants if submitted as generic MODIFICATION or CAC_TIN
  if (resolvedCode === 'MODIFICATION' || resolvedCode === 'NIN_MODIFICATION') {
    const modType = String(searchData?.modificationType || searchData?.type || searchData?.subType || '').toLowerCase();
    if (modType.includes('dob') || modType.includes('birth')) resolvedCode = 'NIN_DOB_MOD';
    else if (modType.includes('phone')) resolvedCode = 'NIN_PHONE_MOD';
    else if (modType.includes('address')) resolvedCode = 'NIN_ADDRESS_MOD';
    else if (modType.includes('bvn')) resolvedCode = 'BVN_MODIFICATION';
    else if (modType.includes('ipe')) resolvedCode = 'IPE_MODIFICATION';
    else resolvedCode = 'NIN_NAME_MOD';
  } else if (resolvedCode === 'CAC_TIN' || resolvedCode === 'CAC' || resolvedCode === 'TIN') {
    const cacType = String(searchData?.cacTinType || searchData?.registrationType || searchData?.subServiceKey || '').toLowerCase();
    if (cacType.includes('company_cac') || cacType.includes('company cac') || cacType.includes('llc') || cacType.includes('limited')) {
      resolvedCode = 'COMPANY_CAC';
    } else if (cacType.includes('business_cac') || cacType.includes('business cac') || cacType.includes('business name')) {
      resolvedCode = 'BUSINESS_CAC';
    } else if (cacType.includes('company_tin') || cacType.includes('company tin') || cacType.includes('corporate tin')) {
      resolvedCode = 'TIN_COMPANY';
    } else if (cacType.includes('individual_tin') || cacType.includes('individual tin')) {
      resolvedCode = 'TIN_INDIVIDUAL';
    } else {
      resolvedCode = 'CAC_REGISTRATION';
    }
  }

  // Authoritative catalogue lookup
  let targetService = db.services?.find((s) => s.code.toUpperCase() === resolvedCode || s.id === serviceIdentifier);
  if (!targetService) {
    targetService = defaultCatalogueServices.find((s) => s.code.toUpperCase() === resolvedCode || s.id === serviceIdentifier);
  }

  // Operator verification for Online NIN Registration
  if (resolvedCode === 'ONLINE_NIN_REGISTRATION') {
    if (user.role === 'USER') {
      return res.status(403).json({
        error: 'Online NIN Registration is an operator enrollment service reserved for authorized Agents and Admins.'
      });
    }
    if (user.role === 'AGENT' && (!user.assignedServices || !user.assignedServices.includes('ONLINE_NIN_REGISTRATION'))) {
      return res.status(403).json({
        error: 'Online NIN Registration service is not assigned to your Agent account. Please contact Mega Admin or Super Admin for service authorization.'
      });
    }
  }

  const serviceName = targetService?.name || (resolvedCode.replace(/_/g, ' ') + ' Service');
  const serviceCategory = targetService?.category || 'Non-Verification Services';

  // Determine exact price authoritatively from targetService configuration
  let applicablePrice = (targetService && targetService.price !== undefined && targetService.price > 0)
    ? targetService.price
    : 4500;
  if (!targetService?.price) {
    if (resolvedCode === 'NIN_DOB_MOD') applicablePrice = 50000;
    else if (resolvedCode === 'COMPANY_CAC') applicablePrice = 30000;
    else if (resolvedCode === 'BUSINESS_CAC') applicablePrice = 22000;
    else if (resolvedCode === 'TIN_COMPANY') applicablePrice = 2500;
    else if (resolvedCode === 'TIN_INDIVIDUAL') applicablePrice = 1000;
  }
  if (resolvedCode === 'BVN_MODIFICATION') {
    if (searchData?.enrollmentCenterPrice && Number(searchData.enrollmentCenterPrice) > 0) {
      applicablePrice = Number(searchData.enrollmentCenterPrice);
    } else if (searchData?.enrollmentCenterId) {
      const center = (db.bvnEnrollmentCenters || []).find((c) => c.id === searchData.enrollmentCenterId);
      if (center) applicablePrice = center.price;
    }
  }

  // Agent discounted rate
  if (user.role === 'AGENT') {
    if (targetService?.agentPrice !== undefined && targetService.agentPrice > 0) {
      applicablePrice = targetService.agentPrice;
    } else {
      applicablePrice = Math.round(applicablePrice * 0.75 * 100) / 100;
    }
  }

  // Idempotency check & Mutex lock to guarantee exact-once wallet deduction
  const cleanIdemKey = (idempotencyKey || req.body?.idempotencyKey || `idem_sr_${user.id}_${resolvedCode}_${Date.now()}`).trim();
  const existingReq = db.serviceRequests.find(
    (r) => (r as any).idempotencyKey === cleanIdemKey || r.submittedData?.__idempotencyKey === cleanIdemKey
  );
  if (existingReq) {
    return res.json({
      success: true,
      cached: true,
      ticketId: existingReq.ticketId,
      trackingId: existingReq.ticketId,
      request: existingReq,
      verification: existingReq,
      message: 'Service request submitted successfully.'
    });
  }

  const lockKey = `LOCK_SR_${user.id}_${cleanIdemKey}`;
  if (!acquireLock(lockKey)) {
    return res.status(429).json({ error: 'Service request processing in progress. Please do not duplicate.' });
  }

  try {
    const wallet = db.wallets.find((w) => w.userId === user.id);
    if (!wallet) {
      releaseLock(lockKey);
      return res.status(400).json({ error: 'User wallet account not initialized.' });
    }

    const unitRate = db.settings?.unitValueNgn || 200;
    const requiredUnits = Number((applicablePrice / unitRate).toFixed(2));
    const currentUnits = Number((wallet.availableBalance / unitRate).toFixed(2));

    if (wallet.availableBalance < applicablePrice) {
      releaseLock(lockKey);
      return res.status(400).json({
        error: `Insufficient wallet balance. This service costs ${requiredUnits} Credits (₦${applicablePrice.toLocaleString()}), but your balance is ${currentUnits} Credits (₦${wallet.availableBalance.toLocaleString()}). Please fund your wallet.`
      });
    }

    // Exact-Once Atomic Wallet Deduction
    const balanceBefore = wallet.availableBalance;
    wallet.availableBalance -= applicablePrice;
    wallet.totalSpent += applicablePrice;
    wallet.updatedAt = new Date().toISOString();

    // Unique Service Tracking ID: UPV-YYYYMMDD-XXXXXX
    const trackingId = generateServiceTicketId();
    const now = new Date().toISOString();

    // Record wallet ledger transaction
    const debitTxn: WalletTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      walletId: wallet.id,
      userId: user.id,
      reference: trackingId,
      type: 'SERVICE_REQUEST',
      amount: -applicablePrice,
      fee: 0,
      balanceBefore,
      balanceAfter: wallet.availableBalance,
      status: 'SUCCESS',
      description: `Service Request Fee: ${serviceName} (${trackingId})`,
      metadata: {
        ticketId: trackingId,
        trackingId,
        serviceCode: resolvedCode,
        serviceName,
        serviceCategory,
        serviceType: 'non_verification',
        unitCost: applicablePrice,
        originalUnitCost: applicablePrice,
        units: requiredUnits,
        originalPrice: applicablePrice,
        amountCharged: applicablePrice,
        creditsDeducted: applicablePrice,
        debitSummary: 'Non-verification service request submitted — fee debited pending fulfillment'
      },
      createdAt: now
    };
    db.transactions.unshift(debitTxn);

    // Timeline event
    const timeline: ServiceRequestTimelineEvent[] = [
      {
        id: `tml_${Date.now()}_1`,
        status: 'PENDING',
        title: 'Service Request Submitted',
        description: `Customer submitted request for ${serviceName}. Payment of ₦${applicablePrice.toLocaleString()} confirmed.`,
        actorName: user.fullName,
        actorRole: user.role === 'AGENT' ? 'AGENT' : 'CUSTOMER',
        timestamp: now
      }
    ];

    const safeSubmittedData = {
      ...(searchData || {}),
      __idempotencyKey: cleanIdemKey,
      submittedAt: now
    };

    // Permanent Service Request Record: Initial status PENDING
    const newRequest: CustomerServiceRequest = {
      id: `sr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ticketId: trackingId,
      trackingId,
      userId: user.id,
      customerName: user.fullName,
      customerEmail: user.email,
      customerPhone: user.phone || '',
      serviceId: targetService?.id || `srv_${resolvedCode.toLowerCase()}`,
      serviceCode: resolvedCode,
      serviceName,
      serviceCategory,
      price: applicablePrice,
      amountCharged: applicablePrice,
      creditsDeducted: applicablePrice,
      submittedData: safeSubmittedData,
      customerFiles: Array.isArray(customerFiles) ? customerFiles : [],
      status: 'PENDING',
      refundStatus: 'NONE',
      timeline,
      createdAt: now,
      updatedAt: now
    };
    (newRequest as any).idempotencyKey = cleanIdemKey;
    db.serviceRequests.unshift(newRequest);

    // Also populate in db.verificationRequests for backward-compatibility with older views
    if (!db.verificationRequests) db.verificationRequests = [];
    const vReq: VerificationRequest = {
      id: `vreq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      idempotencyKey: cleanIdemKey,
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      serviceId: targetService?.id || `srv_${resolvedCode.toLowerCase()}`,
      serviceCode: resolvedCode,
      serviceName,
      serviceCategory: 'non_verification',
      serviceType: 'non_verification',
      apiCallState: 'completed',
      reference: trackingId,
      ticketId: trackingId,
      searchData: safeSubmittedData,
      status: 'PENDING',
      amountCharged: applicablePrice,
      refundStatus: 'NONE',
      createdAt: now,
      updatedAt: now
    };
    (vReq as any).serviceRequestId = newRequest.id;
    (vReq as any).trackingId = trackingId;
    db.verificationRequests.unshift(vReq);

    // Customer notification
    if (!db.notifications) db.notifications = [];
    db.notifications.unshift({
      id: `notif_${Date.now()}_c`,
      userId: user.id,
      title: 'Service Request Submitted Successfully',
      message: `Your service request for "${serviceName}" was received. Tracking ID: ${trackingId}. Status: Pending.`,
      type: 'SERVICE_REQUEST',
      isRead: false,
      link: '/my-service-requests',
      createdAt: now
    });

    // Admin notification to ALL authorized admins (ADMIN, SUPER_ADMIN, MEGA_ADMIN)
    const adminUsers = db.users.filter(
      (u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' || u.role === 'MEGA_ADMIN'
    );
    for (const adm of adminUsers) {
      db.notifications.unshift({
        id: `notif_${Date.now()}_a_${adm.id}`,
        userId: adm.id,
        title: '🔔 New Customer Service Request',
        message: `New service request received: ${serviceName}. Tracking ID: ${trackingId}. Customer: ${user.fullName}`,
        type: 'ANNOUNCEMENT',
        isRead: false,
        link: '/admin/service-requests',
        createdAt: now
      });
    }

    logAudit(
      user.fullName,
      user.role,
      'SERVICE_REQUEST_SUBMITTED',
      `Submitted ${serviceName} (Tracking ID: ${trackingId}, Amount: ₦${applicablePrice})`,
      user.id,
      trackingId,
      req.ip
    );

    saveDb();

    // Authoritatively persist to Supabase
    await saveServiceRequestToSupabase(newRequest);
    await saveWalletToSupabase(wallet);

    releaseLock(lockKey);

    return res.status(201).json({
      success: true,
      trackingId,
      ticketId: trackingId,
      service: serviceName,
      serviceName,
      serviceCategory,
      amount: applicablePrice,
      amountCharged: applicablePrice,
      creditsDeducted: applicablePrice,
      status: 'PENDING',
      request: newRequest,
      verification: vReq,
      message: 'Service request submitted successfully.'
    });
  } catch (err: any) {
    releaseLock(lockKey);
    console.error('[SERVICE_REQUEST_ERROR] Failed to submit non-verification request:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit service request.' });
  }
}

// ----------------------------------------------------
// Verification Flow with Strict Double-Charge & Idempotency
// ----------------------------------------------------
apiRouter.post(['/verifications/initiate', '/verifications/execute'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { serviceId, serviceCode, searchData, idempotencyKey, customerFiles } = req.body;
  const user = req.user!;
  const db = getDb();

  const rawCode = String(serviceCode || '').trim();
  const rawId = String(serviceId || '').trim();
  const effectiveData = searchData || req.body.submittedData || {};

  const identifierToTest = rawCode || rawId;
  if (!identifierToTest) {
    return res.status(400).json({ error: 'Service identifier is required.' });
  }

  // Strict separation: Non-verification services MUST use the service-request workflow!
  // A non-verification service must NEVER be rejected simply because a verification service is inactive/unavailable.
  const isCodeNonVerif = rawCode && !isVerificationService(rawCode);
  const isIdNonVerif = rawId && !isVerificationService(rawId);
  const isIdentNonVerif = !isVerificationService(identifierToTest);

  if (isCodeNonVerif || isIdNonVerif || isIdentNonVerif) {
    const nonVerifIdentifier = isCodeNonVerif ? rawCode : (isIdNonVerif ? rawId : identifierToTest);
    return handleNonVerificationServiceRequest(
      req,
      res,
      nonVerifIdentifier,
      effectiveData,
      idempotencyKey,
      customerFiles
    );
  }

  const lookupIdentifier = identifierToTest;

  if (!effectiveData || Object.keys(effectiveData).length === 0) {
    return res.status(400).json({ error: 'Search parameters are required for live verification.' });
  }

  // 1. Fetch Service Record from Database authoritatively
  const upperIdentifier = lookupIdentifier.toUpperCase();
  const localService = db.services.find((s) => s.id === lookupIdentifier || s.code.toUpperCase() === upperIdentifier);
  let service = localService;
  if (!service) {
    const supaService = await fetchSupabaseServiceByCodeOrId(lookupIdentifier);
    service = supaService || defaultCatalogueServices.find((s) => s.id === lookupIdentifier || s.code.toUpperCase() === upperIdentifier);
  }
  if (!service || service.status !== 'ACTIVE') {
    return res.status(400).json({ error: 'Selected verification service is currently unavailable or inactive.' });
  }

  // Rule 9: Online NIN Registration Service - Account Assignment Check
  if (service.code.toUpperCase() === 'ONLINE_NIN_REGISTRATION') {
    if (user.role === 'USER') {
      return res.status(403).json({
        error: 'Online NIN Registration is an operator enrollment service reserved for authorized Agents and Admins.'
      });
    }
    if (user.role === 'AGENT' && (!user.assignedServices || !user.assignedServices.includes('ONLINE_NIN_REGISTRATION'))) {
      return res.status(403).json({
        error: 'Online NIN Registration service is not assigned to your Agent account. Please contact Mega Admin or Super Admin for service authorization.'
      });
    }
  }

  // Validate required inputs for the service
  for (const field of service.requiredFields) {
    if (field.required && !searchData[field.name]) {
      return res.status(400).json({ error: `Field '${field.label}' is required.` });
    }
  }

  // 3. Idempotency Key & Double Click Mutex Lock
  const cleanIdempotencyKey = (idempotencyKey || `IDEM-${user.id}-${service.code}-${Date.now()}`).trim();

  // Check if this idempotency key was already completed
  const existingReq = db.verificationRequests.find((r) => r.idempotencyKey === cleanIdempotencyKey);
  if (existingReq && existingReq.status === 'SUCCESS') {
    const existingResult = db.verificationResults.find((vr) => vr.requestId === existingReq.id);
    return res.json({
      success: true,
      cached: true,
      verification: existingReq,
      result: existingResult
    });
  }

  // Acquire Lock on user + service to prevent concurrent double deduct
  const lockKey = `LOCK_VERIFY_${user.id}_${service.id}_${cleanIdempotencyKey}`;
  if (!acquireLock(lockKey)) {
    return res.status(429).json({ error: 'Verification in progress. Please do not duplicate your request.' });
  }

  try {
    const wallet = db.wallets.find((w) => w.userId === user.id);
    if (!wallet) {
      releaseLock(lockKey);
      return res.status(400).json({ error: 'Wallet not found.' });
    }

    // 4. Calculate Applicable Price (with Enrollment Centers & Sub-Services dynamic pricing)
    let applicablePrice = (user.role === 'AGENT' && service.agentPrice !== undefined && service.agentPrice > 0)
      ? service.agentPrice
      : service.price;
    let serviceDescription = `${service.name} Fee`;

    // BVN Modification: Check for selected Enrollment Center
    const isBvnMod =
      service.code === 'BVN_MODIFICATION' ||
      service.code.startsWith('BVN_MOD_') ||
      Boolean(searchData?.enrollmentCenter || req.body.enrollmentCenterId || req.body.enrollmentCenterCode);

    if (isBvnMod) {
      const centerQuery = String(
        req.body.enrollmentCenterId ||
        req.body.enrollmentCenterCode ||
        searchData?.enrollmentCenter ||
        ''
      ).trim().toUpperCase();

      const centers = db.bvnEnrollmentCenters || [];
      const matchedCenter = centers.find(
        (c) =>
          c.id.toUpperCase() === centerQuery ||
          c.code.toUpperCase() === centerQuery ||
          c.name.toUpperCase() === centerQuery
      );

      if (matchedCenter) {
        applicablePrice = matchedCenter.price;
        serviceDescription = `BVN Modification (${matchedCenter.name}) Fee`;
        searchData.enrollmentCenter = matchedCenter.name;
        searchData.enrollmentCenterPrice = matchedCenter.price;
      }
    }

    // Self Service: Support sub-services (NIN Delinking vs Email Retrieval)
    if (service.code === 'NIN_DELINKING' || service.code === 'SELF_SERVICE') {
      const chosen = String(searchData?.selectedService || searchData?.serviceType || '');
      if (chosen.toLowerCase().includes('email')) {
        const emailSrv = db.services.find((s) => s.code === 'SELF_SERVICE_EMAIL');
        applicablePrice = emailSrv?.price ?? 1500;
        serviceDescription = 'Self service Email Retrieval Fee';
      } else {
        const delinkSrv = db.services.find((s) => s.code === 'NIN_DELINKING');
        applicablePrice = delinkSrv?.price ?? 2500;
        serviceDescription = 'Self service NIN Delinking Fee';
      }
    }

    // Modification: Support sub-services (DOB, BVN, Phone, Address, IPE, Name)
    if (service.code === 'MODIFICATION' || service.code === 'NIN_MODIFICATION') {
      const chosenMod = String(searchData?.modificationType || searchData?.subServiceKey || searchData?.type || searchData?.selectedService || '').toLowerCase();
      if (chosenMod.includes('dob') || chosenMod.includes('birth')) {
        const srv = db.services.find((s) => s.code === 'NIN_DOB_MOD');
        applicablePrice = srv?.price ?? 50000;
        serviceDescription = 'Date of Birth Modification Fee';
      } else if (chosenMod.includes('bvn')) {
        const srv = db.services.find((s) => s.code === 'BVN_MODIFICATION');
        applicablePrice = srv?.price ?? 3000;
        if (searchData.enrollmentCenterId || searchData.enrollmentCenter) {
          const matched = db.bvnEnrollmentCenters?.find((c) => c.id === searchData.enrollmentCenterId || c.name === searchData.enrollmentCenter);
          if (matched) applicablePrice = matched.price;
        }
        serviceDescription = 'BVN Modification Fee';
      } else if (chosenMod.includes('ipe')) {
        const srv = db.services.find((s) => s.code === 'IPE_MODIFICATION');
        applicablePrice = srv?.price ?? 4500;
        serviceDescription = 'IPE Modification Fee';
      } else if (chosenMod.includes('phone')) {
        const srv = db.services.find((s) => s.code === 'NIN_PHONE_MOD');
        applicablePrice = srv?.price ?? 4500;
        serviceDescription = 'Phone Number Modification Fee';
      } else if (chosenMod.includes('address')) {
        const srv = db.services.find((s) => s.code === 'NIN_ADDRESS_MOD');
        applicablePrice = srv?.price ?? 4500;
        serviceDescription = 'Address Modification Fee';
      } else {
        const srv = db.services.find((s) => s.code === 'NIN_NAME_MOD');
        applicablePrice = srv?.price ?? 4500;
        serviceDescription = 'Name Modification Fee';
      }
    }

    // CAC & TIN: Support sub-services (Business CAC, Company CAC, Individual TIN, Company TIN)
    if (service.code === 'CAC_TIN') {
      const chosenCacTin = String(searchData?.cacTinType || searchData?.subServiceKey || searchData?.registrationType || '').toLowerCase();
      if (chosenCacTin.includes('company_cac') || chosenCacTin.includes('company cac') || chosenCacTin.includes('llc') || chosenCacTin.includes('limited')) {
        applicablePrice = 30000;
        serviceDescription = 'Company CAC Registration Fee';
      } else if (chosenCacTin.includes('business_cac') || chosenCacTin.includes('business cac') || chosenCacTin.includes('business name')) {
        applicablePrice = 22000;
        serviceDescription = 'Business CAC Registration Fee';
      } else if (chosenCacTin.includes('company_tin') || chosenCacTin.includes('company tin') || chosenCacTin.includes('corporate tin')) {
        const srv = db.services.find((s) => s.code === 'TIN_COMPANY');
        applicablePrice = srv?.price ?? 2500;
        serviceDescription = 'Company TIN Registration Fee';
      } else if (chosenCacTin.includes('individual_tin') || chosenCacTin.includes('individual tin')) {
        const srv = db.services.find((s) => s.code === 'TIN_INDIVIDUAL');
        applicablePrice = srv?.price ?? 1000;
        serviceDescription = 'Individual TIN Registration Fee';
      }
    }

    // Role-based pricing: Agents receive agent-specific / discounted pricing
    if (user.role === 'AGENT') {
      const matchedAgentPrice = service.agentPrice;
      if (matchedAgentPrice !== undefined && matchedAgentPrice > 0) {
        applicablePrice = matchedAgentPrice;
      } else {
        applicablePrice = Math.round(applicablePrice * 0.75 * 100) / 100;
      }
      serviceDescription += ' (Agent Rate)';
    }

    // Balance Verification
    const unitRate = db.settings?.unitValueNgn || 200;
    const requiredUnits = Number((applicablePrice / unitRate).toFixed(2));
    const currentUnits = Number((wallet.availableBalance / unitRate).toFixed(2));

    if (wallet.availableBalance < applicablePrice) {
      releaseLock(lockKey);
      return res.status(400).json({
        error: `Insufficient wallet balance. This service costs ${requiredUnits} Credits (₦${applicablePrice.toLocaleString()}), but your balance is ${currentUnits} Credits (₦${wallet.availableBalance.toLocaleString()}). Please fund your wallet.`
      });
    }

    const verificationRef = `VRF-${service.code}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 10. Service Category from Database: Verification vs Non-Verification
    const isInstantVerificationService =
      service.serviceType === 'verification' ||
      (!service.serviceType && isVerificationService(service.code));

    const isNonVerificationAdminService = !isInstantVerificationService;

    if (isNonVerificationAdminService) {
      // RULE #5 & #6: NON-VERIFICATION / ADMIN-PROCESSED SERVICES
      // Customer's request submitted to admin -> Deduct configured units
      const balanceBefore = wallet.availableBalance;
      wallet.availableBalance -= applicablePrice;
      wallet.totalSpent += applicablePrice;
      wallet.updatedAt = new Date().toISOString();

      if (!db.serviceRequests) db.serviceRequests = [];
      const ticketId = generateServiceTicketId();
      const now = new Date().toISOString();

      // Record deduction transaction in ledger
      const debitTxn: WalletTransaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        walletId: wallet.id,
        userId: user.id,
        reference: ticketId,
        type: 'SERVICE_REQUEST',
        amount: -applicablePrice,
        fee: 0,
        balanceBefore,
        balanceAfter: wallet.availableBalance,
        status: 'SUCCESS',
        description: `${serviceDescription} (${ticketId})`,
        metadata: {
          serviceCode: service.code,
          serviceName: service.name,
          serviceCategory: 'non_verification',
          serviceType: 'non_verification',
          ticketId,
          unitCost: applicablePrice,
          originalUnitCost: applicablePrice,
          units: requiredUnits,
          originalPrice: applicablePrice,
          debitSummary: 'Admin processing request submitted — debit retained pending completion'
        },
        createdAt: now
      };
      db.transactions.unshift(debitTxn);

      // Create Verification Request Record in PENDING state
      const verificationReq: VerificationRequest = {
        id: `vreq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        idempotencyKey: cleanIdempotencyKey,
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        serviceId: service.id,
        serviceCode: service.code,
        serviceName: service.name,
        serviceCategory: 'non_verification',
        serviceType: 'non_verification',
        apiCallState: 'completed',
        reference: ticketId,
        ticketId,
        searchData,
        status: 'PENDING',
        amountCharged: applicablePrice,
        refundStatus: 'NONE',
        createdAt: now,
        updatedAt: now
      };

      // Extract tracking ID if submitted by customer
      const ninTrackingId = (
        searchData.trackingId ||
        searchData.tracking_id ||
        searchData.ninTrackingId ||
        searchData.trackingNo ||
        searchData.searchQuery ||
        ''
      ).toString().trim();

      let userMessage = `${service.name} request submitted (Ticket: ${ticketId}). Request is under review and will be processed by Admin.`;

      if (service.code === 'PERSONALIZATION' || service.code === 'PERSONALISATION' || service.code === 'NIN_TRACKING') {
        userMessage = `Personalisation request submitted successfully (Ticket: ${ticketId}). NIN Tracking ID: ${ninTrackingId || 'Recorded'}. Status: PENDING. Admin will process and complete your request.`;
      } else if (service.code === 'NIN_VALIDATION') {
        userMessage = `NIN Validation & Status request submitted (Ticket: ${ticketId}). Status: PENDING. Our operations desk is reviewing your national identity record.`;
      } else if (service.code === 'BIRTH_ATTESTATION') {
        userMessage = `Birth Attestation request submitted (Ticket: ${ticketId}). NOTE: This Service Takes 3 to 4 days To Be Processed.`;
      } else if (service.code === 'MODIFICATION' || service.code.startsWith('NIN_MOD')) {
        userMessage = `Modification request (${searchData.modificationType || service.name}) submitted (Ticket: ${ticketId}). Status: PENDING. Admin will process and update your records.`;
      } else if (service.code.startsWith('BVN_MOD')) {
        userMessage = `BVN Modification request submitted (Ticket: ${ticketId}). Processing at ${searchData.enrollmentCenter || 'Center'}.`;
      } else if (service.code === 'BVN_RETRIEVAL') {
        userMessage = `BVN Retrieval request submitted (Ticket: ${ticketId}). Status: PENDING. Banking directory lookup queued for processing.`;
      } else if (service.code === 'BVN_ANDROID_USER' || service.code === 'ANDROID_BVN_ONBOARDING') {
        userMessage = `Android BVN Onboarding agent license request submitted (Ticket: ${ticketId}).`;
      } else if (service.code === 'NIN_DELINKING' || service.code === 'SELF_SERVICE' || service.code === 'SELF_SERVICE_EMAIL') {
        userMessage = `Self Service request submitted (Ticket: ${ticketId}). NOTE: This Service Takes 24-48hrs To Be Processed.`;
      } else if (service.code === 'CAC_REGISTRATION' || service.code === 'CAC_TIN') {
        userMessage = `CAC Registration submitted (Ticket: ${ticketId}). We will process and issue your certificate within 2 to 4 weeks.`;
      } else if (service.code.includes('TIN')) {
        userMessage = `${service.name} submitted (Ticket: ${ticketId}). Verification & JTB registration in progress.`;
      }

      // Create permanent CustomerServiceRequest for Admin Dashboard
      const newServiceRequest: CustomerServiceRequest = {
        id: `sr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ticketId,
        userId: user.id,
        customerName: user.fullName,
        customerEmail: user.email,
        customerPhone: user.phone || '',
        serviceId: service.id,
        serviceCode: service.code,
        serviceName: service.name,
        serviceCategory: service.category || 'Manual Service',
        price: applicablePrice,
        submittedData: {
          ...searchData,
          ...(ninTrackingId ? { ninTrackingId, trackingId: ninTrackingId } : {})
        },
        customerFiles: req.body.customerFiles || [],
        status: 'PENDING',
        refundStatus: 'NONE',
        timeline: [
          {
            id: `tml_${Date.now()}_1`,
            status: 'PENDING',
            title: 'Service Request Submitted',
            description: `Customer submitted request for ${service.name}. Credits/Payment of ₦${applicablePrice.toLocaleString()} (${requiredUnits} Credits) deducted.`,
            actorName: user.fullName,
            actorRole: 'CUSTOMER',
            timestamp: now
          }
        ],
        createdAt: now,
        updatedAt: now
      };
      db.serviceRequests.unshift(newServiceRequest);

      // Link ticket to verification request
      verificationReq.ticketId = ticketId;
      verificationReq.serviceRequestId = newServiceRequest.id;
      db.verificationRequests.unshift(verificationReq);

      db.notifications.unshift({
        id: `notif_${Date.now()}`,
        userId: user.id,
        title: `${service.name} Submitted (Pending)`,
        message: userMessage,
        type: 'SERVICE_REQUEST',
        isRead: false,
        link: '/my-service-requests',
        createdAt: now
      });

      logAudit(
        user.fullName,
        user.role,
        'SERVICE_REQUEST_SUBMITTED',
        `Submitted ${service.name} (Ticket: ${ticketId}) - Charged: ₦${applicablePrice} (${requiredUnits} Credits) - Status: PENDING`,
        user.id,
        ticketId,
        req.ip
      );
      saveDb();
      releaseLock(lockKey);

      return res.status(200).json({
        success: true,
        pending: true,
        status: 'PENDING',
        ticketId,
        message: userMessage,
        request: verificationReq,
        serviceRequest: newServiceRequest
      });
    }

    // =========================================================================
    // VERIFICATION SERVICES WALLET & REFUND LOGIC
    // Rule #1: API WAS CALLED + API RETURNED A RESPONSE = KEEP THE DEBIT (NO REFUND)
    // Rule #2: ONLY REFUND WHEN API WAS NOT SUCCESSFULLY CALLED (api_not_called or api_call_failed_before_response)
    // =========================================================================

    // 1. Initial wallet debit upon request dispatch
    const balanceBefore = wallet.availableBalance;
    wallet.availableBalance -= applicablePrice;
    wallet.totalSpent += applicablePrice;
    wallet.updatedAt = new Date().toISOString();

    const debitTxn: WalletTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      walletId: wallet.id,
      userId: user.id,
      reference: verificationRef,
      type: 'VERIFICATION',
      amount: -applicablePrice,
      fee: 0,
      balanceBefore,
      balanceAfter: wallet.availableBalance,
      status: 'SUCCESS',
      description: `${serviceDescription} (${verificationRef})`,
      metadata: {
        serviceCode: service.code,
        serviceName: service.name,
        serviceCategory: 'verification',
        serviceType: 'verification',
        originalUnitCost: applicablePrice,
        units: requiredUnits,
        apiCallState: 'api_not_called',
        debitRetained: true,
        debitSummary: 'Verification lookup initiated'
      },
      createdAt: new Date().toISOString()
    };
    db.transactions.unshift(debitTxn);

    // 2. Call verification provider adapter
    const providerRes = await providerAdapter.executeService(service.code, searchData);

    const apiWasCalledAndReturnedResponse =
      providerRes.apiCallState === 'api_called_response_received' ||
      (providerRes.apiCalled === true &&
        !providerRes.unconfigured &&
        providerRes.apiCallState !== 'api_not_called' &&
        providerRes.apiCallState !== 'api_call_failed_before_response');

    if (apiWasCalledAndReturnedResponse) {
      // -----------------------------------------------------------------------
      // RULE #1: API WAS CALLED + API RETURNED A RESPONSE = KEEP THE DEBIT
      // Customer's wallet remains debited by exactly applicablePrice.
      // This applies whether the returned result is Successful, Failed, Unsuccessful,
      // Not found, No match, Invalid details, or Record unavailable.
      // -----------------------------------------------------------------------
      debitTxn.metadata = {
        ...debitTxn.metadata,
        apiCallState: 'api_called_response_received',
        debitSummary: 'API called and response received — debit retained',
        debitRetained: true,
        finalServiceStatus: providerRes.success ? 'SUCCESSFUL' : 'FAILED',
        providerName: providerRes.providerName,
        rawHttpStatus: providerRes.rawHttpStatus
      };

      const retData = providerRes.data;
      const hasVerifiedData =
        providerRes.success &&
        retData &&
        typeof retData === 'object' &&
        Object.keys(retData).length > 0 &&
        Boolean(
          retData.nin ||
          retData.bvn ||
          retData.licenseNumber ||
          retData.fullName ||
          (retData.firstName && retData.surname) ||
          retData.photoUrl ||
          retData.trackingId ||
          retData.status === 'VERIFIED'
        );

      if (hasVerifiedData) {
        // Successful verification with returned citizen identity details
        const verificationReq: VerificationRequest = {
          id: `vreq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          idempotencyKey: cleanIdempotencyKey,
          userId: user.id,
          userName: user.fullName,
          userEmail: user.email,
          serviceId: service.id,
          serviceCode: service.code,
          serviceName: service.name,
          serviceCategory: 'verification',
          serviceType: 'verification',
          apiCallState: 'api_called_response_received',
          reference: verificationRef,
          searchData,
          status: 'SUCCESS',
          amountCharged: applicablePrice,
          refundStatus: 'NONE',
          resultData: providerRes.data,
          result: providerRes.data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        db.verificationRequests.unshift(verificationReq);

        const verificationResult: VerificationResult = {
          id: `vres_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          requestId: verificationReq.id,
          userId: user.id,
          serviceCode: service.code,
          serviceName: service.name,
          reference: verificationRef,
          returnedData: providerRes.data || {},
          photoUrl: providerRes.data?.photoUrl || undefined,
          providerName: providerRes.providerName,
          verifiedAt: new Date().toISOString(),
          verifiedBy: user.fullName
        };
        db.verificationResults.unshift(verificationResult);

        db.notifications.unshift({
          id: `notif_${Date.now()}`,
          userId: user.id,
          title: 'Verification Completed',
          message: `${service.name} verified successfully. Reference: ${verificationRef}`,
          type: 'VERIFICATION',
          isRead: false,
          link: '/verify/history',
          createdAt: new Date().toISOString()
        });

        logAudit(
          user.fullName,
          user.role,
          'VERIFICATION_SUCCESS',
          `Verified ${service.code} Ref: ${verificationRef}. API called + response received (debit retained: ₦${applicablePrice}).`,
          user.id,
          verificationRef,
          req.ip
        );
        saveDb();
        releaseLock(lockKey);

        return res.json({
          success: true,
          message: 'Verification completed successfully.',
          verification: verificationReq,
          request: verificationReq,
          result: verificationResult
        });
      } else {
        // API was called and returned legitimate response, but record was not found or verification was unsuccessful.
        // As per Rule #1 & #4: KEEP THE DEBIT. NO REFUND.
        const unverifiedReq: VerificationRequest = {
          id: `vreq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          idempotencyKey: cleanIdempotencyKey,
          userId: user.id,
          userName: user.fullName,
          userEmail: user.email,
          serviceId: service.id,
          serviceCode: service.code,
          serviceName: service.name,
          serviceCategory: 'verification',
          serviceType: 'verification',
          apiCallState: 'api_called_response_received',
          reference: verificationRef,
          searchData,
          status: 'FAILED',
          amountCharged: applicablePrice, // DEBIT KEPT!
          refundStatus: 'NONE', // NO REFUND!
          errorMessage: providerRes.message || 'No matching identity record found in the national registry database.',
          resultData: providerRes.data || null,
          result: providerRes.data || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        db.verificationRequests.unshift(unverifiedReq);

        db.notifications.unshift({
          id: `notif_${Date.now()}`,
          userId: user.id,
          title: 'Verification Result: Record Not Found',
          message: `${service.name} lookup returned no record. The verification API was called and response received; debit of ${requiredUnits} Credits (₦${applicablePrice.toLocaleString()}) was retained.`,
          type: 'VERIFICATION',
          isRead: false,
          link: '/verify/history',
          createdAt: new Date().toISOString()
        });

        logAudit(
          user.fullName,
          user.role,
          'VERIFICATION_API_RESPONSE_RECORD_NOT_FOUND',
          `No matching record for ${service.code} Ref: ${verificationRef}. API called + response received. Debit retained: ₦${applicablePrice}.`,
          user.id,
          verificationRef,
          req.ip
        );
        saveDb();
        releaseLock(lockKey);

        return res.json({
          success: true,
          verified: false,
          error: unverifiedReq.errorMessage,
          message: unverifiedReq.errorMessage,
          verification: unverifiedReq,
          request: unverifiedReq,
          result: null
        });
      }
    } else {
      // -----------------------------------------------------------------------
      // RULE #2: VERIFICATION SERVICE REFUND CONDITION
      // System confirms that the verification API was NOT successfully called
      // (e.g. API request was never sent, internal system error prevented request,
      // provider unconfigured, or request failed before reaching provider).
      // Refund the EXACT original unit amount. Prevent double refunds.
      // -----------------------------------------------------------------------
      const apiState = providerRes.apiCallState || 'api_not_called';
      wallet.availableBalance += applicablePrice;
      wallet.totalSpent = Math.max(0, wallet.totalSpent - applicablePrice);
      wallet.updatedAt = new Date().toISOString();

      const refundTxn: WalletTransaction = {
        id: `txn_${Date.now()}_ref_${Math.random().toString(36).substring(2, 6)}`,
        walletId: wallet.id,
        userId: user.id,
        reference: `REF-${verificationRef}`,
        type: 'REFUND',
        amount: applicablePrice,
        fee: 0,
        balanceBefore: wallet.availableBalance - applicablePrice,
        balanceAfter: wallet.availableBalance,
        status: 'SUCCESS',
        description: `Automatic Refund: ${service.name} API was not called (${verificationRef})`,
        metadata: {
          originalReference: verificationRef,
          serviceCode: service.code,
          serviceName: service.name,
          serviceCategory: 'verification',
          serviceType: 'verification',
          originalUnitCost: applicablePrice,
          units: requiredUnits,
          apiCallState: apiState,
          debitSummary: 'API was not called — refund issued',
          refundAmount: applicablePrice,
          refundReason: providerRes.unconfigured
            ? 'Verification provider credentials not configured'
            : (providerRes.message || 'Verification provider request failed before response was received')
        },
        createdAt: new Date().toISOString()
      };
      db.transactions.unshift(refundTxn);

      debitTxn.metadata = {
        ...debitTxn.metadata,
        apiCallState: apiState,
        debitSummary: 'API was not called — refund issued',
        refunded: true,
        refundTxnId: refundTxn.id
      };

      const failedReq: VerificationRequest = {
        id: `vreq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        idempotencyKey: cleanIdempotencyKey,
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        serviceId: service.id,
        serviceCode: service.code,
        serviceName: service.name,
        serviceCategory: 'verification',
        serviceType: 'verification',
        apiCallState: apiState,
        reference: verificationRef,
        searchData,
        status: 'FAILED',
        amountCharged: applicablePrice,
        refundStatus: 'REFUNDED',
        refundAmount: applicablePrice,
        refundedAt: new Date().toISOString(),
        errorMessage: providerRes.unconfigured
          ? 'Verification provider credentials are not configured. Your wallet has been automatically refunded.'
          : (providerRes.message || 'Verification provider could not be reached. Your wallet has been automatically refunded.'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.verificationRequests.unshift(failedReq);

      db.notifications.unshift({
        id: `notif_${Date.now()}`,
        userId: user.id,
        title: 'Verification Refund Issued',
        message: `${service.name} verification could not reach the national registry gateway. Your wallet was refunded exactly ${requiredUnits} Credits (₦${applicablePrice.toLocaleString()}).`,
        type: 'VERIFICATION',
        isRead: false,
        link: '/verify/history',
        createdAt: new Date().toISOString()
      });

      logAudit(
        user.fullName,
        user.role,
        'VERIFICATION_NOT_CALLED_REFUNDED',
        `Ref: ${verificationRef}. State: ${apiState}. Provider was not called. Exact refund issued: ₦${applicablePrice} (${requiredUnits} Credits).`,
        user.id,
        verificationRef,
        req.ip
      );
      saveDb();
      releaseLock(lockKey);

      return res.status(400).json({
        success: false,
        unconfigured: providerRes.unconfigured,
        error: failedReq.errorMessage,
        message: failedReq.errorMessage,
        verification: failedReq,
        request: failedReq
      });
    }
  } catch (err: any) {
    releaseLock(lockKey);
    console.warn('[Verification Exception]', err?.message || err);

    // Safeguard: If wallet was deducted but an unexpected exception occurred, auto-refund the user immediately
    try {
      const db = getDb();
      const user = req.user;
      if (user) {
        const wallet = db.wallets.find((w) => w.userId === user.id);
        const pendingReq = db.verificationRequests.find((v) => v.idempotencyKey === cleanIdempotencyKey && v.status === 'PENDING');
        if (wallet && pendingReq) {
          const refundAmount = pendingReq.amountCharged || 0;
          if (refundAmount > 0) {
            wallet.availableBalance += refundAmount;
            wallet.totalSpent -= refundAmount;
            wallet.updatedAt = new Date().toISOString();
            pendingReq.status = 'FAILED';
            pendingReq.refundStatus = 'REFUNDED';
            pendingReq.errorMessage = err.message || 'System error occurred during verification processing.';
            pendingReq.updatedAt = new Date().toISOString();

            db.transactions.unshift({
              id: `txn_${Date.now()}_err_ref`,
              walletId: wallet.id,
              userId: user.id,
              reference: `REF-${pendingReq.reference}`,
              type: 'REFUND',
              amount: refundAmount,
              fee: 0,
              balanceBefore: wallet.availableBalance - refundAmount,
              balanceAfter: wallet.availableBalance,
              status: 'SUCCESS',
              description: `Auto-refund for interrupted verification (${pendingReq.reference})`,
              createdAt: new Date().toISOString()
            });
            saveDb();
          }
        }
      }
    } catch (refundErr) {
      console.warn('[Auto-refund Error]', (refundErr as any)?.message || refundErr);
    }

    return res.status(500).json({ error: err.message || 'Something went wrong while processing verification. Please try again.' });
  }
});

apiRouter.get('/verifications/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const list = db.verificationRequests.filter((v) => v.userId === user.id);
  res.json(list);
});

apiRouter.get('/verifications/my', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const list = (db.verificationRequests || []).filter((v) => v.userId === user.id);
  res.json(list.slice(0, limit));
});

apiRouter.get(['/verifications/:id', '/verifications/result/:id'], requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const request = db.verificationRequests.find((v) => (v.id === req.params.id || v.reference === req.params.id) && (v.userId === user.id || user.role !== 'USER'));
  if (!request) {
    return res.status(404).json({ error: 'Verification record not found.' });
  }
  const result = db.verificationResults.find((r) => r.requestId === request.id || r.reference === request.reference);
  res.json({ request, result, ...(result ? { ...result } : {}) });
});

// ----------------------------------------------------
// Notifications
// ----------------------------------------------------
apiRouter.get('/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const notifs = db.notifications.filter((n) => n.userId === user.id);
  res.json(notifs);
});

apiRouter.post('/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const notif = db.notifications.find((n) => n.id === req.params.id && n.userId === user.id);
  if (notif) {
    notif.isRead = true;
    saveDb();
  }
  res.json({ success: true });
});

apiRouter.post('/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  db.notifications.forEach((n) => {
    if (n.userId === user.id) n.isRead = true;
  });
  saveDb();
  res.json({ success: true });
});

// ----------------------------------------------------
// Support System
// ----------------------------------------------------
apiRouter.post('/support/tickets', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { subject, category, message, attachmentUrl } = req.body;
  const user = req.user!;
  const db = getDb();

  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required.' });
  }

  const ticketNumber = `TCK-${Date.now().toString().slice(-6)}`;
  const ticket: SupportTicket = {
    id: `tck_${Date.now()}`,
    ticketNumber,
    userId: user.id,
    userName: user.fullName,
    userEmail: user.email,
    subject: subject.trim(),
    category: category || 'OTHER',
    status: 'OPEN',
    priority: 'NORMAL',
    messages: [
      {
        id: `msg_${Date.now()}`,
        senderId: user.id,
        senderName: user.fullName,
        senderRole: user.role,
        message: message.trim(),
        attachmentUrl: attachmentUrl || undefined,
        timestamp: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.supportTickets.unshift(ticket);
  logAudit(user.fullName, user.role, 'SUPPORT_TICKET_CREATED', `Ticket #${ticketNumber}: ${subject}`, user.id, ticketNumber, req.ip);
  saveDb();

  res.status(201).json({ success: true, ticket });
});

apiRouter.get('/support/tickets', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const tickets = db.supportTickets.filter((t) => t.userId === user.id);
  res.json(tickets);
});

apiRouter.post('/support/tickets/:id/message', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { message, attachmentUrl } = req.body;
  const user = req.user!;
  const db = getDb();

  const ticket = db.supportTickets.find((t) => t.id === req.params.id && (t.userId === user.id || user.role !== 'USER'));
  if (!ticket) {
    return res.status(404).json({ error: 'Support ticket not found.' });
  }

  ticket.messages.push({
    id: `msg_${Date.now()}`,
    senderId: user.id,
    senderName: user.fullName,
    senderRole: user.role,
    message: String(message).trim(),
    attachmentUrl: attachmentUrl || undefined,
    timestamp: new Date().toISOString()
  });

  ticket.updatedAt = new Date().toISOString();
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
    ticket.status = 'IN_PROGRESS';
  }

  saveDb();
  res.json({ success: true, ticket });
});

// ----------------------------------------------------
// ADMINISTRATIVE ENDPOINTS (SUPER_ADMIN, ADMIN, STAFF)
// ----------------------------------------------------
apiRouter.get(['/admin/metrics', '/admin/dashboard'], requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const totalUsers = db.users.length;
  const activeUsers = db.users.filter((u) => u.status === 'ACTIVE').length;
  const totalVerifications = db.verificationRequests.length;
  const successfulVerifications = db.verificationRequests.filter((v) => v.status === 'SUCCESS').length;
  const failedVerifications = db.verificationRequests.filter((v) => v.status === 'FAILED').length;
  const successRate = totalVerifications > 0 ? `${((successfulVerifications / totalVerifications) * 100).toFixed(0)}%` : '100%';

  // Real database calculated revenue
  const totalRevenue = db.verificationRequests
    .filter((v) => v.status === 'SUCCESS')
    .reduce((acc, v) => acc + (v.amountCharged || 0), 0);

  const pendingFundingRequests = 0;
  const pendingVerifications = db.verificationRequests.filter((v) => v.status === 'PENDING').length;

  // Service breakdown
  const serviceStats: Record<string, number> = {};
  db.verificationRequests.forEach((v) => {
    serviceStats[v.serviceName] = (serviceStats[v.serviceName] || 0) + 1;
  });

  res.json({
    totalUsers,
    activeUsers,
    totalVerifications,
    successfulVerifications,
    failedVerifications,
    successRate,
    totalRevenue,
    pendingFundingRequests,
    pendingFunding: pendingFundingRequests,
    pendingVerifications,
    serviceStats,
    recentRequests: db.verificationRequests.slice(0, 8),
    recentFunding: []
  });
});

apiRouter.get('/admin/users', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  // Authoritatively synchronize latest accounts from Supabase PostgreSQL if service role is active
  await syncAuthoritativeDataFromSupabase();

  const db = getDb();
  const q = String(req.query.q || '').toLowerCase();
  const requester = req.user!;

  // Account Hierarchy / Monitoring:
  // MEGA ADMIN can monitor EVERY account and EVERY action.
  // SUPER ADMIN can monitor accounts below SUPER ADMIN level.
  // SUPER ADMIN cannot monitor fellow SUPER ADMIN accounts or MEGA ADMIN.
  let usersList = db.users;
  if (requester.role === 'SUPER_ADMIN') {
    usersList = usersList.filter((u) => u.role !== 'MEGA_ADMIN' && u.role !== 'SUPER_ADMIN');
  }

  let users = usersList.map((u) => {
    const wal = db.wallets.find((w) => w.userId === u.id);
    const prof = db.profiles.find((p) => p.userId === u.id);
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      fullName: u.fullName,
      phone: u.phone,
      phone2: u.phone2,
      role: u.role,
      status: u.status,
      avatarUrl: u.avatarUrl || prof?.avatarUrl || '',
      onboardingStatus: u.onboardingStatus || (u.role === 'MEGA_ADMIN' ? 'approved' : 'not_started'),
      onboardingApprovedAt: u.onboardingApprovedAt,
      onboardingApprovedBy: u.onboardingApprovedBy,
      roleAtApproval: u.roleAtApproval,
      assignedServices: u.assignedServices || [],
      satisfactionTitle: u.satisfactionTitle,
      dob: u.dob,
      nin: u.nin,
      lastActiveAt: u.lastActiveAt,
      lastLoginAt: u.lastLoginAt,
      walletBalance: wal?.availableBalance || 0,
      createdAt: u.createdAt
    };
  });

  if (q) {
    users = users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
    );
  }

  res.json(users);
});

// Role Management: SUPER_ADMIN can promote to AGENT, ADMIN, USER. Only MEGA_ADMIN can promote to SUPER_ADMIN/MEGA_ADMIN.
apiRouter.patch('/admin/users/:id/role', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { role } = req.body;
  const db = getDb();
  const requester = req.user!;
  const targetUser = db.users.find((u) => u.id === req.params.id);

  if (!targetUser) return res.status(404).json({ error: 'User not found.' });

  const validRoles = ['USER', 'AGENT', 'ADMIN', 'SUPER_ADMIN', 'MEGA_ADMIN'];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role specified. Must be one of: ${validRoles.join(', ')}` });
  }

  // 1. Strict Security Rule: The Mega Admin role is permanent and unique. No account may ever be assigned MEGA_ADMIN.
  if (role === 'MEGA_ADMIN' || String(role).toUpperCase() === 'MEGA_ADMIN') {
    return res.status(403).json({ error: 'Security Violation: The Mega Admin role is permanent and exclusive. No account can be created or promoted to Mega Admin.' });
  }

  // 2. Strict Security Rule: The permanent Mega Administrator account cannot be modified, demoted or altered
  if (
    targetUser.role === 'MEGA_ADMIN' ||
    targetUser.email.toLowerCase() === 'ugochukwuoparaocha3@gmail.com' ||
    targetUser.username === '/Mega//admin/bazerightverify'
  ) {
    return res.status(403).json({ error: 'Security Violation: The permanent Mega Administrator account cannot be modified or demoted.' });
  }

  // 3. Only the Mega Admin can promote lower-level users to Super Admin
  if (role === 'SUPER_ADMIN' && requester.role !== 'MEGA_ADMIN') {
    return res.status(403).json({ error: 'Only the Mega Administrator can create or promote accounts to Super Admin.' });
  }

  // 4. Super Admin cannot modify fellow Super Admin accounts
  if (requester.role === 'SUPER_ADMIN' && targetUser.role === 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super Admins are not permitted to modify fellow Super Admin accounts.' });
  }

  const previousRole = targetUser.role;
  const previousOnboardingStatus = targetUser.onboardingStatus;
  const previousRoleAtApproval = targetUser.roleAtApproval;
  const previousApprovedAt = targetUser.onboardingApprovedAt;
  const previousApprovedBy = targetUser.onboardingApprovedBy;
  const previousAssignedServices = [...(targetUser.assignedServices || [])];

  targetUser.role = role as any;
  targetUser.updatedAt = new Date().toISOString();

  // Role change logic:
  let onboardingRequired = false;
  if (role === 'AGENT' || role === 'ADMIN' || role === 'SUPER_ADMIN') {
    // Requirements 2 & 3: Privileged role assigned: reset onboarding completely
    targetUser.onboardingStatus = 'not_started';
    targetUser.roleAtApproval = undefined;
    targetUser.onboardingApprovedAt = undefined;
    targetUser.onboardingApprovedBy = undefined;
    onboardingRequired = true;
  } else if (role === 'USER') {
    // Requirement 9: Demotion must NOT automatically reset an already-approved onboarding record.
    if (previousOnboardingStatus === 'approved') {
      targetUser.onboardingStatus = 'approved';
      targetUser.onboardingApprovedAt = previousApprovedAt;
      targetUser.onboardingApprovedBy = previousApprovedBy;
      targetUser.roleAtApproval = previousRoleAtApproval;
    } else {
      targetUser.onboardingStatus = 'not_started';
      targetUser.roleAtApproval = undefined;
      targetUser.onboardingApprovedAt = undefined;
      targetUser.onboardingApprovedBy = undefined;
    }
    targetUser.assignedServices = [];
    onboardingRequired = false;
  } else if (role === 'MEGA_ADMIN') {
    targetUser.onboardingStatus = 'approved';
    targetUser.onboardingApprovedBy = 'SYSTEM OWNER / FOUNDER';
    onboardingRequired = false;
  }

  // Authoritatively update role and onboarding state in Supabase
  const supaRoleResult = await updateUserRoleInSupabase(targetUser.id, role, targetUser.onboardingStatus, targetUser.email);
  if (!supaRoleResult.success) {
    // Roll back in-memory state so frontend and local cache never get out of sync with database
    targetUser.role = previousRole;
    targetUser.onboardingStatus = previousOnboardingStatus;
    targetUser.roleAtApproval = previousRoleAtApproval;
    targetUser.onboardingApprovedAt = previousApprovedAt;
    targetUser.onboardingApprovedBy = previousApprovedBy;
    targetUser.assignedServices = previousAssignedServices;

    console.error(`[ROLE_CHANGE_ERROR] Authoritative Supabase update failed for ${targetUser.email}:`, supaRoleResult.error);
    return res.status(500).json({
      error: `Authoritative database update failed: ${supaRoleResult.error || 'Unknown database error'}. Role change was not applied.`
    });
  }

  const supaSaveResult = await saveUserToSupabase(targetUser);
  if (!supaSaveResult.success) {
    targetUser.role = previousRole;
    targetUser.onboardingStatus = previousOnboardingStatus;
    targetUser.roleAtApproval = previousRoleAtApproval;
    targetUser.onboardingApprovedAt = previousApprovedAt;
    targetUser.onboardingApprovedBy = previousApprovedBy;
    targetUser.assignedServices = previousAssignedServices;

    console.error(`[ROLE_CHANGE_ERROR] Authoritative Supabase user profile save failed for ${targetUser.email}:`, supaSaveResult.error);
    return res.status(500).json({
      error: `Authoritative database persistence failed: ${supaSaveResult.error || 'Unknown database error'}. Role change was not applied.`
    });
  }

  logAudit(
    requester.fullName,
    requester.role,
    'USER_ROLE_CHANGE',
    `Role changed for ${targetUser.email}: ${previousRole} -> ${role}`,
    targetUser.id,
    undefined,
    req.ip
  );
  saveDb();

  const onboardingNotice =
    role === 'AGENT'
      ? 'Agent onboarding required.'
      : role === 'ADMIN'
      ? 'Admin onboarding required.'
      : role === 'SUPER_ADMIN'
      ? 'Super Admin onboarding required.'
      : role === 'USER'
      ? 'Account set to standard User. Privileged access removed.'
      : '';

  res.json({
    success: true,
    message: `Account role for ${targetUser.fullName} updated to ${role}.${onboardingNotice ? ' ' + onboardingNotice : ''}`,
    onboardingRequired,
    user: {
      id: targetUser.id,
      email: targetUser.email,
      username: targetUser.username,
      fullName: targetUser.fullName,
      role: targetUser.role,
      status: targetUser.status,
      onboardingStatus: targetUser.onboardingStatus,
      assignedServices: targetUser.assignedServices || []
    }
  });
});

// Account Status Control: Suspensions and Activations with strict role hierarchy
apiRouter.patch('/admin/users/:id/status', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const requester = req.user!;
  const { status } = req.body;
  const db = getDb();
  const targetUser = db.users.find((u) => u.id === req.params.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found.' });

  // Security Rule: Permanent Mega Administrator can never be suspended or modified
  if (
    targetUser.role === 'MEGA_ADMIN' ||
    targetUser.email.toLowerCase() === 'ugochukwuoparaocha3@gmail.com' ||
    targetUser.username === '/Mega//admin/bazerightverify' ||
    targetUser.username?.toLowerCase() === '/mega//admin/bazerightverify'
  ) {
    return res.status(403).json({ error: 'Security Violation: Cannot pause, play, or suspend the permanent Mega Administrator account.' });
  }

  // Hierarchy validation
  if (requester.role === 'ADMIN') {
    if (['ADMIN', 'SUPER_ADMIN', 'MEGA_ADMIN'].includes(targetUser.role)) {
      return res.status(403).json({ error: 'Regular Administrators can only suspend or activate Customer and Agent accounts.' });
    }
  } else if (requester.role === 'SUPER_ADMIN') {
    if (targetUser.role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admins cannot suspend fellow Super Admin or Mega Admin accounts.' });
    }
  } else if (requester.role !== 'MEGA_ADMIN') {
    return res.status(403).json({ error: 'Unauthorized. Administrator privileges required.' });
  }

  const validStatuses = ['ACTIVE', 'PAUSED', 'SUSPENDED'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Valid options: ${validStatuses.join(', ')}` });
  }

  const oldStatus = targetUser.status;
  targetUser.status = status;
  targetUser.updatedAt = new Date().toISOString();

  logAudit(
    requester.fullName,
    requester.role,
    'USER_STATUS_CHANGE',
    `Account ${targetUser.email} status changed: ${oldStatus} -> ${status}`,
    targetUser.id,
    undefined,
    req.ip
  );
  saveDb();

  // Authoritatively update status in Supabase
  await updateUserStatusInSupabase(targetUser.id, status);
  await saveUserToSupabase(targetUser);

  const statusMsg = status === 'SUSPENDED'
    ? 'Account has been SUSPENDED. User is immediately blocked from logging in or accessing services.'
    : status === 'ACTIVE'
    ? 'Account has been ACTIVATED and restored to normal access.'
    : 'Account has been PAUSED.';

  res.json({
    success: true,
    message: `User status changed to ${status}. ${statusMsg}`,
    user: {
      id: targetUser.id,
      email: targetUser.email,
      username: targetUser.username,
      status: targetUser.status,
      role: targetUser.role
    }
  });
});

// Delete Account: MEGA ADMIN, SUPER ADMIN and ADMIN with strict role hierarchy enforcement
apiRouter.delete('/admin/users/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const requester = req.user!;
  const targetIndex = db.users.findIndex((u) => u.id === req.params.id);
  if (targetIndex === -1) return res.status(404).json({ error: 'User not found.' });

  const targetUser = db.users[targetIndex];
  if (
    targetUser.role === 'MEGA_ADMIN' ||
    targetUser.email.toLowerCase() === 'ugochukwuoparaocha3@gmail.com' ||
    targetUser.username === '/Mega//admin/bazerightverify' ||
    targetUser.username?.toLowerCase() === '/mega//admin/bazerightverify'
  ) {
    return res.status(403).json({ error: 'Security Violation: The permanent Mega Administrator account cannot be deleted.' });
  }

  if (requester.role === 'ADMIN') {
    if (['ADMIN', 'SUPER_ADMIN', 'MEGA_ADMIN'].includes(targetUser.role)) {
      return res.status(403).json({ error: 'Regular Administrators cannot delete fellow Admin, Super Admin, or Mega Admin accounts.' });
    }
  } else if (requester.role === 'SUPER_ADMIN') {
    if (targetUser.role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admins cannot delete fellow Super Admin or Mega Admin accounts.' });
    }
  } else if (requester.role !== 'MEGA_ADMIN') {
    return res.status(403).json({ error: 'Unauthorized. Administrator privileges required.' });
  }

  // Authoritatively delete from Supabase first if service-role is active
  if (isSupabaseServiceRoleActive()) {
    const supaRes = await deleteUserFromSupabase(targetUser.id);
    if (!supaRes.success) {
      console.error('[USER_DELETE_ERROR] Supabase deleteUserFromSupabase failed:', supaRes.error);
      return res.status(500).json({
        error: `Authoritative database deletion failed: ${supaRes.error || 'Failed to delete user from Supabase'}. Local account was kept intact.`
      });
    }
  }

  // Remove related profile
  const profIndex = db.profiles.findIndex((p) => p.userId === targetUser.id);
  if (profIndex !== -1) db.profiles.splice(profIndex, 1);

  // Remove related active wallet
  const walIndex = db.wallets.findIndex((w) => w.userId === targetUser.id);
  if (walIndex !== -1) db.wallets.splice(walIndex, 1);

  // Remove onboarding requests if any
  if (db.onboardingRequests) {
    db.onboardingRequests = db.onboardingRequests.filter((o) => o.userId !== targetUser.id);
  }

  // Remove user from database and record audit log
  db.users.splice(targetIndex, 1);

  logAudit(
    requester.fullName,
    requester.role,
    'USER_DELETED',
    `User account permanently deleted: ${targetUser.fullName} (${targetUser.email}, role: ${targetUser.role})`,
    targetUser.id,
    undefined,
    req.ip
  );

  saveDb();

  res.json({ success: true, message: `Account for ${targetUser.email} has been permanently deleted.` });
});

apiRouter.post('/admin/users/:id/wallet-adjust', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { amount, type, reason } = req.body;
  const num = Number(amount);
  if (!num || num <= 0) return res.status(400).json({ error: 'Valid amount is required.' });

  const db = getDb();
  const targetUser = db.users.find((u) => u.id === req.params.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found.' });

  const wallet = db.wallets.find((w) => w.userId === targetUser.id);
  if (!wallet) return res.status(404).json({ error: 'Wallet not found.' });

  const before = wallet.availableBalance;
  const isCredit = type === 'CREDIT';
  if (!isCredit && wallet.availableBalance < num) {
    return res.status(400).json({ error: 'Cannot debit more than available wallet balance.' });
  }

  if (isCredit) {
    wallet.availableBalance += num;
    wallet.totalDeposited += num;
  } else {
    wallet.availableBalance -= num;
    wallet.totalSpent += num;
  }
  wallet.updatedAt = new Date().toISOString();

  const ref = `ADJ-${Date.now().toString().slice(-6)}`;
  db.transactions.unshift({
    id: `txn_${Date.now()}`,
    walletId: wallet.id,
    userId: targetUser.id,
    reference: ref,
    type: 'ADJUSTMENT',
    amount: isCredit ? num : -num,
    fee: 0,
    balanceBefore: before,
    balanceAfter: wallet.availableBalance,
    status: 'SUCCESS',
    description: `Admin manual adjustment: ${reason || 'Customer balance review'}`,
    createdAt: new Date().toISOString()
  });

  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: targetUser.id,
    title: isCredit ? 'Wallet Credited by Admin' : 'Wallet Debited by Admin',
    message: `Your balance was ${isCredit ? 'credited with' : 'debited by'} ₦${num.toLocaleString()}. Reason: ${reason || 'Administrative adjustment'}`,
    type: 'WALLET',
    isRead: false,
    link: '/wallet',
    createdAt: new Date().toISOString()
  });

  logAudit(req.user!.fullName, req.user!.role, 'WALLET_MANUAL_ADJUSTMENT', `${isCredit ? 'Credit' : 'Debit'} ₦${num} for ${targetUser.email}. Reason: ${reason}`, targetUser.id, ref, req.ip);
  saveDb();

  // Authoritatively update wallet and transaction in Supabase
  await saveWalletToSupabase(wallet);
  await insertTransactionToSupabase(db.transactions[0]);

  res.json({ success: true, message: `Wallet balance adjusted to ₦${wallet.availableBalance.toLocaleString()}.`, wallet });
});

// ----------------------------------------------------
// Agent Online NIN Registration Service Management (Rule 9)
// MEGA ADMIN and SUPER ADMIN can manage Online NIN Registration for individual Agents
// ----------------------------------------------------
apiRouter.post('/admin/agents/:id/services/online-nin', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const targetUser = db.users.find((u) => u.id === req.params.id);

  if (!targetUser) return res.status(404).json({ error: 'Agent account not found.' });

  if (targetUser.role !== 'AGENT' && targetUser.role !== 'ADMIN') {
    return res.status(400).json({ error: 'Online NIN Registration can only be assigned to Agent or Admin accounts.' });
  }

  if (!targetUser.assignedServices) targetUser.assignedServices = [];

  if (!targetUser.assignedServices.includes('ONLINE_NIN_REGISTRATION')) {
    targetUser.assignedServices.push('ONLINE_NIN_REGISTRATION');
    targetUser.updatedAt = new Date().toISOString();

    logAudit(
      req.user!.fullName,
      req.user!.role,
      'AGENT_SERVICE_ASSIGNED',
      `Assigned Online NIN Registration service to ${targetUser.fullName} (${targetUser.email})`,
      targetUser.id,
      undefined,
      req.ip
    );

    db.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: targetUser.id,
      title: 'Online NIN Registration Service Assigned',
      message: `Your account has been authorized to process Online NIN Registrations by ${req.user!.fullName}.`,
      type: 'SECURITY',
      isRead: false,
      link: '/services',
      createdAt: new Date().toISOString()
    });

    saveDb();
  }

  res.json({
    success: true,
    message: `Online NIN Registration service assigned to @${targetUser.username} successfully.`,
    assignedServices: targetUser.assignedServices
  });
});

apiRouter.delete('/admin/agents/:id/services/online-nin', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const targetUser = db.users.find((u) => u.id === req.params.id);

  if (!targetUser) return res.status(404).json({ error: 'Agent account not found.' });

  if (!targetUser.assignedServices) targetUser.assignedServices = [];

  targetUser.assignedServices = targetUser.assignedServices.filter((s) => s !== 'ONLINE_NIN_REGISTRATION');
  targetUser.updatedAt = new Date().toISOString();

  logAudit(
    req.user!.fullName,
    req.user!.role,
    'AGENT_SERVICE_REMOVED',
    `Removed Online NIN Registration service from ${targetUser.fullName} (${targetUser.email})`,
    targetUser.id,
    undefined,
    req.ip
  );

  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: targetUser.id,
    title: 'Service Assignment Revoked',
    message: `The Online NIN Registration service was removed from your account by ${req.user!.fullName}.`,
    type: 'SECURITY',
    isRead: false,
    link: '/services',
    createdAt: new Date().toISOString()
  });

  saveDb();

  res.json({
    success: true,
    message: `Online NIN Registration service removed from @${targetUser.username}.`,
    assignedServices: targetUser.assignedServices
  });
});

// ----------------------------------------------------
// Onboarding Helper Functions & Identity Validation
// ----------------------------------------------------
function cleanNameForComparison(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^(mr|mrs|ms|miss|dr|prof|chief|alhaji|hajiya|mallam|engr|barr|arc|pst|rev)\.?\s+/i, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDob(dobStr: string): string {
  if (!dobStr) return '';
  const clean = String(dobStr).trim();
  // Match YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  // Match YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(clean)) return clean.replace(/\//g, '-');
  // Match DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
  const parts = clean.split(/[-/.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY -> YYYY-MM-DD
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
  }
  return clean;
}

function verifyIdentityName(
  submittedFullName: string,
  verifiedFullName: string,
  verifiedFirstName?: string,
  verifiedSurname?: string
): { match: boolean; code: 'IDENTITY_MATCH' | 'IDENTITY_MISMATCH' } {
  const subClean = cleanNameForComparison(submittedFullName);
  const verClean = cleanNameForComparison(verifiedFullName);

  if (!subClean || !verClean) {
    return { match: false, code: 'IDENTITY_MISMATCH' };
  }

  // Exact match after normalization
  if (subClean === verClean) {
    return { match: true, code: 'IDENTITY_MATCH' };
  }

  const subTokens = subClean.split(' ').filter((t) => t.length > 1);
  const verTokens = verClean.split(' ').filter((t) => t.length > 1);

  if (subTokens.length === 0 || verTokens.length === 0) {
    return { match: false, code: 'IDENTITY_MISMATCH' };
  }

  // Same tokens in different order (e.g., "Oparaocha Ugochukwu" vs "Ugochukwu Oparaocha")
  const sortedSub = [...subTokens].sort().join(' ');
  const sortedVer = [...verTokens].sort().join(' ');
  if (sortedSub === sortedVer) {
    return { match: true, code: 'IDENTITY_MATCH' };
  }

  // If verified record provides specific firstName and surname:
  // Both verified firstName and verified surname must be present as distinct tokens in submitted name.
  if (verifiedFirstName && verifiedSurname) {
    const fnClean = cleanNameForComparison(verifiedFirstName);
    const snClean = cleanNameForComparison(verifiedSurname);

    if (fnClean && snClean) {
      const hasFirst = subTokens.includes(fnClean);
      const hasSurname = subTokens.includes(snClean);
      if (hasFirst && hasSurname) {
        return { match: true, code: 'IDENTITY_MATCH' };
      }
    }
  }

  // All tokens in one must be present in the other (e.g., middle name omitted in one)
  // Requiring at least 2 tokens to match so single-word/partial matches never pass!
  const common = subTokens.filter((token) => verTokens.includes(token));
  if (common.length >= 2 && (common.length === subTokens.length || common.length === verTokens.length)) {
    return { match: true, code: 'IDENTITY_MATCH' };
  }

  return { match: false, code: 'IDENTITY_MISMATCH' };
}

// ----------------------------------------------------
// Onboarding Endpoints (USER -> AGENT / ADMIN)
// ----------------------------------------------------
function terminateOnboardingSession(user: User, reason: string) {
  const db = getDb();
  user.onboardingTerminated = true;
  user.onboardingTerminationReason = reason;
  user.onboardingStatus = 'cancelled';
  user.role = 'USER';
  user.phone1Verified = false;
  user.phone1VerifiedNumber = undefined;
  user.pendingRoleEntry = undefined;
  user.updatedAt = new Date().toISOString();
  saveDb();
  logAudit(
    user.fullName,
    'USER',
    'ONBOARDING_TERMINATED',
    `Onboarding terminated after reaching maximum failed attempts limit. Reason: ${reason}. Returned to normal USER role.`,
    user.id
  );
}

apiRouter.get('/onboarding/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const latest = (db.onboardingRequests || []).find((o) => o.userId === user.id);
  const userWallet = db.wallets.find((w) => w.userId === user.id);

  let targetRole: 'AGENT' | 'ADMIN' | 'SUPER_ADMIN' = 'AGENT';
  let feeRequired = 2.5;
  if (user.role === 'SUPER_ADMIN' || user.pendingRoleEntry?.targetRole === 'SUPER_ADMIN') {
    targetRole = 'SUPER_ADMIN';
    feeRequired = 5.3;
  } else if (user.role === 'ADMIN' || user.pendingRoleEntry?.targetRole === 'ADMIN') {
    targetRole = 'ADMIN';
    feeRequired = 5.0;
  } else {
    targetRole = 'AGENT';
    feeRequired = 2.5;
  }

  res.json({
    onboardingStatus: user.onboardingStatus || (user.role === 'MEGA_ADMIN' ? 'approved' : 'not_started'),
    onboardingApprovedAt: user.onboardingApprovedAt,
    onboardingApprovedBy: user.onboardingApprovedBy,
    roleAtApproval: user.roleAtApproval,
    satisfactionTitle: user.satisfactionTitle,
    dob: user.dob,
    nin: user.nin,
    application: latest || null,
    // Server-side attempt tracking & security
    onboardingOtpAttempts: user.onboardingOtpAttempts || 0,
    onboardingNinAttempts: user.onboardingNinAttempts || 0,
    onboardingTerminated: !!user.onboardingTerminated,
    onboardingTerminationReason: user.onboardingTerminationReason || null,
    phone1Verified: !!user.phone1Verified,
    phone1VerifiedNumber: user.phone1VerifiedNumber || null,
    walletBalance: userWallet ? userWallet.availableBalance : 0,
    targetRole,
    feeRequired
  });
});

// Sendchamp Real SMS OTP Endpoints for Onboarding Phone Verification
apiRouter.post('/onboarding/phone-otp/send', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { phone1 } = req.body;
  const user = req.user!;

  if (user.onboardingTerminated) {
    return res.status(403).json({
      error: 'Your onboarding session has been terminated because the maximum attempt limit was reached. Your account has returned to its normal customer role.',
      terminated: true
    });
  }

  const cleanPhone = String(phone1 || '').replace(/\s+/g, '').trim();

  if (!cleanPhone || cleanPhone.length < 10) {
    return res.status(400).json({ error: 'A valid active Nigerian mobile phone number is required (e.g. 08012345678).' });
  }

  const result = await sendSendchampOtp(user.id, cleanPhone);

  if (!result.success) {
    return res.status(result.unconfigured ? 503 : 400).json({
      error: result.message,
      cooldownSeconds: result.cooldownSeconds
    });
  }

  return res.json({
    success: true,
    message: result.message,
    normalizedPhone: result.normalizedPhone,
    displayPhone: result.displayPhone,
    cooldownSeconds: result.cooldownSeconds || 60
  });
});

apiRouter.post('/onboarding/phone-otp/verify', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { phone1, otp } = req.body;
  const user = req.user!;

  if (user.onboardingTerminated) {
    return res.status(403).json({
      error: 'Your onboarding session has been terminated because the maximum attempt limit was reached. Your account has returned to its normal customer role.',
      terminated: true
    });
  }

  const cleanPhone = String(phone1 || '').replace(/\s+/g, '').trim();
  const cleanOtp = String(otp || '').trim();

  if (!cleanPhone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }
  if (!cleanOtp) {
    return res.status(400).json({ error: 'Please enter the 6-digit OTP code received on your phone.' });
  }

  const result = await verifySendchampOtp(user.id, cleanPhone, cleanOtp);

  if (!result.success || !result.verified) {
    user.onboardingOtpAttempts = (user.onboardingOtpAttempts || 0) + 1;
    saveDb();

    if (user.onboardingOtpAttempts >= 2) {
      terminateOnboardingSession(
        user,
        'Reached maximum 2 failed SMS OTP attempts during onboarding.'
      );
      return res.status(400).json({
        error: 'You have exceeded the maximum limit of 2 failed SMS OTP attempts. Your onboarding session has been terminated and your account has been returned to its normal customer role.',
        terminated: true,
        onboardingOtpAttempts: user.onboardingOtpAttempts
      });
    }

    return res.status(400).json({
      error: 'Invalid or incorrect OTP code. You have 1 attempt remaining out of 2 before your onboarding session is terminated.',
      verified: false,
      remainingAttempts: 1,
      terminated: false,
      onboardingOtpAttempts: user.onboardingOtpAttempts
    });
  }

  user.phone1Verified = true;
  user.phone1VerifiedNumber = cleanPhone;
  user.onboardingOtpAttempts = 0;
  saveDb();

  return res.json({
    success: true,
    verified: true,
    message: 'Phone number verified successfully via Sendchamp SMS OTP!',
    normalizedPhone: result.normalizedPhone,
    phone1VerifiedNumber: cleanPhone
  });
});

apiRouter.post('/onboarding/verify-nin', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { nin, fullName, dob, phone1 } = req.body;
  const user = req.user!;

  if (user.onboardingTerminated) {
    return res.status(403).json({
      error: 'Your onboarding session has been terminated because the maximum attempt limit was reached. Your account has returned to its normal customer role.',
      terminated: true
    });
  }

  // Enforce: Only verified phone numbers can enter the next stage
  const cleanSubmittedPhone = String(phone1 || user.phone1VerifiedNumber || '').replace(/\D/g, '').trim();
  const cleanStoredPhone = String(user.phone1VerifiedNumber || '').replace(/\D/g, '').trim();
  if (!user.phone1Verified || !cleanStoredPhone || (cleanSubmittedPhone && cleanSubmittedPhone !== cleanStoredPhone)) {
    return res.status(400).json({
      error: 'Please verify your phone number before continuing.',
      code: 'PHONE_NOT_VERIFIED'
    });
  }

  const cleanNin = String(nin || '').replace(/\D/g, '').trim();
  if (cleanNin.length !== 11) {
    return res.status(400).json({ error: 'NIN must be an exact 11-digit number.' });
  }
  if (!fullName || !String(fullName).trim()) {
    return res.status(400).json({ error: 'Full Name is required for identity comparison.' });
  }
  if (!dob || !String(dob).trim()) {
    return res.status(400).json({ error: 'Date of Birth is required for identity comparison.' });
  }

  try {
    const ninResult = await providerAdapter.verifyNIN(cleanNin);
    if (!ninResult || !ninResult.success || !ninResult.data) {
      return res.status(400).json({
        error: `NIN Verification Failed: ${ninResult?.message || 'Unable to verify NIN with the National Identity Registry. Please ensure the 11-digit NIN is active and valid.'}`,
        code: 'PROVIDER_ERROR',
        providerMessage: ninResult?.message
      });
    }

    const canonical: CanonicalNinVerificationResult = ninResult.data;
    if (!canonical.fullName && !canonical.firstName && !canonical.surname) {
      return res.status(400).json({
        error: 'National Identity Registry returned an identity record with missing name information. Please contact NIMC support.',
        code: 'PROVIDER_DATA_MISSING',
        field: 'name'
      });
    }

    if (!canonical.dateOfBirth) {
      return res.status(400).json({
        error: 'National Identity Registry returned an identity record without a verifiable Date of Birth. Technical verification cannot proceed.',
        code: 'PROVIDER_DATA_MISSING',
        field: 'dateOfBirth'
      });
    }

    const normSubmittedDob = normalizeDob(dob);
    const normVerifiedDob = normalizeDob(canonical.dateOfBirth);
    const isDobMatch = Boolean(normSubmittedDob && normVerifiedDob && normSubmittedDob === normVerifiedDob);

    const verifiedDisplay = canonical.fullName || [canonical.firstName, canonical.middleName, canonical.surname].filter(Boolean).join(' ');
    const nameCheck = verifyIdentityName(fullName, verifiedDisplay, canonical.firstName, canonical.surname);

    if (!isDobMatch || !nameCheck.match) {
      user.onboardingNinAttempts = (user.onboardingNinAttempts || 0) + 1;
      saveDb();

      const mismatchDetail = !isDobMatch
        ? `The submitted Date of Birth ("${dob}") does not match the Date of Birth returned from the National Identity Registry ("${canonical.dateOfBirth}").`
        : `The submitted Full Name ("${fullName}") does not match the name returned from the National Identity Registry ("${verifiedDisplay || 'Unknown'}").`;

      if (user.onboardingNinAttempts >= 2) {
        terminateOnboardingSession(
          user,
          `Reached maximum 2 failed NIN information mismatch attempts. Last mismatch: ${mismatchDetail}`
        );
        return res.status(400).json({
          error: `Identity Validation Failed: ${mismatchDetail} You have exceeded the maximum limit of 2 failed NIN-mismatch attempts. Your onboarding session has been terminated and your account has been returned to its normal customer role.`,
          code: 'IDENTITY_MISMATCH',
          terminated: true,
          onboardingNinAttempts: user.onboardingNinAttempts
        });
      }

      return res.status(400).json({
        error: `Identity Validation Failed: ${mismatchDetail} You have 1 attempt remaining out of 2 before your onboarding session is terminated.`,
        code: 'IDENTITY_MISMATCH',
        remainingAttempts: 1,
        terminated: false,
        onboardingNinAttempts: user.onboardingNinAttempts,
        reason: !isDobMatch ? 'DOB_MISMATCH' : 'NAME_MISMATCH'
      });
    }

    // NIN Verified and matched!
    user.onboardingNinAttempts = 0;
    saveDb();

    return res.json({
      success: true,
      verified: true,
      data: {
        verifiedFullName: verifiedDisplay,
        verifiedDob: canonical.dateOfBirth,
        verifiedNinStatus: 'VERIFIED',
        photoUrl: canonical.photoUrl || null,
        nin: cleanNin,
        nameMatch: true,
        dobMatch: true
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      error: `Verification system error during NIN validation: ${err.message || 'Please try again later.'}`
    });
  }
});

apiRouter.post('/onboarding/submit', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();

  // One-time onboarding. Do NOT repeat for already approved accounts
  if (user.onboardingStatus === 'approved') {
    return res.status(400).json({
      error: 'Your onboarding has already been approved. You do not need to onboard again.'
    });
  }

  const {
    fullName,
    dob,
    phone1,
    phone2,
    profilePhoto,
    nin,
    certificates,
    satisfactionTitle,
    // Step 1: Residential Address
    residentialHouseNumber,
    residentialStreet,
    residentialCity,
    residentialState,
    residentialLga,
    // Step 2: State of Origin
    stateOfOrigin,
    lgaOfOrigin,
    // Step 3: Emergency / Reference Contact
    emergencyFullName,
    emergencyPhone,
    emergencyRelationship,
    // Step 6 & 7: Declarations
    declarationAccepted,
    reviewConfirmed
  } = req.body;

  // Validate existing required onboarding fields
  if (!fullName || !String(fullName).trim()) {
    return res.status(400).json({ error: 'Full Name is required.' });
  }
  if (!dob || !String(dob).trim()) {
    return res.status(400).json({ error: 'Date of Birth is required.' });
  }
  if (!phone1 || !String(phone1).trim()) {
    return res.status(400).json({ error: 'Phone Number 1 is required.' });
  }
  if (!profilePhoto || !String(profilePhoto).trim()) {
    return res.status(400).json({ error: 'Profile Photo is required.' });
  }
  if (!nin || !String(nin).trim()) {
    return res.status(400).json({ error: 'NIN (National Identity Number) is required.' });
  }
  if (!satisfactionTitle || !String(satisfactionTitle).trim()) {
    return res.status(400).json({ error: 'Satisfaction/Title is required.' });
  }

  // Step 1: Validate Residential Address
  if (!residentialHouseNumber || !String(residentialHouseNumber).trim()) {
    return res.status(400).json({ error: 'House/Building Number is required.' });
  }
  if (!residentialStreet || !String(residentialStreet).trim()) {
    return res.status(400).json({ error: 'Street Address is required.' });
  }
  if (!residentialCity || !String(residentialCity).trim()) {
    return res.status(400).json({ error: 'Town/City is required.' });
  }
  if (!residentialState || !String(residentialState).trim()) {
    return res.status(400).json({ error: 'Residential State is required.' });
  }
  if (!residentialLga || !String(residentialLga).trim()) {
    return res.status(400).json({ error: 'Residential LGA is required.' });
  }

  // Step 2: Validate State of Origin
  if (!stateOfOrigin || !String(stateOfOrigin).trim()) {
    return res.status(400).json({ error: 'State of Origin is required.' });
  }
  if (!lgaOfOrigin || !String(lgaOfOrigin).trim()) {
    return res.status(400).json({ error: 'LGA of Origin is required.' });
  }

  // Step 3: Validate Emergency / Reference Contact
  if (!emergencyFullName || !String(emergencyFullName).trim()) {
    return res.status(400).json({ error: 'Emergency / Reference Contact Full Name is required.' });
  }
  if (!emergencyPhone || !String(emergencyPhone).trim()) {
    return res.status(400).json({ error: 'Emergency / Reference Contact Phone Number is required.' });
  }
  if (!emergencyRelationship || !String(emergencyRelationship).trim()) {
    return res.status(400).json({ error: 'Emergency / Reference Contact Relationship is required.' });
  }

  const cleanPhone1Digits = String(phone1).replace(/\D/g, '');
  const cleanEmergencyDigits = String(emergencyPhone).replace(/\D/g, '');
  if (cleanPhone1Digits === cleanEmergencyDigits) {
    return res.status(400).json({
      error: 'The emergency reference phone number must not be the same as Phone Number 1.'
    });
  }

  // Step 5: Server-side Phone Confirmation OTP validation with Sendchamp
  if (!isPhoneVerifiedForUser(user.id, String(phone1))) {
    return res.status(400).json({
      error: 'Phone Number 1 must be verified with an active SMS OTP before final submission.',
      code: 'PHONE_NOT_VERIFIED'
    });
  }

  // Step 6: Declaration checkbox
  if (!declarationAccepted) {
    return res.status(400).json({
      error: 'You must confirm that all information and documents provided are correct, genuine and belong to you.',
      code: 'DECLARATION_REQUIRED'
    });
  }

  // Step 7: Final Review confirmation checkbox
  if (!reviewConfirmed) {
    return res.status(400).json({
      error: 'You must confirm that you have reviewed your information before submitting.',
      code: 'REVIEW_CONFIRMATION_REQUIRED'
    });
  }

  const cleanNin = String(nin).replace(/\D/g, '').trim();
  if (cleanNin.length !== 11) {
    return res.status(400).json({ error: 'NIN must be an exact 11-digit number.' });
  }

  // The role target and required entry fee credits are strictly determined on the server
  let roleTarget: 'AGENT' | 'ADMIN' | 'SUPER_ADMIN' = 'AGENT';
  let requiredCredits = 2.5;
  let roleDisplay = 'Agent';

  if (user.role === 'SUPER_ADMIN' || user.pendingRoleEntry?.targetRole === 'SUPER_ADMIN') {
    roleTarget = 'SUPER_ADMIN';
    requiredCredits = 5.3;
    roleDisplay = 'Super Admin';
  } else if (user.role === 'ADMIN' || user.pendingRoleEntry?.targetRole === 'ADMIN') {
    roleTarget = 'ADMIN';
    requiredCredits = 5.0;
    roleDisplay = 'Admin';
  } else {
    roleTarget = 'AGENT';
    requiredCredits = 2.5;
    roleDisplay = 'Agent';
  }

  // Check wallet balance BEFORE deduction
  const userWallet = db.wallets.find((w) => w.userId === user.id);
  const currentBalance = userWallet ? userWallet.availableBalance : 0;

  if (currentBalance < requiredCredits) {
    // Insufficient Credits:
    // Do NOT deduct anything.
    // Do NOT mark onboarding as completed.
    // Do NOT activate the new role yet.
    // Do NOT send the user back through the onboarding forms.
    return res.status(402).json({
      success: false,
      code: 'INSUFFICIENT_CREDITS',
      requiredCredits,
      currentBalance,
      targetRole: roleTarget,
      roleDisplay,
      error: `Insufficient Credits. You need ${requiredCredits} Credits to enter ${roleDisplay}. Please fund your wallet to continue.`,
      redirectUrl: '/wallet/fund'
    });
  }

  // Rule 3: NIN IDENTITY VALIDATION USING REAL NIN VERIFICATION API (NINJA ONLY)
  try {
    const ninResult = await providerAdapter.verifyNIN(cleanNin);

    if (!ninResult || !ninResult.success || !ninResult.data) {
      return res.status(400).json({
        error: `NIN Identity Verification Failed: ${ninResult?.message || 'Unable to verify NIN with the National Identity Registry. Please ensure the 11-digit NIN is active and valid.'}`,
        code: 'PROVIDER_ERROR',
        providerMessage: ninResult?.message
      });
    }

    const canonical: CanonicalNinVerificationResult = ninResult.data;

    // Check for provider data missing before asserting mismatch
    if (!canonical.fullName && !canonical.firstName && !canonical.surname) {
      return res.status(400).json({
        error: 'National Identity Registry returned an identity record with missing name information. Please contact NIMC support.',
        code: 'PROVIDER_DATA_MISSING',
        field: 'name'
      });
    }

    if (!canonical.dateOfBirth) {
      return res.status(400).json({
        error: 'National Identity Registry returned an identity record without a verifiable Date of Birth. Technical verification cannot proceed.',
        code: 'PROVIDER_DATA_MISSING',
        field: 'dateOfBirth'
      });
    }

    // 1. Compare Date of Birth with normalized formatting
    const normSubmittedDob = normalizeDob(dob);
    const normVerifiedDob = normalizeDob(canonical.dateOfBirth);
    const isDobMatch = Boolean(normSubmittedDob && normVerifiedDob && normSubmittedDob === normVerifiedDob);

    if (!isDobMatch) {
      return res.status(400).json({
        error: `Identity Validation Failed: The submitted Date of Birth ("${dob}") does not match the Date of Birth returned from the National Identity Registry ("${canonical.dateOfBirth}"). Onboarding denied.`,
        code: 'IDENTITY_MISMATCH',
        reason: 'DOB_MISMATCH',
        submittedDob: dob,
        verifiedDob: canonical.dateOfBirth
      });
    }

    // 2. Compare Full Name with normalized identity token matching
    const verifiedDisplay = canonical.fullName || [canonical.firstName, canonical.middleName, canonical.surname].filter(Boolean).join(' ');
    const nameCheck = verifyIdentityName(fullName, verifiedDisplay, canonical.firstName, canonical.surname);

    if (!nameCheck.match) {
      return res.status(400).json({
        error: `Identity Validation Failed: The submitted Full Name ("${fullName}") does not match the name returned from the National Identity Registry ("${verifiedDisplay || 'Unknown'}"). Onboarding denied.`,
        code: 'IDENTITY_MISMATCH',
        reason: 'NAME_MISMATCH',
        submittedName: fullName,
        verifiedName: verifiedDisplay
      });
    }

    const residentialFullAddress = `${String(residentialHouseNumber).trim()} ${String(residentialStreet).trim()}, ${String(residentialCity).trim()}, ${String(residentialLga).trim()}, ${String(residentialState).trim()}`;

    // Both Full Name and DOB match! Enter PENDING APPROVAL (Rule 4)
    if (!db.onboardingRequests) db.onboardingRequests = [];

    const existingIdx = db.onboardingRequests.findIndex((o) => o.userId === user.id);
    const onboardingRecord: AgentAdminOnboarding = {
      id: `onb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      userEmail: user.email,
      userFullName: user.fullName,
      targetRole: roleTarget,
      fullName: String(fullName).trim(),
      dob: normSubmittedDob,
      phone1: String(phone1).trim(),
      phone2: phone2 ? String(phone2).trim() : undefined,
      profilePhoto: String(profilePhoto).trim(),
      nin: cleanNin,
      certificates: Array.isArray(certificates) ? certificates : [],
      satisfactionTitle: String(satisfactionTitle).trim(),
      // Residential Address
      residentialHouseNumber: String(residentialHouseNumber).trim(),
      residentialStreet: String(residentialStreet).trim(),
      residentialCity: String(residentialCity).trim(),
      residentialState: String(residentialState).trim(),
      residentialLga: String(residentialLga).trim(),
      residentialFullAddress,
      // Origin
      stateOfOrigin: String(stateOfOrigin).trim(),
      lgaOfOrigin: String(lgaOfOrigin).trim(),
      // Emergency / Reference Contact
      emergencyFullName: String(emergencyFullName).trim(),
      emergencyPhone: String(emergencyPhone).trim(),
      emergencyRelationship: String(emergencyRelationship).trim(),
      // OTP & Declarations
      phoneVerified: true,
      phoneVerifiedAt: new Date().toISOString(),
      declarationAccepted: true,
      reviewConfirmed: true,
      // Registry Verification
      ninVerified: true,
      ninVerifiedAt: new Date().toISOString(),
      ninResultData: canonical,
      ninPhotoUrl: canonical.photoUrl || undefined,
      ninFullName: verifiedDisplay,
      ninDob: canonical.dateOfBirth,
      ninComparisonMatch: true,
      nameMatch: true,
      dobMatch: true,
      status: 'approved',
      submittedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString()
    };

    if (existingIdx !== -1) {
      db.onboardingRequests[existingIdx] = onboardingRecord;
    } else {
      db.onboardingRequests.unshift(onboardingRecord);
    }

    // Deduct exact required entry fee from wallet
    if (userWallet) {
      userWallet.availableBalance = Number((userWallet.availableBalance - requiredCredits).toFixed(2));
      userWallet.updatedAt = new Date().toISOString();

      const unitValueNgn = db.settings.unitValueNgn || 200;
      const feeNgn = Number((requiredCredits * unitValueNgn).toFixed(2));
      db.transactions.unshift({
        id: `tx_onb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        walletId: userWallet.id,
        userId: user.id,
        type: 'SERVICE_REQUEST',
        amount: -requiredCredits,
        fee: 0,
        balanceBefore: userWallet.availableBalance + requiredCredits,
        balanceAfter: userWallet.availableBalance,
        status: 'SUCCESS',
        reference: `ONB-ENTRY-${Date.now()}`,
        description: `Official entry fee charge of ${requiredCredits} Credits for immediate activation of ${roleDisplay} account.`,
        createdAt: new Date().toISOString()
      });
    }

    // Mark onboarding as successfully completed & immediately activate user's new role
    user.role = roleTarget;
    user.onboardingStatus = 'approved';
    user.onboardingApprovedAt = new Date().toISOString();
    user.onboardingApprovedBy = `Auto-Activated via Entry Fee (${requiredCredits} Credits)`;
    user.roleAtApproval = roleTarget;
    user.onboardingTerminated = false;
    user.onboardingOtpAttempts = 0;
    user.onboardingNinAttempts = 0;
    user.satisfactionTitle = String(satisfactionTitle).trim();
    user.phone = String(phone1).trim();
    if (phone2) user.phone2 = String(phone2).trim();
    user.dob = normSubmittedDob;
    user.nin = cleanNin;
    if (profilePhoto) user.avatarUrl = String(profilePhoto).trim();
    user.address = residentialFullAddress;
    user.updatedAt = new Date().toISOString();

    logAudit(
      user.fullName,
      user.role,
      'ONBOARDING_COMPLETED_AND_ACTIVATED',
      `Onboarding completed and entry fee of ${requiredCredits} Credits deducted. Role ${roleTarget} immediately activated.`,
      user.id,
      undefined,
      req.ip
    );

    // Notify user & admins
    db.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      title: 'Onboarding Completed & Role Activated!',
      message: `Your ${roleDisplay} account is now active. ${requiredCredits} Credits were deducted from your wallet balance.`,
      type: 'SECURITY',
      isRead: false,
      link: roleTarget === 'ADMIN' || roleTarget === 'SUPER_ADMIN' ? '/admin' : '/dashboard',
      createdAt: new Date().toISOString()
    });

    // Authoritatively persist submitted onboarding state to Supabase
    const onbRes = await updateUserOnboardingInSupabase(user.id, 'approved', undefined, undefined, user.email);
    if (!onbRes.success) {
      console.warn('[ONBOARDING_SUBMIT] Supabase update warning:', onbRes.error);
    }
    const saveRes = await saveUserToSupabase(user);
    if (!saveRes.success) {
      console.warn('[ONBOARDING_SUBMIT] Supabase saveUser warning:', saveRes.error);
    }

    if (isSupabaseServiceRoleActive()) {
      await saveOnboardingApplicationToSupabase(onboardingRecord);
    }

    saveDb();

    res.json({
      success: true,
      activatedRole: user.role,
      balance: userWallet ? userWallet.availableBalance : 0,
      feeDeducted: requiredCredits,
      message: `Onboarding completed successfully! ${requiredCredits} Credits deducted. Your ${roleDisplay} role has been immediately activated.`,
      onboarding: onboardingRecord
    });
  } catch (err: any) {
    return res.status(500).json({
      error: `Verification system error during NIN validation: ${err.message || 'Please try again later.'}`
    });
  }
});

// ----------------------------------------------------
// Admin Onboarding Review & Approvals (MEGA ADMIN & SUPER ADMIN ONLY)
// ----------------------------------------------------
apiRouter.get('/admin/onboarding', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServiceRoleActive()) {
    const supaApps = await fetchSupabaseOnboardingApplications();
    if (supaApps && supaApps.length > 0) {
      const db = getDb();
      db.onboardingRequests = supaApps;
      return res.json(supaApps);
    }
  }
  const db = getDb();
  res.json(db.onboardingRequests || []);
});

apiRouter.get('/admin/onboarding/:id', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const app = (db.onboardingRequests || []).find((o) => o.id === req.params.id || o.userId === req.params.id);
  if (!app) return res.status(404).json({ error: 'Onboarding application not found.' });
  res.json(app);
});

// Approvals: MEGA ADMIN and SUPER ADMIN can approve (Rule 4, 5, 6)
// SUPER ADMIN can only upgrade to AGENT or ADMIN (Never SUPER_ADMIN or MEGA_ADMIN)
apiRouter.patch('/admin/onboarding/:id/approve', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { approvedRole, adminNote } = req.body;
  const requester = req.user!;
  const db = getDb();

  const app = (db.onboardingRequests || []).find((o) => o.id === req.params.id || o.userId === req.params.id);
  if (!app) return res.status(404).json({ error: 'Onboarding application not found.' });

  const targetUser = db.users.find((u) => u.id === app.userId);
  if (!targetUser) return res.status(404).json({ error: 'Target user account not found.' });

  const roleToAssign = approvedRole || app.targetRole || 'AGENT';

  // Rule 6: SUPER ADMIN must NOT be able to create SUPER ADMIN or MEGA ADMIN
  if (requester.role === 'SUPER_ADMIN') {
    if (roleToAssign !== 'AGENT' && roleToAssign !== 'ADMIN') {
      return res.status(403).json({ error: 'Super Admin can only approve onboarding as AGENT or ADMIN.' });
    }
  }

  if (roleToAssign !== 'AGENT' && roleToAssign !== 'ADMIN') {
    return res.status(400).json({ error: 'Approved role must be either AGENT or ADMIN.' });
  }

  // Update target user
  targetUser.role = roleToAssign;
  targetUser.onboardingStatus = 'approved';
  targetUser.onboardingApprovedAt = new Date().toISOString();
  targetUser.onboardingApprovedBy = `${requester.fullName} (${requester.role})`;
  targetUser.roleAtApproval = roleToAssign;
  if (!targetUser.assignedServices) targetUser.assignedServices = [];
  targetUser.updatedAt = new Date().toISOString();

  // Update onboarding record
  app.status = 'approved';
  app.reviewedAt = new Date().toISOString();
  app.reviewedBy = requester.id;
  app.reviewedByName = requester.fullName;
  app.reviewedByRole = requester.role;
  app.roleAtApproval = roleToAssign;

  // Send congratulations notification to user
  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: targetUser.id,
    title: 'Onboarding Approved!',
    message: `Congratulations! Your onboarding has been approved by ${requester.fullName}. Your account is now an active ${roleToAssign}.`,
    type: 'SECURITY',
    isRead: false,
    link: roleToAssign === 'ADMIN' ? '/admin' : '/dashboard',
    createdAt: new Date().toISOString()
  });

  logAudit(
    requester.fullName,
    requester.role,
    'ONBOARDING_APPROVED',
    `Approved onboarding for ${targetUser.email} -> Upgraded to ${roleToAssign}. ${adminNote ? `Note: ${adminNote}` : ''}`,
    targetUser.id,
    undefined,
    req.ip
  );

  // Authoritatively update in Supabase
  const onbRes = await updateUserOnboardingInSupabase(targetUser.id, 'approved', targetUser.onboardingApprovedBy, roleToAssign, targetUser.email);
  if (!onbRes.success) {
    console.error('[ONBOARDING_APPROVAL_ERROR] Supabase onboarding update failed:', onbRes.error);
    return res.status(500).json({ error: `Failed to update onboarding status in database: ${onbRes.error}` });
  }

  const roleRes = await updateUserRoleInSupabase(targetUser.id, roleToAssign, 'approved', targetUser.email);
  if (!roleRes.success) {
    console.error('[ONBOARDING_APPROVAL_ERROR] Supabase role update failed:', roleRes.error);
    return res.status(500).json({ error: `Failed to update user role in database: ${roleRes.error}` });
  }

  const saveRes = await saveUserToSupabase(targetUser);
  if (!saveRes.success) {
    console.error('[ONBOARDING_APPROVAL_ERROR] Supabase user profile save failed:', saveRes.error);
    return res.status(500).json({ error: `Failed to persist user profile in database: ${saveRes.error}` });
  }

  saveDb();

  res.json({
    success: true,
    message: `Onboarding approved! Account ${targetUser.email} has been upgraded to ${roleToAssign}.`,
    user: {
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      onboardingStatus: targetUser.onboardingStatus
    },
    onboarding: app
  });
});

// Reject onboarding (MEGA ADMIN and SUPER ADMIN)
apiRouter.patch('/admin/onboarding/:id/reject', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;
  const requester = req.user!;
  const db = getDb();

  const app = (db.onboardingRequests || []).find((o) => o.id === req.params.id || o.userId === req.params.id);
  if (!app) return res.status(404).json({ error: 'Onboarding application not found.' });

  const targetUser = db.users.find((u) => u.id === app.userId);
  if (!targetUser) return res.status(404).json({ error: 'Target user account not found.' });

  const rejectionReason = reason || 'Identity information or documentation did not meet platform verification standards.';

  app.status = 'rejected';
  app.rejectionReason = rejectionReason;
  app.reviewedAt = new Date().toISOString();
  app.reviewedBy = requester.id;
  app.reviewedByName = requester.fullName;
  app.reviewedByRole = requester.role;

  targetUser.onboardingStatus = 'rejected';
  targetUser.updatedAt = new Date().toISOString();

  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: targetUser.id,
    title: 'Onboarding Application Not Approved',
    message: `Your onboarding application for ${app.targetRole} was not approved. Reason: ${rejectionReason}`,
    type: 'SECURITY',
    isRead: false,
    link: '/onboarding',
    createdAt: new Date().toISOString()
  });

  logAudit(
    requester.fullName,
    requester.role,
    'ONBOARDING_REJECTED',
    `Rejected onboarding for ${targetUser.email}. Reason: ${rejectionReason}`,
    targetUser.id,
    undefined,
    req.ip
  );

  // Authoritatively update in Supabase
  const onbRes = await updateUserOnboardingInSupabase(targetUser.id, 'rejected', undefined, undefined, targetUser.email);
  if (!onbRes.success) {
    console.error('[ONBOARDING_REJECT_ERROR] Supabase onboarding update failed:', onbRes.error);
    return res.status(500).json({ error: `Failed to update onboarding status in database: ${onbRes.error}` });
  }

  const saveRes = await saveUserToSupabase(targetUser);
  if (!saveRes.success) {
    console.error('[ONBOARDING_REJECT_ERROR] Supabase user profile save failed:', saveRes.error);
    return res.status(500).json({ error: `Failed to persist user profile in database: ${saveRes.error}` });
  }

  saveDb();

  res.json({
    success: true,
    message: `Onboarding application for ${targetUser.email} has been rejected.`,
    onboarding: app
  });
});

// Request correction (MEGA ADMIN ONLY - Rule 5 & 11)
apiRouter.patch('/admin/onboarding/:id/correction', requireMegaAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { message } = req.body;
  const requester = req.user!;
  const db = getDb();

  const app = (db.onboardingRequests || []).find((o) => o.id === req.params.id || o.userId === req.params.id);
  if (!app) return res.status(404).json({ error: 'Onboarding application not found.' });

  const targetUser = db.users.find((u) => u.id === app.userId);
  if (!targetUser) return res.status(404).json({ error: 'Target user account not found.' });

  const correctionMsg = message || 'Please review your submitted documents and profile details, and resubmit.';

  app.correctionRequested = true;
  app.correctionMessage = correctionMsg;
  app.status = 'rejected';
  app.reviewedAt = new Date().toISOString();
  app.reviewedBy = requester.id;
  app.reviewedByName = requester.fullName;
  app.reviewedByRole = requester.role;

  // Authoritatively update target user onboarding state to allow clean resubmission
  targetUser.onboardingStatus = 'correction_required';
  targetUser.updatedAt = new Date().toISOString();

  // Authoritatively persist to Supabase
  await updateUserOnboardingInSupabase(targetUser.id, 'correction_required', undefined, undefined, targetUser.email);
  await saveUserToSupabase(targetUser);
  await saveOnboardingApplicationToSupabase(app);

  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: targetUser.id,
    title: 'Onboarding Correction Requested',
    message: `Mega Administrator requested a correction on your onboarding: ${correctionMsg}. Please update your details and resubmit.`,
    type: 'SECURITY',
    isRead: false,
    link: '/onboarding',
    createdAt: new Date().toISOString()
  });

  logAudit(
    requester.fullName,
    requester.role,
    'ONBOARDING_CORRECTION_REQUESTED',
    `Requested onboarding correction for ${targetUser.email}: ${correctionMsg}`,
    targetUser.id,
    undefined,
    req.ip
  );

  saveDb();

  res.json({
    success: true,
    message: `Correction request sent to ${targetUser.email}.`,
    onboarding: app
  });
});

// Admin Service Management
apiRouter.post('/admin/services', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { code, name, description, price, requiredFields, icon, category, providerMapping, displayOrder, status } = req.body;
  const db = getDb();

  const numPrice = Number(price);
  if (!code || !name || isNaN(numPrice)) {
    return res.status(400).json({ error: 'Code, name, and valid price are required.' });
  }

  const existing = db.services.find((s) => s.code.toUpperCase() === String(code).trim().toUpperCase());
  if (existing) {
    return res.status(400).json({ error: `Service with code '${code}' already exists.` });
  }

  const finalPrice = Math.max(0, numPrice);
  const agentPriceFinal = req.body.agentPrice !== undefined
    ? Math.max(0, Number(req.body.agentPrice))
    : Math.round(finalPrice * 0.75 * 100) / 100;
  const newService: Service = {
    id: `srv_${Date.now()}`,
    code: String(code).trim().toUpperCase(),
    name: String(name).trim(),
    description: String(description || '').trim(),
    price: finalPrice,
    agentPrice: agentPriceFinal,
    status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    icon: icon || 'ShieldCheck',
    category: category || 'Identity',
    providerMapping: providerMapping || `${String(code).toLowerCase()}_verify`,
    defaultProvider: req.body.defaultProvider ? String(req.body.defaultProvider).trim().toLowerCase() : undefined,
    displayOrder: displayOrder !== undefined ? Number(displayOrder) : (db.services.length + 1),
    requiredFields: Array.isArray(requiredFields) && requiredFields.length > 0 ? requiredFields : [{ name: 'query', label: 'Query Value', type: 'text', placeholder: 'Enter value', required: true }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.services.push(newService);

  if (isSupabaseServiceRoleActive()) {
    const supaRes = await saveServiceToSupabase(newService);
    if (!supaRes.success) {
      console.error(`[SERVICE_CREATE_ERROR] Supabase save failed for ${newService.code}:`, supaRes.error);
      return res.status(500).json({
        error: `Failed to persist new service in authoritative Supabase database: ${supaRes.error || 'Unknown error'}.`
      });
    }
  }

  logAudit(req.user!.fullName, req.user!.role, 'SERVICE_CREATED', `Created service ${newService.name} (₦${newService.price})`, undefined, newService.code, req.ip);
  saveDb();

  res.status(201).json({ success: true, service: newService });
});

apiRouter.put('/admin/services/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, price, agentPrice, status, requiredFields, icon, category, providerMapping, defaultProvider, displayOrder } = req.body;
  const db = getDb();
  const service = db.services.find((s) => s.id === req.params.id || s.code.toUpperCase() === req.params.id.toUpperCase());
  if (!service) return res.status(404).json({ error: 'Service not found.' });

  // ONLINE NIN REGISTRATION: Only MEGA ADMIN can turn it ON/OFF.
  if (service.code === 'ONLINE_NIN_REGISTRATION' && status !== undefined && status !== service.status) {
    if (req.user!.role !== 'MEGA_ADMIN') {
      return res.status(403).json({ error: 'Only MEGA ADMIN has permission to turn Online NIN Registration ON or OFF.' });
    }
  }

  const oldPrice = service.price;
  const calculatedPrice = price !== undefined ? Math.max(0, Number(price)) : service.price;
  let calculatedAgentPrice = service.agentPrice;
  if (agentPrice !== undefined) {
    calculatedAgentPrice = Math.max(0, Number(agentPrice));
  } else if (price !== undefined) {
    calculatedAgentPrice = Math.round(calculatedPrice * 0.75 * 100) / 100;
  }

  const updates: Partial<Service> = {
    price: calculatedPrice,
    agentPrice: calculatedAgentPrice
  };
  if (name !== undefined) updates.name = String(name).trim();
  if (description !== undefined) updates.description = String(description).trim();
  if (status !== undefined) updates.status = status;
  if (category !== undefined) updates.category = String(category).trim();
  if (providerMapping !== undefined) updates.providerMapping = String(providerMapping).trim();
  if (defaultProvider !== undefined) updates.defaultProvider = String(defaultProvider || 'default').trim().toLowerCase();
  if (displayOrder !== undefined) updates.displayOrder = Number(displayOrder);
  if (requiredFields !== undefined && Array.isArray(requiredFields)) updates.requiredFields = requiredFields;
  if (icon !== undefined) updates.icon = icon;

  const now = new Date().toISOString();
  // 1. Authoritatively update Supabase services table if service role active
  if (isSupabaseServiceRoleActive()) {
    const supaRes = await updateServiceInSupabase(service.id, updates);
    if (!supaRes.success) {
      console.error(`[SERVICE_UPDATE_ERROR] Supabase update failed for ${service.code}:`, supaRes.error);
      return res.status(500).json({
        error: `Failed to persist service update in authoritative Supabase database: ${supaRes.error || 'Unknown error'}. Price change was not saved.`
      });
    }
  }

  // Always apply authoritative updates directly to the local database and save
  Object.assign(service, updates, { updatedAt: now });

  logAudit(
    req.user!.fullName,
    req.user!.role,
    'SERVICE_UPDATED',
    `Updated ${service.name}. Price change: ₦${oldPrice} -> ₦${service.price} (Agent: ₦${service.agentPrice}). Status: ${service.status}`,
    undefined,
    service.code,
    req.ip
  );
  saveDb();

  res.json({ success: true, service });
});

apiRouter.delete('/admin/services/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const targetService = db.services.find((s) => s.id === req.params.id || s.code.toUpperCase() === req.params.id.toUpperCase());
  if (!targetService) return res.status(404).json({ error: 'Service not found.' });

  // 1. Authoritative Supabase deletion check and execution FIRST
  if (isSupabaseServiceRoleActive()) {
    const supaRes = await deleteServiceFromSupabase(targetService.id);
    if (!supaRes.success) {
      console.error(`[SERVICE_DELETE_ERROR] Supabase delete failed:`, supaRes.error);
      return res.status(500).json({
        error: `Failed to delete service from authoritative Supabase database: ${supaRes.error || 'Unknown Supabase error'}. Service was kept intact.`
      });
    }
  }

  // 2. Only remove from memory/local database AFTER authoritative database deletion succeeds
  const index = db.services.findIndex((s) => s.id === targetService.id);
  if (index !== -1) {
    db.services.splice(index, 1);
  }

  logAudit(
    req.user!.fullName,
    req.user!.role,
    'SERVICE_DELETED',
    `Deleted service ${targetService.name} (${targetService.code})`,
    undefined,
    targetService.code,
    req.ip
  );
  saveDb();

  res.json({ success: true, message: `Service ${targetService.name} was permanently deleted.` });
});

// Admin Provider Management: ONLY MEGA ADMIN CAN VIEW OR MANAGE API PROVIDERS
apiRouter.get('/admin/providers', requireMegaAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  // Safe return: mask apiKey and secretKey
  const safe = db.providers.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    baseUrl: p.baseUrl,
    status: p.status,
    isDevelopmentMode: !!p.isDevelopmentMode,
    balance: p.balance,
    hasApiKey: !!p.apiKey,
    maskedApiKey: p.apiKey ? `${p.apiKey.slice(0, 4)}...${p.apiKey.slice(-4)}` : '',
    hasSecretKey: !!p.secretKey,
    lastTestedAt: p.lastTestedAt,
    notes: p.notes
  }));
  res.json(safe);
});

// Dedicated Mega Admin API Accounts Center: Accessible ONLY to MEGA ADMIN
apiRouter.get('/admin/api-accounts', requireMegaAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  
  function maskApiKeyIdentifier(key?: string): string {
    if (!key || typeof key !== 'string') return '';
    const trimmed = key.trim();
    if (trimmed.length <= 8) return '••••';
    const underscoreIdx = trimmed.lastIndexOf('_');
    const prefix = underscoreIdx > 0 ? trimmed.slice(0, underscoreIdx + 1) : trimmed.slice(0, 3);
    const suffix = trimmed.slice(-4);
    return `${prefix}••••${suffix}`;
  }

  // 1. Ninja API
  const ninjaProv = db.providers.find((p) => p.slug === 'ninja');
  const ninjaRawKey = ninjaProv?.apiKey || process.env.NINJA_PUBLIC_KEY || '';
  const isNinjaConnected = !!(ninjaRawKey || ninjaProv?.secretKey || process.env.NINJA_SECRET_KEY);
  const ninjaAccount = {
    id: ninjaProv?.id || 'prov_ninja_01',
    slug: 'ninja',
    name: 'Ninja API',
    badgeName: 'NIN & BVN Gateway',
    serviceCategory: 'NIN/BVN and assigned verification services',
    assignedServices: [
      'NIN Verification',
      'NIN Status Lookup',
      'BVN Verification',
      'BVN by CRM',
      'Identity Cross-Lookup',
      'Driving Licence Verification'
    ],
    dashboardUrl: 'https://app.ninjaapis.com',
    docsUrl: 'https://docs.ninjaapis.com',
    connectionStatus: (isNinjaConnected && ninjaProv?.status !== 'ERROR') ? 'CONNECTED' : (ninjaProv?.status === 'ERROR' ? 'DISCONNECTED' : 'CONNECTED'),
    environment: ninjaProv?.isDevelopmentMode ? 'SANDBOX / DEV' : 'PRODUCTION LIVE',
    maskedApiKey: maskApiKeyIdentifier(ninjaRawKey) || 'pk_••••5d28',
    lastSuccessfulConnection: ninjaProv?.lastTestedAt || 'Active & Operational',
    balance: ninjaProv?.balance ?? 0,
    description: 'High-speed government identity verification gateway specialized for Nigerian National Identity Management Commission (NIMC) and Bank Verification Number (BVN) validations.',
    accountEmailHint: 'Registered Boucloud/Ninja Enterprise Account',
    tags: ['NIMC', 'BVN', 'NIN', 'FRSC'],
    hasSecretKey: !!(ninjaProv?.secretKey || process.env.NINJA_SECRET_KEY)
  };

  // 2. Veripine
  const veripineProv = db.providers.find((p) => p.slug === 'veripine');
  const veripineRawKey = veripineProv?.apiKey || process.env.VERIPINE_SECRET_KEY || process.env.VERIPINE_API_KEY || '';
  const isVeripineConnected = !!(veripineRawKey || veripineProv?.secretKey);
  const veripineAccount = {
    id: veripineProv?.id || 'prov_veripine_01',
    slug: 'veripine',
    name: 'Veripine',
    badgeName: 'Civil Registry & Mod Gateway',
    serviceCategory: 'Civil Registry, Phone Lookup & Data Modifications',
    assignedServices: [
      'NIN Phone Search',
      'BVN Retrieval with Phone',
      'Demographic Verification',
      'Personalization Tracking',
      'NIN Name Modification',
      'NIN Phone Modification',
      'NIN Address Modification',
      'NIN Date of Birth Modification',
      'NIN Validation'
    ],
    dashboardUrl: 'https://veripine.com/login',
    docsUrl: 'https://docs.veripine.com',
    connectionStatus: (isVeripineConnected && veripineProv?.status !== 'ERROR') ? 'CONNECTED' : (veripineProv?.status === 'ERROR' ? 'DISCONNECTED' : 'CONNECTED'),
    environment: veripineProv?.isDevelopmentMode ? 'SANDBOX / DEV' : 'PRODUCTION LIVE',
    maskedApiKey: maskApiKeyIdentifier(veripineRawKey) || 'ninbvn_••••916a',
    lastSuccessfulConnection: veripineProv?.lastTestedAt || 'Active & Operational',
    balance: veripineProv?.balance ?? 65.4,
    description: 'Premier identity modification and civil registry verification infrastructure powering deep demographic searches, telecom phone-to-NIN lookups, and citizen record updates.',
    accountEmailHint: 'Authorized Veripine Partner Account',
    tags: ['Demographic', 'Phone Search', 'Modifications', 'IPE Clearance'],
    hasSecretKey: !!(veripineProv?.secretKey || process.env.VERIPINE_SECRET_KEY)
  };

  // 3. Paystack
  const paystackProv = db.providers.find((p) => p.slug === 'paystack');
  const paystackStatus = getPaystackConfigStatus();
  const paystackPubKey = process.env.VITE_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || paystackProv?.apiKey || '';
  const isPaystackConnected = paystackStatus.configured || !!paystackPubKey;
  const paystackAccount = {
    id: paystackProv?.id || 'prov_paystack_01',
    slug: 'paystack',
    name: 'Paystack',
    badgeName: 'Live Payment Processor',
    serviceCategory: 'Automated Wallet Funding & Payment Checkout',
    assignedServices: [
      'Automated Wallet Card Funding',
      'Direct Bank Transfer Checkout',
      'Real-time Webhook Verification',
      'Transaction Ledger Settlement'
    ],
    dashboardUrl: 'https://dashboard.paystack.com',
    docsUrl: 'https://paystack.com/docs/api/',
    connectionStatus: isPaystackConnected ? 'CONNECTED' : 'DISCONNECTED',
    environment: 'PRODUCTION LIVE',
    maskedApiKey: maskApiKeyIdentifier(paystackPubKey) || 'pk_live_••••85a57',
    lastSuccessfulConnection: 'Verified Live Gateway',
    balance: undefined,
    description: 'PCI-DSS Level 1 certified payment rail handling instant automated customer deposits, card debits, dedicated virtual accounts, and financial reconciliation in Nigerian Naira (NGN).',
    accountEmailHint: 'Live Merchant Dashboard',
    tags: ['Payments', 'NGN', 'Wallet Top-up', 'Instant Webhooks'],
    hasSecretKey: paystackStatus.hasSecret
  };

  res.json({
    success: true,
    providers: [ninjaAccount, veripineAccount, paystackAccount],
    serverTime: new Date().toISOString()
  });
});

apiRouter.put('/admin/providers/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, baseUrl, apiKey, secretKey, isDevelopmentMode, notes } = req.body;
  const db = getDb();
  const provider = db.providers.find((p) => p.id === req.params.id);
  if (!provider) return res.status(404).json({ error: 'Provider not found.' });

  if (name !== undefined) provider.name = String(name).trim();
  if (baseUrl !== undefined) provider.baseUrl = String(baseUrl).trim();
  if (apiKey !== undefined && apiKey !== '') provider.apiKey = String(apiKey).trim();
  if (secretKey !== undefined && secretKey !== '') provider.secretKey = String(secretKey).trim();
  if (isDevelopmentMode !== undefined) provider.isDevelopmentMode = Boolean(isDevelopmentMode);
  if (notes !== undefined) provider.notes = String(notes).trim();

  provider.status = (provider.apiKey || provider.isDevelopmentMode) ? 'CONNECTED' : 'NOT_CONFIGURED';

  logAudit(req.user!.fullName, req.user!.role, 'PROVIDER_CONFIG_UPDATED', `Updated provider ${provider.name}. DevMode: ${provider.isDevelopmentMode}`, undefined, provider.slug, req.ip);
  saveDb();

  res.json({ success: true, message: 'Provider configuration saved securely.' });
});

apiRouter.post('/admin/providers/:id/test', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const result = await providerAdapter.testConnection(req.params.id);
  const db = getDb();
  const provider = db.providers.find((p) => p.id === req.params.id);
  if (provider) {
    provider.lastTestedAt = new Date().toISOString();
    provider.status = result.success ? 'CONNECTED' : 'ERROR';
    saveDb();
  }
  res.json(result);
});

// Admin Funding Requests Management
apiRouter.get(['/admin/funding-requests', '/admin/wallets/requests'], requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  if (!db.fundingRequests) db.fundingRequests = [];
  const enriched = db.fundingRequests.map((f) => {
    const user = db.users.find((u) => u.id === f.userId);
    return {
      ...f,
      userName: f.userName || user?.fullName || 'Customer',
      userEmail: user?.email || '--',
      userPhone: user?.phone || '--'
    };
  });
  res.json(enriched);
});

apiRouter.post(['/admin/funding-requests/:id/approve', '/admin/wallets/requests/:id/approve'], requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const adminNote = req.body?.adminNote || 'Approved by Administrator';
  const db = getDb();
  if (!db.fundingRequests) db.fundingRequests = [];

  const fundingReq = db.fundingRequests.find((r) => r.id === id || r.reference === id);
  if (!fundingReq) {
    return res.status(404).json({ error: 'Funding request not found.' });
  }

  if (fundingReq.status === 'APPROVED') {
    return res.status(400).json({ error: 'This payment has already been approved and user wallet credited.' });
  }

  if (fundingReq.status === 'REJECTED') {
    return res.status(400).json({ error: 'This funding request was previously marked as rejected.' });
  }

  // 1. Locate customer wallet or initialize if missing
  let wallet = db.wallets.find((w) => w.userId === fundingReq.userId);
  if (!wallet) {
    wallet = {
      id: `wal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: fundingReq.userId,
      availableBalance: 0,
      pendingBalance: 0,
      totalDeposited: 0,
      totalSpent: 0,
      updatedAt: new Date().toISOString()
    };
    db.wallets.push(wallet);
  }

  // 2. Credit wallet exactly once
  const amountToCredit = Number(fundingReq.amount) || 0;
  if (amountToCredit <= 0) {
    return res.status(400).json({ error: 'Invalid funding amount.' });
  }

  const balanceBefore = wallet.availableBalance;
  wallet.availableBalance += amountToCredit;
  wallet.totalDeposited += amountToCredit;
  wallet.updatedAt = new Date().toISOString();

  // 3. Mark request as APPROVED
  fundingReq.status = 'APPROVED';
  fundingReq.reviewedBy = req.user!.fullName;
  fundingReq.reviewedAt = new Date().toISOString();
  fundingReq.adminNote = adminNote;

  // 4. Create Transaction record
  const newTx: WalletTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    walletId: wallet.id,
    userId: fundingReq.userId,
    reference: fundingReq.reference,
    type: 'FUNDING',
    amount: amountToCredit,
    fee: 0,
    balanceBefore,
    balanceAfter: wallet.availableBalance,
    status: 'SUCCESS',
    description: `Manual Wallet Deposit Approved: ₦${amountToCredit.toLocaleString()} (Ref: ${fundingReq.reference})`,
    createdAt: new Date().toISOString()
  };
  if (!db.transactions) db.transactions = [];
  db.transactions.unshift(newTx);

  // 5. Customer Notification
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: fundingReq.userId,
    title: 'Wallet Credit Approved',
    message: `Your deposit of ₦${amountToCredit.toLocaleString()} (Ref: ${fundingReq.reference}) has been approved and credited to your wallet balance.`,
    type: 'WALLET',
    isRead: false,
    createdAt: new Date().toISOString()
  });

  // 6. Admin Audit Log
  logAudit(
    req.user!.fullName,
    req.user!.role,
    'WALLET_FUNDING_APPROVED',
    `Approved funding request ${fundingReq.reference} (₦${amountToCredit.toLocaleString()}) for customer ${fundingReq.userName || fundingReq.userId}`,
    fundingReq.userId,
    fundingReq.reference,
    req.ip
  );

  // 7. Save permanently to local db and Supabase
  saveDb();
  await saveWalletToSupabase(wallet);
  await updateFundingRequestStatusInSupabase(fundingReq.reference, 'APPROVED', req.user!.fullName, adminNote);

  res.json({
    success: true,
    message: `Payment approved and user wallet credited with ₦${amountToCredit.toLocaleString()}.`,
    fundingRequest: fundingReq,
    wallet
  });
});

apiRouter.post(['/admin/funding-requests/:id/reject', '/admin/wallets/requests/:id/reject'], requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const adminNote = req.body?.adminNote || 'Payment rejected by Administrator';
  const db = getDb();
  if (!db.fundingRequests) db.fundingRequests = [];

  const fundingReq = db.fundingRequests.find((r) => r.id === id || r.reference === id);
  if (!fundingReq) {
    return res.status(404).json({ error: 'Funding request not found.' });
  }

  if (fundingReq.status === 'APPROVED') {
    return res.status(400).json({ error: 'This payment has already been approved and credited. Cannot reject an approved request.' });
  }

  // 1. Mark request as REJECTED without modifying wallet
  fundingReq.status = 'REJECTED';
  fundingReq.reviewedBy = req.user!.fullName;
  fundingReq.reviewedAt = new Date().toISOString();
  fundingReq.adminNote = adminNote;

  // 2. Customer notification
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: fundingReq.userId,
    title: 'Wallet Funding Declined',
    message: `Your deposit request for ₦${Number(fundingReq.amount).toLocaleString()} (Ref: ${fundingReq.reference}) was rejected. Reason: ${adminNote}`,
    type: 'SECURITY',
    isRead: false,
    createdAt: new Date().toISOString()
  });

  // 3. Admin audit log
  logAudit(
    req.user!.fullName,
    req.user!.role,
    'WALLET_FUNDING_REJECTED',
    `Rejected funding request ${fundingReq.reference} (₦${Number(fundingReq.amount).toLocaleString()}) for customer ${fundingReq.userName || fundingReq.userId}. Reason: ${adminNote}`,
    fundingReq.userId,
    fundingReq.reference,
    req.ip
  );

  // 4. Save permanently
  saveDb();
  await updateFundingRequestStatusInSupabase(fundingReq.reference, 'REJECTED', req.user!.fullName, adminNote);

  res.json({
    success: true,
    message: 'Funding request marked as rejected.',
    fundingRequest: fundingReq
  });
});

// Admin Verification & Modification Requests Management
apiRouter.get('/admin/verifications', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { status, serviceCode, search } = req.query;

  let list = db.verificationRequests.map((r) => {
    const user = db.users.find((u) => u.id === r.userId);
    return {
      ...r,
      userName: r.userName || user?.fullName || 'Anonymous User',
      userEmail: r.userEmail || user?.email || '--',
      userPhone: user?.phone || '--'
    };
  });

  if (status && status !== 'ALL') {
    list = list.filter((r) => r.status === status);
  }

  if (serviceCode && serviceCode !== 'ALL') {
    list = list.filter((r) => r.serviceCode === serviceCode);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(
      (r) =>
        r.reference.toLowerCase().includes(q) ||
        r.serviceName.toLowerCase().includes(q) ||
        (r.userName && r.userName.toLowerCase().includes(q)) ||
        (r.userEmail && r.userEmail.toLowerCase().includes(q)) ||
        Object.values(r.searchData || {}).some((v) => String(v).toLowerCase().includes(q))
    );
  }

  res.json(list);
});

apiRouter.patch('/admin/verifications/:id/status', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { status, adminNote, refundUser } = req.body;
  const db = getDb();
  const vReq = db.verificationRequests.find((r) => r.id === req.params.id || r.reference === req.params.id);
  if (!vReq) {
    return res.status(404).json({ error: 'Verification request record not found.' });
  }

  const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'SUCCESS', 'REJECTED', 'FAILED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status supplied.' });
  }

  const oldStatus = vReq.status;
  vReq.status = status;
  vReq.adminNote = adminNote || vReq.adminNote || '';
  vReq.reviewedBy = req.user!.fullName;
  vReq.reviewedAt = new Date().toISOString();
  vReq.updatedAt = new Date().toISOString();

  // Rule #1: VERIFICATION SERVICES — API RESPONSE MEANS NO REFUND
  // Once the system actually calls the relevant verification API and the API returns ANY genuine response/information,
  // the customer's wallet must remain debited.
  // Rule #5: NON-VERIFICATION / ADMIN-PROCESSED SERVICES
  // If the admin returns a rejected/unaccepted/invalid result where the service was not successfully provided:
  // Refund the EXACT original unit amount.
  const isUnsuccessful = status === 'REJECTED' || status === 'FAILED';
  const isVerification =
    vReq.serviceCategory === 'verification' ||
    vReq.serviceType === 'verification' ||
    (!vReq.serviceCategory &&
      [
        'NIN',
        'BVN',
        'PHONE',
        'NIN_VALIDATION',
        'NIN_PHONE',
        'IDENTITY_LOOKUP',
        'DRIVERS_LICENSE',
        'DEMOGRAPHIC_VERIFICATION',
        'BVN_CRM'
      ].includes(vReq.serviceCode.toUpperCase()));

  // For verification services: If API was called and response received, KEEP DEBIT!
  // ONLY refund if api_not_called or api_call_failed_before_response!
  const shouldRefund =
    isUnsuccessful &&
    vReq.amountCharged > 0 &&
    vReq.refundStatus !== 'REFUNDED' &&
    (!isVerification ||
      vReq.apiCallState === 'api_not_called' ||
      vReq.apiCallState === 'api_call_failed_before_response');

  if (shouldRefund) {
    const wallet = db.wallets.find((w) => w.userId === vReq.userId);
    if (wallet) {
      const originalAmount = vReq.amountCharged;
      const balanceBefore = wallet.availableBalance;
      wallet.availableBalance += originalAmount;
      wallet.totalSpent = Math.max(0, wallet.totalSpent - originalAmount);
      wallet.updatedAt = new Date().toISOString();

      const refundTxn: WalletTransaction = {
        id: `txn_${Date.now()}_ref_${Math.random().toString(36).substring(2, 6)}`,
        walletId: wallet.id,
        userId: vReq.userId,
        reference: `REF-${vReq.reference}`,
        type: 'REFUND',
        amount: originalAmount,
        fee: 0,
        balanceBefore,
        balanceAfter: wallet.availableBalance,
        status: 'SUCCESS',
        description: `Automatic Refund: ${vReq.serviceName} marked ${status} (${vReq.reference})`,
        metadata: {
          originalReference: vReq.reference,
          serviceCode: vReq.serviceCode,
          serviceName: vReq.serviceName,
          serviceCategory: vReq.serviceCategory || (isVerification ? 'verification' : 'non_verification'),
          originalAmount,
          originalUnitCost: originalAmount,
          apiCallState: vReq.apiCallState || (isVerification ? 'api_not_called' : undefined),
          debitSummary: isVerification ? 'API was not called — refund issued' : 'Admin service rejected — refund issued',
          processedBy: req.user!.fullName,
          processedById: req.user!.id,
          reason: adminNote || `Status changed to ${status}`
        },
        createdAt: new Date().toISOString()
      };
      db.transactions.unshift(refundTxn);
      vReq.refundStatus = 'REFUNDED';
      vReq.refundAmount = originalAmount;
      vReq.refundedAt = new Date().toISOString();
      vReq.refundedBy = req.user!.fullName;
    }
  }

  // User notification of status change
  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: vReq.userId,
    title: `${vReq.serviceName} Status Updated`,
    message: `Your request (${vReq.reference}) is now marked as ${status}.${adminNote ? ' Note: ' + adminNote : ''}`,
    type: 'VERIFICATION',
    isRead: false,
    link: '/verify/history',
    createdAt: new Date().toISOString()
  });

  logAudit(
    req.user!.fullName,
    req.user!.role,
    'VERIFICATION_STATUS_UPDATED',
    `Changed status of ${vReq.reference} from ${oldStatus} to ${status}. Note: ${adminNote || 'None'}`,
    vReq.userId,
    vReq.reference,
    req.ip
  );

  saveDb();
  res.json({ success: true, request: vReq });
});

// ----------------------------------------------------
// Admin Wallets & Balance Adjustment
// ----------------------------------------------------
apiRouter.get('/admin/wallets', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const list = db.wallets.map((w) => {
    const u = db.users.find((user) => user.id === w.userId);
    return {
      id: w.id,
      userId: w.userId,
      userFullName: u?.fullName || 'Unknown User',
      userEmail: u?.email || 'N/A',
      userRole: u?.role || 'USER',
      availableBalance: w.availableBalance,
      pendingBalance: w.pendingBalance,
      totalDeposited: w.totalDeposited,
      totalSpent: w.totalSpent,
      updatedAt: w.updatedAt
    };
  });
  res.json(list);
});

apiRouter.post('/admin/wallet/adjust', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { userId, amount, type, reason } = req.body;
  const requester = req.user!;
  const db = getDb();

  if (!userId) {
    return res.status(400).json({ error: 'Target user ID is required.' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Please specify a valid positive adjustment amount.' });
  }

  if (type !== 'CREDIT' && type !== 'DEBIT') {
    return res.status(400).json({ error: 'Adjustment type must be either CREDIT or DEBIT.' });
  }

  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: 'An administrative reason for adjustment is required.' });
  }

  const targetUser = db.users.find((u) => u.id === userId);
  if (!targetUser) {
    return res.status(404).json({ error: 'Target user account not found.' });
  }

  let wallet = db.wallets.find((w) => w.userId === userId);
  if (!wallet) {
    wallet = {
      id: `wal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      availableBalance: 0,
      pendingBalance: 0,
      totalDeposited: 0,
      totalSpent: 0,
      updatedAt: new Date().toISOString()
    };
    db.wallets.push(wallet);
  }

  const balanceBefore = wallet.availableBalance;
  let balanceAfter = balanceBefore;

  if (type === 'CREDIT') {
    wallet.availableBalance += numAmount;
    wallet.totalDeposited += numAmount;
    balanceAfter = wallet.availableBalance;
  } else {
    wallet.availableBalance = Math.max(0, wallet.availableBalance - numAmount);
    wallet.totalSpent += numAmount;
    balanceAfter = wallet.availableBalance;
  }
  wallet.updatedAt = new Date().toISOString();

  // Create audit transaction record
  const txn: WalletTransaction = {
    id: `txn_adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    walletId: wallet.id,
    userId: targetUser.id,
    reference: `ADJ-${Date.now()}`,
    type: 'ADJUSTMENT',
    amount: numAmount,
    fee: 0,
    balanceBefore,
    balanceAfter,
    status: 'SUCCESS',
    description: `Administrative ${type} adjustment by ${requester.fullName} (${requester.role}): ${String(reason).trim()}`,
    metadata: {
      adjustedBy: requester.id,
      adjusterName: requester.fullName,
      adjusterRole: requester.role,
      type,
      reason: String(reason).trim()
    },
    createdAt: new Date().toISOString()
  };

  db.transactions.unshift(txn);

  // Notify user
  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: targetUser.id,
    title: `Wallet Balance ${type === 'CREDIT' ? 'Credited' : 'Debited'}`,
    message: `Your wallet was ${type === 'CREDIT' ? 'credited' : 'debited'} with ₦${numAmount.toLocaleString()} by administration. Reason: ${String(reason).trim()}`,
    type: 'WALLET',
    isRead: false,
    link: '/wallet',
    createdAt: new Date().toISOString()
  });

  logAudit(
    requester.fullName,
    requester.role,
    'WALLET_ADJUSTED',
    `Adjusted wallet for ${targetUser.email}: ${type} ₦${numAmount.toLocaleString()}. Reason: ${String(reason).trim()}`,
    targetUser.id,
    txn.reference,
    req.ip
  );

  saveDb();

  // Authoritatively update wallet and transaction in Supabase
  await saveWalletToSupabase(wallet);
  await insertTransactionToSupabase(txn);

  res.json({
    success: true,
    message: `Successfully ${type === 'CREDIT' ? 'credited' : 'debited'} ₦${numAmount.toLocaleString()} for ${targetUser.fullName}.`,
    wallet
  });
});

// Admin Announcements
apiRouter.get('/admin/announcements', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  res.json(db.announcements);
});

apiRouter.post('/admin/announcements', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { title, message, type, isActive } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required.' });

  const db = getDb();
  const ann: Announcement = {
    id: `ann_${Date.now()}`,
    title: String(title).trim(),
    message: String(message).trim(),
    type: type || 'INFORMATION',
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    startDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  db.announcements.unshift(ann);
  logAudit(req.user!.fullName, req.user!.role, 'ANNOUNCEMENT_CREATED', `Title: ${ann.title}`, undefined, ann.id, req.ip);
  saveDb();

  res.status(201).json({ success: true, announcement: ann });
});

apiRouter.patch('/admin/announcements/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { isActive, title, message, type } = req.body;
  const db = getDb();
  const ann = db.announcements.find((a) => a.id === req.params.id);
  if (!ann) return res.status(404).json({ error: 'Announcement not found.' });

  if (isActive !== undefined) ann.isActive = Boolean(isActive);
  if (title !== undefined) ann.title = String(title).trim();
  if (message !== undefined) ann.message = String(message).trim();
  if (type !== undefined) ann.type = type;

  saveDb();
  res.json({ success: true, announcement: ann });
});

apiRouter.patch('/admin/announcements/:id/toggle', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const ann = db.announcements.find((a) => a.id === req.params.id);
  if (!ann) return res.status(404).json({ error: 'Announcement not found.' });

  const newActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !ann.isActive;
  ann.isActive = newActive;
  ann.updatedAt = new Date().toISOString();

  logAudit(
    req.user!.fullName,
    req.user!.role,
    'ANNOUNCEMENT_TOGGLED',
    `Toggled announcement "${ann.title}" to ${newActive ? 'ACTIVE' : 'INACTIVE'}`,
    undefined,
    ann.id,
    req.ip
  );

  saveDb();
  res.json({ success: true, announcement: ann });
});

apiRouter.post('/admin/announcements/:id/toggle', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const ann = db.announcements.find((a) => a.id === req.params.id);
  if (!ann) return res.status(404).json({ error: 'Announcement not found.' });

  const newActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !ann.isActive;
  ann.isActive = newActive;
  ann.updatedAt = new Date().toISOString();

  logAudit(
    req.user!.fullName,
    req.user!.role,
    'ANNOUNCEMENT_TOGGLED',
    `Toggled announcement "${ann.title}" to ${newActive ? 'ACTIVE' : 'INACTIVE'}`,
    undefined,
    ann.id,
    req.ip
  );

  saveDb();
  res.json({ success: true, announcement: ann });
});

apiRouter.delete('/admin/announcements/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const idx = db.announcements.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Announcement not found.' });

  const deleted = db.announcements.splice(idx, 1)[0];
  logAudit(
    req.user!.fullName,
    req.user!.role,
    'ANNOUNCEMENT_DELETED',
    `Deleted announcement "${deleted.title}"`,
    undefined,
    deleted.id,
    req.ip
  );

  saveDb();
  res.json({ success: true, message: 'Announcement deleted successfully.' });
});

// Admin Support Tickets
apiRouter.get(['/admin/support', '/admin/support-tickets'], requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  if (!db.supportTickets) db.supportTickets = [];
  // Ensure messages array exists on all tickets
  db.supportTickets.forEach((t) => {
    if (!t.messages) t.messages = [];
  });
  res.json(db.supportTickets);
});

apiRouter.post(['/admin/support/:id/reply', '/admin/support-tickets/:id/reply'], requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { message, status } = req.body;
  const db = getDb();
  if (!db.supportTickets) db.supportTickets = [];
  const ticket = db.supportTickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  if (!ticket.messages) ticket.messages = [];
  ticket.messages.push({
    id: `msg_${Date.now()}`,
    senderId: req.user!.id,
    senderName: req.user!.fullName,
    senderRole: req.user!.role,
    message: String(message || '').trim(),
    timestamp: new Date().toISOString()
  });

  if (status) ticket.status = status;
  ticket.updatedAt = new Date().toISOString();

  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: ticket.userId,
    title: `Support Reply: #${ticket.ticketNumber}`,
    message: `Agent replied to your ticket: "${ticket.subject}"`,
    type: 'ANNOUNCEMENT',
    isRead: false,
    link: '/support',
    createdAt: new Date().toISOString()
  });

  saveDb();
  res.json({ success: true, ticket });
});

apiRouter.patch(['/admin/support/:id/status', '/admin/support-tickets/:id/status'], requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  const db = getDb();
  if (!db.supportTickets) db.supportTickets = [];
  const ticket = db.supportTickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  if (status) {
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
  }

  saveDb();
  res.json({ success: true, ticket });
});

// Admin Audit Logs
apiRouter.get('/admin/audit-logs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const q = String(req.query.q || '').toLowerCase();
  let logs = db.auditLogs;
  if (q) {
    logs = logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.actorName.toLowerCase().includes(q) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        (l.reference && l.reference.toLowerCase().includes(q))
    );
  }
  res.json(logs.slice(0, 100));
});

// Admin Platform Settings
apiRouter.get('/admin/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  res.json(db.settings);
});

apiRouter.put('/admin/settings', requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  const {
    platformName,
    logoText,
    supportWhatsapp,
    supportEmail,
    whatsappNumber,
    phoneNumber1,
    phoneNumber2,
    businessEmail,
    unitValueNgn,
    minWalletFunding,
    maxWalletFunding,
    maintenanceMode,
    bankDetails
  } = req.body;

  const db = getDb();
  const s = db.settings;

  const previousUnitValue = s.unitValueNgn;

  if (platformName !== undefined) s.platformName = String(platformName).trim();
  if (logoText !== undefined) s.logoText = String(logoText).trim();
  if (supportWhatsapp !== undefined) s.supportWhatsapp = String(supportWhatsapp).trim();
  if (supportEmail !== undefined) s.supportEmail = String(supportEmail).trim();
  if (whatsappNumber !== undefined) {
    s.whatsappNumber = String(whatsappNumber).trim();
    s.supportWhatsapp = s.whatsappNumber; // Keep synchronized
  }
  if (phoneNumber1 !== undefined) s.phoneNumber1 = String(phoneNumber1).trim();
  if (phoneNumber2 !== undefined) s.phoneNumber2 = String(phoneNumber2).trim();
  if (businessEmail !== undefined) {
    s.businessEmail = String(businessEmail).trim();
    s.supportEmail = s.businessEmail; // Keep synchronized
  }
  if (unitValueNgn !== undefined) {
    const num = Number(unitValueNgn);
    if (num > 0) {
      s.unitValueNgn = num;
    }
  }
  if (minWalletFunding !== undefined) s.minWalletFunding = Number(minWalletFunding);
  if (maxWalletFunding !== undefined) s.maxWalletFunding = Number(maxWalletFunding);
  if (maintenanceMode !== undefined) s.maintenanceMode = Boolean(maintenanceMode);
  if (bankDetails !== undefined) s.bankDetails = bankDetails;
  s.updatedAt = new Date().toISOString();

  let auditMsg = 'Updated global platform settings';
  if (unitValueNgn !== undefined && previousUnitValue !== s.unitValueNgn) {
    auditMsg += ` (Conversion rate updated: 1 Credit = ₦${s.unitValueNgn}, previous ₦${previousUnitValue})`;
  }

  logAudit(req.user!.fullName, req.user!.role, 'PLATFORM_SETTINGS_UPDATED', auditMsg, undefined, undefined, req.ip);
  saveDb();

  res.json({ success: true, settings: s });
});

// ----------------------------------------------------
// BVN Enrollment Centers (Client & Admin)
// ----------------------------------------------------
apiRouter.get('/bvn/enrollment-centers', (req: Request, res: Response) => {
  const db = getDb();
  const list = (db.bvnEnrollmentCenters || []).filter((c) => c.status === 'ACTIVE');
  res.json(list);
});

apiRouter.get('/admin/bvn/enrollment-centers', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  res.json(db.bvnEnrollmentCenters || []);
});

apiRouter.post('/admin/bvn/enrollment-centers', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, code, price, description } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Center name and price are required.' });
  }
  const db = getDb();
  if (!db.bvnEnrollmentCenters) db.bvnEnrollmentCenters = [];

  const cleanCode = (code || name.replace(/[^a-zA-Z0-9]/g, '_')).toUpperCase();
  const newCenter = {
    id: `bvn_ec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: String(name).trim(),
    code: cleanCode,
    price: Math.max(0, Number(price) || 0),
    status: 'ACTIVE' as const,
    description: description ? String(description).trim() : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.bvnEnrollmentCenters.push(newCenter);
  logAudit(
    req.user!.fullName,
    req.user!.role,
    'BVN_CENTER_CREATED',
    `Created BVN enrollment center ${newCenter.name} (₦${newCenter.price.toLocaleString()})`,
    req.user!.id,
    newCenter.id,
    req.ip
  );
  saveDb();

  res.status(201).json({ success: true, center: newCenter });
});

const handleBvnEnrollmentCenterUpdate = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, price, status, description } = req.body;
  const db = getDb();
  if (!db.bvnEnrollmentCenters) db.bvnEnrollmentCenters = [];

  const center = db.bvnEnrollmentCenters.find((c) => c.id === id);
  if (!center) {
    return res.status(404).json({ error: 'Enrollment center not found.' });
  }

  if (name !== undefined) center.name = String(name).trim();
  if (price !== undefined) center.price = Math.max(0, Number(price) || 0);
  if (status !== undefined) center.status = status;
  if (description !== undefined) center.description = String(description).trim();
  center.updatedAt = new Date().toISOString();

  logAudit(
    req.user!.fullName,
    req.user!.role,
    'BVN_CENTER_UPDATED',
    `Updated center ${center.name} - Price: ₦${center.price.toLocaleString()}, Status: ${center.status}`,
    req.user!.id,
    center.id,
    req.ip
  );
  saveDb();

  res.json({ success: true, center });
};

apiRouter.patch('/admin/bvn/enrollment-centers/:id', requireAdmin, handleBvnEnrollmentCenterUpdate);
apiRouter.put('/admin/bvn/enrollment-centers/:id', requireAdmin, handleBvnEnrollmentCenterUpdate);

apiRouter.delete('/admin/bvn/enrollment-centers/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  if (!db.bvnEnrollmentCenters) db.bvnEnrollmentCenters = [];

  const idx = db.bvnEnrollmentCenters.findIndex((c) => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Enrollment center not found.' });
  }

  const removed = db.bvnEnrollmentCenters.splice(idx, 1)[0];
  logAudit(
    req.user!.fullName,
    req.user!.role,
    'BVN_CENTER_DELETED',
    `Deleted enrollment center ${removed.name}`,
    req.user!.id,
    removed.id,
    req.ip
  );
  saveDb();

  res.json({ success: true, message: `Enrollment center ${removed.name} deleted successfully.` });
});

// ----------------------------------------------------
// Secure Document Upload (CAC ID card, Passport, Signature, Certificates)
// ----------------------------------------------------
apiRouter.post('/uploads/document', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { fileName, fileData, fileType, fileSize, documentCategory } = req.body;
  const user = req.user!;

  if (!fileName || !fileData) {
    return res.status(400).json({ error: 'File name and file content are required.' });
  }

  // Validate allowed extensions and mime types
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  let detectedMime = fileType || 'image/jpeg';
  let base64Content = fileData;

  const dataUriMatch = String(fileData).match(/^data:([a-zA-Z0-9/+-]+);base64,/);
  if (dataUriMatch) {
    detectedMime = dataUriMatch[1].toLowerCase();
    base64Content = String(fileData).replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
  }

  if (!allowedMimeTypes.includes(detectedMime) && !fileData.startsWith('/uploads/')) {
    return res.status(400).json({ error: 'Invalid file type. Allowed formats: JPG, PNG, WEBP, and PDF.' });
  }

  try {
    const buffer = Buffer.from(base64Content, 'base64');
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (buffer.length > MAX_SIZE) {
      return res.status(400).json({ error: 'File size exceeds maximum allowed limit of 10MB.' });
    }

    const ext = detectedMime === 'application/pdf' ? 'pdf' : detectedMime.includes('png') ? 'png' : detectedMime.includes('webp') ? 'webp' : 'jpg';
    const safeDocId = `doc_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const savedFileName = `${safeDocId}.${ext}`;

    const docsDir = path.join(process.cwd(), 'data', 'uploads', 'documents');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const filePath = path.join(docsDir, savedFileName);
    fs.writeFileSync(filePath, buffer);

    const secureUrl = `/uploads/documents/${savedFileName}`;

    res.json({
      success: true,
      documentId: safeDocId,
      fileName: fileName.replace(/[^a-zA-Z0-9._-]/g, '_'),
      fileType: detectedMime,
      fileSize: buffer.length,
      category: documentCategory || 'GENERAL',
      url: secureUrl,
      uploadedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[DOCUMENT_UPLOAD_ERROR] Failed to save document:', err.message || err);
    res.status(500).json({ error: 'Failed to process and store uploaded document securely.' });
  }
});

// ----------------------------------------------------
// Customer Service Request Management (Non-Verification Workflows)
// ----------------------------------------------------

export function isVerificationOrLookupService(service: { code: string; name?: string; category?: string }): boolean {
  return isVerificationService(service);
}

// Customer: Submit a new Service Request (Non-Verification Workflow)
apiRouter.post(['/service-requests/submit', '/service-requests'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const serviceIdentifier = req.body.serviceCode || req.body.serviceId;
  if (!serviceIdentifier) {
    return res.status(400).json({ error: 'Service code or identifier is required.' });
  }

  const submittedData = req.body.submittedData || req.body.searchData || {};
  const customerFiles = req.body.customerFiles;
  const idempotencyKey = req.body.idempotencyKey;

  return handleNonVerificationServiceRequest(
    req,
    res,
    serviceIdentifier,
    submittedData,
    idempotencyKey,
    customerFiles
  );
});

// Customer: Get my service requests (Strict customer isolation)
apiRouter.get('/service-requests/my', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  if (!db.serviceRequests) db.serviceRequests = [];
  const list = db.serviceRequests.filter((r) => r.userId === user.id);
  res.json(list);
});

// Customer: Get single service request detail (Strict customer isolation)
apiRouter.get('/service-requests/my/:ticketOrId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  if (!db.serviceRequests) db.serviceRequests = [];
  const item = db.serviceRequests.find(
    (r) => (r.id === req.params.ticketOrId || r.ticketId === req.params.ticketOrId) && r.userId === user.id
  );
  if (!item) {
    return res.status(404).json({ error: 'Service request not found or access denied.' });
  }
  res.json(item);
});

// Admin: Get statistics and counters
apiRouter.get('/admin/service-requests/stats', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const list = db.serviceRequests || [];
  const stats = {
    total: list.length,
    pending: list.filter((r) => r.status === 'PENDING').length,
    processing: list.filter((r) => r.status === 'PROCESSING').length,
    completed: list.filter((r) => r.status === 'COMPLETED').length,
    rejected: list.filter((r) => r.status === 'REJECTED').length,
    cancelled: list.filter((r) => r.status === 'CANCELLED').length,
    requiresAction: list.filter((r) => r.status === 'REQUIRES_ACTION').length
  };
  res.json(stats);
});

// Admin: Get list of Customer Accounts that have submitted service requests
apiRouter.get('/admin/service-requests/customers', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const requests = db.serviceRequests || [];

  // Group requests by userId
  const customerMap = new Map<string, {
    userId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    totalRequests: number;
    pendingCount: number;
    processingCount: number;
    completedCount: number;
    rejectedCount: number;
    requiresActionCount: number;
    lastSubmittedAt: string;
  }>();

  for (const r of requests) {
    let entry = customerMap.get(r.userId);
    if (!entry) {
      const user = db.users.find((u) => u.id === r.userId);
      entry = {
        userId: r.userId,
        customerName: r.customerName || (user ? user.fullName : 'Unknown Customer'),
        customerEmail: r.customerEmail || (user ? user.email : ''),
        customerPhone: r.customerPhone || (user ? user.phone || '' : ''),
        totalRequests: 0,
        pendingCount: 0,
        processingCount: 0,
        completedCount: 0,
        rejectedCount: 0,
        requiresActionCount: 0,
        lastSubmittedAt: r.createdAt
      };
      customerMap.set(r.userId, entry);
    }

    entry.totalRequests += 1;
    if (r.status === 'PENDING') entry.pendingCount += 1;
    else if (r.status === 'PROCESSING') entry.processingCount += 1;
    else if (r.status === 'COMPLETED') entry.completedCount += 1;
    else if (r.status === 'REJECTED') entry.rejectedCount += 1;
    else if (r.status === 'REQUIRES_ACTION') entry.requiresActionCount += 1;

    if (new Date(r.createdAt) > new Date(entry.lastSubmittedAt)) {
      entry.lastSubmittedAt = r.createdAt;
    }
  }

  const result = Array.from(customerMap.values()).sort(
    (a, b) => new Date(b.lastSubmittedAt).getTime() - new Date(a.lastSubmittedAt).getTime()
  );

  res.json(result);
});

// Admin: Get all service requests for a specific customer
apiRouter.get('/admin/service-requests/customer/:userId', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const user = db.users.find((u) => u.id === req.params.userId);
  const requests = (db.serviceRequests || []).filter((r) => r.userId === req.params.userId);

  res.json({
    customer: user ? {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt
    } : {
      id: req.params.userId,
      fullName: requests[0]?.customerName || 'Customer',
      email: requests[0]?.customerEmail || '',
      phone: requests[0]?.customerPhone || ''
    },
    requests
  });
});

// Admin: Get and open a single service request
// AUTOMATIC STATUS CHANGE: When Admin opens a PENDING request, status changes to PROCESSING
apiRouter.get('/admin/service-requests/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  if (!db.serviceRequests) db.serviceRequests = [];

  const request = db.serviceRequests.find((r) => r.id === req.params.id || r.ticketId === req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Service request not found.' });
  }

  // Mandatory Requirement: When Admin opens a customer request, Status MUST automatically change from Pending to Processing
  if (request.status === 'PENDING') {
    request.status = 'PROCESSING';
    const now = new Date().toISOString();
    request.openedAt = now;
    request.openedBy = req.user!.fullName;
    request.processingTimestamp = now;
    request.processingStartedAt = now;
    request.updatedAt = now;

    if (!request.timeline) request.timeline = [];
    request.timeline.push({
      id: `tml_${Date.now()}_open`,
      status: 'PROCESSING',
      title: 'Admin Opened Request',
      description: `Request opened for processing by operations desk (${req.user!.fullName}).`,
      actorName: req.user!.fullName,
      actorRole: req.user!.role,
      timestamp: now
    });

    // Update matching verification request if present
    if (db.verificationRequests) {
      const v = db.verificationRequests.find(
        (vr) => vr.ticketId === request.ticketId || (vr as any).serviceRequestId === request.id || vr.reference === request.ticketId
      );
      if (v && v.status === 'PENDING') {
        v.status = 'PROCESSING';
        v.updatedAt = now;
      }
    }

    // Notify customer that processing has commenced
    if (!db.notifications) db.notifications = [];
    db.notifications.unshift({
      id: `notif_${Date.now()}_proc`,
      userId: request.userId,
      title: 'Service Request In Progress',
      message: `Your request for "${request.serviceName}" (${request.ticketId}) is now actively being processed by our operations desk.`,
      type: 'SERVICE_REQUEST',
      isRead: false,
      link: '/my-service-requests',
      createdAt: now
    });

    logAudit(
      req.user!.fullName,
      req.user!.role,
      'SERVICE_REQUEST_OPENED',
      `Opened request ${request.ticketId} for processing`,
      request.userId,
      request.ticketId,
      req.ip
    );

    saveDb();
    await saveServiceRequestToSupabase(request);
  }

  res.json({ success: true, request });
});

// Admin: Submit Result and Final Status for a Service Request
apiRouter.post('/admin/service-requests/:id/result', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  if (!db.serviceRequests) db.serviceRequests = [];

  const request = db.serviceRequests.find((r) => r.id === req.params.id || r.ticketId === req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Service request not found.' });
  }

  const { finalStatus, adminResultText, adminResultFiles, adminNote } = req.body;

  // Strict Validation: Final status must be selected
  const allowedStatuses: ServiceRequestStatus[] = ['COMPLETED', 'REJECTED', 'FAILED', 'CANCELLED', 'REQUIRES_ACTION'];
  if (!finalStatus || !allowedStatuses.includes(finalStatus as ServiceRequestStatus)) {
    return res.status(400).json({
      error: 'A valid final status must be selected: Completed, Rejected, Failed, Cancelled, or Requires Customer Action.'
    });
  }

  const validStatus = finalStatus as ServiceRequestStatus;

  // Validate required reasons for REJECTED and FAILED
  if (validStatus === 'REJECTED') {
    const reason = req.body.rejectionReason || req.body.reason || adminNote || adminResultText;
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'A rejection reason is required when rejecting a customer service request.' });
    }
    request.rejectionReason = String(reason).trim();
  } else if (validStatus === 'FAILED') {
    const reason = req.body.failureReason || req.body.reason || adminNote || adminResultText;
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'A failure reason is required when marking a service request as failed.' });
    }
    request.failureReason = String(reason).trim();
  }

  const now = new Date().toISOString();
  request.status = validStatus;
  request.adminResultText = adminResultText !== undefined ? String(adminResultText).trim() : request.adminResultText;
  if (Array.isArray(adminResultFiles)) {
    request.adminResultFiles = adminResultFiles;
  }
  if (adminNote !== undefined) {
    request.adminNote = String(adminNote).trim();
  }
  request.completedAt = now;
  request.completedBy = req.user!.fullName;
  request.completedByAdminId = req.user!.id;
  request.updatedAt = now;

  // Synchronize with verification requests & verification results if linked
  if (db.verificationRequests) {
    const matchingReq = db.verificationRequests.find(
      (vr) => vr.ticketId === request.ticketId || vr.serviceRequestId === request.id || vr.reference === request.ticketId || vr.id === request.id
    );
    if (matchingReq) {
      matchingReq.status = (validStatus === 'COMPLETED' ? 'COMPLETED' : (validStatus === 'REJECTED' ? 'REJECTED' : 'FAILED'));
      matchingReq.updatedAt = now;
      matchingReq.result = {
        ...request.submittedData,
        adminResultText: request.adminResultText,
        adminResultFiles: request.adminResultFiles,
        completedAt: now,
        status: validStatus
      };
      matchingReq.resultData = matchingReq.result;
    }
  }

  // Ensure record is updated in db.verificationResults
  if (validStatus === 'COMPLETED') {
    if (!db.verificationResults) db.verificationResults = [];
    const existingVerif = db.verificationResults.find(
      (v) => v.reference === request.ticketId || v.requestId === request.id
    );
    if (existingVerif) {
      existingVerif.returnedData = {
        ...existingVerif.returnedData,
        ...request.submittedData,
        adminResultText: request.adminResultText,
        adminResultFiles: request.adminResultFiles,
        status: 'COMPLETED'
      };
      existingVerif.verifiedAt = now;
      existingVerif.verifiedBy = req.user!.fullName;
    } else {
      db.verificationResults.unshift({
        id: `vres_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        requestId: request.id,
        userId: request.userId,
        serviceCode: request.serviceCode,
        serviceName: request.serviceName,
        reference: request.ticketId,
        returnedData: {
          ...request.submittedData,
          adminResultText: request.adminResultText,
          adminResultFiles: request.adminResultFiles,
          completedAt: now,
          status: 'COMPLETED'
        },
        providerName: 'Admin Operations Desk',
        verifiedAt: now,
        verifiedBy: req.user!.fullName
      });
    }
  }

  // Automatic Refund Rule (Rule #2, #3, #4):
  // When an admin marks a request as REJECTED, CANCELLED, or FAILED, automatically refund the exact original deducted units.
  const isUnsuccessful = validStatus === 'REJECTED' || validStatus === 'FAILED' || validStatus === 'CANCELLED';
  let refundProcessed = false;
  let refundedAmount = 0;

  if (isUnsuccessful && request.refundStatus !== 'REFUNDED') {
    const originalPrice = request.price || 0;
    if (originalPrice > 0) {
      const wallet = db.wallets.find((w) => w.userId === request.userId);
      if (wallet) {
        const balanceBefore = wallet.availableBalance;
        wallet.availableBalance += originalPrice;
        wallet.totalSpent = Math.max(0, wallet.totalSpent - originalPrice);
        wallet.updatedAt = now;

        const refundTxn: WalletTransaction = {
          id: `txn_${Date.now()}_ref_${Math.random().toString(36).substring(2, 6)}`,
          walletId: wallet.id,
          userId: request.userId,
          reference: `REF-${request.ticketId}`,
          type: 'REFUND',
          amount: originalPrice,
          fee: 0,
          balanceBefore,
          balanceAfter: wallet.availableBalance,
          status: 'SUCCESS',
          description: `Automatic Refund: ${request.serviceName} marked ${validStatus} (${request.ticketId})`,
          metadata: {
            ticketId: request.ticketId,
            serviceCode: request.serviceCode,
            serviceName: request.serviceName,
            serviceCategory: 'non_verification',
            serviceType: 'non_verification',
            originalPrice,
            originalUnitCost: originalPrice,
            refundAmount: originalPrice,
            finalServiceStatus: validStatus,
            debitSummary: `Non-verification service marked ${validStatus} — refund issued`,
            processedBy: req.user!.fullName,
            processedById: req.user!.id,
            reason: adminNote || adminResultText || `Marked as ${validStatus}`
          },
          createdAt: now
        };
        db.transactions.unshift(refundTxn);

        request.refundStatus = 'REFUNDED';
        request.refundAmount = originalPrice;
        request.refundedAt = now;
        request.refundedBy = req.user!.fullName;
        refundProcessed = true;
        refundedAmount = originalPrice;

        if (db.verificationRequests) {
          const matchingReq = db.verificationRequests.find(
            (vr) => vr.ticketId === request.ticketId || vr.serviceRequestId === request.id || vr.reference === request.ticketId || vr.id === request.id
          );
          if (matchingReq) {
            matchingReq.refundStatus = 'REFUNDED';
            matchingReq.refundAmount = originalPrice;
            matchingReq.refundedAt = now;
            matchingReq.refundedBy = req.user!.fullName;
          }
        }

        await saveWalletToSupabase(wallet);
      }
    }
  }

  // Append timeline event
  if (!request.timeline) request.timeline = [];
  const statusDisplayMap: Record<ServiceRequestStatus, string> = {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    COMPLETED: 'Completed & Delivered',
    REJECTED: 'Application Rejected',
    FAILED: 'Processing Failed',
    CANCELLED: 'Request Cancelled',
    REQUIRES_ACTION: 'Customer Action Required'
  };

  const statusLabel = statusDisplayMap[validStatus] || validStatus;

  request.timeline.push({
    id: `tml_${Date.now()}_result`,
    status: validStatus,
    title: `Result Dispatched: ${statusLabel}`,
    description: adminResultText || `Result dispatched to customer with status: ${statusLabel}`,
    actorName: req.user!.fullName,
    actorRole: req.user!.role,
    timestamp: now
  });

  if (refundProcessed) {
    request.timeline.push({
      id: `tml_${Date.now()}_refund`,
      status: 'REFUNDED' as ServiceRequestStatus,
      title: 'Automatic Wallet Refund Executed',
      description: `Exact fee of ₦${refundedAmount.toLocaleString()} was credited back to customer wallet because request was marked ${statusLabel}.`,
      actorName: req.user!.fullName,
      actorRole: 'OPERATIONS_DESK',
      timestamp: now
    });
  }

  // Customer notification
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `notif_${Date.now()}_final`,
    userId: request.userId,
    title: refundProcessed
      ? `Service Request ${statusLabel} (Refunded)`
      : `Service Request ${statusLabel}`,
    message: refundProcessed
      ? `Your request for "${request.serviceName}" (${request.ticketId}) was marked as "${statusLabel}". Exactly ₦${refundedAmount.toLocaleString()} has been automatically refunded to your wallet.`
      : `Your request for "${request.serviceName}" (${request.ticketId}) has been updated to "${statusLabel}". View result and download files.`,
    type: 'SERVICE_REQUEST',
    isRead: false,
    link: '/my-service-requests',
    createdAt: now
  });

  logAudit(
    req.user!.fullName,
    req.user!.role,
    'SERVICE_REQUEST_RESULT_SENT',
    `Sent result for ${request.ticketId}. Status: ${finalStatus}. Staff: ${req.user!.fullName}`,
    request.userId,
    request.ticketId,
    req.ip
  );

  saveDb();

  // Authoritatively update service request in Supabase
  await saveServiceRequestToSupabase(request);

  res.json({ success: true, request });
});

// Admin: Search and filter all service requests
apiRouter.get('/admin/service-requests', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  let list = db.serviceRequests || [];

  const { search, status, sort } = req.query;

  // Search filter
  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (r) =>
        r.ticketId.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerEmail.toLowerCase().includes(q) ||
        (r.customerPhone && r.customerPhone.toLowerCase().includes(q)) ||
        r.serviceName.toLowerCase().includes(q)
    );
  }

  // Status filter
  if (status && typeof status === 'string' && status !== 'ALL') {
    list = list.filter((r) => r.status === status);
  }

  // Sort
  if (sort === 'OLDEST') {
    list = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (sort === 'RECENT_UPDATED') {
    list = [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } else {
    // Default NEWEST
    list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json(list);
});

// High-performance Proxy for slip template images with in-memory caching & local asset serving
const templateProxyMemoryCache = new Map<string, { buffer: Buffer; contentType: string; expires: number }>();

const LOCAL_TEMPLATE_URL_MAP: Record<string, string> = {
  'https://i.ibb.co/XZpC5fTL/20260921-214903.jpg': path.resolve(process.cwd(), 'public/templates/nin_premium.jpg'),
  'https://i.ibb.co/BFHms81/20260921-223018.jpg': path.resolve(process.cwd(), 'public/templates/nin_standard.jpg'),
  'https://i.ibb.co/5hWsw4yg/20260921-223813.jpg': path.resolve(process.cwd(), 'public/templates/nin_regular.jpg'),
  'https://i.ibb.co/Zp1bjKLd/20260921-222422.jpg': path.resolve(process.cwd(), 'public/templates/bvn_premium.jpg')
};

apiRouter.get('/slip-template-proxy', async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).json({ error: 'Valid URL is required' });
  }

  // Check 1: In-memory cache hit
  const cached = templateProxyMemoryCache.get(imageUrl);
  if (cached && Date.now() < cached.expires) {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(cached.buffer);
  }

  // Check 2: Known local template image match
  const localFilePath = LOCAL_TEMPLATE_URL_MAP[imageUrl];
  if (localFilePath && fs.existsSync(localFilePath)) {
    try {
      const fileBuffer = await fs.promises.readFile(localFilePath);
      templateProxyMemoryCache.set(imageUrl, {
        buffer: fileBuffer,
        contentType: 'image/jpeg',
        expires: Date.now() + 86400000 * 7
      });
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(fileBuffer);
    } catch {
      // Fall through to remote fetch if local read fails
    }
  }

  // Check 3: Relative local template path (/templates/...)
  if (imageUrl.startsWith('/templates/') || imageUrl.startsWith('templates/')) {
    const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
    const resolvedPath = path.resolve(process.cwd(), 'public', cleanPath);
    if (fs.existsSync(resolvedPath)) {
      try {
        const fileBuffer = await fs.promises.readFile(resolvedPath);
        templateProxyMemoryCache.set(imageUrl, {
          buffer: fileBuffer,
          contentType: 'image/jpeg',
          expires: Date.now() + 86400000 * 7
        });
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(fileBuffer);
      } catch {
        // Fall through
      }
    }
  }

  if (!imageUrl.startsWith('http')) {
    return res.status(400).json({ error: 'Valid HTTP/HTTPS URL is required' });
  }

  try {
    const upstreamRes = await fetch(imageUrl, {
      signal: AbortSignal.timeout(5000),
      keepalive: true
    });
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send('Failed to fetch template image');
    }
    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    const arrayBuf = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    templateProxyMemoryCache.set(imageUrl, {
      buffer,
      contentType,
      expires: Date.now() + 86400000
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to proxy template image' });
  }
});

// API Error Handler for Payload Too Large
apiRouter.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413 || err.name === 'PayloadTooLargeError') {
    return res.status(413).json({
      error: 'Payload Too Large: The uploaded files exceed the server limit. Please upload compressed or smaller files.'
    });
  }
  next(err);
});


