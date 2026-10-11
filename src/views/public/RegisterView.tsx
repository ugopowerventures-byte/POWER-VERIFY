import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { User, Mail, Phone, Lock, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';
import { FuturisticAuthBackground } from '../../components/common/FuturisticAuthBackground';

export const RegisterView: React.FC = () => {
  const { login, navigate } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.agreeTerms) {
      setError('You must accept the terms of service to proceed');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/register', {
        fullName: formData.fullName,
        phone: formData.phone,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        agreeTerms: formData.agreeTerms
      });
      login(res.token, res.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please review your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080F] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Living futuristic animated financial and digital network background */}
      <FuturisticAuthBackground />

      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10 text-center px-4">
        {/* Logo is static, remains steady without redirecting anywhere */}
        <div className="inline-flex items-center justify-center mb-6 select-none pointer-events-none">
          <BrandLogo size="xl" showText={true} textClassName="text-white text-2xl" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Create verification account
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-gray-300">
          Open a commercial account for individual lookups or business KYC verification.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 relative z-10">
        <div className="bg-[#0D111C]/85 backdrop-blur-xl py-8 px-6 sm:px-10 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Full Legal Name
              </label>
              <div className="relative">
                <input
                  id="reg-fullname"
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Chukwudi Emmanuel Okon"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#121212] border border-[#2F2F2F] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#FF6B00]"
                />
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="reg-email"
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@domain.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#121212] border border-[#2F2F2F] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#FF6B00]"
                  />
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    id="reg-phone"
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="08012345678"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#121212] border border-[#2F2F2F] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#FF6B00]"
                  />
                  <Phone className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Portal Username
              </label>
              <div className="relative">
                <input
                  id="reg-username"
                  type="text"
                  name="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="e.g. ugopawa_agent01"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#121212] border border-[#2F2F2F] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#FF6B00]"
                />
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#121212] border border-[#2F2F2F] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#FF6B00]"
                  />
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="reg-confirmpass"
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#121212] border border-[#2F2F2F] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#FF6B00]"
                  />
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                </div>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="reg-terms"
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                className="mt-1 rounded bg-[#121212] border-[#333] text-orange-600 focus:ring-0 focus:ring-offset-0"
              />
              <label htmlFor="reg-terms" className="text-xs text-gray-400 leading-normal">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => navigate('/terms')}
                  className="text-amber-400 hover:underline"
                >
                  Terms & Conditions
                </button>{' '}
                and understand that identity queries are conducted strictly with NDPR authorization.
              </label>
            </div>

            <button
              id="btn-submit-register"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-extrabold text-sm hover:brightness-110 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Creating Account...' : 'CREATE ACCOUNT & PROCEED'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-400">
            Already registered?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-[#FF6B00] font-bold hover:underline"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
