import React, { useState } from 'react';
import { api } from '../../lib/apiClient';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export const SecurityView: React.FC = () => {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    try {
      setPassLoading(true);
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      });
      setPassMsg({ type: 'success', text: 'Password successfully changed.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
          Security Settings
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Manage your account access password and authentication security.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Change Password</h3>
            <p className="text-xs text-gray-500">Update your account login password.</p>
          </div>
        </div>

        {passMsg && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
              passMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {passMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{passMsg.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>

          <button
            type="submit"
            disabled={passLoading}
            className="w-full py-3 rounded-xl bg-[#121212] text-white font-bold text-xs hover:bg-orange-500 hover:text-black transition-colors disabled:opacity-50 cursor-pointer"
          >
            {passLoading ? 'Updating Password...' : 'Save New Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
