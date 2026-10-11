import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Service } from '../../types';
import { formatCurrency } from '../../utils/currency';
import {
  FileEdit,
  UserCheck,
  Calendar,
  PhoneCall,
  Home,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Clock,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export const NinModificationHubView: React.FC = () => {
  const { wallet, navigate } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const list: Service[] = await api.get('/services');
        setServices(list || []);
      } catch (err) {
        console.error('Failed to load services:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Retrieve prices from DB services or fallback to official default prices
  const getPrice = (code: string, fallback: number) => {
    const s = services.find((srv) => srv.code === code);
    return s?.price ?? fallback;
  };

  const nameModPrice = getPrice('NIN_NAME_MOD', 4500);
  const dobModPrice = getPrice('NIN_DOB_MOD', 50000);
  const phoneModPrice = getPrice('NIN_PHONE_MOD', 4500);
  const addressModPrice = getPrice('NIN_ADDRESS_MOD', 4500);

  const modificationOptions = [
    {
      id: 'name',
      title: 'NAME MODIFICATION',
      code: 'NIN_NAME_MOD',
      price: nameModPrice,
      description: 'Change registered name',
      detailedDesc: 'Correct spelling errors, change surname due to marriage, or re-order legal names in the NIMC biometric registry.',
      icon: UserCheck,
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      iconBg: 'bg-emerald-500/15 text-emerald-400',
      route: '/verify/nin-modification/name',
      eta: 'Processed in ~1 hour'
    },
    {
      id: 'dob',
      title: 'DATE OF BIRTH',
      code: 'NIN_DOB_MOD',
      price: dobModPrice,
      description: 'Update date of birth',
      detailedDesc: 'Authorized date-of-birth correction with official National Population Commission (NPC) birth attestation linkage.',
      icon: Calendar,
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      iconBg: 'bg-amber-500/15 text-amber-400',
      route: '/verify/nin-modification/dob',
      eta: 'Official registry update'
    },
    {
      id: 'phone',
      title: 'PHONE NUMBER',
      code: 'NIN_PHONE_MOD',
      price: phoneModPrice,
      description: 'Change phone number',
      detailedDesc: 'Update your active mobile contact number registered on the national biometric identity database.',
      icon: PhoneCall,
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      iconBg: 'bg-blue-500/15 text-blue-400',
      route: '/verify/nin-modification/phone',
      eta: 'Processed in ~1 hour'
    },
    {
      id: 'address',
      title: 'ADDRESS',
      code: 'NIN_ADDRESS_MOD',
      price: addressModPrice,
      description: 'Update residential address',
      detailedDesc: 'Change your state, LGA, and residential address particulars in accordance with current residence proof.',
      icon: Home,
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      iconBg: 'bg-purple-500/15 text-purple-400',
      route: '/verify/nin-modification/address',
      eta: 'Processed in ~1 hour'
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Navigation Breadcrumb & Back */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <button
            onClick={() => navigate('/dashboard')}
            className="hover:text-gray-900 transition-colors font-medium"
          >
            Dashboard
          </button>
          <span>/</span>
          <button
            onClick={() => navigate('/services')}
            className="hover:text-gray-900 transition-colors font-medium"
          >
            Services
          </button>
          <span>/</span>
          <span className="text-gray-900 font-bold">NIN Modification</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/services')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Choose Different Service</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 border border-gray-200 text-xs">
            <Wallet className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-500">Balance:</span>
            <span className="font-mono font-bold text-gray-900">
              {formatCurrency(wallet?.availableBalance ?? 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A1A1A] via-[#121212] to-[#0A0A0A] p-6 sm:p-8 text-white border border-white/10 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Identity Services</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            NIN Modification
          </h1>
          <p className="text-sm sm:text-base text-gray-300 font-medium">
            Update your NIN details with NIMC
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span>Fast Track Processing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Real-Time Wallet Payment</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Official NIMC Registry Records</span>
            </div>
          </div>
        </div>

        {/* Decorative corner glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#FF6B00]/10 blur-3xl pointer-events-none" />
      </div>

      {/* Section Subtitle */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-gray-900">Select Modification Option</h2>
        <p className="text-xs text-gray-500">
          Choose the specific record you wish to update on your National Identity Number. Each card opens its dedicated submission form.
        </p>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {modificationOptions.map((opt) => {
          const Icon = opt.icon;
          return (
            <div
              key={opt.id}
              onClick={() => navigate(opt.route)}
              className="group relative bg-white rounded-3xl border-2 border-gray-200 hover:border-[#FF6B00] p-6 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className={`p-3.5 rounded-2xl ${opt.iconBg}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <span className="block text-xs uppercase font-bold text-gray-400">Service Fee</span>
                    <span className="text-xl sm:text-2xl font-black text-gray-950 font-mono tracking-tight">
                      {formatCurrency(opt.price)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-[#FF6B00] transition-colors">
                      {opt.title}
                    </h3>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    {opt.description}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed pt-1">
                    {opt.detailedDesc}
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {opt.eta}
                </span>

                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#FF6B00] group-hover:translate-x-1 transition-transform">
                  <span>Start Form</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Birth Attestation Cross Link Banner */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
            Related Civil Registry Service
          </span>
          <h4 className="text-sm font-bold text-gray-900">Need Birth Attestation for Date of Birth Modification?</h4>
          <p className="text-xs text-gray-500">
            Apply for an official National Population Commission (NPC) Birth Attestation form ({formatCurrency(getPrice('BIRTH_ATTESTATION', 15000))}).
          </p>
        </div>
        <button
          onClick={() => navigate('/verify/birth-attestation')}
          className="whitespace-nowrap px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-colors shadow-sm"
        >
          Open Birth Attestation Form →
        </button>
      </div>
    </div>
  );
};
