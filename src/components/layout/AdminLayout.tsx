import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../common/BrandLogo';
import { UserAvatar } from '../common/UserAvatar';
import {
  LayoutDashboard,
  Users,
  Grid,
  Key,
  Wallet,
  Megaphone,
  LifeBuoy,
  FileSpreadsheet,
  FileCheck2,
  FileText,
  Settings,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  Globe
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeKey?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeKey }) => {
  const { user, logout, navigate, currentPath } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isMegaAdmin = user?.role === 'MEGA_ADMIN';

  const adminNavItems = [
    { key: 'dashboard', label: 'Admin Overview', path: '/admin', icon: LayoutDashboard },
    { key: 'service-requests', label: 'Service Requests', path: '/admin/service-requests', icon: FileText },
    { key: 'online-nin', label: 'NIN Registration', path: '/verify/online-nin-registration', icon: Fingerprint },
    { key: 'requests', label: 'Verification Queue', path: '/admin/requests', icon: FileCheck2 },
    { key: 'users', label: 'User Directory', path: '/admin/users', icon: Users },
    { key: 'onboarding', label: 'Agent Onboarding', path: '/admin/onboarding', icon: ShieldCheck },
    { key: 'services', label: 'Services & Pricing', path: '/admin/services', icon: Grid },
    { key: 'providers', label: 'API Providers', path: '/admin/providers', icon: Key },
    ...(isMegaAdmin
      ? [{ key: 'api-accounts', label: 'API Account Center', path: '/admin/api-accounts', icon: Globe }]
      : []),
    { key: 'wallets', label: 'Wallet Deposits', path: '/admin/wallets', icon: Wallet },
    { key: 'announcements', label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
    { key: 'support', label: 'Support Tickets', path: '/admin/support', icon: LifeBuoy },
    { key: 'audit', label: 'Audit Trail', path: '/admin/reports', icon: FileSpreadsheet },
    { key: 'settings', label: 'Platform Settings', path: '/admin/settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-gray-200 flex flex-col antialiased">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-40 bg-[#161616] border-b border-[#282828] h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-lg">
        <div className="flex items-center gap-3">
          {/* Three-dash / hamburger navigation button */}
          <button
            id="admin-hamburger-btn"
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

          {/* Brand - Static display, not a button, remains steady without directing */}
          <div className="flex items-center gap-2.5 select-none pointer-events-none">
            <BrandLogo size="sm" showText={true} textClassName="text-white" subtitle="Admin Desk" />
            <span className={`ml-2 text-xs font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
              user?.role === 'MEGA_ADMIN'
                ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40'
                : user?.role === 'SUPER_ADMIN'
                ? 'bg-red-500/25 text-red-300 border border-red-500/40'
                : 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
            }`}>
              {(user?.role || 'STAFF').replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Switch to User Portal</span>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer group border border-white/5"
            title={`Logged in as ${user?.fullName} (@${user?.username}) - Profile`}
          >
            <UserAvatar user={user} size="sm" showBorder />
            <span className="hidden md:inline text-xs font-semibold text-gray-200 group-hover:text-white max-w-[110px] truncate">
              {user?.fullName?.split(' ')[0] || user?.username}
            </span>
          </button>
        </div>
      </header>

      {/* Content wrapper */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex flex-col bg-[#121212] border-r border-[#222222] shrink-0 transition-all duration-200 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          <div className="p-4 border-b border-[#202020]">
            {!sidebarCollapsed ? (
              <div
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2.5 cursor-pointer group hover:bg-white/5 p-1 rounded-xl transition-colors"
                title="View Profile"
              >
                <UserAvatar user={user} size="sm" showBorder />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate group-hover:text-orange-400 transition-colors">
                    {user?.fullName}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate font-mono">@{user?.username}</p>
                </div>
              </div>
            ) : (
              <div
                onClick={() => navigate('/profile')}
                className="flex justify-center cursor-pointer hover:scale-105 transition-transform"
                title={`Admin: ${user?.fullName}`}
              >
                <UserAvatar user={user} size="sm" showBorder />
              </div>
            )}
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || (activeKey && activeKey === item.key);
              return (
                <button
                  key={item.key}
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

          <div className="p-3 border-t border-[#202020]">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
              title={sidebarCollapsed ? 'Sign Out' : undefined}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className="relative w-72 max-w-[80vw] bg-[#121212] text-gray-300 h-full flex flex-col z-10 border-r border-[#2A2A2A] p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#252525]">
                <BrandLogo size="xs" showText={true} textClassName="text-white text-sm" subtitle="Admin Desk" />
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto">
                {adminNavItems.map((item) => {
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
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="pt-3 border-t border-[#252525]">
                <button
                  onClick={() => {
                    logout();
                    setMobileDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
