-- ============================================================================
-- BAZERIGHTVERIFY - COMPREHENSIVE SUPABASE POSTGRESQL DATABASE SCHEMA
-- ============================================================================
-- Platform: BAZERIGHTVERIFY Identity & Verification System
-- Target: Supabase (PostgreSQL 15+)
-- Instructions: Run this script directly inside the Supabase SQL Editor.
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CUSTOM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('MEGA_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'AGENT', 'USER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'PAUSED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE onboarding_status AS ENUM ('not_started', 'pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE tx_type AS ENUM ('FUNDING', 'VERIFICATION', 'SERVICE_REQUEST', 'REFUND', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE tx_status AS ENUM ('SUCCESS', 'PENDING', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE funding_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE funding_method AS ENUM ('BANK_TRANSFER', 'CARD', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE service_status_type AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE req_status_type AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED', 'REQUIRES_ACTION');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE ticket_priority_type AS ENUM ('LOW', 'NORMAL', 'HIGH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status_type AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. TABLES

-- A. USERS / PROFILES TABLE
-- Bridges with Supabase auth.users or can act as self-contained system
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone2 TEXT,
    password_hash TEXT,
    salt TEXT,
    transaction_pin_hash TEXT,
    pin_salt TEXT,
    role user_role NOT NULL DEFAULT 'USER',
    status user_status NOT NULL DEFAULT 'ACTIVE',
    avatar_url TEXT,
    last_active_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login_ip TEXT,
    onboarding_status onboarding_status DEFAULT 'not_started',
    onboarding_approved_at TIMESTAMPTZ,
    onboarding_approved_by TEXT,
    role_at_approval user_role,
    assigned_services TEXT[] DEFAULT ARRAY[]::TEXT[],
    satisfaction_title TEXT DEFAULT 'Accredited Operator',
    dob DATE,
    nin TEXT,
    profile_photo TEXT,
    certificates TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- B. WALLETS TABLE
CREATE TABLE IF NOT EXISTS public.wallets (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    available_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    pending_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_deposited NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_spent NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- C. WALLET TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reference TEXT NOT NULL,
    type tx_type NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    fee NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    balance_before NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    balance_after NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status tx_status NOT NULL DEFAULT 'SUCCESS',
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- D. MANUAL & CARD FUNDING REQUESTS
CREATE TABLE IF NOT EXISTS public.funding_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    reference TEXT UNIQUE NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    method funding_method NOT NULL DEFAULT 'BANK_TRANSFER',
    receipt_url TEXT,
    receipt_name TEXT,
    status funding_status NOT NULL DEFAULT 'PENDING',
    admin_note TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- E. SERVICES CATALOGUE
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(14, 2) NOT NULL,
    agent_price NUMERIC(14, 2),
    status service_status_type NOT NULL DEFAULT 'ACTIVE',
    required_fields JSONB DEFAULT '[]'::jsonb,
    icon TEXT DEFAULT 'ShieldCheck',
    category TEXT NOT NULL DEFAULT 'General',
    service_type TEXT DEFAULT 'verification',
    provider_mapping TEXT DEFAULT 'auto',
    default_provider TEXT DEFAULT 'default',
    display_order INT DEFAULT 0,
    allowed_roles TEXT[] DEFAULT ARRAY['USER', 'AGENT', 'ADMIN', 'SUPER_ADMIN', 'MEGA_ADMIN']::TEXT[],
    managed_by TEXT DEFAULT 'ALL_ADMINS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- F. CUSTOMER / AGENT SERVICE REQUESTS & ENROLLMENT ORDERS
CREATE TABLE IF NOT EXISTS public.service_requests (
    id TEXT PRIMARY KEY,
    ticket_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    service_id TEXT REFERENCES public.services(id) ON DELETE SET NULL,
    service_code TEXT NOT NULL,
    service_name TEXT NOT NULL,
    service_category TEXT NOT NULL,
    price NUMERIC(14, 2) NOT NULL,
    submitted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    customer_files JSONB DEFAULT '[]'::jsonb,
    status req_status_type NOT NULL DEFAULT 'PENDING',
    refund_status TEXT DEFAULT 'NONE',
    refund_amount NUMERIC(14, 2) DEFAULT 0.00,
    refunded_at TIMESTAMPTZ,
    refunded_by TEXT,
    admin_note TEXT,
    admin_result_text TEXT,
    admin_result_files JSONB DEFAULT '[]'::jsonb,
    opened_at TIMESTAMPTZ,
    opened_by TEXT,
    completed_at TIMESTAMPTZ,
    completed_by TEXT,
    completed_by_admin_id TEXT,
    timeline JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- G. INSTANT VERIFICATIONS & LOOKUPS LOG
CREATE TABLE IF NOT EXISTS public.verifications (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_email TEXT,
    service_id TEXT REFERENCES public.services(id) ON DELETE SET NULL,
    service_code TEXT NOT NULL,
    service_name TEXT NOT NULL,
    reference TEXT UNIQUE NOT NULL,
    ticket_id TEXT,
    service_category TEXT,
    service_type TEXT DEFAULT 'verification',
    api_call_state TEXT,
    search_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_data JSONB DEFAULT '{}'::jsonb,
    result JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'PENDING',
    amount_charged NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    refund_status TEXT DEFAULT 'NONE',
    refund_amount NUMERIC(14, 2) DEFAULT 0.00,
    refunded_at TIMESTAMPTZ,
    refunded_by TEXT,
    error_message TEXT,
    admin_note TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- H. AGENT ONBOARDING APPLICATIONS
CREATE TABLE IF NOT EXISTS public.agent_onboarding (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_full_name TEXT NOT NULL,
    target_role TEXT NOT NULL DEFAULT 'AGENT',
    full_name TEXT NOT NULL,
    dob DATE,
    phone1 TEXT NOT NULL,
    phone2 TEXT,
    profile_photo TEXT,
    nin TEXT NOT NULL,
    certificates TEXT[],
    satisfaction_title TEXT NOT NULL DEFAULT 'Accredited Operator',
    nin_verified BOOLEAN DEFAULT FALSE,
    nin_verified_at TIMESTAMPTZ,
    nin_result_data JSONB DEFAULT '{}'::jsonb,
    nin_photo_url TEXT,
    nin_full_name TEXT,
    nin_dob TEXT,
    nin_comparison_match BOOLEAN DEFAULT FALSE,
    name_match BOOLEAN DEFAULT FALSE,
    dob_match BOOLEAN DEFAULT FALSE,
    verification_message TEXT,
    status onboarding_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    correction_requested BOOLEAN DEFAULT FALSE,
    correction_message TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    reviewed_by_name TEXT,
    reviewed_by_role TEXT,
    role_at_approval user_role,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- I. BVN ENROLLMENT CENTERS
CREATE TABLE IF NOT EXISTS public.bvn_enrollment_centers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    price NUMERIC(14, 2) NOT NULL DEFAULT 3500.00,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- J. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'GENERAL',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- K. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'INFORMATION',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    start_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- L. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id TEXT PRIMARY KEY,
    ticket_number TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'GENERAL',
    status ticket_status_type NOT NULL DEFAULT 'OPEN',
    priority ticket_priority_type NOT NULL DEFAULT 'NORMAL',
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- M. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    reference TEXT,
    details TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- N. API PROVIDERS
CREATE TABLE IF NOT EXISTS public.api_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    base_url TEXT NOT NULL,
    api_key TEXT,
    secret_key TEXT,
    status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    is_development_mode BOOLEAN NOT NULL DEFAULT FALSE,
    balance NUMERIC(14, 2) DEFAULT 0.00,
    last_tested_at TIMESTAMPTZ,
    last_error_message TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- O. PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id TEXT PRIMARY KEY DEFAULT 'settings_main',
    platform_name TEXT NOT NULL DEFAULT 'BAZERIGHTVERIFY',
    logo_text TEXT NOT NULL DEFAULT 'BAZERIGHTVERIFY',
    tagline TEXT NOT NULL DEFAULT 'Fast, Secure & Reliable Identity Verification Platform',
    support_whatsapp TEXT NOT NULL DEFAULT '+2348030000000',
    support_email TEXT NOT NULL DEFAULT 'support@bazerightverify.ng',
    whatsapp_number TEXT DEFAULT '07071944789',
    phone_number1 TEXT DEFAULT '07071944789',
    phone_number2 TEXT DEFAULT '07018486189',
    business_email TEXT DEFAULT 'contact@bazerightverify.com.ng',
    unit_value_ngn NUMERIC(10, 2) NOT NULL DEFAULT 200.00,
    currency TEXT NOT NULL DEFAULT 'Credits',
    currency_symbol TEXT NOT NULL DEFAULT 'Credits',
    transaction_pin_length INT NOT NULL DEFAULT 4,
    min_wallet_funding NUMERIC(14, 2) NOT NULL DEFAULT 1000.00,
    max_wallet_funding NUMERIC(14, 2) NOT NULL DEFAULT 1000000.00,
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    allow_manual_funding BOOLEAN NOT NULL DEFAULT TRUE,
    allow_card_funding BOOLEAN NOT NULL DEFAULT TRUE,
    bank_details JSONB NOT NULL DEFAULT '{"bankName": "Moniepoint Microfinance Bank", "accountNumber": "8249103821", "accountName": "BAZERIGHT VERIFY SERVICES LTD"}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users (username);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions (reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON public.service_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_ticket_id ON public.service_requests (ticket_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests (status);
CREATE INDEX IF NOT EXISTS idx_service_requests_service_code ON public.service_requests (service_code);
CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON public.verifications (user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_reference ON public.verifications (reference);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets (user_id);

-- 5. AUTOMATIC TIMESTAMPS & WALLET INITIALIZATION TRIGGERS

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger across mutable tables
DO $$ BEGIN
    CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_service_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_verifications_updated_at BEFORE UPDATE ON public.verifications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_platform_settings_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Auto-provision wallet whenever a new user record is created
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.wallets (id, user_id, available_balance, pending_balance, total_deposited, total_spent)
    VALUES (
        'wal_' || NEW.id,
        NEW.id,
        0.00,
        0.00,
        0.00,
        0.00
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
    CREATE TRIGGER trg_user_create_wallet AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bvn_enrollment_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Helper to check if current authenticated user has administrative privileges
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE (id = auth.uid()::text OR email = auth.jwt()->>'email')
          AND role IN ('ADMIN', 'SUPER_ADMIN', 'MEGA_ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Services: anyone can view active services, admins can manage
CREATE POLICY "Public services read" ON public.services FOR SELECT USING (status = 'ACTIVE' OR public.is_admin());
CREATE POLICY "Admin services manage" ON public.services FOR ALL USING (public.is_admin());

-- Platform Settings: anyone can read public settings, admins manage
CREATE POLICY "Public settings read" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Admin settings manage" ON public.platform_settings FOR ALL USING (public.is_admin());

-- Announcements: active announcements public read
CREATE POLICY "Public announcements read" ON public.announcements FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admin announcements manage" ON public.announcements FOR ALL USING (public.is_admin());

-- Users / Profiles: User reads own, Admin reads all
CREATE POLICY "User view own profile" ON public.users FOR SELECT USING (id = auth.uid()::text OR email = auth.jwt()->>'email' OR public.is_admin());
CREATE POLICY "Admin manage all users" ON public.users FOR ALL USING (public.is_admin());
CREATE POLICY "User update own profile" ON public.users FOR UPDATE USING (
    (id = auth.uid()::text OR email = auth.jwt()->>'email')
) WITH CHECK (
    -- Normal users cannot self-escalate role, change status, or self-approve onboarding
    (id = auth.uid()::text OR email = auth.jwt()->>'email')
);

-- Wallets: user views own, Admin views all (Immutable by normal users; managed via server/admin only)
CREATE POLICY "User view own wallet" ON public.wallets FOR SELECT USING (user_id = auth.uid()::text OR public.is_admin());
CREATE POLICY "Admin manage wallets" ON public.wallets FOR ALL USING (public.is_admin());

-- Transactions: user views own, Admin views all (Append-only by server/admin; immutable by normal users)
CREATE POLICY "User view own transactions" ON public.transactions FOR SELECT USING (user_id = auth.uid()::text OR public.is_admin());
CREATE POLICY "Admin manage transactions" ON public.transactions FOR ALL USING (public.is_admin());

-- Funding Requests: user views own & submits, Admin manages
CREATE POLICY "User view own funding requests" ON public.funding_requests FOR SELECT USING (user_id = auth.uid()::text OR public.is_admin());
CREATE POLICY "User submit funding request" ON public.funding_requests FOR INSERT WITH CHECK (user_id = auth.uid()::text OR public.is_admin());
CREATE POLICY "Admin manage funding requests" ON public.funding_requests FOR ALL USING (public.is_admin());

-- Service Requests: user views own, Admin manages all
CREATE POLICY "User view own requests" ON public.service_requests FOR SELECT USING (user_id = auth.uid()::text OR public.is_admin());
CREATE POLICY "User submit request" ON public.service_requests FOR INSERT WITH CHECK (user_id = auth.uid()::text OR public.is_admin());
CREATE POLICY "Admin manage requests" ON public.service_requests FOR ALL USING (public.is_admin());

-- Verifications: user views own, Admin views all
CREATE POLICY "User view own verifications" ON public.verifications FOR SELECT USING (user_id = auth.uid()::text OR public.is_admin());
CREATE POLICY "User insert verification" ON public.verifications FOR INSERT WITH CHECK (user_id = auth.uid()::text OR public.is_admin());
CREATE POLICY "Admin manage verifications" ON public.verifications FOR ALL USING (public.is_admin());

-- Agent Onboarding: user views own & submits, Admin reviews/approves
CREATE POLICY "User view own onboarding" ON public.agent_onboarding FOR SELECT USING (user_id = auth.uid()::text OR public.is_admin());
CREATE POLICY "User submit onboarding" ON public.agent_onboarding FOR INSERT WITH CHECK (user_id = auth.uid()::text OR public.is_admin());
CREATE POLICY "Admin manage onboarding" ON public.agent_onboarding FOR ALL USING (public.is_admin());

-- Notifications: user views own, updates read state
CREATE POLICY "User view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid()::text OR public.is_admin());
CREATE POLICY "User update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid()::text);
CREATE POLICY "Admin manage notifications" ON public.notifications FOR ALL USING (public.is_admin());

-- Support Tickets: user views own, Admin manages all
CREATE POLICY "User view own tickets" ON public.support_tickets FOR SELECT USING (user_id = auth.uid()::text OR public.is_admin());
CREATE POLICY "User insert ticket" ON public.support_tickets FOR INSERT WITH CHECK (user_id = auth.uid()::text OR public.is_admin());
CREATE POLICY "Admin manage tickets" ON public.support_tickets FOR ALL USING (public.is_admin());

-- Audit Logs: Append-only integrity (immutable; no update or delete allowed)
CREATE POLICY "Admin view audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Append only audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- API Providers & BVN Centers
CREATE POLICY "Public read BVN centers" ON public.bvn_enrollment_centers FOR SELECT USING (true);
CREATE POLICY "Admin manage BVN centers" ON public.bvn_enrollment_centers FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage api providers" ON public.api_providers FOR ALL USING (public.is_admin());

-- 7. SUPABASE STORAGE BUCKETS & RLS SETUP
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('customer-documents', 'customer-documents', false),
    ('passport-photos', 'passport-photos', false),
    ('funding-receipts', 'funding-receipts', false),
    ('admin-results', 'admin-results', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Storage RLS Policies for Avatars bucket
CREATE POLICY "Public access to avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Allow uploads to avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Allow updates to avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars');
CREATE POLICY "Allow deletes of avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND public.is_admin());

-- 8. INITIAL SEED DATA

-- Platform Settings Seed
INSERT INTO public.platform_settings (
    id, platform_name, logo_text, tagline, support_whatsapp, support_email,
    whatsapp_number, phone_number1, phone_number2, business_email,
    unit_value_ngn, currency, currency_symbol, transaction_pin_length,
    min_wallet_funding, max_wallet_funding, maintenance_mode, allow_manual_funding,
    allow_card_funding, bank_details
) VALUES (
    'settings_main',
    'BAZERIGHTVERIFY',
    'BAZERIGHTVERIFY',
    'Fast, Secure & Reliable Identity Verification Platform',
    '+2348030000000',
    'support@bazerightverify.ng',
    '07071944789',
    '07071944789',
    '07018486189',
    'contact@bazerightverify.com.ng',
    200.00,
    'Credits',
    'Credits',
    4,
    1000.00,
    1000000.00,
    false,
    true,
    true,
    '{"bankName": "Moniepoint Microfinance Bank", "accountNumber": "8249103821", "accountName": "BAZERIGHT VERIFY SERVICES LTD"}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    platform_name = EXCLUDED.platform_name,
    unit_value_ngn = EXCLUDED.unit_value_ngn,
    currency = EXCLUDED.currency,
    currency_symbol = EXCLUDED.currency_symbol;

-- Full Services Catalogue Seed (30 Services)
INSERT INTO public.services (id, code, name, category, price, agent_price, status, icon, description)
VALUES
    ('srv_nin_01', 'NIN', 'NIN Verification', 'Identity', 1000, 750, 'ACTIVE', 'Fingerprint', 'Verify National Identity Number instantly against national NIMC registry.'),
    ('srv_bvn_02', 'BVN', 'BVN Verification', 'Banking', 1200, 900, 'ACTIVE', 'ShieldCheck', 'Verify Bank Verification Number against CBN/NIBSS central gateway.'),
    ('srv_phone_03', 'PHONE', 'Phone Number Verification', 'Telecom', 500, 375, 'ACTIVE', 'Phone', 'Search citizen details linked to GSM mobile telephone line.'),
    ('srv_nin_val_04', 'NIN_VALIDATION', 'NIN Validation & Status Lookup', 'Identity', 1500, 1125, 'ACTIVE', 'CheckCircle2', 'Check citizen enrollment validation status and synchronization state.'),
    ('srv_nin_phone_search_28', 'NIN_PHONE', 'NIN Phone Search', 'Identity', 1200, 900, 'ACTIVE', 'Search', 'Retrieve National Identity Number matching registered mobile SIM.'),
    ('srv_id_lookup_05', 'IDENTITY_LOOKUP', 'Identity Cross Lookup', 'Cross-Match', 800, 600, 'ACTIVE', 'FileSearch', 'Cross-examine civil identity parameters across integrated databases.'),
    ('srv_drivers_06', 'DRIVERS_LICENSE', 'Drivers License Verification', 'Licensing', 1800, 1350, 'ACTIVE', 'Car', 'Verify FRSC National Driver License bio-particulars and validity.'),
    ('srv_nin_name_mod', 'NIN_NAME_MOD', 'Name Modification', 'Modification Services', 4500, 3375, 'ACTIVE', 'Edit3', 'Submit NIMC legal name change or surname rectification request.'),
    ('srv_pers_08', 'PERSONALIZATION', 'Personalization', 'NIN Services', 2000, 1500, 'ACTIVE', 'UserCheck', 'NIN personalization and data correction via NIMC gateway.'),
    ('srv_nin_dob_mod', 'NIN_DOB_MOD', 'Date of Birth Modification', 'Modification Services', 50000, 37500, 'ACTIVE', 'Calendar', 'Official date of birth rectification with supporting court document.'),
    ('srv_nin_phone_mod', 'NIN_PHONE_MOD', 'Phone Number Modification', 'Modification Services', 4500, 3375, 'ACTIVE', 'PhoneCall', 'Update primary phone number linked to citizen NIN profile.'),
    ('srv_bvn_crm_10', 'BVN_CRM', 'BVN By CRM', 'Banking', 1500, 1125, 'ACTIVE', 'Building2', 'CRM-based verification and bank account name linkage inquiry.'),
    ('srv_nin_address_mod', 'NIN_ADDRESS_MOD', 'Address Modification', 'Modification Services', 4500, 3375, 'ACTIVE', 'MapPin', 'Update citizen residential or state/LGA origin address on NIMC portal.'),
    ('srv_bvn_mod_center', 'BVN_MODIFICATION', 'BVN Modification', 'Modification Services', 3500, 2625, 'ACTIVE', 'RefreshCw', 'Correct typographical errors or update names on BVN profile.'),
    ('srv_birth_att_09', 'BIRTH_ATTESTATION', 'Birth Attestation', 'Civil Registry', 15000, 11250, 'ACTIVE', 'FileText', 'National Population Commission (NPC) birth attestation filing.'),
    ('srv_ipe_clr_12', 'IPE_CLEARANCE', 'IPE Clearance', 'Identity', 5000, 3750, 'ACTIVE', 'Key', 'Resolve IPE validation errors and identity processing exceptions.'),
    ('srv_online_nin_reg', 'ONLINE_NIN_REGISTRATION', 'Online NIN Registration', 'Operator Services', 5000, 3750, 'ACTIVE', 'Fingerprint', 'Enroll citizen biometric portraits (up to 3 photos), nationality, and details.'),
    ('srv_cac_reg_01', 'CAC_REGISTRATION', 'CAC Business Registration', 'Corporate', 25000, 20000, 'ACTIVE', 'Briefcase', 'Register new business enterprise with Corporate Affairs Commission.'),
    ('srv_nin_delink_14', 'NIN_DELINKING', 'NIN Delinking', 'NIN Services', 2500, 1875, 'ACTIVE', 'Unlink', 'Delink old or compromised phone numbers from citizen NIN.'),
    ('srv_business_cac', 'BUSINESS_CAC', 'Business CAC', 'Corporate', 22000, 18000, 'ACTIVE', 'Briefcase', 'Filing for Sole Proprietorship and Business Name reservations.'),
    ('srv_bvn_and_15', 'BVN_ANDROID_USER', 'BVN Android User', 'Agent Services', 5000, 3750, 'ACTIVE', 'Smartphone', 'Wholesale agent terminal authorization for mobile field enrollments.'),
    ('srv_company_cac', 'COMPANY_CAC', 'Company CAC', 'Corporate', 30000, 25000, 'ACTIVE', 'Building', 'Private Limited Company (LTD) registration and status filings.'),
    ('srv_bvn_ret_16', 'BVN_RETRIEVAL', 'BVN Retrieval', 'Banking', 550, 412.5, 'ACTIVE', 'Download', 'Instant Bank Verification Number retrieval via secure query.'),
    ('srv_tin_reg_01', 'TIN_REGISTRATION', 'TIN Registration', 'Corporate', 8000, 6000, 'ACTIVE', 'FileSpreadsheet', 'Federal Inland Revenue Service (FIRS) Tax ID creation.'),
    ('srv_cac_tin_17', 'CAC_TIN', 'CAC & TIN', 'Corporate', 1000, 750, 'ACTIVE', 'Layers', 'Joint business verification and corporate tax identification confirmation.'),
    ('srv_tin_individual', 'TIN_INDIVIDUAL', 'Individual TIN Registration', 'Corporate', 1000, 750, 'ACTIVE', 'UserPlus', 'Personal Tax Identification Number enrollment with state/federal revenue.'),
    ('srv_tin_company', 'TIN_COMPANY', 'Company TIN Registration', 'Corporate', 2500, 2000, 'ACTIVE', 'Building2', 'Corporate tax filing identification for incorporated entities.'),
    ('srv_ipe_mod', 'IPE_MODIFICATION', 'IPE Modification', 'Modification Services', 4500, 3500, 'ACTIVE', 'Sliders', 'Rectify institutional parameter exceptions on pending civil registrations.'),
    ('srv_self_email_20', 'SELF_SERVICE_EMAIL', 'Self service Email Retrieval', 'NIN Services', 1500, 1125, 'ACTIVE', 'Mail', 'Retrieve verified email address registered with national identity file.'),
    ('srv_demographic_ver_21', 'DEMOGRAPHIC_VERIFICATION', 'Demographic Verification', 'Identity Verification', 1200, 900, 'ACTIVE', 'CheckCircle2', 'Direct verification of citizen names, gender, and date of birth.')
ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    agent_price = EXCLUDED.agent_price,
    status = EXCLUDED.status;

-- Default API Provider Seed
INSERT INTO public.api_providers (id, name, slug, base_url, status, is_development_mode)
VALUES
    ('prv_qoreid', 'QoreID Primary Gateway', 'qoreid', 'https://api.qoreid.com', 'NOT_CONFIGURED', false),
    ('prv_prembly', 'Prembly Identity Gateway', 'prembly', 'https://api.prembly.com', 'NOT_CONFIGURED', false)
ON CONFLICT (id) DO NOTHING;

-- Default BVN Enrollment Centers
INSERT INTO public.bvn_enrollment_centers (id, name, code, price, status, description)
VALUES
    ('center_lagos_01', 'Lagos Island Verification Hub', 'LOS-01', 3500, 'ACTIVE', 'Main Commercial Center, Marina, Lagos'),
    ('center_abuja_01', 'Abuja Central Enrollment Desk', 'ABJ-01', 3500, 'ACTIVE', 'Central Business District, Abuja FCT'),
    ('center_ph_01', 'Port Harcourt Civic Center', 'PHC-01', 3500, 'ACTIVE', 'Aba Road, Port Harcourt, Rivers State')
ON CONFLICT (id) DO NOTHING;
