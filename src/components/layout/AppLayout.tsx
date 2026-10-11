import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../common/NotificationBell';
import { WhatsAppButton } from '../common/WhatsAppButton';
import { BrandLogo } from '../common/BrandLogo';
import { UserAvatar } from '../common/UserAvatar';
import { formatCurrency } from '../../utils/currency';
import {
  LayoutDashboard,
  ShieldCheck,
  Grid,
  Wallet,
  ReceiptText,
  History,
  Bell,
  User,
  Lock,
  Headphones,
  FileText,
  LogOut,
  Menu,
  X,
  PlusCircle,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  Fingerprint
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  activeKey?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, activeKey }) => {
  const { user, wallet, logout, navigate, currentPath, activeAnnouncements, settings } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Check if current route is the public/logged-out home page
  const normalizedPath = currentPath.split('?')[0].split('#')[0].trim().toLowerCase() || '/';
  const isPublicHome = normalizedPath === '/' || normalizedPath === '' || normalizedPath === '/home';

  const isPrivileged = user?.role === 'AGENT' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isPendingApproval = isPrivileged && user?.onboardingStatus !== 'approved';

  const navItems = isPendingApproval
    ? [
        { key: 'onboarding', label: 'Identity Onboarding', path: '/onboarding', icon: ShieldCheck },
        { key: 'support', label: 'Support Desk', path: '/support', icon: Headphones }
      ]
    : [
        { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        ...((['ADMIN', 'SUPER_ADMIN', 'MEGA_ADMIN'].includes(user?.role || '') ||
            (user?.role === 'AGENT' && Boolean(user?.assignedServices?.includes('ONLINE_NIN_REGISTRATION'))))
          ? [{ key: 'online-nin', label: 'Online NIN Reg.', path: '/verify/online-nin-registration', icon: Fingerprint }]
          : []),
        { key: 'verify', label: 'Instant Verification', path: '/verify', icon: ShieldCheck },
        { key: 'service-requests', label: 'My Service Requests', path: '/my-service-requests', icon: FileText },
        { key: 'services', label: 'Services Catalogue', path: '/services', icon: Grid },
        { key: 'wallet', label: 'Wallet & Top-up', path: '/wallet', icon: Wallet },
        { key: 'transactions', label: 'Transactions', path: '/transactions', icon: ReceiptText },
        { key: 'history', label: 'Verification History', path: '/verify/history', icon: History },
        { key: 'profile', label: 'Profile', path: '/profile', icon: User },
        { key: 'security', label: 'Security & Password', path: '/security', icon: Lock },
        { key: 'support', label: 'Support Desk', path: '/support', icon: Headphones }
      ];

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-gray-900 flex flex-col antialiased">
      {/* Maintenance Mode Alert Banner */}
      {settings?.maintenanceMode && (
        <div className="bg-amber-500 text-black px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>UGOPAWAVERIFY is currently undergoing scheduled platform maintenance. Services may experience brief delays.</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#141414] text-white border-b border-[#262626] h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Three-dash / hamburger navigation button - Restored across all authenticated account areas */}
          {user && !isPublicHome && (
            <button
              id="authenticated-hamburger-btn"
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setMobileDrawerOpen(true);
                } else {
                  setSidebarCollapsed((prev) => !prev);
                }
              }}
              className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
              title="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Brand - Static display, not a button, remains steady without directing */}
          <div className="flex items-center gap-2 select-none pointer-events-none">
            <BrandLogo size="sm" showText={true} textClassName="text-white hidden sm:inline" />
          </div>
        </div>

        {/* Right tools: notifications & user avatar */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {user && !isPublicHome && <NotificationBell />}

          {/* Admin Switcher if role allows */}
          {(user?.role === 'MEGA_ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
            <button
              onClick={() => navigate('/admin')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/25 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Desk</span>
            </button>
          )}

          {/* User Account Avatar Link in Top Navbar */}
          {user && !isPublicHome && (
            <button
              id="topbar-user-avatar-btn"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer group border border-white/5"
              title={`Logged in as ${user.fullName} (@${user.username}) - Click to view Profile`}
            >
              <UserAvatar user={user} size="sm" showBorder />
              <span className="hidden md:inline text-xs font-semibold text-gray-200 group-hover:text-white max-w-[110px] truncate">
                {user.fullName?.split(' ')[0] || user.username}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Collapsible Sidebar - Hidden on public home page */}
        {!isPublicHome && user && (
          <aside
            className={`hidden lg:flex flex-col bg-[#121212] text-gray-400 border-r border-[#222222] transition-all duration-200 shrink-0 ${
              sidebarCollapsed ? 'w-20' : 'w-64'
            }`}
          >
            {/* User quick status in sidebar */}
            <div className="p-4 border-b border-[#1F1F1F]">
              {!sidebarCollapsed ? (
                <div
                  onClick={() => navigate('/profile')}
                  className="bg-[#1A1A1A] hover:bg-[#222222] transition-all p-3 rounded-2xl border border-white/5 space-y-2 cursor-pointer group"
                  title="Click to view Account Profile"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Account
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      user?.role === 'MEGA_ADMIN'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : user?.role === 'SUPER_ADMIN'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : user?.role === 'ADMIN'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : user?.role === 'AGENT'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {(user?.role || 'USER').replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <UserAvatar user={user} size="md" showBorder />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-sm truncate group-hover:text-orange-400 transition-colors">
                        {user?.fullName}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate font-mono">@{user?.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                    <span className="text-gray-400">Balance:</span>
                    <span className="font-bold text-amber-400">
                      {formatCurrency(wallet?.availableBalance ?? 0)}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => navigate('/profile')}
                  className="flex justify-center cursor-pointer hover:scale-105 transition-transform"
                  title={`Account: ${user?.fullName} - Click to view Profile`}
                >
                  <UserAvatar user={user} size="md" showBorder />
                </div>
              )}
            </div>

            {/* Navigation links */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path || (activeKey && activeKey === item.key);
                return (
                  <button
                    key={item.key}
                    id={`sidebar-${item.key}`}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold shadow-md shadow-orange-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-black' : 'text-gray-400'}`} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </nav>

            {/* Bottom actions */}
            <div className="p-3 border-t border-[#1F1F1F] space-y-1">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-full flex items-center justify-center py-2 text-xs text-gray-500 hover:text-gray-300"
              >
                {sidebarCollapsed ? 'Expand ❯' : '❮ Collapse Sidebar'}
              </button>
              <button
                id="sidebar-logout-btn"
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && <span>Logout</span>}
              </button>
            </div>
          </aside>
        )}

        {/* Mobile Slide-in Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Slide menu */}
            <div className="relative w-72 max-w-[80vw] bg-[#121212] text-gray-300 h-full flex flex-col z-10 border-r border-[#2A2A2A] animate-in slide-in-from-left duration-200">
              <div className="p-4 border-b border-[#222222] flex items-center justify-between">
                <BrandLogo size="sm" showText={true} textClassName="text-white text-sm" />
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Drawer User Profile Header */}
              {user && (
                <div
                  onClick={() => {
                    navigate('/profile');
                    setMobileDrawerOpen(false);
                  }}
                  className="p-4 border-b border-[#222222] bg-[#161616] flex items-center gap-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                >
                  <UserAvatar user={user} size="md" showBorder />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white text-sm truncate">{user.fullName}</p>
                    <p className="text-[11px] text-gray-400 truncate font-mono">@{user.username}</p>
                  </div>
                </div>
              )}

              <div className="p-4 border-b border-[#222222] bg-[#181818]">
                <p className="text-xs text-gray-400">Available Balance</p>
                <p className="text-xl font-black text-amber-400">
                  {formatCurrency(wallet?.availableBalance ?? 0)}
                </p>
                <button
                  onClick={() => {
                    navigate('/wallet/fund');
                    setMobileDrawerOpen(false);
                  }}
                  className="mt-2 w-full py-2 rounded-xl bg-[#FF6B00] text-black font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Top-up Wallet</span>
                </button>
              </div>

              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path || (activeKey && activeKey === item.key);
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        navigate(item.path);
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${
                        isActive
                          ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold'
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-[#222222]">
                <button
                  onClick={() => {
                    logout();
                    setMobileDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main
          className={`flex-1 overflow-y-auto ${
            isPublicHome ? 'p-0 pb-0 max-w-none' : 'p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12 max-w-7xl mx-auto'
          } w-full`}
        >
          {/* Active Announcements in Dashboard */}
          {activeAnnouncements && activeAnnouncements.length > 0 && (
            <div className="mb-6 space-y-2">
              {activeAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  className="bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-r-2xl flex items-start gap-3 shadow-sm"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-bold text-amber-950 block">{ann.title}</span>
                    <p className="text-amber-900/90 text-xs mt-0.5 leading-relaxed">{ann.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar - Hidden on public home page */}
      {!isPublicHome && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#141414] border-t border-[#262626] flex items-center justify-around h-16 px-2 text-[10px] text-gray-400">
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex flex-col items-center gap-1 ${currentPath === '/dashboard' ? 'text-amber-400 font-bold' : ''}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Home</span>
          </button>
          <button
            onClick={() => navigate('/verify')}
            className={`flex flex-col items-center gap-1 ${currentPath.startsWith('/verify') && currentPath !== '/verify/history' ? 'text-amber-400 font-bold' : ''}`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Verify</span>
          </button>
          <button
            onClick={() => navigate('/wallet')}
            className={`flex flex-col items-center gap-1 ${currentPath.startsWith('/wallet') ? 'text-amber-400 font-bold' : ''}`}
          >
            <Wallet className="w-5 h-5" />
            <span>Wallet</span>
          </button>
          <button
            onClick={() => navigate('/verify/history')}
            className={`flex flex-col items-center gap-1 ${currentPath === '/verify/history' ? 'text-amber-400 font-bold' : ''}`}
          >
            <History className="w-5 h-5" />
            <span>History</span>
          </button>
          <button
            onClick={() => navigate('/profile')}
            className={`flex flex-col items-center gap-1 ${currentPath === '/profile' ? 'text-amber-400 font-bold' : ''}`}
          >
            <User className="w-5 h-5" />
            <span>Profile</span>
          </button>
        </nav>
      )}

      {/* Floating WhatsApp Support Button - Hidden on public home page */}
      {!isPublicHome && <WhatsAppButton />}
    </div>
  );
};
