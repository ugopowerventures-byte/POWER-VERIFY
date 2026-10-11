import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { AgentLayout } from './components/layout/AgentLayout';

// Public views
import { HomeView } from './views/public/HomeView';
import { LoginView } from './views/public/LoginView';
import { RegisterView } from './views/public/RegisterView';
import { ForgotPasswordView } from './views/public/ForgotPasswordView';
import { ServicesView } from './views/public/ServicesView';
import { PricingView } from './views/public/PricingView';
import { AboutView } from './views/public/AboutView';
import { ContactView } from './views/public/ContactView';
import { TermsView, PrivacyView } from './views/public/LegalViews';

// User Portal views
import { DashboardView } from './views/user/DashboardView';
import { VerifyServiceView } from './views/user/VerifyServiceView';
import { VerificationHistoryView } from './views/user/VerificationHistoryView';
import { NinModificationHubView } from './views/user/NinModificationHubView';
import { NinModificationFormView } from './views/user/NinModificationFormView';
import { BirthAttestationFormView } from './views/user/BirthAttestationFormView';
import { BvnModificationFormView } from './views/user/BvnModificationFormView';
import { BvnRetrievalFormView } from './views/user/BvnRetrievalFormView';
import { BvnAndroidUserFormView } from './views/user/BvnAndroidUserFormView';
import { SelfServiceFormView } from './views/user/SelfServiceFormView';
import { CacTinServiceView } from './views/user/CacTinServiceView';
import { ModificationServiceView } from './views/user/ModificationServiceView';
import { DemographicVerificationFormView } from './views/user/DemographicVerificationFormView';
import { AgentOnboardingView } from './views/user/AgentOnboardingView';
import { OnlineNinRegistrationFormView } from './views/user/OnlineNinRegistrationFormView';
import { WalletView } from './views/user/WalletView';
import { PaystackCallbackView } from './views/user/PaystackCallbackView';
import { TransactionsView } from './views/user/TransactionsView';
import { ProfileView } from './views/user/ProfileView';
import { SecurityView } from './views/user/SecurityView';
import { SupportView } from './views/user/SupportView';
import { MyServiceRequestsView } from './views/user/MyServiceRequestsView';

// Admin Console views
import { AdminDashboardView } from './views/admin/AdminDashboardView';
import { AdminRequestsView } from './views/admin/AdminRequestsView';
import { AdminServiceRequestsView } from './views/admin/AdminServiceRequestsView';
import { AdminServicesView } from './views/admin/AdminServicesView';
import { AdminProvidersView } from './views/admin/AdminProvidersView';
import { AdminWalletsView } from './views/admin/AdminWalletsView';
import { AdminUsersView } from './views/admin/AdminUsersView';
import { AdminOnboardingView } from './views/admin/AdminOnboardingView';
import { AdminAnnouncementsView } from './views/admin/AdminAnnouncementsView';
import { AdminSupportView } from './views/admin/AdminSupportView';
import { AdminAuditLogsView } from './views/admin/AdminAuditLogsView';
import { AdminSettingsView } from './views/admin/AdminSettingsView';
import { AdminApiAccountsView } from './views/admin/AdminApiAccountsView';
import { MegaAdminAccessView } from './views/admin/MegaAdminAccessView';

import { Loader2, ShieldAlert } from 'lucide-react';
import { BrandLogo } from './components/common/BrandLogo';
import { Footer } from './components/common/Footer';
import { Skeleton, UserDashboardSkeleton } from './components/common/Skeleton';

const AppRouter: React.FC = () => {
  const { currentPath, user, isLoading, navigate } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-gray-900 flex flex-col justify-between">
        {/* Top Header Placeholder */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" />
              <Skeleton variant="light" className="h-4 w-28 hidden sm:block" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton variant="light" className="h-9 w-24" rounded="2xl" />
              <Skeleton variant="light" className="w-10 h-10" rounded="full" />
            </div>
          </div>
        </header>

        {/* Main Dashboard Skeleton with Truehost-style shimmer */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <UserDashboardSkeleton />
        </main>

        <Footer />
      </div>
    );
  }

  // Parse path without query strings
  const pathname = currentPath.split('?')[0].toLowerCase() || '/';

  // Dedicated Mega Admin Access Portal
  const normalizedPath = pathname.replace(/\/+/g, '/').toLowerCase();
  if (
    normalizedPath === '/mega/admin/ugopawaverify' ||
    pathname === '/Mega//admin/ugopawaverify' ||
    pathname === '/mega//admin/ugopawaverify' ||
    pathname === '/Mega/admin/ugopawaverify'
  ) {
    return <MegaAdminAccessView />;
  }

  // 1. Root MUST ALWAYS render the PUBLIC HERO / HOME PAGE first, regardless of session!
  // Opening the website must NEVER automatically log the user in or bypass the public home page.
  if (pathname === '/' || pathname === '') {
    return <HomeView />;
  }

  // Standalone Auth Pages
  if (pathname === '/login') {
    return <LoginView />;
  }
  if (pathname === '/register') {
    return <RegisterView />;
  }
  if (pathname === '/forgot-password') {
    return <ForgotPasswordView />;
  }

  // Standalone Public Informational Pages
  if (pathname === '/about') {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-gray-900 flex flex-col">
        <header className="sticky top-0 z-50 bg-[#121212]/95 backdrop-blur-md border-b border-[#2A2A2A] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer">
              <BrandLogo size="md" showText={true} textClassName="text-white" />
            </button>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                onClick={() => navigate('/')}
                className="px-3.5 sm:px-4 py-2 rounded-xl text-gray-300 hover:text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Home
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs sm:text-sm hover:bg-white/15 transition-all cursor-pointer"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold text-xs sm:text-sm hover:brightness-110 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                Get Started
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1">
          <AboutView />
        </main>
        <Footer />
      </div>
    );
  }

  // 2. If user is NOT logged in and attempting to visit a protected route:
  // Must manually log in via LoginView
  if (!user) {
    return <LoginView />;
  }

  // 3. User IS logged in:
  // Check onboarding requirement for promoted roles
  const requiresOnboarding =
    (user?.role === 'AGENT' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') &&
    user?.onboardingStatus !== 'approved';

  if (requiresOnboarding) {
    if (user?.role === 'AGENT') {
      return (
        <AgentLayout activeKey="onboarding">
          <AgentOnboardingView />
        </AgentLayout>
      );
    }
    return (
      <AppLayout activeKey="onboarding">
        <AgentOnboardingView />
      </AppLayout>
    );
  }

  // Admin Routes (Require Admin role)
  if (pathname.startsWith('/admin')) {
    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN' && user?.role !== 'MEGA_ADMIN') {
      return (
        <AppLayout>
          <div className="max-w-md mx-auto my-16 bg-white p-8 rounded-3xl border border-red-200 text-center space-y-4">
            <h2 className="text-xl font-black text-gray-900">Access Restricted</h2>
            <p className="text-xs text-gray-500">
              Your account (@{user?.username || 'user'}) does not have administrative privileges.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 rounded-xl bg-black text-white font-bold text-xs"
            >
              Return to User Dashboard
            </button>
          </div>
        </AppLayout>
      );
    }

    let adminContent = <AdminDashboardView />;
    let activeKey = 'dashboard';

    if (pathname === '/admin/api-accounts' || pathname === '/admin/api-account-center') {
      if (user?.role !== 'MEGA_ADMIN') {
        return (
          <AdminLayout>
            <div className="max-w-md mx-auto my-16 bg-[#161616] p-8 rounded-3xl border border-red-500/30 text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-white">Mega Admin Access Required</h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                The API Account Center is strictly restricted to the Mega Administrator. Super Admins and regular Admins are not permitted to access provider account coordinates.
              </p>
              <button
                onClick={() => navigate('/admin')}
                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Return to Admin Overview
              </button>
            </div>
          </AdminLayout>
        );
      }
      adminContent = <AdminApiAccountsView />;
      activeKey = 'api-accounts';
    }
    else if (pathname === '/admin/requests') { adminContent = <AdminRequestsView />; activeKey = 'requests'; }
    else if (pathname === '/admin/service-requests') { adminContent = <AdminServiceRequestsView />; activeKey = 'service-requests'; }
    else if (pathname === '/admin/services') { adminContent = <AdminServicesView />; activeKey = 'services'; }
    else if (pathname === '/admin/providers') { adminContent = <AdminProvidersView />; activeKey = 'providers'; }
    else if (pathname === '/admin/wallets') { adminContent = <AdminWalletsView />; activeKey = 'wallets'; }
    else if (pathname === '/admin/users') { adminContent = <AdminUsersView />; activeKey = 'users'; }
    else if (pathname === '/admin/onboarding') { adminContent = <AdminOnboardingView />; activeKey = 'onboarding'; }
    else if (pathname === '/admin/announcements') { adminContent = <AdminAnnouncementsView />; activeKey = 'announcements'; }
    else if (pathname === '/admin/support' || pathname === '/admin/support-tickets') { adminContent = <AdminSupportView />; activeKey = 'support'; }
    else if (pathname === '/admin/audit-logs' || pathname === '/admin/reports') { adminContent = <AdminAuditLogsView />; activeKey = 'audit'; }
    else if (pathname === '/admin/settings') { adminContent = <AdminSettingsView />; activeKey = 'settings'; }

    return <AdminLayout activeKey={activeKey}>{adminContent}</AdminLayout>;
  }

  // Explicit User/Agent Dashboard Route
  if (pathname === '/dashboard') {
    if (user?.role === 'AGENT') {
      return (
        <AgentLayout activeKey="dashboard">
          <DashboardView />
        </AgentLayout>
      );
    }
    return (
      <AppLayout activeKey="dashboard">
        <DashboardView />
      </AppLayout>
    );
  }

  // Determine user/public page content
  let pageContent = <DashboardView />;
  let activeKey = 'dashboard';
  if (pathname === '/services') {
    pageContent = <ServicesView />;
    activeKey = 'services';
  } else if (pathname === '/pricing') {
    pageContent = <PricingView />;
  } else if (pathname === '/about') {
    pageContent = <AboutView />;
  } else if (pathname === '/contact') {
    pageContent = <ContactView />;
  } else if (pathname === '/terms') {
    pageContent = <TermsView />;
  } else if (pathname === '/privacy') {
    pageContent = <PrivacyView />;
  } else if (pathname === '/my-service-requests' || pathname === '/service-requests') {
    pageContent = <MyServiceRequestsView />;
    activeKey = 'service-requests';
  } else if (pathname === '/verify/modification' || pathname === '/verify/nin-modification') {
    pageContent = <ModificationServiceView />;
    activeKey = 'verify';
  } else if (pathname === '/verify/nin-modification/name') {
    pageContent = <NinModificationFormView type="name" />;
    activeKey = 'verify';
  } else if (pathname === '/verify/nin-modification/dob') {
    pageContent = <NinModificationFormView type="dob" />;
    activeKey = 'verify';
  } else if (pathname === '/verify/nin-modification/phone') {
    pageContent = <NinModificationFormView type="phone" />;
    activeKey = 'verify';
  } else if (pathname === '/verify/nin-modification/address') {
    pageContent = <NinModificationFormView type="address" />;
    activeKey = 'verify';
  } else if (pathname === '/verify/birth-attestation') {
    pageContent = <BirthAttestationFormView />;
    activeKey = 'verify';
  } else if (pathname === '/verify/bvn-modification') {
    pageContent = <BvnModificationFormView />;
    activeKey = 'verify';
  } else if (pathname === '/verify/bvn-retrieval') {
    pageContent = <BvnRetrievalFormView />;
    activeKey = 'verify';
  } else if (pathname === '/verify/bvn-android-user' || pathname === '/verify/android-bvn-onboarding') {
    pageContent = <BvnAndroidUserFormView />;
    activeKey = 'verify';
  } else if (pathname === '/verify/self-service' || pathname === '/verify/nin-delinking') {
    pageContent = <SelfServiceFormView />;
    activeKey = 'verify';
  } else if (pathname === '/verify/cac-tin' || pathname === '/verify/cac-registration' || pathname === '/verify/tin-registration' || pathname === '/verify/cac' || pathname === '/verify/tin') {
    pageContent = <CacTinServiceView />;
    activeKey = 'verify';
  } else if (pathname === '/verify/demographic-verification' || pathname === '/verify/demographic') {
    pageContent = <DemographicVerificationFormView />;
    activeKey = 'verify';
  } else if (pathname === '/verify/history') {
    pageContent = <VerificationHistoryView />;
    activeKey = 'history';
  } else if (pathname === '/verify' || pathname === '/verify/nin') {
    pageContent = <VerifyServiceView />;
    activeKey = 'verify';
  } else if (
    pathname === '/wallet/callback' ||
    pathname === '/payment/callback' ||
    pathname === '/paystack/callback' ||
    ((pathname === '/wallet' || pathname === '/wallet/fund') &&
      typeof window !== 'undefined' &&
      (window.location.search.includes('reference=') || window.location.search.includes('trxref=')))
  ) {
    pageContent = <PaystackCallbackView />;
    activeKey = 'wallet';
  } else if (pathname === '/wallet' || pathname === '/wallet/fund') {
    pageContent = <WalletView />;
    activeKey = 'wallet';
  } else if (pathname === '/transactions') {
    pageContent = <TransactionsView />;
    activeKey = 'transactions';
  } else if (pathname === '/profile') {
    pageContent = <ProfileView />;
    activeKey = 'profile';
  } else if (pathname === '/security') {
    pageContent = <SecurityView />;
    activeKey = 'security';
  } else if (pathname === '/support') {
    pageContent = <SupportView />;
    activeKey = 'support';
  } else if (pathname === '/onboarding' || pathname === '/agent-onboarding') {
    pageContent = <AgentOnboardingView />;
    activeKey = 'onboarding';
  } else if (pathname === '/verify/online-nin-registration' || pathname === '/verify/online-nin') {
    pageContent = <OnlineNinRegistrationFormView />;
    activeKey = 'online-nin';
  }

  if (user?.role === 'AGENT') {
    return <AgentLayout activeKey={activeKey}>{pageContent}</AgentLayout>;
  }

  return <AppLayout activeKey={activeKey}>{pageContent}</AppLayout>;
};

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
