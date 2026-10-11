import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import {
  Save,
  CheckCircle2,
  Coins,
  Phone,
  Mail,
  Building,
  ShieldAlert,
  Info,
  Layers,
  ArrowRightLeft,
  Database
} from 'lucide-react';

export const AdminSettingsView: React.FC = () => {
  const { refreshSettings } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const [data, supaData] = await Promise.all([
          api.get('/admin/settings'),
          api.get('/supabase/status').catch(() => null)
        ]);
        if (supaData) {
          setSupabaseStatus(supaData);
        }
        setSettings({
          ...data,
          unitValueNgn: data.unitValueNgn || 200,
          whatsappNumber: data.whatsappNumber || data.supportWhatsapp || '07071944789',
          phoneNumber1: data.phoneNumber1 || '07071944789',
          phoneNumber2: data.phoneNumber2 || '07018486189',
          businessEmail: data.businessEmail || data.supportEmail || 'contact@ugopawaverify.com.ng'
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const payload = {
        ...settings,
        unitValueNgn: Number(settings.unitValueNgn) || 200,
        supportWhatsapp: settings.whatsappNumber,
        supportEmail: settings.businessEmail
      };
      await api.put('/admin/settings', payload);
      await refreshSettings();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="p-12 text-center text-gray-500">Loading system settings...</div>;
  }

  const currentUnitRate = Number(settings.unitValueNgn) || 200;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          System, Currency & Business Settings
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Administer the customer-facing Credits conversion rate, centralized contact channels, banking details, and deposit controls.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Platform settings & Credits conversion rate successfully updated and broadcasted!</span>
        </div>
      )}

      {/* Supabase Live Cloud Connection Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#161616] border border-[#282828] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Supabase Cloud Database</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                supabaseStatus?.connected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {supabaseStatus?.connected ? 'Connected & Live' : 'Connecting...'}
              </span>
            </div>
            <p className="text-xs font-mono text-gray-400 mt-0.5">
              {supabaseStatus?.url || 'https://yhwtkowbvbhfmskyxtju.supabase.co'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-gray-400">
          <div>
            <span className="block text-[10px] text-gray-500 uppercase">Remote Services</span>
            <span className="text-white font-mono font-bold">{supabaseStatus?.servicesCount ?? 30} Services</span>
          </div>
          <div>
            <span className="block text-[10px] text-gray-500 uppercase">Remote Settings</span>
            <span className="text-emerald-400 font-bold">{supabaseStatus?.settingsFound ? 'Active' : 'Syncing'}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Customer-Facing Currency & Credits Conversion Rate */}
        <div className="bg-[#161616] p-6 rounded-3xl border border-[#262626] space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#242424]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm uppercase tracking-wider text-amber-400">
                  Currency & Conversion Engine
                </h3>
                <p className="text-xs text-gray-400">
                  All customer-facing prices and wallet balances display in <strong>Credits</strong>.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-bold border border-amber-500/30">
              Active Currency: Credits
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-amber-400 mb-1">
                Conversion Rate: 1 Credit = Naira Value (₦)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold text-sm">₦</span>
                <input
                  type="number"
                  required
                  min={1}
                  step={1}
                  value={settings.unitValueNgn}
                  onChange={(e) => setSettings({ ...settings, unitValueNgn: Number(e.target.value) })}
                  className="w-full pl-8 pr-3 py-2 bg-[#121212] border border-amber-500/40 rounded-xl text-base font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-400 shadow-inner"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Default: ₦200 per Credit. Changing this updates price presentations and top-up math across the site.
              </p>
            </div>

            {/* Live Calculation Preview Card */}
            <div className="bg-[#121212] p-4 rounded-2xl border border-[#2a2a2a] space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold">
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                <span>Live Conversion Table at ₦{currentUnitRate.toLocaleString()} / Credit</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-1.5 rounded-lg bg-[#181818] border border-[#262626] flex justify-between">
                  <span className="text-gray-400">₦200:</span>
                  <span className="text-amber-400 font-bold">{(200 / currentUnitRate).toFixed(1)} Credits</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[#181818] border border-[#262626] flex justify-between">
                  <span className="text-gray-400">₦1,000:</span>
                  <span className="text-amber-400 font-bold">{(1000 / currentUnitRate).toFixed(1)} Credits</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[#181818] border border-[#262626] flex justify-between">
                  <span className="text-gray-400">₦5,000:</span>
                  <span className="text-amber-400 font-bold">{(5000 / currentUnitRate).toFixed(1)} Credits</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[#181818] border border-[#262626] flex justify-between">
                  <span className="text-gray-400">₦10,000:</span>
                  <span className="text-amber-400 font-bold">{(10000 / currentUnitRate).toFixed(1)} Credits</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Business Contact Details */}
        <div className="bg-[#161616] p-6 rounded-3xl border border-[#262626] space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#242424]">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm uppercase tracking-wider text-orange-400">
                Official Business Contact Channels
              </h3>
              <p className="text-xs text-gray-400">
                These contact details automatically sync to the header, floating WhatsApp desk, and support pages.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                Official WhatsApp Desk
              </label>
              <input
                type="text"
                required
                value={settings.whatsappNumber}
                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                placeholder="e.g. 07071944789"
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs text-white focus:outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                Official Business Email
              </label>
              <input
                type="email"
                required
                value={settings.businessEmail}
                onChange={(e) => setSettings({ ...settings, businessEmail: e.target.value })}
                placeholder="e.g. contact@ugopawaverify.com.ng"
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs text-white focus:outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                Call Number 1 (Primary Phone)
              </label>
              <input
                type="text"
                required
                value={settings.phoneNumber1}
                onChange={(e) => setSettings({ ...settings, phoneNumber1: e.target.value })}
                placeholder="e.g. 07071944789"
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs text-white focus:outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                Call Number 2 (Secondary Phone)
              </label>
              <input
                type="text"
                required
                value={settings.phoneNumber2}
                onChange={(e) => setSettings({ ...settings, phoneNumber2: e.target.value })}
                placeholder="e.g. 07018486189"
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs text-white focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Brand Identity & Meta */}
        <div className="bg-[#161616] p-6 rounded-3xl border border-[#262626] space-y-4">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider text-gray-300">
            Brand Identity & Meta
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                Platform Name
              </label>
              <input
                type="text"
                required
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs text-white focus:outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                Platform Tagline
              </label>
              <input
                type="text"
                required
                value={settings.platformTagline}
                onChange={(e) => setSettings({ ...settings, platformTagline: e.target.value })}
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs text-white focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Banking Settlement Account */}
        <div className="bg-[#161616] p-6 rounded-3xl border border-[#262626] space-y-4">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider text-emerald-400">
            Direct Bank Settlement Account (Moniepoint MFB)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                required
                value={settings.bankDetails?.bankName || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bankDetails: { ...settings.bankDetails, bankName: e.target.value }
                  })
                }
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs text-white focus:outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                Account Number
              </label>
              <input
                type="text"
                required
                value={settings.bankDetails?.accountNumber || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bankDetails: { ...settings.bankDetails, accountNumber: e.target.value }
                  })
                }
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                Account Name
              </label>
              <input
                type="text"
                required
                value={settings.bankDetails?.accountName || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bankDetails: { ...settings.bankDetails, accountName: e.target.value }
                  })
                }
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs text-white focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Deposit Limits & Maintenance */}
        <div className="bg-[#161616] p-6 rounded-3xl border border-[#262626] space-y-4">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider text-gray-400">
            Deposit Limits & Maintenance State
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                Minimum Deposit (₦ Naira Base)
              </label>
              <input
                type="number"
                required
                value={settings.minWalletFunding}
                onChange={(e) =>
                  setSettings({ ...settings, minWalletFunding: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#FF6B00]"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Equates to {(settings.minWalletFunding / currentUnitRate).toFixed(1)} Credits
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                Maximum Single Deposit (₦ Naira Base)
              </label>
              <input
                type="number"
                required
                value={settings.maxWalletFunding}
                onChange={(e) =>
                  setSettings({ ...settings, maxWalletFunding: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#FF6B00]"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Equates to {(settings.maxWalletFunding / currentUnitRate).toFixed(1)} Credits
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#121212] rounded-2xl border border-[#333]">
            <div>
              <span className="font-bold text-sm text-white block">Maintenance Mode</span>
              <span className="text-xs text-gray-400">
                When enabled, non-admin users will see an operational maintenance notice.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              className="rounded bg-[#222] border-[#444] text-orange-500 focus:ring-0 w-5 h-5"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-black text-sm hover:brightness-110 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Changes...' : 'SAVE & PUBLISH SETTINGS'}</span>
        </button>
      </form>
    </div>
  );
};
