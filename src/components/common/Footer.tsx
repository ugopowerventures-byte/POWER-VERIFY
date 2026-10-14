import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Phone, MapPin, ExternalLink, Lock } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export const Footer: React.FC = () => {
  const { navigate, settings } = useAuth();

  return (
    <footer className="bg-[#142B8C] text-blue-100 pt-16 pb-12 border-t border-[#1E3CA8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/15">
          {/* Column 1: Brand & Identity */}
          <div className="lg:col-span-2 space-y-4">
            <BrandLogo size="lg" showText={true} textClassName="text-white text-2xl" />
            <p className="text-sm text-blue-100/80 leading-relaxed max-w-sm">
              BAZERIGHTVERIFY is Nigeria's premier enterprise identity verification and digital services architecture. Providing individuals, fintechs, and organizations with fast, cryptographic verification against national registries.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#38BDF8] bg-white/10 border border-[#38BDF8]/30 px-3 py-1.5 rounded-lg w-fit">
              <Lock className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="font-semibold">NDPR Certified & Bank-Grade 256-Bit SSL Secured</span>
            </div>
          </div>

          {/* Column 2: Verification Services */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
              Services
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => navigate('/services')} className="hover:text-[#38BDF8] transition-colors cursor-pointer">
                  NIN Verification
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/services')} className="hover:text-[#38BDF8] transition-colors cursor-pointer">
                  BVN Verification
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/services')} className="hover:text-[#38BDF8] transition-colors cursor-pointer">
                  Phone Number Match
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/services')} className="hover:text-[#38BDF8] transition-colors cursor-pointer">
                  NIN Validation Slip
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/services')} className="hover:text-[#38BDF8] transition-colors cursor-pointer">
                  Identity Registry Lookup
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform & Links */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => navigate('/about')} className="hover:text-[#38BDF8] transition-colors cursor-pointer">
                  About BAZERIGHTVERIFY
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/pricing')} className="hover:text-[#38BDF8] transition-colors cursor-pointer">
                  Pricing & Wallet Top-up
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/terms')} className="hover:text-[#38BDF8] transition-colors cursor-pointer">
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/privacy')} className="hover:text-[#38BDF8] transition-colors cursor-pointer">
                  Privacy Policy & NDPR
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/contact')} className="hover:text-[#38BDF8] transition-colors cursor-pointer">
                  Contact Support
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Operations */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
              Desk & Support
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
                <span>Victoria Island, Lagos & Central Business District, Abuja, Nigeria</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#38BDF8] shrink-0" />
                <a href={`mailto:${settings?.businessEmail || settings?.supportEmail || 'contact@bazerightverify.com.ng'}`} className="hover:text-[#38BDF8] transition-colors">
                  {settings?.businessEmail || settings?.supportEmail || 'contact@bazerightverify.com.ng'}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#38BDF8] shrink-0" />
                <span>
                  {settings?.phoneNumber1 || settings?.whatsappNumber || settings?.supportWhatsapp || '07071944789'}
                  {settings?.phoneNumber2 ? ` / ${settings.phoneNumber2}` : ''}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-blue-200/70 gap-4">
          <p>© {new Date().getFullYear()} BAZERIGHTVERIFY. All rights reserved. Commercial Identity Solutions.</p>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors cursor-pointer">
              Terms
            </button>
            <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors cursor-pointer">
              Privacy
            </button>
            <button onClick={() => navigate('/contact')} className="hover:text-white transition-colors cursor-pointer">
              Support
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
