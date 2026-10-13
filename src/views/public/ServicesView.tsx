import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Service } from '../../types';
import { formatCurrency } from '../../utils/currency';
import {
  Search,
  UserCheck,
  CreditCard,
  PhoneCall,
  ShieldCheck,
  FileCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Building,
  Baby,
  FileEdit,
  SlidersHorizontal,
  X,
  BadgeCheck,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export const ServicesView: React.FC = () => {
  const { user, navigate } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.get('/services')
      .then((data: Service[]) => {
        if (isMounted) setServices(data || []);
      })
      .catch((err) => {
        console.error('Failed to load services:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Map service codes to dedicated forms
  const getServiceRoute = (code: string) => {
    const upper = code.toUpperCase();
    switch (upper) {
      case 'NIN_NAME_MOD':
        return '/verify/nin-modification/name';
      case 'NIN_DOB_MOD':
        return '/verify/nin-modification/dob';
      case 'NIN_PHONE_MOD':
        return '/verify/nin-modification/phone';
      case 'NIN_ADDRESS_MOD':
        return '/verify/nin-modification/address';
      case 'MODIFICATION':
      case 'NIN_MODIFICATION':
      case 'PERSONALIZATION':
      case 'PERSONALISATION':
      case 'IPE_CLEARANCE':
      case 'IPE_MODIFICATION':
      case 'NIN_VALIDATION':
        return '/verify/modification';
      case 'CAC_TIN':
      case 'CAC_REGISTRATION':
      case 'TIN_REGISTRATION':
      case 'TIN':
      case 'COMPANY_CAC':
      case 'BUSINESS_CAC':
      case 'TIN_INDIVIDUAL':
      case 'TIN_COMPANY':
        return '/verify/cac-tin';
      case 'BIRTH_ATTESTATION':
        return '/verify/birth-attestation';
      case 'BVN_MODIFICATION':
        return '/verify/bvn-modification';
      case 'BVN_RETRIEVAL':
        return '/verify/bvn-retrieval';
      case 'BVN_ANDROID_USER':
      case 'ANDROID_BVN_ONBOARDING':
        return '/verify/bvn-android-user';
      case 'NIN_DELINKING':
      case 'SELF_SERVICE_EMAIL':
      case 'SELF_SERVICE':
        return '/verify/self-service';
      case 'DEMOGRAPHIC_VERIFICATION':
      case 'DEMOGRAPHIC':
        return '/verify/demographic-verification';
      case 'ONLINE_NIN_REGISTRATION':
      case 'ONLINE_NIN':
        return '/verify/online-nin-registration';
      default:
        return `/verify?service=${encodeURIComponent(code)}`;
    }
  };

  const handleSelectService = (service: Service) => {
    const targetRoute = getServiceRoute(service.code);
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(targetRoute)}`);
    } else {
      navigate(targetRoute);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.category) set.add(s.category.trim());
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [services]);

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return services.filter((s) => {
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        (s.description && s.description.toLowerCase().includes(query)) ||
        (s.category && s.category.toLowerCase().includes(query));
      const matchesCategory =
        selectedCategory === 'ALL' ||
        (s.category && s.category.trim().toLowerCase() === selectedCategory.toLowerCase());
      return matchesSearch && matchesCategory;
    });
  }, [services, search, selectedCategory]);

  const getServiceIcon = (category: string, code: string) => {
    const c = category.toLowerCase();
    const cd = code.toLowerCase();
    if (cd.includes('bvn') || c.includes('bank')) return CreditCard;
    if (cd.includes('phone') || cd.includes('telecom')) return PhoneCall;
    if (cd.includes('birth') || cd.includes('civil')) return Baby;
    if (cd.includes('cac') || cd.includes('tin') || c.includes('corporate')) return Building;
    if (cd.includes('mod') || cd.includes('delink') || cd.includes('clear')) return FileEdit;
    return ShieldCheck;
  };

  return (
    <div className="min-h-screen bg-[#0D0D0E] text-white">
      {/* Premium Hero Header Section */}
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#141416] via-[#0E0E10] to-[#0D0D0E] pt-10 pb-12 sm:pt-16 sm:pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-72 bg-gradient-to-r from-[#FF6B00]/15 via-red-600/10 to-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#FF8A00]">
                BAZERIGHTVERIFY Official Catalogue
              </span>
              <span className="text-[10px] text-gray-400 font-mono">BAZERIGHT VERIFY SERVICES LTD</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Instant Verification & <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-white via-gray-100 to-[#FF8A00] bg-clip-text text-transparent">
                Civil Registry Services
              </span>
            </h1>

            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Automated, certified lookup portal for National Identity (NIMC), Banking Verification (BVN), Corporate Affairs (CAC), Tax Registry (JTB), and Civil Records with instant digital certificates.
            </p>

            {/* Quick Stat Pill Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-mono text-gray-300">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/5">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{services.length} Total Services</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/5">
                <Lock className="w-3.5 h-3.5 text-[#FF8A00]" />
                <span>256-Bit Idempotent Security</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant Slip Download</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Controls Bar: Search & Category Pills */}
        <div className="bg-[#151518] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by service name, code, or description (e.g., NIN, BVN, CAC)..."
                className="w-full pl-11 pr-10 py-3 rounded-xl bg-[#0E0E10] border border-white/10 text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Counter Badge */}
            <div className="flex items-center justify-between md:justify-end gap-3 text-xs text-gray-400">
              <span className="font-mono">
                Showing <strong className="text-white font-bold">{filteredServices.length}</strong> of {services.length} services
              </span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF8A00]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Filter by Category:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black shadow-md shadow-orange-500/20 scale-[1.02]'
                        : 'bg-white/[0.04] text-gray-300 border border-white/10 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Services' : cat.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Services Grid Display */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="h-64 rounded-3xl bg-[#141417] border border-white/5 animate-pulse p-6 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-5 w-24 bg-white/5 rounded-md" />
                  <div className="h-6 w-3/4 bg-white/10 rounded-md" />
                  <div className="h-4 w-full bg-white/5 rounded-md" />
                  <div className="h-4 w-2/3 bg-white/5 rounded-md" />
                </div>
                <div className="h-10 w-full bg-white/10 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="bg-[#141417] rounded-3xl p-12 text-center border border-white/10 max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 text-gray-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">No matching services found</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              We couldn't find any verification services matching "{search}". Try searching for NIN, BVN, Phone, CAC, or reset filters.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('ALL');
              }}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filteredServices.map((service) => {
              const ServiceIcon = getServiceIcon(service.category || '', service.code);
              const isAvailable = service.status === 'ACTIVE';

              return (
                <div
                  key={service.id || service.code}
                  onClick={() => handleSelectService(service)}
                  className="group relative bg-[#151518] hover:bg-[#1A1A1E] rounded-3xl p-6 sm:p-7 border border-white/10 hover:border-[#FF6B00]/60 shadow-lg hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-200 flex flex-col justify-between cursor-pointer"
                >
                  {/* Card Top: Code Badge & Status */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF6B00]/20 to-red-600/10 border border-[#FF6B00]/30 text-[#FF8A00] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <ServiceIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono font-bold tracking-wider text-[#FF8A00] bg-[#FF6B00]/10 px-2.5 py-0.5 rounded-md border border-[#FF6B00]/20 block w-fit">
                            {service.code}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5 block">
                            {service.category || 'General'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          isAvailable
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {service.status}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-base sm:text-lg font-extrabold text-white group-hover:text-[#FF8A00] transition-colors leading-snug">
                      {service.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                      {service.description || 'Certified national identity & document verification service.'}
                    </p>

                    {/* Required Fields Pill Section */}
                    {service.requiredFields && service.requiredFields.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                          Required Input:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {service.requiredFields.slice(0, 3).map((f) => (
                            <span
                              key={f.name}
                              className="text-[10px] bg-white/[0.04] text-gray-300 border border-white/10 px-2 py-0.5 rounded-md"
                            >
                              {f.label}
                            </span>
                          ))}
                          {service.requiredFields.length > 3 && (
                            <span className="text-[10px] bg-white/[0.04] text-gray-400 border border-white/10 px-1.5 py-0.5 rounded-md font-mono">
                              +{service.requiredFields.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Price & Open Action */}
                  <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                        Official Fee
                      </span>
                      <span className="text-xl font-black text-white font-mono tracking-tight group-hover:text-white transition-colors">
                        {formatCurrency(service.price)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectService(service);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-extrabold text-xs hover:brightness-110 shadow-md shadow-orange-500/20 group-hover:scale-105 transition-all cursor-pointer"
                    >
                      <span>Proceed</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

