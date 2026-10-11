import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Service } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { Search, UserCheck, CreditCard, PhoneCall, ShieldCheck, FileCheck, ArrowRight } from 'lucide-react';

export const ServicesView: React.FC = () => {
  const { user, navigate } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/services')
      .then((data) => setServices(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'ALL' || s.category === category;
    return matchesSearch && matchesCategory;
  });

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
        return `/verify?service=${code}`;
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

  const categories = ['ALL', ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))];

  return (
    <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="text-xs font-bold text-orange-600 uppercase tracking-wider bg-orange-100/60 px-3 py-1 rounded-full">
          Registry Directory
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3 tracking-tight">
          Available Verification Services
        </h1>
        <p className="text-sm text-gray-600 mt-2">
          Real-time, automated verification across certified national identity databases with instant slips.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search service by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:border-orange-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                category === c
                  ? 'bg-[#121212] text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {c.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-52 bg-white rounded-3xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 max-w-md mx-auto">
          <p className="text-gray-500 text-sm">No services found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              onClick={() => handleSelectService(service)}
              className="bg-white rounded-3xl p-6 border border-gray-200 hover:border-orange-500/50 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-mono font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-md border border-orange-200">
                    {service.code}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      service.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {service.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                  {service.name}
                </h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  {service.description}
                </p>

                <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                  <span className="font-semibold text-gray-700 block">Required Details:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {service.requiredFields.map((f) => (
                      <span
                        key={f.name}
                        className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px]"
                      >
                        {f.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Price</span>
                  <span className="text-xl font-black text-gray-950 font-mono">
                    {formatCurrency(service.price)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectService(service);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#121212] text-white hover:bg-orange-500 hover:text-black font-bold text-xs transition-all"
                >
                  <span>Select Service</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
