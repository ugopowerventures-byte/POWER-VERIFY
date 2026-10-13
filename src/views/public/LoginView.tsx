import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Eye, EyeOff, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';
import { FuturisticAuthBackground } from '../../components/common/FuturisticAuthBackground';

export const LoginView: React.FC = () => {
  const { login, navigate } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const notice = sessionStorage.getItem('suspension_notice');
      if (notice) {
        setError(notice);
        sessionStorage.removeItem('suspension_notice');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier || !password) {
      setError('Please enter your email or username and password');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/login', { identifier, password });
      login(res.token, res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080F] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Living futuristic animated financial and digital network background */}
      <FuturisticAuthBackground />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center px-4">
        {/* Logo is static, remains steady without redirecting anywhere */}
        <div className="inline-flex items-center justify-center mb-6 select-none pointer-events-none">
          <BrandLogo size="xl" showText={true} textClassName="text-white text-2xl" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Welcome to your portal
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-gray-300">
          Sign in to access your verification gateway and services.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
        <div className="bg-[#0D111C]/85 backdrop-blur-xl py-8 px-6 sm:px-10 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                Email or Username
              </label>
              <div className="relative">
                <input
                  id="login-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. agent@bazerightverify.ng"
                  className="w-full pl-10 pr-4 py-3 bg-[#121212] border border-[#2F2F2F] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                />
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs text-amber-400 hover:text-amber-300"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full pl-10 pr-10 py-3 bg-[#121212] border border-[#2F2F2F] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                />
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-extrabold text-sm hover:brightness-110 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'SIGN IN'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-400">
            Don't have an account yet?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-[#FF6B00] font-bold hover:underline"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
