import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordView: React.FC = () => {
  const { navigate } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2.5 cursor-pointer mb-6"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF6B00] via-[#FF8A00] to-[#FFB800] flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-7 h-7 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-black text-white">
            BAZERIGHT<span className="text-[#FF6B00]">VERIFY</span>
          </span>
        </div>
        <h2 className="text-2xl font-extrabold text-white">Reset Account Password</h2>
        <p className="mt-2 text-xs text-gray-400">
          Enter your registered email address to receive password reset instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-[#181818] py-8 px-6 sm:px-10 rounded-3xl border border-[#2A2A2A] shadow-2xl">
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">Check Your Inbox</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                If an account matches <strong>{email}</strong>, a secure password reset link has been dispatched to your mailbox.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-colors"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#121212] border border-[#2F2F2F] rounded-xl text-white text-sm focus:outline-none focus:border-[#FF6B00]"
                  />
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-extrabold text-sm hover:brightness-110 shadow-lg shadow-orange-500/25 transition-all"
              >
                {loading ? 'Dispatching Link...' : 'SEND RESET INSTRUCTIONS'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white pt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
