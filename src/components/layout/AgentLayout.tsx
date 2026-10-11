import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../common/NotificationBell';
import { BrandLogo } from '../common/BrandLogo';
import { formatCurrency } from '../../utils/currency';
import {
  LayoutDashboard,
  ShieldCheck,
  Grid,
  Wallet,
  ReceiptText,
  History,
  User,
  Lock,
  Headphones,
  FileText,
  LogOut,
  Menu,
  X,
  PlusCircle,
  Fingerprint,
  BadgeCheck,
  Shield,
  Layers,
  ArrowRight
} from 'lucide-react';

interface AgentLayoutProps {
  children: React.ReactNode;
  activeKey?: string;
}

export const AgentLayout: React.FC<AgentLayoutProps> = ({ children, activeKey }) => {
  const { user, wallet, logout, navigate, currentPath } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isApproved = user?.onboardingStatus === 'approved';
  const hasOnlineNin = Boolean(user?.assignedServices?.includes('ONLINE_NIN_REGISTRATION'));

  const navItems = !isApproved
    ? [
        { key: 'onboarding', label: 'Agent Onboarding', path: '/onboarding', icon: ShieldCheck, highlighted: true },
        { key: 'support', label: 'Agent Support Desk', path: '/support', icon: Headphones }
      ]
    : [
        { key: 'dashboard', label: 'Agent Dashboard', path: '/dashboard', icon: LayoutDashboard },
        ...(hasOnlineNin
          ? [{ key: 'online-nin', label: 'Online NIN Registration', path: '/verify/online-nin-registration', icon: Fingerprint, highlighted: true }]
          : []),
        { key: 'verify', label: 'Instant Lookups & Verify', path: '/verify', icon: ShieldCheck },
        { key: 'service-requests', label: 'Agent Service Requests', path: '/my-service-requests', icon: FileText },
        { key: 'services', label: 'Services Catalogue', path: '/services', icon: Grid },
        { key: 'wallet', label: 'Agent Float & Top-up', path: '/wallet', icon: Wallet },
        { key: 'transactions', label: 'Transaction Ledger', path: '/transactions', icon: ReceiptText },
        { key: 'history', label: 'Verification Logs', path: '/verify/history', icon: History },
        { key: 'profile', label: 'Operator Profile', path: '/profile', icon: User },
        { key: 'security', label: 'Security & Password', path: '/security', icon: Lock },
        { key: 'support', label: 'Agent Support Desk', path: '/support', icon: Headphones }
      ];

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900 flex flex-col antialiased">
      {/* Agent Top Header - Dark Blue (#071B3B) with Sky Blue Accent Border */}
      <header className="sticky top-0 z-40 bg-[#071B3B] text-white border-b-2 border-sky-500/40 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="flex items-center gap-3">
          {/* Hamburger toggle */}
          <button
            id="agent-hamburger-btn"
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                setMobileDrawerOpen(true);
              } else {
                setSidebarCollapsed((prev) => !prev);
              }
            }}
            className="p-2 rounded-xl text-sky-200 hover:text-white hover:bg-sky-900/50 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
            title="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Distinct Agent Logo & Console Title */}
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showText={true} textClassName="text-white hidden sm:inline" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-900/60 border border-sky-400/30 text-sky-200 text-xs font-black tracking-wide">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              <span className="uppercase">AGENT CONSOLE</span>
            </div>
          </div>
        </div>

        {/* Right tools */}
        <div className="flex items-center gap-3 sm:gap-4">
          {!isApproved ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Identity Onboarding Required</span>
            </div>
          ) : (
            <>
              {/* Online NIN Quick Status Badge */}
              {hasOnlineNin ? (
                <button
                  onClick={() => navigate('/verify/online-nin-registration')}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-200 text-xs font-bold hover:bg-sky-500/30 transition-all cursor-pointer"
                  title="Online NIN Registration Service Assigned"
                >
                  <Fingerprint className="w-4 h-4 text-sky-400" />
                  <span>Online NIN Active</span>
                </button>
              ) : (
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-sky-300/80 bg-sky-950/60 px-2.5 py-1 rounded-lg border border-sky-800/40">
                  Standard Agent
                </span>
              )}

              {/* Agent Wallet Pill */}
              <div
                onClick={() => navigate('/wallet')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-sky-400/30 cursor-pointer transition-colors"
              >
                <Wallet className="w-4 h-4 text-sky-300" />
                <div className="text-right">
                  <span className="text-[10px] text-sky-200 block leading-none">Float Balance</span>
                  <span className="text-xs sm:text-sm font-black text-white leading-tight">
                    {formatCurrency(wallet?.availableBalance ?? 0)}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/wallet/fund');
                  }}
                  className="ml-1 p-1 rounded-lg bg-sky-500 text-white hover:bg-sky-400 transition-colors"
                  title="Top-up Float"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          <NotificationBell />

          {/* Admin Switcher if role allows */}
          {(user?.role === 'MEGA_ADMIN' || user?.role === 'SUPER_ADMIN') && (
            <button
              onClick={() => navigate('/admin')}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-colors"
            >
              <span>Admin Desk</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Agent Sidebar - Deep Dark Blue (#071835) */}
        <aside
          className={`hidden lg:flex flex-col bg-gradient-to-b from-[#071835] via-[#0B254E] to-[#071835] text-sky-100 border-r border-sky-900/40 transition-all duration-200 shrink-0 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Agent Profile & Status Ribbon */}
          <div className="p-4 border-b border-sky-800/40">
            {!sidebarCollapsed ? (
              <div className="bg-[#05142E] p-3.5 rounded-2xl border border-sky-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                    CERTIFIED AGENT
                  </span>
                  <BadgeCheck className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <p className="font-extrabold text-white text-sm truncate">{user?.fullName}</p>
                  <p className="text-[11px] text-sky-300/80 truncate">
                    {user?.satisfactionTitle || 'Verification Agent Operator'}
                  </p>
                </div>
                <div className="pt-1 border-t border-sky-900/60 flex items-center justify-between text-[11px]">
                  <span className="text-sky-300/70">Agent Float:</span>
                  <span className="font-black text-sky-300">
                    {formatCurrency(wallet?.availableBalance ?? 0)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-xl bg-[#05142E] border border-sky-500/30 text-sky-300 font-black flex items-center justify-center text-sm shadow-sm">
                  AG
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || (activeKey && activeKey === item.key);
              return (
                <button
                  key={item.key}
                  id={`agent-nav-${item.key}`}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] text-white font-bold shadow-md shadow-sky-500/30 border border-sky-300/30'
                      : item.highlighted
                      ? 'text-sky-200 bg-sky-900/30 hover:bg-sky-900/50 hover:text-white border border-sky-500/30'
                      : 'text-sky-200/80 hover:text-white hover:bg-sky-900/30'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : item.highlighted ? 'text-sky-300' : 'text-sky-400'}`} />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="p-3 border-t border-sky-800/40 space-y-1">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center py-2 text-xs text-sky-300/70 hover:text-white cursor-pointer"
            >
              {sidebarCollapsed ? 'Expand ❯' : '❮ Collapse Sidebar'}
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-300 hover:bg-rose-900/20 hover:text-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Slide-in Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className="relative w-72 max-w-[80vw] bg-gradient-to-b from-[#071835] via-[#0B254E] to-[#071835] text-sky-100 h-full flex flex-col z-10 border-r border-sky-900 animate-in slide-in-from-left duration-200">
              <div className="p-4 border-b border-sky-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrandLogo size="sm" showText={true} textClassName="text-white text-sm" />
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded-lg text-sky-300 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-sky-800 bg-[#05142E]">
                <p className="text-xs text-sky-300">Agent Float Balance</p>
                <p className="text-xl font-black text-white">
                  {formatCurrency(wallet?.availableBalance ?? 0)}
                </p>
                <button
                  onClick={() => {
                    navigate('/wallet/fund');
                    setMobileDrawerOpen(false);
                  }}
                  className="mt-2 w-full py-2 rounded-xl bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-sky-400"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Top-up Float</span>
                </button>
              </div>

              <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
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
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] text-white font-bold shadow-md shadow-sky-500/30'
                          : 'text-sky-200 hover:text-white hover:bg-sky-900/40'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-sky-800">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-300 hover:bg-rose-900/20"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Agent Workspace Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
