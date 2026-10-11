import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { BrandLogo } from '../../components/common/BrandLogo';
import { ShieldCheck, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const MegaAdminAccessView: React.FC = () => {
  const { user, login } = useAuth();
  const [identifier, setIdentifier] = useState('/Mega//admin/ugopawaverify');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated as Mega Admin, automatically navigate to admin console
  useEffect(() => {
    if (user?.role === 'MEGA_ADMIN') {
      window.history.pushState({}, '', '/admin');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier) {
      setError('Mega Admin access identity is required.');
      return;
    }

    if (!cleanPassword) {
      setError('Mega Admin security password is required.');
      return;
    }

    setLoading(true);
    try {
      // Authenticate against secure server-side endpoint
      const res = await api.post('/auth/mega-admin-login', {
        identifier: cleanIdentifier,
        password: cleanPassword
      });

      if (!res.token || !res.user) {
        throw new Error('Invalid authentication response from server.');
      }

      if (res.user?.role !== 'MEGA_ADMIN') {
        throw new Error('Access denied: Provided credentials lack Mega Administrator privileges.');
      }

      // Establish session
      login(res.token, res.user);

      // Navigate directly to the administrative hub
      window.history.pushState({}, '', '/admin');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err: any) {
      setError(err.message || 'Authentication failed: Invalid Mega Administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role === 'MEGA_ADMIN') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#141414] rounded-3xl p-8 border border-amber-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Mega Admin Access Confirmed</h2>
          <p className="text-xs text-gray-400">
            You are currently authenticated as the Permanent System Mega Administrator.
          </p>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/admin');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/20"
          >
            <span>Proceed to Admin Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand & Security Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            <BrandLogo size="lg" showText={true} textClassName="text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black tracking-widest uppercase">
            <Lock className="w-3 h-3" />
            <span>Permanent System Mega Admin Gateway</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Mega Administrator Portal
          </h1>
          <p className="text-xs text-gray-400">
            Protected access checkpoint for the sole authorized system owner.
          </p>
        </div>

        {/* Security Form Card */}
        <div className="bg-[#121212] border border-[#262626] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Mega Admin Identity / Path
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="/Mega//admin/ugopawaverify"
                  className="w-full px-4 py-3 rounded-xl bg-[#1A1A1A] border border-[#2D2D2D] text-white text-xs font-mono focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Mega Admin Password"
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-[#1A1A1A] border border-[#2D2D2D] text-white text-xs font-mono focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-[#FF6B00] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating Mega Admin...</span>
              ) : (
                <>
                  <span>Authenticate & Open Admin Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-[#222] text-center">
            <button
              onClick={() => {
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="text-xs text-gray-500 hover:text-gray-300 font-medium transition-colors cursor-pointer"
            >
              Return to Public Homepage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
