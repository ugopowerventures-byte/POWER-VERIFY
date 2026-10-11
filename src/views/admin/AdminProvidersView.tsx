import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { VerificationProviderSafe } from '../../types';
import { Key, ShieldCheck, Zap, Edit2, CheckCircle2, AlertTriangle, X, RefreshCw, Lock } from 'lucide-react';

export const AdminProvidersView: React.FC = () => {
  const [providers, setProviders] = useState<VerificationProviderSafe[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<VerificationProviderSafe | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [secretKeyInput, setSecretKeyInput] = useState('');
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [isDevMode, setIsDevMode] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const data = await api.get('/admin/providers');
      setProviders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleOpenEdit = (p: VerificationProviderSafe) => {
    setSelectedProvider(p);
    setApiKeyInput('');
    setSecretKeyInput('');
    setBaseUrlInput(p.baseUrl);
    setIsDevMode(p.isDevelopmentMode);
    setTestResult(null);
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;
    try {
      await api.put(`/admin/providers/${selectedProvider.id}`, {
        baseUrl: baseUrlInput,
        apiKey: apiKeyInput ? apiKeyInput : undefined,
        secretKey: secretKeyInput ? secretKeyInput : undefined,
        isDevelopmentMode: isDevMode
      });
      alert('Provider credentials updated successfully!');
      setSelectedProvider(null);
      await fetchProviders();
    } catch (err: any) {
      alert(err.message || 'Failed to update provider');
    }
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingId(providerId);
    setTestResult(null);
    try {
      const res = await api.post(`/admin/providers/${providerId}/test`);
      setTestResult(res);
      await fetchProviders();
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Verification API Gateways
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Connect official identity aggregator credentials (Prembly / QoreID / Dojah / Custom). Inserting production API keys activates live registry lookups.
        </p>
      </div>

      {testResult && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between border ${
            testResult.success
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{testResult.message || testResult.error}</span>
          </div>
          {testResult.latencyMs && (
            <span className="font-mono font-bold">{testResult.latencyMs}ms latency</span>
          )}
        </div>
      )}

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {providers.map((p) => (
          <div
            key={p.id}
            className="bg-[#161616] p-6 rounded-3xl border border-[#262626] flex flex-col justify-between space-y-6"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{p.name}</h3>
                    <span className="text-[10px] text-gray-500 font-mono">{p.slug}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.status === 'CONNECTED'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {p.status}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs text-gray-400">
                <div className="flex justify-between items-center bg-black/40 px-3 py-2 rounded-xl border border-white/5">
                  <span className="text-gray-300 font-semibold">Live Balance:</span>
                  <span className={`font-mono font-bold text-xs ${
                    p.balance !== undefined && Number(p.balance) > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {p.balance !== undefined ? `₦${Number(p.balance).toLocaleString()} NGN` : 'Click Ping to fetch'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>API Key Configured:</span>
                  <span className={p.hasApiKey ? 'text-emerald-400 font-mono font-bold' : 'text-gray-500'}>
                    {p.hasApiKey ? p.maskedApiKey || 'Active' : 'Not Provided'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Environment Mode:</span>
                  <span
                    className={`font-bold uppercase text-[10px] ${
                      p.isDevelopmentMode ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {p.isDevelopmentMode ? 'Sandbox / Dev' : 'Production Live'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Last Handshake:</span>
                  <span className="text-gray-500 text-[10px]">
                    {p.lastTestedAt ? new Date(p.lastTestedAt).toLocaleTimeString() : 'Never tested'}
                  </span>
                </div>

                <div className="pt-2 border-t border-white/5">
                  <span className="text-[11px] font-semibold text-gray-300 block mb-1">Assigned Services:</span>
                  <p className="text-[10px] text-gray-400 leading-relaxed bg-[#111] p-2 rounded-lg border border-white/5">
                    {p.slug === 'ninja'
                      ? 'NIN Verification, NIN Status Lookup, BVN Verification, Identity Cross-Lookup, Driving Licence, BVN by CRM.'
                      : p.slug === 'veripine'
                      ? 'NIN Phone Search, BVN Retrieval with Phone, Personalization Tracking, Demographic Verification, NIN Name/Phone/Address Modifications & Validation.'
                      : (p.notes || 'General Platform Gateway')}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#262626] flex gap-2">
              <button
                onClick={() => handleTestConnection(p.id)}
                disabled={testingId === p.id}
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-200 border border-white/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{testingId === p.id ? 'Pinging...' : 'Test Ping'}</span>
              </button>

              <button
                onClick={() => handleOpenEdit(p)}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold text-xs hover:brightness-110 flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Configure</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Provider Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#2E2E2E] rounded-3xl max-w-md w-full p-6 space-y-5 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#282828]">
              <h3 className="font-bold text-base">Configure {selectedProvider.name}</h3>
              <button onClick={() => setSelectedProvider(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProvider} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                  Provider Base API URL
                </label>
                <input
                  type="url"
                  required
                  value={baseUrlInput}
                  onChange={(e) => setBaseUrlInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                  API Key / Token (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter provider public/private token..."
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                  Secret Key / App ID (Optional)
                </label>
                <input
                  type="password"
                  value={secretKeyInput}
                  onChange={(e) => setSecretKeyInput(e.target.value)}
                  placeholder="Enter secret token if required..."
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-xs font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-between bg-[#121212] p-3 rounded-xl border border-[#333]">
                <div>
                  <span className="text-xs font-bold block">Development Sandbox Mode</span>
                  <span className="text-[10px] text-gray-500">
                    Use provider sandbox staging environment rather than production endpoints.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isDevMode}
                  onChange={(e) => setIsDevMode(e.target.checked)}
                  className="rounded bg-[#222] border-[#444] text-orange-500 focus:ring-0"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#282828]">
                <button
                  type="button"
                  onClick={() => setSelectedProvider(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-extrabold text-xs"
                >
                  Save Gateway
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
