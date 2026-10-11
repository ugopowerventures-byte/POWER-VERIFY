import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Service } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { Check, ShieldCheck, ArrowRight, Zap, HelpCircle } from 'lucide-react';

export const PricingView: React.FC = () => {
  const { user, navigate, settings } = useAuth();
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    api.get('/services').then(setServices).catch(console.error);
  }, []);

  return (
    <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-bold text-orange-600 uppercase tracking-wider bg-orange-100/60 px-3 py-1 rounded-full">
          Transparent Pricing
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 mt-3 tracking-tight">
          Pay-Per-Verification Fees
        </h1>
        <p className="text-sm text-gray-600 mt-2">
          No monthly subscription charges. Top up your wallet and pay exclusively for the verifications you run.
        </p>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm mb-16">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Official Service Rate Card</h3>
            <p className="text-xs text-gray-500">Live database charges per successful query.</p>
          </div>
          <button
            onClick={() => navigate(user ? '/wallet/fund' : '/register')}
            className="px-4 py-2 rounded-xl bg-orange-500 text-black font-bold text-xs hover:bg-orange-600 transition-colors"
          >
            {user ? 'Top Up Wallet' : 'Get Started'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500">
              <tr>
                <th className="py-3 px-6">Service Name</th>
                <th className="py-3 px-6">Code</th>
                <th className="py-3 px-6">Category</th>
                <th className="py-3 px-6 text-right">Fee (NGN)</th>
                <th className="py-3 px-6 text-center">Idempotency Lock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-4 px-6 font-bold text-gray-950">{s.name}</td>
                  <td className="py-4 px-6 font-mono text-xs text-gray-500">{s.code}</td>
                  <td className="py-4 px-6 text-xs text-gray-600">{s.category}</td>
                  <td className="py-4 px-6 text-right font-bold text-gray-950 text-base">
                    {formatCurrency(s.price)}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      ✓ Guaranteed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wallet Funding Terms Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#121212] text-white p-8 rounded-3xl border border-[#252525] space-y-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold">Wallet Settlement Policy</h3>
          <ul className="space-y-3 text-xs text-gray-300">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Minimum wallet top-up is {formatCurrency(settings?.minWalletFunding ?? 500)}.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Automated online wallet funding has <strong>0% deposit fee</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>If an official registry is unreachable or down, deductions are <strong>100% instantly refunded</strong> to your wallet balance.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-200 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-gray-950">Commercial & Agent Volume</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Are you a fintech, microfinance bank, or high-volume verification agent running over 500 lookups monthly? Contact our enterprise desk for bulk API key integration.
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 pt-2"
          >
            <span>Inquire About High Volume Pricing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
