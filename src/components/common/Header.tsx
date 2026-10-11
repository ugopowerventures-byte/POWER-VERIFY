import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, ArrowRight, User } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { UserAvatar } from './UserAvatar';

export const Header: React.FC = () => {
  const { user, navigate, currentPath } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks: { label: string; path: string }[] = [];

  return (
    <header className="sticky top-0 z-50 bg-[#121212]/95 backdrop-blur-md border-b border-[#2A2A2A] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo - Static display, not a button, remains steady without directing */}
        <div
          id="header-brand-logo"
          className="flex items-center gap-2 select-none pointer-events-none"
        >
          <BrandLogo size="md" showText={true} textClassName="text-white" subtitle="Secure Identity Gateway" />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navLinks.map((link) => {
            const isActive = currentPath === link.path;
            return (
              <button
                key={link.path}
                id={`nav-link-${link.label.toLowerCase()}`}
                onClick={() => navigate(link.path)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[#FFB800] bg-white/5'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <button
              id="header-dashboard-btn"
              onClick={() => navigate(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MEGA_ADMIN' ? '/admin' : '/dashboard')}
              className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-semibold text-sm hover:brightness-110 shadow-lg shadow-orange-500/25 transition-all"
            >
              <UserAvatar user={user} size="xs" showBorder />
              <span>{user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MEGA_ADMIN' ? 'Admin Portal' : 'My Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                id="header-login-btn"
                onClick={() => navigate('/login')}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                LOGIN
              </button>
              <button
                id="header-register-btn"
                onClick={() => navigate('/register')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold text-sm hover:brightness-110 shadow-lg shadow-orange-500/25 transition-all"
              >
                <span>CREATE ACCOUNT</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Menu Button */}
        <button
          id="header-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2.5 rounded-xl bg-white/5 text-gray-300 hover:text-white border border-white/10"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#161616] border-b border-[#2A2A2A] px-4 pt-3 pb-6 space-y-2">
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => {
                navigate(link.path);
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-3 rounded-xl text-base font-medium text-gray-200 hover:text-white hover:bg-white/5"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-4 border-t border-white/10 space-y-2">
            {user ? (
              <button
                onClick={() => {
                  navigate(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MEGA_ADMIN' ? '/admin' : '/dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold text-center"
              >
                Go to {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MEGA_ADMIN' ? 'Admin Panel' : 'User Dashboard'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    navigate('/login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-3 rounded-xl bg-white/5 text-white font-semibold text-center"
                >
                  LOGIN
                </button>
                <button
                  onClick={() => {
                    navigate('/register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold text-center"
                >
                  CREATE ACCOUNT
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
